import React, { useState, useEffect } from 'react';
import Icon from '../../components/AppIcon';
import Button from '../../components/ui/Button';
import Sidebar from '../../components/ui/Sidebar';
import Header from '../../components/ui/Header';
import Breadcrumb from '../../components/ui/Breadcrumb';
import ProjectFilters, { applyProjectFilters } from './components/ProjectFilters';
import ProjectTable from './components/ProjectTable';
import ProjectTimeline from './components/ProjectTimeline';
import ProjectQuotations from './components/ProjectQuotations';
import ProjectStats from './components/ProjectStats';
import CreateProjectModal from './components/CreateProjectModal';
import EditProjectModal from './components/EditProjectModal';
import useProyect from '../../hooks/useProyect';

// ⬇️ trae tus notificaciones
import { useErrorHandler, useNotifications } from 'context/NotificationContext';

/* ====== Cache local para estado UI ====== */
const UI_ESTADO_KEY = 'proyectos_ui_estado_v1';
const uiEstadoCache = {
  _read() { try { return JSON.parse(localStorage.getItem(UI_ESTADO_KEY)) || {}; } catch { return {}; } },
  get(id) { if (!id) return null; const m = this._read(); return m[id] || null; },
  set(id, estado) { if (!id) return; const m = this._read(); if (estado) m[id] = estado; else delete m[id]; localStorage.setItem(UI_ESTADO_KEY, JSON.stringify(m)); },
  bulkMergeFromApi(list = []) {
    const m = this._read(); let changed = false;
    list.forEach(p => {
      const id = p?.id ?? p?._id; if (!id) return;
      if (!m[id]) { const def = backendToUiDefault(p?.estado); if (def) { m[id] = def; changed = true; } }
    });
    if (changed) localStorage.setItem(UI_ESTADO_KEY, JSON.stringify(m));
  }
};
const backendToUiDefault = (apiEstado) => {
  const v = String(apiEstado || '').toLowerCase();
  if (v === 'en proceso') return 'en proceso';
  if (v === 'activo') return 'planificación';
  return 'planificación';
};
const mapUiToBackend = (uiEstado) => {
  const v = String(uiEstado || '').toLowerCase();
  return v === 'en proceso' ? 'en proceso' : 'activo';
};

