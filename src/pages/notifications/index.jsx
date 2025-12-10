import React from 'react';
import { useSignalR } from '../../hooks/useSignalR';
import { useNotificaciones } from '../../hooks/useNotificaciones';
import { useAuth } from '../../hooks/useAuth';
import Sidebar from '../../components/ui/Sidebar';
import Header from '../../components/ui/Header';
import Breadcrumb from '../../components/ui/Breadcrumb';
import Icon from '../../components/AppIcon';
import Button from '../../components/ui/Button';

const Notifications = () => {
    const [sidebarCollapsed, setSidebarCollapsed] = React.useState(false);
    const { notificaciones: realtimeNotifs, limpiarNotificaciones } = useSignalR();
    const { obtenerNotificacionesPorUsuario, loading, error, data: storedNotifs } = useNotificaciones();
    const { user } = useAuth();
    const [allNotifs, setAllNotifs] = React.useState([]);

    React.useEffect(() => {
        if (user?.id) {
            const loadNotifs = async () => {
                try {
                    const notifs = await obtenerNotificacionesPorUsuario(user.id);
                    setAllNotifs(notifs);
                } catch (err) {
                    console.error('Error cargando notificaciones:', err);
                }
            };
            loadNotifs();
        }
    }, [user?.id, obtenerNotificacionesPorUsuario]);

    // Combinar notificaciones almacenadas con las en tiempo real
    const combinedNotifs = React.useMemo(() => {
        const stored = allNotifs || [];
        const realtime = realtimeNotifs || [];
        // Evitar duplicados por id si existe
        const all = [...stored, ...realtime];
        const unique = all.filter((notif, index, self) =>
            index === self.findIndex(n => n.id === notif.id || n.timestamp === notif.timestamp)
        );
        return unique.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    }, [allNotifs, realtimeNotifs]);

    const breadcrumbItems = [
        { label: 'Inicio', path: '/dashboard' },
        { label: 'Notificaciones', path: '/notificaciones' }
    ];

    return (
        <div className="min-h-screen bg-background">
            <Sidebar isCollapsed={sidebarCollapsed} onToggle={() => setSidebarCollapsed(!sidebarCollapsed)} />
            <div className={`flex-1 transition-all duration-300 ${sidebarCollapsed ? 'lg:ml-16' : 'lg:ml-60'}`}>
                <Header title="Notificaciones" />
                <main className="p-6">
                    <Breadcrumb items={breadcrumbItems} />
                    <div className="max-w-4xl mx-auto">
                        <div className="flex items-center justify-between mb-6">
                            <h1 className="text-2xl font-bold text-foreground">Centro de Notificaciones</h1>
                            <Button onClick={limpiarNotificaciones} variant="outline">
                                <Icon name="Trash2" size={16} className="mr-2" />
                                Limpiar todas
                            </Button>
                        </div>
                        <div className="space-y-4">
                            {loading ? (
                                <div className="text-center py-12">
                                    <Icon name="Loader2" size={48} className="mx-auto text-muted-foreground mb-4 animate-spin" />
                                    <h3 className="text-lg font-medium text-foreground mb-2">Cargando notificaciones...</h3>
                                </div>
                            ) : error ? (
                                <div className="text-center py-12">
                                    <Icon name="AlertCircle" size={48} className="mx-auto text-red-500 mb-4" />
                                    <h3 className="text-lg font-medium text-foreground mb-2">Error al cargar notificaciones</h3>
                                    <p className="text-muted-foreground">{error}</p>
                                </div>
                            ) : combinedNotifs.length === 0 ? (
                                <div className="text-center py-12">
                                    <Icon name="Bell" size={48} className="mx-auto text-muted-foreground mb-4" />
                                    <h3 className="text-lg font-medium text-foreground mb-2">No hay notificaciones</h3>
                                    <p className="text-muted-foreground">Las nuevas notificaciones aparecerán aquí.</p>
                                </div>
                            ) : (
                                combinedNotifs.map((notif) => (
                                    <div key={notif.id || notif.timestamp} className="bg-card border border-border rounded-lg p-4 shadow-sm">
                                        <div className="flex items-start space-x-3">
                                            <div className="flex-shrink-0">
                                                <Icon name="Bell" size={20} className="text-primary" />
                                            </div>
                                            <div className="flex-1">
                                                <p className="text-sm font-medium text-foreground">{notif.mensaje}</p>
                                                <p className="text-xs text-muted-foreground mt-1">
                                                    {new Date(notif.timestamp).toLocaleString()}
                                                </p>
                                                {notif.data && (
                                                    <details className="mt-2">
                                                        <summary className="text-xs text-muted-foreground cursor-pointer">Ver detalles</summary>
                                                        <pre className="text-xs bg-muted p-2 rounded mt-1 overflow-x-auto">
                                                            {JSON.stringify(notif.data, null, 2)}
                                                        </pre>
                                                    </details>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                </main>
            </div>
        </div>
    );
};

export default Notifications;