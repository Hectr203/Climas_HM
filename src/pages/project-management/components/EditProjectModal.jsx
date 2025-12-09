import React, { useEffect, useMemo, useRef, useState, useCallback, } from 'react';
import Button from '../../../components/ui/Button';
import Icon from '../../../components/AppIcon';
import Input from '../../../components/ui/Input';
import Select from '../../../components/ui/Select';
import proyectoService from 'services/proyectoService';
import clientService from 'services/clientService';
import usePerson from 'hooks/usePerson';
import { useErrorHandler, useNotifications } from 'context/NotificationContext';
import { useEstados, useMunicipios } from '../../../hooks/useEstado';

/* ===================== ESTADOS (STATUS DEL PROYECTO) ===================== */
const estadoOptionsBackend = [
  { value: 'planificación', label: 'Planificación' },
  { value: 'en proceso',    label: 'En Progreso' },
  { value: 'en pausa',      label: 'En Pausa' },
  { value: 'en revisión',   label: 'En Revisión' },
  { value: 'completado',    label: 'Completado' },
  { value: 'cancelado',     label: 'Cancelado' },
];
const ALLOWED_ESTADOS = estadoOptionsBackend.map((o) => o.value);

const UI_ESTADO_KEY = 'proyectos_ui_estado_v1';
const uiEstadoCache = {
  _read() {
    try {
      return JSON.parse(localStorage.getItem(UI_ESTADO_KEY)) || {};
    } catch {
      return {};
    }
  },
  get(id) {
    if (!id) return null;
    const m = this._read();
    return m[id] || null;
  },
  set(id, estado) {
    if (!id) return;
    const m = this._read();
    if (estado) m[id] = estado;
    else delete m[id];
    localStorage.setItem(UI_ESTADO_KEY, JSON.stringify(m));
  },
};

/* ===================== CATÁLOGOS ===================== */
const departmentOptions = [
  { value: 'Ventas', label: 'Ventas' },
  { value: 'Ingeniería', label: 'Ingeniería' },
  { value: 'Instalación', label: 'Instalación' },
  { value: 'Mantenimiento', label: 'Mantenimiento' },
  { value: 'Administración', label: 'Administración' },
];
const priorityOptions = [
  { value: 'Baja', label: 'Baja' },
  { value: 'Media', label: 'Media' },
  { value: 'Alta', label: 'Alta' },
  { value: 'Urgente', label: 'Urgente' },
];

