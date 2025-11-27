import { useCallback, useState } from 'react';
import { useNotifications } from '../context/NotificationContext';
import abonoDocumentService from '../services/abonoDocumentService';

/**
 * Hook para gestionar documentos de abonos (comprobantes).
 * Centraliza errores/éxitos y retorna helpers de carga/listado/descarga/eliminación.
 */
const useAbonoDocumentos = () => {
  const { showHttpError, showOperationSuccess } = useNotifications();

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const listarDocumentos = useCallback(async ({ idProyecto, idAbono } = {}) => {
    setLoading(true);
    setError(null);
    try {
      const res = await abonoDocumentService.listarDocumentos({ idProyecto, idAbono });
      const normalize = (payload) => {
        const raw = payload?.data ?? payload;
        if (Array.isArray(raw)) return raw;
        if (Array.isArray(raw?.data)) return raw.data;
        if (Array.isArray(raw?.items)) return raw.items;
        if (Array.isArray(raw?.documentos)) return raw.documentos;
        if (Array.isArray(raw?.data?.items)) return raw.data.items;
        if (Array.isArray(raw?.data?.documentos)) return raw.data.documentos;
        return [];
      };
      return normalize(res);
    } catch (err) {
      setError(err);
      showHttpError('No se pudieron listar los documentos de abonos');
      return [];
    } finally {
      setLoading(false);
    }
  }, [showHttpError]);

  const subirDocumento = useCallback(async ({ idAbono, file, descripcion }) => {
    setLoading(true);
    setError(null);
    try {
      const res = await abonoDocumentService.subirDocumento({ idAbono, file, descripcion });
      showOperationSuccess('create', 'Documento');
      return res;
    } catch (err) {
      setError(err);
      showHttpError(err?.userMessage || 'No se pudo subir el documento');
      return null;
    } finally {
      setLoading(false);
    }
  }, [showOperationSuccess, showHttpError]);

  const updateDocumento = useCallback(async ({ id, file, descripcion }) => {
    setLoading(true);
    setError(null);
    try {
      const res = await abonoDocumentService.updateDocumento({ id, file, descripcion });
      showOperationSuccess('update', 'Documento');
      return res;
    } catch (err) {
      setError(err);
      showHttpError(err?.userMessage || 'No se pudo actualizar el documento');
      return null;
    } finally {
      setLoading(false);
    }
  }, [showOperationSuccess, showHttpError]);

  const obtenerDocumentoUrl = useCallback(async (documentoId, { expiresIn = 60 } = {}) => {
    if (!documentoId) return null;
    setLoading(true);
    setError(null);
    try {
      const res = await abonoDocumentService.obtenerDocumento(documentoId, { expiresIn });
      const data = res?.data || res || {};
      return (
        data?.urlDescarga ||
        data?.url ||
        data?.link ||
        data?.downloadUrl ||
        null
      );
    } catch (err) {
      setError(err);
      showHttpError('No se pudo obtener el documento');
      return null;
    } finally {
      setLoading(false);
    }
  }, [showHttpError]);

  const descargarDocumento = useCallback(async (documentoId, { expiresIn = 60 } = {}) => {
    if (!documentoId) return null;
    setLoading(true);
    setError(null);
    try {
      const res = await abonoDocumentService.descargarDocumento(documentoId, { expiresIn });
      const data = res?.data || res || {};
      return (
        data?.urlDescarga ||
        data?.url ||
        data?.link ||
        data?.downloadUrl ||
        null
      );
    } catch (err) {
      setError(err);
      showHttpError('No se pudo descargar el documento');
      return null;
    } finally {
      setLoading(false);
    }
  }, [showHttpError]);

  const eliminarDocumento = useCallback(async (documentoId) => {
    if (!documentoId) return false;
    setLoading(true);
    setError(null);
    try {
      await abonoDocumentService.eliminarDocumento(documentoId);
      showOperationSuccess('delete', 'Documento');
      return true;
    } catch (err) {
      setError(err);
      showHttpError('No se pudo eliminar el documento');
      return false;
    } finally {
      setLoading(false);
    }
  }, [showOperationSuccess, showHttpError]);

  return {
    loading,
    error,
    listarDocumentos,
    subirDocumento,
    updateDocumento,
    obtenerDocumentoUrl,
    descargarDocumento,
    eliminarDocumento,
  };
};

export default useAbonoDocumentos;
