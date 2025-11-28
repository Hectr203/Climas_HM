import { useState } from "react";
import { useNotifications } from "../context/NotificationContext";
import unitService from "../services/unitService";

const useUnits = () => {
  const { showHttpError, showOperationSuccess } = useNotifications();
  const [units, setUnits] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  /**
   * Obtiene todas las unidades de medida
   * @param {Object} filters - Filtros opcionales
   * @returns {Promise<Array>}
   */
  const getUnits = async (filters = {}) => {
    if (loading) return units; // Evitar múltiples llamadas simultáneas
    
    setLoading(true);
    setError(null);
    
    try {
      const response = await unitService.getUnits(filters);
      
      if (response?.success) {
        const unitsData = Array.isArray(response.data) ? response.data : [];
        setUnits(unitsData);
        return unitsData;
      } else {
        console.warn('Respuesta inesperada de unidades:', response);
        // Usar unidades por defecto
        const defaultUnits = unitService.getDefaultUnits();
        setUnits(defaultUnits);
        return defaultUnits;
      }
    } catch (err) {
      console.error('Error en getUnits:', err);
      setError(err);
      
      // No mostrar error si la petición fue cancelada
      if (err.message !== 'canceled' && !err.isNetworkError) {
        // Usar unidades por defecto en lugar de mostrar error
        const defaultUnits = unitService.getDefaultUnits();
        setUnits(defaultUnits);
        return defaultUnits;
      }
      
      // En caso de error, usar unidades por defecto
      const defaultUnits = unitService.getDefaultUnits();
      setUnits(defaultUnits);
      return defaultUnits;
    } finally {
      setLoading(false);
    }
  };

  /**
   * Crea una nueva unidad de medida
   * @param {Object} payload - { nombre, descripcion? }
   * @returns {Promise<Object|null>}
   */
  const createUnit = async (payload) => {
    setLoading(true);
    setError(null);
    
    try {
      // Validar que el nombre no esté vacío
      if (!payload?.nombre || !payload.nombre.trim()) {
        showHttpError("El nombre de la unidad es requerido");
        return null;
      }

      // Normalizar el nombre (primera letra mayúscula)
      const normalizedPayload = {
        ...payload,
        nombre: payload.nombre.trim().charAt(0).toUpperCase() + payload.nombre.trim().slice(1).toLowerCase()
      };

      const response = await unitService.createUnit(normalizedPayload);
      
      if (response?.success) {
        showOperationSuccess(response.message || "Unidad creada exitosamente");
        
        // Agregar la nueva unidad a la lista actual
        setUnits(prev => {
          // Verificar que no exista ya
          const exists = prev.some(u => 
            u.nombre?.toLowerCase() === normalizedPayload.nombre.toLowerCase()
          );
          if (exists) {
            return prev;
          }
          return [...prev, response.data];
        });
        
        return response.data;
      } else {
        showHttpError(response.message || "Error desconocido al crear unidad");
        return null;
      }
    } catch (err) {
      console.error(err);
      showHttpError("No se pudo crear la unidad");
      setError(err);
      return null;
    } finally {
      setLoading(false);
    }
  };

  /**
   * Obtiene las opciones formateadas para Select
   * @returns {Array} [{ value, label }]
   */
  const getUnitOptions = () => {
    return units
      .filter(unit => unit.activo !== false)
      .map(unit => ({
        value: unit.nombre.toLowerCase(),
        label: unit.nombre
      }))
      .sort((a, b) => a.label.localeCompare(b.label));
  };

  return { 
    units, 
    loading, 
    error, 
    getUnits, 
    createUnit, 
    getUnitOptions 
  };
};

export default useUnits;