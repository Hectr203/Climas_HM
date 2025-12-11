import { useState, useEffect, useCallback, useRef } from 'react'
import * as signalR from '@microsoft/signalr'
import EnvConfig from '../utils/config'
import { jwtDecode } from 'jwt-decode'

export const useSignalR = (enabled = true, allowNotifications = true) => {
    const [connection, setConnection] = useState(null)
    const [notificaciones, setNotificaciones] = useState([])
    const [newCount, setNewCount] = useState(0)
    const [conectado, setConectado] = useState(false)
    const [debugInfo, setDebugInfo] = useState({
        intentosConexion: 0,
        ultimoError: null,
        estadoConexion: 'disconnected',
    })
    const intentosRef = useRef(0)
    const connRef = useRef(null)
    const allowNotificationsRef = useRef(allowNotifications)

    // Actualizar el ref cuando cambie allowNotifications
    useEffect(() => {
        allowNotificationsRef.current = allowNotifications
    }, [allowNotifications])

    useEffect(() => {
        if (!enabled) {
            if (connRef.current) {
                connRef.current.stop();
                setConnection(null);
                setConectado(false);
                setNotificaciones([]);
                setNewCount(0);
                setDebugInfo(prev => ({ ...prev, estadoConexion: 'disabled' }));
            }
            return;
        }

        let disposed = false;

        (async () => {
            let user = null;
            let authToken = null;
            try {
                authToken = localStorage.getItem('authToken');
                if (!authToken) {
                    return
                }

                // Decodificar el token para obtener el user ID
                const decoded = jwtDecode(authToken);
                const userId = decoded.sub || decoded.userId || decoded.id || decoded.user_id;
                if (!userId) {
                    return
                }

                // Obtener rol y email de localStorage como fallback, o del token si está
                const userRole = decoded.role || decoded.rol || localStorage.getItem('userRole') || localStorage.getItem('role') || localStorage.getItem('rol');
                const userEmail = decoded.email || localStorage.getItem('userEmail');

                user = { id: userId, email: userEmail, rol: userRole };
            } catch (e) {
                return;
            }

            if (!user || !user.id || !authToken) {
                return
            }

            intentosRef.current++
            setDebugInfo(prev => ({ ...prev, intentosConexion: intentosRef.current }))

            try {
                const negotiateUrl = EnvConfig.API_URL + '/negotiate?userId=' + encodeURIComponent(user.id)
                // 1) pedir url + token al servidor
                const negotiateRes = await fetch(negotiateUrl, {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${authToken}`
                    }
                });
                if (!negotiateRes.ok) {
                    throw new Error(`Negotiate failed: ${negotiateRes.status} ${negotiateRes.statusText}`);
                }
                const negotiateData = await negotiateRes.json();
                const { url, accessToken } = negotiateData;

                // 2) crear conexión con el token
                const conn = new signalR.HubConnectionBuilder()
                    .withUrl(url, { accessTokenFactory: () => accessToken })
                    .withAutomaticReconnect()
                    .configureLogging(signalR.LogLevel.None)
                    .build();

                // Eventos de conexión
                conn.onreconnecting((error) => {
                    setDebugInfo(prev => ({ ...prev, estadoConexion: 'reconnecting' }))
                })

                conn.onreconnected((connectionId) => {
                    setDebugInfo(prev => ({ ...prev, estadoConexion: 'connected' }))
                })

                conn.onclose((error) => {
                    setConectado(false)
                    setDebugInfo(prev => ({ ...prev, estadoConexion: 'disconnected', ultimoError: error }))
                })

                // 3) escuchar eventos
                conn.on('notification', (data) => {

                    // SIEMPRE incrementar el contador para el sidebar
                    setNewCount(prev => prev + 1);

                    // Solo agregar a la lista del modal si allowNotifications es true
                    if (allowNotificationsRef.current) {

                        const nuevaNotif = {
                            id: data.id || `signalr-${Date.now()}`,
                            tipo: 'signalr',
                            mensaje: data.mensajePrincipal || data.mensaje || 'Nueva notificación recibida',
                            mensajeDetallado: data.mensajeDetallado || '',
                            descripcionCategoria: data.descripcionCategoria || 'General',
                            timestamp: data.createdAt || data.timestamp || new Date().toISOString(),
                            leido: data.leida || false,
                            data, // Mantener el objeto original por si acaso
                        }

                        setNotificaciones(prev => [nuevaNotif, ...prev])
                    } else {
                    }
                })

                // Listener genérico para debug
                conn.onreceive = (data) => {
                }

                // 4) iniciar
                await conn.start()

                setConnection(conn)
                setConectado(true)
                setNewCount(0)
                setDebugInfo(prev => ({ ...prev, estadoConexion: 'connected' }))



                if (disposed) await conn.stop();
                connRef.current = conn;
            } catch (error) {
                setDebugInfo(prev => ({ ...prev, ultimoError: error, estadoConexion: 'error' }))
            }
        })();

        return () => {
            disposed = true;
            if (connRef.current) connRef.current.stop();
        };
    }, [enabled])

    const desconectarSignalR = useCallback(async () => {
        if (connRef.current && conectado) {
            await connRef.current.stop()
            setConnection(null)
            setConectado(false)
        }
    }, [conectado])

    const limpiarNotificaciones = useCallback(() => {
        setNotificaciones([])
    }, [])

    const resetearContador = useCallback(() => {
        setNewCount(0)
    }, [])

    return {
        connection,
        notificaciones,
        newCount,
        conectado,
        debugInfo,
        desconectarSignalR,
        limpiarNotificaciones,
        resetearContador,
    }
}