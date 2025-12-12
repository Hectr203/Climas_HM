import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useConfirmDialog } from '../../ui/ConfirmDialogContext';
import { useNotifications } from '../../context/NotificationContext';
import { useLocation } from 'react-router-dom';
import useAuth from '../../hooks/useAuth';
import { useSignalR } from '../../hooks/useSignalR';
import { useNotificaciones } from '../../hooks/useNotificaciones';
import Icon from '../AppIcon';
import Button from './Button';
import NotificationsModal from './NotificationsModal';

const Header = ({ onMenuToggle, isMenuOpen = false, sidebarCollapsed = false }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [showNotificationsModal, setShowNotificationsModal] = useState(false);
  const [totalUnread, setTotalUnread] = useState(0);
  const [allowSignalRNotifications, setAllowSignalRNotifications] = useState(false);
  const userMenuRef = useRef(null);

  // Cerrar menú al hacer clic fuera
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target)) {
        setUserMenuOpen(false);
      }
    };

    if (userMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [userMenuOpen]);

  // Hooks de notificaciones
  const { notificaciones, newCount, resetearContador, limpiarNotificaciones } = useSignalR(true, allowSignalRNotifications);
  const { obtenerTotalNotificacionesSinLeer } = useNotificaciones();

  // Manejar el estado del modal de notificaciones para controlar SignalR
  const handleModalStateChange = useCallback((isModalOpen) => {
    setAllowSignalRNotifications(isModalOpen);
    if (!isModalOpen) {
      limpiarNotificaciones();
    }
  }, [limpiarNotificaciones]);

  // Manejar cuando se marca una notificación como leída
  const handleNotificationRead = useCallback(async () => {
    try {
      const result = await obtenerTotalNotificacionesSinLeer();
      const total = result.data?.total || result.total || 0;
      setTotalUnread(total);
    } catch (err) {
    }
  }, [obtenerTotalNotificacionesSinLeer]);

  // Cargar el total de notificaciones sin leer
  useEffect(() => {
    let isMounted = true;
    const loadTotal = async () => {
      try {
        const result = await obtenerTotalNotificacionesSinLeer();
        if (isMounted) {
          const total = result.data?.total || result.total || 0;
          setTotalUnread(total);
        }
      } catch (err) {
        if (isMounted) {
          setTotalUnread(0);
        }
      }
    };
    loadTotal();
    return () => {
      isMounted = false;
    };
  }, [obtenerTotalNotificacionesSinLeer]);

  // Escuchar eventos de notificaciones marcadas como leídas
  useEffect(() => {
    const handleNotificationReadEvent = async () => {
      try {
        const result = await obtenerTotalNotificacionesSinLeer();
        const total = result.data?.total || result.total || 0;
        setTotalUnread(total);
      } catch (err) {
      }
    };
    window.addEventListener('notificationRead', handleNotificationReadEvent);
    return () => {
      window.removeEventListener('notificationRead', handleNotificationReadEvent);
    };
  }, [obtenerTotalNotificacionesSinLeer]);

  // Actualizar contador cuando lleguen nuevas notificaciones via SignalR
  useEffect(() => {
    if (newCount > 0) {
      setTotalUnread(prev => prev + newCount);
      resetearContador();
    }
  }, [newCount, resetearContador]);

  // Detectar si estamos en la vista de notificaciones
  const isNotificationsPage = location.pathname === '/notificaciones';

  // Handler para el clic del botón de notificaciones
  const handleNotificationsClick = () => {
    if (isNotificationsPage) {
      // Si ya estamos en notificaciones, no hacer nada
      return;
    }
    // Si no estamos en notificaciones, abrir el modal
    setShowNotificationsModal(true);
  };

  const navigationItems = [
    // TODO: Habilitar cuando se implemente el dashboard
    // { label: 'Dashboard', path: '/dashboard', icon: 'LayoutDashboard' },
    { label: 'Projects', path: '/proyectos', icon: 'FolderOpen' },
    { label: 'Work Orders', path: '/operaciones', icon: 'ClipboardList' },
    { label: 'Clients', path: '/clientes', icon: 'Users' },
    { label: 'Financial', path: '/finanzas', icon: 'DollarSign' }
  ];

  const secondaryItems = [
    { label: 'Personnel', path: '/personal', icon: 'UserCheck' },
    { label: 'Inventory', path: '/inventario', icon: 'Package' }
  ];

  const handleNavigation = (path) => {
    window.location.href = path;
  };

  const handleUserMenuToggle = () => {
    setUserMenuOpen(!userMenuOpen);
  };

  const { showSuccess } = useNotifications();
  const { showConfirm } = useConfirmDialog();
  const { user, logout } = useAuth();
  const handleLogout = async () => {
    setUserMenuOpen(false); // Cerrar menú antes de continuar
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

  // Ocultar Header temporalmente
  // return null;

  return (
    <header className={`fixed top-0 bg-card border-b border-border z-1000 transition-all duration-300 left-0 lg:${sidebarCollapsed ? 'left-16' : 'left-60'} right-0`}>
      <div className="flex items-center justify-between h-16 px-4 lg:px-6">
        {/* Left Section - Logo and Mobile Menu */}
        <div className="flex items-center space-x-4">
        </div>

        {/* Right Section - User Profile */}
        <div className="flex items-center space-x-4">
          {/* Notifications */}
          <Button
            variant="ghost"
            size="icon"
            className="relative"
            onClick={handleNotificationsClick}
            title={isNotificationsPage ? "Ya estás viendo las notificaciones" : "Ver notificaciones"}
            disabled={isNotificationsPage}
          >
            <Icon name="Bell" size={20} />
            {totalUnread > 0 && (
              <span className="absolute -top-1 -right-1 w-5 h-5 bg-accent text-accent-foreground text-xs rounded-full flex items-center justify-center font-semibold">
                {totalUnread > 99 ? '99+' : totalUnread}
              </span>
            )}
          </Button>

          {/* User Menu */}
          <div className="relative" ref={userMenuRef}>
            <Button
              variant="ghost"
              onClick={handleUserMenuToggle}
              className="flex items-center space-x-2 px-3 py-2"
            >
              <div className="w-8 h-8 bg-secondary rounded-full flex items-center justify-center">
                <Icon name="User" size={16} color="white" />
              </div>
              <div className="hidden md:block text-left">
                <div className="text-sm font-medium text-foreground">
                  {user?.email?.split('@')?.[0] || 'Usuario'}
                </div>
                <div className="text-xs text-muted-foreground">
                  {user?.rol || 'Sin rol'}
                </div>
              </div>
              <Icon name="ChevronDown" size={16} />
            </Button>

            {userMenuOpen && (
              <div className="absolute top-full right-0 mt-1 w-56 bg-popover border border-border rounded-md shadow-lg z-1050">
                <div className="py-1">
                  <div className="px-4 py-2 border-b border-border">
                    <div className="text-sm font-medium text-popover-foreground">
                      {user?.email?.split('@')?.[0] || 'Usuario'}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {user?.email || 'Sin email'}
                    </div>
                  </div>
                  {/* <button
                    onClick={() => setUserMenuOpen(false)}
                    className="flex items-center space-x-3 w-full px-4 py-2 text-sm text-popover-foreground hover:bg-muted transition-smooth"
                  >
                    <Icon name="User" size={16} />
                    <span>Profile Settings</span>
                  </button>
                  <button
                    onClick={() => setUserMenuOpen(false)}
                    className="flex items-center space-x-3 w-full px-4 py-2 text-sm text-popover-foreground hover:bg-muted transition-smooth"
                  >
                    <Icon name="Settings" size={16} />
                    <span>Preferences</span>
                  </button>
                  <button
                    onClick={() => setUserMenuOpen(false)}
                    className="flex items-center space-x-3 w-full px-4 py-2 text-sm text-popover-foreground hover:bg-muted transition-smooth"
                  >
                    <Icon name="HelpCircle" size={16} />
                    <span>Help & Support</span>
                  </button> */}
                  <div className="border-t border-border mt-1 pt-1">
                    <button
                      onClick={handleLogout}
                      className="flex items-center space-x-3 w-full px-4 py-2 text-sm text-error hover:bg-muted transition-smooth"
                    >
                      <Icon name="LogOut" size={16} />
                      <span>Cerrar sesión</span>
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Modal de notificaciones - Solo mostrar si no estamos en la página de notificaciones */}
      {!isNotificationsPage && (
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
      )}
    </header>
  );
};

export default Header;