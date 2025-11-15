import React, { useState } from 'react';
import { useConfirmDialog } from '../../ui/ConfirmDialogContext';
import { useNotifications } from '../../context/NotificationContext';
import { useLocation } from 'react-router-dom';
import useAuth from '../../hooks/useAuth';
import Icon from '../AppIcon';
import Button from './Button';
import AppImage from '../AppImage';

const Header = ({ onMenuToggle, isMenuOpen = false }) => {
  const location = useLocation();
  const [userMenuOpen, setUserMenuOpen] = useState(false);

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
  const { logout } = useAuth();
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

  // Ocultar Header temporalmente
  return null;

  return (
    <header className="fixed top-0 left-0 right-0 bg-card border-b border-border z-1000">
      <div className="flex items-center justify-between h-16 px-4 lg:px-6">
        {/* Left Section - Logo and Mobile Menu */}
        <div className="flex items-center space-x-4">
          {/* Mobile Menu Toggle */}
          <Button
            variant="ghost"
            size="icon"
            onClick={onMenuToggle}
            className="lg:hidden"
            aria-label="Toggle navigation menu"
          >
            <Icon name={isMenuOpen ? 'X' : 'Menu'} size={20} />
          </Button>

          {/* Logo */}
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 flex items-center justify-center">
              <AppImage
                src="assets/images/WhatsApp_Image_2025-09-24_at_8.13.50_PM-1759346787603.jpeg"
                alt="CLIMAS H.M. Logo"
                className="w-8 h-8 object-contain"
              />
            </div>
            <div className="hidden sm:block">
              <h1 className="text-lg font-semibold text-foreground">CLIMAS H.M.</h1>
            </div>
          </div>
        </div>

        {/* Right Section - User Profile */}
        <div className="flex items-center space-x-4">
          {/* Notifications */}
          <Button variant="ghost" size="icon" className="relative">
            <Icon name="Bell" size={20} />
            <span className="absolute -top-1 -right-1 w-5 h-5 bg-accent text-accent-foreground text-xs rounded-full flex items-center justify-center">
              3
            </span>
          </Button>

          {/* User Menu */}
          <div className="relative">
            <Button
              variant="ghost"
              onClick={handleUserMenuToggle}
              className="flex items-center space-x-2 px-3 py-2"
            >
              <div className="w-8 h-8 bg-secondary rounded-full flex items-center justify-center">
                <Icon name="User" size={16} color="white" />
              </div>
              <div className="hidden md:block text-left">
                <div className="text-sm font-medium text-foreground">John Smith</div>
                <div className="text-xs text-muted-foreground">Administrator</div>
              </div>
              <Icon name="ChevronDown" size={16} />
            </Button>

            {userMenuOpen && (
              <div className="absolute top-full right-0 mt-1 w-56 bg-popover border border-border rounded-md shadow-lg z-1050">
                <div className="py-1">
                  <div className="px-4 py-2 border-b border-border">
                    <div className="text-sm font-medium text-popover-foreground">John Smith</div>
                    <div className="text-xs text-muted-foreground">john.smith@aireflowpro.com</div>
                  </div>
                  <button className="flex items-center space-x-3 w-full px-4 py-2 text-sm text-popover-foreground hover:bg-muted transition-smooth">
                    <Icon name="User" size={16} />
                    <span>Profile Settings</span>
                  </button>
                  <button className="flex items-center space-x-3 w-full px-4 py-2 text-sm text-popover-foreground hover:bg-muted transition-smooth">
                    <Icon name="Settings" size={16} />
                    <span>Preferences</span>
                  </button>
                  <button className="flex items-center space-x-3 w-full px-4 py-2 text-sm text-popover-foreground hover:bg-muted transition-smooth">
                    <Icon name="HelpCircle" size={16} />
                    <span>Help & Support</span>
                  </button>
                  <div className="border-t border-border mt-1 pt-1">
                    <button
                      onClick={handleLogout}
                      className="flex items-center space-x-3 w-full px-4 py-2 text-sm text-error hover:bg-muted transition-smooth"
                    >
                      <Icon name="LogOut" size={16} />
                      <span>Sign Out</span>
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;