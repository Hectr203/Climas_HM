import { useState, useCallback } from 'react'
import { jwtDecode } from 'jwt-decode'
import httpService from '../services/httpService'

export const useNotificaciones = () => {
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState(null)
    const [data, setData] = useState(null)

    // Función para extraer el ID del usuario del token (memoizada para evitar re-creaciones)
    const obtenerUserIdDelToken = useCallback(() => {
        try {
            const authToken = localStorage.getItem('authToken') || localStorage.getItem('token');
            if (!authToken) {
                return null;
            }

            const decoded = jwtDecode(authToken);
            const userId = decoded.sub || decoded.userId || decoded.id || decoded.user_id;

            if (!userId) {
                return null;
            }

            return userId;
        } catch (err) {
            return null;
        }
    }, [])

    // Crear notificación
    const guardarNotificacion = async (notificacionData) => {
        setLoading(true)
        setError(null)
        try {
            const response = await httpService.api.post('/notificaciones/crear', notificacionData)
            setData(response.data)
            return response.data
        } catch (err) {
            setError(err.response?.data?.message || err.message)
            throw err
        } finally {
            setLoading(false)
        }
    }

    // Editar notificación
    const editarNotificacion = async (id, updateData) => {
        setLoading(true)
        setError(null)
        try {
            const response = await httpService.api.put(`/notificaciones/${id}`, updateData)
            setData(response.data)
            return response.data
        } catch (err) {
            setError(err.response?.data?.message || err.message)
            throw err
        } finally {
            setLoading(false)
        }
    }

    // Obtener todas las notificaciones (opcional filtro por usuarioId)
    const obtenerNotificaciones = async (usuarioId = null) => {
        setLoading(true)
        setError(null)
        try {
            const params = usuarioId ? { usuarioId } : {}
            const response = await httpService.api.get('/notificaciones', { params })
            setData(response.data)
            return response.data
        } catch (err) {
            setError(err.response?.data?.message || err.message)
            throw err
        } finally {
            setLoading(false)
        }
    }

    // Obtener una notificación por ID
    const obtenerNotificacion = async (id) => {
        setLoading(true)
        setError(null)
        try {
            const response = await httpService.api.get(`/notificaciones/${id}`)
            setData(response.data)
            return response.data
        } catch (err) {
            setError(err.response?.data?.message || err.message)
            throw err
        } finally {
            setLoading(false)
        }
    }

    // Eliminar notificación
    const eliminarNotificacion = async (id) => {
        setLoading(true)
        setError(null)
        try {
            const response = await httpService.api.delete(`/notificaciones/${id}`)
            setData(response.data)
            return response.data
        } catch (err) {
            setError(err.response?.data?.message || err.message)
            throw err
        } finally {
            setLoading(false)
        }
    }

    // Obtener notificaciones por usuario
    const obtenerNotificacionesPorUsuario = useCallback(async (usuarioId = null) => {
        setLoading(true)
        setError(null)
        try {
            const userId = usuarioId || obtenerUserIdDelToken();
            if (!userId) {
                throw new Error('No se pudo obtener el ID del usuario');
            }

            const response = await httpService.api.get(`/notificaciones/usuario/${userId}`)
            const notifs = response.data.data || response.data;
            setData(notifs)
            return notifs
        } catch (err) {
            setError(err.response?.data?.message || err.message)
            throw err
        } finally {
            setLoading(false)
        }
    }, [obtenerUserIdDelToken])

    // Obtener notificaciones sin leer por usuario
    const obtenerNotificacionesSinLeer = async (usuarioId = null) => {
        setLoading(true)
        setError(null)
        try {
            const userId = usuarioId || obtenerUserIdDelToken();
            if (!userId) {
                throw new Error('No se pudo obtener el ID del usuario');
            }

            const response = await httpService.api.get(`/notificaciones/sin-leer/${userId}`)
            setData(response.data)
            return response.data
        } catch (err) {
            setError(err.response?.data?.message || err.message)
            throw err
        } finally {
            setLoading(false)
        }
    }

    // Obtener total de notificaciones sin leer por usuario (memoizada)
    const obtenerTotalNotificacionesSinLeer = useCallback(async (usuarioId = null) => {
        setLoading(true)
        setError(null)
        try {
            const userId = usuarioId || obtenerUserIdDelToken();
            if (!userId) {
                throw new Error('No se pudo obtener el ID del usuario');
            }

            const response = await httpService.api.get(`/notificaciones/total-sin-leer/${userId}`)
            setData(response.data)
            return response.data
        } catch (err) {
            setError(err.response?.data?.message || err.message)
            throw err
        } finally {
            setLoading(false)
        }
    }, [obtenerUserIdDelToken])

    // Marcar notificación como leída
    const marcarNotificacionLeida = async (id) => {
        setLoading(true)
        setError(null)
        try {
            const response = await httpService.api.put(`/notificaciones/${id}/marcar-leida`)
            setData(response.data)
            return response.data
        } catch (err) {
            setError(err.response?.data?.message || err.message)
            throw err
        } finally {
            setLoading(false)
        }
    }

    return {
        loading,
        error,
        data,
        guardarNotificacion,
        editarNotificacion,
        obtenerNotificaciones,
        obtenerNotificacion,
        eliminarNotificacion,
        obtenerNotificacionesPorUsuario,
        obtenerNotificacionesSinLeer,
        obtenerTotalNotificacionesSinLeer,
        marcarNotificacionLeida,
    }
}

