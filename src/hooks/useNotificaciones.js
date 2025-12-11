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
                console.error('❌ [NOTIFICACIONES] No se encontró token de autenticación');
                return null;
            }

            const decoded = jwtDecode(authToken);
            const userId = decoded.sub || decoded.userId || decoded.id || decoded.user_id;

            console.log('🔍 [NOTIFICACIONES] Token decodificado:', decoded);
            console.log('🔍 [NOTIFICACIONES] ID de usuario extraído:', userId);

            if (!userId) {
                console.error('❌ [NOTIFICACIONES] No se encontró ID de usuario en el token');
                return null;
            }

            return userId;
        } catch (err) {
            console.error('❌ [NOTIFICACIONES] Error decodificando token:', err);
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
    const obtenerNotificacionesPorUsuario = async (usuarioId = null) => {
        setLoading(true)
        setError(null)
        try {
            const userId = usuarioId || obtenerUserIdDelToken();
            if (!userId) {
                throw new Error('No se pudo obtener el ID del usuario');
            }
            console.log('🔔 [NOTIFICACIONES] Obteniendo notificaciones para usuario:', userId);

            const response = await httpService.api.get(`/notificaciones/usuario/${userId}`)
            setData(response.data)
            return response.data
        } catch (err) {
            setError(err.response?.data?.message || err.message)
            throw err
        } finally {
            setLoading(false)
        }
    }

    // Obtener notificaciones sin leer por usuario
    const obtenerNotificacionesSinLeer = async (usuarioId = null) => {
        setLoading(true)
        setError(null)
        try {
            const userId = usuarioId || obtenerUserIdDelToken();
            if (!userId) {
                throw new Error('No se pudo obtener el ID del usuario');
            }
            console.log('🔔 [NOTIFICACIONES] Obteniendo notificaciones sin leer para usuario:', userId);

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
            console.log('🔔 [NOTIFICACIONES] Obteniendo total sin leer para usuario:', userId);

            const response = await httpService.api.get(`/notificaciones/total-sin-leer/${userId}`)
            console.log('🔔 [NOTIFICACIONES] Respuesta del servidor:', response.data);
            setData(response.data)
            return response.data
        } catch (err) {
            console.error('❌ [NOTIFICACIONES] Error en obtenerTotalNotificacionesSinLeer:', err);
            setError(err.response?.data?.message || err.message)
            throw err
        } finally {
            setLoading(false)
        }
    }, [obtenerUserIdDelToken])

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
    }
}

/*
Ejemplos de uso en componentes React:

import { useNotificaciones } from '../hooks/useNotificaciones'

const CrearNotificacion = () => {
  const { guardarNotificacion, loading, error } = useNotificaciones()

  const handleCrear = async () => {
    try {
      const nuevaNotif = await guardarNotificacion({
        mensajePrincipal: 'Nueva cotización asignada',
        usuarioId: 'user123',
        descripcionCategoria: 'Cotizaciones',
        mensajeDetallado: 'Se le ha asignado una nueva cotización.',
        datosAdicionales: { cotizacionId: '123' }
      })
      console.log('Notificación creada:', nuevaNotif)
    } catch (err) {
      console.error('Error:', error)
    }
  }

  return (
    <button onClick={handleCrear} disabled={loading}>
      {loading ? 'Creando...' : 'Crear Notificación'}
    </button>
  )
}

const ListaNotificaciones = () => {
  const { obtenerNotificacionesPorUsuario, loading, error, data } = useNotificaciones()
  const [notificaciones, setNotificaciones] = useState([])

  useEffect(() => {
    const cargarNotificaciones = async () => {
      try {
        const notifs = await obtenerNotificacionesPorUsuario('user123')
        setNotificaciones(notifs)
      } catch (err) {
        console.error('Error:', error)
      }
    }
    cargarNotificaciones()
  }, [])

  if (loading) return <p>Cargando...</p>
  if (error) return <p>Error: {error}</p>

  return (
    <ul>
      {notificaciones.map(notif => (
        <li key={notif.id}>{notif.mensajePrincipal}</li>
      ))}
    </ul>
  )
}

const EditarNotificacion = () => {
  const { editarNotificacion, loading, error } = useNotificaciones()

  const handleEditar = async (id) => {
    try {
      const updated = await editarNotificacion(id, { leida: true })
      console.log('Notificación actualizada:', updated)
    } catch (err) {
      console.error('Error:', error)
    }
  }

  return (
    <button onClick={() => handleEditar('notif123')} disabled={loading}>
      Marcar como leída
    </button>
  )
}

const NotificacionesSinLeer = () => {
  const { obtenerNotificacionesSinLeer, loading, error, data } = useNotificaciones()
  const [notificacionesSinLeer, setNotificacionesSinLeer] = useState([])

  useEffect(() => {
    const cargarNotificacionesSinLeer = async () => {
      try {
        const notifs = await obtenerNotificacionesSinLeer('user123')
        setNotificacionesSinLeer(notifs)
      } catch (err) {
        console.error('Error:', error)
      }
    }
    cargarNotificacionesSinLeer()
  }, [])

  if (loading) return <p>Cargando...</p>
  if (error) return <p>Error: {error}</p>

  return (
    <ul>
      {notificacionesSinLeer.map(notif => (
        <li key={notif.id}>{notif.mensajePrincipal}</li>
      ))}
    </ul>
  )
}

const TotalNotificacionesSinLeer = () => {
  const { obtenerTotalNotificacionesSinLeer, loading, error, data } = useNotificaciones()
  const [total, setTotal] = useState(0)

  useEffect(() => {
    const cargarTotal = async () => {
      try {
        const result = await obtenerTotalNotificacionesSinLeer('user123')
        setTotal(result.total)
      } catch (err) {
        console.error('Error:', error)
      }
    }
    cargarTotal()
  }, [])

  if (loading) return <p>Cargando...</p>
  if (error) return <p>Error: {error}</p>

  return (
    <div>
      <p>Total de notificaciones sin leer: {total}</p>
    </div>
  )
}
*/