const ProjectManagement = () => {
  const {
    proyectos: projects,
    loading: isLoading,
    getProyectos,
    updateProyecto,
  } = useProyect();

  const { handleError, handleSuccess } = useErrorHandler();
  const { showWarning } = useNotifications();

  const [filteredProjects, setFilteredProjects] = useState([]);
  const [activeView, setActiveView] = useState('table');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedProject, setSelectedProject] = useState(null);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [headerMenuOpen, setHeaderMenuOpen] = useState(false);

  useEffect(() => { getProyectos(); }, []);
  useEffect(() => {
    const arr = Array.isArray(projects) ? projects : [];
    uiEstadoCache.bulkMergeFromApi(arr);
    setFilteredProjects(arr);
  }, [projects]);

  /* ====== Normalización de proyectos para filtros ====== */
  const normalizeProjectForFilters = (doc) => {
    if (!doc) return null;

    const clienteNode = doc.cliente ?? doc.client ?? doc.customer ?? doc.account ?? null;

    // Función auxiliar para normalizar texto (quita tildes)
    const norm = (s) => (s ?? '').toString().normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .trim();

    // Obtener estado normalizado
    const cachedEstado = uiEstadoCache.get(doc.id ?? doc._id);
    const estadoRaw = cachedEstado || doc.estado || doc.status || '';

    // Normalizar estado a formato esperado por los filtros
    const estadoNormalizado = (() => {
      const v = norm(estadoRaw); // Usar norm para quitar tildes
      const vLower = String(estadoRaw).toLowerCase().trim();

      if (v.includes('planific') || vLower === 'planning' || vLower === '0') return 'planning';
      if (v.includes('proceso') || v.includes('progress') || vLower === 'in-progress' || vLower === 'in_progress' || vLower === '1') return 'in-progress';
      if (v.includes('pausa') || v.includes('hold') || vLower === 'on-hold' || vLower === 'on_hold' || vLower === 'paused' || vLower === '2') return 'on-hold';
      if (v.includes('revision') || v.includes('review') || vLower === '3') return 'review';
      if (v.includes('complet') || vLower === 'completed' || vLower === 'done' || vLower === '4') return 'completed';
      if (v.includes('cancel') || vLower === 'cancelled' || vLower === '5') return 'cancelled';
      return vLower || 'planning';
    })();

    // Normalizar prioridad
    const prioridadRaw = doc.prioridad ?? doc.priority ?? '';
    const prioridadNormalizada = (() => {
      const v = norm(prioridadRaw);
      if (v.includes('baja') || v === 'low') return 'low';
      if (v.includes('media') || v === 'medium') return 'medium';
      if (v.includes('alta') || v === 'high') return 'high';
      if (v.includes('urgente') || v === 'urgent') return 'urgent';
      return v || null;
    })();

    // Normalizar departamento
    const departamentoRaw = doc.departamento ?? doc.department ?? '';
    const departamentoNormalizado = (() => {
      const v = norm(departamentoRaw);
      if (v.includes('ventas') || v === 'sales') return 'sales';
      if (v.includes('ingenieria') || v.includes('ingeniería') || v === 'engineering') return 'engineering';
      if (v.includes('instalacion') || v.includes('instalación') || v === 'installation') return 'installation';
      if (v.includes('mantenimiento') || v === 'maintenance') return 'maintenance';
      if (v.includes('administracion') || v.includes('administración') || v === 'administration') return 'administration';
      return v || null;
    })();

    const p = doc.presupuesto || {};
    const budget = doc.totalPresupuesto ?? doc.budget ?? p.total ?? null;

    return {
      id: doc.id ?? doc._id,
      code: doc.codigo ?? doc.code ?? '',
      name: doc.nombreProyecto ?? doc.nombre ?? '',
      client: {
        id: (clienteNode && typeof clienteNode === 'object' && (clienteNode.id || clienteNode._id)) ||
          doc.clienteId || doc.idCliente || doc.clientId || null,
        name: (clienteNode && typeof clienteNode === 'object' &&
          (clienteNode.nombre || clienteNode.name || clienteNode.empresa || clienteNode.razonSocial)) ||
          (typeof clienteNode === 'string' ? clienteNode : null) ||
          doc.clienteNombre || doc.clientName || null,
      },
      status: estadoNormalizado,
      statusLabel: doc.statusLabel || estadoRaw,
      priority: prioridadNormalizada,
      budget: budget ? Number(budget) : null,
      startDate: doc.cronograma?.fechaInicio ?? doc.startDate ?? null,
      endDate: doc.cronograma?.fechaFin ?? doc.endDate ?? null,
      department: departamentoNormalizado,
      raw: doc,
    };
  };

  /* ====== filtros ====== */
  const handleFiltersChange = (filters) => {
    const rawProjects = Array.isArray(projects) ? projects : [];

    // Normalizar proyectos para aplicar filtros
    const normalizedProjects = rawProjects.map(normalizeProjectForFilters).filter(Boolean);

    // Aplicar filtros usando la función completa
    const filtered = applyProjectFilters(normalizedProjects, filters);

    // Convertir de vuelta al formato original para mantener compatibilidad
    const filteredRaw = filtered.map(p => {
      // Buscar el proyecto original por ID
      const original = rawProjects.find(rp => (rp.id ?? rp._id) === p.id);
      return original || p.raw || p;
    });

    setFilteredProjects(filteredRaw);
  };

  const handleEditProject = (project) => {
    const id = project?.id ?? project?._id;
    setSelectedProject({ ...project, id });
    setIsEditModalOpen(true);
  };

  const handleStatusUpdate = async (projectId, newStatusUi) => {
    try {
      const estadoBackend = mapUiToBackend(newStatusUi);
      await updateProyecto(projectId, { estado: estadoBackend });
      uiEstadoCache.set(projectId, newStatusUi);
      await getProyectos({ force: true });

      handleSuccess('update', 'Proyecto');
    } catch (error) {
      handleError(error, 'Error al actualizar estado');
    }
  };

  const handleUpdateProject = async () => {
    try {
      await getProyectos({ force: true });
      handleSuccess('update', 'Proyecto');
      setSelectedProject(null);
      setIsEditModalOpen(false);
    } catch (err) {
      handleError(err, 'Error al actualizar');
    }
  };

  /* ===== Exportar ===== */
  const handleExportFromFilters = () => {
    if (!filteredProjects?.length) {
      showWarning('No hay proyectos para exportar');
      return;
    }

    try {
      const headers = ['Código', 'Nombre', 'Cliente', 'Estado', 'Prioridad', 'Presupuesto', 'Inicio', 'Fin'];

      const rows = filteredProjects.map(p =>
        [
          p.codigo,
          p.nombre,
          p?.cliente?.nombre,
          p.estado,
          p.prioridad,
          p.presupuesto?.total,
          new Date(p?.cronograma?.fechaInicio)?.toLocaleDateString('es-MX'),
          new Date(p?.cronograma?.fechaFin)?.toLocaleDateString('es-MX'),
        ]
          .map(v => `"${String(v ?? '').replace(/"/g, '""')}"`)
          .join(',')
      );

      const csv = [headers.join(','), ...rows].join('\n');
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = `proyectos_${new Date().toISOString().slice(0, 10)}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);

      handleSuccess('export', 'Proyectos');
    } catch (e) {
      handleError(e, 'Error al exportar proyectos');
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex">
        <Sidebar isCollapsed={sidebarCollapsed} onToggle={() => setSidebarCollapsed(!sidebarCollapsed)} />
        <div className={`flex-1 transition-all duration-300 ${sidebarCollapsed ? 'lg:ml-16' : 'lg:ml-60'}`}>
          <Header onMenuToggle={() => setHeaderMenuOpen(!headerMenuOpen)} isMenuOpen={headerMenuOpen} />
          <div className="flex items-center justify-center h-96">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
              <p className="text-muted-foreground">Cargando proyectos...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex">
      <Sidebar isCollapsed={sidebarCollapsed} onToggle={() => setSidebarCollapsed(!sidebarCollapsed)} />

      <div className={`flex-1 transition-all duration-300 ${sidebarCollapsed ? 'lg:ml-16' : 'lg:ml-60'}`}>
        <Header onMenuToggle={() => setHeaderMenuOpen(!headerMenuOpen)} isMenuOpen={headerMenuOpen} sidebarCollapsed={sidebarCollapsed} />

        <div className="">
          <div className="container mx-auto px-4 py-8">
            {/* Breadcrumb */}
            <div className="mb-6">
              <Breadcrumb />
            </div>

            {/* Header */}
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between mb-8">
              <div>
                <h1 className="text-3xl font-bold text-foreground mb-2">Gestión de Proyectos</h1>
                <p className="text-muted-foreground">
                  Administre el ciclo completo de proyectos HVAC desde la planificación hasta el cierre
                </p>
              </div>

              <div className="flex items-center space-x-4 mt-4 lg:mt-0">
                <div className="flex bg-muted rounded-lg p-1">
                  {[
                    { value: 'table', label: 'Tabla', icon: 'Table' },
                    { value: 'timeline', label: 'Cronograma', icon: 'Calendar' },
                    { value: 'quotations', label: 'Cotizaciones', icon: 'FileText' },
                  ].map(option => (
                    <button
                      key={option.value}
                      onClick={() => setActiveView(option.value)}
                      className={`flex items-center space-x-2 px-3 py-2 rounded-md transition-smooth
                        ${activeView === option.value
                          ? 'bg-primary text-primary-foreground'
                          : 'text-muted-foreground hover:text-foreground'}`}
                    >
                      <Icon name={option.icon} size={16} />
                      <span className="hidden sm:inline text-sm">{option.label}</span>
                    </button>
                  ))}
                </div>

                <Button onClick={() => setIsCreateModalOpen(true)} iconName="Plus" iconPosition="left">
                  Nuevo Proyecto
                </Button>
              </div>
            </div>

            {/* ✅ ESTADÍSTICAS SE MANTIENEN */}
            {activeView !== 'stats' && filteredProjects?.length > 0 && (
              <ProjectStats projects={filteredProjects} />
            )}

            {/* Filtros */}
            {activeView === 'table' && (
              <ProjectFilters
                onFiltersChange={handleFiltersChange}
                totalProjects={projects?.length}
                filteredProjects={filteredProjects?.length}
                onExport={handleExportFromFilters}
              />
            )}

            <div className="space-y-6">
              {activeView === 'table' && filteredProjects?.length > 0 && (
                <ProjectTable
                  projects={filteredProjects}
                  onProjectSelect={handleEditProject}
                  onStatusUpdate={handleStatusUpdate}
                />
              )}

              {activeView === 'timeline' && (
                <ProjectTimeline
                  projects={filteredProjects}
                  onGenerateReport={() => { }}
                />
              )}

              {activeView === 'quotations' && filteredProjects?.length > 0 && (
                <ProjectQuotations projects={filteredProjects} />
              )}

              {filteredProjects?.length === 0 && (
                <div className="text-center py-12">
                  <Icon name="Filter" size={64} className="text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-foreground mb-2">
                    No se encontraron proyectos con tus filtros
                  </h3>
                  <p className="text-muted-foreground mb-6">
                    Intenta con otros filtros o parámetros de búsqueda
                  </p>
                </div>
              )}
            </div>

            {/* Modales */}
            <CreateProjectModal
              isOpen={isCreateModalOpen}
              onClose={() => setIsCreateModalOpen(false)}
              onSubmit={() => getProyectos({ force: true })}
            />

            {isEditModalOpen && (
              <EditProjectModal
                isOpen
                onClose={() => { setIsEditModalOpen(false); setSelectedProject(null); }}
                onSubmit={handleUpdateProject}
                project={selectedProject}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProjectManagement;
