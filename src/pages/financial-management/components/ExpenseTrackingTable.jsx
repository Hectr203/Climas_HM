// modules/finanzas/ExpenseTable.jsx
import React, { useEffect, useMemo, useState } from 'react';
import Icon from '../../../components/AppIcon';
import Button from '../../../components/ui/Button';
import finanzasService from 'services/finanzasService';
import PaymentAuthorizationModal from './PaymentAuthorizationModal';
import useProyect from '../../../hooks/useProyect';
import useFinanzas from '../../../hooks/useFinanzas';

const PAGE_SIZE_OPTIONS = [5, 10, 20, 50];

/* ===================== Utils ===================== */
// Parser tolerante (ISO, timestamp, dd/mm/yyyy [opcional hora])
const parseISODate = (value) => {
  if (!value) return null;
  if (value instanceof Date && !isNaN(value)) return value;

  // numérico/timestamp
  if (typeof value === 'number' || /^\d+$/.test(String(value))) {
    const d = new Date(Number(value));
    return isNaN(d) ? null : d;
  }

  const s = String(value).trim();

  // dd/mm/yyyy o dd/mm/yyyy HH:MM
  const m = s.match(/^(\d{2})\/(\d{2})\/(\d{4})(?:\s+(\d{2}):(\d{2}))?$/);
  if (m) {
    const [, dd, mm, yyyy, HH = '00', MM = '00'] = m;
    const d = new Date(Number(yyyy), Number(mm) - 1, Number(dd), Number(HH), Number(MM), 0, 0);
    return isNaN(d) ? null : d;
  }

  const d = new Date(s);
  return isNaN(d) ? null : d;
};

const formatDate = (date) => {
  const d = date instanceof Date ? date : parseISODate(date);
  if (!d) return '—';
  return d.toLocaleDateString('es-MX', { day: '2-digit', month: '2-digit', year: 'numeric' });
};
const toNumber = (v) => {
  if (v === null || v === undefined || v === '') return null;
  if (typeof v === 'number') return v;
  const cleaned = String(v).replace(/[^0-9.-]/g, '');
  const num = Number(cleaned);
  return Number.isNaN(num) ? null : num;
};
const formatCurrency = (amount) => {
  const n = toNumber(amount);
  if (n === null) return '—';
  return new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(n);
};
const getExpenseStatusColor = (statusValue) => {
  const v = (statusValue || '').toString().toLowerCase().trim();
  const map = {
    pendiente: 'bg-yellow-100 text-yellow-800',
    aprobado: 'bg-green-100 text-green-800',
    autorizado: 'bg-green-100 text-green-800',
    rechazado: 'bg-red-100 text-red-800',
    pagado: 'bg-emerald-100 text-emerald-800',
    programado: 'bg-blue-100 text-blue-800',
    pending: 'bg-yellow-100 text-yellow-800',
    approved: 'bg-green-100 text-green-800',
    authorized: 'bg-green-100 text-green-800',
    rejected: 'bg-red-100 text-red-800',
    paid: 'bg-emerald-100 text-emerald-800',
    scheduled: 'bg-blue-100 text-blue-800',
  };
  return map[v] || 'bg-gray-100 text-gray-800';
};

const normId = (v) => (v == null ? '' : String(v).trim());
const normCode = (v) => (v == null ? '' : String(v).trim().toUpperCase());

// 🔑 Helper para identificar un gasto por su id
const getDocKey = (d) =>
  String(
    d?.id ??
      d?._id ??
      d?.gastoId ??
      d?.gastoID ??
      d?.Id ??
      d?.ID ??
      ''
  );

