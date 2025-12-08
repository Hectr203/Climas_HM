import { useState, useCallback } from 'react';
import tallerImagenService from '../services/tallerImagenService';
import { useNotifications } from '../context/NotificationContext';

const useTallerImagenes = () => {
  const [imagenes, setImagenes] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const { showSuccess, showError } = useNotifications();

  const subirImagen = useCallback(async (proyectoId, file, metadata = {}) => {
    setLoading(true);
    setError(null);
    try {
      const response = await tallerImagenService.subirImagen(proyectoId, file, metadata);
      showSuccess('Imagen de taller subida correctamente');
      return response;
    } catch (err) {
      setError(err);
      const errorMsg = err?.response?.status === 500 
        ? 'El servidor backend aún no ha implementado este endpoint. Contacta al equipo de backend.'
        : 'Error al subir imagen de taller';
      showError(errorMsg);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [showSuccess, showError]);

  const listarImagenes = useCallback(async (proyectoId) => {
    setLoading(true);
    setError(null);
    try {
      const response = await tallerImagenService.listarImagenes(proyectoId);
      // El backend devuelve { success: true, data: [...] }
      const imagenesData = response?.data || response || [];
      setImagenes(imagenesData);
      return imagenesData;
    } catch (err) {
      setError(err);
      setImagenes([]);
      return [];
    } finally {
      setLoading(false);
    }
  }, []);

  const obtenerImagenUrl = useCallback(async (proyectoId, imagenId, expiresInMinutes = 60) => {
    try {
      const response = await tallerImagenService.obtenerImagenUrl(proyectoId, imagenId, expiresInMinutes);
      // El backend devuelve { success: true, data: { url: "..." } }
      return response?.data?.url || response?.url || null;
    } catch (err) {
      console.error('Error al obtener URL de imagen de taller:', err);
      return null;
    }
  }, []);

  const eliminarImagen = useCallback(async (proyectoId, imagenId) => {
    setLoading(true);
    setError(null);
    try {
      await tallerImagenService.eliminarImagen(proyectoId, imagenId);
      setImagenes(prev => prev.filter(img => img.id !== imagenId && img._id !== imagenId));
      showSuccess('Imagen de taller eliminada correctamente');
      return true;
    } catch (err) {
      setError(err);
      showError('Error al eliminar imagen de taller');
      return false;
    } finally {
      setLoading(false);
    }
  }, [showSuccess, showError]);

  const actualizarImagen = useCallback(async (proyectoId, imagenId, metadata) => {
    setLoading(true);
    setError(null);
    try {
      await tallerImagenService.actualizarImagen(proyectoId, imagenId, metadata);
      showSuccess('Imagen de taller actualizada correctamente');
      return true;
    } catch (err) {
      setError(err);
      showError('Error al actualizar imagen de taller');
      return false;
    } finally {
      setLoading(false);
    }
  }, [showSuccess, showError]);

  const descargarImagen = useCallback(async (proyectoId, imagenId, nombreArchivo) => {
    setLoading(true);
    setError(null);
    try {
      await tallerImagenService.descargarImagen(proyectoId, imagenId, nombreArchivo);
      showSuccess('Imagen de taller descargada');
      return true;
    } catch (err) {
      setError(err);
      showError('Error al descargar imagen de taller');
      return false;
    } finally {
      setLoading(false);
    }
  }, [showSuccess, showError]);

  return {
    imagenes,
    loading,
    error,
    subirImagen,
    listarImagenes,
    obtenerImagenUrl,
    eliminarImagen,
    actualizarImagen,
    descargarImagen
  };
};

export default useTallerImagenes;
