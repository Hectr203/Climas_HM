// Authentication and Authorization utilities
export const AUTH_ROLES = {
  ADMIN: 'admin',
  ADMINISTRACION: 'administracion',
  PROYECTOS: 'proyectos',
  VENTAS: 'ventas',
  TALLER: 'taller'
};

export const ROLE_PERMISSIONS = {
  // Admin - Acceso total al sistema
  [AUTH_ROLES?.ADMIN]: {
    allowedPaths: [
      // '/dashboard', // TODO: Habilitar cuando se implemente
      '/oportunidades',
      '/cotizaciones',
      '/proyectos',
      '/abonos',
      '/operaciones',
      '/personal',
      '/inventario',
      '/clientes',
      '/finanzas',
      '/usuarios',
      '/visor-galeria',
      '/galeria-proyecto',
      '/documentacion-proyectos',
      '/flujo-proyecto',
      '/constructor-cotizaciones',
      '/operaciones-taller',
      '/centro-operaciones-taller',
      '/monitoreo-ventas'
    ],
    defaultPath: '/oportunidades'
  },
  // Administración - Negocio, Personal y Abonos
  [AUTH_ROLES?.ADMINISTRACION]: {
    allowedPaths: [
      '/clientes',
      '/finanzas',
      '/personal',
      '/abonos'
    ],
    defaultPath: '/clientes'
  },
  // Proyectos - Cotizaciones y Proyectos
  [AUTH_ROLES?.PROYECTOS]: {
    allowedPaths: [
      '/cotizaciones',
      '/proyectos',
      '/visor-galeria',
      '/galeria-proyecto',
      '/documentacion-proyectos',
      '/flujo-proyecto',
      '/constructor-cotizaciones'
    ],
    defaultPath: '/cotizaciones'
  },
  // Ventas - Oportunidades, Cotizaciones, Clientes y Proyectos
  [AUTH_ROLES?.VENTAS]: {
    allowedPaths: [
      '/oportunidades',
      '/cotizaciones',
      '/constructor-cotizaciones',
      '/monitoreo-ventas',
      '/clientes',
      '/proyectos',
      '/visor-galeria',
      '/galeria-proyecto',
      '/documentacion-proyectos',
      '/flujo-proyecto'
    ],
    defaultPath: '/oportunidades'
  },
  // Taller - Operaciones, Operaciones de Taller e Inventario
  [AUTH_ROLES?.TALLER]: {
    allowedPaths: [
      '/operaciones',
      '/operaciones-taller',
      '/centro-operaciones-taller',
      '/inventario'
    ],
    defaultPath: '/operaciones'
  }
};

// Get current user from localStorage
export const getCurrentUser = () => {
  const authToken = localStorage.getItem('authToken');
  const userRole = localStorage.getItem('userRole');
  const userEmail = localStorage.getItem('userEmail');

  if (!authToken || !userRole) {
    return null;
  }

  return {
    token: authToken,
    role: userRole,
    email: userEmail
  };
};

// Check if user is authenticated
export const isAuthenticated = () => {
  const user = getCurrentUser();
  const expiresAt = localStorage.getItem('tokenExpiresAt');
  if (!user || !user.token || !expiresAt) return false;
  // Verifica expiración del token (24h)
  if (Date.now() > Number(expiresAt)) {
    logout();
    return false;
  }
  return true;
};

// Check if user has permission to access a specific path
export const hasPermission = (path, userRole = null) => {
  const currentUser = getCurrentUser();
  // Normaliza el rol a minúsculas y sin espacios extra
  const normalizeRole = r => r?.toLowerCase().trim();
  const role = normalizeRole(userRole || currentUser?.role);

  // Normaliza el path, quitando parámetros (ejemplo: /project-detail-gallery/123 -> /project-detail-gallery)
  const normalizePath = p => {
    if (!p) return '';
    // Solo toma la primera parte después de la barra inicial y antes de cualquier parámetro
    const parts = p.split('/').filter(Boolean);
    return parts.length > 1 ? `/${parts[0]}-${parts[1]}` : `/${parts[0]}`;
  };
  // Si el path tiene formato /algo/algo, lo dejamos como /algo-algo para coincidir con allowedPaths
  const basePath = normalizePath(path);

  // Busca el rol en el objeto de permisos
  const permissions = ROLE_PERMISSIONS?.[role] || ROLE_PERMISSIONS?.[userRole] || ROLE_PERMISSIONS?.[normalizeRole(userRole)];
  if (!permissions) {
    return false;
  }

  // Verifica si el path base está permitido
  return permissions.allowedPaths?.includes(basePath);
};

