import React from 'react';
import { useSignalR } from '../../hooks/useSignalR';
import { useNotificaciones } from '../../hooks/useNotificaciones';
import { useAuth } from '../../hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import Sidebar from '../../components/ui/Sidebar';
import Header from '../../components/ui/Header';
import Breadcrumb from '../../components/ui/Breadcrumb';
import Icon from '../../components/AppIcon';
import Button from '../../components/ui/Button';
import { getCategoryColor, categoryRoutes } from './categories';

const Notifications = () => {
    const [sidebarCollapsed, setSidebarCollapsed] = React.useState(false);
    const { notificaciones: realtimeNotifs, limpiarNotificaciones } = useSignalR();
    const { obtenerNotificacionesPorUsuario, marcarNotificacionLeida, loading, error, data: storedNotifs } = useNotificaciones();
    const { user } = useAuth();
    const navigate = useNavigate();
    const [allNotifs, setAllNotifs] = React.useState([]);
    const [signalrReadIds, setSignalrReadIds] = React.useState(new Set());
    const [filtroActivo, setFiltroActivo] = React.useState('todas'); // 'todas' | 'no-leidas' | 'leidas'

    // Función para manejar el clic en una notificación: marcar como leída y redirigir
    const handleNotificationClick = async (notif) => {
        try {
            console.log('📖 [NOTIFICACIONES] Marcando notificación como leída y redirigiendo:', notif.id, 'tipo:', notif.tipo);

            // Marcar como leída
            await marcarNotificacionLeida(notif.id);

            // Actualizar el estado local inmediatamente para feedback visual
            if (notif.tipo === 'bd') {
                setAllNotifs(prev =>
                    prev.map(n =>
                        n.id === notif.id
                            ? { ...n, leida: true }
                            : n
                    )
                );
            } else if (notif.tipo === 'signalr') {
                // Para notificaciones SignalR, marcar como leída localmente
                setSignalrReadIds(prev => new Set([...prev, notif.id]));
                console.log('📖 [NOTIFICACIONES] Notificación SignalR marcada como leída localmente');
            }

            // Notificar que se marcó una notificación como leída para actualizar el sidebar
            console.log('📢 [NOTIFICACIONES] Enviando evento de notificación leída para actualizar sidebar');
            window.dispatchEvent(new CustomEvent('notificationRead'));

            // Redirigir según la categoría
            const route = categoryRoutes[notif.descripcionCategoria];
            if (route) {
                if (notif.descripcionCategoria === 'Cotización' && notif.data?.datosAdicionales?.idCotizacion) {
                    // Para cotizaciones, agregar el ID como query param
                    navigate(`${route}?id=${notif.data.datosAdicionales.idCotizacion}`);
                } else {
                    navigate(route);
                }
                console.log('🚀 [NOTIFICACIONES] Redirigiendo a:', route);
            } else {
                console.log('⚠️ [NOTIFICACIONES] No hay ruta definida para la categoría:', notif.descripcionCategoria);
            }

            console.log('✅ [NOTIFICACIONES] Notificación procesada exitosamente');
        } catch (err) {
            console.error('❌ [NOTIFICACIONES] Error procesando notificación:', err);
        }
    };

    React.useEffect(() => {
        const loadNotifs = async () => {
            try {
                console.log('🔔 [NOTIFICACIONES] Cargando todas las notificaciones del usuario...');
                const result = await obtenerNotificacionesPorUsuario();

                // Manejar la respuesta como en NotificationsModal
                const notifs = result.data || result || [];
                console.log('🔔 [NOTIFICACIONES] Notificaciones obtenidas:', notifs);

                setAllNotifs(notifs);
            } catch (err) {
                console.error('❌ [NOTIFICACIONES] Error cargando notificaciones:', err);
                setAllNotifs([]);
            }
        };
        loadNotifs();
    }, [obtenerNotificacionesPorUsuario]);

    // Escuchar eventos de notificaciones SignalR marcadas como leídas desde el modal
    React.useEffect(() => {
        const handleSignalrRead = (event) => {
            const { notificationId } = event.detail;
            setSignalrReadIds(prev => new Set([...prev, notificationId]));
            console.log('📖 [NOTIFICACIONES] Notificación SignalR marcada como leída desde modal:', notificationId);
        };

        window.addEventListener('signalrNotificationRead', handleSignalrRead);

        return () => {
            window.removeEventListener('signalrNotificationRead', handleSignalrRead);
        };
    }, []);

    // Combinar notificaciones almacenadas con las en tiempo real
    const combinedNotifs = React.useMemo(() => {
        console.log('🔄 [NOTIFICACIONES] Combinando notificaciones...');
        console.log('🔄 [NOTIFICACIONES] BD:', allNotifs);
        console.log('🔄 [NOTIFICACIONES] SignalR:', realtimeNotifs);

        const stored = Array.isArray(allNotifs) ? allNotifs : [];
        const realtime = Array.isArray(realtimeNotifs) ? realtimeNotifs : [];

        // Formatear notificaciones de BD
        const storedFormatted = stored.map(notif => ({
            id: notif.id,
            mensaje: notif.mensajePrincipal || notif.mensaje || 'Notificación',
            mensajeDetallado: notif.mensajeDetallado || '',
            descripcionCategoria: notif.descripcionCategoria || 'General',
            timestamp: notif.createdAt || notif.timestamp || new Date().toISOString(),
            leida: notif.leida || false,
            data: notif,
            tipo: 'bd'
        }));

        // Las de SignalR ya están formateadas, pero verificamos estado leído local
        const realtimeFormatted = realtime.map(notif => ({
            ...notif,
            leida: notif.leida || signalrReadIds.has(notif.id),
            tipo: 'signalr'
        }));

        // Combinar y ordenar
        const combined = [...storedFormatted, ...realtimeFormatted];
        const unique = combined.filter((notif, index, self) =>
            index === self.findIndex(n => n.id === notif.id || n.timestamp === notif.timestamp)
        );

        const sorted = unique.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
        console.log('✅ [NOTIFICACIONES] Notificaciones combinadas:', sorted);

        return sorted;
    }, [allNotifs, realtimeNotifs, signalrReadIds]);

    // Filtrar notificaciones según el filtro activo
    const notificacionesFiltradas = React.useMemo(() => {
        if (filtroActivo === 'no-leidas') {
            return combinedNotifs.filter(notif => !notif.leida);
        } else if (filtroActivo === 'leidas') {
            return combinedNotifs.filter(notif => notif.leida);
        }
        return combinedNotifs;
    }, [combinedNotifs, filtroActivo]);

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
                            <div className="flex items-center space-x-3">
                                <h1 className="text-2xl font-bold text-foreground">Centro de Notificaciones</h1>
                                {combinedNotifs.filter(notif => !notif.leida).length > 0 && (
                                    <span className="bg-blue-500 text-white text-sm px-2 py-1 rounded-full font-medium">
                                        {combinedNotifs.filter(notif => !notif.leida).length} sin leer
                                    </span>
                                )}
                            </div>

                        </div>

                        {/* Botones de filtro */}
                        <div className="mb-6">
                            <div className="flex space-x-2">
                                <Button
                                    variant={filtroActivo === 'todas' ? 'default' : 'outline'}
                                    size="sm"
                                    onClick={() => setFiltroActivo('todas')}
                                    className={`transition-colors ${filtroActivo === 'todas'
                                        ? 'bg-primary text-primary-foreground'
                                        : 'text-muted-foreground hover:text-foreground'
                                        }`}
                                >
                                    Todas
                                </Button>
                                <Button
                                    variant={filtroActivo === 'no-leidas' ? 'default' : 'outline'}
                                    size="sm"
                                    onClick={() => setFiltroActivo('no-leidas')}
                                    className={`transition-colors ${filtroActivo === 'no-leidas'
                                        ? 'bg-primary text-primary-foreground'
                                        : 'text-muted-foreground hover:text-foreground'
                                        }`}
                                >
                                    No leídas
                                </Button>
                                <Button
                                    variant={filtroActivo === 'leidas' ? 'default' : 'outline'}
                                    size="sm"
                                    onClick={() => setFiltroActivo('leidas')}
                                    className={`transition-colors ${filtroActivo === 'leidas'
                                        ? 'bg-primary text-primary-foreground'
                                        : 'text-muted-foreground hover:text-foreground'
                                        }`}
                                >
                                    Leídas
                                </Button>
                            </div>
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
                            ) : notificacionesFiltradas.length === 0 ? (
                                <div className="text-center py-12">
                                    <Icon name="Bell" size={48} className="mx-auto text-muted-foreground mb-4" />
                                    <h3 className="text-lg font-medium text-foreground mb-2">
                                        {filtroActivo === 'no-leidas' ? 'No hay notificaciones sin leer' :
                                            filtroActivo === 'leidas' ? 'No hay notificaciones leídas' :
                                                'No hay notificaciones'}
                                    </h3>
                                    <p className="text-muted-foreground">
                                        {filtroActivo === 'no-leidas'
                                            ? 'Todas las notificaciones han sido leídas.'
                                            : filtroActivo === 'leidas'
                                                ? 'No hay notificaciones marcadas como leídas.'
                                                : 'Las nuevas notificaciones aparecerán aquí.'
                                        }
                                    </p>
                                </div>
                            ) : (
                                notificacionesFiltradas.map((notif) => (
                                    <div
                                        key={notif.id || notif.timestamp}
                                        className={`p-4 rounded-lg border relative cursor-pointer transition-colors hover:bg-opacity-80 ${notif.leida
                                            ? 'bg-card border-border'
                                            : 'bg-blue-50 border-blue-200 dark:bg-blue-900/20 dark:border-blue-800'
                                            } shadow-sm`}
                                        onClick={() => handleNotificationClick(notif)}
                                    >
                                        <div className="flex items-start justify-between mb-2">
                                            <div className="flex items-start space-x-3 flex-1">
                                                <div className="flex-shrink-0">
                                                    <Icon name="Bell" size={20} className="text-primary" />
                                                </div>
                                                <div className="flex-1">
                                                    <h4 className="text-sm font-medium text-foreground mb-1">{notif.mensaje}</h4>
                                                    {notif.descripcionCategoria && (
                                                        <p className={`text-xs mb-2 ${getCategoryColor(notif.descripcionCategoria)}`}>
                                                            <Icon name="Tag" size={12} className="inline mr-1" />
                                                            {notif.descripcionCategoria}
                                                        </p>
                                                    )}
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
                                                    {/* {notif.data && Object.keys(notif.data).length > 0 && (
                                                        <details className="mt-2">
                                                            <summary className="text-xs text-muted-foreground cursor-pointer hover:text-foreground transition-colors">
                                                                <Icon name="ChevronRight" size={12} className="inline mr-1 transform transition-transform details-open:rotate-90" />
                                                                Ver detalles adicionales
                                                            </summary>
                                                            <div className="mt-2 p-3 bg-muted/50 rounded border">
                                                                <div className="space-y-1">
                                                                    {Object.entries(notif.data).map(([key, value]) => (
                                                                        <div key={key} className="flex flex-wrap">
                                                                            <span className="text-xs font-medium text-foreground mr-2 min-w-0">{key}:</span>
                                                                            <span className="text-xs text-muted-foreground flex-1 break-words">
                                                                                {typeof value === 'object' ? JSON.stringify(value, null, 2) : String(value)}
                                                                            </span>
                                                                        </div>
                                                                    ))}
                                                                </div>
                                                            </div>
                                                        </details>
                                                    )} */}
                                                </div>
                                            </div>
                                            {!notif.leida && (
                                                <div className="w-2 h-2 bg-blue-500 rounded-full flex-shrink-0 mt-1"></div>
                                            )}
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