// services/precioMaterialService.js

import httpService from './httpService';

const precioMaterialService = {
  // Web Scraping - usar proxy /api para incluir token automáticamente
  async scrapePrices(searchQuery = '', config = {}) {
    try {
      const payload = {
        query: (searchQuery || '').trim(),
        url: 'https://www.ventdepot.com/vproduct.cfm?idcat=DUC&idcats=SPS',
      };

      // El scraping puede tardar; aumentar timeout por defecto
      const mergedConfig = { timeout: 120000, ...config };
      const result = await httpService.post('/precios-material/scrape', payload, mergedConfig);
      if (result?.success) return result.data || [];
      throw new Error(result?.message || 'Error en el scraping');
    } catch (error) {
      console.error('Error al realizar web scraping:', error);
      throw error;
    }
  },

  // Obtener lista de productos guardados
  async getPreciosMaterial(params = {}, config = {}) {
    try {
      const qs = new URLSearchParams();
      if (params.search) qs.set('search', params.search);
      qs.set('limit', params.limit ?? 0);
      const url = `/precios-material${qs.toString() ? `?${qs.toString()}` : ''}`;

      const json = await httpService.get(url, config);
      if (json?.success && Array.isArray(json.data)) return json.data;
      return [];
    } catch (err) {
      console.error('Error getPreciosMaterial:', err);
      return [];
    }
  },

  async getPrecioMaterialById(id, config = {}) {
    try {
      const json = await httpService.get(`/precios-material/${id}`, config);
      return json;
    } catch (err) {
      console.error('Error getPrecioMaterialById:', err);
      return null;
    }
  },

  async createPrecioMaterial(payload, config = {}) {
    try {
      const json = await httpService.post('/precios-material', payload, config);
      return json;
    } catch (err) {
      console.error('Error createPrecioMaterial:', err);
      throw err;
    }
  },

  async updatePrecioMaterial(id, payload, config = {}) {
    try {
      const json = await httpService.put(`/precios-material/${id}`, payload, config);
      return json;
    } catch (err) {
      console.error('Error updatePrecioMaterial:', err);
      throw err;
    }
  },

  async deletePrecioMaterial(id, config = {}) {
    try {
      const json = await httpService.delete(`/precios-material/${id}`, config);
      return json;
    } catch (err) {
      console.error('Error deletePrecioMaterial:', err);
      throw err;
    }
  },

  // Batch upsert
  async batchUpsertPrecios(list = [], config = {}) {
    try {
      const mergedConfig = { timeout: 120000, ...config };
      const json = await httpService.post('/precios-material/batch', list, mergedConfig);
      return json;
    } catch (err) {
      console.error('Error batchUpsertPrecios:', err);
      throw err;
    }
  },
};

export default precioMaterialService;
