// pagosProgramadosService.js
import httpService from "./httpService";

const pagosProgramadosService = {
  /**
   * Crear un nuevo plan de pagos programados
   * @param {Object} pagosProgramadosData - Datos del plan de pagos
   * @returns {Promise} Respuesta del servidor
   */
  async crearPagosProgramados(pagosProgramadosData) {
    try {
      const response = await httpService.post("pagos-programados/crear", {
        PagosProgramados: pagosProgramadosData
      });
      return response.data;
    } catch (error) {
      console.error("Error creating pagos programados:", error);
      throw error;
    }
  },

  /**
   * Obtener pagos programados por ID
   * @param {string} id - ID del plan de pagos programados
   * @returns {Promise} Plan de pagos programados encontrado
   */
  async obtenerPagosProgramadosPorId(id) {
    try {
      const response = await httpService.get(`pagos-programados/${id}`);
      return response.data;
    } catch (error) {
      console.error("Error getting pagos programados by ID:", error);
      throw error;
    }
  },

  /**
   * Obtener pagos programados por cotización
   * @param {string} idCotizacion - ID de la cotización
   * @returns {Promise} Pagos programados encontrados
   */
  async obtenerPagosPorCotizacion(idCotizacion) {
    try {
      const response = await httpService.get(`pagos-programados/cotizacion/${idCotizacion}`);
      return response.data;
    } catch (error) {
      console.error("Error getting pagos programados:", error);
      throw error;
    }
  },

  /**
   * Actualizar pagos programados existentes
   * @param {string} idCotizacion - ID de la cotización
   * @param {Object} updateData - Datos a actualizar
   * @returns {Promise} Respuesta del servidor
   */
  async actualizarPagosProgramados(idCotizacion, updateData) {
    try {
      const response = await httpService.put(`pagos-programados/cotizacion/${idCotizacion}`, {
        PagosProgramados: updateData
      });
      return response.data;
    } catch (error) {
      console.error("Error updating pagos programados:", error);
      throw error;
    }
  },

  /**
   * Eliminar plan de pagos programados
   * @param {string} id - ID del plan de pagos
   * @returns {Promise} Respuesta del servidor
   */
  async eliminarPagosProgramados(id) {
    try {
      const response = await httpService.delete(`pagos-programados/${id}`);
      return response.data;
    } catch (error) {
      console.error("Error deleting pagos programados:", error);
      throw error;
    }
  }
};

export default pagosProgramadosService;