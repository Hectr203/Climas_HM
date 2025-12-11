import React, { useState, useEffect, useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import Icon from '../AppIcon';
import Button from './Button';
import Input from './Input';
import AppImage from '../AppImage';
import { getAllowedNavigationItems } from '../../utils/auth';
import useAuth from '../../hooks/useAuth';
import { useNotifications } from '../../context/NotificationContext';
import { useConfirmDialog } from '../../ui/ConfirmDialogContext';
import { useSignalR } from '../../hooks/useSignalR';
import { useNotificaciones } from '../../hooks/useNotificaciones';
import NotificationsModal from './NotificationsModal';

const Sidebar = ({ isCollapsed = false, onToggle }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [showSearchResults, setShowSearchResults] = useState(false);
  const [navigationItems, setNavigationItems] = useState([]);
  const [showNotificationsModal, setShowNotificationsModal] = useState(false);
  const [totalUnread, setTotalUnread] = useState(0);
  const [allowSignalRNotifications, setAllowSignalRNotifications] = useState(false);
  const { user, isAuthenticated, logout } = useAuth();
  const { showSuccess } = useNotifications();
  const { notificaciones, newCount, resetearContador, limpiarNotificaciones } = useSignalR(true, allowSignalRNotifications);
  const { obtenerTotalNotificacionesSinLeer } = useNotificaciones();

  // Manejar el estado del modal de notificaciones para controlar SignalR
  const handleModalStateChange = useCallback((isModalOpen) => {
    console.log(`🔄 [SIDEBAR] Cambio de estado del modal: ${isModalOpen ? 'ABIERTO' : 'CERRADO'}`);
    setAllowSignalRNotifications(isModalOpen);

    // Cuando se cierra el modal, limpiar las notificaciones de SignalR
    if (!isModalOpen) {
      console.log('🧹 [SIDEBAR] Modal cerrado - Limpiando notificaciones de SignalR');
      limpiarNotificaciones();
    }
  }, [limpiarNotificaciones]);

  // Manejar cuando se marca una notificación como leída
  const handleNotificationRead = useCallback(async () => {
    console.log('📖 [SIDEBAR] Notificación marcada como leída - Refrescando contador');
    try {
      const result = await obtenerTotalNotificacionesSinLeer();
      const total = result.data?.total || result.total || 0;
      setTotalUnread(total);
      console.log('📖 [SIDEBAR] Contador actualizado después de marcar como leída:', total);
    } catch (err) {
      console.error('❌ [SIDEBAR] Error refrescando contador:', err);
    }
  }, [obtenerTotalNotificacionesSinLeer]);

  useEffect(() => {
    if (isAuthenticated && user) {
      const allowedItems = getAllowedNavigationItems(user?.rol);
      setNavigationItems(allowedItems);
    } else {
      navigate('/login');
    }
  }, [isAuthenticated, user, navigate]);

  // Cargar el total de notificaciones sin leer solo una vez cuando el usuario esté autenticado
  useEffect(() => {
    console.log('🔍 [NOTIFICACIONES] useEffect ejecutado - isAuthenticated:', isAuthenticated);

    let isMounted = true; // Flag para evitar actualizaciones de estado si el componente se desmonta

    if (isAuthenticated) {
      console.log('🔔 [NOTIFICACIONES] Usuario autenticado, cargando total de notificaciones sin leer...');
      const loadTotal = async () => {
        try {
          // Ahora no necesitamos pasar userId, el hook lo extraerá del token automáticamente
          const result = await obtenerTotalNotificacionesSinLeer();

          // Solo actualizar el estado si el componente aún está montado
          if (isMounted) {
            console.log('🔔 [NOTIFICACIONES] Respuesta de la API:', result);
            const total = result.data?.total || result.total || 0;
            console.log('🔔 [NOTIFICACIONES] Total extraído:', total);
            setTotalUnread(total);
            console.log('🔔 [NOTIFICACIONES] Estado actualizado - totalUnread:', total);
          }
        } catch (err) {
          if (isMounted) {
            console.error('❌ [NOTIFICACIONES] Error cargando total sin leer:', err);
            setTotalUnread(0);
            console.log('🔔 [NOTIFICACIONES] Estado reseteado a 0 por error');
          }
        }
      };
      loadTotal();
    } else {
      console.log('⚠️ [NOTIFICACIONES] Usuario no autenticado, no se cargan notificaciones');
      if (isMounted) {
        setTotalUnread(0);
      }
    }

    // Cleanup function
    return () => {
      isMounted = false;
    };
  }, [isAuthenticated]); // Solo depende de isAuthenticated

  // Escuchar eventos de notificaciones marcadas como leídas
  useEffect(() => {
    const handleNotificationReadEvent = async () => {
      console.log('📖 [SIDEBAR] Notificación marcada como leída - Refrescando contador');
      try {
        const result = await obtenerTotalNotificacionesSinLeer();
        const total = result.data?.total || result.total || 0;
        setTotalUnread(total);
        console.log('📖 [SIDEBAR] Contador actualizado después de marcar como leída:', total);
      } catch (err) {
        console.error('❌ [SIDEBAR] Error refrescando contador:', err);
      }
    };

    window.addEventListener('notificationRead', handleNotificationReadEvent);

    return () => {
      window.removeEventListener('notificationRead', handleNotificationReadEvent);
    };
  }, [obtenerTotalNotificacionesSinLeer]);  // Actualizar contador cuando lleguen nuevas notificaciones via SignalR
  useEffect(() => {
    if (newCount > 0) {
      console.log('📩 [NOTIFICACIONES] Nueva notificación detectada vía SignalR!');
      console.log('📩 [NOTIFICACIONES] Nuevas notificaciones recibidas:', newCount);
      console.log('📩 [NOTIFICACIONES] Total actual antes de sumar:', totalUnread);
      setTotalUnread(prev => {
        const nuevoTotal = prev + newCount;
        console.log('📩 [NOTIFICACIONES] Total después de sumar:', nuevoTotal);
        return nuevoTotal;
      });
      // Resetear el contador de nuevas notificaciones después de sumarlo
      resetearContador();
      console.log('📩 [NOTIFICACIONES] Contador de nuevas notificaciones reseteado');
    }
  }, [newCount, resetearContador]);

  const [expandedItems, setExpandedItems] = useState(['Recursos', 'Negocio']);

  const handleSearch = (query) => {
    setSearchQuery(query);
    if (query?.length > 2) {
      // Filter search results based on user's allowed paths
      const allowedPaths = navigationItems?.flatMap(item =>
        item?.children ? item?.children?.map(child => child?.path) : [item?.path]
      )?.filter(Boolean);

      const mockResults = [
        { type: 'project', title: 'Instalación Aire Acondicionado - Edificio A', path: '/proyectos' },
        { type: 'client', title: 'ABC Corporation', path: '/clientes' },
        { type: 'work-order', title: 'WO-2024-001', path: '/operaciones' }
      ]?.filter(item =>
        item?.title?.toLowerCase()?.includes(query?.toLowerCase()) &&
        allowedPaths?.includes(item?.path)
      );

      setSearchResults(mockResults);
      setShowSearchResults(true);
    } else {
      setShowSearchResults(false);
    }
  };

  const toggleExpanded = (label) => {
    setExpandedItems(prev =>
      prev?.includes(label)
        ? prev?.filter(item => item !== label)
        : [...prev, label]
    );
  };

  const handleNavigation = (path) => {
    navigate(path);
  };

  const { showConfirm } = useConfirmDialog();
  const handleLogout = async () => {
    const confirmed = await showConfirm({
      title: 'Cerrar sesión',
      message: '¿Deseas cerrar sesión?',
      confirmText: 'Sí',
      cancelText: 'No'
    });
    if (confirmed) {
      showSuccess('Sesión cerrada correctamente');
      setTimeout(() => {
        logout();
      }, 1200);
    }
  };

  const renderNavigationItem = (item, level = 0) => {
    const isActive = location?.pathname === item?.path;
    const hasChildren = item?.children && item?.children?.length > 0;
    const isExpanded = expandedItems?.includes(item?.label);

    // Dynamic badge for notifications
    const badge = item?.path === '/notificaciones' ? (totalUnread + newCount) : item?.badge;

    // Log para depuración del badge de notificaciones
    if (item?.path === '/notificaciones') {
      console.log('🏷️ [NOTIFICACIONES] Badge calculado para sidebar:');
      console.log('  - totalUnread:', totalUnread);
      console.log('  - newCount:', newCount);
      console.log('  - badge final:', badge);
    }

    const handleItemClick = (e) => {
      e.preventDefault();
      e.stopPropagation();

      if (item?.path === '/notificaciones') {
        setShowNotificationsModal(true);
        return;
      }

      if (hasChildren) {
        toggleExpanded(item?.label);
      } else if (item?.path) {
        handleNavigation(item?.path);
      }
    }; return (
      <div key={item?.label} className="relative">
        <div
          className={`flex items-center justify-between px-3 py-2 rounded-lg cursor-pointer transition-smooth group ${isActive
            ? 'bg-primary text-primary-foreground'
            : 'text-foreground hover:bg-muted'
            } ${level > 0 ? 'ml-4' : ''}`}
          onClick={handleItemClick}
          title={isCollapsed ? item?.tooltip : ''}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              handleItemClick(e);
            }
          }}
        >
          <div className="flex items-center space-x-3 min-w-0 flex-1">
            <Icon
              name={item?.icon}
              size={20}
              className={`flex-shrink-0 ${isActive ? 'text-primary-foreground' : 'text-muted-foreground group-hover:text-foreground'}`}
            />
            {!isCollapsed && (
              <span className="font-medium text-sm truncate">{item?.label}</span>
            )}
          </div>

          {!isCollapsed && (
            <div className="flex items-center space-x-2">
              {badge && (
                <span className={`px-2 py-1 text-xs rounded-full ${isActive
                  ? 'bg-primary-foreground text-primary'
                  : 'bg-accent text-accent-foreground'
                  }`}>
                  {badge}
                </span>
              )}
              {hasChildren && (
                <Icon
                  name={isExpanded ? 'ChevronDown' : 'ChevronRight'}
                  size={16}
                  className={`transition-transform ${isActive ? 'text-primary-foreground' : 'text-muted-foreground'}`}
                />
              )}
            </div>
          )}
        </div>
        {hasChildren && isExpanded && !isCollapsed && (
          <div className="mt-1 space-y-1">
            {item?.children?.map(child => renderNavigationItem(child, level + 1))}
          </div>
        )}
      </div>
    );
  };

  return (
    <>
      {/* Sidebar */}
      <aside
        className={`fixed left-0 top-0 h-full bg-card border-r border-border sidebar-shadow z-1000 transition-all duration-300 ${isCollapsed ? 'w-16' : 'w-60'
          }`}
      >
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-border">
            {!isCollapsed && (
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 flex items-center justify-center">
                  <AppImage
                    src="assets/images/WhatsApp_Image_2025-09-24_at_8.13.50_PM-1759346787603.jpeg"
                    alt="CLIMAS H.M. Logo"
                    className="w-8 h-8 object-contain"
                  />
                </div>
                <div>
                  <h1 className="text-lg font-semibold text-foreground">CLIMAS H.M.</h1>
                  <p className="text-xs text-muted-foreground">Gestión de Aire Acondicionado</p>
                </div>
              </div>
            )}

            <Button
              variant="ghost"
              size="icon"
              onClick={onToggle}
              className="flex-shrink-0"
              title={isCollapsed ? 'Expandir barra lateral' : 'Contraer barra lateral'}
            >
              <Icon name={isCollapsed ? 'ChevronRight' : 'ChevronLeft'} size={20} />
            </Button>
          </div>

          {/* Search - Oculto temporalmente */}
          {false && !isCollapsed && (
            <div className="p-4 relative">
              <div className="relative">
                <Input
                  type="search"
                  placeholder="Buscar proyectos, clientes..."
                  value={searchQuery}
                  onChange={(e) => handleSearch(e?.target?.value)}
                  className="pl-10"
                />
                <Icon
                  name="Search"
                  size={16}
                  className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground"
                />
              </div>

              {/* Search Results */}
              {showSearchResults && searchResults?.length > 0 && (
                <div className="absolute top-full left-4 right-4 mt-1 bg-popover border border-border rounded-md shadow-lg z-1050">
                  <div className="py-2">
                    {searchResults?.map((result, index) => (
                      <button
                        key={index}
                        onClick={() => {
                          handleNavigation(result?.path);
                          setShowSearchResults(false);
                          setSearchQuery('');
                        }}
                        className="flex items-center space-x-3 w-full px-4 py-2 text-sm text-popover-foreground hover:bg-muted transition-smooth"
                      >
                        <Icon
                          name={result?.type === 'project' ? 'FolderOpen' : result?.type === 'client' ? 'Users' : 'ClipboardList'}
                          size={16}
                        />
                        <div className="text-left">
                          <div className="font-medium">{result?.title}</div>
                          <div className="text-xs text-muted-foreground capitalize">{result?.type}</div>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Navigation */}
          <nav className="flex-1 px-4 py-2 space-y-1 overflow-y-auto">
            {navigationItems?.map(item => renderNavigationItem(item))}
          </nav>

          {/* User Profile */}
          <div className="p-4 border-t border-border">
            <div className={`flex items-center justify-between p-3 rounded-lg bg-muted ${isCollapsed ? 'justify-center' : ''}`}>
              <div className="flex items-center space-x-3 min-w-0 flex-1">
                <div className="w-8 h-8 bg-secondary rounded-full flex items-center justify-center flex-shrink-0">
                  <Icon name="User" size={16} color="white" />
                </div>
                {!isCollapsed && (
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-medium text-foreground truncate">
                      {user?.email?.split('@')?.[0] || 'Usuario'}
                    </div>
                    <div className="text-xs text-muted-foreground truncate">
                      {user?.rol || 'Sin rol'}
                    </div>
                  </div>
                )}
              </div>
              {!isCollapsed && (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handleLogout}
                  className="flex-shrink-0 hover:bg-destructive hover:text-destructive-foreground"
                  title="Cerrar sesión"
                >
                  <Icon name="LogOut" size={16} />
                </Button>
              )}
            </div>
          </div>
        </div>
      </aside>
      {/* Overlay for mobile */}
      {!isCollapsed && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-999 lg:hidden"
          onClick={onToggle}
        />
      )}
      {/* Notifications Modal */}
      <NotificationsModal
        isOpen={showNotificationsModal}
        onClose={() => setShowNotificationsModal(false)}
        notificaciones={notificaciones}
        onModalStateChange={handleModalStateChange}
        onNotificationRead={handleNotificationRead}
        onViewAll={() => {
          setShowNotificationsModal(false);
          navigate('/notificaciones');
        }}
      />
    </>
  );
};

export default Sidebar;