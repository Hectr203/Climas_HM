// src/hooks/useAbono.js
import { useState, useCallback, useRef } from 'react';
import { useNotifications } from '../context/NotificationContext';
import abonoService from '../services/abonoService';

// 🧩 Helper: convierte fecha ISO a dd/mm/yyyy
const toDDMMYYYY = (isoDate) => {
  if (!isoDate) return '';
  const d = new Date(isoDate);
  const dd = String(d.getUTCDate()).padStart(2, '0');
  const mm = String(d.getUTCMonth() + 1).padStart(2, '0');
  const yyyy = d.getUTCFullYear();
  return `${dd}/${mm}/${yyyy}`;
};

const useAbono = () => {
  const { showOperationSuccess, showHttpError } = useNotifications();

  const [abonos, setAbonos] = useState([]);
  const [abonoSeleccionado, setAbonoSeleccionado] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);

  // Refs para cache y concurrencia
  const loadingRef = useRef(false);
  const hasLoadedRef = useRef(false);
  const cacheParamsRef = useRef(null);
  const abonosRef = useRef([]);
  const createLock = useRef(false); // evita crear duplicados

  /**
   * Obtiene lista de abonos (con cache)
   */
  const getAbonos = useCallback(async (params = {}, force = false) => {
    const sameParams = JSON.stringify(params) === JSON.stringify(cacheParamsRef.current);

    if (!force && hasLoadedRef.current && sameParams && !loadingRef.current) {
      return abonosRef.current;
    }
    if (loadingRef.current) return abonosRef.current;

    loadingRef.current = true;
    setLoading(true);
    setError(null);

    try {
      const response = await abonoService.getAbonos(params);
      const data = Array.isArray(response) ? response : response?.data || [];
      setAbonos(data);
      abonosRef.current = data;
      hasLoadedRef.current = true;
      cacheParamsRef.current = params;
      return data;
    } catch (err) {
      setError(err);
      showHttpError('Error al obtener los abonos');
      setAbonos([]);
      return [];
    } finally {
      loadingRef.current = false;
      setLoading(false);
    }
  }, [showHttpError]);

  /**
   * Obtiene un abono por ID
   */
  const getAbonoById = useCallback(async (id) => {
    if (!id) return null;
    setLoading(true);
    setError(null);
    try {
      const response = await abonoService.getAbonoById(id);
      const data = response?.data || response;
      setAbonoSeleccionado(data);
      return data;
    } catch (err) {
      setError(err);
      showHttpError('Error al obtener el abono');
      return null;
    } finally {
      setLoading(false);
    }
  }, [showHttpError]);

  /**
   * Obtiene abonos por proyecto
   */
  const getAbonosByProyecto = useCallback(async (proyectoId, params = {}) => {
    if (!proyectoId) return { items: [], total: 0 };
    setLoading(true);
    setError(null);
    try {
      const response = await abonoService.getAbonosByProyecto(proyectoId, params);
      // La API devuelve { success, data: { total, items }, message }
      if (response?.success && response?.data) {
        return {
          items: Array.isArray(response.data.items) ? response.data.items : [],
          total: Number(response.data.total) || 0
        };
      }
      // Fallback para respuestas antiguas
      if (Array.isArray(response)) {
        return { items: response, total: response.length };
      }
      if (response?.data && Array.isArray(response.data)) {
        return { items: response.data, total: response.data.length };
      }
      return { items: [], total: 0 };
    } catch (err) {
      setError(err);
      showHttpError('Error al obtener los abonos del proyecto');
      return { items: [], total: 0 };
    } finally {
      setLoading(false);
    }
  }, [showHttpError]);

  /**
   * Obtiene abonos de un proyecto que no tienen comprobante asociado
   */
  const getAbonosSinComprobante = useCallback(async (proyectoId, params = {}) => {
    if (!proyectoId) return { items: [], total: 0 };
    setLoading(true);
    setError(null);
    try {
      const response = await abonoService.getAbonosSinComprobante(proyectoId, params);
      if (response?.success && response?.data) {
        const raw = response.data;
        const items = Array.isArray(raw.items)
          ? raw.items
          : (Array.isArray(raw.abonos) ? raw.abonos : []);
        const total = Number(raw.total ?? raw.totalAbonos ?? items.length) || 0;
        return { items, total };
      }
      if (Array.isArray(response)) {
        return { items: response, total: response.length };
      }
      if (response?.data && Array.isArray(response.data)) {
        return { items: response.data, total: response.data.length };
      }
      return { items: [], total: 0 };
    } catch (err) {
      setError(err);
      showHttpError('Error al obtener los abonos sin comprobante');
      return { items: [], total: 0 };
    } finally {
      setLoading(false);
    }
  }, [showHttpError]);

  /**
   * Crea un abono (evita duplicados)
   */
  const createAbono = useCallback(async (payload) => {
    if (createLock.current) return null; // 🚫 evita peticiones duplicadas
    createLock.current = true;

    setLoading(true);
    setError(null);
    setSuccess(false);

    try {
      // Sanitiza y formatea el payload
      // La fecha debe venir en formato ISO UTC desde el modal
      let fechaISO = payload.fecha;
      if (!fechaISO) {
        fechaISO = new Date().toISOString();
      } else if (typeof fechaISO === 'string' && !fechaISO.includes('T')) {
        // Si viene en formato dd/mm/yyyy, convertir a ISO UTC
        const [dia, mes, año] = fechaISO.split('/');
        if (dia && mes && año) {
          const fecha = new Date(`${año}-${mes}-${dia}T00:00:00.000Z`);
          fechaISO = fecha.toISOString();
        }
      }

      const cleanPayload = {
        idProyecto: payload.idProyecto?.trim(),
        // Enviar ambos montos según nueva API
        montoAbonoSinIva: Number(payload.montoAbonoSinIva),
        montoAbonoConIva: Number(payload.montoAbonoConIva),
        montoAbono: Number(payload.montoAbonoConIva),
        porcentajeIva: Number(payload.porcentajeIva),
        fecha: fechaISO,
        metodoPago: payload.metodoPago || 'Otro',
        descripcion: payload.descripcion?.trim() || 'Abono registrado',
        descripcionMetodo: payload.descripcionMetodo || '',
        notas: payload.notas || '',
      };

      // Incluir referenciaPago solo si tiene valor
      if (payload.referenciaPago?.trim()) {
        cleanPayload.referenciaPago = payload.referenciaPago.trim();
      }

      const response = await abonoService.createAbono(cleanPayload);
      const created = response?.data || response;

      if (created) {
        setAbonos((prev) => {
          const next = [...prev, created];
          abonosRef.current = next;
          return next;
        });
      }

      showOperationSuccess('💰 Abono creado exitosamente');
      setSuccess(true);
      return created;
    } catch (err) {
      console.error('❌ Error creando abono:', err);
      setError(err);
      showHttpError(err?.response?.data?.message || 'Error al crear el abono');
      return null;
    } finally {
      createLock.current = false;
      setLoading(false);
    }
  }, [showOperationSuccess, showHttpError]);

  /**
   * Edita un abono
   */
  const editAbono = useCallback(async (id, payload) => {
    if (!id) return null;
    setLoading(true);
    setError(null);
    setSuccess(false);
    try {
      // Sanitiza y formatea el payload
      // La fecha debe venir en formato ISO UTC desde el modal
      let fechaISO = payload.fecha;
      if (!fechaISO) {
        fechaISO = new Date().toISOString();
      } else if (typeof fechaISO === 'string' && !fechaISO.includes('T')) {
        // Si viene en formato dd/mm/yyyy, convertir a ISO UTC
        const [dia, mes, año] = fechaISO.split('/');
        if (dia && mes && año) {
          const fecha = new Date(`${año}-${mes}-${dia}T00:00:00.000Z`);
          fechaISO = fecha.toISOString();
        }
      }

      const cleanPayload = {
        idProyecto: payload.idProyecto?.trim(),
        // Alinear con API nueva: enviar montos con y sin IVA y porcentaje
        montoAbonoSinIva: Number(payload.montoAbonoSinIva),
        montoAbonoConIva: Number(payload.montoAbonoConIva || payload.montoAbono),
        montoAbono: Number(payload.montoAbonoConIva || payload.montoAbono),
        porcentajeIva: Number(payload.porcentajeIva),
        fecha: fechaISO,
        metodoPago: payload.metodoPago || 'Otro',
        descripcion: payload.descripcion?.trim() || 'Abono registrado',
        descripcionMetodo: payload.descripcionMetodo || '',
        notas: payload.notas || '',
      };

      // Incluir referenciaPago solo si tiene valor
      if (payload.referenciaPago?.trim()) {
        cleanPayload.referenciaPago = payload.referenciaPago.trim();
      }

      const response = await abonoService.updateAbono(id, cleanPayload);
      const updated = response?.data || cleanPayload;

      setAbonos((prev) => {
        const next = prev.map((a) =>
          (a.id === id || a._id === id) ? { ...a, ...updated } : a
        );
        abonosRef.current = next;
        return next;
      });

      if (abonoSeleccionado && (abonoSeleccionado.id === id || abonoSeleccionado._id === id)) {
        setAbonoSeleccionado((prev) => ({ ...prev, ...updated }));
      }

      showOperationSuccess('Abono actualizado');
      setSuccess(true);
      return updated;
    } catch (err) {
      setError(err);
      showHttpError('Error al actualizar el abono');
      return null;
    } finally {
      setLoading(false);
    }
  }, [abonoSeleccionado, showOperationSuccess, showHttpError]);

  /**
   * Elimina un abono
   */
  const deleteAbono = useCallback(async (id) => {
    if (!id) return null;
    setLoading(true);
    setError(null);
    setSuccess(false);
    try {
      await abonoService.deleteAbono(id);
      setAbonos((prev) => {
        const next = prev.filter((a) => (a.id || a._id) !== id);
        abonosRef.current = next;
        return next;
      });
      if (abonoSeleccionado && (abonoSeleccionado.id === id || abonoSeleccionado._id === id)) {
        setAbonoSeleccionado(null);
      }
      showOperationSuccess('Abono eliminado');
      setSuccess(true);
      return true;
    } catch (err) {
      setError(err);
      showHttpError('Error al eliminar el abono');
      return false;
    } finally {
      setLoading(false);
    }
  }, [abonoSeleccionado, showOperationSuccess, showHttpError]);

  /**
   * Aprueba o rechaza
   */
  const aprobarAbono = useCallback(async (id) => {
    if (!id) return null;
    setLoading(true);
    try {
      const response = await abonoService.aprobarAbono(id);
      const updated = response?.data || { estado: 'aprobado' };

      setAbonos((prev) => prev.map((a) => (a.id === id ? { ...a, ...updated } : a)));
      showOperationSuccess('Abono aprobado');
      return updated;
    } catch (err) {
      showHttpError('Error al aprobar el abono', err);
      return null;
    } finally {
      setLoading(false);
    }
  }, [showOperationSuccess, showHttpError]);

  const rechazarAbono = useCallback(async (id, motivo = '') => {
    if (!id) return null;
    setLoading(true);
    try {
      const response = await abonoService.rechazarAbono(id, motivo);
      const updated = response?.data || { estado: 'rechazado', motivoRechazo: motivo };
      setAbonos((prev) => prev.map((a) => (a.id === id ? { ...a, ...updated } : a)));
      showOperationSuccess('Abono rechazado');
      return updated;
    } catch (err) {
      showHttpError('Error al rechazar el abono', err);
      return null;
    } finally {
      setLoading(false);
    }
  }, [showOperationSuccess, showHttpError]);



  return {
    abonos,
    abonoSeleccionado,
    loading,
    error,
    success,
    getAbonos,
    getAbonoById,
    getAbonosByProyecto,
    getAbonosSinComprobante,
    createAbono,
    editAbono,
    deleteAbono,
    aprobarAbono,
    rechazarAbono,
    setAbonos,
    setAbonoSeleccionado,
  };
};

export default useAbono;
