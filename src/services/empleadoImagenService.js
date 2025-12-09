import httpService from "./httpService";

const empleadoImagenService = {
  /**
   * Subir imagen de perfil de empleado
   * @param {File} file - Archivo de imagen (JPG, PNG, WEBP)
   * @param {Object} metadata - { empleadoId, descripcion }
   */
  async subirImagen(file, metadata = {}) {
    try {
      if (!file || !metadata.empleadoId) {
        throw new Error('Faltan datos para subir la imagen (file/empleadoId).');
      }

      const formData = new FormData();
      formData.append('file', file);
      formData.append('metadata', JSON.stringify({
        empleadoId: metadata.empleadoId,
        descripcion: metadata.descripcion || 'Foto de perfil'
      }));

      const response = await httpService.post(
        '/empleados/imagen',
        formData,
        {
          headers: {
            'Content-Type': 'multipart/form-data'
          }
        }
      );
      
      return response;
    } catch (error) {
      console.error("Error al subir imagen del empleado:", error);
      throw error;
    }
  },

  /**
   * Verificar qué empleados tienen imagen de perfil (batch)
   * @param {Array<string>} empleadoIds - Array de IDs de empleados (máximo 100)
   * @returns {Promise<{conImagen: string[], sinImagen: string[]}>}
   */
  async verificarImagenesBatch(empleadoIds) {
    try {
      if (!empleadoIds || !Array.isArray(empleadoIds) || empleadoIds.length === 0) {
        return { conImagen: [], sinImagen: [] };
      }

      const response = await httpService.post(
        '/empleados/imagenes/verificar-batch',
        { empleadoIds }
      );
      
      if (response.success && response.data) {
        return {
          conImagen: response.data.conImagen || [],
          sinImagen: response.data.sinImagen || []
        };
      }
      
      return { conImagen: [], sinImagen: empleadoIds };
    } catch (error) {
      console.error('Error verificando imágenes batch:', error);
      return { conImagen: [], sinImagen: empleadoIds };
    }
  },

  /**
   * Obtener URL temporal de la imagen de perfil del empleado
   * @param {string} empleadoId - ID del empleado
   * @param {number} expiresInMinutes - Minutos hasta que expire la URL (default: 60)
   */
  async obtenerImagenUrl(empleadoId, expiresInMinutes = 60) {
    try {
      // Usar fetch en lugar de axios para evitar logs de 404 en consola
      const token = localStorage.getItem('authToken');
      const response = await fetch(
        `/api/empleados/${empleadoId}/imagen?expiresInMinutes=${expiresInMinutes}`,
        {
          method: 'GET',
          headers: {
            'Authorization': token ? `Bearer ${token}` : '',
            'Accept': 'application/json',
          },
        }
      );

      // Si es 404 o 500, retornar null silenciosamente (sin logs)
      if (response.status === 404 || response.status === 500) {
        return { success: true, data: null };
      }

      // Si no fue exitosa y no es 404/500, lanzar error
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      // Parsear respuesta exitosa
      const data = await response.json();
      return data;
    } catch (error) {
      // Solo loguear errores inesperados (no 404/500)
      if (error.message !== 'HTTP 404' && error.message !== 'HTTP 500') {
        console.error("Error al obtener URL de imagen del empleado:", error);
      }
      return { success: true, data: null };
    }
  },

  /**
   * Eliminar imagen de perfil del empleado
   * @param {string} empleadoId - ID del empleado
   */
  async eliminarImagen(empleadoId) {
    try {
      const response = await httpService.delete(`/empleados/${empleadoId}/imagen`);
      return response;
    } catch (error) {
      console.error("Error al eliminar imagen del empleado:", error);
      throw error;
    }
  }
};

export default empleadoImagenService;