// Get allowed navigation items for user role
export const getAllowedNavigationItems = (userRole) => {
  if (!userRole || !ROLE_PERMISSIONS?.[userRole]) {
    return [];
  }

  const allowedPaths = ROLE_PERMISSIONS?.[userRole]?.allowedPaths;

  const allNavigationItems = [
    // TODO: Habilitar cuando se implemente el dashboard
    // {
    //   label: 'Dashboard',
    //   path: '/dashboard',
    //   icon: 'LayoutDashboard',
    //   tooltip: 'Resumen operacional y KPIs',
    //   badge: null,
    //   roles: [AUTH_ROLES?.ADMIN]
    // },
    {
      label: 'Oportunidades',
      path: '/oportunidades',
      icon: 'Target',
      tooltip: 'Gestión de oportunidades de venta',
      // badge: 8,
      roles: [AUTH_ROLES?.ADMIN, AUTH_ROLES?.VENTAS]
    },
    {
      label: 'Cotizaciones',
      path: '/cotizaciones',
      icon: 'FileText',
      tooltip: 'Desarrollo y gestión de cotizaciones',
      badge: null,
      roles: [AUTH_ROLES?.ADMIN, AUTH_ROLES?.VENTAS, AUTH_ROLES?.PROYECTOS]
    },
    {
      label: 'Proyectos',
      path: '/proyectos',
      icon: 'FolderOpen',
      tooltip: 'Gestión del ciclo de vida de proyectos',
      // badge: 5,
      roles: [AUTH_ROLES?.ADMIN, AUTH_ROLES?.PROYECTOS, AUTH_ROLES?.VENTAS]
    },
    {
      label: 'Abonos',
      path: '/abonos',
      icon: 'CreditCard',
      tooltip: 'Gestión de abonos de proyectos',
      roles: [AUTH_ROLES?.ADMIN, AUTH_ROLES?.ADMINISTRACION]
    },
    {
      label: 'Operaciones',
      path: '/operaciones',
      icon: 'ClipboardList',
      tooltip: 'Procesamiento y seguimiento de órdenes de trabajo',
      // badge: 12,
      roles: [AUTH_ROLES?.ADMIN, AUTH_ROLES?.TALLER]
    },
    {
      label: 'Operaciones de Taller',
      path: '/operaciones-taller',
      icon: 'Tool',
      tooltip: 'Gestión de operaciones de taller',
      roles: [AUTH_ROLES?.ADMIN, AUTH_ROLES?.TALLER]
    },
    // {
    //   label: 'Centro de Operaciones de Taller',
    //   path: '/workshop-operations-center',
    //   icon: 'Home',
    //   tooltip: 'Centro de operaciones de taller',
    //   roles: [AUTH_ROLES?.ADMIN, AUTH_ROLES?.WORKSHOP_SUPERVISOR]
    // },
    {
      label: 'Recursos',
      icon: 'Users',
      tooltip: 'Gestión de personal e inventario',
      children: [
        {
          label: 'Personal',
          path: '/personal',
          icon: 'UserCheck',
          tooltip: 'Gestión de personal y horarios',
          roles: [AUTH_ROLES?.ADMIN, AUTH_ROLES?.ADMINISTRACION]
        },
        {
          label: 'Inventario',
          path: '/inventario',
          icon: 'Package',
          tooltip: 'Seguimiento de equipos y repuestos',
          roles: [AUTH_ROLES?.ADMIN, AUTH_ROLES?.TALLER]
        }
      ]
    },
    {
      label: 'Negocio',
      icon: 'Building2',
      tooltip: 'Gestión de clientes y finanzas',
      // badge: 3,
      children: [
        {
          label: 'Clientes',
          path: '/clientes',
          icon: 'Users',
          tooltip: 'Gestión de relaciones con clientes',
          roles: [AUTH_ROLES?.ADMIN, AUTH_ROLES?.ADMINISTRACION, AUTH_ROLES?.VENTAS]
        },
        {
          label: 'Finanzas',
          path: '/finanzas',
          icon: 'DollarSign',
          tooltip: 'Supervisión y reportes financieros',
          // badge: 3,
          roles: [AUTH_ROLES?.ADMIN, AUTH_ROLES?.ADMINISTRACION]
        }
      ]
    },
    {
      label: 'Usuarios',
      path: '/usuarios',
      icon: 'UserCog',
      tooltip: 'Gestión de usuarios del sistema',
      badge: null,
      roles: [AUTH_ROLES?.ADMIN]
    }
  ];

  // Filter navigation items based on user role and allowed paths
  const filterItems = (items) => {
    return items?.filter(item => {
      if (item?.children) {
        const allowedChildren = item?.children?.filter(child =>
          child?.roles?.includes(userRole) && allowedPaths?.includes(child?.path)
        );
        if (allowedChildren?.length > 0) {
          item.children = allowedChildren;
          return true;
        }
        return false;
      } else {
        return item?.roles?.includes(userRole) && allowedPaths?.includes(item?.path);
      }
    });
  };

  return filterItems(allNavigationItems);
};

