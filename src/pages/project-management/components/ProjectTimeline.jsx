import React, { useCallback, useEffect, useMemo, useState } from 'react';
import proyectoService from '../../../services/proyectoService';
import clientService from 'services/clientService';
import Icon from '../../../components/AppIcon';
import Button from '../../../components/ui/Button';
import CreateProjectModal from './CreateProjectModal';

const fold = (v) =>
  String(v ?? '')
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .trim()
    .toLowerCase();

const KW = {
  planning: (s) =>
    s.includes('planific') ||
    s.includes('planeac') ||
    s.includes('planning') ||
    s.includes('backlog') ||
    s.includes('kickoff') ||
    s.includes('inicio') ||
    s.includes('prepar') ||
    s === 'activo' ||
    s.includes('active') ||
    s.includes('pendiente'),
  progress: (s) =>
    s.includes('progreso') ||
    s.includes('proceso') ||
    s.includes('ejec') ||
    s.includes('en curso') ||
    s.includes('trabaj') ||
    s.includes('running') ||
    s.includes('work in progress') ||
    s.includes('in-progress') ||
    s.includes('in progress'),
  review: (s) =>
    s.includes('revi') ||
    s.includes('review') ||
    s.includes('qa') ||
    s.includes('calidad') ||
    s.includes('validac') ||
    s.includes('verific') ||
    s.includes('aprobac') ||
    s.includes('auditor'),
  exclude: (s) =>
    s.includes('pausa') ||
    s.includes('pausado') ||
    s.includes('on-hold') ||
    s.includes('on hold') ||
    s.includes('cancel') ||
    s.includes('complet') ||
    s.includes('terminado') ||
    s.includes('fin'),
};

const toCanon = (raw) => {
  const s = fold(raw);
  if (!s || KW.exclude(s)) return null;
  if (KW.review(s)) return 'En Revisión';
  if (KW.progress(s)) return 'En Progreso';
  if (KW.planning(s)) return 'Planificación';
  return null;
};

const getCanonFromObject = (obj) => {
  const candidates = [
    obj?.estado,
    obj?.estatus,
    obj?.status,
    obj?.statusLabel,
    obj?.fase,
    obj?.etapa,
    obj?.stage,
    obj?.state,
  ].filter(Boolean);
  for (const c of candidates) {
    const canon = toCanon(c);
    if (canon) return canon;
  }
  return null;
};

// ======== fechas ========
// ⬅️ Aquí el fix: null/undefined/'' devuelven null, no 1970 ni hoy
const safeDate = (v) => {
  if (!v) return null;
  const d = new Date(v);
  return isNaN(d.getTime()) ? null : d;
};

const fmtDateHuman = (v) => {
  const d = safeDate(v);
  return d
    ? d.toLocaleDateString('es-MX', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      })
    : '—';
};

const fmtDateIso = (v) => {
  const d = safeDate(v);
  return d ? d.toISOString().slice(0, 10) : '';
};

// rangos
const startOfWeekMonday = (d) => {
  const out = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const day = out.getDay();
  const diffToMon = (day + 6) % 7;
  out.setDate(out.getDate() - diffToMon);
  out.setHours(0, 0, 0, 0);
  return out;
};
const startOfMonth = (d) => {
  const x = new Date(d.getFullYear(), d.getMonth(), 1);
  x.setHours(0, 0, 0, 0);
  return x;
};
const startOfNextMonth = (d) => new Date(d.getFullYear(), d.getMonth() + 1, 1);
const startOfYear = (y) => {
  const x = new Date(y, 0, 1);
  x.setHours(0, 0, 0, 0);
  return x;
};
const startOfNextYear = (y) => new Date(y + 1, 0, 1);
const startOfQuarter = (d) => {
  const q = Math.floor(d.getMonth() / 3);
  const x = new Date(d.getFullYear(), q * 3, 1);
  x.setHours(0, 0, 0, 0);
  return x;
};
const startOfNextQuarter = (d) => {
  const q = Math.floor(d.getMonth() / 3);
  return new Date(d.getFullYear(), (q + 1) * 3, 1);
};
const inRange = (date, ini, fin) =>
  date && date.getTime() >= ini.getTime() && date.getTime() < fin.getTime();