/* ====== Map de documento → fila (join con proyectos) ====== */
const mapGastoDocWithProjects = (doc, projectById, projectByCode) => {
  const id = doc.id ?? doc._id ?? doc.gastoId ?? `${Math.random()}`;

  let date = doc.fecha ?? doc.date ?? doc.fechaGasto ?? doc.createdAt ?? null;
  if (!doc.date && doc.fecha && doc.hora) {
    const hhmm = String(doc.hora).slice(0, 5);
    date = `${doc.fecha}T${hhmm}`;
  }

  const category = doc.categoria ?? doc.category ?? doc.tipo ?? '—';
  const description = doc.descripcion ?? doc.description ?? doc.concepto ?? '—';
  const amount = doc.monto ?? doc.amount ?? doc.total ?? doc.importe ?? null;
  const status = doc.estado ?? doc.status ?? doc.aprobacion ?? doc.paymentStatus ?? 'Pendiente';

  const proyectoNode = doc.proyecto ?? doc.project ?? {};
  const projectIdRaw =
    doc.idProyecto ??
    doc.proyectoId ??
    doc.projectId ??
    proyectoNode?.id ??
    proyectoNode?._id ??
    proyectoNode?.proyectoId ??
    null;
  const projectCodeRaw =
    doc.codigoProyecto ?? doc.projectCode ?? proyectoNode?.codigo ?? proyectoNode?.code ?? '';
  let projectName =
    doc.proyectoNombre ??
    doc.projectName ??
    proyectoNode?.nombre ??
    proyectoNode?.name ??
    doc.nombreProyecto ??
    '';
  let projectCode = projectCodeRaw || '';

  const pid = normId(projectIdRaw);
  if (!projectName && pid && projectById[pid]) {
    projectName = projectById[pid].nombre || projectName;
    if (!projectCode) projectCode = projectById[pid].codigo || '';
  }
  const pcode = normCode(projectCode);
  if (!projectName && pcode && projectByCode[pcode]) {
    projectName = projectByCode[pcode].nombre || projectName;
    if (!projectCode) projectCode = projectByCode[pcode].codigo || '';
  }

  const requestedBy = doc.solicitadoPor ?? doc.requestedBy ?? doc.solicitante ?? doc.createdByName ?? '';
  const department = doc.presupuestoDepartamento ?? doc.department ?? doc.departamento ?? '';

  return {
    id,
    date,
    category,
    description,
    amount,
    status,
    project: { id: pid || null, name: projectName || '—', code: projectCode || '' },
    requestedBy,
    department,
    raw: doc,
  };
};

/* ======== Rango de fechas helpers ======== */
const startOfToday = () => { const d = new Date(); d.setHours(0,0,0,0); return d; };
const endOfToday = () => { const d = new Date(); d.setHours(23,59,59,999); return d; };
const addDays = (d, n) => { const x = new Date(d); x.setDate(x.getDate()+n); return x; };
const startOfMonth = (d) => new Date(d.getFullYear(), d.getMonth(), 1);
const endOfMonth = (d) => new Date(d.getFullYear(), d.getMonth()+1, 0, 23,59,59,999);
const startOfYear = (d) => new Date(d.getFullYear(), 0, 1);
const endOfYear = (d) => new Date(d.getFullYear(), 11, 31, 23,59,59,999);
const getQuarterRange = (d) => {
  const q = Math.floor(d.getMonth()/3);
  const start = new Date(d.getFullYear(), q*3, 1);
  const end = new Date(d.getFullYear(), q*3 + 3, 0, 23,59,59,999);
  return { start, end };
};

