import { useState, useEffect, useCallback, useRef } from 'react'
import * as signalR from '@microsoft/signalr'
import EnvConfig from '../utils/config'
import { jwtDecode } from 'jwt-decode'

export const useSignalR = () => {
    const [connection, setConnection] = useState(null)
    const [notificaciones, setNotificaciones] = useState([])
    const [conectado, setConectado] = useState(false)
    const [debugInfo, setDebugInfo] = useState({
        intentosConexion: 0,
        ultimoError: null,
        estadoConexion: 'disconnected',
    })
    const intentosRef = useRef(0)
    const connRef = useRef(null)

    useEffect(() => {
        let disposed = false;

        (async () => {
            let user = null;
            let authToken = null;
            try {
                authToken = localStorage.getItem('authToken');
                if (!authToken) {
                    console.log('Token no disponible')
                    return
                }

                // Decodificar el token para obtener el user ID
                const decoded = jwtDecode(authToken);
                const userId = decoded.sub || decoded.userId || decoded.id || decoded.user_id;
                if (!userId) {
                    console.log('ID de usuario no encontrado en el token')
                    return
                }

                // Obtener rol y email de localStorage como fallback, o del token si está
                const userRole = decoded.role || decoded.rol || localStorage.getItem('userRole') || localStorage.getItem('role') || localStorage.getItem('rol');
                const userEmail = decoded.email || localStorage.getItem('userEmail');

                user = { id: userId, email: userEmail, rol: userRole };

                console.log('👤 Información completa del usuario:', {
                    decodedToken: decoded,
                    userId: userId,
                    userRole: userRole,
                    userEmail: userEmail,
                    authToken: 'Presente',
                    userObject: user
                })
            } catch (e) {
                console.error('Error decodificando token o obteniendo datos:', e);
                return;
            }

            if (!user || !user.id || !authToken) {
                console.log('Usuario o token no disponible para SignalR')
                return
            }

            console.log('👤 Usuario ID para SignalR:', user.id)

            intentosRef.current++
            setDebugInfo(prev => ({ ...prev, intentosConexion: intentosRef.current }))
            console.log(`🔄 Intento de conexión #${intentosRef.current}`)

            try {
                console.log('🔍 Iniciando negociación con el servidor...')
                const negotiateUrl = EnvConfig.API_URL + '/negotiate?userId=' + encodeURIComponent(user.id)
                console.log('🔗 URL de negotiate:', negotiateUrl)
                // 1) pedir url + token al servidor
                const negotiateRes = await fetch(negotiateUrl, {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${authToken}`
                    }
                });
                console.log('🔍 Respuesta de negotiate:', negotiateRes.status, negotiateRes.statusText)
                if (!negotiateRes.ok) {
                    throw new Error(`Negotiate failed: ${negotiateRes.status} ${negotiateRes.statusText}`);
                }
                const negotiateData = await negotiateRes.json();
                console.log('🔍 Datos de negotiate:', negotiateData)
                const { url, accessToken } = negotiateData;

                // 2) crear conexión con el token
                const conn = new signalR.HubConnectionBuilder()
                    .withUrl(url, { accessTokenFactory: () => accessToken })
                    .withAutomaticReconnect()
                    .configureLogging(signalR.LogLevel.Debug)
                    .build();

                // Eventos de conexión
                conn.onreconnecting((error) => {
                    console.log('🔄 Reconectando SignalR...', error)
                    setDebugInfo(prev => ({ ...prev, estadoConexion: 'reconnecting' }))
                })

                conn.onreconnected((connectionId) => {
                    console.log('✅ Reconectado a SignalR:', connectionId)
                    setDebugInfo(prev => ({ ...prev, estadoConexion: 'connected' }))
                })

                conn.onclose((error) => {
                    console.log('🔌 Conexión SignalR cerrada:', error)
                    setConectado(false)
                    setDebugInfo(prev => ({ ...prev, estadoConexion: 'disconnected', ultimoError: error }))
                })

                // 3) escuchar eventos
                console.log('👂 Configurando listeners de eventos...')
                conn.on('notification', (data) => {
                    console.log('📩 Notificación recibida: notification')
                    console.log('📊 Datos completos:', JSON.stringify(data, null, 2))

                    const nuevaNotif = {
                        tipo: 'notificacion',
                        mensaje: 'Nueva notificación recibida',
                        data,
                        timestamp: new Date().toISOString(),
                        leido: false,
                    }
                    console.log('🔔 Nueva notificación añadida:', nuevaNotif)

                    setNotificaciones(prev => [nuevaNotif, ...prev])
                })

                // Listener genérico para debug
                conn.onreceive = (data) => {
                    console.log('📨 Mensaje raw recibido:', data)
                }

                // 4) iniciar
                console.log('🚀 Iniciando conexión SignalR...')
                await conn.start()

                setConnection(conn)
                setConectado(true)
                setDebugInfo(prev => ({ ...prev, estadoConexion: 'connected' }))
                console.log('✅ Conectado a SignalR exitosamente')
                console.log('🆔 Connection ID:', conn.connectionId)

                if (disposed) await conn.stop();
                connRef.current = conn;
            } catch (error) {
                console.error('❌ Error conectando a SignalR:', error)
                setDebugInfo(prev => ({ ...prev, ultimoError: error, estadoConexion: 'error' }))
            }
        })();

        return () => {
            disposed = true;
            if (connRef.current) connRef.current.stop();
        };
    }, [])

    const desconectarSignalR = useCallback(async () => {
        if (connRef.current && conectado) {
            await connRef.current.stop()
            setConnection(null)
            setConectado(false)
            console.log('🔌 Desconectado de SignalR')
        }
    }, [conectado])

    const limpiarNotificaciones = useCallback(() => {
        setNotificaciones([])
    }, [])

    return {
        connection,
        notificaciones,
        conectado,
        debugInfo,
        desconectarSignalR,
        limpiarNotificaciones,
    }
}