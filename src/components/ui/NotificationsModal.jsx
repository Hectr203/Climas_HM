import React from 'react';
import Icon from '../AppIcon';
import Button from './Button';
import { useNotificaciones } from '../../hooks/useNotificaciones';

const NotificationsModal = ({ isOpen, onClose, notificaciones: realtimeNotifs, onViewAll, onModalStateChange, onNotificationRead }) => {
    const { obtenerNotificacionesSinLeer, marcarNotificacionLeida, loading, error } = useNotificaciones()
    const [notificacionesBD, setNotificacionesBD] = React.useState([])

    // Función para marcar notificación como leída
    const handleMarcarLeida = async (notificacionId, tipo) => {
        try {
            console.log('📖 [MODAL] Marcando notificación como leída:', notificacionId, 'tipo:', tipo);

            // Llamar a la API para marcar como leída
            await marcarNotificacionLeida(notificacionId);

            // Actualizar el estado local inmediatamente para feedback visual
            if (tipo === 'bd') {
                setNotificacionesBD(prev =>
                    prev.map(notif =>
                        notif.id === notificacionId
                            ? { ...notif, leida: true }
                            : notif
                    )
                );
            } else if (tipo === 'signalr') {
                // Para notificaciones SignalR, no podemos modificar el estado directamente
                // ya que vienen del hook useSignalR. En su lugar, podríamos emitir un evento
                // o refrescar las notificaciones, pero por ahora solo loggeamos
                console.log('📖 [MODAL] Notificación SignalR marcada como leída (se actualizará en próxima carga)');
            }

            // Notificar al componente padre para actualizar el contador
            if (onNotificationRead) {
                onNotificationRead();
            }

            console.log('✅ [MODAL] Notificación marcada como leída exitosamente');
        } catch (err) {
            console.error('❌ [MODAL] Error marcando notificación como leída:', err);
            // Aquí podríamos mostrar un toast de error si fuera necesario
        }
    };

    // Notificar al componente padre sobre el estado del modal para controlar SignalR
    React.useEffect(() => {
        if (onModalStateChange) {
            onModalStateChange(isOpen);
            console.log(`📋 [MODAL] Estado del modal: ${isOpen ? 'ABIERTO - SignalR habilitado' : 'CERRADO - SignalR bloqueado'}`);
        }
    }, [isOpen, onModalStateChange]);

    // Cargar notificaciones sin leer cuando se abra el modal (y refrescar cada vez)
    React.useEffect(() => {
        if (isOpen) {
            console.log('📋 [MODAL] Modal abierto, refrescando notificaciones desde la base de datos...');

            let isMounted = true; // Flag para evitar actualizaciones si se desmonta el componente

            const cargarNotificacionesBD = async () => {
                try {
                    const result = await obtenerNotificacionesSinLeer();

                    if (isMounted) {
                        console.log('📋 [MODAL] Respuesta de notificaciones sin leer:', result);

                        // La respuesta puede ser { data: [...] } o directamente [...]
                        const notifs = result.data || result || [];
                        console.log('📋 [MODAL] Notificaciones extraídas:', notifs);

                        setNotificacionesBD(notifs);
                        console.log('✅ [MODAL] Notificaciones refrescadas desde la BD');
                    }
                } catch (err) {
                    if (isMounted) {
                        console.error('❌ [MODAL] Error cargando notificaciones sin leer:', err);
                        setNotificacionesBD([]);
                    }
                }
            };

            cargarNotificacionesBD();

            // Cleanup function
            return () => {
                isMounted = false;
            };
        }
    }, [isOpen]); // Solo depende de isOpen para refrescar cada vez que se abra    // Combinar notificaciones de BD con las de SignalR en tiempo real
    const todasLasNotificaciones = React.useMemo(() => {
        console.log('🔄 [MODAL] Combinando notificaciones...');
        console.log('🔄 [MODAL] Notificaciones BD:', notificacionesBD);
        console.log('🔄 [MODAL] Notificaciones SignalR:', realtimeNotifs);

        const notifsBD = Array.isArray(notificacionesBD) ? notificacionesBD : [];
        const notifsSignalR = Array.isArray(realtimeNotifs) ? realtimeNotifs : [];

        console.log('🔄 [MODAL] Cantidad BD:', notifsBD.length, 'SignalR:', notifsSignalR.length);

        // Convertir notificaciones de BD al formato esperado
        const notifsBDFormateadas = notifsBD.map(notif => ({
            id: notif.id,
            tipo: 'bd',
            mensaje: notif.mensajePrincipal || notif.mensaje || 'Notificación',
            mensajeDetallado: notif.mensajeDetallado || '',
            descripcionCategoria: notif.descripcionCategoria || 'General',
            timestamp: notif.createdAt || notif.timestamp || new Date().toISOString(),
            leida: notif.leida || false,
            data: notif
        }));

        // Las notificaciones de SignalR ya tienen el formato correcto
        const notifsSignalRFormateadas = notifsSignalR.map(notif => ({
            ...notif,
            tipo: 'signalr'
        }));

        console.log('🔄 [MODAL] Notificaciones BD formateadas:', notifsBDFormateadas);
        console.log('🔄 [MODAL] Notificaciones SignalR formateadas:', notifsSignalRFormateadas);

        // Combinar y ordenar por timestamp (más reciente primero)
        const combinadas = [...notifsBDFormateadas, ...notifsSignalRFormateadas];
        const ordenadas = combinadas.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

        console.log('✅ [MODAL] Notificaciones combinadas y ordenadas:', ordenadas);
        return ordenadas;
    }, [notificacionesBD, realtimeNotifs])

    if (!isOpen) return null; return (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
            <div className="bg-card border border-border rounded-lg shadow-lg max-w-xl w-full max-h-[95vh] overflow-hidden">
                <div className="flex items-center justify-between p-4 border-b border-border">
                    <h3 className="text-lg font-semibold text-foreground">Notificaciones</h3>
                    <Button variant="ghost" size="icon" onClick={onClose}>
                        <Icon name="X" size={20} />
                    </Button>
                </div>
                <div className="p-4 max-h-[70vh] overflow-y-auto">
                    {loading ? (
                        <div className="text-center py-8">
                            <Icon name="Loader2" size={48} className="mx-auto text-muted-foreground mb-4 animate-spin" />
                            <p className="text-muted-foreground">Cargando notificaciones...</p>
                        </div>
                    ) : error ? (
                        <div className="text-center py-8">
                            <Icon name="AlertCircle" size={48} className="mx-auto text-red-500 mb-4" />
                            <p className="text-red-500">Error al cargar notificaciones</p>
                        </div>
                    ) : todasLasNotificaciones.length === 0 ? (
                        <div className="text-center py-8">
                            <Icon name="Bell" size={48} className="mx-auto text-muted-foreground mb-4" />
                            <p className="text-muted-foreground">No hay notificaciones sin leer</p>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {todasLasNotificaciones.map((notif, index) => (
                                <div
                                    key={notif.id || `${notif.timestamp}-${index}`}
                                    className={`p-3 rounded-lg border relative cursor-pointer transition-colors hover:bg-opacity-80 ${notif.leida
                                        ? 'bg-muted border-border'
                                        : 'bg-blue-50 border-blue-200 dark:bg-blue-900/20 dark:border-blue-800'
                                        }`}
                                    onClick={() => !notif.leida && handleMarcarLeida(notif.id, notif.tipo)}
                                >
                                    {/* Indicador del origen de la notificación - REMOVIDO */}
                                    <div className="flex items-start justify-between mb-2">
                                        <div className="flex-1">
                                            <h4 className="text-sm font-medium text-foreground">
                                                {notif.mensaje}
                                            </h4>
                                            {notif.descripcionCategoria && (
                                                <p className="text-xs text-muted-foreground mt-1">
                                                    <Icon name="Tag" size={12} className="inline mr-1" />
                                                    {notif.descripcionCategoria}
                                                </p>
                                            )}
                                        </div>
                                        {!notif.leida && (
                                            <div className="w-2 h-2 bg-blue-500 rounded-full flex-shrink-0 mt-1"></div>
                                        )}
                                    </div>

                                    {notif.mensajeDetallado && (
                                        <p className="text-xs text-muted-foreground mb-2">
                                            {notif.mensajeDetallado}
                                        </p>
                                    )}

                                    <p className="text-xs text-muted-foreground">
                                        <Icon name="Clock" size={12} className="inline mr-1" />
                                        {new Date(notif.timestamp).toLocaleString('es-ES', {
                                            year: 'numeric',
                                            month: 'short',
                                            day: 'numeric',
                                            hour: '2-digit',
                                            minute: '2-digit'
                                        })}
                                    </p>

                                </div>
                            ))}
                        </div>
                    )}
                </div>
                <div className="p-4 border-t border-border">
                    <div className="flex gap-2">
                        <Button onClick={onViewAll} className="flex-1">
                            <Icon name="ExternalLink" size={16} className="mr-2" />
                            Ver todas las notificaciones
                        </Button>
                        <Button variant="outline" onClick={onClose} className="flex-1">
                            <Icon name="Check" size={16} className="mr-2" />
                            Cerrar
                        </Button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default NotificationsModal;