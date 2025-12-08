import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Icon from '../../../components/AppIcon';
import Button from '../../../components/ui/Button';
import proyectoService from 'services/proyectoService';
import clientService from 'services/clientService';
import { useNotifications } from 'context/NotificationContext';

/* === Config === */
const DEFAULT_USD_RATE = 18;
const PAGE_SIZE_OPTIONS = [5, 10, 20, 50];

/* === Helpers === */
const safeUUID = () => {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID();
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
};
const parseISODate = (v) => {
  if (!v) return null;
  const d = new Date(v);
  return isNaN(d.getTime()) ? null : d;
};
const formatCurrency = (n) =>
  n == null || isNaN(n)
    ? '—'
    : new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(n);
const formatUSD = (n) =>
  n == null || isNaN(n)
    ? '—'
    : new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'USD' }).format(n);
const formatDate = (d) => {
  const x = d instanceof Date ? d : parseISODate(d);
  if (!x) return '—';
  return x.toLocaleDateString('es-MX', { day: '2-digit', month: '2-digit', year: 'numeric' });
};
const getPriorityColor = (p) => {
  const v = (p || '').toString().toLowerCase().trim();
  const map = {
    baja: 'text-green-600',
    media: 'text-yellow-600',
    alta: 'text-orange-600',
    urgente: 'text-red-600',
    low: 'text-green-600',
    medium: 'text-yellow-600',
    high: 'text-orange-600',
    urgent: 'text-red-600',
  };
  return map[v] || 'text-gray-600';
};

const STATUS_OPTIONS = [
  { key: 'planning', label: 'Planificación' },
  { key: 'in_progress', label: 'En Progreso' },
  { key: 'on_hold', label: 'En Pausa' },
  { key: 'review', label: 'En Revisión' },
  { key: 'completed', label: 'Completado' },
  { key: 'cancelled', label: 'Cancelado' },
];

const statusKeyFromAny = (raw) => {
  if (raw == null) return null;
  const v = String(raw).toLowerCase().trim();

  if (v === '0') return 'planning';
  if (v === '1') return 'in_progress';
  if (v === '2') return 'on_hold';
  if (v === '3') return 'review';
  if (v === '4') return 'completed';
  if (v === '5') return 'cancelled';

  const map = {
    planificacion: 'planning',
    planificación: 'planning',
    planning: 'planning',
    'en progreso': 'in_progress',
    'en-progreso': 'in_progress',
    in_progress: 'in_progress',
    'in-progress': 'in_progress',
    progress: 'in_progress',
    'en pausa': 'on_hold',
    'en-pausa': 'on_hold',
    on_hold: 'on_hold',
    paused: 'on_hold',
    pausa: 'on_hold',
    revision: 'review',
    revisión: 'review',
    review: 'review',
    completado: 'completed',
    complete: 'completed',
    completed: 'completed',
    done: 'completed',
    finalizado: 'completed',
    cancelado: 'cancelled',
    canceled: 'cancelled',
    cancelled: 'cancelled',
    anulado: 'cancelled',
  };
  return map[v] || null;
};

const getStatusColorByKey = (key) => {
  const map = {
    planning: 'bg-blue-100 text-blue-800',
    in_progress: 'bg-green-100 text-green-800',
    on_hold: 'bg-yellow-100 text-yellow-800',
    review: 'bg-purple-100 text-purple-800',
    completed: 'bg-emerald-100 text-emerald-800',
    cancelled: 'bg-red-100 text-red-800',
  };
  return map[key] || 'bg-gray-100 text-gray-800';
};

const resolveProjectStatus = (project) => {
  const k1 = statusKeyFromAny(project?.status);
  const lbl1 = project?.statusLabel;

  const r = project?.raw || {};
  const k2 =
    statusKeyFromAny(r.estado) ||
    statusKeyFromAny(r.fase) ||
    statusKeyFromAny(r.stage) ||
    statusKeyFromAny(r.status);

  const key = k1 || k2 || null;

  if (lbl1) return { key: key || statusKeyFromAny(lbl1) || 'planning', label: lbl1 };

  const found = STATUS_OPTIONS.find((o) => o.key === key);
  if (found) return found;

  const rawTxt = r.estado || r.fase || r.stage || r.status || project?.statusLabel || project?.status;
  if (rawTxt) {
    const txt = String(rawTxt);
    return { key: key || 'planning', label: txt.charAt(0).toUpperCase() + txt.slice(1) };
  }
  return { key: 'planning', label: 'Planificación' };
};

/*Convierte objeto ubicación en string legible */
const formatLocation = (loc) => {
  if (!loc) return '—';
  
  // Si es string, intentar parsear si es JSON
  if (typeof loc === 'string') {
    const trimmed = loc.trim();
    if (trimmed.startsWith('{') && trimmed.endsWith('}')) {
      try {
        const parsed = JSON.parse(trimmed);
        if (parsed && typeof parsed === 'object') {
          loc = parsed;
        } else {
          return trimmed; // Si no se puede parsear, retornar el string original
        }
      } catch {
        return trimmed; // Si falla el parse, retornar el string original
      }
    } else {
      return trimmed; // String simple, retornar tal cual
    }
  }
  
  // Si es un array, tomar el primer elemento
  if (Array.isArray(loc) && loc.length > 0) {
    loc = loc[0];
  }
  
  // Si ahora es objeto (y no array), extraer los campos en el orden: Dirección, Municipio, Estado
  if (typeof loc === 'object' && !Array.isArray(loc)) {
    // Extraer dirección (varias variaciones posibles)
    const direccion = 
      loc.direccion || 
      loc.dirección || 
      loc.direccionCompleta || 
      loc.address || 
      '';
    
    // Extraer municipio
    const municipio = 
      loc.municipio || 
      loc.municipioNombre || 
      loc.city || 
      '';
    
    // Extraer estado
    const estado = 
      loc.estado || 
      loc.estadoCode || 
      loc.state || 
      '';
    
    // Construir array en el orden: Dirección, Municipio, Estado
    const parts = [direccion, municipio, estado].filter(Boolean);
    
    // Si hay al menos un campo, retornar formateado
    if (parts.length > 0) {
      return parts.join(', ');
    }
    
    // Si no hay campos válidos, retornar vacío en lugar de JSON.stringify
    return '—';
  }
  
  return String(loc);
};

