import { useCallback, useEffect, useRef, useState } from "react";
import clientesArchivosService from "../services/clientesArchivosService";
import { useNotification } from "../context/NotificationContext";
import { saveAs } from "file-saver";

export default function useClientArchivo(clientId) {
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const mountedRef = useRef(false);

  const { showConfirm, showSuccess, showError } = useNotification();

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const loadDocuments = useCallback(async () => {
    if (!clientId) {
      setDocuments([]);
      return [];
    }
    setLoading(true);
    setError(null);

    try {
      const resp = await clientesArchivosService.getDocumentosByCliente(
        clientId
      );

      const docs = resp?.data || [];

      if (!mountedRef.current) return [];

      setDocuments(Array.isArray(docs) ? docs : []);
      return docs;
    } catch (err) {
      if (mountedRef.current) setError(err);
      return [];
    } finally {
      if (mountedRef.current) setLoading(false);
    }
  }, [clientId]);

  useEffect(() => {
    loadDocuments();
  }, [clientId, loadDocuments]);

  const refresh = useCallback(() => loadDocuments(), [loadDocuments]);
  
  //        SUBIR ARCHIVO
  const uploadFiles = useCallback(
    async (files) => {
      if (!clientId) throw new Error("clientId es requerido para subir archivos");
      if (!files || files.length === 0) return [];

      setLoading(true);
      setError(null);

      try {
        const uploadedDoc =
          await clientesArchivosService.uploadClienteArchivos(files, clientId);

        if (!uploadedDoc) throw new Error("Respuesta inválida del backend");

        setDocuments((prev) => {
          if (!Array.isArray(prev)) return [uploadedDoc];

          const exists = prev.find(
            (d) => String(d.id) === String(uploadedDoc.id)
          );

          if (exists) {
            return prev.map((d) => (d.id === uploadedDoc.id ? uploadedDoc : d));
          }

          return [uploadedDoc, ...prev];
        });

        return uploadedDoc;
      } catch (err) {
        setError(err);
        throw err;
      } finally {
        if (mountedRef.current) setLoading(false);
      }
    },
    [clientId]
  );
  
  //        VER ARCHIVO
  const viewDocument = useCallback(async (doc) => {
    if (!doc) return;
    const publicUrl = doc.urlBase || doc.url;
    if (publicUrl) {
      window.open(publicUrl, "_blank");
      return;
    }

    try {
      try {
        if (clientesArchivosService.downloadBlob) {
          console.debug('viewDocument: intentando downloadBlob para', doc.id);
          const blobRes = await clientesArchivosService.downloadBlob(doc.id);
          const blob = await normalizeToBlob(blobRes);
if (blob) {
  const fixedBlob = new Blob([blob], { type: "application/pdf" });
  const url = URL.createObjectURL(fixedBlob);
  window.open(url, "_blank");
  setTimeout(() => URL.revokeObjectURL(url), 60000);
  return;
}

        }
      } catch (err) {
        console.warn('viewDocument: downloadBlob falló, intentando descargarDocumento', err);
      }
      try {
        if (clientesArchivosService.descargarDocumento) {
          console.debug('viewDocument: intentando descargarDocumento para', doc.id);
          const blobRes = await clientesArchivosService.descargarDocumento(doc.id);
          const blob = await normalizeToBlob(blobRes);
          if (blob) {
            const url = URL.createObjectURL(blob);
            window.open(url, '_blank');
            setTimeout(() => URL.revokeObjectURL(url), 60 * 1000);
            return;
          }
        }
      } catch (err) {
        console.warn('viewDocument: descargarDocumento falló, intentando obtener metadata/SAS', err);
      }

      try {
        if (clientesArchivosService.obtenerDocumento) {
          console.debug('viewDocument: obteniendo metadata para', doc.id);
          const metaResp = await clientesArchivosService.obtenerDocumento(doc.id);
          const meta = metaResp?.data ?? metaResp ?? {};
          const sasUrl = meta?.url || meta?.urlDescarga || meta?.link || meta?.downloadUrl || meta?.data?.url;
          if (sasUrl) {
            window.open(sasUrl, '_blank');
            return;
          }
        }
      } catch (err) {
        console.warn('viewDocument: obtenerDocumento falló, abriré la ruta /api como fallback', err);
      }
      window.open(`/api/clientes/archivos/descargar/${encodeURIComponent(doc.id)}`, '_blank');
    } catch (err) {
      console.error('viewDocument: error al intentar mostrar el documento', err);
      window.open(`/api/clientes/archivos/descargar/${encodeURIComponent(doc.id)}`, '_blank');
    }
  }, []);
  
  //       DESCARGAR
  
  const downloadDocument = useCallback(
    async (doc, expiresIn = 60, onProgress) => {
      if (!doc || !doc.id) throw new Error("Documento sin id");

      if (!mountedRef.current) return false;
      setLoading(true);
      setError(null);
      const extractErrorMessage = async (err) => {
        try {
          if (!err) return 'Error desconocido';
          if (err.raw) return String(err.raw).slice(0, 2000);
          if (err.message && typeof err.message === 'string' && err.message.length > 0) {
            return err.message;
          }
          if (err.userMessage) return err.userMessage;

          const original = err.originalError || err.original || err;
          const blob = original?.response?.data || err?.response?.data;
          if (blob && typeof blob.text === 'function') {
            try {
              const text = await blob.text();
              return text || JSON.stringify(err);
            } catch (e) {
            }
          }

          if (err.data && typeof err.data === 'string') return err.data;
          return JSON.stringify(err);
        } catch (e) {
          return 'Error al extraer el mensaje de error';
        }
      };

      try {
     if (doc.urlBase || doc.url) {
          const publicUrl = doc.urlBase || doc.url;
          const fileNameFromDoc = doc.name || doc.nombreOriginal || `archivo_${doc.id}.pdf`;

          try {
            const resPublic = await fetch(publicUrl);
            if (resPublic && resPublic.ok) {
              const blobPublic = await resPublic.blob();
              saveAs(blobPublic, fileNameFromDoc);
              if (onProgress) onProgress(blobPublic.size || 1, blobPublic.size || 1);
              return true;
            }
          } catch (publicErr) {
            console.warn('Descarga desde URL pública falló, continuando con otros métodos', publicErr);
          }
        }

       try {
          if (clientesArchivosService.downloadBlob) {
            console.debug('downloadDocument: intentando clientesArchivosService.downloadBlob', doc.id);
            const blobSimple = await clientesArchivosService.downloadBlob(doc.id);
            if (blobSimple && blobSimple instanceof Blob) {
              console.debug('downloadDocument: downloadBlob devolvió blob size=', blobSimple.size);
              const fileNameSimple = doc.name || doc.nombreOriginal || `archivo_${doc.id}.pdf`;
              saveAs(blobSimple, fileNameSimple);
              if (onProgress) onProgress(blobSimple.size || 1, blobSimple.size || 1);
              return true;
            }
          }
        } catch (blobErr) {
          const readable = await extractErrorMessage(blobErr);
          console.warn('downloadBlob falló, continuando con otros métodos', readable, blobErr);
        }
        let resp;
        try {
          if (clientesArchivosService.descargarDocumento) {
            console.debug('downloadDocument: intentando clientesArchivosService.descargarDocumento', doc.id);
            const blob = await clientesArchivosService.descargarDocumento(doc.id, { expiresIn });
            if (blob && (blob instanceof Blob || blob.data instanceof Blob)) {
              const realBlob = blob instanceof Blob ? blob : blob.data;
              const fileName = doc.name || doc.nombreOriginal || `archivo_${doc.id}.pdf`;
              const fixedBlob = new Blob([realBlob], { type: "application/pdf" });
saveAs(fixedBlob, fileName);

              if (onProgress) onProgress(realBlob.size || 1, realBlob.size || 1);
              return true;
            }
          }
        } catch (firstErr) {
          const readable = await extractErrorMessage(firstErr);
          console.warn('descargarDocumento directo falló, intentando obtener metadata SAS', readable, firstErr);
        }
        try {
          if (clientesArchivosService.obtenerDocumento) {
            resp = await clientesArchivosService.obtenerDocumento(doc.id, { expiresIn });
          }
        } catch (svcErr) {
          console.warn('clientesArchivosService.obtenerDocumento falló, intentando descargarDirecto como fallback', svcErr);
          try {
            if (clientesArchivosService.descargarDirecto) {
              const blob = await clientesArchivosService.descargarDirecto(doc.id, { expiresIn });
              if (blob && (blob instanceof Blob || blob.data instanceof Blob)) {
                const realBlob = blob instanceof Blob ? blob : blob.data;
                const fileName = doc.name || doc.nombreOriginal || `archivo_${doc.id}.pdf`;
                const fixedBlob = new Blob([realBlob], { type: "application/pdf" });
saveAs(fixedBlob, fileName);

                if (onProgress) onProgress(realBlob.size || 1, realBlob.size || 1);
                return true;
              }
            }
          } catch (dErr) {
            console.warn('descargarDirecto falló, intentando fallback público', dErr);
          }

          const fallbackUrl = `/api/clientes/archivos/descargar/${encodeURIComponent(doc.id)}${expiresIn ? `?expiresIn=${expiresIn}` : ''}`;
          const a = document.createElement('a');
          a.href = fallbackUrl;
          a.download = doc.name || doc.nombreOriginal || `archivo_${doc.id}.pdf`;
          document.body.appendChild(a);
          a.click();
          a.remove();
          return true;
        }

        const meta = resp?.data ?? resp ?? {};
        if (meta instanceof Blob) {
          const fileNameBlob = doc.name || doc.nombreOriginal || `archivo_${doc.id}.pdf`;
          saveAs(meta, fileNameBlob);
          if (onProgress) onProgress(meta.size || 1, meta.size || 1);
          return true;
        }

        const sasUrl = meta?.url || meta?.urlDescarga || meta?.link || meta?.downloadUrl || meta?.data?.url;

        if (!sasUrl) {
          throw new Error('El backend no devolvió una URL de descarga válida');
        }

        try {
          const res = await fetch(sasUrl);
          if (!res.ok) throw new Error('Error descargando archivo');
          if (!res.body) {
            const blob = await res.blob();
            const fileNameFallback = doc.name || doc.nombreOriginal || `archivo_${doc.id}.pdf`;
            saveAs(blob, fileNameFallback);
            if (onProgress) onProgress(blob.size || 1, blob.size || 1);
            return true;
          }

          const reader = res.body.getReader();
          const contentLength = +res.headers.get('Content-Length') || 0;
          let received = 0;
          const chunks = [];

          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            chunks.push(value);
            received += value.length || value.byteLength || 0;
            if (onProgress) onProgress(received, contentLength || received);
          }

          const blob = new Blob(chunks, { type: res.headers.get('Content-Type') || 'application/octet-stream' });
          const fileName = doc.name || doc.nombreOriginal || `archivo_${doc.id}.pdf`;
          saveAs(blob, fileName);
          if (onProgress) onProgress(received, contentLength || received);
          return true;
        } catch (err) {
          console.warn('Fetch a SAS falló, intentando descargarDirecto desde backend', err, { sasUrl });
          try {
            if (clientesArchivosService.descargarDirecto) {
              const blob = await clientesArchivosService.descargarDirecto(doc.id, { expiresIn });
              if (blob && (blob instanceof Blob || blob.data instanceof Blob)) {
                const realBlob = blob instanceof Blob ? blob : blob.data;
                const fileName = doc.name || doc.nombreOriginal || `archivo_${doc.id}.pdf`;
                const fixedBlob = new Blob([realBlob], { type: "application/pdf" });
saveAs(fixedBlob, fileName);

                if (onProgress) onProgress(realBlob.size || 1, realBlob.size || 1);
                return true;
              }
            }
          } catch (dErr) {
            console.warn('descargarDirecto también falló, realizando fallback a SAS con <a>:', dErr);
          }

          const a = document.createElement('a');
          a.href = sasUrl;
          a.download = doc.name || doc.nombreOriginal || `archivo_${doc.id}.pdf`;
          document.body.appendChild(a);
          a.click();
          a.remove();
          if (onProgress) onProgress(1, 1);
          return true;
        }
      } catch (err) {
        const readable = await extractErrorMessage(err);
        try {
          showError(typeof readable === 'string' ? readable : 'No se pudo descargar el archivo');
        } catch (notifyErr) {
        }
        if (mountedRef.current) setError(err);
        throw err;
      } finally {
        if (mountedRef.current) setLoading(false);
      }
    },
    []
  );
  
  //       ELIMINAR CON CONFIRMACIÓN
  const deleteDocument = useCallback(
    async (docId) => {
      if (!docId) return;

      showConfirm("¿Estás segura de eliminar este archivo?", {
        onConfirm: async () => {
          setLoading(true);
          setError(null);

          try {
            await clientesArchivosService.deleteClienteArchivo(docId);

            setDocuments((prev) =>
              prev.filter((d) => String(d.id) !== String(docId))
            );

            showSuccess("Documento eliminado correctamente");
            return true;
          } catch (err) {
            setError(err);
            showError("No se pudo eliminar el documento");
            throw err;
          } finally {
            if (mountedRef.current) setLoading(false);
          }
        },
      });
    },
    [showConfirm, showSuccess, showError]
  );

  return {
    documents,
    loading,
    error,
    refresh,
    uploadFiles,
    viewDocument,
    downloadDocument,
    deleteDocument,
  };
}
