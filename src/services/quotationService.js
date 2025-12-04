// quotationService.js
import httpService from "./httpService";

const quotationService = {
  async createQuotation(data) {
    try {
      const response = await httpService.post("cotizacion/crear", data);
      return response.data;
    } catch (error) {
      console.error("Error creating quotation:", error);
      throw error;
    }
  },

  async getCotizaciones() {
    try {
      const response = await httpService.get("cotizaciones");
      return response;
    } catch (error) {
      console.error("Error obteniendo cotizaciones:", error);
      throw error;
    }
  },

    async crearConstructor(data) {
      try {
        const response = await httpService.post('cotizaciones/constructor/crear', data);
        return response;
      } catch (error) {
        console.error('Error creando constructor:', error);
        throw error;
      }
    },
    async getCotizacionById(id) {
      try {
        const response = await httpService.get(`cotizacion/${id}`);
        return response.data;
      } catch (error) {
        console.error("Error obteniendo cotización por ID:", error);
        throw error;
      }
    },

    async editCotizacion(id, data) {
      try {
        const response = await httpService.put(`cotizacion/${id}`, data);
        return response.data;
      } catch (error) {
        console.error("Error editando cotización:", error);
        throw error;
      }
    },

    async upsertRevision(revisionData) {
      try {
        // POST/PUT para crear o actualizar revisión
        const response = await httpService.post('cotizaciones/revision', revisionData);
        return response.data;
      } catch (error) {
        console.error('Error creando/actualizando revisión:', error);
        throw error;
      }
    },
    async getRevision({ id, idCotizacion }) {
      try {
        const params = [];
        if (id) params.push(`id=${id}`);
        if (idCotizacion) params.push(`idCotizacion=${idCotizacion}`);
        const query = params.length ? `?${params.join('&')}` : '';
        const response = await httpService.get(`cotizaciones/revision/obtener${query}`);
        return response.data;
      } catch (error) {
        console.error('Error obteniendo revisión:', error);
        throw error;
      }
    },
    async getConstructorByCotizacionId(id) {
      try {
        const response = await httpService.get(`cotizaciones/constructor/obtener?idCotizacion=${id}`);
        return response.data;
      } catch (error) {
        // Si el error es 404, significa que no existe constructor y es un caso válido
        if (error.status === 404) {
          return null;
        }
        // Para otros errores, los manejamos como antes
        console.error('Error obteniendo constructor:', error);
        throw error;
      }
    },

    // Agregar/actualizar materiales en una cotización
    async updateMateriales(idCotizacion, materiales) {
      try {
        const response = await httpService.patch(`cotizacion/${idCotizacion}/materiales`, { materiales });
        return response.data;
      } catch (error) {
        console.error('Error actualizando materiales:', error);
        throw error;
      }
    },

    // Actualizar materiales y evaluación de riesgos
    async updateMaterialesYRiesgos(idCotizacion, data) {
      try {
        const response = await httpService.patch(`cotizacion/${idCotizacion}/materiales`, data);
        return response.data;
      } catch (error) {
        console.error('Error actualizando materiales y riesgos:', error);
        throw error;
      }
    },

    // Gestión de versiones
    async createVersion(idCotizacion, versionData) {
      try {
        const response = await httpService.post(`cotizacion/${idCotizacion}/version`, versionData);
        return response.data;
      } catch (error) {
        console.error('Error creando versión:', error);
        throw error;
      }
    },

    async getQuotationVersions(idCotizacion) {
      try {
        const response = await httpService.get(`cotizacion/${idCotizacion}/versiones`);
        return response.data;
      } catch (error) {
        console.error('Error obteniendo versiones:', error);
        throw error;
      }
    },

    async getVersionById(idCotizacion, versionId) {
      try {
        const response = await httpService.get(`cotizacion/${idCotizacion}/version/${versionId}`);
        return response.data;
      } catch (error) {
        console.error('Error obteniendo versión:', error);
        throw error;
      }
    },

    async restoreVersion(idCotizacion, versionId) {
      try {
        const response = await httpService.post(`cotizacion/${idCotizacion}/version/${versionId}/restaurar`);
        return response.data;
      } catch (error) {
        console.error('Error restaurando versión:', error);
        throw error;
      }
    },
};

export default quotationService;