/* ===== Helpers numéricos / formateo ===== */
const toNumberOrUndef = (v) => {
  if (v === '' || v == null) return undefined;
  const n =
    typeof v === 'number'
      ? v
      : parseFloat(String(v).replace(/[^\d.-]/g, ''));
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
const asArr = (v) =>
  Array.isArray(v) ? v : v == null ? [] : [String(v)];
const rateSafe = (rate) =>
  Number.isFinite(Number(rate)) ? Number(rate) : 0;

/* ===================== COMPONENTE ===================== */
const EditProjectModal = ({ isOpen = false, onClose, onSubmit, project }) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState({});
  const [serverProject, setServerProject] = useState(null);

  const { persons, getPersons } = usePerson();
  const [clientOptions, setClientOptions] = useState([]);

  const { handleError, handleSuccess } = useErrorHandler();
  const { showError } = useNotifications();

  // FX / equipos
  const [isEquipmentInUSD, setIsEquipmentInUSD] = useState(false);
  const [exchangeRate, setExchangeRate] = useState(18);
  const [uiEquipmentUSD, setUiEquipmentUSD] = useState('');
  const [loadingFx, setLoadingFx] = useState(false);
  const [fxError, setFxError] = useState(null);

  // 🔵 NUEVO: ver total en USD
  const [showUSD, setShowUSD] = useState(false);

  /* ============= ESTADOS/MUNICIPIOS (UBICACIÓN) ============= */
  const { estados, loading: loadingEstados, error: errorEstados } = useEstados();
  const [selectedEstadoCode, setSelectedEstadoCode] = useState('');
  const [municipioOriginal, setMunicipioOriginal] = useState(null);
  const {
    municipios,
    loading: loadingMunicipios,
    error: errorMunicipios,
  } = useMunicipios(selectedEstadoCode || '');

  /* ============= CARGA DE CLIENTES ============= */
  useEffect(() => {
    if (!isOpen) return;
    let mounted = true;
    (async () => {
      try {
        const resp = await clientService.getClients();
        const list = Array.isArray(resp?.data)
          ? resp.data
          : Array.isArray(resp)
          ? resp
          : [];
        const opts = list.map((c) => ({
          value: c.id,
          label: c.empresa || c.nombre || c.contacto || '—',
        }));
        if (mounted) setClientOptions(opts);
      } catch (e) {
        handleError(e, 'Error cargando clientes');
      }
    })();
    return () => {
      mounted = false;
    };
  }, [isOpen, handleError]);

  /* ============= CARGA DE PERSONAL (solo 1 vez) ============= */
  const fetchedPersonsRef = useRef(false);
  useEffect(() => {
    if (!isOpen) return;
    if (fetchedPersonsRef.current) return;
    fetchedPersonsRef.current = true;
    (async () => {
      try {
        await getPersons();
      } catch (e) {
        handleError(e, 'Error cargando empleados');
      }
    })();
    return () => {
      fetchedPersonsRef.current = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  /* ============= CARGA DEL PROYECTO COMPLETO ============= */
  useEffect(() => {
    if (!isOpen || !project?.id) return;
    let mounted = true;
    (async () => {
      try {
        const resp = await proyectoService.getProyectoById(project.id);
        const doc = resp?.data ?? resp;
        if (mounted) setServerProject(doc || project);
      } catch (e) {
        handleError(e, 'Error cargando proyecto');
        if (mounted) setServerProject(project || null);
      }
    })();
    return () => {
      mounted = false;
    };
  }, [isOpen, project?.id, handleError, project]);

  /* ============= NORMALIZACIÓN DEL PROYECTO PARA EL FORM ============= */
  const normalized = useMemo(() => {
    const doc = serverProject || project || {};
    const p = doc.presupuesto || {};
    const cron = doc.cronograma || {};
    const id = doc.id || project?.id;

    let rawUbicacion = doc.ubicacion;
    if (typeof rawUbicacion === 'string') {
      const trimmed = rawUbicacion.trim();
      if (trimmed.startsWith('{') && trimmed.endsWith('}')) {
        try {
          const parsed = JSON.parse(trimmed);
          if (parsed && typeof parsed === 'object') {
            rawUbicacion = parsed;
          }
        } catch {
          // ignore
        }
      }
    }

    let ubicacion = {
      estado: '',
      municipio: '',
      direccion: '',
    };

    if (Array.isArray(rawUbicacion) && rawUbicacion.length > 0) {
      rawUbicacion = rawUbicacion[0];
    }

    if (rawUbicacion && typeof rawUbicacion === 'object' && !Array.isArray(rawUbicacion)) {
      ubicacion = {
        estado:
          rawUbicacion.estado ||
          rawUbicacion.estadoCode ||
          '',
        municipio:
          rawUbicacion.municipio ||
          rawUbicacion.municipioNombre ||
          '',
        direccion:
          rawUbicacion.direccion ||
          rawUbicacion.dirección ||
          rawUbicacion.direccionCompleta ||
          '',
      };
    } else if (typeof rawUbicacion === 'string') {
      ubicacion = {
        estado: '',
        municipio: '',
        direccion: rawUbicacion || '',
      };
    }

    const cachedEstado = uiEstadoCache.get(id);
    const estadoUi = cachedEstado || (doc.estado || 'planificación');

    return {
      id,
      codigo: doc.codigo || '',
      tipoProyecto: doc.tipoProyecto || '',
      clienteId: doc?.cliente?.id ?? '',
      clienteNombre:
        doc?.cliente?.nombre || doc?.cliente?.empresa || '',
      nombre: doc.nombre || doc.nombreProyecto || '',
      departamento: doc.departamento || '',
      prioridad: doc.prioridad || '',
      estado: estadoUi,
      ubicacion,
      descripcion: doc.descripcion || '',
      cronograma: {
        fechaInicio: cron?.fechaInicio || '',
        fechaFin: cron?.fechaFin || '',
      },
      personalAsignado: Array.isArray(doc?.personalAsignado)
        ? doc.personalAsignado
        : [],
      presupuesto: {
        manoObra: toNumberOrUndef(p.manoObra),
        piezas: toNumberOrUndef(p.piezas),
        equipos: toNumberOrUndef(p.equipos),
        equipoDolares: toNumberOrUndef(p.equipoDolares),
        materiales: toNumberOrUndef(p.materiales),
        transporte: toNumberOrUndef(p.transporte),
        otros: toNumberOrUndef(p.otros),
        _metaEquipos: {
          capturadoEn: p?._metaEquipos?.capturadoEn || 'MXN',
        },
      },
    };
  }, [serverProject, project]);

  /* ============= STATE DEL FORM (CONTROLADO) ============= */
  const [formData, setFormData] = useState(normalized);
  useEffect(() => {
    if (isOpen) {
      const estadoCode = normalized?.ubicacion?.estado || '';
      const municipioValue = normalized?.ubicacion?.municipio || '';
      
      if (municipioValue && municipioValue !== formData?.ubicacion?.municipio) {
        setMunicipioOriginal(municipioValue);
      }
      
      setFormData(normalized);
      
      if (estadoCode) {
        setSelectedEstadoCode(estadoCode);
      }
    } else {
      setSelectedEstadoCode('');
      setMunicipioOriginal(null);
      setShowUSD(false); // reset toggle USD al cerrar
    }
  }, [normalized, isOpen]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (isOpen && formData?.ubicacion?.estado) {
      const estadoCode = formData.ubicacion.estado;
      if (selectedEstadoCode !== estadoCode) {
        setSelectedEstadoCode(estadoCode);
      }
    } else if (isOpen && !formData?.ubicacion?.estado && selectedEstadoCode) {
      setSelectedEstadoCode('');
    }
  }, [isOpen, formData?.ubicacion?.estado, selectedEstadoCode]);

  // resolver estado (code) a partir de nombre
  useEffect(() => {
    if (!isOpen || !estados || loadingEstados || !formData?.ubicacion?.estado || !Array.isArray(estados)) {
      return;
    }
    
    const estadoActual = formData.ubicacion.estado;
    const esCodigoValido = estados.some((e) => e.code === estadoActual);
    
    if (!esCodigoValido) {
      const estadoEncontrado = estados.find((e) => {
        const nombreEstado = e.name || '';
        return nombreEstado.toLowerCase() === estadoActual.toLowerCase() ||
               nombreEstado === estadoActual;
      });
      
      if (estadoEncontrado) {
        const codigoEncontrado = estadoEncontrado.code;
        const municipioActual = formData.ubicacion.municipio || '';
        
        if (municipioActual && !municipioOriginal) {
          setMunicipioOriginal(municipioActual);
        }
        
        setFormData((prev) => ({
          ...prev,
          ubicacion: {
            ...prev.ubicacion,
            estado: codigoEncontrado,
            municipio: '',
          },
        }));
        setSelectedEstadoCode(codigoEncontrado);
      }
    } else {
      if (selectedEstadoCode !== estadoActual) {
        setSelectedEstadoCode(estadoActual);
      }
    }
  }, [isOpen, estados, loadingEstados, formData?.ubicacion?.estado, selectedEstadoCode, municipioOriginal]);

  // resolver municipio (code) a partir de nombre
  useEffect(() => {
    if (!isOpen || loadingMunicipios || !formData?.ubicacion?.estado) {
      return;
    }
    
    if (!municipios || !municipios.municipios) {
      return;
    }
    
    const municipioParaResolver = municipioOriginal || formData?.ubicacion?.municipio || '';
    if (!municipioParaResolver) {
      return;
    }
    
    const municipiosObj = municipios.municipios || {};
    const esCodigoValido = municipioParaResolver && municipiosObj[municipioParaResolver];
    
    if (!esCodigoValido) {
      const municipioEncontrado = Object.entries(municipiosObj).find(([code, name]) => {
        if (name === municipioParaResolver) return true;
        if (name.toLowerCase() === municipioParaResolver.toLowerCase()) return true;
        const aliases = municipios.aliases || {};
        const aliasEncontrado = Object.entries(aliases).find(([alias, codigoReferenciado]) => {
          if (codigoReferenciado === code) {
            return alias === municipioParaResolver || 
                   alias.toLowerCase() === municipioParaResolver.toLowerCase();
          }
          return false;
        });
        return !!aliasEncontrado;
      });
      
      if (municipioEncontrado) {
        const [codigoEncontrado] = municipioEncontrado;
        setFormData((prev) => ({
          ...prev,
          ubicacion: {
            ...prev.ubicacion,
            municipio: codigoEncontrado,
          },
        }));
        setMunicipioOriginal(null);
      } else {
        setFormData((prev) => ({
          ...prev,
          ubicacion: {
            ...prev.ubicacion,
            municipio: '',
          },
        }));
        setMunicipioOriginal(null);
      }
    } else {
      if (formData?.ubicacion?.municipio !== municipioParaResolver) {
        setFormData((prev) => ({
          ...prev,
          ubicacion: {
            ...prev.ubicacion,
            municipio: municipioParaResolver,
          },
        }));
      }
      setMunicipioOriginal(null);
    }
  }, [isOpen, municipios, loadingMunicipios, formData?.ubicacion?.estado, formData?.ubicacion?.municipio, municipioOriginal]);

  /* ============= FX / TIPO DE CAMBIO USD↔MXN ============= */
  const fetchUsdMxnRate = useCallback(async () => {
    try {
      setFxError(null);
      setLoadingFx(true);

      const apiResp = await proyectoService.getCurrencyRates({
        base: 'USD',
        currencies: ['MXN'],
      });

      const mxnInfo = apiResp?.data?.MXN;
      const rate = Number(mxnInfo?.value || 0);

      if (rate > 0) {
        setExchangeRate(rate);
        return rate;
      } else {
        const msg = 'No llegó una tasa válida.';
        setFxError(msg);
        showError(msg);
        return null;
      }
    } catch (e) {
      const msg = e?.message || 'Error llamando currencyapi';
      setFxError(msg);
      handleError(e, 'Tipo de cambio');
      return null;
    } finally {
      setLoadingFx(false);
    }
  }, [handleError, showError]);

  // toggle global de ver total en USD
  const handleToggleShowUSD = async (checked) => {
    setShowUSD(checked);
    if (checked) {
      await fetchUsdMxnRate();
    }
  };

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

  useEffect(() => {
    if (!isEquipmentInUSD) return;
    const mxn = toNumberOrUndef(formData?.presupuesto?.equipos) ?? 0;
    const rate = rateSafe(exchangeRate);
    const usd = rate ? mxn / rate : 0;
    setUiEquipmentUSD(usd ? formatWithCommas(usd, 2) : '0.00');
  }, [isEquipmentInUSD, exchangeRate, formData?.presupuesto?.equipos]);

  /* ============= OPTIONS DE PERSONAL PARA EL MULTISELECT ============= */
  const personnelOptions = useMemo(() => {
    const fromPersons = Array.isArray(persons)
      ? persons.map((p) => {
          const nombre =
            p?.nombreCompleto ||
            [p?.nombre, p?.apellidoPaterno, p?.apellidoMaterno]
              .filter(Boolean)
              .join(' ') ||
            p?.nombre ||
            p?.name ||
            '—';
          const puesto = p?.puesto || p?.rol || p?.cargo;
          const etiqueta = puesto ? `${nombre} — ${puesto}` : nombre;
          return { value: etiqueta, label: etiqueta };
        })
      : [];

    const existing = Array.isArray(formData?.personalAsignado)
      ? formData.personalAsignado.map((s) => ({
          value: s,
          label: s,
        }))
      : [];

    const seen = new Set();
    return [...existing, ...fromPersons].filter((o) =>
      seen.has(o.value) ? false : (seen.add(o.value), true)
    );
  }, [persons, formData?.personalAsignado]);

  /* ============= TOTAL MXN DEL PRESUPUESTO MOSTRADO ============= */
  const totalMXN = useMemo(() => {
    const b = formData?.presupuesto || {};
    const sum = (...vals) =>
      vals.reduce(
        (acc, v) => acc + (toNumberOrUndef(v) ?? 0),
        0
      );
    return sum(
      b.manoObra,
      b.piezas,
      b.equipos,
      b.materiales,
      b.transporte,
      b.otros
    );
  }, [formData]);

  // 🔵 total en USD (solo si showUSD y hay rate)
  const totalUSD = useMemo(() => {
    if (!showUSD) return null;
    const rate = rateSafe(exchangeRate);
    if (!rate) return null;
    return totalMXN / rate;
  }, [showUSD, exchangeRate, totalMXN]);

  /* ============= HANDLERS DEL FORM ============= */
  const handle = (k, v) => {
    setFormData((s) => ({ ...s, [k]: v }));
    if (errors[k]) {
      setErrors((e) => ({ ...e, [k]: undefined }));
    }
  };

  const handleUbicacion = (field, value) => {
    setFormData((s) => ({
      ...s,
      ubicacion: {
        ...(s.ubicacion || { estado: '', municipio: '', direccion: '' }),
        [field]: value,
      },
    }));
    const errorKey =
      field === 'estado'
        ? 'ubicacionEstado'
        : field === 'municipio'
        ? 'ubicacionMunicipio'
        : 'ubicacionDireccion';
    if (errors[errorKey]) {
      setErrors((e) => ({ ...e, [errorKey]: undefined }));
    }
  };

  const handleP = (k, raw) => {
    const n =
      raw === '' || raw == null ? undefined : toNumberOrUndef(raw);
    setFormData((s) => ({
      ...s,
      presupuesto: { ...s.presupuesto, [k]: n },
    }));
  };

  const toggleUSD = (checked) => {
    setIsEquipmentInUSD(checked);
    setFormData((s) => ({
      ...s,
      presupuesto: {
        ...s.presupuesto,
        _metaEquipos: {
          capturadoEn: checked ? 'USD' : 'MXN',
        },
      },
    }));

    if (!checked) {
      setUiEquipmentUSD('');
    }
  };

  /* ============= VALIDACIÓN ============= */
  const validate = () => {
    const e = {};
    if (!formData.nombre) e.nombre = 'Requerido';
    if (!formData.departamento)
      e.departamento = 'Requerido';

    const ub = formData.ubicacion || {};
    if (!ub.estado) e.ubicacionEstado = 'Requerido';
    if (!ub.municipio) e.ubicacionMunicipio = 'Requerido';
    if (!ub.direccion) e.ubicacionDireccion = 'Requerido';

    if (!ALLOWED_ESTADOS.includes(formData.estado))
      e.estado = 'Estado inválido';
    if (isEquipmentInUSD && !(exchangeRate > 0))
      e.exchangeRate = 'Tipo de cambio inválido';

    setErrors(e);
    return Object.keys(e).length === 0;
  };

  /* ============= ARMAR PAYLOAD PARA updateProyecto ============= */
  const buildPayloadForUpdate = () => {
    const p = formData.presupuesto || {};
    const pres = {};

    [
      'manoObra',
      'piezas',
      'equipos',
      'equipoDolares',
      'materiales',
      'transporte',
      'otros',
    ].forEach((k) => {
      const val = toNumberOrUndef(p[k]);
      if (val != null) pres[k] = val;
    });

    pres._metaEquipos = {
      capturadoEn: isEquipmentInUSD ? 'USD' : 'MXN',
    };

    if (isEquipmentInUSD) {
      const mxn = toNumberOrUndef(p.equipos) ?? 0;
      const rate = rateSafe(exchangeRate);
      const usd = rate ? mxn / rate : undefined;
      if (usd != null) pres.equipoDolares = usd;
    }

    const ub = formData.ubicacion || {};

    return {
      nombre: formData.nombre,
      departamento: formData.departamento,
      prioridad: formData.prioridad,
      ubicacion: {
        estado: ub.estado || '',
        municipio: ub.municipio || '',
        direccion: ub.direccion || '',
      },
      descripcion: formData.descripcion,
      personalAsignado: Array.isArray(
        formData.personalAsignado
      )
        ? formData.personalAsignado
        : [],
      estado: formData.estado,
      presupuesto: pres,
    };
  };

  /* ============= SUBMIT ============= */
  const handleSubmit = async (e) => {
    e?.preventDefault();
    if (!validate()) return;
    setIsSubmitting(true);
    try {
      const payload = buildPayloadForUpdate();
      await proyectoService.updateProyecto(
        formData.id,
        payload
      );

      uiEstadoCache.set(formData.id, formData.estado);

      if (onSubmit) {
        onSubmit({
          id: formData.id,
          ...payload,
          _uiEstado: formData.estado,
        });
      } else {
        handleSuccess('update', 'Proyecto');
      }

      onClose && onClose();
    } catch (err) {
      console.error('Error actualizando proyecto:', err);
      handleError(err, 'Error actualizando proyecto');
    } finally {
      setIsSubmitting(false);
    }
  };

  /* ============= LABEL DEL CLIENTE ============= */
  const b = formData.presupuesto || {};
  const clientLabel = useMemo(() => {
    if (!formData.clienteId) return '—';
    const found = clientOptions.find(
      (o) => o.value === formData.clienteId
    );
    return (
      found?.label ||
      formData.clienteNombre ||
      formData.clienteId
    );
  }, [clientOptions, formData.clienteId, formData.clienteNombre]);

  if (!isOpen) return null;

  const ub = formData.ubicacion || {
    estado: '',
    municipio: '',
    direccion: '',
  };

  /* ===================== RENDER ===================== */
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-1050 p-4">
      <div className="bg-card border border-border rounded-lg w-full max-w-4xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-border">
          <div>
            <h2 className="text-xl font-semibold text-foreground">
              Editar Proyecto
            </h2>
            <p className="text-sm text-muted-foreground">
              Actualice la información permitida
            </p>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            disabled={isSubmitting}
          >
            <Icon name="X" size={20} />
          </Button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Información Básica */}
            <div className="md:col-span-2">
              <h3 className="text-lg font-medium text-foreground mb-4">
                Información Básica
              </h3>
            </div>

            <Input
              label="Código (solo lectura)"
              value={asStr(formData?.codigo, '—')}
              onChange={() => {}}
              disabled
            />

            <Input
              label="Tipo de Proyecto (solo lectura)"
              value={asStr(formData?.tipoProyecto, '—')}
              onChange={() => {}}
              disabled
            />

            <Input
              label="Cliente (solo lectura)"
              value={asStr(clientLabel, '—')}
              onChange={() => {}}
              disabled
            />

            <Input
              label="Nombre"
              type="text"
              placeholder="Ej: Instalación HVAC Edificio Central"
              value={asStr(formData?.nombre)}
              onChange={(e) =>
                handle('nombre', e.target.value)
              }
              error={errors?.nombre}
              required
            />

            <Select
              label="Departamento Responsable"
              options={departmentOptions}
              value={asStr(formData?.departamento)}
              onChange={(value) =>
                handle('departamento', value)
              }
              error={errors?.departamento}
              required
            />

            <Select
              label="Prioridad"
              options={priorityOptions}
              value={asStr(formData?.prioridad)}
              onChange={(value) =>
                handle('prioridad', value)
              }
              error={errors?.prioridad}
              required
            />

            <Select
              label="Estado"
              options={estadoOptionsBackend}
              value={asStr(formData?.estado)}
              onChange={(value) =>
                handle('estado', value)
              }
              error={errors?.estado}
              required
            />

            {/* Ubicación */}
            <div className="md:col-span-2 mt-2">
              <h3 className="text-lg font-medium text-foreground mb-2">
                Ubicación del Proyecto
              </h3>
              <p className="text-xs text-muted-foreground">
                Seleccione estado y municipio, luego escriba la dirección completa del sitio.
              </p>
            </div>

            <div className="md:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-2 md:gap-4 items-center">
              <div className="flex flex-col justify-end h-full">
                <Select
                  label={
                    <>
                      Estado <span className="text-destructive">*</span>
                    </>
                  }
                  value={ub.estado}
                  onChange={(value) => {
                    handleUbicacion('estado', value);
                    handleUbicacion('municipio', '');
                    setSelectedEstadoCode(value || '');
                  }}
                  options={
                    estados
                      ? [
                          { value: '', label: 'Selecciona un estado' },
                          ...estados.map((e) => ({
                            value: e.code,
                            label: e.name,
                          })),
                        ]
                      : []
                  }
                  loading={loadingEstados}
                  error={errors?.ubicacionEstado}
                  required
                  disabled={loadingEstados || !!errorEstados}
                  placeholder={
                    loadingEstados ? 'Cargando estados...' : 'Selecciona un estado'
                  }
                  searchable
                  className="h-12 md:h-14 w-full text-base"
                />
              </div>

              <div className="flex flex-col justify-end h-full">
                <Select
                  label={
                    <>
                      Municipio <span className="text-destructive">*</span>
                    </>
                  }
                  value={ub.municipio}
                  onChange={(value) =>
                    handleUbicacion('municipio', value)
                  }
                  options={
                    ub.estado === ''
                      ? [{ value: '', label: 'Selecciona un estado primero' }]
                      : loadingMunicipios
                      ? [{ value: '', label: 'Cargando municipios...' }]
                      : errorMunicipios
                      ? [{ value: '', label: 'Error al cargar municipios' }]
                      : [
                          { value: '', label: 'Selecciona un municipio' },
                          ...(municipios
                            ? Object.entries(municipios.municipios || {}).map(
                                ([code, name]) => ({
                                  value: code,
                                  label: name,
                                })
                              )
                            : []),
                        ]
                  }
                  loading={loadingMunicipios}
                  error={errors?.ubicacionMunicipio}
                  required
                  disabled={
                    ub.estado === '' ||
                    loadingMunicipios ||
                    !!errorMunicipios
                  }
                  placeholder={
                    ub.estado === ''
                      ? 'Selecciona un estado primero'
                      : loadingMunicipios
                      ? 'Cargando municipios...'
                      : 'Selecciona un municipio'
                  }
                  searchable
                  className="h-12 md:h-14 w-full text-base"
                />
              </div>
            </div>

            <div className="md:col-span-2">
              <Input
                label="Dirección"
                required
                value={ub.direccion}
                onChange={(e) =>
                  handleUbicacion('direccion', e?.target?.value)
                }
                error={errors?.ubicacionDireccion}
                placeholder="Dirección completa"
                className="h-12 md:h-14 w-full text-base"
              />
            </div>

            {/* Descripción */}
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-foreground mb-2">
                Descripción del Proyecto
              </label>
              <textarea
                rows={4}
                placeholder="Describa los objetivos, alcance y detalles importantes del proyecto..."
                value={asStr(formData?.descripcion)}
                onChange={(e) =>
                  handle('descripcion', e.target.value)
                }
                className="w-full px-3 py-2 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent resize-none"
              />
            </div>

            {/* Desglose de Presupuesto */}
            <div className="md:col-span-2 mt-6">
              <h3 className="text-lg font-medium text-foreground mb-4">
                Desglose de Presupuesto
              </h3>
            </div>

            <Input
              label="Mano de Obra (MXN)"
              type="text"
              inputMode="decimal"
              placeholder="0.00"
              value={formatWithCommas(b?.manoObra)}
              onChange={(e) =>
                handleP('manoObra', e?.target?.value)
              }
            />

            <Input
              label="Piezas (MXN)"
              type="text"
              inputMode="decimal"
              placeholder="0.00"
              value={formatWithCommas(b?.piezas)}
              onChange={(e) =>
                handleP('piezas', e?.target?.value)
              }
            />

            {/* Equipos con toggle USD */}
            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium text-foreground">
                  {isEquipmentInUSD
                    ? 'Equipos (USD se convierte a MXN)'
                    : 'Equipos (MXN)'}
                </label>
                <label className="inline-flex items-center gap-2 text-sm text-foreground cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={isEquipmentInUSD}
                    onChange={(e) =>
                      toggleUSD(e.target.checked)
                    }
                    className="h-4 w-4 accent-primary cursor-pointer"
                  />
                  Precio en dólares
                </label>
              </div>

              <input
                type="text"
                inputMode="decimal"
                placeholder={
                  isEquipmentInUSD ? '0.00 USD' : '0.00 MXN'
                }
                value={
                  isEquipmentInUSD
                    ? uiEquipmentUSD
                    : formatWithCommas(b?.equipos)
                }
                onChange={(e) =>
                  isEquipmentInUSD
                    ? undefined
                    : handleP('equipos', e?.target?.value)
                }
                readOnly={isEquipmentInUSD}
                className={`w-full px-3 py-2 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent ${
                  isEquipmentInUSD
                    ? 'bg-muted cursor-not-allowed'
                    : ''
                }`}
              />

              {isEquipmentInUSD && (
                <div className="flex items-center gap-3 flex-wrap">
                  <div className="flex-1 min-w-[220px]">
                    <Input
                      label="Tipo de cambio (MXN / USD)"
                      type="text"
                      inputMode="decimal"
                      value={formatWithCommas(exchangeRate, 4)}
                      onChange={() => {}}
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
                    <span className="font-semibold">
                      ${formatWithCommas(b?.equipos, 2)}
                    </span>
                  </div>

                  {fxError && (
                    <div className="text-xs text-destructive">
                      {fxError}
                    </div>
                  )}
                </div>
              )}
            </div>

            <Input
              label="Materiales (MXN)"
              type="text"
              inputMode="decimal"
              placeholder="0.00"
              value={formatWithCommas(b?.materiales)}
              onChange={(e) =>
                handleP('materiales', e?.target?.value)
              }
            />

            <Input
              label="Transporte (MXN)"
              type="text"
              inputMode="decimal"
              placeholder="0.00"
              value={formatWithCommas(b?.transporte)}
              onChange={(e) =>
                handleP('transporte', e?.target?.value)
              }
            />

            <Input
              label="Otros Gastos (MXN)"
              type="text"
              inputMode="decimal"
              placeholder="0.00"
              value={formatWithCommas(b?.otros)}
              onChange={(e) =>
                handleP('otros', e?.target?.value)
              }
            />

            {/* Total + toggle USD (igual que crear) */}
            <div className="md:col-span-2">
              <div className="bg-muted p-4 rounded-lg space-y-3">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <span className="text-sm font-medium text-foreground">
                      Total del Presupuesto (MXN):
                    </span>
                    <div className="text-lg font-semibold text-primary">
                      ${formatWithCommas(totalMXN, 2)} MXN
                    </div>
                  </div>

                  <label className="inline-flex items-center gap-2 text-xs md:text-sm text-foreground cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={showUSD}
                      onChange={(e) =>
                        handleToggleShowUSD(e.target.checked)
                      }
                      className="h-4 w-4 accent-primary cursor-pointer"
                    />
                    Ver equivalente en USD
                  </label>
                </div>

                {showUSD && (
                  <div className="flex flex-wrap items-center gap-3 text-xs md:text-sm text-muted-foreground">
                    <div>
                      ≈{' '}
                      {totalUSD != null ? (
                        <span className="font-semibold text-primary">
                          ${formatWithCommas(totalUSD, 2)} USD
                        </span>
                      ) : (
                        '—'
                      )}
                    </div>

                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={fetchUsdMxnRate}
                      loading={loadingFx}
                      iconName="RefreshCcw"
                      iconPosition="left"
                    >
                      {loadingFx ? 'Actualizar…' : 'Actualizar tipo de cambio'}
                    </Button>

                    {fxError && (
                      <span className="text-xs text-destructive">
                        {fxError}
                      </span>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Cronograma (solo lectura) */}
            <div className="md:col-span-2 mt-6">
              <h3 className="text-lg font-medium text-foreground mb-4">
                Cronograma
              </h3>
            </div>

            <Input
              label="Fecha de Inicio (solo lectura)"
              type="date"
              value={asStr(
                formData?.cronograma?.fechaInicio,
                ''
              )}
              onChange={() => {}}
              disabled
            />
            <Input
              label="Fecha de Finalización (solo lectura)"
              type="date"
              value={asStr(
                formData?.cronograma?.fechaFin,
                ''
              )}
              onChange={() => {}}
              disabled
            />

            {/* Asignación de Personal */}
            <div className="md:col-span-2 mt-6">
              <h3 className="text-lg font-medium text-foreground mb-4">
                Asignación de Personal
              </h3>
            </div>

            <div className="md:col-span-2">
              <Select
                label="Personal Asignado"
                options={personnelOptions}
                value={asArr(formData?.personalAsignado).map(String)}
                onChange={(value) =>
                  handle(
                    'personalAsignado',
                    asArr(value).map(String)
                  )
                }
                multiple
                searchable
                description="Seleccione el personal que trabajará en este proyecto"
              />
            </div>
          </div>

          {/* Acciones */}
          <div className="flex justify-end gap-3 mt-8 pt-6 border-t border-border">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={isSubmitting}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              loading={isSubmitting}
              iconName="Save"
              iconPosition="left"
            >
              {isSubmitting ? 'Guardando...' : 'Guardar Cambios'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EditProjectModal;
