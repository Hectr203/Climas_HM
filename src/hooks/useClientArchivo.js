import { useCallback, useEffect, useRef, useState } from "react";
import clientesArchivosService from "../services/clientesArchivosService";
import { useNotifications } from "../context/NotificationContext";
import { saveAs } from "file-saver";

export default function useClientArchivo(clientId) {
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const mountedRef = useRef(false);
  const { showConfirm, showSuccess, showError, showInfo } = useNotifications();

  // ------------------------------------------
  // MONTAJE
  // ------------------------------------------
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  // ------------------------------------------
  // CARGAR DOCUMENTOS
  // ------------------------------------------
  const loadDocuments = useCallback(async () => {
    if (!clientId) {
      setDocuments([]);
      return [];
    }

    setLoading(true);
    setError(null);
    try {
      const resp = await clientesArchivosService.getDocumentosByCliente(clientId);
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


  // ============================================================
  //  SUBIR ARCHIVO
  // ============================================================
  const uploadFiles = useCallback(async (files, meta) => {
    if (!clientId) throw new Error("clientId es requerido para subir archivos");
    if (!files || files.length === 0) return [];

    setLoading(true);
    setError(null);

    try {
      const uploaded = await clientesArchivosService.uploadClienteArchivos(files, clientId, meta);
      if (!uploaded) throw new Error("Respuesta inválida del backend");

      setDocuments((prev) => {
        const list = Array.isArray(prev) ? prev : [];
        if (Array.isArray(uploaded)) {
          const newOnes = uploaded.filter(u => !list.find(p => String(p.id) === String(u.id)));
          return [...newOnes, ...list];
        }
        const exists = list.find(d => String(d.id) === String(uploaded.id));
        if (exists) {
          return list.map(d => (String(d.id) === String(uploaded.id) ? uploaded : d));
        }
        return [uploaded, ...list];
      });

      return uploaded;
    } catch (err) {
      setError(err);
      throw err;
    } finally {
      if (mountedRef.current) setLoading(false);
    }
  }, [clientId]);

  // ============================================================
  //   VER DOCUMENTO
  // ============================================================
  const viewDocument = useCallback(async (doc) => {
    if (!doc || !doc.id) return;

    try {
      const blob = await clientesArchivosService.descargarDocumento(doc.id);
      if (!blob) throw new Error("No se pudo obtener el archivo");

      const url = URL.createObjectURL(blob);
      window.open(url, "_blank");
      setTimeout(() => URL.revokeObjectURL(url), 60000);
    } catch (err) {
      console.error("viewDocument error:", err);
      showError("No se pudo abrir el documento");
    }
  }, [showError]);


  // ============================================================
  //   DESCARGAR DOCUMENTO (SIEMPRE FUNCIONA)
  // ============================================================
  const downloadDocument = useCallback(async (doc) => {
    if (!doc || !doc.id) {
      showError("Documento inválido");
      return false;
    }

    setLoading(true);
    setError(null);

    try {
      // ÚNICO método real y estable
      const blob = await clientesArchivosService.descargarDocumento(doc.id);

      if (!blob) throw new Error("El backend no devolvió un archivo");

      const fileName =
        doc.nombreOriginal ||
        doc.name ||
        `archivo_${doc.id}`;

      saveAs(blob, fileName);
      return true;

    } catch (err) {
      console.error("downloadDocument error:", err);
      showError("No se pudo descargar el archivo");
      setError(err);
      return false;
    } finally {
      if (mountedRef.current) setLoading(false);
    }
  }, [showError]);


  // ============================================================
//   ELIMINAR DOCUMENTO (con notificación global)
// ============================================================
const deleteDocument = useCallback(
  async (docId) => {
    if (!docId) return;

    showConfirm(
      "¿Eliminar este documento? Esta acción no se puede deshacer.",
      {
        onConfirm: async () => {
          setLoading(true);
          setError(null);

          try {
            await clientesArchivosService.deleteClienteArchivo(docId);

            setDocuments(prev =>
              prev.filter(d => String(d.id) !== String(docId))
            );

            showSuccess("Documento eliminado correctamente");
          } catch (err) {
            setError(err);
            showError("No se pudo eliminar el documento");
          } finally {
            if (mountedRef.current) setLoading(false);
          }
        },
        onCancel: () => {
          showInfo("Operación cancelada");
        }
      }
    );
  },
  [showConfirm, showSuccess, showError, showInfo]
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
