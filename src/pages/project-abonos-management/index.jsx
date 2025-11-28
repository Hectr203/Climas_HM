import React, { useState, useEffect } from 'react';
import Icon from '../../components/AppIcon';
import Sidebar from '../../components/ui/Sidebar';
import Header from '../../components/ui/Header';
import Breadcrumb from '../../components/ui/Breadcrumb';
import ProjectFilters from './components/ProjectFilters';
import ProjectTable from './components/ProjectTable';
import ProjectStats from './components/AbonosStats';
import CreateProjectModal from './components/CreateProjectModal';
import EditProjectModal from './components/EditProjectModal';
import RegisterAbonoModal from './components/RegisterAbonoModal';
import ViewAbonosModal from './components/ViewAbonosModal';
import ComprobantesModal from './components/ComprobantesModal';
import useProyect from '../../hooks/useProyect';

/* =========================================================================
   Cache local para el estado visual (UI) de cada proyecto
   - Persistimos en localStorage el "estado UI" (planificación / en proceso)
   - Esto permite mantener el estado visible aunque el backend use otros labels
   ========================================================================= */
const UI_ESTADO_KEY = 'proyectos_ui_estado_v1';
const uiEstadoCache = {
  // Lee el mapa completo desde localStorage
  _read() { try { return JSON.parse(localStorage.getItem(UI_ESTADO_KEY)) || {}; } catch { return {}; } },
  // Obtiene el estado de un proyecto por id
  get(id) { if (!id) return null; const m = this._read(); return m[id] || null; },
  // Setea o elimina el estado para un id; vuelve a guardar en localStorage
  set(id, estado) { if (!id) return; const m = this._read(); if (estado) m[id] = estado; else delete m[id]; localStorage.setItem(UI_ESTADO_KEY, JSON.stringify(m)); },
  // Al recibir lista desde API, rellena los estados que falten con un default
  bulkMergeFromApi(lista = []) {
    const m = this._read(); let cambiado = false;
    lista.forEach(p => {
      const id = p?.id ?? p?._id; if (!id) return;
      if (!m[id]) { const def = backendToUiDefault(p?.estado); if (def) { m[id] = def; cambiado = true; } }
    });
    if (cambiado) localStorage.setItem(UI_ESTADO_KEY, JSON.stringify(m));
  }
};

// Traducción de estados backend → estados UI (sin tildes para consistencia)
const backendToUiDefault = (estadoApi) => {
  const v = String(estadoApi || '').toLowerCase().trim();
  // Mapear estados del backend a estados UI (sin tildes)
  if (v === 'en proceso' || v === 'en-proceso' || v === 'in-progress' || v === 'in progress') return 'en proceso';
  if (v === 'en pausa' || v === 'en-pausa' || v === 'on-hold' || v === 'on hold' || v === 'pausa' || v === 'en pausa') return 'en pausa';
  if (v === 'en revision' || v === 'en-revision' || v === 'en revisión' || v === 'review') return 'en revision';
  if (v === 'completado' || v === 'completed' || v === 'completado' || v === 'done') return 'completado';
  if (v === 'cancelado' || v === 'cancelled' || v === 'canceled') return 'cancelado';
  if (v === 'planificacion' || v === 'planificación' || v === 'planning') return 'planificacion';
  if (v === 'activo' || v === 'active') return 'planificacion'; // Por defecto, activo = planificacion
  return 'planificacion'; // Default
};

// Traducción de estados UI → estados backend (para actualizar en servidor)
const mapUiToBackend = (estadoUi) => {
  const v = String(estadoUi || '').toLowerCase();
  return v === 'en proceso' ? 'en proceso' : 'activo';
};

