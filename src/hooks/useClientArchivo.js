import { useCallback, useEffect, useRef, useState } from 'react';
import clientesArchivosService from '../services/clientesArchivosService';

/**
 * useClientArchivo
 * Hook para manejar los documentos de un cliente (listado, subida, vista y descarga).
 * - Llama al servicio `clientesArchivosService` para comunicarse con el backend
 * - Mantiene estado local de `documents`, `loading` y `error`
 *
 * @param {string|number|null} clientId - id del cliente para filtrar documentos
 */
export default function useClientArchivo(clientId) {
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const mountedRef = useRef(false);

  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  const loadDocuments = useCallback(async () => {
    if (!clientId) {
      setDocuments([]);
      return [];
    }
    setLoading(true);
    setError(null);
    try {
      // Forzar refresco en cada carga para evitar cache stale en el cliente
      const docs = await clientesArchivosService.getDocumentosByCliente(clientId, { force: true });
      if (!mountedRef.current) return [];
      setDocuments(Array.isArray(docs) ? docs : []);
      return docs;
    } catch (err) {
      if (!mountedRef.current) return [];
      setError(err);
      return [];
    } finally {
      if (mountedRef.current) setLoading(false);
    }
  }, [clientId]);

  useEffect(() => {
    // Cargar documentos cada vez que cambia el clientId
    loadDocuments();
  }, [clientId, loadDocuments]);

  const refresh = useCallback(() => loadDocuments(), [loadDocuments]);

  const uploadFiles = useCallback(async (files) => {
    if (!clientId) throw new Error('clientId es requerido para subir archivos');
    if (!files || files.length === 0) return [];
    setLoading(true);
    setError(null);
    try {
      const resp = await clientesArchivosService.uploadClienteArchivos(files, clientId);
      const uploaded = Array.isArray(resp) ? resp : [resp];

      // Intentamos mantener el orden recien subidos al inicio
      setDocuments(prev => {
        // Evitar duplicados simples: si el backend devuelve el mismo id ya presente, lo reemplazamos
        const existingById = new Map((prev || []).map(d => [String(d.id), d]));
        const normalized = (uploaded || []).map(d => ({ ...d }));
        normalized.forEach(d => existingById.set(String(d.id), d));
        // convertir map a array y ordenar: nuevos primero
        const merged = [...normalized, ...Array.from(existingById.values()).filter(d => !normalized.find(n => String(n.id) === String(d.id)))];
        return merged;
      });

      return uploaded;
    } catch (err) {
      setError(err);
      throw err;
    } finally {
      if (mountedRef.current) setLoading(false);
    }
  }, [clientId]);

  const viewDocument = useCallback((doc) => {
    if (!doc) return;
    if (doc.urlBase || doc.url) {
      window.open(doc.urlBase || doc.url, '_blank');
      return;
    }
    if (doc.id) {
      window.open(`/api/clientes/archivos/descargar/${encodeURIComponent(doc.id)}`, '_blank');
      return;
    }
    throw new Error('Documento sin URL ni id');
  }, []);

  const downloadDocument = useCallback((doc, expiresInMinutes = 60) => {
    if (!doc || !doc.id) throw new Error('Documento sin id');
    const url = `/api/clientes/archivos/descargar/${encodeURIComponent(doc.id)}?expiresIn=${encodeURIComponent(String(expiresInMinutes))}`;

    // onProgress: callback(loadedBytes, totalBytes|null)
    return (async () => {
      try {
        const resp = await fetch(url, { credentials: 'same-origin' });
        if (!resp.ok) throw new Error(`Error al obtener archivo: ${resp.status}`);

        // Si el body es un stream, leer en chunks y reportar progreso
        const contentLength = resp.headers.get('content-length');
        const total = contentLength ? parseInt(contentLength, 10) : null;

        if (resp.body && typeof resp.body.getReader === 'function') {
          const reader = resp.body.getReader();
          const chunks = [];
          let received = 0;
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            chunks.push(value);
            received += value.length || value.byteLength || 0;
            if (typeof onProgress === 'function') {
              try { onProgress(received, total); } catch (e) { /* ignore callback errors */ }
            }
          }
          const blob = new Blob(chunks, { type: resp.headers.get('content-type') || 'application/octet-stream' });

          // Obtener filename preferente
          let filename = doc.nombreOriginal || doc.nombreAsignado || doc.name || `archivo_${Date.now()}`;
          try {
            const cd = resp.headers.get('content-disposition') || resp.headers.get('Content-Disposition');
            if (cd) {
              const match = /filename\*?=(?:UTF-8'')?"?([^";]+)"?/i.exec(cd);
              if (match && match[1]) filename = decodeURIComponent(match[1]);
            }
          } catch (e) { /* ignore */ }

          const blobUrl = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = blobUrl;
          a.download = filename;
          a.style.display = 'none';
          document.body.appendChild(a);
          a.click();
          a.remove();
          setTimeout(() => URL.revokeObjectURL(blobUrl), 1500);
          return true;
        }

        // Fallback si no hay stream: obtener blob entero
        const blob = await resp.blob();
        if (typeof onProgress === 'function') {
          try { onProgress(blob.size, blob.size); } catch (e) { /* ignore */ }
        }

        let filename = doc.nombreOriginal || doc.nombreAsignado || doc.name || `archivo_${Date.now()}`;
        try {
          const cd = resp.headers.get('content-disposition') || resp.headers.get('Content-Disposition');
          if (cd) {
            const match = /filename\*?=(?:UTF-8'')?"?([^";]+)"?/i.exec(cd);
            if (match && match[1]) filename = decodeURIComponent(match[1]);
          }
        } catch (e) { /* ignore */ }

        const blobUrl = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = blobUrl;
        a.download = filename;
        a.style.display = 'none';
        document.body.appendChild(a);
        a.click();
        a.remove();
        setTimeout(() => URL.revokeObjectURL(blobUrl), 1500);
        return true;
      } catch (err) {
        // Fallback: abrir la URL (redirige a SAS y normalmente fuerza descarga)
        try {
          window.open(url, '_blank', 'noopener');
          return true;
        } catch (e) {
          throw err;
        }
      }
    })();
  }, []);

  return {
    documents,
    loading,
    error,
    refresh,
    uploadFiles,
    viewDocument,
    downloadDocument,
  };
}
