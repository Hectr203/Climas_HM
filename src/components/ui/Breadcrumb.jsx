import React from 'react';
import { useLocation } from 'react-router-dom';
import Icon from '../AppIcon';
import Button from './Button';
import { ROLE_PERMISSIONS } from '../../utils/auth';

const Breadcrumb = ({ customItems = null }) => {
  const location = useLocation();

  // Obtener el rol del usuario desde localStorage
  const userRole = localStorage.getItem('userRole');
  
  // Obtener el defaultPath según el rol del usuario
  const getDefaultPathForRole = () => {
    if (userRole && ROLE_PERMISSIONS[userRole]) {
      return ROLE_PERMISSIONS[userRole].defaultPath;
    }
    return '/oportunidades'; // Fallback por defecto
  };

  const pathMapping = {
    '/dashboard': { label: 'Panel', icon: 'LayoutDashboard' },
    '/proyectos': { label: 'Gestión de proyectos', icon: 'FolderOpen' },
    '/operaciones': { label: 'Procesamiento de órdenes de trabajo', icon: 'ClipboardList' },
    '/finanzas': { label: 'Gestión Financiera', icon: 'DollarSign' },
    '/clientes': { label: 'Gestión de Clientes', icon: 'Users' },
    '/personal': { label: 'Gestión de personal', icon: 'UserCheck' },
    '/inventario': { label: 'Gestión de inventario', icon: 'Package' },
    '/usuarios': { label: 'Gestión de Usuarios', icon: 'Users' },
    '/oportunidades': { label: 'Oportunidades de Venta', icon: 'TrendingUp' },
    '/constructor-cotizaciones': { label: 'Creación de Cotizaciones', icon: 'FileText' },
    '/cotizaciones': { label: 'Centro de Desarrollo de Cotizaciones', icon: 'FileEdit' },
    '/monitoreo-ventas': { label: 'Monitoreo de Ejecución de Ventas', icon: 'BarChart' },
    '/centro-operaciones-taller': { label: 'Centro de Operaciones de Taller', icon: 'Wrench' },
    '/operaciones-taller': { label: 'Gestión de Operaciones de Taller', icon: 'Settings' },
    '/flujo-proyecto': { label: 'Gestión de Flujo de Trabajo', icon: 'GitBranch' },
    '/documentacion-proyectos': { label: 'Centro de Documentación', icon: 'FolderOpen' },
    '/visor-galeria': { label: 'Galería de Proyectos', icon: 'Image' },
    '/galeria-proyecto': { label: 'Detalles de Galería', icon: 'Images' },
    '/abonos': { label: 'Gestión de Abonos', icon: 'CreditCard' }
  };

  const generateBreadcrumbs = () => {
    if (customItems) return customItems;

    const pathSegments = location?.pathname?.split('/')?.filter(segment => segment);
    const defaultPath = getDefaultPathForRole();
    const isOnDefaultPath = location?.pathname === defaultPath;
    
    // Breadcrumb ra\u00edz din\u00e1mico seg\u00fan el rol
    const breadcrumbs = [{ label: 'Inicio', path: defaultPath, icon: 'Home' }];

    if (!isOnDefaultPath) {
      const currentPath = location?.pathname;
      const currentPage = pathMapping?.[currentPath];
      
      if (currentPage) {
        breadcrumbs?.push({
          label: currentPage?.label,
          path: currentPath,
          icon: currentPage?.icon,
          current: true
        });
      }
    } else {
      breadcrumbs[0].current = true;
    }

    return breadcrumbs;
  };

  const breadcrumbs = generateBreadcrumbs();

  const handleNavigation = (path) => {
    if (path && !breadcrumbs?.find(b => b?.path === path)?.current) {
      window.location.href = path;
    }
  };

  const handleBack = () => {
    window.history?.back();
  };

  return (
    <nav className="flex items-center space-x-2 py-4" aria-label="Breadcrumb">
      {/* Mobile Back Button */}
      <Button
        variant="ghost"
        size="sm"
        onClick={handleBack}
        className="md:hidden flex items-center space-x-2"
      >
        <Icon name="ArrowLeft" size={16} />
        <span>Back</span>
      </Button>
      {/* Desktop Breadcrumbs */}
      <ol className="hidden md:flex items-center space-x-2">
        {breadcrumbs?.map((item, index) => (
          <li key={item?.path || index} className="flex items-center">
            {index > 0 && (
              <Icon 
                name="ChevronRight" 
                size={16} 
                className="text-muted-foreground mx-2" 
              />
            )}
            
            <div className="flex items-center space-x-2">
              {item?.current ? (
                <div className="flex items-center space-x-2 text-foreground">
                  <Icon name={item?.icon} size={16} />
                  <span className="font-medium text-sm">{item?.label}</span>
                </div>
              ) : (
                <button
                  onClick={() => handleNavigation(item?.path)}
                  className="flex items-center space-x-2 text-muted-foreground hover:text-foreground transition-smooth"
                >
                  <Icon name={item?.icon} size={16} />
                  <span className="text-sm">{item?.label}</span>
                </button>
              )}
            </div>
          </li>
        ))}
      </ol>
      {/* Mobile Current Page */}
      <div className="md:hidden flex items-center space-x-2 text-foreground">
        <Icon name={breadcrumbs?.[breadcrumbs?.length - 1]?.icon} size={16} />
        <span className="font-medium text-sm">
          {breadcrumbs?.[breadcrumbs?.length - 1]?.label}
        </span>
      </div>
    </nav>
  );
};

export default Breadcrumb;