const getId = (p) => p?.id ?? p?._id ?? p?.Id ?? p?.ID ?? null;
const getCode = (p) => {
  const c = p?.codigo ?? p?.code ?? p?.Codigo ?? p?.Code;
  if (typeof c === 'string' || typeof c === 'number') return String(c);
  return String(c?.id ?? c?.value ?? '');
};
const getName = (p) =>
  p?.nombre ?? p?.name ?? p?.nombreProyecto ?? 'Proyecto sin nombre';

const buildClientsMapFromCatalog = (catalog) => {
  const arr = Array.isArray(catalog) ? catalog : [];
  const map = new Map();
  for (const it of arr) {
    const id =
      it?.id ??
      it?.Id ??
      it?._id ??
      it?.codigo ??
      it?.code ??
      it?.clave ??
      it?.slug ??
      it?.uuid;
    const name =
      it?.nombre ??
      it?.name ??
      it?.razonSocial ??
      it?.razon_social ??
      it?.displayName ??
      it?.clientName ??
      it?.empresa ??
      it?.id;
    const email =
      it?.email ??
      it?.correo ??
      it?.correoElectronico ??
      it?.mail ??
      it?.contacto?.email ??
      null;
    const contact =
      it?.contacto?.nombre ??
      it?.contacto?.name ??
      it?.telefono ??
      it?.phone ??
      null;
    if (id)
      map.set(String(id), {
        name: String(name ?? id),
        email: email ? String(email) : null,
        contact: contact ? String(contact) : null,
      });
  }
  return map;
};

/* Cliente “bonito” (nombre + contacto/email) */
const getClientDetails = (p, clientsMap) => {
  const byName =
    p?.clientName ??
    p?.client_name ??
    p?.clienteNombre ??
    p?.cliente_nombre ??
    p?.cliente?.nombre ??
    p?.cliente?.name ??
    p?.cliente?.empresa ??
    p?.cliente?.razonSocial ??
    p?.cliente?.razon_social ??
    p?.client?.nombre ??
    p?.client?.name ??
    p?.client?.empresa ??
    p?.client?.razonSocial ??
    p?.client?.razon_social;

  const byEmail =
    p?.cliente?.email ??
    p?.cliente?.correo ??
    p?.client?.email ??
    p?.client?.correo ??
    null;

  const byContact =
    p?.cliente?.contacto?.nombre ??
    p?.client?.contacto?.nombre ??
    p?.cliente?.telefono ??
    p?.client?.telefono ??
    null;

  if (byName) {
    return { name: String(byName), aux: byEmail || byContact || null };
  }

  const cli = p?.cliente ?? p?.client;
  let byId =
    typeof cli === 'object'
      ? cli?.id ??
        cli?._id ??
        cli?.codigo ??
        cli?.code ??
        cli?.clave ??
        cli?.slug ??
        cli?.uuid
      : undefined;

  if (byId == null) {
    if (typeof cli === 'string' || typeof cli === 'number') byId = cli;
  }

  byId =
    byId ??
    p?.clienteId ??
    p?.idCliente ??
    p?.clientId ??
    p?.customerId ??
    null;

  if (byId != null && clientsMap?.has?.(String(byId))) {
    const hit = clientsMap.get(String(byId));
    return {
      name: hit?.name || 'Sin cliente',
      aux: hit?.email || hit?.contact || null,
    };
  }

  return { name: 'Sin cliente', aux: null };
};

const getStart = (p) =>
  p?.cronograma?.fechaInicio ?? p?.startDate ?? p?.inicio ?? null;
