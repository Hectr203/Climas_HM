export const categoryColors = {
    'General': 'text-gray-500',
    'Proyecto': 'text-blue-500',
    'Finanzas': 'text-green-500',
    'Inventario': 'text-orange-500',
    'Personal': 'text-purple-500',
    'Ventas': 'text-indigo-500',
    'Taller': 'text-yellow-500',
    'Urgente': 'text-red-500',
    'Información': 'text-teal-500',
    'Cotización': 'text-orange-500',
    'Cotización Nueva - Admin': 'text-orange-500'
};

// Función auxiliar para obtener el color de una categoría
export const getCategoryColor = (categoria) => {
    return categoryColors[categoria] || 'text-gray-500';
};

// Diccionario de rutas por categoría con configuración general
export const categoryRoutes = {
    'Proyecto': { route: '/proyectos', needsId: false, idField: null },
    'Finanzas': { route: '/finanzas', needsId: false, idField: null },
    'Inventario': { route: '/inventario', needsId: false, idField: null },
    'Personal': { route: '/personal', needsId: false, idField: null },
    'Ventas': { route: '/oportunidades', needsId: false, idField: null },
    'Taller': { route: '/operaciones-taller', needsId: false, idField: null },
    'Cotización': { route: '/cotizaciones', needsId: true, idField: 'datosAdicionales.idCotizacion' },
    'Cotización Nueva - Admin': { route: '/cotizaciones', needsId: true, idField: 'datosAdicionales.idCotizacion' },

    // Agregar más según sea necesario
};