import React, { useState, useEffect } from 'react';
import Icon from '../../components/AppIcon';
import Button from '../../components/ui/Button';
import Sidebar from '../../components/ui/Sidebar';
import Breadcrumb from '../../components/ui/Breadcrumb';
import useHerramientas from '../../hooks/useHerramientas';
import NewToolModal from './components/NewToolModal';
import AssignLocationModal from './components/AssignLocationModal';
import HistoryModal from './components/HistoryModal';

/**
 * Página principal de gestión de herramientas
 * Permite registrar herramientas y controlar su ubicación en proyectos, obras y taller
 */
const ToolsManagement = () => {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterLocation, setFilterLocation] = useState('all');
  const [showNewToolModal, setShowNewToolModal] = useState(false);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [selectedTool, setSelectedTool] = useState(null);

  // Obtener rol del usuario para validar permisos
  const userRole = localStorage.getItem('userRole') || 'oficina';
  const canCreate = ['admin', 'taller', 'oficina'].includes(userRole);

  const {
    herramientas,
    loading,
    getHerramientas,
    createHerramienta,
    updateHerramienta,
    asignarUbicacion,
    getHistorialMovimientos,
    deleteHerramienta,
    getProyectosParaAsignar
  } = useHerramientas();

  useEffect(() => {
    loadTools();
  }, []);

  const loadTools = async () => {
    await getHerramientas();
  };

  // Filtrar herramientas según búsqueda y ubicación
  const filteredTools = herramientas.filter(tool => {
    const matchesSearch = tool.nombre?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         tool.numero_pieza?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         tool.descripcion?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesLocation = filterLocation === 'all' || tool.ubicacion_tipo === filterLocation;
    
    return matchesSearch && matchesLocation;
  });

  const handleCreateTool = async (toolData) => {
    const result = await createHerramienta(toolData);
    if (result) {
      setShowNewToolModal(false);
    }
  };

  const handleAssignLocation = (tool) => {
    setSelectedTool(tool);
    setShowAssignModal(true);
  };

  const handleViewHistory = (tool) => {
    setSelectedTool(tool);
    setShowHistoryModal(true);
  };

  const handleConfirmAssign = async (locationData) => {
    if (selectedTool) {
      const result = await asignarUbicacion(selectedTool.id, locationData);
      if (result) {
        setShowAssignModal(false);
        setSelectedTool(null);
      }
    }
  };

  const handleDeleteTool = async (toolId) => {
    if (window.confirm('¿Está seguro de eliminar esta herramienta?')) {
      await deleteHerramienta(toolId);
    }
  };

  const getLocationIcon = (tipo) => {
    switch (tipo) {
      case 'oficina': return 'Briefcase';
      case 'obra': return 'Building2';
      case 'taller': return 'Wrench';
      default: return 'MapPin';
    }
  };

  const getLocationColor = (tipo) => {
    switch (tipo) {
      case 'oficina': return 'text-purple-600 bg-purple-50';
      case 'obra': return 'text-orange-600 bg-orange-50';
      case 'taller': return 'text-green-600 bg-green-50';
      default: return 'text-gray-600 bg-gray-50';
    }
  };

  const breadcrumbItems = [
    { label: 'Panel Principal', path: '/dashboard', icon: 'Home' },
    { label: 'Gestión de Herramientas', path: '/herramientas', icon: 'Wrench', current: true }
  ];

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50">
      <Sidebar 
        collapsed={sidebarCollapsed} 
        mobileMenuOpen={mobileMenuOpen}
        onCollapsedChange={setSidebarCollapsed}
        onMobileMenuOpenChange={setMobileMenuOpen}
      />

      <div className={`flex-1 flex flex-col overflow-hidden transition-all duration-300 ${
        sidebarCollapsed ? 'ml-0 lg:ml-20' : 'ml-0 lg:ml-64'
      }`}>
        {/* Header */}
        <header className="bg-white border-b border-gray-200 px-4 sm:px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4 flex-1 min-w-0">
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="lg:hidden p-2 rounded-lg hover:bg-gray-100 flex-shrink-0"
            >
              <Icon name="Menu" className="w-5 h-5" />
            </button>
            <button
              onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
              className="hidden lg:block p-2 rounded-lg hover:bg-gray-100 flex-shrink-0"
            >
              <Icon name={sidebarCollapsed ? "ChevronRight" : "ChevronLeft"} className="w-5 h-5" />
            </button>
            <div className="min-w-0 flex-1">
              <Breadcrumb items={breadcrumbItems} />
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className="flex-1 overflow-auto p-4 sm:p-6">
          {/* Title and Actions */}
          <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
                <Icon name="Wrench" className="w-8 h-8 text-blue-600" />
                Gestión de Herramientas
              </h1>
              <p className="text-gray-600 mt-1">
                Control y localización de herramientas en proyectos, obras y taller
              </p>
            </div>
            {canCreate && (
              <Button
                onClick={() => setShowNewToolModal(true)}
                className="bg-blue-600 hover:bg-blue-700 text-white"
              >
                <Icon name="Plus" className="w-5 h-5" />
                Registrar Herramienta
              </Button>
            )}
          </div>

          {/* Filters */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 mb-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Search */}
              <div className="relative">
                <Icon name="Search" className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  placeholder="Buscar por nombre, número de pieza o descripción..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              {/* Location Filter */}
              <div className="relative">
                <Icon name="MapPin" className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <select
                  value={filterLocation}
                  onChange={(e) => setFilterLocation(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent appearance-none"
                >
                  <option value="all">Todas las ubicaciones</option>
                  <option value="taller">Taller</option>
                  <option value="proyecto">Proyecto</option>
                  <option value="obra">Obra</option>
                  <option value="oficina">Oficina</option>
                </select>
              </div>
            </div>
          </div>

          {/* Tools Grid */}
          {loading ? (
            <div className="flex justify-center items-center h-64">
              <div className="text-center">
                <Icon name="Loader2" className="w-12 h-12 text-blue-600 animate-spin mx-auto mb-4" />
                <p className="text-gray-600">Cargando herramientas...</p>
              </div>
            </div>
          ) : filteredTools.length === 0 ? (
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12 text-center">
              <Icon name="Search" className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-gray-900 mb-2">
                No se encontraron herramientas
              </h3>
              <p className="text-gray-600 mb-6">
                {searchTerm || filterLocation !== 'all' 
                  ? 'Intenta ajustar los filtros de búsqueda'
                  : 'Comienza registrando tu primera herramienta'}
              </p>
              {!searchTerm && filterLocation === 'all' && (
                <Button
                  onClick={() => setShowNewToolModal(true)}
                  className="bg-blue-600 hover:bg-blue-700 text-white"
                >
                  <Icon name="Plus" className="w-5 h-5" />
                  Registrar Herramienta
                </Button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredTools.map((tool) => (
                <div
                  key={tool.id}
                  className="bg-white rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition-shadow"
                >
                  <div className="p-4">
                    {/* Header */}
                    <div className="flex items-start gap-3 mb-3">
                      <Icon name="Wrench" className="w-10 h-10 text-gray-400 flex-shrink-0 mt-0.5" />
                      <div className="flex-1 min-w-0">
                        <h3 className="text-base font-semibold text-gray-900 mb-1 break-words">
                          {tool.nombre}
                        </h3>
                        <p className="text-xs text-gray-500 font-mono break-all">
                          #{tool.numero_pieza}
                        </p>
                      </div>
                    </div>

                    {/* Description */}
                    {tool.descripcion && (
                      <p className="text-xs text-gray-600 mb-3 break-words leading-relaxed">
                        {tool.descripcion}
                      </p>
                    )}

                    {/* Location Badge */}
                    <div className="mb-3">
                      <div className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium ${getLocationColor(tool.ubicacion_tipo)}`}>
                        <Icon name={getLocationIcon(tool.ubicacion_tipo)} className="w-4 h-4 flex-shrink-0" />
                        <span className="capitalize">
                          {tool.ubicacion_tipo || 'Sin ubicación'}
                        </span>
                      </div>
                    </div>

                    {/* Location Details */}
                    {tool.ubicacion_nombre && (
                      <div className="flex items-start gap-1.5 mb-3 text-xs text-gray-600">
                        <Icon name="MapPin" className="w-4 h-4 flex-shrink-0 mt-0.5" />
                        <span className="break-words leading-relaxed">
                          {tool.ubicacion_nombre}
                        </span>
                      </div>
                    )}

                    {/* Actions */}
                    <div className="flex gap-2 pt-3 border-t border-gray-100">
                      <Button
                        onClick={() => handleAssignLocation(tool)}
                        variant="outline"
                        className="flex-1 text-xs py-2 px-2 h-auto"
                      >
                        <Icon name="MapPin" className="w-4 h-4" />
                        <span className="ml-1">Asignar</span>
                      </Button>
                      <Button
                        onClick={() => handleViewHistory(tool)}
                        variant="outline"
                        className="flex-1 text-xs py-2 px-2 h-auto"
                      >
                        <Icon name="History" className="w-4 h-4" />
                        <span className="ml-1">Historial</span>
                      </Button>
                      <Button
                        onClick={() => handleDeleteTool(tool.id)}
                        variant="ghost"
                        className="text-red-600 hover:bg-red-50 text-xs py-2 px-2 h-auto"
                      >
                        <Icon name="Trash2" className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </main>
      </div>

      {/* Modals */}
      {showNewToolModal && (
        <NewToolModal
          onClose={() => setShowNewToolModal(false)}
          onSave={handleCreateTool}
        />
      )}

      {showAssignModal && selectedTool && (
        <AssignLocationModal
          tool={selectedTool}
          onClose={() => {
            setShowAssignModal(false);
            setSelectedTool(null);
          }}
          onConfirm={handleConfirmAssign}
          getProyectosParaAsignar={getProyectosParaAsignar}
        />
      )}

      {showHistoryModal && selectedTool && (
        <HistoryModal
          tool={selectedTool}
          onClose={() => {
            setShowHistoryModal(false);
            setSelectedTool(null);
          }}
          getHistorial={getHistorialMovimientos}
        />
      )}
    </div>
  );
};

export default ToolsManagement;
