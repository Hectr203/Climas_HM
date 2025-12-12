import { useState, useCallback } from 'react';
import proyectoImagenService from '../services/proyectoImagenService';

const useProyectoImagenes = () => {
  const [imagenes, setImagenes] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Subir imagen
  const subirImagen = useCallback(async (proyectoId, file, metadata = {}) => {
    setLoading(true);
    setError(null);
    try {
      const response = await proyectoImagenService.subirImagen(proyectoId, file, metadata);
      // Soportar ambos formatos de respuesta: {success: true} y {status: 'success'}
      if ((response?.success === true || response?.status === 'success') && response?.data) {
        return { success: true, data: response.data };
      }
      return { success: false, message: response?.message || 'Error al subir imagen' };
    } catch (err) {
      const errorMsg = err.response?.data?.message || err.message || 'Error al subir imagen';
      setError(errorMsg);
      console.error('Error uploading image:', err);
      return { success: false, message: errorMsg };
    } finally {
      setLoading(false);
    }
  }, []);

  // Listar imágenes de un proyecto
  const listarImagenes = useCallback(async (proyectoId) => {
    setLoading(true);
    setError(null);
    try {
      const response = await proyectoImagenService.listarImagenes(proyectoId);
      // Soportar ambos formatos de respuesta: {success: true} y {status: 'success'}
      if ((response?.success === true || response?.status === 'success') && response?.data) {
        const imagenesData = Array.isArray(response.data) ? response.data : [];
        setImagenes(imagenesData);
        return imagenesData;
      }
      return [];
    } catch (err) {
      const errorMsg = err.response?.data?.message || err.message || 'Error al cargar imágenes';
      setError(errorMsg);
      console.error('Error fetching images:', err);
      return [];
    } finally {
      setLoading(false);
    }
  }, []);

  // Obtener URL temporal de imagen
  const obtenerImagenUrl = useCallback(async (proyectoId, imagenId, expiresInMinutes = 60) => {
    setLoading(true);
    setError(null);
    try {
      const response = await proyectoImagenService.obtenerImagenUrl(proyectoId, imagenId, expiresInMinutes);
      // Soportar ambos formatos de respuesta
      if ((response?.success === true || response?.status === 'success') && response?.data) {
        const url = response.data.url || response.data.sasUrl || response.data;
        return { success: true, url, data: response.data };
      }
      return { success: false, message: response?.message || 'Error al obtener URL' };
    } catch (err) {
      let errorMsg = 'Error al obtener URL de imagen';
      
      if (err.message?.includes('timeout')) {
        errorMsg = 'Timeout: El servidor tardó demasiado en responder. Intente nuevamente.';
      } else if (err.response?.data?.message) {
        errorMsg = err.response.data.message;
      } else if (err.message) {
        errorMsg = err.message;
      }
      
      setError(errorMsg);
      console.error('Error getting image URL:', err);
      return { success: false, message: errorMsg, error: err };
    } finally {
      setLoading(false);
    }
  }, []);

  // Eliminar imagen
  const eliminarImagen = useCallback(async (proyectoId, imagenId) => {
    setLoading(true);
    setError(null);
    try {
      const response = await proyectoImagenService.eliminarImagen(proyectoId, imagenId);
      // Soportar ambos formatos de respuesta: {success: true} y {status: 'success'}
      if (response?.success === true || response?.status === 'success') {
        // Actualizar lista local
        setImagenes(prev => prev.filter(img => img.id !== imagenId));
        return { success: true, data: response.data };
      }
      return { success: false, message: response?.message || 'Error al eliminar imagen' };
    } catch (err) {
      const errorMsg = err.response?.data?.message || err.message || 'Error al eliminar imagen';
      setError(errorMsg);
      console.error('Error deleting image:', err);
      return { success: false, message: errorMsg };
    } finally {
      setLoading(false);
    }
  }, []);

  // Actualizar imagen
  const actualizarImagen = useCallback(async (proyectoId, imagenId, metadata) => {
    setLoading(true);
    setError(null);
    try {
      const response = await proyectoImagenService.actualizarImagen(proyectoId, imagenId, metadata);
      // Soportar ambos formatos de respuesta
      if (response?.success === true || response?.status === 'success') {
        // Actualizar lista local
        setImagenes(prev => prev.map(img => 
          img.id === imagenId 
            ? { 
                ...img, 
                nombre: metadata.name || metadata.nombre || img.nombre,
                categoria: metadata.category || metadata.categoria || img.categoria,
                descripcion: metadata.description || metadata.descripcion || img.descripcion
              } 
            : img
        ));
        return { success: true, data: response.data };
      }
      return { success: false, message: response?.message || 'Error al actualizar imagen' };
    } catch (err) {
      const errorMsg = err.response?.data?.message || err.message || 'Error al actualizar imagen';
      setError(errorMsg);
      console.error('Error updating image:', err);
      return { success: false, message: errorMsg };
    } finally {
      setLoading(false);
    }
  }, []);

  // Descargar imagen
  const descargarImagen = useCallback(async (proyectoId, imagenId, nombreArchivo) => {
    setLoading(true);
    setError(null);
    try {
      await proyectoImagenService.descargarImagen(proyectoId, imagenId, nombreArchivo);
      return { success: true };
    } catch (err) {
      const errorMsg = err.response?.data?.message || err.message || 'Error al descargar imagen';
      setError(errorMsg);
      console.error('Error downloading image:', err);
      return { success: false, message: errorMsg };
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    imagenes,
    loading,
    error,
    subirImagen,
    listarImagenes,
    obtenerImagenUrl,
    eliminarImagen,
    actualizarImagen,
    descargarImagen,
    setImagenes
  };
};

export default useProyectoImagenes;
