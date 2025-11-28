import httpService from "./httpService";

const TIMEOUT = 10000; // 10 segundos

const unitService = {
  /**
   * Obtiene todas las unidades de medida del catálogo
   * @param {Object} filters - Filtros opcionales
   * @returns {Promise<Object>} { success, data, message }
   */
  async getUnits(filters = {}) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), TIMEOUT);

    try {
      const query = new URLSearchParams(filters).toString();
      const url = query ? `/unidades?${query}` : "/unidades";

      const response = await httpService.get(url, {
        signal: controller.signal,
        headers: {
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache'
        }
      });

      clearTimeout(timeoutId);

      // Si la respuesta tiene una estructura con items
      if (response?.data?.items && Array.isArray(response.data.items)) {
        return {
          success: true,
          data: response.data.items.map(item => ({
            id: item.id,
            nombre: item.nombre || item.name,
            descripcion: item.descripcion || item.description || '',
            activo: item.activo !== undefined ? item.activo : true,
            fechaCreacion: item.fechaCreacion || item.createdAt
          })),
          message: `Se encontraron ${response.data.items.length} unidad(es)`
        };
      }

      // Si la respuesta es un array directo
      if (Array.isArray(response?.data)) {
        return {
          success: true,
          data: response.data.map(item => ({
            id: item.id,
            nombre: item.nombre || item.name,
            descripcion: item.descripcion || item.description || '',
            activo: item.activo !== undefined ? item.activo : true,
            fechaCreacion: item.fechaCreacion || item.createdAt
          })),
          message: `Se encontraron ${response.data.length} unidad(es)`
        };
      }

      // Si no hay datos válidos, retornar unidades por defecto
      return {
        success: true,
        data: this.getDefaultUnits(),
        message: 'Usando unidades por defecto'
      };

    } catch (error) {
      clearTimeout(timeoutId);
      
      // Si la petición fue cancelada, retornar unidades por defecto
      if (error.name === 'CanceledError' || error.message === 'canceled') {
        return {
          success: true,
          data: this.getDefaultUnits(),
          message: 'Usando unidades por defecto'
        };
      }

      console.error("Error al obtener unidades:", error);
      // En caso de error, retornar unidades por defecto
      return {
        success: true,
        data: this.getDefaultUnits(),
        message: 'Usando unidades por defecto'
      };
    }
  },

  /**
   * Crea una nueva unidad de medida
   * @param {Object} payload - { nombre, descripcion? }
   * @returns {Promise<Object>} { success, data, message }
   */
  async createUnit(payload) {
    try {
      const response = await httpService.post("/unidades/crear", payload);
      
      // Normalizar respuesta
      if (response?.data) {
        return {
          success: true,
          data: {
            id: response.data.id,
            nombre: response.data.nombre || response.data.name || payload.nombre,
            descripcion: response.data.descripcion || response.data.description || payload.descripcion || '',
            activo: response.data.activo !== undefined ? response.data.activo : true,
            fechaCreacion: response.data.fechaCreacion || response.data.createdAt
          },
          message: response.message || "Unidad creada exitosamente"
        };
      }

      // Si la respuesta es directa
      return {
        success: true,
        data: {
          id: response.id,
          nombre: response.nombre || response.name || payload.nombre,
          descripcion: response.descripcion || response.description || payload.descripcion || '',
          activo: response.activo !== undefined ? response.activo : true,
          fechaCreacion: response.fechaCreacion || response.createdAt
        },
        message: response.message || "Unidad creada exitosamente"
      };
    } catch (error) {
      console.error("Error al crear unidad:", error);
      throw error;
    }
  },

  /**
   * Retorna las unidades por defecto del sistema
   * @returns {Array}
   */
  getDefaultUnits() {
    return [
      { id: 'default-unidades', nombre: 'Unidades', descripcion: 'Unidades de medida', activo: true },
      { id: 'default-metros', nombre: 'Metros', descripcion: 'Unidad de longitud', activo: true },
      { id: 'default-litros', nombre: 'Litros', descripcion: 'Unidad de volumen', activo: true },
      { id: 'default-kilogramos', nombre: 'Kilogramos', descripcion: 'Unidad de masa', activo: true },
      { id: 'default-cajas', nombre: 'Cajas', descripcion: 'Unidad de empaque', activo: true },
      { id: 'default-paquetes', nombre: 'Paquetes', descripcion: 'Unidad de empaque', activo: true },
      { id: 'default-cilindros', nombre: 'Cilindros', descripcion: 'Unidad de contenedor', activo: true },
      { id: 'default-rollos', nombre: 'Rollos', descripcion: 'Unidad de empaque', activo: true },
    ];
  }
};

export default unitService;