const getEnd = (p) =>
  p?.cronograma?.fechaFin ?? p?.endDate ?? p?.fin ?? null;
const getProg = (p) => Number(p?.progress ?? p?.avance ?? 0);
const getCanon = (p) => p?.__estadoCanon ?? getCanonFromObject(p);
const getRoleLabel = (role) => {
  if (!role) return 'Sin rol';
  if (typeof role === 'string') return role;
  return role?.name ?? role?.nombre ?? role?.id ?? 'Sin rol';
};
const getBudgetTotal = (p) => {
  const b =
    p?.presupuesto?.total ??
    p?.totalPresupuesto ??
    p?.budgetTotal ??
    (Number(p?.presupuesto?.manoObra || 0) +
      Number(p?.presupuesto?.piezas || 0) +
      Number(p?.presupuesto?.equipos || 0) +
      Number(p?.presupuesto?.materiales || 0) +
      Number(p?.presupuesto?.transporte || 0) +
      Number(p?.presupuesto?.otros || 0));
  return Number(b) || 0;
};

const statusColor = (canon) => {
  switch (canon) {
    case 'Planificación':
      return 'bg-blue-500';
    case 'En Progreso':
      return 'bg-green-500';
    case 'En Revisión':
      return 'bg-purple-500';
    default:
      return 'bg-gray-500';
  }
};
const statusPill = (canon) => {
  switch (canon) {
    case 'Planificación':
      return 'bg-blue-100 text-blue-800';
    case 'En Progreso':
      return 'bg-green-100 text-green-800';
    case 'En Revisión':
      return 'bg-purple-100 text-purple-800';
    default:
      return 'bg-gray-100 text-gray-800';
  }
};

