import { useState } from 'react'
import httpService from '../services/httpService'

export const useNotificaciones = () => {
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState(null)
    const [data, setData] = useState(null)

    // Crear notificación
    const guardarNotificacion = async (notificacionData) => {
        setLoading(true)
        setError(null)
        try {
            const response = await httpService.api.post('/api/notificaciones/crear', notificacionData)
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
            const response = await httpService.api.put(`/api/notificaciones/${id}`, updateData)
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
            const response = await httpService.api.get('/api/notificaciones', { params })
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
            const response = await httpService.api.get(`/api/notificaciones/${id}`)
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
            const response = await httpService.api.delete(`/api/notificaciones/${id}`)
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
    const obtenerNotificacionesPorUsuario = async (usuarioId) => {
        setLoading(true)
        setError(null)
        try {
            const response = await httpService.api.get(`/api/notificaciones/usuario/${usuarioId}`)
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
    const obtenerNotificacionesSinLeer = async (usuarioId) => {
        setLoading(true)
        setError(null)
        try {
            const response = await httpService.api.get(`/api/notificaciones/sin-leer/${usuarioId}`)
            setData(response.data)
            return response.data
        } catch (err) {
            setError(err.response?.data?.message || err.message)
            throw err
        } finally {
            setLoading(false)
        }
    }

    // Obtener total de notificaciones sin leer por usuario
    const obtenerTotalNotificacionesSinLeer = async (usuarioId) => {
        setLoading(true)
        setError(null)
        try {
            const response = await httpService.api.get(`/api/notificaciones/total-sin-leer/${usuarioId}`)
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