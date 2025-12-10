import httpService from "./httpService";

const consumoMaterialService = {
  /**
   * Registra el consumo diario de materiales
   * @param {Object} payload - Datos del consumo { fecha, materiales: [{ articuloId, cantidad, unidad, notas }] }
   * @returns {Promise} Promise con la respuesta del servidor
   */
  async registrarConsumo(payload) {
    try {
      const response = await httpService.post("/consumo-materiales/registrar", payload);
      return response;
    } catch (error) {
      console.error("Error al registrar consumo de materiales:", error);
      throw error;
    }
  },

  /**
   * Obtiene el listado de materiales consumidos en un día específico
   * @param {string} fecha - Fecha en formato YYYY-MM-DD
   * @returns {Promise} Promise con la respuesta del servidor
   */
  async getConsumoPorDia(fecha) {
    try {
      const response = await httpService.get(`/consumo-materiales/dia/${fecha}`);
      return response;
    } catch (error) {
      console.error("Error al obtener consumo del día:", error);
      throw error;
    }
  },

  /**
   * Obtiene el histórico de consumo de materiales por rango de fechas
   * @param {string} fechaInicio - Fecha inicio en formato YYYY-MM-DD
   * @param {string} fechaFin - Fecha fin en formato YYYY-MM-DD
   * @returns {Promise} Promise con la respuesta del servidor
   */
  async getHistoricoConsumo(fechaInicio, fechaFin) {
    try {
      const response = await httpService.get(
        `/consumo-materiales/historico?fechaInicio=${fechaInicio}&fechaFin=${fechaFin}`
      );
      return response;
    } catch (error) {
      console.error("Error al obtener histórico de consumo:", error);
      throw error;
    }
  },

  /**
   * Obtiene el consumo del día actual
   * @returns {Promise} Promise con la respuesta del servidor
   */
  async getConsumoHoy() {
    try {
      const response = await httpService.get("/consumo-materiales/hoy");
      return response;
    } catch (error) {
      console.error("Error al obtener consumo de hoy:", error);
      throw error;
    }
  },
};

export default consumoMaterialService;