/* Componente para mostrar descripción truncada con "Ver más..." */
const DescriptionWithExpand = ({ description, projectId, isExpanded, onToggle }) => {
  const MAX_LENGTH = 50;
  
  if (!description || description === '—') {
    return <span className="text-sm text-muted-foreground">—</span>;
  }
  
  const isLong = description.length > MAX_LENGTH;
  const displayText = isLong && !isExpanded 
    ? description.substring(0, MAX_LENGTH) + '...'
    : description;
  
  return (
    <div className="text-sm text-muted-foreground whitespace-pre-line">
      {displayText}
      {isLong && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onToggle(projectId);
          }}
          className="ml-2 text-primary hover:underline focus:outline-none"
        >
          {isExpanded ? 'Ver menos...' : 'Ver más...'}
        </button>
      )}
    </div>
  );
};

/* Normalizador Proyecto */
const mapProjectDocStrict = (doc) => {
  const id = doc.id ?? doc._id ?? safeUUID();
  const code = doc.codigo ?? doc.code ?? '—';
  const name = doc.nombreProyecto ?? doc.nombre ?? 'Proyecto sin nombre';
  const type = doc.tipoProyecto ?? doc.type ?? '—';

  const clienteNode = doc.cliente ?? doc.client ?? doc.customer ?? doc.account ?? null;

  const client = {
    id:
      (clienteNode && typeof clienteNode === 'object' && (clienteNode.id || clienteNode._id)) ||
      doc.clienteId ||
      doc.idCliente ||
      doc.clientId ||
      doc.customerId ||
      null,
    name:
      (clienteNode &&
        typeof clienteNode === 'object' &&
        (clienteNode.nombre || clienteNode.name || clienteNode.empresa || clienteNode.razonSocial)) ||
      (typeof clienteNode === 'string' ? clienteNode : null) ||
      doc.clienteNombre ||
      doc.clientName ||
      null,
    email:
      (clienteNode && typeof clienteNode === 'object' && (clienteNode.email || clienteNode.correo)) ||
      doc.clienteEmail ||
      doc.emailCliente ||
      null,
    contact:
      (clienteNode &&
        typeof clienteNode === 'object' &&
        (clienteNode.contacto?.nombre || clienteNode.telefono || clienteNode.phone)) ||
      doc.contacto ||
      doc.telefono ||
      null,
  };

  const p = doc.presupuesto || {};
  const budget = doc.totalPresupuesto ?? doc.budget ?? p.total ?? null;

  const equiposUSD = (() => {
    if (p.equipoDolares != null && !isNaN(Number(p.equipoDolares))) return Number(p.equipoDolares) || 0;
    if (p?._metaEquipos?.capturadoEn === 'USD' && p?._metaEquipos?.valorUSD != null) {
      const v = Number(p._metaEquipos.valorUSD);
      if (!isNaN(v)) return v;
    }
    const mxn = Number(p?.equipos || 0);
    if (!(mxn > 0)) return 0;
    const rate = Number(p?._metaEquipos?.tipoCambio);
    const divisor = rate && rate > 0 ? rate : DEFAULT_USD_RATE;
    return mxn / divisor;
  })();

  const location = formatLocation(doc.ubicacion ?? doc.location ?? null);

  return {
    id,
    code,
    name,
    type,
    image: doc.image ?? null,
    client,
    status: doc.status ?? null,
    statusLabel: doc.statusLabel ?? null,
    priority: doc.prioridad ?? doc.prioridades ?? doc.priority ?? null,
    priorityLabel: doc.priorityLabel ?? null,
    budget,
    startDate: doc.cronograma?.fechaInicio ?? doc.startDate ?? null,
    endDate: doc.cronograma?.fechaFin ?? doc.endDate ?? null,
    department: doc.departamento ?? doc.department ?? null,
    location,
    description: doc.descripcion ?? doc.description ?? null,
    assignedPersonnel: Array.isArray(doc.assignedPersonnel)
      ? doc.assignedPersonnel
      : Array.isArray(doc.personalAsignado)
        ? doc.personalAsignado.map((s) => {
          if (typeof s !== 'string') return { name: String(s ?? '—'), role: '' };
          const [n, r] = s.split(' - ');
          return { name: n || '—', role: r || '' };
        })
        : null,
    workOrders: Array.isArray(doc.workOrders) ? doc.workOrders : undefined,
    equiposUSD,
    // 🔵 Abonos originales quedan en raw (el cálculo se comenta más abajo)
    abonos: Array.isArray(doc.abonos) ? doc.abonos : [],
    createdAt: doc.createdAt ?? null,
    updatedAt: doc.updatedAt ?? null,
    raw: doc,
  };
};

/*Hydration desde /clientes*/
const normalizeClientRecord = (c) => {
  const id = c?.id ?? c?._id ?? c?.clienteId ?? c?.idCliente ?? null;
  const name =
    c?.nombre ??
    c?.empresa ??
    c?.razonSocial ??
    c?.razon_social ??
    c?.displayName ??
    c?.name ??
    null;
  const email =
    c?.email ??
    c?.correo ??
    c?.correoElectronico ??
    c?.mail ??
    c?.contacto?.email ??
    c?.contacto?.correo ??
    null;
  const contact =
    c?.contacto?.nombre ??
    c?.contacto?.name ??
    c?.telefono ??
    c?.phone ??
    null;
  return { id, name, email, contact };
};

