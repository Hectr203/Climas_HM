import httpService from "./httpService";

const empleadoDocumentoService = {
  /**
   * Subir documento de empleado
   * @param {File} file - Archivo del documento (PDF, JPG, PNG, DOC, DOCX)
   * @param {Object} metadata - { empleadoId, tipoDocumento, descripcion }
   */
  async subirDocumento(file, metadata = {}) {
    try {
      if (!file || !metadata.empleadoId || !metadata.tipoDocumento) {
        throw new Error('Faltan datos para subir el documento (file/empleadoId/tipoDocumento).');
      }

      const formData = new FormData();
      formData.append('file', file);
      formData.append('metadata', JSON.stringify({
        empleadoId: metadata.empleadoId,
        tipoDocumento: metadata.tipoDocumento,
        descripcion: metadata.descripcion || `${metadata.tipoDocumento} del empleado`
      }));

      const response = await httpService.post(
        '/empleados/documentos',
        formData,
        {
          headers: {
            'Content-Type': 'multipart/form-data'
          }
        }
      );
      
      return response;
    } catch (error) {
      console.error("Error al subir documento del empleado:", error);
      throw error;
    }
  },

  /**
   * Listar documentos de un empleado
   * @param {string} empleadoId - ID del empleado
   * @param {string} tipoDocumento - (Opcional) Filtrar por tipo específico
   */
  async listarDocumentos(empleadoId, tipoDocumento = null) {
    try {
      let url = `/empleados/${empleadoId}/documentos`;
      if (tipoDocumento) {
        url += `?tipoDocumento=${encodeURIComponent(tipoDocumento)}`;
      }
      
      const response = await httpService.get(url);
      return response;
    } catch (error) {
      const status = error?.response?.status || error?.status;
      if (status === 404) {
        // No hay documentos para este empleado
        return { success: true, data: { documentos: [], count: 0 } };
      }
      if (status === 500) {
        // Endpoint no disponible o error del servidor - retornar respuesta vacía
        return { success: true, data: { documentos: [], count: 0 } };
      }
      console.error("Error al listar documentos del empleado:", error);
      throw error;
    }
  },

  /**
   * Descargar documento de empleado (obtener URL temporal)
   * @param {string} documentoId - ID del documento
   * @param {number} expiresInMinutes - Minutos hasta que expire la URL (default: 60)
   */
  async descargarDocumento(documentoId, expiresInMinutes = 60) {
    try {
      const response = await httpService.get(
        `/empleados/documentos/${documentoId}?expiresInMinutes=${expiresInMinutes}`,
        {
          timeout: 60000 // 60 segundos para generar SAS URL
        }
      );
      return response;
    } catch (error) {
      console.error("Error al obtener URL del documento:", error);
      throw error;
    }
  },

  /**
   * Eliminar documento de empleado
   * @param {string} documentoId - ID del documento
   */
  async eliminarDocumento(documentoId) {
    try {
      const response = await httpService.delete(`/empleados/documentos/${documentoId}`);
      return response;
    } catch (error) {
      console.error("Error al eliminar documento del empleado:", error);
      throw error;
    }
  }
};

export default empleadoDocumentoService;
