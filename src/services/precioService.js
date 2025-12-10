// services/preciosService.js
import httpService from './httpService';

const preciosService = {
  // Lista de precios (puede filtrar por cotizacionId, page, limit)
  async getPrecios(params = {}) {
    try {
      const query = new URLSearchParams(params).toString();
      const url = query ? `/precios?${query}` : '/precios';
      const data = await httpService.get(url);
      return data;
    } catch (error) {
      console.error('Error al obtener precios:', error);
      throw error;
    }
  },

  // Azúcar sintáctico: obtener precios por cotización
  async getPreciosByCotizacion(cotizacionId, extraParams = {}) {
    return this.getPrecios({ cotizacionId, ...extraParams });
  },

  // Obtener un precio por ID
  async getPrecioById(id) {
    try {
      const data = await httpService.get(`/precios/${id}`);
      return data;
    } catch (error) {
      console.error(`Error al obtener el precio con ID ${id}:`, error);
      throw error;
    }
  },

  // Crear un nuevo registro de precios (listaPrecios, etc.)
  async createPrecio(payload) {
    try {
      const data = await httpService.post('/precios/crear', payload);
      return data;
    } catch (error) {
      console.error('Error al crear precio:', error);
      throw error;
    }
  },

  // Actualizar un precio existente
  async updatePrecio(id, payload) {
    try {
      const data = await httpService.put(`/precios/${id}`, payload);
      return data;
    } catch (error) {
      console.error(`Error al actualizar el precio con ID ${id}:`, error);
      throw error;
    }
  },

  // Eliminar un precio
  async deletePrecio(id) {
    try {
      const data = await httpService.delete(`/precios/${id}`);
      return data;
    } catch (error) {
      console.error(`Error al eliminar el precio con ID ${id}:`, error);
      throw error;
    }
  },
};

export default preciosService;