const ProjectTable = ({
  projects,
  onProjectSelect,
  onStatusUpdate,
  onBulkAction,
  onImageUpload,
  isUploadingImage,
}) => {
  const navigate = useNavigate();

  //Notificaciones
  const { showConfirm, showSuccess, showError } = useNotifications();

  //Shadow list para props y lista remota para fetch
  const [localDocs, setLocalDocs] = useState(null);
  const [remoteDocs, setRemoteDocs] = useState([]);

  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [sortConfig, setSortConfig] = useState({ key: 'startDate', direction: 'desc' });
  const [selectedProjects, setSelectedProjects] = useState([]);
  const [expandedRows, setExpandedRows] = useState([]);
  const [expandedDescriptions, setExpandedDescriptions] = useState(new Set());
  // 🔵 Estado de borrador de abonos (COMENTADO)
  // const [newAbonoDraft, setNewAbonoDraft] = useState({});
  const [clientCache, setClientCache] = useState({});
  const [clientsLoaded, setClientsLoaded] = useState(false);

  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(PAGE_SIZE_OPTIONS[0]);

  /* Sincronizar shadow con props */
  useEffect(() => {
    if (Array.isArray(projects) && projects.length >= 0) {
      setLocalDocs(projects);
    } else {
      setLocalDocs(null);
    }
  }, [projects]);

  /* Cargar proyectos si NO vienen por props */
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        if (Array.isArray(projects)) return;
        setLoading(true);
        setErrorMsg('');
        const res = await proyectoService.getProyectos().catch(() => []);
        if (!mounted) return;
        const data = Array.isArray(res) ? res : Array.isArray(res?.data) ? res.data : [];
        setRemoteDocs(data);
      } catch (e) {
        console.error(e);
        if (mounted) setErrorMsg('No se pudieron cargar los proyectos.');
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, [projects]);

  //Cargar TODOS los clientes
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const res = await clientService.getClients();
        const list = Array.isArray(res) ? res : Array.isArray(res?.data) ? res.data : [];
        const map = {};
        list.forEach((raw) => {
          const c = normalizeClientRecord(raw);
          if (c.id) map[c.id] = { name: c.name || null, email: c.email || null, contact: c.contact || null };
        });
        if (mounted) {
          setClientCache(map);
          setClientsLoaded(true);
        }
      } catch (e) {
        console.warn('No se pudieron cargar clientes, se usará sólo lo que traiga el proyecto.');
        if (mounted) setClientsLoaded(true);
      }
    })();
    return () => { mounted = false; };
  }, []);

  const baseSourceDocs = useMemo(() => {
    return Array.isArray(localDocs) ? localDocs : remoteDocs;
  }, [localDocs, remoteDocs]);

  const normalizedProjects = useMemo(() => {
    if (!Array.isArray(baseSourceDocs)) return [];
    return baseSourceDocs.map(mapProjectDocStrict);
  }, [baseSourceDocs]);

  // 🔵 Inicialización de borradores de abono (COMENTADO)
  /*
  useEffect(() => {
    setNewAbonoDraft((prev) => {
      const clone = { ...prev };
      normalizedProjects.forEach((p) => {
        if (!clone[p.id]) clone[p.id] = { fecha: '', monto: '', nota: '' };
      });
      return clone;
    });
  }, [normalizedProjects]);
  */

  const handleSort = (key) => {
    let direction = 'asc';
    if (sortConfig?.key === key && sortConfig?.direction === 'asc') direction = 'desc';
    setSortConfig({ key, direction });
    setCurrentPage(1);
  };

  const sortedProjects = useMemo(() => {
    const list = [...normalizedProjects];
    const { key, direction } = sortConfig || {};
    if (!key) return list;

    return list.sort((a, b) => {
      let aValue = a?.[key];
      let bValue = b?.[key];

      if (aValue instanceof Date || bValue instanceof Date) {
        const at = aValue instanceof Date ? aValue.getTime() : -Infinity;
        const bt = bValue instanceof Date ? bValue.getTime() : -Infinity;
        return direction === 'asc' ? at - bt : bt - at;
      }

      if (typeof aValue === 'number' || typeof bValue === 'number') {
        aValue = Number(aValue) || 0;
        bValue = Number(bValue) || 0;
        return direction === 'asc' ? aValue - bValue : bValue - aValue;
      }

      aValue = (aValue ?? '').toString().toLowerCase();
      bValue = (bValue ?? '').toString().toLowerCase();
      if (aValue < bValue) return direction === 'asc' ? -1 : 1;
      if (aValue > bValue) return direction === 'asc' ? 1 : -1;
      return 0;
    });
  }, [normalizedProjects, sortConfig]);

  const totalItems = sortedProjects.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const startIndex = (currentPage - 1) * pageSize;
  const endIndex = Math.min(startIndex + pageSize, totalItems);
  const pageItems = sortedProjects.slice(startIndex, endIndex);

  useEffect(() => {
    if (currentPage > totalPages) setCurrentPage(totalPages);
    if (currentPage < 1) setCurrentPage(1);
  }, [currentPage, totalPages]);

  const handleChangePageSize = (e) => {
    const v = Number(e?.target?.value) || PAGE_SIZE_OPTIONS[0];
    setPageSize(v);
    setCurrentPage(1);
  };

  const goToPage = (n) => setCurrentPage(Math.min(Math.max(1, n), totalPages));
  const prevPage = () => goToPage(currentPage - 1);
  const nextPage = () => goToPage(currentPage + 1);

  const getPossibleClientId = (p) => {
    const r = p?.raw || {};
    return (
      p?.client?.id ||
      p?.client?._id ||
      r.clienteId ||
      r.idCliente ||
      r.clientId ||
      r.customerId ||
      (r.cliente && (r.cliente.id || r.cliente._id)) ||
      (r.client && (r.client.id || r.client._id)) ||
      null
    );
  };
  const resolveClientName = (p) => {
    if (p?.client?.name) return p.client.name;
    const cid = getPossibleClientId(p);
    if (cid && clientCache[cid]?.name) return clientCache[cid].name;
    const r = p?.raw || {};
    const c = r.cliente || r.client || r.customer || r.account || {};
    return (
      c.nombre ||
      c.name ||
      c.empresa ||
      c.razonSocial ||
      r.clienteNombre ||
      r.clientName ||
      r.empresa ||
      'Sin cliente'
    );
  };
  const resolveClientEmailOrContact = (p) => {
    if (p?.client?.email) return p.client.email;
    if (p?.client?.contact) return p.client.contact;
    const cid = getPossibleClientId(p);
    if (cid) {
      const hit = clientCache[cid];
      if (hit?.email) return hit.email;
      if (hit?.contact) return hit.contact;
    }
    const r = p?.raw || {};
    const c = r.cliente || r.client || r.customer || r.account || {};
    return c.email || c.correo || c.contacto?.email || c.telefono || c.phone || 'Sin contacto';
  };

  const handleSelectProject = (id) =>
    setSelectedProjects((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));

  const handleSelectAll = () => {
    const pageIds = pageItems.map((p) => p?.id);
    const allSelected = pageIds.every((id) => selectedProjects.includes(id));
    if (allSelected) {
      setSelectedProjects((prev) => prev.filter((id) => !pageIds.includes(id)));
    } else {
      setSelectedProjects((prev) => Array.from(new Set([...prev, ...pageIds])));
    }
  };

  const toggleRowExpansion = (id) =>
    setExpandedRows((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));

  const toggleDescriptionExpansion = (projectId) => {
    setExpandedDescriptions((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(projectId)) {
        newSet.delete(projectId);
      } else {
        newSet.add(projectId);
      }
      return newSet;
    });
  };

  const usingLocalShadow = Array.isArray(localDocs);

  //Eliminar (optimista, sin refresh) —>>> MENSAJE EDITADO
  // 🔴 Eliminar (optimista, sin refresh)
  const handleDelete = (project) => {
    if (!project?.id) return;

    const doRemove = (list, id) => list.filter((d) => (d.id || d._id) !== id);

    const nombre = project?.name || project?.code || 'sin nombre';

    showConfirm(`¿Deseas eliminar este proyecto "${nombre}"?`, {
      onConfirm: async () => {
        const prevLocal = usingLocalShadow ? [...localDocs] : null;
        const prevRemote = !usingLocalShadow ? [...remoteDocs] : null;

        if (usingLocalShadow) {
          setLocalDocs((prev) => doRemove(prev, project.id));
        } else {
          setRemoteDocs((prev) => doRemove(prev, project.id));
        }
        setSelectedProjects((prev) => prev.filter((x) => x !== project.id));
        setExpandedRows((prev) => prev.filter((x) => x !== project.id));
        setExpandedDescriptions((prev) => {
          const newSet = new Set(prev);
          newSet.delete(project.id);
          return newSet;
        });

        setTimeout(() => {
          const newTotal = (usingLocalShadow ? (prevLocal ? doRemove(prevLocal, project.id) : []) : (prevRemote ? doRemove(prevRemote, project.id) : [])).length;
          const newTotalPages = Math.max(1, Math.ceil(newTotal / pageSize));
          setCurrentPage((cp) => Math.min(cp, newTotalPages));
        }, 0);

        try {
          await proyectoService.deleteProyecto(project.id);
          showSuccess('Proyecto eliminado exitosamente');
        } catch (e) {
          console.error(e);
          if (usingLocalShadow && prevLocal) setLocalDocs(prevLocal);
          if (!usingLocalShadow && prevRemote) setRemoteDocs(prevRemote);
          showError('No se pudo eliminar el proyecto');
        }
      },
      onCancel: () => { },
    });
  };

  //Eliminación masiva (optimista)
  const handleBulkDelete = () => {
    if (!selectedProjects?.length) return;

    const toDelete = [...selectedProjects];

    showConfirm(`¿Eliminar ${toDelete.length} proyecto(s)?`, {
      onConfirm: async () => {
        const doRemoveBulk = (list, ids) => list.filter((d) => !ids.includes(d.id || d._id));

        const prevLocal = usingLocalShadow ? [...localDocs] : null;
        const prevRemote = !usingLocalShadow ? [...remoteDocs] : null;

        if (usingLocalShadow) {
          setLocalDocs((prev) => doRemoveBulk(prev, toDelete));
        } else {
          setRemoteDocs((prev) => doRemoveBulk(prev, toDelete));
        }
        setSelectedProjects([]);
        setExpandedRows((prev) => prev.filter((x) => !toDelete.includes(x)));
        setExpandedDescriptions((prev) => {
          const newSet = new Set(prev);
          toDelete.forEach((id) => newSet.delete(id));
          return newSet;
        });

        setTimeout(() => {
          const newTotal = (usingLocalShadow ? (prevLocal ? doRemoveBulk(prevLocal, toDelete) : []) : (prevRemote ? doRemoveBulk(prevRemote, toDelete) : [])).length;
          const newTotalPages = Math.max(1, Math.ceil(newTotal / pageSize));
          setCurrentPage((cp) => Math.min(cp, newTotalPages));
        }, 0);

        try {
          await Promise.allSettled(toDelete.map((id) => proyectoService.deleteProyecto(id)));
          showSuccess('Proyectos eliminados exitosamente');
        } catch (e) {
          console.error(e);
          if (usingLocalShadow && prevLocal) setLocalDocs(prevLocal);
          if (!usingLocalShadow && prevRemote) setRemoteDocs(prevRemote);
          showError('Ocurrió un error eliminando algunos proyectos');
        }
      },
      onCancel: () => { },
    });
  };

  /* Imagen demo */
  const handleImageUpload = async (project) => {
    try {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = 'image/*';
      input.onchange = (e) => {
        const f = e?.target?.files?.[0];
        if (!f) return;
        if (!f.type?.startsWith('image/')) return alert('Archivo de imagen inválido');
        if (f.size > 5 * 1024 * 1024) return alert('Máximo 5MB');
        alert(`Imagen "${f.name}" cargada para "${project?.name}" (demo)`);
      };
      input.click();
    } catch (e) {
      console.error(e);
      alert('Error al seleccionar la imagen.');
    }
  };

  /* ====== ABONOS: helpers COMENTADOS ====== */
  /*
  const getProjectLiveSnapshot = (projectId) => {
    const source = usingLocalShadow ? localDocs : remoteDocs;
    const inSource = source?.find((d) => (d.id || d._id) === projectId);
    if (inSource) return inSource;
    if (Array.isArray(projects)) {
      const inProps = projects.find((d) => (d.id || d._id) === projectId);
      if (inProps) return inProps;
    }
    return undefined;
  };
  const getAbonosForProject = (id) => {
    const snap = getProjectLiveSnapshot(id);
    return Array.isArray(snap?.abonos) ? snap.abonos : [];
  };
  const getTotalsForProject = (project) => {
    const snap = getProjectLiveSnapshot(project.id) || {};
    const presupuestoTotal = Number(
      snap.totalPresupuesto ?? snap.budget ?? snap.presupuesto?.total ?? project.budget ?? 0
    );
    const abonos = getAbonosForProject(project.id);
    const totalAbonado = abonos.reduce((s, a) => s + (Number(a?.monto) || 0), 0);
    const restante = presupuestoTotal - totalAbonado;
    const percent = Math.min(Math.max(presupuestoTotal > 0 ? (totalAbonado / presupuestoTotal) * 100 : 0, 0), 100);
    return { presupuestoTotal, abonosList: abonos, totalAbonado, restante, percent };
  };
  const handleDraftChange = (pid, f, v) =>
    setNewAbonoDraft((prev) => ({ ...prev, [pid]: { ...(prev[pid] || {}), [f]: v } }));
  const handleAddAbono = (project) => {
    const { restante } = getTotalsForProject(project);
    if (restante <= 0) return alert('Este proyecto ya está pagado en su totalidad.');
    const draft = newAbonoDraft[project.id] || {};
    const monto = Number(draft.monto);
    if (!draft.fecha) return alert('Falta la fecha del abono');
    if (!monto || monto <= 0) return alert('Monto inválido');
    if (monto > restante) return alert('El abono excede el restante pendiente.');
    const nuevo = { fecha: draft.fecha, monto, nota: draft.nota?.trim() || '', _tmpId: safeUUID() };
    const snap = getProjectLiveSnapshot(project.id);
    const updated = { ...(snap || {}), id: snap?.id ?? project.id, abonos: [...(snap?.abonos || []), nuevo] };

    if (usingLocalShadow) {
      setLocalDocs((prev) => {
        const exists = prev?.some((p) => (p.id || p._id) === project.id);
        return exists ? prev.map((p) => ((p.id || p._id) === project.id ? updated : p)) : [...(prev || []), updated];
      });
    } else {
      setRemoteDocs((prev) => {
        const exists = prev.some((p) => (p.id || p._id) === project.id);
        return exists ? prev.map((p) => ((p.id || p._id) === project.id ? updated : p)) : [...prev, updated];
      });
    }
    setNewAbonoDraft((prev) => ({ ...prev, [project.id]: { fecha: '', monto: '', nota: '' } }));
  };
  */

  /* ===== Render ===== */
  return (
    <div className="bg-card border border-border rounded-lg overflow-visible">
      {loading && <div className="p-4 border-b border-border text-sm text-muted-foreground">Cargando proyectos…</div>}
      {!!errorMsg && <div className="p-4 border-b border-border text-sm text-red-600">{errorMsg}</div>}

      {selectedProjects?.length > 0 && (
        <div className="bg-primary/5 border-b border-border p-4">
          <div className="flex items-center justify-between">
            <span className="text-sm text-foreground">{selectedProjects?.length} proyecto(s) seleccionado(s)</span>
            <div className="flex items-center space-x-2">
              <Button variant="outline" size="sm" iconName="Trash2" iconPosition="left" onClick={handleBulkDelete}>Eliminar</Button>
            </div>
          </div>
        </div>
      )}

      {/* Desktop */}
      <div className="hidden lg:block overflow-x-auto">
        <table className="w-full">
          <thead className="bg-muted/50">
            <tr>
              <th className="w-12 p-4">
                <input
                  type="checkbox"
                  checked={
                    pageItems.length > 0 &&
                    pageItems.every((p) => selectedProjects.includes(p.id))
                  }
                  onChange={handleSelectAll}
                  className="rounded border-border"
                />
              </th>
              <th className="text-left p-4 font-medium text-foreground">
                <button onClick={() => handleSort('code')} className="flex items-center space-x-1 hover:text-primary">
                  <span>Código</span><Icon name="ArrowUpDown" size={14} />
                </button>
              </th>
              <th className="text-left p-4 font-medium text-foreground">
                <button onClick={() => handleSort('name')} className="flex items-center space-x-1 hover:text-primary">
                  <span>Proyecto</span><Icon name="ArrowUpDown" size={14} />
                </button>
              </th>

              <th className="text-left p-4 font-medium text-foreground">Cliente</th>

              <th className="text-left p-4 font-medium text-foreground">
                <button onClick={() => handleSort('status')} className="flex items-center space-x-1 hover:text-primary">
                  <span>Estado</span><Icon name="ArrowUpDown" size={14} />
                </button>
              </th>
              <th className="text-left p-4 font-medium text-foreground">
                <button onClick={() => handleSort('priority')} className="flex items-center space-x-1 hover:text-primary">
                  <span>Prioridad</span><Icon name="ArrowUpDown" size={14} />
                </button>
              </th>
              <th className="text-left p-4 font-medium text-foreground">
                <button onClick={() => handleSort('budget')} className="flex items-center space-x-1 hover:text-primary">
                  <span>Presupuesto</span><Icon name="ArrowUpDown" size={14} />
                </button>
              </th>
              <th className="text-left p-4 font-medium text-foreground">
                <button onClick={() => handleSort('startDate')} className="flex items-center space-x-1 hover:text-primary">
                  <span>Fecha Inicio</span><Icon name="ArrowUpDown" size={14} />
                </button>
              </th>
              <th className="w-24 p-4 font-medium text-foreground">Acciones</th>
            </tr>
          </thead>

          <tbody>
            {pageItems?.map((project) => {
              // 🔵 Totales de abonos por proyecto (COMENTADO)
              // const { presupuestoTotal, abonosList, totalAbonado, restante, percent } = getTotalsForProject(project);
              // const draft = newAbonoDraft[project.id] || { fecha: '', monto: '', nota: '' };
              // const isPagado = restante <= 0;

              const nameToShow = resolveClientName(project);
              const emailToShow = resolveClientEmailOrContact(project);
              const statusUI = resolveProjectStatus(project);

              return (
                <React.Fragment key={project?.id}>
                  <tr className="border-b border-border hover:bg-muted/30 transition-smooth">
                    <td className="p-4">
                      <input
                        type="checkbox"
                        checked={selectedProjects?.includes(project?.id)}
                        onChange={() => handleSelectProject(project?.id)}
                        className="rounded border-border"
                      />
                    </td>

                    <td className="p-4">
                      <span className="font-mono text-sm text-primary">{project?.code}</span>
                    </td>

                    <td className="p-4">
                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                          <Icon name="Folder" size={20} className="text-primary" />
                        </div>
                        <div className="min-w-0">
                          <div className="font-medium text-foreground">{project?.name}</div>
                          <div className="text-sm text-muted-foreground">{project?.type}</div>
                        </div>
                      </div>
                    </td>

                    {/* Cliente */}
                    <td className="p-4">
                      <div className="min-w-[240px] max-w-[420px]">
                        <div className="font-medium text-foreground truncate" title={nameToShow}>{nameToShow}</div>
                        <div className="text-sm text-muted-foreground truncate" title={emailToShow}>{emailToShow}</div>
                        {!clientsLoaded && (
                          <div className="text-xs text-muted-foreground mt-0.5">cargando clientes…</div>
                        )}
                      </div>
                    </td>

                    {/* Estado: solo pill */}
                    <td className="p-4">
                      <div className="flex items-center gap-2">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColorByKey(statusUI.key)}`}>
                          {statusUI.label}
                        </span>
                      </div>
                    </td>

                    <td className="p-4">
                      <div className="flex items-center space-x-1">
                        <Icon name="AlertCircle" size={16} className={getPriorityColor(project?.priority)} />
                        <span className="text-sm text-foreground">
                          {project?.priorityLabel || project?.priority || '—'}
                        </span>
                      </div>
                    </td>

                    <td className="p-4">
                      <div className="text-foreground font-medium">{formatCurrency(project?.budget)}</div>
                      {Number(project?.equiposUSD) > 0 && (
                        <div className="text-xs text-muted-foreground mt-1">
                          Equipos: <span className="font-medium">{formatUSD(project?.equiposUSD)}</span>
                        </div>
                      )}
                    </td>

                    <td className="p-4">
                      <div className="text-sm text-foreground">{formatDate(project?.startDate)}</div>
                    </td>

                    <td className="p-4">
                      <div className="flex items-center space-x-1">
                        <Button variant="ghost" size="icon" onClick={() => toggleRowExpansion(project?.id)} title="Ver detalles">
                          <Icon name={expandedRows?.includes(project?.id) ? 'ChevronUp' : 'ChevronDown'} size={16} />
                        </Button>
                        
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          onClick={(e) => {
                            e.stopPropagation();
                            const proyectoId = project?.id || project?._id || project?.projectId;
                            if (proyectoId) {
                              console.log('Navegando a galería del proyecto:', proyectoId);
                              navigate(`/project-detail-gallery/${proyectoId}`);
                            } else {
                              console.error('No se encontró ID del proyecto:', project);
                              alert('Error: No se pudo identificar el proyecto');
                            }
                          }} 
                          title="Ver galería de imágenes"
                        >
                          <Icon name="Image" size={16} />
                        </Button>

                        <Button variant="ghost" size="icon" onClick={() => onProjectSelect?.(project)} title="Editar proyecto">
                          <Icon name="Edit" size={16} />
                        </Button>

                        <Button variant="ghost" size="icon" onClick={() => handleDelete(project)} title="Eliminar proyecto">
                          <Icon name="Trash2" size={16} />
                        </Button>
                      </div>
                    </td>
                  </tr>

                  {expandedRows?.includes(project?.id) && (
                    <tr className="bg-muted/20">
                      <td colSpan={9} className="p-4">
                        {/* Detalles + (ANTES ABONOS) */}
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                          <div>
                            <h4 className="font-medium text-foreground mb-2">Detalles del Proyecto</h4>
                            <div className="space-y-2 text-sm">
                              <div className="flex justify-between">
                                <span className="text-muted-foreground">Departamento:</span>
                                <span className="text-foreground">{project?.department || '—'}</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-muted-foreground">Fecha Fin:</span>
                                <span className="text-foreground">{formatDate(project?.endDate)}</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-muted-foreground">Ubicación:</span>
                                <span className="text-foreground">{project?.location || '—'}</span>
                              </div>
                            </div>
                          </div>

                          <div>
                            <h4 className="font-medium text-foreground mb-2">Personal Asignado</h4>
                            <div className="space-y-2">
                              {(project?.assignedPersonnel || [])?.map((person, idx) => (
                                <div key={idx} className="flex items-center space-x-2">
                                  <div className="w-6 h-6 bg-secondary rounded-full flex items-center justify-center">
                                    <Icon name="User" size={12} color="white" />
                                  </div>
                                  <span className="text-sm text-foreground">{person?.name}</span>
                                  {person?.role && <span className="text-xs text-muted-foreground">({person?.role})</span>}
                                </div>
                              ))}
                              {(!project?.assignedPersonnel || project?.assignedPersonnel?.length === 0) && (
                                <div className="text-sm text-muted-foreground">Sin personal asignado</div>
                              )}
                            </div>
                          </div>

                          <div>
                            <h4 className="font-medium text-foreground mb-2">Descripción</h4>
                            <DescriptionWithExpand
                              description={project?.description || '—'}
                              projectId={project?.id}
                              isExpanded={expandedDescriptions.has(project?.id)}
                              onToggle={toggleDescriptionExpansion}
                            />
                          </div>
                          {/*
                          <div>
                            <h4 className="font-medium text-foreground mb-2">Acciones Rápidas</h4>
                            <div className="space-y-2">
                              <Button
                                variant="outline"
                                size="sm"
                                iconName="Image"
                                iconPosition="left"
                                onClick={() => navigate(`/project-gallery-viewer/${project?.id}`)}
                                className="w-full justify-start"
                              >
                                Ver Galería
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                iconName="Calendar"
                                iconPosition="left"
                                className="w-full justify-start"
                                onClick={() => navigate(`/project-timeline/${project?.id}`)}
                              >
                                Ver Cronograma
                              </Button>
                            </div>
                          </div>
                           */}
                        </div>

                        {/*
                        <div className="mt-6 border-t border-border pt-4">
                          <div className="flex items-start justify-between mb-3">
                            <div className="flex items-center gap-2">
                              <Icon name="DollarSign" size={16} className="text-green-600" />
                              <h4 className="font-semibold text-foreground text-sm">Abonos</h4>
                            </div>
                            <span className="text-[11px] text-muted-foreground">Seguimiento de pagos del proyecto</span>
                          </div>

                          {abonosList.length > 0 ? (
                            <div className="mb-3 rounded-md border border-border bg-white/40 dark:bg-muted/20 divide-y divide-border text-[12px]">
                              {abonosList.map((abono, idx) => (
                                <div key={abono._tmpId || idx} className="flex flex-wrap justify-between items-center px-3 py-1.5">
                                  <div className="text-foreground flex items-center gap-1">
                                    <span className="text-muted-foreground">📅</span>
                                    <span>{formatDate(abono.fecha)}</span>
                                  </div>
                                  <div className="font-medium text-green-700">{formatCurrency(abono.monto)}</div>
                                  <div className="text-muted-foreground italic truncate max-w-[200px]">
                                    {abono.nota || 'Sin nota'}
                                  </div>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <p className="text-[12px] text-muted-foreground mb-3">No hay abonos registrados</p>
                          )}

                          <div className="border border-border rounded-md bg-background/50 p-3 mb-3">
                            <div className="flex items-start justify-between mb-2">
                              <span className="text-[12px] font-medium text-foreground">Agregar abono (modo prueba)</span>
                              <button
                                className={`flex items-center gap-1 text-[11px] ${
                                  isPagado ? 'text-muted-foreground cursor-not-allowed' : 'text-primary hover:underline'
                                }`}
                                onClick={() => {
                                  if (!isPagado) handleAddAbono(project);
                                }}
                                disabled={isPagado}
                              >
                                <Icon name="Plus" size={12} />
                                <span>{isPagado ? 'Pagado' : 'Agregar'}</span>
                              </button>
                            </div>

                            <div className="flex flex-wrap gap-2 text:[11px] text-[11px]">
                              <input
                                type="date"
                                value={draft.fecha || ''}
                                onChange={(e) => handleDraftChange(project.id, 'fecha', e.target.value)}
                                className="border border-border rounded px-2 py-1 bg-background text-foreground min-w-[150px]"
                                disabled={isPagado}
                              />
                              <input
                                type="number"
                                min="0"
                                step="0.01"
                                placeholder="0.00"
                                value={draft.monto || ''}
                                onChange={(e) => handleDraftChange(project.id, 'monto', e.target.value)}
                                className="border border-border rounded px-2 py-1 bg-background text-foreground w-[120px]"
                                disabled={isPagado}
                              />
                              <input
                                type="text"
                                placeholder="ej. anticipo"
                                value={draft.nota || ''}
                                onChange={(e) => handleDraftChange(project.id, 'nota', e.target.value)}
                                className="border border-border rounded px-2 py-1 bg-background text-foreground flex-1 min-w-[200px]"
                                disabled={isPagado}
                              />
                            </div>

                            {isPagado && (
                              <div className="text-[11px] text-green-700 font-medium mt-2">
                                Proyecto pagado en su totalidad ✅
                              </div>
                            )}
                          </div>

                          <div className="space-y-2">
                            <div className="flex flex-wrap gap-x-4 text-[12px] mb-2">
                              <span>
                                <span className="text-muted-foreground">Presupuesto total: </span>
                                <span className="font-semibold">{formatCurrency(presupuestoTotal)}</span>
                              </span>
                              <span>
                                <span className="text-muted-foreground">Total abonado: </span>
                                <span className="font-semibold text-green-700">{formatCurrency(totalAbonado)}</span>
                              </span>
                              <span>
                                <span className="text-muted-foreground">Restante: </span>
                                <span className={`font-semibold ${restante < 0 ? 'text-red-600' : 'text-foreground'}`}>
                                  {formatCurrency(restante)}
                                </span>
                              </span>
                            </div>

                            <div className="relative w-full h-3 bg-muted rounded overflow-hidden border border-border">
                              <div
                                className={`h-full transition-all duration-500 ${
                                  percent >= 100 ? 'bg-green-600' : 'bg-green-500'
                                }`}
                                style={{ width: `${percent}%` }}
                              />
                              <span className="absolute inset-0 flex items-center justify-center text-[10px] font-medium text-white">
                                {percent.toFixed(0)}%
                              </span>
                            </div>
                          </div>
                        </div>
                        */}
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              );
            })}

            {pageItems?.length === 0 && !loading && (
              <tr>
                <td colSpan={9} className="p-8 text-center text-muted-foreground">
                  No hay proyectos para mostrar.
                </td>
              </tr>
            )}
          </tbody>
        </table>

        {/* Paginación Desktop */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between border-t border-border px-4 py-3 gap-3">
          <div className="flex items-center gap-3">
            <label className="text-xs text-muted-foreground">Mostrar</label>
            <select
              value={pageSize}
              onChange={handleChangePageSize}
              className="relative z-20 text-sm px-2 py-1 border border-border rounded bg-background text-foreground min-w-[84px] pr-6 pointer-events-auto"
              style={{ appearance: 'auto' }}
            >
              {PAGE_SIZE_OPTIONS.map((opt) => (
                <option key={opt} value={opt}>{opt}</option>
              ))}
            </select>
            <span className="text-xs text-muted-foreground">por página</span>
            <span className="text-xs text-muted-foreground ml-3">
              Mostrando <span className="font-medium">{totalItems === 0 ? 0 : startIndex + 1}</span>–<span className="font-medium">{endIndex}</span> de <span className="font-medium">{totalItems}</span>
            </span>
          </div>
          <div className="flex items-center gap-1">
            <Button variant="outline" size="sm" onClick={() => goToPage(1)} disabled={currentPage === 1} iconName="ChevronsLeft" />
            <Button variant="outline" size="sm" onClick={prevPage} disabled={currentPage === 1} iconName="ChevronLeft" />
            <span className="px-2 text-sm text-foreground">{currentPage} / {totalPages}</span>
            <Button variant="outline" size="sm" onClick={nextPage} disabled={currentPage === totalPages} iconName="ChevronRight" />
            <Button variant="outline" size="sm" onClick={() => goToPage(totalPages)} disabled={currentPage === totalPages} iconName="ChevronsRight" />
          </div>
        </div>
      </div>

      {/* Mobile (resumen) */}
      <div className="lg:hidden">
        {pageItems?.map((p) => {
          const nameToShow = resolveClientName(p);
          const emailToShow = resolveClientEmailOrContact(p);
          const statusUI = resolveProjectStatus(p);
          return (
            <div key={p?.id} className="border-b border-border p-4">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center space-x-3">
                  <input
                    type="checkbox"
                    checked={selectedProjects?.includes(p?.id)}
                    onChange={() => handleSelectProject(p?.id)}
                    className="rounded border-border flex-shrink-0"
                  />
                  <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <Icon name="Folder" size={24} className="text-primary" />
                  </div>
                  <div className="min-w-0">
                    <div className="font-medium text-foreground">{p?.name}</div>
                    <div className="text-sm text-muted-foreground">{p?.code}</div>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 mb-3">
                <div>
                  <div className="text-xs text-muted-foreground">Cliente</div>
                  <div className="text-sm text-foreground">{nameToShow}</div>
                  <div className="text-xs text-muted-foreground">{emailToShow}</div>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColorByKey(statusUI.key)}`}>
                    {statusUI.label}
                  </span>
                </div>
              </div>
            </div>
          );
        })}

        {/* Paginación Mobile */}
        <div className="flex flex-col gap-3 px-4 py-3">
          <div className="flex items-center gap-3">
            <label className="text-xs text-muted-foreground">Mostrar</label>
            <select
              value={pageSize}
              onChange={handleChangePageSize}
              className="relative z-20 text-sm px-2 py-1 border border-border rounded bg-background text-foreground min-w-[84px] pr-6 pointer-events-auto"
              style={{ appearance: 'auto' }}
            >
              {PAGE_SIZE_OPTIONS.map((opt) => (
                <option key={opt} value={opt}>{opt}</option>
              ))}
            </select>
            <span className="text-xs text-muted-foreground">por página</span>
          </div>
          <div className="flex items-center justify-between">
            <div className="text-xs text-muted-foreground">
              {totalItems === 0 ? '0 de 0' : `${startIndex + 1}–${endIndex} de ${totalItems}`}
            </div>
            <div className="flex items-center gap-1">
              <Button variant="outline" size="sm" onClick={() => goToPage(1)} disabled={currentPage === 1} iconName="ChevronsLeft" />
              <Button variant="outline" size="sm" onClick={prevPage} disabled={currentPage === 1} iconName="ChevronLeft" />
              <span className="px-2 text-sm text-foreground">{currentPage}/{totalPages}</span>
              <Button variant="outline" size="sm" onClick={nextPage} disabled={currentPage === totalPages} iconName="ChevronRight" />
              <Button variant="outline" size="sm" onClick={() => goToPage(totalPages)} disabled={currentPage === totalPages} iconName="ChevronsRight" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProjectTable;
