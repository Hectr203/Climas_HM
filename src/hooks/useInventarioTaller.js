import { useState, useCallback } from 'react';
import { useNotifications } from '../context/NotificationContext';
import httpService from '../services/httpService';

const useInventarioTaller = () => {
  const { showSuccess, showError, showHttpError } = useNotifications();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [inventarioTaller, setInventarioTaller] = useState([]);
  const [articuloDetalle, setArticuloDetalle] = useState(null);
  const [historialMovimientos, setHistorialMovimientos] = useState([]);

  /**
   * Obtiene el inventario disponible del taller
   * @param {boolean} soloDisponibles - Si true, solo materiales con stock > 0
   */
  const getInventarioTaller = useCallback(async (soloDisponibles = true) => {
    setLoading(true);
    setError(null);
    try {
      const endpoint = soloDisponibles 
        ? '/inventario-taller?disponibles=true' 
        : '/inventario-taller';
      
      const response = await httpService.get(endpoint);
      
      if (response.success) {
        const data = Array.isArray(response.data) ? response.data : [];
        setInventarioTaller(data);
        return data;
      } else {
        setInventarioTaller([]);
        return [];
      }
    } catch (err) {
      console.error('Error en useInventarioTaller.getInventarioTaller:', err);
      setError(err);
      showHttpError('Error al obtener inventario del taller');
      setInventarioTaller([]);
      return [];
    } finally {
      setLoading(false);
    }
  }, [showHttpError]);

  /**
   * Obtiene los detalles de un artículo específico del inventario del taller
   * @param {string} articuloId - ID del artículo
   */
  const getArticuloTaller = useCallback(async (articuloId) => {
    if (!articuloId) {
      showError('ID de artículo requerido');
      return null;
    }

    setLoading(true);
    setError(null);
    try {
      const response = await httpService.get(`/inventario-taller/articulo/${articuloId}`);
      
      if (response.success && response.data) {
        setArticuloDetalle(response.data);
        return response.data;
      } else {
        setArticuloDetalle(null);
        return null;
      }
    } catch (err) {
      console.error('Error en useInventarioTaller.getArticuloTaller:', err);
      setError(err);
      showHttpError('Error al obtener artículo del taller');
      setArticuloDetalle(null);
      return null;
    } finally {
      setLoading(false);
    }
  }, [showError, showHttpError]);

  /**
   * Obtiene el historial de movimientos de un artículo
   * @param {string} articuloId - ID del artículo
   */
  const getHistorialMovimientos = useCallback(async (articuloId) => {
    if (!articuloId) {
      showError('ID de artículo requerido');
      return [];
    }

    setLoading(true);
    setError(null);
    try {
      const response = await httpService.get(`/inventario-taller/historial/${articuloId}`);
      
      if (response.success) {
        const data = Array.isArray(response.data) ? response.data : [];
        setHistorialMovimientos(data);
        return data;
      } else {
        setHistorialMovimientos([]);
        return [];
      }
    } catch (err) {
      console.error('Error en useInventarioTaller.getHistorialMovimientos:', err);
      setError(err);
      showHttpError('Error al obtener historial de movimientos');
      setHistorialMovimientos([]);
      return [];
    } finally {
      setLoading(false);
    }
  }, [showError, showHttpError]);

  /**
   * Obtiene movimientos del inventario en un rango de fechas
   * @param {string} fechaInicio - Fecha inicio (YYYY-MM-DD)
   * @param {string} fechaFin - Fecha fin (YYYY-MM-DD)
   */
  const getMovimientosPorFechas = useCallback(async (fechaInicio, fechaFin) => {
    if (!fechaInicio || !fechaFin) {
      showError('Fechas de inicio y fin requeridas');
      return [];
    }

    setLoading(true);
    setError(null);
    try {
      const response = await httpService.get(
        `/inventario-taller/movimientos?fechaInicio=${fechaInicio}&fechaFin=${fechaFin}`
      );
      
      if (response.success) {
        return Array.isArray(response.data) ? response.data : [];
      } else {
        return [];
      }
    } catch (err) {
      console.error('Error en useInventarioTaller.getMovimientosPorFechas:', err);
      setError(err);
      showHttpError('Error al obtener movimientos por fechas');
      return [];
    } finally {
      setLoading(false);
    }
  }, [showError, showHttpError]);

  /**
   * Transfiere materiales de una requisición al taller
   * @param {string} requisicionId - ID de la requisición
   * @param {Array} materiales - Array de materiales a transferir [{ articuloId, nombreMaterial, cantidad, unidad }]
   */
  const transferirMaterialesTaller = useCallback(async (requisicionId, materiales = null) => {
    if (!requisicionId) {
      showError('ID de requisición requerido');
      return null;
    }

    setLoading(true);
    setError(null);
    
    console.log('[useInventarioTaller] Iniciando transferencia al taller');
    console.log('[useInventarioTaller] requisicionId:', requisicionId);
    console.log('[useInventarioTaller] materiales:', materiales);
    
    try {
      // Preparar payload
      const payload = materiales ? { materiales } : {};
      console.log('[useInventarioTaller] Payload a enviar:', payload);
      console.log('[useInventarioTaller] URL:', `/requisiciones/${requisicionId}/transferir-taller`);
      
      const response = await httpService.post(
        `/requisiciones/${requisicionId}/transferir-taller`,
        payload
      );
      
      console.log('[useInventarioTaller] Respuesta del backend:', response);
      
      if (response.success) {
        showSuccess(response.message || 'Materiales transferidos al taller exitosamente');
        // Recargar inventario después de la transferencia
        await getInventarioTaller(true);
        return response.data;
      } else {
        const errorMsg = response.message || 'Error al transferir materiales al taller';
        showError(errorMsg);
        return null;
      }
    } catch (err) {
      console.error('Error en useInventarioTaller.transferirMaterialesTaller:', err);
      console.error('Error completo:', {
        message: err.message,
        status: err.status,
        data: err.data,
        response: err.response,
        stack: err.stack
      });
      setError(err);
      showHttpError(err.data?.message || err.message || 'Error al transferir materiales al taller');
      return null;
    } finally {
      setLoading(false);
    }
  }, [showSuccess, showError, showHttpError, getInventarioTaller]);

  return {
    loading,
    error,
    inventarioTaller,
    articuloDetalle,
    historialMovimientos,
    getInventarioTaller,
    getArticuloTaller,
    getHistorialMovimientos,
    getMovimientosPorFechas,
    transferirMaterialesTaller,
  };
};

export default useInventarioTaller;
