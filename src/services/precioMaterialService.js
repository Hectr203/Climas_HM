// services/precioMaterialService.js

// URL base de Azure Functions para precios de materiales
const AZURE_FUNCTION_BASE_URL = 'http://localhost:7071/api';

const precioMaterialService = {
  // Web Scraping - Obtener precios de VentDepot usando Azure Function
  async scrapePrices(searchQuery = '') {
    try {
      const queryText = searchQuery.trim();
      
      const response = await fetch(`${AZURE_FUNCTION_BASE_URL}/precios-material/scrape`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          query: queryText || '', // Enviar string vacío si no hay búsqueda
          url: 'https://www.ventdepot.com/vproduct.cfm?idcat=DUC&idcats=SPS'
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      
      // El backend devuelve { success: true, data: [...] }
      if (result.success) {
        return result.data;
      } else {
        throw new Error(result.message || 'Error en el scraping');
      }
    } catch (error) {
      console.error('Error al realizar web scraping:', error);
      throw error;
    }
  },
  
  // Obtener lista de productos guardados
  // limit=0 trae todos los productos (hasta 10000 según backend)
  async getPreciosMaterial(params = {}) {
    try {
      const qs = new URLSearchParams();
      if (params.search) qs.set('search', params.search);
      qs.set('limit', params.limit ?? 0); // 0 = traer todos

      const url = `${AZURE_FUNCTION_BASE_URL}/precios-material${qs.toString() ? `?${qs.toString()}` : ''}`;
      
      const resp = await fetch(url, { method: 'GET' });
      if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
      const json = await resp.json();
      
      if (json.success && Array.isArray(json.data)) {
        return json.data;
      }
      
      throw new Error(json.message || 'Error al obtener precios');
    } catch (err) {
      console.error('Error getPreciosMaterial:', err);
      return [];
    }
  },

  async getPrecioMaterialById(id) {
    try {
      const resp = await fetch(`${AZURE_FUNCTION_BASE_URL}/precios-material/${id}`, { method: 'GET' });
      if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
      const json = await resp.json();
      return json;
    } catch (err) {
      console.error('Error getPrecioMaterialById:', err);
      return null;
    }
  },

  async createPrecioMaterial(payload) {
    try {
      const resp = await fetch(`${AZURE_FUNCTION_BASE_URL}/precios-material`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
      const json = await resp.json();
      return json;
    } catch (err) {
      console.error('Error createPrecioMaterial:', err);
      throw err;
    }
  },

  async updatePrecioMaterial(id, payload) {
    try {
      const resp = await fetch(`${AZURE_FUNCTION_BASE_URL}/precios-material/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
      const json = await resp.json();
      return json;
    } catch (err) {
      console.error('Error updatePrecioMaterial:', err);
      throw err;
    }
  },

  async deletePrecioMaterial(id) {
    try {
      const resp = await fetch(`${AZURE_FUNCTION_BASE_URL}/precios-material/${id}`, { method: 'DELETE' });
      if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
      const json = await resp.json();
      return json;
    } catch (err) {
      console.error('Error deletePrecioMaterial:', err);
      throw err;
    }
  },

  // Batch upsert (array o { data: [] })
  async batchUpsertPrecios(list = []) {
    try {
      const resp = await fetch(`${AZURE_FUNCTION_BASE_URL}/precios-material/batch`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(list),
      });
      if (!resp.ok) {
        const txt = await resp.text();
        throw new Error(txt || `HTTP ${resp.status}`);
      }
      const json = await resp.json();
      return json;
    } catch (err) {
      console.error('Error batchUpsertPrecios:', err);
      throw err;
    }
  },
};

export default precioMaterialService;
