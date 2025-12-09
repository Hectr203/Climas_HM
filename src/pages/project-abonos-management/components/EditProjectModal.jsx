import React, { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import Button from '../../../components/ui/Button';
import Icon from '../../../components/AppIcon';
import Input from '../../../components/ui/Input';
import Select from '../../../components/ui/Select';
import proyectoService from 'services/proyectoService';
import clientService from 'services/clientService';
import usePerson from 'hooks/usePerson';

/* ===================== ESTADOS ===================== */
const estadoOptionsBackend = [
  { value: 'planificación', label: 'Planificación' },
  { value: 'en proceso', label: 'En Progreso' },
  { value: 'en pausa', label: 'En Pausa' },
  { value: 'en revisión', label: 'En Revisión' },
  { value: 'completado', label: 'Completado' },
  { value: 'cancelado', label: 'Cancelado' },
];
const ALLOWED_ESTADOS = estadoOptionsBackend.map(o => o.value);

/* Mapeos de estado (API solo “activo” | “en proceso”) */
// const backendToUiDefault = (apiEstado) => {
//   const v = String(apiEstado || '').toLowerCase();
//   if (v === 'en proceso') return 'en proceso';
//   if (v === 'activo') return 'planificación';
//   return 'planificación';
// };
// const mapUiToBackend = (uiEstado) => {
//   const v = String(uiEstado || '').toLowerCase();
//   return v === 'en proceso' ? 'en proceso' : 'activo';
// };

/* Cache local del estado UI por proyecto (no toca API) */
const UI_ESTADO_KEY = 'proyectos_ui_estado_v1';
const uiEstadoCache = {
  _read() { try { return JSON.parse(localStorage.getItem(UI_ESTADO_KEY)) || {}; } catch { return {}; } },
  get(id) { if (!id) return null; const m = this._read(); return m[id] || null; },
  set(id, estado) {
    if (!id) return;
    const m = this._read();
    if (estado) m[id] = estado; else delete m[id];
    localStorage.setItem(UI_ESTADO_KEY, JSON.stringify(m));
  }
};

/* ===================== CATÁLOGOS ===================== */
const departmentOptions = [
  { value: 'Ingeniería', label: 'Ingeniería' },
  { value: 'Mantenimiento', label: 'Mantenimiento' },
  { value: 'Operaciones', label: 'Operaciones' },
];
const priorityOptions = [
  { value: 'Baja', label: 'Baja' },
  { value: 'Media', label: 'Media' },
  { value: 'Alta', label: 'Alta' },
  { value: 'Urgente', label: 'Urgente' },
];

/* ===== Helpers ===== */
const toNumberOrUndef = (v) => {
  if (v === '' || v == null) return undefined;
  const n = typeof v === 'number' ? v : parseFloat(String(v).replace(/[^\d.-]/g, ''));
  return Number.isFinite(n) ? n : undefined;
};
const formatWithCommas = (v, decimals = 2) => {
  const n = toNumberOrUndef(v);
  if (n == null) return '';
  const opts = Number.isInteger(n)
    ? { minimumFractionDigits: 0, maximumFractionDigits: 0 }
    : { minimumFractionDigits: decimals, maximumFractionDigits: decimals };
  return n.toLocaleString('es-MX', opts);
};
const asStr = (v, fallback = '') => (v == null ? fallback : String(v));
const asArr = (v) => (Array.isArray(v) ? v : v == null ? [] : [String(v)]);
const rateSafe = (rate) => (Number.isFinite(Number(rate)) ? Number(rate) : 0);

/* ===================== COMPONENTE ===================== */
const EditProjectModal = ({ isOpen = false, onClose, onSubmit, project }) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState({});
  const [serverProject, setServerProject] = useState(null);

  // Personas / Clientes
  const { persons, getPersons } = usePerson();
  const [clientOptions, setClientOptions] = useState([]);

  // USD controls
  const [isEquipmentInUSD, setIsEquipmentInUSD] = useState(false);
  const [exchangeRate, setExchangeRate] = useState(18);     // MXN por USD
  const [uiEquipmentUSD, setUiEquipmentUSD] = useState(''); // solo DISPLAY (read-only)
  const [loadingFx, setLoadingFx] = useState(false);
  const [fxError, setFxError] = useState(null);

  /* ============= CARGAS ============= */
  useEffect(() => {
    if (!isOpen) return;
    let mounted = true;
    (async () => {
      try {
        const resp = await clientService.getClients();
        const list = Array.isArray(resp?.data) ? resp.data : (Array.isArray(resp) ? resp : []);
        const opts = list.map((c) => ({
          value: c.id,
          label: c.empresa || c.nombre || c.contacto || '—',
        }));
        if (mounted) setClientOptions(opts);
      } catch (e) {
        console.error('Error cargando clientes:', e);
      }
    })();
    return () => { mounted = false; };
  }, [isOpen]);

  const fetchedPersonsRef = useRef(false);
  useEffect(() => {
    if (!isOpen) return;
    if (fetchedPersonsRef.current) return;
    fetchedPersonsRef.current = true;
    (async () => {
      try { await getPersons(); } catch (e) { console.error('Error cargando empleados:', e); }
    })();
    return () => { fetchedPersonsRef.current = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  // Traer el proyecto completo al abrir
  useEffect(() => {
    if (!isOpen || !project?.id) return;
    let mounted = true;
    (async () => {
      try {
        const resp = await proyectoService.getProyectoById(project.id);
        const doc = resp?.data ?? resp;
        if (mounted) setServerProject(doc || project);
      } catch (e) {
        console.error('Error cargando proyecto:', e);
        if (mounted) setServerProject(project || null);
      }
    })();
    return () => { mounted = false; };
  }, [isOpen, project?.id]);

  // Normalización (estado desde cache → si no, derivado desde API)
  const normalized = useMemo(() => {
    const doc = serverProject || project || {};
    const p = doc.presupuesto || {};
    const cron = doc.cronograma || {};
    const id = doc.id || project?.id;
    const estadoUi = uiEstadoCache.get(id) || doc.estado;

    return {
      id,
      codigo: doc.codigo || '',
      tipoProyecto: doc.tipoProyecto || '',
      clienteId: doc?.cliente?.id ?? '',
      clienteNombre: doc?.cliente?.nombre || doc?.cliente?.empresa || '',
      nombre: doc.nombre || doc.nombreProyecto || '',
      departamento: doc.departamento || '',
      prioridad: doc.prioridad || '',
      ubicacion: doc.ubicacion || '',
      descripcion: doc.descripcion || '',
      estado: estadoUi,
      cronograma: {
        fechaInicio: cron?.fechaInicio || '',
        fechaFin: cron?.fechaFin || '',
      },
      personalAsignado: Array.isArray(doc?.personalAsignado) ? doc.personalAsignado : [],
      presupuesto: {
        manoObra: toNumberOrUndef(p.manoObra),
        piezas: toNumberOrUndef(p.piezas),
        equipos: toNumberOrUndef(p.equipos),
        equipoDolares: toNumberOrUndef(p.equipoDolares),
        materiales: toNumberOrUndef(p.materiales),
        transporte: toNumberOrUndef(p.transporte),
        otros: toNumberOrUndef(p.otros),
        _metaEquipos: { capturadoEn: p?._metaEquipos?.capturadoEn || 'MXN' },
      },
    };
  }, [serverProject, project]);

  const [formData, setFormData] = useState(normalized);
  useEffect(() => { if (isOpen) setFormData(normalized); }, [normalized, isOpen]);

  // === Traer tasa de cambio: estable y reutilizable ===
  const fetchUsdMxnRate = useCallback(async () => {
    try {
      setFxError(null);
      setLoadingFx(true);
      const map = await proyectoService.getCurrencyRatesMap({ base: 'USD', currencies: ['MXN'] });
      const rate = Number(map?.MXN || 0);
      if (rate > 0) {
        setExchangeRate(rate);
        return rate;
      } else {
        setFxError('No llegó una tasa válida.');
        return null;
      }
    } catch (e) {
      setFxError(e?.message || 'Error llamando currencyapi');
      console.error('currencyapi error:', e);
      return null;
    } finally {
      setLoadingFx(false);
    }
  }, []);

  // Precargar tipo de cambio al abrir
  useEffect(() => {
    if (!isOpen) return;
    fetchUsdMxnRate();
  }, [isOpen, fetchUsdMxnRate]);

  // Inicializar UI USD según _metaEquipos
  useEffect(() => {
    if (!isOpen) return;
    const cap = formData?.presupuesto?._metaEquipos?.capturadoEn;
    if (cap === 'USD') {
      setIsEquipmentInUSD(true);
    } else {
      setIsEquipmentInUSD(false);
      setUiEquipmentUSD('');
    }
  }, [isOpen, formData?.presupuesto?._metaEquipos?.capturadoEn]);

  // Cuando estamos en USD: calcular SIEMPRE USD mostrado = MXN / rate (read-only)
  useEffect(() => {
    if (!isEquipmentInUSD) return;
    const mxn = toNumberOrUndef(formData?.presupuesto?.equipos) ?? 0;
    const rate = rateSafe(exchangeRate);
    const usd = rate ? mxn / rate : 0;
    setUiEquipmentUSD(usd ? formatWithCommas(usd, 2) : '0.00');
  }, [isEquipmentInUSD, exchangeRate, formData?.presupuesto?.equipos]);

  // Opciones de Personal
  const personnelOptions = useMemo(() => {
    const fromPersons = Array.isArray(persons) ? persons.map((p) => {
      const nombre =
        p?.nombreCompleto ||
        [p?.nombre, p?.apellidoPaterno, p?.apellidoMaterno].filter(Boolean).join(' ') ||
        p?.nombre || p?.name || '—';
      const puesto = p?.puesto || p?.rol || p?.cargo;
      const etiqueta = puesto ? `${nombre} — ${puesto}` : nombre;
      return { value: etiqueta, label: etiqueta };
    }) : [];
    const existing = Array.isArray(formData?.personalAsignado)
      ? formData.personalAsignado.map((s) => ({ value: s, label: s })) : [];
    const seen = new Set();
    return [...existing, ...fromPersons].filter(o => (seen.has(o.value) ? false : (seen.add(o.value), true)));
  }, [persons, formData?.personalAsignado]);

  // ✅ Total MXN (única declaración)
  const totalMXN = useMemo(() => {
    const b = formData?.presupuesto || {};
    const sum = (...vals) => vals.reduce((acc, v) => acc + (toNumberOrUndef(v) ?? 0), 0);
    return sum(b.manoObra, b.piezas, b.equipos, b.materiales, b.transporte, b.otros);
  }, [formData]);

  // IVA editable y totales con/sin IVA
  const [porcentajeIva, setPorcentajeIva] = useState(16);
  const totalSinIva = useMemo(() => Number(totalMXN || 0), [totalMXN]);
  const totalConIva = useMemo(() => {
    const rate = Number(porcentajeIva);
    const multiplicador = 1 + (isNaN(rate) ? 0 : rate / 100);
    const v = Number(totalSinIva) * multiplicador;
    return Math.round(v * 100) / 100;
  }, [totalSinIva, porcentajeIva]);

  // Handlers
  const handle = (k, v) => {
    setFormData((s) => ({ ...s, [k]: v }));
    if (errors[k]) setErrors((e) => ({ ...e, [k]: undefined }));
  };
  const handleP = (k, raw) => {
    const n = raw === '' || raw == null ? undefined : toNumberOrUndef(raw);
    setFormData((s) => ({ ...s, presupuesto: { ...s.presupuesto, [k]: n } }));
  };

  // Toggle USD: calc display y bloquear edición
  const toggleUSD = async (checked) => {
    setIsEquipmentInUSD(checked);
    setFormData((s) => ({
      ...s,
      presupuesto: { ...s.presupuesto, _metaEquipos: { capturadoEn: checked ? 'USD' : 'MXN' } },
    }));
    if (checked) {
      const rate = (await fetchUsdMxnRate()) ?? exchangeRate;
      const mxn = toNumberOrUndef(formData?.presupuesto?.equipos) ?? 0;
      const usd = rate ? mxn / rate : 0;
      setUiEquipmentUSD(usd ? formatWithCommas(usd, 2) : '0.00');
    } else {
      setUiEquipmentUSD('');
    }
  };

  const validate = () => {
    const e = {};
    if (!formData.nombre) e.nombre = 'Requerido';
    if (!formData.departamento) e.departamento = 'Requerido';
    if (!formData.ubicacion) e.ubicacion = 'Requerido';
    if (!ALLOWED_ESTADOS.includes(formData.estado)) e.estado = 'Estado inválido';
    if (isEquipmentInUSD && !(exchangeRate > 0)) e.exchangeRate = 'Tipo de cambio inválido';
    if (!(porcentajeIva >= 0 && porcentajeIva <= 100)) e.porcentajeIva = 'Porcentaje de IVA inválido';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  // Payload: solo definidos + estado mapeado; equipoDolares calculado si USD activo
  const buildPayloadForUpdate = () => {
    const p = formData.presupuesto || {};
    const pres = {};
    ['manoObra', 'piezas', 'equipos', 'equipoDolares', 'materiales', 'transporte', 'otros'].forEach(k => {
      const val = toNumberOrUndef(p[k]);
      if (val != null) pres[k] = val;
    });
    pres._metaEquipos = { capturadoEn: isEquipmentInUSD ? 'USD' : 'MXN' };

    if (isEquipmentInUSD) {
      const mxn = toNumberOrUndef(p.equipos) ?? 0;
      const rate = rateSafe(exchangeRate);
      const usd = rate ? mxn / rate : undefined;
      if (usd != null) pres.equipoDolares = usd;
    }

    return {
      nombre: formData.nombre,
      departamento: formData.departamento,
      prioridad: formData.prioridad,
      ubicacion: formData.ubicacion,
      descripcion: formData.descripcion,
      personalAsignado: Array.isArray(formData.personalAsignado) ? formData.personalAsignado : [],
      estado: formData.estado,
      presupuesto: pres,
      totalPresupuestoSinIva: Number(totalSinIva),
      totalPresupuestoConIva: Number(totalConIva),
      porcentajeIva: Number(porcentajeIva),
    };
  };

  const handleSubmit = async (e) => {
    e?.preventDefault();
    if (!validate()) return;
    setIsSubmitting(true);
    try {
      const payload = buildPayloadForUpdate();
      await proyectoService.updateProyecto(formData.id, payload);
      uiEstadoCache.set(formData.id, formData.estado);
      onSubmit && onSubmit({ id: formData.id, ...payload, _uiEstado: formData.estado });
      onClose && onClose();
    } catch (err) {
      console.error('Error actualizando proyecto:', err);
      const detalle = err?.data?.error || err?.data?.message || err?.userMessage || err?.message;
      alert(`No se pudo actualizar el proyecto.\n${detalle || ''}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  /* Render */
  const b = formData.presupuesto || {};
  const clientLabel = useMemo(() => {
    if (!formData.clienteId) return '—';
    const found = clientOptions.find((o) => o.value === formData.clienteId);
    return found?.label || formData.clienteNombre || formData.clienteId;
  }, [clientOptions, formData.clienteId, formData.clienteNombre]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-1050 p-4">
      <div className="bg-card border border-border rounded-lg w-full max-w-4xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-border">
          <div>
            <h2 className="text-xl font-semibold text-foreground">Editar Proyecto</h2>
            <p className="text-sm text-muted-foreground">Actualice la información permitida</p>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose}><Icon name="X" size={20} /></Button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Información Básica */}
            <div className="md:col-span-2">
              <h3 className="text-lg font-medium text-foreground mb-4">Información Básica</h3>
            </div>

            <Input label="Código (solo lectura)" value={asStr(formData?.codigo, '—')} onChange={() => { }} disabled />
            <Input label="Tipo de Proyecto (solo lectura)" value={asStr(formData?.tipoProyecto, '—')} onChange={() => { }} disabled />
            <Input label="Cliente (solo lectura)" value={asStr(clientLabel, '—')} onChange={() => { }} disabled />

            <Input
              label="Nombre"
              type="text"
              placeholder="Ej: Instalación HVAC Edificio Central"
              value={asStr(formData?.nombre)}
              onChange={(e) => handle('nombre', e.target.value)}
              error={errors?.nombre}
              required
            />

            <Select
              label="Departamento Responsable"
              options={departmentOptions}
              value={asStr(formData?.departamento)}
              onChange={(value) => handle('departamento', value)}
              error={errors?.departamento}
              required
            />

            <Select
              label="Prioridad"
              options={priorityOptions}
              value={asStr(formData?.prioridad)}
              onChange={(value) => handle('prioridad', value)}
              error={errors?.prioridad}
              required
            />

            <Select
              label="Estado"
              options={estadoOptionsBackend}
              value={asStr(formData?.estado)}
              onChange={(value) => handle('estado', value)}
              error={errors?.estado}
              required
            />

            <Input
              label="Ubicación"
              type="text"
              placeholder="Ej: Ciudad de México, CDMX"
              value={asStr(formData?.ubicacion)}
              onChange={(e) => handle('ubicacion', e.target.value)}
              error={errors?.ubicacion}
              required
            />

            {/* Descripción */}
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-foreground mb-2">Descripción del Proyecto</label>
              <textarea
                rows={4}
                placeholder="Describa los objetivos, alcance y detalles importantes del proyecto..."
                value={asStr(formData?.descripcion)}
                onChange={(e) => handle('descripcion', e.target.value)}
                className="w-full px-3 py-2 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent resize-none"
              />
            </div>

            {/* Desglose de Presupuesto */}
            <div className="md:col-span-2 mt-6">
              <h3 className="text-lg font-medium text-foreground mb-4">Desglose de Presupuesto</h3>
            </div>

            <Input label="Mano de Obra (MXN)" type="text" inputMode="decimal" placeholder="0.00"
              value={formatWithCommas(b?.manoObra)} onChange={(e) => handleP('manoObra', e?.target?.value)} />

            <Input label="Piezas (MXN)" type="text" inputMode="decimal" placeholder="0.00"
              value={formatWithCommas(b?.piezas)} onChange={(e) => handleP('piezas', e?.target?.value)} />

            {/* Equipos con toggle USD */}
            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium text-foreground">
                  {isEquipmentInUSD ? 'Equipos (USD se convierte a MXN)' : 'Equipos (MXN)'}
                </label>
                <label className="inline-flex items-center gap-2 text-sm text-foreground cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={isEquipmentInUSD}
                    onChange={(e) => toggleUSD(e.target.checked)}
                    className="h-4 w-4 accent-primary cursor-pointer"
                  />
                  Precio en dólares
                </label>
              </div>

              {/* Campo Equipos */}
              <input
                type="text"
                inputMode="decimal"
                placeholder={isEquipmentInUSD ? '0.00 USD' : '0.00 MXN'}
                value={isEquipmentInUSD ? uiEquipmentUSD : formatWithCommas(b?.equipos)}
                onChange={(e) => (isEquipmentInUSD ? undefined : handleP('equipos', e?.target?.value))}
                readOnly={isEquipmentInUSD}
                className={`w-full px-3 py-2 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent ${isEquipmentInUSD ? 'bg-muted cursor-not-allowed' : ''}`}
              />

              {isEquipmentInUSD && (
                <div className="flex items-center gap-3 flex-wrap">
                  <div className="flex-1 min-w-[220px]">
                    <Input
                      label="Tipo de cambio (MXN / USD)"
                      type="text"
                      inputMode="decimal"
                      value={formatWithCommas(exchangeRate, 4)}
                      onChange={() => { }}
                      readOnly
                      disabled
                    />
                  </div>

                  <Button
                    type="button"
                    variant="outline"
                    onClick={fetchUsdMxnRate}
                    loading={loadingFx}
                    iconName="RefreshCcw"
                    iconPosition="left"
                  >
                    {loadingFx ? 'Actualizando…' : 'Actualizar tipo de cambio'}
                  </Button>

                  <div className="text-sm text-muted-foreground whitespace-nowrap">
                    Guardado en MXN:{' '}
                    <span className="font-semibold">${formatWithCommas(b?.equipos, 2)}</span>
                  </div>

                  {fxError && <div className="text-xs text-destructive">{fxError}</div>}
                </div>
              )}
            </div>

            <Input label="Materiales (MXN)" type="text" inputMode="decimal" placeholder="0.00"
              value={formatWithCommas(b?.materiales)} onChange={(e) => handleP('materiales', e?.target?.value)} />

            <Input label="Transporte (MXN)" type="text" inputMode="decimal" placeholder="0.00"
              value={formatWithCommas(b?.transporte)} onChange={(e) => handleP('transporte', e?.target?.value)} />

            <Input label="Otros Gastos (MXN)" type="text" inputMode="decimal" placeholder="0.00"
              value={formatWithCommas(b?.otros)} onChange={(e) => handleP('otros', e?.target?.value)} />

            {/* Total */}
            <div className="md:col-span-2">
              <div className="bg-muted p-4 rounded-lg">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium text-foreground">Total del Presupuesto (MXN):</span>
                  <span className="text-lg font-semibold text-primary">
                    ${formatWithCommas(totalMXN, 2)} MXN
                  </span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-3">
                  <div className="flex flex-col">
                    <label className="text-xs text-muted-foreground">Porcentaje de IVA (%)</label>
                    <input
                      type="number"
                      min={0}
                      max={100}
                      step={0.01}
                      value={porcentajeIva}
                      onChange={(e) => {
                        const v = Number(e.target.value);
                        setPorcentajeIva(isNaN(v) ? 16 : Math.max(0, Math.min(100, v)));
                        if (errors?.porcentajeIva) setErrors((prev) => ({ ...prev, porcentajeIva: undefined }));
                      }}
                      className="w-full px-3 py-2 border border-border rounded-md"
                    />
                    {errors?.porcentajeIva && (<span className="text-xs text-destructive mt-1">{errors.porcentajeIva}</span>)}
                  </div>
                  <div className="flex flex-col">
                    <label className="text-xs text-muted-foreground">Total sin IVA (MXN)</label>
                    <div className="w-full px-3 py-2 border border-border rounded-md bg-muted">${formatWithCommas(totalSinIva, 2)}</div>
                  </div>
                  <div className="flex flex-col">
                    <label className="text-xs text-muted-foreground">Total con IVA (MXN)</label>
                    <div className="w-full px-3 py-2 border border-border rounded-md bg-muted">${formatWithCommas(totalConIva, 2)}</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Cronograma (read-only) */}
            <div className="md:col-span-2 mt-6">
              <h3 className="text-lg font-medium text-foreground mb-4">Cronograma</h3>
            </div>

            <Input label="Fecha de Inicio (solo lectura)" type="date" value={asStr(formData?.cronograma?.fechaInicio, '')} onChange={() => { }} disabled />
            <Input label="Fecha de Finalización (solo lectura)" type="date" value={asStr(formData?.cronograma?.fechaFin, '')} onChange={() => { }} disabled />

            {/* Asignación de Personal */}
            <div className="md:col-span-2 mt-6">
              <h3 className="text-lg font-medium text-foreground mb-4">Asignación de Personal</h3>
            </div>

            <div className="md:col-span-2">
              <Select
                label="Personal Asignado"
                options={personnelOptions}
                value={asArr(formData?.personalAsignado).map(String)}
                onChange={(value) => handle('personalAsignado', asArr(value).map(String))}
                multiple
                searchable
                description="Seleccione el personal que trabajará en este proyecto"
              />
            </div>
          </div>

          {/* Acciones */}
          <div className="flex justify-end gap-3 mt-8 pt-6 border-t border-border">
            <Button type="button" variant="outline" onClick={onClose}>Cancelar</Button>
            <Button type="submit" loading={isSubmitting} iconName="Save" iconPosition="left">
              {isSubmitting ? 'Guardando...' : 'Guardar Cambios'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EditProjectModal;
