import { useState } from "react";
import { useNotifications } from "../context/NotificationContext";
import herramientaService from "../services/herramientaService";

/**
 * Hook personalizado para gestión de herramientas
 * Proporciona funcionalidades para registrar, asignar ubicaciones y consultar herramientas
 */
const useHerramientas = () => {
  const { showHttpError, showOperationSuccess } = useNotifications();
  const [herramientas, setHerramientas] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  /**
   * Obtener lista de herramientas con filtros opcionales
   * @param {Object} filters - Filtros de búsqueda
   * @returns {Promise<Array>} Lista de herramientas
   */
  const getHerramientas = async (filters = {}) => {
    setLoading(true);
    setError(null);
    try {
      const response = await herramientaService.getHerramientas(filters);
      const data = response.success && Array.isArray(response.data) ? response.data : [];
      setHerramientas(data);
      return data;
    } catch (err) {
      console.error(err);
      setError(err);
      showHttpError("Error al cargar herramientas");
      return [];
    } finally {
      setLoading(false);
    }
  };

  /**
   * Obtener una herramienta específica por ID
   * @param {number} id - ID de la herramienta
   * @returns {Promise<Object>} Datos de la herramienta
   */
  const getHerramientaById = async (id) => {
    setLoading(true);
    setError(null);
    try {
      const response = await herramientaService.getHerramientaById(id);
      if (response.success) {
        return response.data;
      } else {
        showHttpError(response.message || "Error al cargar herramienta");
        return null;
      }
    } catch (err) {
      console.error(err);
      setError(err);
      showHttpError("Error al cargar herramienta");
      return null;
    } finally {
      setLoading(false);
    }
  };

  /**
   * Registrar una nueva herramienta
   * @param {Object} payload - Datos de la herramienta
   * @returns {Promise<Object>} Herramienta creada
   */
  const createHerramienta = async (payload) => {
    setLoading(true);
    setError(null);
    try {
      const response = await herramientaService.createHerramienta(payload);
      if (response.success) {
        showOperationSuccess(response.message || "Herramienta registrada ✅");
        await getHerramientas(); // Actualiza la lista
        return response.data;
      } else {
        showHttpError(response.message || "Error al registrar herramienta");
        return null;
      }
    } catch (err) {
      console.error(err);
      showHttpError("No se pudo registrar la herramienta ❌");
      setError(err);
      return null;
    } finally {
      setLoading(false);
    }
  };

  /**
   * Actualizar información de una herramienta
   * @param {number} id - ID de la herramienta
   * @param {Object} payload - Datos a actualizar
   * @returns {Promise<Object>} Herramienta actualizada
   */
  const updateHerramienta = async (id, payload) => {
    setLoading(true);
    setError(null);
    try {
      const response = await herramientaService.updateHerramienta(id, payload);
      if (response.success) {
        showOperationSuccess(response.message || "Herramienta actualizada ✅");
        // Actualiza localmente sin recargar
        setHerramientas(prev => 
          prev.map(h => h.id === id ? { ...h, ...payload } : h)
        );
        return { ...payload, id };
      } else {
        showHttpError(response.message || "Error al actualizar herramienta");
        return null;
      }
    } catch (err) {
      console.error(err);
      showHttpError("No se pudo actualizar la herramienta ❌");
      setError(err);
      return null;
    } finally {
      setLoading(false);
    }
  };

  /**
   * Asignar o cambiar ubicación de una herramienta
   * @param {number} id - ID de la herramienta
   * @param {Object} payload - { ubicacion_tipo, ubicacion_id, observaciones }
   * @returns {Promise<Object>} Asignación creada
   */
  const asignarUbicacion = async (id, payload) => {
    setLoading(true);
    setError(null);
    try {
      const response = await herramientaService.asignarUbicacion(id, payload);
      if (response.success) {
        showOperationSuccess(response.message || "Ubicación actualizada ✅");
        await getHerramientas(); // Refresca para obtener ubicación actualizada
        return response.data;
      } else {
        showHttpError(response.message || "Error al asignar ubicación");
        return null;
      }
    } catch (err) {
      console.error(err);
      showHttpError("No se pudo asignar la ubicación ❌");
      setError(err);
      return null;
    } finally {
      setLoading(false);
    }
  };

  /**
   * Obtener historial de movimientos de una herramienta
   * @param {number} id - ID de la herramienta
   * @returns {Promise<Array>} Historial de movimientos
   */
  const getHistorialMovimientos = async (id) => {
    setLoading(true);
    setError(null);
    try {
      const response = await herramientaService.getHistorialMovimientos(id);
      if (response.success) {
        return Array.isArray(response.data) ? response.data : [];
      } else {
        showHttpError(response.message || "Error al cargar historial");
        return [];
      }
    } catch (err) {
      console.error(err);
      setError(err);
      showHttpError("Error al cargar historial");
      return [];
    } finally {
      setLoading(false);
    }
  };

  /**
   * Eliminar una herramienta
   * @param {number} id - ID de la herramienta
   * @returns {Promise<boolean>} true si se eliminó correctamente
   */
  const deleteHerramienta = async (id) => {
    setLoading(true);
    setError(null);
    try {
      const response = await herramientaService.deleteHerramienta(id);
      if (response.success) {
        showOperationSuccess(response.message || "Herramienta eliminada ✅");
        setHerramientas(prev => prev.filter(h => h.id !== id));
        return true;
      } else {
        showHttpError(response.message || "Error al eliminar herramienta");
        return false;
      }
    } catch (err) {
      console.error(err);
      showHttpError("No se pudo eliminar la herramienta ❌");
      setError(err);
      return false;
    } finally {
      setLoading(false);
    }
  };

  /**
   * Obtener lista de proyectos para asignar
   * @returns {Promise<Array>} Lista de proyectos
   */
  const getProyectosParaAsignar = async () => {
    try {
      const response = await herramientaService.getProyectosParaAsignar();
      
      if (response.success && Array.isArray(response.data)) {
        return response.data;
      }
      
      return [];
    } catch (err) {
      console.error('Error al obtener proyectos:', err);
      showHttpError("Error al cargar proyectos");
      return [];
    }
  };

  return {
    herramientas,
    loading,
    error,
    getHerramientas,
    getHerramientaById,
    createHerramienta,
    updateHerramienta,
    asignarUbicacion,
    getHistorialMovimientos,
    deleteHerramienta,
    getProyectosParaAsignar,
  };
};

export default useHerramientas;
