import httpService from "./httpService";

/**
 * Servicio para gestión de herramientas
 * Permite registrar herramientas y controlar su ubicación en diferentes proyectos, obras, oficinas o taller
 */
const herramientaService = {
  /**
   * Obtener todas las herramientas con filtros opcionales
   * @param {Object} filters - Filtros para búsqueda (ej: { ubicacion: 'taller', proyecto_id: 123 })
   * @returns {Promise} Lista de herramientas
   */
  async getHerramientas(filters = {}) {
    try {
      const query = new URLSearchParams(filters).toString();
      const url = query ? `/herramientas?${query}` : "/herramientas";

      const response = await httpService.get(url);
      return response; // { success, data, message }
    } catch (error) {
      console.error("Error al obtener herramientas:", error);
      throw error;
    }
  },

  /**
   * Obtener una herramienta específica por ID
   * @param {number} id - ID de la herramienta
   * @returns {Promise} Datos de la herramienta
   */
  async getHerramientaById(id) {
    try {
      const response = await httpService.get(`/herramientas/${id}`);
      return response;
    } catch (error) {
      console.error("Error al obtener herramienta:", error);
      throw error;
    }
  },

  /**
   * Registrar una nueva herramienta
   * @param {Object} payload - { nombre, descripcion, numero_pieza, ubicacion_tipo, ubicacion_id }
   * @returns {Promise} Herramienta creada
   */
  async createHerramienta(payload) {
    try {
      const response = await httpService.post("/herramientas/crear", payload);
      return response;
    } catch (error) {
      console.error("Error al crear herramienta:", error);
      throw error;
    }
  },

  /**
   * Actualizar información de una herramienta
   * @param {number} id - ID de la herramienta
   * @param {Object} payload - Datos a actualizar
   * @returns {Promise} Herramienta actualizada
   */
  async updateHerramienta(id, payload) {
    try {
      const response = await httpService.put(`/herramientas/${id}`, payload);
      return response;
    } catch (error) {
      console.error("Error al actualizar herramienta:", error);
      throw error;
    }
  },

  /**
   * Asignar o cambiar la ubicación de una herramienta
   * @param {number} id - ID de la herramienta
   * @param {Object} payload - { ubicacion_tipo, ubicacion_id, ubicacion_nombre, observaciones }
   * @returns {Promise} Asignación creada con historial
   * 
   * Permisos por rol:
   * - admin: puede asignar a cualquier ubicación
   * - taller: puede asignar a taller, proyecto, obra
   * - proyectos: puede asignar a taller, obra
   * - obra: solo puede asignar a taller
   */
  async asignarUbicacion(id, payload) {
    try {
      const response = await httpService.post(
        `/herramientas/${id}/asignar`,
        payload
      );
      return response;
    } catch (error) {
      console.error("Error al asignar ubicación:", error);
      throw error;
    }
  },

  /**
   * Obtener historial de movimientos de una herramienta
   * @param {number} id - ID de la herramienta
   * @returns {Promise} Historial de asignaciones
   */
  async getHistorialMovimientos(id) {
    try {
      const response = await httpService.get(`/herramientas/${id}/historial`);
      return response;
    } catch (error) {
      console.error("Error al obtener historial:", error);
      throw error;
    }
  },

  /**
   * Eliminar una herramienta
   * @param {number} id - ID de la herramienta
   * @returns {Promise} Confirmación de eliminación
   */
  async deleteHerramienta(id) {
    try {
      const response = await httpService.delete(`/herramientas/${id}`);
      return response;
    } catch (error) {
      console.error("Error al eliminar herramienta:", error);
      throw error;
    }
  },

  /**
   * Obtener lista de proyectos para asignar herramientas
   * @returns {Promise} Lista de proyectos activos
   */
  async getProyectosParaAsignar() {
    try {
      const response = await httpService.get("/proyectos/todos");
      // Filtrar solo proyectos activos si es necesario
      if (response.success && Array.isArray(response.data)) {
        return {
          ...response,
          data: response.data.filter(p => p.estado !== 'cancelado' && p.estado !== 'finalizado')
        };
      }
      return response;
    } catch (error) {
      console.error("Error al obtener proyectos:", error);
      throw error;
    }
  },
};

export default herramientaService;