/* ======================================================
   Tabla anclada a filtros externos (pasados por props)
====================================================== */
const ExpenseTable = ({ filters: externalFilters }) => {
  const [remoteRows, setRemoteRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [sortConfig, setSortConfig] = useState({ key: 'date', direction: 'desc' });
  const [selectedIds, setSelectedIds] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(PAGE_SIZE_OPTIONS[0]);

  const [showAuthModal, setShowAuthModal] = useState(false);
  const [selectedExpense, setSelectedExpense] = useState(null);

  const { getProyectos, proyectos } = useProyect();
  const { deleteGasto } = useFinanzas();

  useEffect(() => { getProyectos().catch(() => {}); }, [getProyectos]);

  // Carga inicial de gastos
  useEffect(() => {
    let alive = true;
    (async () => {
      setLoading(true);
      setErrorMsg('');
      try {
        const res = await finanzasService.getGastos();
        const list = Array.isArray(res)
          ? res
          : Array.isArray(res?.data)
          ? res.data
          : Array.isArray(res?.data?.items)
          ? res.data.items
          : [];
        if (!alive) return;
        setRemoteRows(list);
      } catch (err) {
        console.error('Error getGastos:', err);
        if (alive) setErrorMsg('No se pudieron cargar los gastos.');
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, []);

  // 👂 Escuchar gastos nuevos creados desde el modal (sin refrescar la página)
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const handler = (ev) => {
      let doc = ev?.detail;
      if (!doc) return;

      // Por si el modal manda { data: gasto }
      if (doc.data && typeof doc.data === 'object' && !Array.isArray(doc.data)) {
        doc = doc.data;
      }

      setRemoteRows((prev) => {
        const keyNew = getDocKey(doc);
        // si no hay id, lo metemos igual al inicio
        if (!keyNew) return [doc, ...prev];

        const exists = prev.some((d) => getDocKey(d) === keyNew);
        if (exists) return prev;

        return [doc, ...prev];
      });
    };

    window.addEventListener('gasto:created', handler);
    return () => window.removeEventListener('gasto:created', handler);
  }, []);

  const { projectById, projectByCode } = useMemo(() => {
    const byId = {};
    const byCode = {};
    (proyectos || []).forEach((p) => {
      const id = normId(p.id ?? p._id ?? p.proyectoId ?? p.codigo ?? p.code);
      const nombre = p.nombreProyecto ?? p.nombre ?? p.name ?? p.titulo ?? p.descripcion ?? '';
      const codigo = p.codigo ?? p.code ?? p.clave ?? p.projectCode ?? '';
      if (id) byId[id] = { nombre, codigo };
      const ncode = normCode(codigo);
      if (ncode) byCode[ncode] = { nombre, codigo };
    });
    return { projectById: byId, projectByCode: byCode };
  }, [proyectos]);

  const rows = useMemo(
    () =>
      Array.isArray(remoteRows)
        ? remoteRows.map((d) => mapGastoDocWithProjects(d, projectById, projectByCode))
        : [],
    [remoteRows, projectById, projectByCode]
  );

  /* ===== Filtros externos ===== */
  const defaultFilters = {
    dateRange: 'all',
    startDate: '', endDate: '',
    category: '', department: '', status: '',
    project: '', amountMin: '', amountMax: '', searchTerm: ''
  };
  const f = externalFilters ?? defaultFilters;

  const applyFilters = (list) => {
    if (!Array.isArray(list)) return [];

    const term = (f.searchTerm || '').toLowerCase().trim();
    const cat  = (f.category || '').toLowerCase();
    const dep  = (f.department || '').toLowerCase();
    const sta  = (f.status || '').toLowerCase();
    const proj = (f.project || '').toLowerCase();
    const min  = f.amountMin !== '' ? Number(f.amountMin) : null;
    const max  = f.amountMax !== '' ? Number(f.amountMax) : null;

    let rangeStart = null, rangeEnd = null;
    const now = new Date();
    switch (f.dateRange) {
      case 'all':
        rangeStart = null; rangeEnd = null; break;
      case 'today':
        rangeStart = startOfToday(); rangeEnd = endOfToday(); break;
      case 'thisWeek': {
        const today = startOfToday(); const dow = today.getDay();
        rangeStart = addDays(today, -(dow || 7) + 1); rangeStart.setHours(0,0,0,0);
        rangeEnd = addDays(rangeStart, 6); rangeEnd.setHours(23,59,59,999); break;
      }
      case 'thisMonth':
        rangeStart = startOfMonth(now); rangeEnd = endOfMonth(now); break;
      case 'lastMonth': {
        const prev = new Date(now.getFullYear(), now.getMonth()-1, 1);
        rangeStart = startOfMonth(prev); rangeEnd = endOfMonth(prev); break;
      }
      case 'thisQuarter': {
        const { start, end } = getQuarterRange(now);
        rangeStart = start; rangeEnd = end; break;
      }
      case 'thisYear':
        rangeStart = startOfYear(now); rangeEnd = endOfYear(now); break;
      case 'custom':
        rangeStart = f.startDate ? new Date(f.startDate) : null;
        rangeEnd   = f.endDate   ? new Date(`${f.endDate}T23:59:59.999`) : null;
        break;
      default:
        rangeStart = null; rangeEnd = null; break;
    }

    return list.filter((r) => {
      if (f.dateRange !== 'all' && (rangeStart || rangeEnd)) {
        const d = parseISODate(r.date);
        if (!d) return false;
        if (rangeStart && d < rangeStart) return false;
        if (rangeEnd   && d > rangeEnd) return false;
      }

      if (cat && (r.category || '').toLowerCase() !== cat) return false;

      if (dep) {
        const rowDep = (r.department || '').toLowerCase();
        if (rowDep !== dep) return false;
      }

      if (sta) {
        const rowSta = (r.status || r.estado || '').toLowerCase();
        const aliases = {
          pendiente: ['pendiente','pending'],
          aprobado:  ['aprobado','approved'],
          autorizado:['autorizado','authorized'],
          rechazado: ['rechazado','rejected'],
          pagado:    ['pagado','paid'],
          programado:['programado','scheduled'],
        };
        const wanted = aliases[sta] || [sta];
        if (!wanted.includes(rowSta)) return false;
      }

      if (proj) {
        const pname = (r.project?.name || '').toLowerCase();
        const pcode = (r.project?.code || '').toLowerCase();
        if (!pname.includes(proj) && !pcode.includes(proj)) return false;
      }

      const amt = toNumber(r.amount);
      if (min !== null && (amt === null || amt < min)) return false;
      if (max !== null && (amt === null || amt > max)) return false;

      if (term) {
        const hit =
          (r.description || '').toLowerCase().includes(term) ||
          (r.category || '').toLowerCase().includes(term) ||
          (r.requestedBy || '').toLowerCase().includes(term) ||
          (r.project?.name || '').toLowerCase().includes(term) ||
          (r.project?.code || '').toLowerCase().includes(term);
        if (!hit) return false;
      }

      return true;
    });
  };

  const filteredRows = useMemo(() => applyFilters(rows), [rows, externalFilters]);

  /* ================= Ordenamiento ================= */
  const handleSort = (key) => {
    setSortConfig((prev) => ({
      key,
      direction: prev?.key === key && prev?.direction === 'asc' ? 'desc' : 'asc',
    }));
    setCurrentPage(1);
  };

  const sortedRows = useMemo(() => {
    const list = [...filteredRows];
    const { key, direction } = sortConfig || {};
    if (!key) return list;
    return list.sort((a, b) => {
      if (key === 'date') {
        const aTime = parseISODate(a.date)?.getTime() ?? -Infinity;
        const bTime = parseISODate(b.date)?.getTime() ?? -Infinity;
        return direction === 'asc' ? aTime - bTime : bTime - aTime;
      }
      if (key === 'amount') {
        const an = toNumber(a.amount) ?? -Infinity;
        const bn = toNumber(b.amount) ?? -Infinity;
        return direction === 'asc' ? an - bn : bn - an;
      }
      return 0;
    });
  }, [filteredRows, sortConfig]);

  // Paginación
  const totalItems = sortedRows.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const startIndex = (currentPage - 1) * pageSize;
  const endIndex = Math.min(startIndex + pageSize, totalItems);
  const paginatedRows = sortedRows.slice(startIndex, endIndex);

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

  /* ================= Selección ================= */
  const toggleOne = (id) => {
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };
  const toggleAll = () => {
    const pageIds = paginatedRows.map((r) => r.id);
    const allSelected = pageIds.every((id) => selectedIds.includes(id));
    if (allSelected) {
      setSelectedIds((prev) => prev.filter((id) => !pageIds.includes(id)));
    } else {
      setSelectedIds((prev) => Array.from(new Set([...prev, ...pageIds])));
    }
  };

  /* ======= Ver / Autorizar / Eliminar ======= */
  const handleOpenView = (row) => {
    setSelectedExpense({
      id: row.id,
      description: row.description || '—',
      amount: formatCurrency(row.amount),
      category: row.category || '—',
      project: row.project?.name || row.project?.code || '—',
      date: formatDate(row.date),
      requestedBy: row.requestedBy || '—',
    });
    setShowAuthModal(true);
  };

  // 🔴 AQUÍ EL CAMBIO IMPORTANTE PARA QUE SE ACTUALICE A "AUTORIZADO"
  const handleAuthorizePayment = async ({
    id,
    authorizationLevel,
    approverComments,
    paymentMethod,
    scheduledDate,
    priority,
    requiresAdditionalApproval,
    // ... lo que más te mande el modal, lo ignoramos si no se usa
  }) => {
    if (!id) return;
    const expenseId = id;

    const payload = {
      estado: 'Autorizado',
      status: 'authorized',
      paymentStatus: 'authorized',
      autorizacion: {
        nivel: authorizationLevel,
        comentariosAprobador: approverComments,
        metodoPago: paymentMethod,
        fechaProgramada: scheduledDate,
        prioridad: priority,
        requiereAprobacionAdicional: !!requiresAdditionalApproval,
        fechaAutorizacion: new Date().toISOString(),
      },
    };

    // Optimistic update: cambiar estado en la tabla al instante
    setRemoteRows((prev) =>
      prev.map((d) => {
        const _id = d.id ?? d._id ?? d.gastoId;
        if (String(_id) !== String(expenseId)) return d;
        return {
          ...d,
          ...payload,
          autorizacion: { ...(d.autorizacion || {}), ...payload.autorizacion },
        };
      })
    );

    try {
      await finanzasService.updateGasto(expenseId, payload);
    } catch (e) {
      console.error(e);
      // si quieres, puedes revertir el cambio acá guardando un snapshot antes
    }
  };

  const handleDeleteExpense = async (expenseId) => {
    const snapshot = remoteRows;
    setRemoteRows((p) => p.filter((d) => String(d.id ?? d._id ?? d.gastoId) !== String(expenseId)));
    try { await deleteGasto(expenseId); } catch (e) { console.error(e); setRemoteRows(snapshot); }
  };

  return (
    <div className="bg-card border border-border rounded-lg overflow-hidden">
      {loading && remoteRows.length === 0 && (
        <div className="p-4 text-sm text-muted-foreground">Cargando gastos…</div>
      )}
      {!!errorMsg && <div className="p-4 text-sm text-red-600">{errorMsg}</div>}

      {/* Desktop */}
      <div className="hidden lg:block overflow-x-auto">
        <table className="w-full">
          <thead className="bg-muted/50">
            <tr>
              <th className="w-12 p-4">
                <input
                  type="checkbox"
                  checked={paginatedRows.length > 0 && paginatedRows.every((r) => selectedIds.includes(r.id))}
                  onChange={toggleAll}
                  className="rounded border-border"
                />
              </th>
              <th className="text-left p-4 font-medium text-foreground">
                <button onClick={() => handleSort('date')} className="flex items-center gap-1 hover:text-primary">
                  <span>Fecha</span><Icon name="ArrowUpDown" size={14} />
                </button>
              </th>
              <th className="text-left p-4 font-medium text-foreground">Categoría</th>
              <th className="text-left p-4 font-medium text-foreground">Descripción</th>
              <th className="text-left p-4 font-medium text-foreground">
                <button onClick={() => handleSort('amount')} className="flex items-center gap-1 hover:text-primary">
                  <span>Monto</span><Icon name="ArrowUpDown" size={14} />
                </button>
              </th>
              <th className="text-left p-4 font-medium text-foreground">Estado</th>
              <th className="text-left p-4 font-medium text-foreground">Proyecto</th>
              <th className="w-20 p-4 font-medium text-foreground">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {paginatedRows.map((r) => (
              <tr key={r.id} className="border-b border-border hover:bg-muted/30 transition-smooth">
                <td className="p-4">
                  <input
                    type="checkbox"
                    checked={selectedIds.includes(r.id)}
                    onChange={() => toggleOne(r.id)}
                    className="rounded border-border"
                  />
                </td>
                <td className="p-4"><div className="text-sm text-foreground">{formatDate(r.date)}</div></td>
                <td className="p-4"><div className="text-sm text-foreground">{r.category || '—'}</div></td>
                <td className="p-4"><div className="text-sm text-foreground">{r.description || '—'}</div></td>
                <td className="p-4"><div className="text-foreground font-medium">{formatCurrency(r.amount)}</div></td>
                <td className="p-4">
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${getExpenseStatusColor(r.status || r.estado)}`}>
                    {r.status?.toString().toLowerCase() === 'authorized' || r.estado?.toString().toLowerCase() === 'autorizado'
                      ? 'Autorizado'
                      : r.status || r.estado || '—'}
                  </span>
                </td>
                <td className="p-4">
                  <div className="text-sm">
                    <div className="text-foreground">{r.project?.name || r.project?.code || '—'}</div>
                    {!!r.project?.code && <div className="text-muted-foreground text-xs">{r.project.code}</div>}
                  </div>
                </td>
                <td className="p-4">
                  <div className="flex items-center gap-1">
                    <Button variant="ghost" size="icon" title="Ver" onClick={() => handleOpenView(r)}>
                      <Icon name="Eye" size={16} />
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
            {paginatedRows.length === 0 && !loading && (
              <tr><td colSpan={8} className="p-8 text-center text-muted-foreground">No hay gastos para mostrar.</td></tr>
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
              className="text-sm px-2 py-1 border border-border rounded bg-background text-foreground"
            >
              {PAGE_SIZE_OPTIONS.map((opt) => (
                <option key={opt} value={opt}>{opt}</option>
              ))}
            </select>
            <span className="text-xs text-muted-foreground">por página</span>
            <span className="text-xs text-muted-foreground ml-3">
              Mostrando <span className="font-medium">{totalItems === 0 ? 0 : startIndex + 1}</span>-<span className="font-medium">{endIndex}</span> de <span className="font-medium">{totalItems}</span>
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

      {/* Móvil */}
      <div className="lg:hidden">
        {paginatedRows.map((r) => (
          <div key={r.id} className="border-b border-border p-4">
            <div className="flex items-start justify-between mb-2">
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={selectedIds.includes(r.id)}
                  onChange={() => toggleOne(r.id)}
                  className="rounded border-border"
                />
                <div>
                  <div className="text-sm text-foreground font-medium">{r.project?.name || r.project?.code || '—'}</div>
                  {!!r.project?.code && <div className="text-xs text-muted-foreground">{r.project.code}</div>}
                </div>
              </div>
              <span className={`px-2 py-1 rounded-full text-xs font-medium ${getExpenseStatusColor(r.status || r.estado)}`}>
                {r.status?.toString().toLowerCase() === 'authorized' || r.estado?.toString().toLowerCase() === 'autorizado'
                  ? 'Autorizado'
                  : r.status || r.estado || '—'}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-3 mb-2">
              <div><div className="text-xs text-muted-foreground">Fecha</div><div className="text-sm text-foreground">{formatDate(r.date)}</div></div>
              <div><div className="text-xs text-muted-foreground">Monto</div><div className="text-sm text-foreground font-medium">{formatCurrency(r.amount)}</div></div>
              <div><div className="text-xs text-muted-foreground">Categoría</div><div className="text-sm text-foreground">{r.category || '—'}</div></div>
              <div><div className="text-xs text-muted-foreground">Proyecto</div><div className="text-sm text-foreground">{r.project?.name || r.project?.code || '—'}</div></div>
            </div>

            <div className="mt-3 flex items-center gap-1">
              <Button variant="ghost" size="icon" title="Ver" onClick={() => handleOpenView(r)}>
                <Icon name="Eye" size={16} />
              </Button>
            </div>
          </div>
        ))}

        {/* Paginación Mobile */}
        <div className="flex flex-col gap-3 p-4 border-t border-border">
          <div className="flex items-center gap-3">
            <label className="text-xs text-muted-foreground">Mostrar</label>
            <select
              value={pageSize}
              onChange={handleChangePageSize}
              className="text-sm px-2 py-1 border border-border rounded bg-background text-foreground"
            >
              {PAGE_SIZE_OPTIONS.map((opt) => (
                <option key={opt} value={opt}>{opt}</option>
              ))}
            </select>
            <span className="text-xs text-muted-foreground">por página</span>
          </div>
          <div className="flex items-center justify-between">
            <div className="text-xs text-muted-foreground">
              {totalItems === 0 ? '0 de 0' : `${startIndex + 1}-${endIndex} de ${totalItems}`}
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

      {/* Modal */}
      <PaymentAuthorizationModal
        isOpen={showAuthModal}
        onClose={() => setShowAuthModal(false)}
        expense={selectedExpense}
        onAuthorize={handleAuthorizePayment}
        onDelete={handleDeleteExpense}
      />
    </div>
  );
};

export default ExpenseTable;
