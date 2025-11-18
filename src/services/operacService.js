import httpService from "./httpService";

const operacService = {
  // Ahora acepta filtros dinámicos
  async getWorkOrders(filters = {}) {
    try {
      const query = new URLSearchParams(filters).toString();
      const url = query ? `/trabajos?${query}` : "/trabajos";

      const response = await httpService.get(url);
      return response; // { success, data, message }
    } catch (error) {
      console.error("Error al obtener trabajos:", error);
      throw error;
    }
  },

  async createWorkOrder(payload) {
    try {
      const response = await httpService.post("/trabajos/crear", payload);
      return response;
    } catch (error) {
      console.error("Error al crear trabajo:", error);
      throw error;
    }
  },

  async updateWorkOrder(id, payload) {
    try {
      const response = await httpService.put(`/trabajos/${id}`, payload);
      return response;
    } catch (error) {
      console.error("Error al actualizar trabajo:", error);
      throw error;
    }
  },

  async deleteWorkOrder(id) {
    try {
      const response = await httpService.delete(`/trabajos/${id}`);
      return response;
    } catch (error) {
      console.error("Error al eliminar trabajo:", error);
      throw error;
    }
  },
};

export default operacService;
