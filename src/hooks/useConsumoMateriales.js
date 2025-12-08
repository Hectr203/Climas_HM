import { useState, useCallback } from 'react';
import { useNotifications } from '../context/NotificationContext';
import consumoMaterialService from '../services/consumoMaterialService';

const useConsumoMateriales = () => {
  const { showSuccess, showError, showHttpError } = useNotifications();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [consumoHoy, setConsumoHoy] = useState([]);
  const [historico, setHistorico] = useState([]);

  /**
   * Obtiene el consumo del día actual
   */
  const getConsumoHoy = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await consumoMaterialService.getConsumoHoy();
      if (response.success) {
        const data = Array.isArray(response.data) ? response.data : [];
        setConsumoHoy(data);
        return data;
      } else {
        setConsumoHoy([]);
        return [];
      }
    } catch (err) {
      console.error('Error en useConsumoMateriales.getConsumoHoy:', err);
      setError(err);
      setConsumoHoy([]);
      return [];
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Registra el consumo diario de materiales y descuenta automáticamente del inventario
   * @param {Array} materiales - Array de materiales consumidos [{ articuloId, cantidad, unidad, notas }]
   * @param {string} fecha - Fecha en formato YYYY-MM-DD (opcional, por defecto hoy)
   * @param {Function} onInventoryUpdate - Callback opcional para recargar inventario después del descuento
   */
  const registrarConsumo = useCallback(async (materiales, fecha = null, onInventoryUpdate = null) => {
    if (!materiales || materiales.length === 0) {
      showError('Debe agregar al menos un material');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const fechaConsumo = fecha || new Date().toISOString().split('T')[0];
      
      // Validar que todos los materiales tengan los campos requeridos
      const materialesValidos = materiales.every(m => 
        m.articuloId && m.cantidad && m.cantidad > 0
      );

      if (!materialesValidos) {
        showError('Todos los materiales deben tener artículo y cantidad válida');
        setLoading(false);
        return;
      }

      // Preparar payload para el backend
      const payload = {
        fecha: fechaConsumo,
        materiales: materiales.map(m => ({
          articuloId: m.articuloId,
          cantidad: parseFloat(m.cantidad),
          unidad: m.unidad || 'pcs',
          notas: m.notas || ''
        }))
      };

      // Registrar consumo en el backend (el backend descuenta automáticamente del inventario)
      const response = await consumoMaterialService.registrarConsumo(payload);

      if (response.success) {
        // Notificar que se debe recargar el inventario
        if (onInventoryUpdate && typeof onInventoryUpdate === 'function') {
          onInventoryUpdate();
        }

        // Recargar consumo del día
        await getConsumoHoy();

        showSuccess('Consumo registrado y descontado del inventario exitosamente');
        return response.data;
      } else {
        showError(response.message || 'Error al registrar el consumo');
        return null;
      }
    } catch (err) {
      console.error('Error en useConsumoMateriales.registrarConsumo:', err);
      setError(err);
      showHttpError('Error al registrar el consumo de materiales');
      throw err;
    } finally {
      setLoading(false);
    }
  }, [showSuccess, showError, showHttpError, getConsumoHoy]);

  /**
   * Obtiene el consumo de un día específico
   * @param {string} fecha - Fecha en formato YYYY-MM-DD
   */
  const getConsumoPorDia = useCallback(async (fecha) => {
    setLoading(true);
    setError(null);
    try {
      const response = await consumoMaterialService.getConsumoPorDia(fecha);
      if (response.success) {
        return Array.isArray(response.data) ? response.data : [];
      } else {
        return [];
      }
    } catch (err) {
      console.error('Error en useConsumoMateriales.getConsumoPorDia:', err);
      setError(err);
      return [];
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Obtiene el histórico de consumo por rango de fechas
   * @param {string} fechaInicio - Fecha inicio en formato YYYY-MM-DD
   * @param {string} fechaFin - Fecha fin en formato YYYY-MM-DD
   */
  const getHistoricoConsumo = useCallback(async (fechaInicio, fechaFin) => {
    setLoading(true);
    setError(null);
    try {
      const response = await consumoMaterialService.getHistoricoConsumo(fechaInicio, fechaFin);
      if (response.success) {
        const historicoData = Array.isArray(response.data) ? response.data : [];
        setHistorico(historicoData);
        return historicoData;
      } else {
        setHistorico([]);
        return [];
      }
    } catch (err) {
      console.error('Error en useConsumoMateriales.getHistoricoConsumo:', err);
      setError(err);
      setHistorico([]);
      return [];
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    loading,
    error,
    consumoHoy,
    historico,
    registrarConsumo,
    getConsumoHoy,
    getConsumoPorDia,
    getHistoricoConsumo,
  };
};

export default useConsumoMateriales;