// Get default redirect path for user role
export const getDefaultPath = (userRole) => {
  if (!userRole || !ROLE_PERMISSIONS?.[userRole]) {
    return '/login';
  }

  return ROLE_PERMISSIONS?.[userRole]?.defaultPath;
};

// Logout user
export const logoutUser = () => {
  // Limpiar todos los elementos de autenticación
  localStorage.removeItem('authToken');
  localStorage.removeItem('token'); 
  localStorage.removeItem('tokenExpiresAt');
  localStorage.removeItem('userRole');
  localStorage.removeItem('userEmail');
  localStorage.removeItem('role');
  localStorage.removeItem('rol');
  localStorage.removeItem('rememberMe');
  
  // Forzar recarga completa para limpiar estado
  window.location.replace('/login');
}

import axios from "axios";
import { jwtDecode } from "jwt-decode";

export function logout() {
  // Limpiar todos los elementos de autenticación
  localStorage.removeItem("authToken");
  localStorage.removeItem("token");
  localStorage.removeItem("tokenExpiresAt");
  localStorage.removeItem("userRole");
  localStorage.removeItem("userEmail");
  localStorage.removeItem("role");
  localStorage.removeItem("rol");
  localStorage.removeItem("rememberMe");
  
  // Forzar recarga completa para limpiar estado
  window.location.replace("/login");
}

export async function checkBackendTokenConfig() {
  try {
    const apiUrl = import.meta.env.VITE_API_URL || "";
    
    // Hacer una petición de login de prueba para ver la configuración del token
    console.log("=== VERIFICANDO CONFIGURACIÓN DEL BACKEND ===");
    console.log("API URL:", apiUrl);
    console.log("============================================");
    
    return true;
  } catch (error) {
    console.error("Error verificando configuración del backend:", error);
    return false;
  }
}

export async function renewToken(currentToken) {
  try {
    const apiUrl = import.meta.env.VITE_API_URL || "";
    const response = await axios.post(
      `${apiUrl}/usuarios/extender-sesion`,
      {}, // POST sin body
      {
        headers: { Authorization: `Bearer ${currentToken}` },
      }
    );
    
    if (response.data && response.data.success && response.data.data && response.data.data.token) {
      const newToken = response.data.data.token;
      localStorage.setItem("authToken", newToken);
      
      // Debug info del token renovado
      try {
        const decoded = jwtDecode(newToken);
        if (decoded) {
          const tokenDurationMs = (decoded.exp - decoded.iat) * 1000;
          const tokenDurationMin = Math.round(tokenDurationMs / 1000 / 60);
          
          console.log("=== TOKEN RENOVADO INFO ===");
          console.log("Nuevo token emitido en:", new Date(decoded.iat * 1000).toLocaleString());
          console.log("Nuevo token expira en:", new Date(decoded.exp * 1000).toLocaleString());
          console.log("Duración configurada:", tokenDurationMin, "minutos");
          console.log("¿Fue extendido?", decoded.extendedAt ? "Sí" : "No");
          console.log("========================");
        }
      } catch (error) {
        console.warn("Error al decodificar token renovado:", error);
      }
      
      return newToken;
    } else {
      throw new Error("No se recibió un token válido del servidor");
    }
  } catch (error) {
    console.error("Error al renovar token:", error);
    // Si falla la renovación, hacer logout
    logout();
    throw error;
  }
}
// ...existing code...