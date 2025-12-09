// usePagosProgramados.js
import { useState } from "react";
import { useNotifications } from "../context/NotificationContext";
import pagosProgramadosService from "../services/pagosProgramadosService";

const usePagosProgramados = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const { showOperationSuccess, showHttpError } = useNotifications();

  /**
   * Crear un nuevo plan de pagos programados
   */
  const crearPagosProgramados = async (pagosProgramadosData) => {
    setLoading(true);
    setError(null);
    try {
      const response = await pagosProgramadosService.crearPagosProgramados(pagosProgramadosData);
      showOperationSuccess("create", "Plan de pagos programados");
      return response;
    } catch (err) {
      setError(err);
      showHttpError(err, "Error al crear plan de pagos programados");
      throw err;
    } finally {
      setLoading(false);
    }
  };

  /**
   * Obtener pagos programados por ID
   */
  const obtenerPagosProgramadosPorId = async (id) => {
    setLoading(true);
    setError(null);
    try {
      const response = await pagosProgramadosService.obtenerPagosProgramadosPorId(id);
      return response;
    } catch (err) {
      setError(err);
      showHttpError(err, "Error al obtener plan de pagos programados");
      return null;
    } finally {
      setLoading(false);
    }
  };

  /**
   * Obtener pagos programados por cotización
   */
  const obtenerPagosPorCotizacion = async (idCotizacion) => {
    setLoading(true);
    setError(null);
    try {
      const response = await pagosProgramadosService.obtenerPagosPorCotizacion(idCotizacion);
      return response;
    } catch (err) {
      // Si es 404, significa que no hay pagos programados - esto es normal, no es un error
      if (err.status === 404) {
        return null; // Retornar null sin mostrar error
      }
      
      // Para otros errores sí mostrar el error
      setError(err);
      showHttpError(err, "Error al obtener pagos programados");
      return null;
    } finally {
      setLoading(false);
    }
  };

  /**
   * Actualizar pagos programados existentes
   */
  const actualizarPagosProgramados = async (idCotizacion, updateData) => {
    setLoading(true);
    setError(null);
    try {
      const response = await pagosProgramadosService.actualizarPagosProgramados(idCotizacion, updateData);
      showOperationSuccess("update", "Plan de pagos programados");
      return response;
    } catch (err) {
      setError(err);
      showHttpError(err, "Error al actualizar plan de pagos programados");
      throw err;
    } finally {
      setLoading(false);
    }
  };

  /**
   * Eliminar plan de pagos programados
   */
  const eliminarPagosProgramados = async (id) => {
    setLoading(true);
    setError(null);
    try {
      const response = await pagosProgramadosService.eliminarPagosProgramados(id);
      showOperationSuccess("delete", "Plan de pagos programados");
      return response;
    } catch (err) {
      setError(err);
      showHttpError(err, "Error al eliminar plan de pagos programados");
      throw err;
    } finally {
      setLoading(false);
    }
  };

  return {
    loading,
    error,
    crearPagosProgramados,
    obtenerPagosProgramadosPorId,
    obtenerPagosPorCotizacion,
    actualizarPagosProgramados,
    eliminarPagosProgramados
  };
};

export default usePagosProgramados;