import React from 'react';
import Icon from '../AppIcon';
import Button from './Button';
import { useNotificaciones } from '../../hooks/useNotificaciones';

const NotificationsModal = ({ isOpen, onClose, notificaciones: realtimeNotifs, userId, onViewAll }) => {
    const { obtenerNotificacionesPorUsuario, loading, error, data: storedNotifs } = useNotificaciones()
    const [allNotifs, setAllNotifs] = React.useState([])

    React.useEffect(() => {
        if (isOpen && userId) {
            const loadNotifs = async () => {
                try {
                    const notifs = await obtenerNotificacionesPorUsuario(userId)
                    setAllNotifs(notifs)
                } catch (err) {
                    console.error('Error cargando notificaciones:', err)
                }
            }
            loadNotifs()
        }
    }, [isOpen, userId, obtenerNotificacionesPorUsuario])

    // Combinar notificaciones almacenadas con las en tiempo real
    const combinedNotifs = React.useMemo(() => {
        const stored = storedNotifs || []
        const realtime = realtimeNotifs || []
        // Evitar duplicados por id si existe
        const all = [...stored, ...realtime]
        const unique = all.filter((notif, index, self) =>
            index === self.findIndex(n => n.id === notif.id || n.timestamp === notif.timestamp)
        )
        return unique.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
    }, [storedNotifs, realtimeNotifs])

    if (!isOpen) return null; return (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
            <div className="bg-card border border-border rounded-lg shadow-lg max-w-md w-full max-h-[80vh] overflow-hidden">
                <div className="flex items-center justify-between p-4 border-b border-border">
                    <h3 className="text-lg font-semibold text-foreground">Notificaciones</h3>
                    <Button variant="ghost" size="icon" onClick={onClose}>
                        <Icon name="X" size={20} />
                    </Button>
                </div>
                <div className="p-4 max-h-96 overflow-y-auto">
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
                    ) : combinedNotifs.length === 0 ? (
                        <div className="text-center py-8">
                            <Icon name="Bell" size={48} className="mx-auto text-muted-foreground mb-4" />
                            <p className="text-muted-foreground">No hay notificaciones</p>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {combinedNotifs.map((notif) => (
                                <div
                                    key={notif.id || notif.timestamp}
                                    className={`p-3 rounded-lg border ${notif.leido ? 'bg-muted border-border' : 'bg-green-50 border-green-200 dark:bg-green-900/20 dark:border-green-800'
                                        }`}
                                >
                                    <p className="text-sm font-medium text-foreground">{notif.mensaje}</p>
                                    <p className="text-xs text-muted-foreground mt-1">
                                        {new Date(notif.timestamp).toLocaleString()}
                                    </p>
                                    {notif.data && (
                                        <details className="mt-2">
                                            <summary className="text-xs text-muted-foreground cursor-pointer">Ver detalles</summary>
                                            <pre className="text-xs bg-background p-2 rounded mt-1 overflow-x-auto border">
                                                {JSON.stringify(notif.data, null, 2)}
                                            </pre>
                                        </details>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                </div>
                {combinedNotifs.length > 0 && (
                    <div className="p-4 border-t border-border">
                        <Button onClick={onViewAll} className="w-full">
                            Ver todas las notificaciones
                        </Button>
                    </div>
                )}
            </div>
        </div>
    );
};

export default NotificationsModal;