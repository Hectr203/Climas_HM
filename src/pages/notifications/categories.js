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
    'Cotización': 'text-orange-500'
};

// Función auxiliar para obtener el color de una categoría
export const getCategoryColor = (categoria) => {
    return categoryColors[categoria] || 'text-gray-500';
};

// Diccionario de rutas por categoría
export const categoryRoutes = {
    'Proyecto': '/proyectos',
    'Finanzas': '/finanzas',
    'Inventario': '/inventario',
    'Personal': '/personal',
    'Ventas': '/oportunidades',
    'Taller': '/operaciones-taller',
    'Cotización': '/cotizaciones',
    // Agregar más según sea necesario
};