const ProjectManagement = () => {
  /* =========================================================================
     Hook de proyectos
     - provee lista de proyectos y operaciones (get/update, etc.)
     ========================================================================= */
  const {
    proyectos,
    loading: cargando,
    getProyectos,
    // getProyectoById,
    updateProyecto,
    // deleteProyecto
  } = useProyect();

  /* =========================================================================
     Estado local de la vista
     ========================================================================= */
  const [proyectosFiltrados, setProyectosFiltrados] = useState([]);
  const [modalCrearAbierto, setModalCrearAbierto] = useState(false);
  const [modalEditarAbierto, setModalEditarAbierto] = useState(false);
  const [proyectoSeleccionado, setProyectoSeleccionado] = useState(null);
  const [barraLateralColapsada, setBarraLateralColapsada] = useState(false);
  const [menuEncabezadoAbierto, setMenuEncabezadoAbierto] = useState(false);

  // Cache de abonos por proyecto (en local) para cálculos rápidos de "pagado"
  const [abonosPorProyecto, setAbonosPorProyecto] = useState(() => {
    try {
      const bruto = localStorage.getItem('abonos_proyectos_v1');
      return bruto ? JSON.parse(bruto) : {};
    } catch { return {}; }
  });

  // Estado para abrir el modal de registro de abono asociado a un proyecto
  const [registrarAbonoPara, setRegistrarAbonoPara] = useState(null);

  // Estado para abrir el modal de visualización de abonos
  const [verAbonosPara, setVerAbonosPara] = useState(null);

  // Control del selector de proyecto (cuando se quiere crear un abono sin abrir desde la tabla)
  const [mostrarSelectorProyecto, setMostrarSelectorProyecto] = useState(false);

  // Estado para abrir la gestión de comprobantes
  const [gestionarComprobantesPara, setGestionarComprobantesPara] = useState(null);

  // Trigger para refrescar las estadísticas de abonos cuando se crea o actualiza un abono
  const [refreshAbonosStats, setRefreshAbonosStats] = useState(0);

  /* =========================================================================
     Ciclo de vida
     - Cargar proyectos al montar
     - Sincronizar cache UI y lista filtrada cuando cambien los proyectos
     ========================================================================= */
  useEffect(() => { getProyectos(); }, []);
  useEffect(() => {
    const arr = Array.isArray(proyectos) ? proyectos : [];
    uiEstadoCache.bulkMergeFromApi(arr);   // completa estados UI faltantes
    // Actualizar la lista filtrada cuando cambian los proyectos
    // Esto asegura que los cambios en abonos se reflejen en la tabla
    if (!proyectosFiltrados || proyectosFiltrados.length === 0 || proyectosFiltrados.length === arr.length) {
      setProyectosFiltrados(arr);            // por defecto, sin filtros o misma cantidad
    }
    // Nota: Si hay filtros aplicados y la cantidad cambió, los filtros se mantendrán
    // pero los datos de los proyectos se actualizarán cuando se re-apliquen los filtros
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [proyectos]);

  /* =========================================================================
     Helpers (getters) para acceder a campos con posibles alias
     - Manejan nombres alternos según venga del backend
     ========================================================================= */
  const obtenerNombre = (p) => p?.nombre ?? p?.nombreProyecto ?? p?.name ?? '';
  const obtenerCodigo = (p) => p?.codigo ?? p?.code ?? '';
  const obtenerEstadoUi = (p) => {
    const id = p?.id ?? p?._id;
    // 1. Primero intentar obtener del cache local
    const estadoCache = uiEstadoCache.get(id);
    if (estadoCache) return estadoCache;
    
    // 2. Si no hay en cache, obtener del backend (puede venir en diferentes campos)
    const estadoBackend = p?.estado ?? p?.status ?? p?.estadoProyecto ?? p?.statusLabel ?? '';
    if (estadoBackend) {
      const estadoNormalizado = backendToUiDefault(estadoBackend);
      // Guardar en cache para futuras consultas (incluso si es planificacion)
      if (estadoNormalizado) {
        uiEstadoCache.set(id, estadoNormalizado);
      }
      return estadoNormalizado;
    }
    
    // 3. Default (sin tilde para consistencia)
    return 'planificacion';
  };
  const obtenerDepartamento = (p) => p?.departamento ?? p?.department ?? '';
  const obtenerPrioridad = (p) => p?.prioridad ?? p?.priority ?? '';
  const obtenerInicio = (p) => p?.cronograma?.fechaInicio ?? p?.startDate ?? null;
  const obtenerFin = (p) => p?.cronograma?.fechaFin ?? p?.endDate ?? null;
  const obtenerPresupuesto = (p) => Number(p?.totalPresupuesto ?? p?.presupuesto?.total ?? p?.budget ?? 0);
  const obtenerIdProyecto = (p) => p?.id ?? p?._id;

  // Suma local de abonos guardados en cache para un proyecto
  const obtenerTotalPagado = (p) => {
    const pid = obtenerIdProyecto(p);
    const lista = abonosPorProyecto?.[pid] || [];
    return lista.reduce((acc, a) => acc + (Number(a?.monto) || 0), 0);
  };

  // Obtiene el total restante de un proyecto (igual que en ProjectTable)
  const obtenerTotalRestante = (p) => {
    // 1) Valor directo desde backend si está presente
    const resumen = p?.resumenFinanciero || {};
    const fromDB = resumen?.totalRestante ?? resumen?.saldoPendiente ?? resumen?.saldo_pendiente;
    if (typeof fromDB === 'number' && !isNaN(fromDB)) {
      return fromDB;
    }
    // 2) Fallback: calcula a partir de presupuesto y pagado
    const presupuesto = obtenerPresupuesto(p);
    const pagado = obtenerTotalPagado(p);
    const restante = Math.max(presupuesto - pagado, 0);
    return restante;
  };

  /* =========================================================================
     Normalizadores para filtros (eliminan acentos, bajan a minúsculas, etc.)
     ========================================================================= */
  const normalizar = (s) => (s ?? '').toString()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .toLowerCase().trim().replace(/\s+/g, ' ');

  // Homologa distintos textos de estado a un "canon" para comparar
  const estadoCanonico = (raw) => {
    if (!raw) return 'planificacion';
    const v = normalizar(String(raw));
    
    // Orden de verificación: de más específico a más general
    // "en pausa" debe verificarse antes de "en proceso" para evitar conflictos
    if (v.includes('pausa') || v.includes('pause') || v.includes('hold')) return 'en pausa';
    if (v.includes('revision') || v.includes('review')) return 'en revision';
    if (v.includes('completado') || v.includes('complet') || v.includes('done') || v.includes('closed')) return 'completado';
    if (v.includes('cancelado') || v.includes('canceled') || v.includes('cancelled') || v.includes('cancel')) return 'cancelado';
    if (v.includes('proceso') || v.includes('progress') || v.includes('process')) return 'en proceso';
    if (v.includes('planific') || v.includes('planning') || v.includes('activo') || v.includes('active')) return 'planificacion';
    
    return v || 'planificacion';
  };

  /* =========================================================================
     Manejo de filtros
     - Recibe el objeto `filtros` desde <ProjectFilters/>
     - Aplica búsqueda, estado, departamento, prioridad, fechas, presupuesto y
       un filtro adicional de "estado de pago" (pagado / en-proceso / sin-pago)
     ========================================================================= */
  const manejarCambioFiltros = (filtros) => {
    let filtrados = Array.isArray(proyectos) ? [...proyectos] : [];

    // Búsqueda por nombre, código o cliente
    if (filtros?.search) {
      const q = normalizar(filtros.search);
      filtrados = filtrados.filter(proy => {
        const nombre = normalizar(obtenerNombre(proy));
        const codigo = normalizar(obtenerCodigo(proy));
        const cliente = normalizar(proy?.cliente?.nombre || proy?.cliente || '');
        return nombre.includes(q) || codigo.includes(q) || cliente.includes(q);
      });
    }

    // Filtro por estado de pago (basado en Total restante)
    if (filtros?.paymentStatus) {
      filtrados = filtrados.filter(proy => {
        const presupuesto = obtenerPresupuesto(proy);
        const totalRestante = obtenerTotalRestante(proy);
        
        if (filtros.paymentStatus === 'pagado') {
          // Pagados: Total restante = 0
          return totalRestante === 0;
        } else if (filtros.paymentStatus === 'en-proceso') {
          // En Proceso de Pago: Total restante < Presupuesto (y > 0)
          return totalRestante > 0 && totalRestante < presupuesto;
        } else if (filtros.paymentStatus === 'sin-pago') {
          // Sin Pagos: Total restante = Presupuesto
          return presupuesto > 0 && totalRestante === presupuesto;
        }
        return true;
      });
    }

    // Filtro por estado del proyecto (normalizado)
    if (filtros?.status) {
      // Mapear valores del selector a valores canónicos (sin acentos)
      const mapaEstado = {
        'planning': 'planificacion',
        'in-progress': 'en proceso',
        'on-hold': 'en pausa',
        'review': 'en revision',
        'completed': 'completado',
        'cancelled': 'cancelado'
      };
      const estadoObjetivo = mapaEstado[filtros.status] || estadoCanonico(filtros.status);
      const estadoObjetivoNormalizado = normalizar(estadoObjetivo);
      
      filtrados = filtrados.filter(proy => {
        // Obtener estado del proyecto - intentar múltiples fuentes
        let estadoProyecto = null;
        
        // 1. Intentar desde el objeto raw (datos originales del backend)
        const estadoRaw = proy?.raw?.estado ?? proy?.raw?.status ?? proy?.raw?.estadoProyecto ?? proy?.raw?.statusLabel;
        if (estadoRaw) {
          estadoProyecto = backendToUiDefault(estadoRaw);
        }
        
        // 2. Si no hay raw, intentar desde los campos directos del proyecto
        if (!estadoProyecto) {
          const estadoDirecto = proy?.estado ?? proy?.status ?? proy?.estadoProyecto ?? proy?.statusLabel;
          if (estadoDirecto) {
            estadoProyecto = backendToUiDefault(estadoDirecto);
          }
        }
        
        // 3. Si aún no hay estado, usar la función obtenerEstadoUi (cache + backend)
        if (!estadoProyecto) {
          estadoProyecto = obtenerEstadoUi(proy);
        }
        
        // Normalizar el estado del proyecto a formato canónico
        const estadoProyectoCanonico = estadoCanonico(estadoProyecto);
        
        // Normalizar ambos para comparación (sin acentos, minúsculas)
        const estadoProyectoNormalizado = normalizar(estadoProyectoCanonico);
        
        // Comparar estados normalizados
        const coincide = estadoProyectoNormalizado === estadoObjetivoNormalizado;
        
        return coincide;
      });
    }

    // Filtro por departamento (mapea claves en inglés a etiquetas en español)
    if (filtros?.department) {
      const mapaDepto = { sales: 'Ventas', engineering: 'Ingeniería', installation: 'Instalación', maintenance: 'Mantenimiento', administration: 'Administración' };
      const depto = mapaDepto[filtros.department] || filtros.department;
      filtrados = filtrados.filter(proy => (obtenerDepartamento(proy) || '') === depto);
    }

    // Filtro por prioridad (mapea claves a etiquetas)
    if (filtros?.priority) {
      const mapaPrioridad = { low: 'Baja', medium: 'Media', high: 'Alta', urgent: 'Urgente' };
      const prioridad = mapaPrioridad[filtros.priority] || filtros.priority;
      filtrados = filtrados.filter(proy => {
        const prioridadProy = obtenerPrioridad(proy);
        const prioridadNormalizada = normalizar(prioridadProy);
        const prioridadFiltroNormalizada = normalizar(prioridad);
        return prioridadNormalizada === prioridadFiltroNormalizada;
      });
    }

    // Filtros por presupuesto mínimo/máximo
    if (filtros?.minBudget) filtrados = filtrados.filter(proy => obtenerPresupuesto(proy) >= Number(filtros.minBudget));
    if (filtros?.maxBudget) filtrados = filtrados.filter(proy => obtenerPresupuesto(proy) <= Number(filtros.maxBudget));

    // Filtro por fecha de inicio ≥ selected
    if (filtros?.startDate) {
      const filtroInicio = new Date(filtros.startDate);
      filtrados = filtrados.filter(proy => {
        const d = obtenerInicio(proy); if (!d) return false;
        const sd = new Date(d); return sd >= filtroInicio;
      });
    }

    // Filtro por fecha de fin ≤ selected
    if (filtros?.endDate) {
      const filtroFin = new Date(filtros.endDate);
      filtrados = filtrados.filter(proy => {
        const d = obtenerFin(proy); if (!d) return false;
        const ed = new Date(d); return ed <= filtroFin;
      });
    }

    setProyectosFiltrados(filtrados);
  };

  /* =========================================================================
     Acciones sobre proyectos
     ========================================================================= */
  // Abre modal de edición con el proyecto seleccionado
  const manejarEditarProyecto = (proyecto) => {
    const id = proyecto?.id ?? proyecto?._id; if (!id) return;
    setProyectoSeleccionado({ ...proyecto, id });
    setModalEditarAbierto(true);
  };

  // Actualiza el estado del proyecto en backend y sincroniza cache UI
  const _manejarActualizacionEstado = async (proyectoId, nuevoEstadoUi) => {
    try {
      const estadoBackend = mapUiToBackend(nuevoEstadoUi);
      await updateProyecto(proyectoId, { estado: estadoBackend });
      uiEstadoCache.set(proyectoId, nuevoEstadoUi);
      await getProyectos({ force: true }).catch(() => {});
    } catch (error) {
      console.error('Error al actualizar estado del proyecto:', error);
      alert('Error al actualizar el estado del proyecto');
    }
  };

  // Placeholder para acciones masivas desde la tabla
  const manejarAccionMasiva = (accion, idsSeleccionados) => { console.log(`Acción masiva: ${accion}`, idsSeleccionados); };

  /* =========================================================================
     Flujo de registro de abonos
     - abrir/cerrar modal
     - seleccionar proyecto
     - guardar abono en cache local (para mostrar progreso/pagado)
     ========================================================================= */
  const abrirRegistroAbono = (proyecto) => { setRegistrarAbonoPara(proyecto); };
  const cerrarRegistroAbono = () => {
    setRegistrarAbonoPara(null);
    setMostrarSelectorProyecto(false);
  };
  const abrirVerAbonos = (proyecto) => { setVerAbonosPara(proyecto); };
  const cerrarVerAbonos = () => { setVerAbonosPara(null); };
  const abrirGestionComprobantes = (proyecto) => { setGestionarComprobantesPara(proyecto); };
  const cerrarGestionComprobantes = () => { setGestionarComprobantesPara(null); };
  const _abrirNuevoAbono = () => {
    if (proyectosFiltrados && proyectosFiltrados.length > 0) {
      setMostrarSelectorProyecto(true);
    } else {
      alert('No hay proyectos disponibles para registrar un abono.');
    }
  };
  const seleccionarProyectoParaAbono = (proyecto) => {
    setMostrarSelectorProyecto(false);
    setRegistrarAbonoPara(proyecto);
  };
  const manejarGuardarAbono = async (payload) => {
    const projectId =
      payload?.projectId ??
      payload?.idProyecto ??
      payload?.project_id ??
      payload?.proyectoId ??
      obtenerIdProyecto(registrarAbonoPara);

    if (!projectId) {
      console.warn('No se pudo determinar el ID del proyecto al registrar el abono.');
      return;
    }

    const fecha =
      payload?.fecha ??
      payload?.fechaAbono ??
      payload?.fechaPago ??
      payload?.createdAt ??
      payload?.fecha_creacion ??
      new Date().toISOString();

    const monto = Number(
      payload?.monto ??
      payload?.montoAbono ??
      payload?.monto_abono ??
      payload?.amount ?? 0
    ) || 0;

    const saldoRestante =
      payload?.saldoRestante ??
      payload?.saldo_restante ??
      payload?.saldo ??
      payload?.saldoRestanteDespues ??
      null;

    setAbonosPorProyecto((prev) => {
      const siguiente = { ...prev };
      const lista = Array.isArray(siguiente[projectId]) ? siguiente[projectId] : [];
      siguiente[projectId] = [...lista, { fecha, monto, saldoRestante }];
      try { localStorage.setItem('abonos_proyectos_v1', JSON.stringify(siguiente)); } catch {}
      return siguiente;
    });

    cerrarRegistroAbono();

    // Refrescar las estadísticas de abonos
    setRefreshAbonosStats(prev => prev + 1);

    try {
      await getProyectos({ force: true });
    } catch (errorRecarga) {
      console.error('Error al recargar los proyectos después de registrar un abono:', errorRecarga);
    }
  };

  // Tras editar un proyecto, recarga lista desde backend y cierra modal
  const manejarActualizarProyecto = async () => {
    try {
      await getProyectos({ force: true });
      alert('Proyecto actualizado exitosamente');
      setProyectoSeleccionado(null); setModalEditarAbierto(false);
    } catch {
      setProyectoSeleccionado(null); setModalEditarAbierto(false);
    }
  };

  /* =========================================================================
     Exportación CSV desde el panel de filtros
     - Toma la lista actualmente filtrada y la descarga como CSV
     ========================================================================= */
  const manejarExportarDesdeFiltros = () => {
    const lista = proyectosFiltrados || [];
    if (!lista.length) { alert('No hay proyectos para exportar.'); return; }
    const encabezados = ['Código','Nombre','Cliente','Estado','Prioridad','Presupuesto (MXN)','Inicio','Fin'];
    const escapar = (s) => {
      const v = String(s ?? '');
      const necesita = /[",\n]/.test(v);
      const e = v.replace(/"/g,'""');
      return necesita ? `"${e}"` : e;
    };
    const filas = lista.map(p => {
      const codigo = p?.codigo ?? p?.code ?? '';
      const nombre = p?.nombre ?? p?.name ?? '';
      const cliente = p?.cliente?.nombre || p?.cliente || '';
      const estado = p?.statusLabel || p?.estado || p?.status || '';
      const prioridad = p?.priority || p?.prioridad || '';
      const presupuesto = Number(p?.totalPresupuesto ?? p?.presupuesto?.total ?? p?.budget ?? 0).toLocaleString('es-MX');
      const ini = new Date(p?.cronograma?.fechaInicio ?? p?.startDate ?? '').toLocaleDateString('es-MX');
      const fin = new Date(p?.cronograma?.fechaFin ?? p?.endDate ?? '').toLocaleDateString('es-MX');
      return [codigo,nombre,cliente,estado,prioridad,presupuesto,ini,fin].map(escapar).join(',');
    });
    const csv = [encabezados.join(','), ...filas].join('\n');
    const blob = new Blob([csv], { type:'text/csv;charset=utf-8;' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `proyectos_filtrados_${new Date().toISOString().slice(0,10)}.csv`;
    document.body.appendChild(a); a.click();
    document.body.removeChild(a);
  };

  /* =========================================================================
     Vista de carga (skeleton)
     ========================================================================= */
  if (cargando) {
    return (
      <div className="min-h-screen bg-background flex">
        <Sidebar isCollapsed={barraLateralColapsada} onToggle={() => setBarraLateralColapsada(!barraLateralColapsada)} />
        <div className={`flex-1 transition-all duration-300 ${barraLateralColapsada ? 'lg:ml-16' : 'lg:ml-60'}`}>
          <Header onMenuToggle={() => setMenuEncabezadoAbierto(!menuEncabezadoAbierto)} isMenuOpen={menuEncabezadoAbierto} />
          <div className="pt-16 flex items-center justify-center h-96">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
              <p className="text-muted-foreground">Cargando proyectos...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  /* =========================================================================
     Render principal
     - Sidebar + Header fijos
     - Stats, filtros, tabla, vacíos, modales y selector de proyecto
     ========================================================================= */
  return (
    <div className="min-h-screen bg-background flex">
      <Sidebar isCollapsed={barraLateralColapsada} onToggle={() => setBarraLateralColapsada(!barraLateralColapsada)} />

      <div className={`flex-1 transition-all duration-300 ${barraLateralColapsada ? 'lg:ml-16' : 'lg:ml-60'}`}>
        <Header onMenuToggle={() => setMenuEncabezadoAbierto(!menuEncabezadoAbierto)} isMenuOpen={menuEncabezadoAbierto} />

        <div className="">
          <div className="container mx-auto px-4 py-8">
            {/* Breadcrumb */}
            <div className="mb-6">
              <Breadcrumb />
            </div>

            {/* Encabezado de la página */}
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between mb-8">
              <div>
                <h1 className="text-3xl font-bold text-foreground mb-2">Gestión de Proyectos</h1>
                <p className="text-muted-foreground">Administre el ciclo completo de proyectos HVAC desde la planificación hasta el cierre</p>
              </div>
            </div>

            {/* Resumen de estadísticas (usa proyectos filtrados y total pagado calculado localmente) */}
            {proyectosFiltrados?.length > 0 && (
              <ProjectStats 
                projects={proyectosFiltrados} 
                getTotalPagado={obtenerTotalPagado}
                refreshTrigger={refreshAbonosStats}
              />
            )}

            {/* Filtros (emitirá onFiltersChange → manejarCambioFiltros) */}
            <ProjectFilters
              onFiltersChange={manejarCambioFiltros}
              totalProjects={proyectos?.length}
              filteredProjects={proyectosFiltrados?.length}
              onExport={manejarExportarDesdeFiltros}
            />

            {/* Tabla de proyectos o estado vacío */}
            <div className="space-y-6">
              {proyectosFiltrados?.length > 0 && (
                <ProjectTable
                  projects={proyectosFiltrados}
                  onProjectSelect={manejarEditarProyecto}
                  onRegisterAbono={abrirRegistroAbono}
                  onViewAbonos={abrirVerAbonos}
                  onManageComprobantes={abrirGestionComprobantes}
                  getPaidAmount={obtenerTotalPagado}
                  onBulkAction={manejarAccionMasiva}
                />
              )}

              {/* Mensaje de vacío cuando no hay resultados */}
              {proyectosFiltrados?.length === 0 && (
                <div className="text-center py-12">
                  <Icon name="Filter" size={64} className="text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-foreground mb-2">No se encontraron proyectos con tus filtros</h3>
                  <p className="text-muted-foreground mb-6">Intenta con otros filtros o parámetros de búsqueda</p>
                </div>
              )}
            </div>

            {/* Modal para crear proyecto (al cerrar, recarga lista) */}
            <CreateProjectModal
              isOpen={modalCrearAbierto}
              onClose={() => setModalCrearAbierto(false)}
              onSubmit={() => getProyectos({ force: true })}
            />

            {/* Modal para editar proyecto seleccionado */}
            {modalEditarAbierto && (
              <EditProjectModal
                isOpen
                onClose={() => { setModalEditarAbierto(false); setProyectoSeleccionado(null); }}
                onSubmit={manejarActualizarProyecto}
                project={proyectoSeleccionado}
              />
            )}

            {/* Selector de proyecto para registrar un nuevo abono manualmente */}
            {mostrarSelectorProyecto && (
              <div className="fixed inset-0 z-50 flex items-center justify-center">
                <div className="absolute inset-0 bg-black/40" onClick={() => setMostrarSelectorProyecto(false)} />
                <div className="relative bg-card border border-border rounded-lg shadow-xl w-full max-w-2xl mx-4 max-h-[80vh] overflow-hidden flex flex-col">
                  <div className="p-4 border-b border-border flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <Icon name="CreditCard" size={18} />
                      <h3 className="text-lg font-semibold text-foreground">Seleccionar Proyecto para Nuevo Abono</h3>
                    </div>
                    <button className="text-muted-foreground hover:text-foreground" onClick={() => setMostrarSelectorProyecto(false)} title="Cerrar">
                      <Icon name="X" size={18} />
                    </button>
                  </div>
                  <div className="p-4 overflow-y-auto flex-1">
                    <div className="space-y-2">
                      {proyectosFiltrados && proyectosFiltrados.length > 0 ? (
                        proyectosFiltrados.map((proy) => {
                          const idProyecto = proy?.id ?? proy?._id;
                          const presupuesto = obtenerPresupuesto(proy);
                          const pagado = obtenerTotalPagado(proy);
                          const restante = Math.max(presupuesto - pagado, 0);
                          return (
                            <button
                              key={idProyecto}
                              onClick={() => seleccionarProyectoParaAbono(proy)}
                              className="w-full text-left p-4 border border-border rounded-lg hover:bg-muted/50 transition-smooth"
                            >
                              <div className="flex items-center justify-between">
                                <div className="flex-1">
                                  <div className="font-medium text-foreground">{obtenerNombre(proy)}</div>
                                  <div className="text-sm text-muted-foreground mt-1">
                                    Código: {obtenerCodigo(proy)}
                                  </div>
                                  <div className="text-xs text-muted-foreground mt-1">
                                    Presupuesto: {new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(presupuesto)} | 
                                    Pagado: {new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(pagado)} | 
                                    Restante: {new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(restante)}
                                  </div>
                                </div>
                                <Icon name="ChevronRight" size={20} className="text-muted-foreground" />
                              </div>
                            </button>
                          );
                        })
                      ) : (
                        <div className="text-center py-8 text-muted-foreground">
                          No hay proyectos disponibles
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Modal para registrar abono del proyecto seleccionado */}
            {registrarAbonoPara && (
              <RegisterAbonoModal
                isOpen
                project={registrarAbonoPara}
                currentPaid={obtenerTotalPagado(registrarAbonoPara)}
                onClose={cerrarRegistroAbono}
                onSave={manejarGuardarAbono}
              />
            )}

            {/* Modal para visualizar abonos del proyecto seleccionado */}
            {verAbonosPara && (
              <ViewAbonosModal
                isOpen
                project={verAbonosPara}
                onClose={cerrarVerAbonos}
                onAbonoUpdated={async (proyecto, abonoActualizado) => {
                  // Refrescar las estadísticas de abonos
                  setRefreshAbonosStats(prev => prev + 1);
                  
                  // Recargar los proyectos para actualizar la tabla
                  try {
                    await getProyectos({ force: true });
                  } catch (errorRecarga) {
                    console.error('Error al recargar los proyectos después de actualizar un abono:', errorRecarga);
                  }
                }}
              />
            )}

            {/* Modal de gestión de comprobantes */}
            {gestionarComprobantesPara && (
              <ComprobantesModal
                isOpen
                project={gestionarComprobantesPara}
                onClose={cerrarGestionComprobantes}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProjectManagement;