function ProjectTimeline({ projects, onNewProject, clientsCatalog }) {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState(null);

  const [clientsMap, setClientsMap] = useState(null);

  const [period, setPeriod] = useState('month');
  const PERIODS = [
    { key: 'week', label: 'Esta Semana' },
    { key: 'month', label: 'Este Mes' },
    { key: 'q', label: 'Trimestre' },
    { key: 'year', label: 'Año' },
  ];

  const ALLOWED = ['Planificación', 'En Progreso', 'En Revisión'];

  const [showCreate, setShowCreate] = useState(false);

  // ====== Cargar clientes ======
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        if (Array.isArray(clientsCatalog) && clientsCatalog.length > 0) {
          if (mounted)
            setClientsMap(buildClientsMapFromCatalog(clientsCatalog));
          return;
        }
        const res = await clientService.getClients();
        const list = Array.isArray(res?.data)
          ? res.data
          : Array.isArray(res)
          ? res
          : [];
        if (mounted)
          setClientsMap(buildClientsMapFromCatalog(list));
      } catch (e) {
        if (mounted) setClientsMap(null);
      }
    })();
    return () => {
      mounted = false;
    };
  }, [clientsCatalog]);

  /**
   * fetchRows con "forceRemote".
   */
  const fetchRows = useCallback(
    async ({ forceRemote = false } = {}) => {
      if (Array.isArray(projects) && !forceRemote) {
        const withCanon = projects.map((p) => ({
          ...p,
          __estadoCanon: getCanonFromObject(p),
        }));
        // ⬅️ Ajuste: si no hay canon, igual se muestra (no se filtra por completo)
        const filtered = withCanon.filter((p) => {
          const canon = getCanon(p);
          if (!canon) return true;
          return ALLOWED.includes(canon);
        });
        setRows(filtered);
        return;
      }

      setLoading(true);
      setErr(null);
      try {
        const res = await proyectoService.getProyectos();
        const list = Array.isArray(res?.data)
          ? res.data
          : Array.isArray(res)
          ? res
          : [];
        const withCanon = list.map((p) => ({
          ...p,
          __estadoCanon: getCanonFromObject(p),
        }));
        const filtered = withCanon.filter((p) => {
          const canon = getCanon(p);
          if (!canon) return true;
          return ALLOWED.includes(canon);
        });
        setRows(filtered);
      } catch (e) {
        setErr(
          e?.userMessage ||
            e?.message ||
            'Error al obtener proyectos'
        );
        setRows([]);
      } finally {
        setLoading(false);
      }
    },
    [projects]
  );

  useEffect(() => {
    fetchRows();
  }, [fetchRows]);

  const range = useMemo(() => {
    const now = new Date();
    const today = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate()
    );
    if (period === 'week') {
      const ini = startOfWeekMonday(today);
      const fin = new Date(ini);
      fin.setDate(ini.getDate() + 7);
      return { ini, fin };
    }
    if (period === 'month') {
      const ini = startOfMonth(today);
      const fin = startOfNextMonth(today);
      return { ini, fin };
    }
    if (period === 'q') {
      const ini = startOfQuarter(today);
      const fin = startOfNextQuarter(today);
      return { ini, fin };
    }
    if (period === 'year') {
      const ini = startOfYear(today.getFullYear());
      const fin = startOfNextYear(today.getFullYear());
      return { ini, fin };
    }
    return null;
  }, [period]);

  const filteredRows = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (!range) {
      return rows
        .filter((p) => {
          const e = safeDate(getEnd(p));
          if (!e) return true;
          return e.getTime() >= today.getTime();
        })
        .sort((a, b) => {
          const aT = safeDate(getStart(a))?.getTime?.() ?? 0;
          const bT = safeDate(getStart(b))?.getTime?.() ?? 0;
          return aT - bT;
        });
    }

    const { ini, fin } = range;
    return rows
      .filter((p) => {
        const s = safeDate(getStart(p));
        const e = safeDate(getEnd(p));

        if (e && e.getTime() < today.getTime()) return false;

        const startsIn = s && inRange(s, ini, fin);
        const endsIn = e && inRange(e, ini, fin);
        return startsIn || endsIn;
      })
      .sort((a, b) => {
        const aT = safeDate(getStart(a))?.getTime?.() ?? 0;
        const bT = safeDate(getStart(b))?.getTime?.() ?? 0;
        return aT - bT;
      });
  }, [rows, range]);

  const assignedPeople = useMemo(() => {
    const map = new Map();
    for (const p of rows) {
      const people = Array.isArray(p?.assignedPersonnel)
        ? p.assignedPersonnel
        : Array.isArray(p?.personalAsignado)
        ? p.personalAsignado
        : [];
      const clientDet = getClientDetails(p, clientsMap);
      const proj = {
        code: String(getCode(p) || ''),
        name: String(getName(p) || ''),
        clientName: clientDet.name || 'Sin cliente',
        clientAux: clientDet.aux || null,
      };
      const key = `${proj.code}__${proj.name}__${proj.clientName}`;

      for (const raw of people) {
        if (!raw) continue;
        const personName =
          typeof raw === 'string'
            ? raw.trim()
            : String(raw?.name ?? '').trim();
        if (!personName) continue;

        if (!map.has(personName))
          map.set(personName, { projects: new Map() });
        const entry = map.get(personName);
        if (!entry.projects.has(key)) entry.projects.set(key, proj);
      }
    }

    const arr = Array.from(map.entries()).map(([name, info]) => {
      const projects = Array.from(info.projects.values());
      return {
        name,
        count: projects.length,
        projects,
      };
    });

    arr.sort((a, b) => {
      if (b.count !== a.count) return b.count - a.count;
      return a.name.localeCompare('es', {
        sensitivity: 'base',
      });
    });

    return arr;
  }, [rows, clientsMap]);

  const [peoplePage, setPeoplePage] = useState(1);
  const PEOPLE_PAGE_SIZE = 5;

  useEffect(() => {
    setPeoplePage(1);
  }, [assignedPeople.length]);

  const peopleTotalPages = Math.max(
    1,
    Math.ceil(assignedPeople.length / PEOPLE_PAGE_SIZE)
  );
  const peopleSlice = useMemo(() => {
    const start = (peoplePage - 1) * PEOPLE_PAGE_SIZE;
    return assignedPeople.slice(start, start + PEOPLE_PAGE_SIZE);
  }, [assignedPeople, peoplePage]);

  const canPrevPeople = peoplePage > 1;
  const canNextPeople = peoplePage < peopleTotalPages;

  const [personModal, setPersonModal] = useState({
    open: false,
    name: '',
    projects: [],
  });
  const openPersonModal = (personName) => {
    const found = assignedPeople.find((p) => p.name === personName);
    setPersonModal({
      open: true,
      name: personName,
      projects: found?.projects || [],
    });
    if (typeof document !== 'undefined') {
      document.body.style.overflow = 'hidden';
    }
  };
  const closePersonModal = () => {
    setPersonModal({ open: false, name: '', projects: [] });
    if (typeof document !== 'undefined') {
      document.body.style.overflow = '';
    }
  };

  const openCreate = () => setShowCreate(true);
  const closeCreate = () => setShowCreate(false);
  useEffect(() => {
    if (typeof document === 'undefined') return;
    if (showCreate) {
      const prev = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = prev;
      };
    }
  }, [showCreate]);

  const handleNewProjectClick = () => {
    if (typeof onNewProject === 'function') onNewProject();
    openCreate();
  };

  const handleCreated = async (payloadSentOrCreated) => {
    const now = Date.now();
    const created = payloadSentOrCreated || {};
    const optimistic = {
      id: created?.id || created?._id || `tmp_${now}`,
      codigo: created?.codigo || created?.code || '',
      nombre: created?.nombre || created?.name || 'Proyecto sin nombre',
      cliente:
        created?.cliente || {
          id: created?.client || '',
          nombre: created?.clientName || '',
        },
      cronograma: {
        fechaInicio:
          created?.cronograma?.fechaInicio ||
          created?.startDate ||
          '',
        fechaFin:
          created?.cronograma?.fechaFin ||
          created?.endDate ||
          '',
      },
      prioridad: created?.prioridad || created?.priority || '',
      presupuesto:
        created?.presupuesto || {
          manoObra: Number(created?.budgetBreakdown?.labor || 0),
          piezas: Number(created?.budgetBreakdown?.parts || 0),
          equipos: Number(
            created?.budgetBreakdown?.equipment || 0
          ),
          materiales: Number(
            created?.budgetBreakdown?.materials || 0
          ),
          transporte: Number(
            created?.budgetBreakdown?.transportation || 0
          ),
          otros: Number(created?.budgetBreakdown?.other || 0),
        },
      estado: created?.estado || created?.status || 'Planificación',
      __estadoCanon:
        toCanon(created?.estado || created?.status) ||
        'Planificación',
      personalAsignado:
        created?.personalAsignado ||
        created?.assignedPersonnel ||
        [],
    };

    setRows((prev) => [optimistic, ...prev]);
    await fetchRows({ forceRemote: true });
    closeCreate();
  };

  const SEP = ';';
  const q = (v) =>
    `"${String(v ?? '').replace(/"/g, '""')}"`;

  const handleExportReport = () => {
    if (!filteredRows || filteredRows.length === 0) {
      alert(
        'No hay proyectos para exportar en el período seleccionado.'
      );
      return;
    }

    const headers = [
      'Código',
      'Nombre',
      'Cliente',
      'Estado',
      'Inicio',
      'Fin',
      'Prioridad',
      'Presupuesto Total (MXN)',
      'Progreso (%)',
    ];

    const rowsCsv = filteredRows.map((p) => {
      const code = getCode(p);
      const name = getName(p);
      const client = getClientDetails(p, clientsMap).name;
      const canon = getCanon(p) || '';
      const inicio = fmtDateIso(getStart(p));
      const fin = fmtDateIso(getEnd(p));
      const prior = p?.prioridad ?? p?.priority ?? '';
      const budget = Number(getBudgetTotal(p));
      const prog = Math.max(
        0,
        Math.min(100, Number(getProg(p)))
      );

      return [
        q(code),
        q(name),
        q(client),
        q(canon),
        q(inicio),
        q(fin),
        q(prior),
        String(budget),
        String(prog),
      ].join(SEP);
    });

    const titleMap = {
      week: 'semana',
      month: 'mes',
      q: 'trimestre',
      year: 'anio',
    };
    const fileSuffix = titleMap[period] || 'periodo';
    const fileName = `reporte_proyectos_${fileSuffix}_${new Date()
      .toISOString()
      .slice(0, 10)}.csv`;

    const csvContent =
      '\uFEFF' +
      [
        'sep=' + SEP,
        headers.map(q).join(SEP),
        ...rowsCsv,
      ].join('\n');

    const blob = new Blob([csvContent], {
      type: 'text/csv;charset=utf-8',
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* IZQUIERDA: Timeline */}
        <div className="lg:col-span-2">
          <div className="bg-card border border-border rounded-lg p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold text-foreground">
                Cronograma de Proyectos
              </h3>

              <div className="flex items-center space-x-2">
                <div className="flex bg-muted rounded-lg p-1">
                  {PERIODS.map((p) => (
                    <button
                      key={p.key}
                      onClick={() => setPeriod(p.key)}
                      className={`px-3 py-1 text-sm rounded-md transition-smooth ${
                        period === p.key
                          ? 'bg-primary text-primary-foreground'
                          : 'text-muted-foreground hover:text-foreground'
                      }`}
                    >
                      {p.label}
                    </button>
                  ))}
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  iconName="RotateCw"
                  onClick={() => fetchRows({ forceRemote: true })}
                  title="Actualizar"
                />
              </div>
            </div>

            {loading && (
              <div className="text-center py-8">
                <Icon
                  name="Loader2"
                  size={32}
                  className="animate-spin text-muted-foreground mx-auto mb-4"
                />
                <p className="text-muted-foreground">
                  Cargando proyectos...
                </p>
              </div>
            )}
            {!loading && err && (
              <div className="text-center py-8 text-destructive">
                {String(err)}
              </div>
            )}
            {!loading &&
              !err &&
              filteredRows.length === 0 && (
                <div className="text-center py-12">
                  <Icon
                    name="Calendar"
                    size={48}
                    className="text-muted-foreground mx-auto mb-4"
                  />
                  <p className="text-muted-foreground">
                    No hay proyectos vigentes para el período
                    seleccionado.
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    (Los proyectos con fecha de finalización pasada
                    no se muestran aquí)
                  </p>
                </div>
              )}

            {!loading &&
              !err &&
              filteredRows.length > 0 && (
                <div className="space-y-4">
                  {filteredRows.map((p, idx) => {
                    const id = getId(p);
                    const code = String(getCode(p) || '');
                    const name = String(getName(p) || '');
                    const clientDet = getClientDetails(
                      p,
                      clientsMap
                    );
                    const start = getStart(p);
                    const end = getEnd(p);
                    const canon = getCanon(p) || '—';
                    const prog = Math.max(
                      0,
                      Math.min(100, getProg(p))
                    );

                    return (
                      <div
                        key={id ?? code ?? `row_${idx}`}
                        className="relative"
                        data-code={code}
                      >
                        {/* línea vertical */}
                        {idx < filteredRows.length - 1 && (
                          <div className="absolute left-6 top-12 w-0.5 h-16 bg-border" />
                        )}

                        <div className="flex items-start space-x-4">
                          {/* punto */}
                          <div
                            className={`w-3 h-3 rounded-full ${statusColor(
                              canon
                            )} mt-2 flex-shrink-0`}
                          />

                          {/* contenido */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between mb-2">
                              <h4
                                className="font-medium text-foreground truncate"
                                title={name}
                              >
                                {name}
                              </h4>
                              <span
                                className="text-sm text-muted-foreground"
                                title={code}
                              >
                                {code}
                              </span>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm">
                              <div className="break-words">
                                <span className="text-muted-foreground block">
                                  Cliente
                                </span>
                                <div
                                  className="text-foreground font-medium"
                                  title={clientDet.name}
                                >
                                  {clientDet.name || 'Sin cliente'}
                                </div>
                                {clientDet.aux && (
                                  <div
                                    className="text-xs text-muted-foreground truncate"
                                    title={clientDet.aux}
                                  >
                                    {clientDet.aux}
                                  </div>
                                )}
                              </div>
                              <div>
                                <span className="text-muted-foreground">
                                  Inicio:{' '}
                                </span>
                                <span className="text-foreground">
                                  {fmtDateHuman(start)}
                                </span>
                              </div>
                              <div>
                                <span className="text-muted-foreground">
                                  Fin:{' '}
                                </span>
                                <span className="text-foreground">
                                  {fmtDateHuman(end)}
                                </span>
                              </div>
                            </div>

                            <div className="flex items-center justify-between mt-3">
                              <div className="flex items-center space-x-4">
                                <span
                                  className={`px-2 py-1 rounded-full text-xs font-medium ${statusPill(
                                    canon
                                  )}`}
                                >
                                  {canon}
                                </span>
                                <div className="flex items-center space-x-1">
                                  <Icon
                                    name="Users"
                                    size={14}
                                    className="text-muted-foreground"
                                  />
                                  <span className="text-xs text-muted-foreground">
                                    {(
                                      p?.assignedPersonnel ||
                                      p?.personalAsignado ||
                                      []
                                    ).length}{' '}
                                    personas
                                  </span>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
          </div>
        </div>

        {/* DERECHA: Paneles */}
        <div className="space-y-6">
          {/* Personal Asignado */}
          <div className="bg-card border border-border rounded-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-foreground">
                Personal Asignado
              </h3>
              <div className="text-sm text-muted-foreground">
                {assignedPeople.length} persona
                {assignedPeople.length === 1 ? '' : 's'}
              </div>
            </div>

            {assignedPeople.length === 0 && (
              <div className="text-sm text-muted-foreground">
                Sin personal asignado a proyectos vigentes.
              </div>
            )}

            {assignedPeople.length > 0 && (
              <>
                <div className="space-y-3">
                  {peopleSlice.map((p) => (
                    <div
                      key={p.name}
                      className="flex items-center justify-between"
                    >
                      <div className="min-w-0">
                        <div
                          className="font-medium text-foreground truncate"
                          title={p.name}
                        >
                          {p.name}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {p.count} proyecto
                          {p.count > 1 ? 's' : ''}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          className="w-8 h-8 rounded-full border border-border hover:bg-muted flex items-center justify-center"
                          title="Ver proyectos"
                          onClick={() => openPersonModal(p.name)}
                        >
                          <Icon name="Eye" size={16} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="flex items-center justify-between mt-4 pt-4 border-t border-border">
                  <button
                    type="button"
                    className={`px-3 py-1 rounded-md text-sm border border-border ${
                      canPrevPeople
                        ? 'hover:bg-muted'
                        : 'opacity-50 cursor-not-allowed'
                    }`}
                    onClick={() =>
                      canPrevPeople &&
                      setPeoplePage((n) => Math.max(1, n - 1))
                    }
                    disabled={!canPrevPeople}
                  >
                    ← Anterior
                  </button>
                  <div className="text-sm text-muted-foreground">
                    Página{' '}
                    <span className="font-medium text-foreground">
                      {peoplePage}
                    </span>{' '}
                    de{' '}
                    <span className="font-medium text-foreground">
                      {peopleTotalPages}
                    </span>
                  </div>
                  <button
                    type="button"
                    className={`px-3 py-1 rounded-md text-sm border border-border ${
                      canNextPeople
                        ? 'hover:bg-muted'
                        : 'opacity-50 cursor-not-allowed'
                    }`}
                    onClick={() =>
                      canNextPeople &&
                      setPeoplePage((n) =>
                        Math.min(peopleTotalPages, n + 1)
                      )
                    }
                    disabled={!canNextPeople}
                  >
                    Siguiente →
                  </button>
                </div>
              </>
            )}
          </div>

          {/* Acciones Rápidas */}
          <div className="bg-card border border-border rounded-lg p-6">
            <h3 className="text-lg font-semibold text-foreground mb-4">
              Acciones Rápidas
            </h3>
            <div className="space-y-2">
              <Button
                variant="outline"
                size="sm"
                iconName="Plus"
                iconPosition="left"
                className="w-full justify-start"
                onClick={handleNewProjectClick}
              >
                Nuevo Proyecto
              </Button>
              <Button
                variant="outline"
                size="sm"
                iconName="FileText"
                iconPosition="left"
                className="w-full justify-start"
                onClick={handleExportReport}
              >
                Generar Reporte
              </Button>
              {/* <Button
                variant="outline"
                size="sm"
                iconName="Calendar"
                iconPosition="left"
                className="w-full justify-start"
              >
                Programar Reunión
              </Button> */}
            </div>
          </div>
        </div>
      </div>

      <CreateProjectModal
        isOpen={showCreate}
        onClose={closeCreate}
        onSubmit={handleCreated}
      />

      {personModal.open && (
        <div className="fixed inset-0 z-[1050] flex items-center justify-center">
          <div
            className="absolute inset-0 bg-black/50"
            onClick={closePersonModal}
            aria-hidden="true"
          />
          <div className="relative bg-card border border-border rounded-lg w-full max-w-2xl mx-4 max-h-[80vh] overflow-hidden shadow-xl">
            <div className="flex items-center justify-between p-5 border-b border-border">
              <div>
                <h2 className="text-lg font-semibold text-foreground">
                  {personModal.name}
                </h2>
                <p className="text-sm text-muted-foreground">
                  En {personModal.projects.length} proyecto
                  {personModal.projects.length === 1 ? '' : 's'}
                </p>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={closePersonModal}
                title="Cerrar"
              >
                <Icon name="X" size={18} />
              </Button>
            </div>

            <div className="p-5 overflow-auto">
              {personModal.projects.length === 0 ? (
                <div className="text-sm text-muted-foreground">
                  No hay proyectos para mostrar.
                </div>
              ) : (
                <div className="border border-border rounded-lg overflow-hidden">
                  <table className="w-full text-sm">
                    <thead className="bg-muted">
                      <tr className="text-left">
                        <th className="px-4 py-2 text-foreground">
                          Código
                        </th>
                        <th className="px-4 py-2 text-foreground">
                          Proyecto
                        </th>
                        <th className="px-4 py-2 text-foreground">
                          Cliente
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {personModal.projects.map((pr, i) => (
                        <tr
                          key={`${pr.code}__${pr.name}__${i}`}
                          className="border-t border-border align-top"
                        >
                          <td className="px-4 py-2 text-foreground whitespace-nowrap">
                            {pr.code || '—'}
                          </td>
                          <td className="px-4 py-2 text-foreground">
                            {pr.name}
                          </td>
                          <td className="px-4 py-2">
                            <div
                              className="text-foreground font-medium truncate"
                              title={pr.clientName}
                            >
                              {pr.clientName || 'Sin cliente'}
                            </div>
                            {pr.clientAux && (
                              <div
                                className="text-xs text-muted-foreground truncate"
                                title={pr.clientAux}
                              >
                                {pr.clientAux}
                              </div>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            <div className="p-4 border-t border-border flex justify-end">
              <Button variant="outline" onClick={closePersonModal}>
                Cerrar
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export default ProjectTimeline;
