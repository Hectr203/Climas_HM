import httpService from "./httpService";

const tallerImagenService = {
  // Subir imagen de taller
  async subirImagen(proyectoId, file, metadata = {}) {
    try {
      if (!proyectoId || !file) {
        throw new Error('Faltan datos para subir la imagen (proyectoId/file).');
      }

      const formData = new FormData();
      formData.append('file', file);
      
      // Agregar metadata adicional si existe
      if (metadata.descripcion) {
        formData.append('descripcion', metadata.descripcion);
      }
      if (metadata.categoria || metadata.category) {
        formData.append('categoria', metadata.categoria || metadata.category);
      }
      if (metadata.nombre || metadata.name) {
        formData.append('nombre', metadata.nombre || metadata.name);
      }

      const response = await httpService.post(
        `/taller/${proyectoId}/imagenes/subir`,
        formData,
        {
          headers: {
            'Content-Type': 'multipart/form-data'
          }
        }
      );
      
      return response;
    } catch (error) {
      console.error("Error al subir imagen de taller:", error);
      throw error;
    }
  },

  // Listar imágenes de taller de un proyecto
  async listarImagenes(proyectoId) {
    try {
      const response = await httpService.get(`/taller/${proyectoId}/imagenes`);
      return response;
    } catch (error) {
      // No mostrar error si es 404 o 500 (el interceptor ya lo maneja)
      if (error?.status !== 404 && error?.status !== 500) {
        console.error("Error al listar imágenes de taller:", error);
      }
      throw error;
    }
  },

  // Obtener URL temporal de una imagen
  async obtenerImagenUrl(proyectoId, imagenId, expiresInMinutes = 60) {
    try {
      const response = await httpService.get(
        `/taller/${proyectoId}/imagenes/${imagenId}?expires=${expiresInMinutes}`,
        {
          timeout: 60000 // 60 segundos para generar SAS URL
        }
      );
      return response;
    } catch (error) {
      console.error("Error al obtener URL de imagen de taller:", error);
      throw error;
    }
  },

  // Eliminar imagen
  async eliminarImagen(proyectoId, imagenId) {
    try {
      const response = await httpService.delete(
        `/taller/${proyectoId}/imagenes/${imagenId}`
      );
      return response;
    } catch (error) {
      console.error("Error al eliminar imagen de taller:", error);
      throw error;
    }
  },

  // Actualizar metadata de imagen
  async actualizarImagen(proyectoId, imagenId, metadata) {
    try {
      const response = await httpService.put(
        `/taller/${proyectoId}/imagenes/${imagenId}`,
        {
          nombre: metadata.name || metadata.nombre,
          categoria: metadata.category || metadata.categoria,
          descripcion: metadata.description || metadata.descripcion
        }
      );
      return response;
    } catch (error) {
      console.error("Error al actualizar imagen de taller:", error);
      throw error;
    }
  },

  // Descargar imagen (usa endpoint proxy para evitar CORS)
  async descargarImagen(proyectoId, imagenId, nombreArchivo) {
    try {
      const response = await httpService.get(
        `/taller/${proyectoId}/imagenes/${imagenId}/download`,
        {
          responseType: 'blob' // Importante para archivos binarios
        }
      );
      
      // Crear blob URL y descargar
      const blob = new Blob([response.data || response]);
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = nombreArchivo;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      
      return { success: true };
    } catch (error) {
      console.error("Error al descargar imagen de taller:", error);
      throw error;
    }
  }
};

export default tallerImagenService;
