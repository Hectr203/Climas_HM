import React, { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import Button from '../../../components/ui/Button';
import Icon from '../../../components/AppIcon';
import Input from '../../../components/ui/Input';
import Select from '../../../components/ui/Select';
import proyectoService from 'services/proyectoService';
import clientService from 'services/clientService';
import usePerson from 'hooks/usePerson';
import { useErrorHandler, useNotifications } from 'context/NotificationContext';
import { useEstados, useMunicipios } from '../../../hooks/useEstado';

const projectTypes = [
  { value: 'Instalación', label: 'Instalación' },
  { value: 'Mantenimiento Preventivo', label: 'Mantenimiento Preventivo' },
  { value: 'Mantenimiento Correctivo', label: 'Mantenimiento Correctivo' },
  { value: 'Inspección', label: 'Inspección' },
];

const departmentOptions = [
  { value: 'Ventas', label: 'Ventas' },
  { value: 'Ingeniería', label: 'Ingeniería' },
  { value: 'Instalación', label: 'Instalación' },
  { value: 'Mantenimiento', label: 'Mantenimiento' },
  { value: 'Administración', label: 'Administración' },
];

const priorityOptions = [
  { value: 'low', label: 'Baja' },
  { value: 'medium', label: 'Media' },
  { value: 'high', label: 'Alta' },
  { value: 'urgent', label: 'Urgente' },
];

const projectStatusOptions = [
  { value: 'Planificación', label: 'Planificación' },
  { value: 'En Progreso', label: 'En Progreso' },
  { value: 'En Pausa', label: 'En Pausa' },
  { value: 'En Revisión', label: 'En Revisión' },
  { value: 'Completado', label: 'Completado' },
  { value: 'Cancelado', label: 'Cancelado' },
];

const personnelOptionsFallback = [
  { value: 'Andrés Torres — Técnico HVAC', label: 'Andrés Torres — Técnico HVAC' },
  { value: 'Laura Gómez — Supervisora de Mantenimiento', label: 'Laura Gómez — Supervisora de Mantenimiento' },
  { value: 'Pedro Hernández — Ingeniero de Campo', label: 'Pedro Hernández — Ingeniero de Campo' },
];

const mapPriorityToEs = (v) => {
  const m = { low: 'Baja', medium: 'Media', high: 'Alta', urgent: 'Urgente' };
  return m[(v || '').toString().toLowerCase()] || v || '';
};

const formatWithCommas = (v, decimals = 2) => {
  if (v === '' || v == null) return '';
  const num = Number(v);
  if (!Number.isFinite(num)) return '';
  const options = Number.isInteger(num)
    ? { minimumFractionDigits: 0, maximumFractionDigits: 0 }
    : { minimumFractionDigits: decimals, maximumFractionDigits: decimals };
  return num.toLocaleString('es-MX', options);
};

const unformatNumber = (raw) => {
  if (raw === '' || raw == null) return 0;
  const clean = String(raw).replace(/[^\d.-]/g, '');
  const n = parseFloat(clean);
  return Number.isFinite(n) ? n : 0;
};

const rateSafe = (rate) => (Number.isFinite(Number(rate)) ? Number(rate) : 0);

const CreateProjectModal = ({ isOpen, onClose, onSubmit }) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState({});
  const { persons, getPersons } = usePerson();
  const { handleError, handleSuccess } = useErrorHandler();
  const { showWarning, showError } = useNotifications();

  const [formData, setFormData] = useState({
    name: '',
    code: '',
    type: '',
    client: '',
    department: '',
    priority: '',
    status: '',
    budgetBreakdown: {
      labor: 0,
      parts: 0,
      equipment: 0,
      materials: 0,
      transportation: 0,
      other: 0,
    },
    estado: '',
    municipio: '',
    direccion: '',
    startDate: '',
    endDate: '',
    assignedPersonnel: [],
    description: '',
  });

  const [otherExpenses, setOtherExpenses] = useState([]);
  const [newExpense, setNewExpense] = useState({ concept: '', amount: '' });
  const [editingExpenseIndex, setEditingExpenseIndex] = useState(null);

  const [isEquipmentInUSD, setIsEquipmentInUSD] = useState(false);
  const [exchangeRate, setExchangeRate] = useState(18);
  const [uiEquipmentUSD, setUiEquipmentUSD] = useState('');
  const [loadingFx, setLoadingFx] = useState(false);
  const [fxError, setFxError] = useState(null);

  const [clientOptions, setClientOptions] = useState([]);
  const [loadingClients, setLoadingClients] = useState(false);

  const { estados, loading: loadingEstados, error: errorEstados } = useEstados();
  const { municipios, loading: loadingMunicipios, error: errorMunicipios } = useMunicipios(formData.estado);

  // ✅ NUEVO: check para mostrar total en USD
  const [showTotalInUSD, setShowTotalInUSD] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    let mounted = true;
    (async () => {
      try {
        setLoadingClients(true);
        const resp = await clientService.getClients();
        const list = Array.isArray(resp?.data) ? resp.data : (Array.isArray(resp) ? resp : []);
        const opts = list.map((c) => ({ value: c.id, label: c.empresa || c.contacto || '—' }));
        if (mounted) setClientOptions(opts);
      } catch (e) {
        handleError(e, 'Error cargando clientes');
      } finally {
        if (mounted) setLoadingClients(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, [isOpen, handleError]);

  const fetchedPersonsRef = useRef(false);
  useEffect(() => {
    if (!isOpen) return;
    if (fetchedPersonsRef.current) return;
    fetchedPersonsRef.current = true;

    const controller = new AbortController();
    (async () => {
      try {
        await getPersons({ signal: controller.signal });
      } catch (e) {
        if (e?.name !== 'AbortError') handleError(e, 'Error cargando empleados');
      }
    })();

    return () => {
      controller.abort();
    };
  }, [isOpen, handleError, getPersons]);

  const personnelOptionsFinal = useMemo(() => {
    if (!Array.isArray(persons) || persons.length === 0) return personnelOptionsFallback;
    const built = persons
      .map((p) => {
        const nombre =
          p?.nombreCompleto ||
          [p?.nombre, p?.apellidoPaterno, p?.apellidoMaterno].filter(Boolean).join(' ') ||
          p?.nombre ||
          p?.name ||
          '—';
        const puesto = p?.puesto || p?.rol || p?.cargo;
        const etiqueta = puesto ? `${nombre} — ${puesto}` : nombre;
        return etiqueta ? { value: etiqueta, label: etiqueta } : null;
      })
      .filter(Boolean);

    const seen = new Set();
    const dedup = [];
    for (const opt of built) {
      if (seen.has(opt.value)) continue;
      seen.add(opt.value);
      dedup.push(opt);
    }
    return dedup.length ? dedup : personnelOptionsFallback;
  }, [persons]);

  const handleInputChange = (key, value) => {
    setFormData((s) => ({ ...s, [key]: value }));
    if (errors[key]) setErrors((e) => ({ ...e, [key]: undefined }));
  };

  useEffect(() => {
    if (!isEquipmentInUSD) return;
    const mxn = Number(formData?.budgetBreakdown?.equipment || 0);
    const rate = rateSafe(exchangeRate);
    const usd = rate ? mxn / rate : 0;
    setUiEquipmentUSD(usd ? formatWithCommas(usd, 2) : '0.00');
  }, [isEquipmentInUSD, exchangeRate, formData?.budgetBreakdown?.equipment]);

  const handleBudgetChange = (key, rawValue) => {
    const cleanedNumber = unformatNumber(rawValue);
    if (key === 'equipment' && isEquipmentInUSD) return;
    setFormData((s) => ({
      ...s,
      budgetBreakdown: { ...s.budgetBreakdown, [key]: cleanedNumber },
    }));
  };

  const handleAddExpense = () => {
    if (!newExpense.concept.trim()) {
      showWarning('Ingrese un concepto para el gasto');
      return;
    }
    const amount = unformatNumber(newExpense.amount);
    if (amount <= 0) {
      showWarning('Ingrese un monto válido mayor a 0');
      return;
    }

    if (editingExpenseIndex !== null) {
      const updatedExpenses = [...otherExpenses];
      updatedExpenses[editingExpenseIndex] = { concept: newExpense.concept, amount };
      setOtherExpenses(updatedExpenses);
      setEditingExpenseIndex(null);
    } else {
      setOtherExpenses([...otherExpenses, { concept: newExpense.concept, amount }]);
    }
    setNewExpense({ concept: '', amount: '' });
  };

  const handleEditExpense = (index) => {
    const expense = otherExpenses[index];
    setNewExpense({ concept: expense.concept, amount: formatWithCommas(expense.amount, 2) });
    setEditingExpenseIndex(index);
  };

  const handleCancelEdit = () => {
    setNewExpense({ concept: '', amount: '' });
    setEditingExpenseIndex(null);
  };

  const handleRemoveExpense = (index) => {
    setOtherExpenses(otherExpenses.filter((_, i) => i !== index));
    if (editingExpenseIndex === index) {
      handleCancelEdit();
    }
  };

  // ✅ FIX: función corregida (era lo que te rompía el build)
  const fetchUsdMxnRate = useCallback(async () => {
    try {
      setFxError(null);
      setLoadingFx(true);

      const resp = await proyectoService.getCurrencyRates({ base: 'USD', currencies: ['MXN'] });

      const mxnInfo = resp?.data?.MXN ?? resp?.MXN;
      const rate = Number(mxnInfo?.value ?? mxnInfo ?? 0);

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
      handleError(e, 'Tipo de cambio');
      return null;
    } finally {
      setLoadingFx(false);
    }
  },
  [handleError, showError]
  );

  const toggleEquipmentUSD = (checked) => {
    setIsEquipmentInUSD(checked);
    if (!checked) setUiEquipmentUSD('');
  };

  const validate = () => {
    const e = {};
    if (!formData.name) e.name = 'Requerido';
    if (!formData.type) e.type = 'Requerido';
    if (!formData.client) e.client = 'Seleccione un cliente';
    if (!formData.department) e.department = 'Requerido';
    if (!formData.priority) e.priority = 'Requerido';
    if (!formData.status) e.status = 'Requerido';

    if (!formData.estado) e.estado = 'Requerido';
    if (!formData.municipio) e.municipio = 'Requerido';
    if (!formData.direccion) e.direccion = 'Requerido';

    if (!formData.startDate) e.startDate = 'Requerido';
    if (!formData.endDate) e.endDate = 'Requerido';
    if (formData.startDate && formData.endDate && new Date(formData.endDate) < new Date(formData.startDate)) {
      e.endDate = 'La fecha de fin no puede ser anterior al inicio';
    }
    if (isEquipmentInUSD && !(exchangeRate > 0)) {
      e.exchangeRate = 'Indique un tipo de cambio válido';
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const buildPayloadForBackend = () => {
    const b = formData.budgetBreakdown || {};
    const equipoDolares = isEquipmentInUSD ? unformatNumber(uiEquipmentUSD) : undefined;

    return {
      codigo: formData.code || '',
      nombre: formData.name || '',
      tipoProyecto: formData.type || '',
      cliente: { id: formData.client || '', nombre: formData.clientName || '' },
      departamento: formData.department || '',
      prioridad: mapPriorityToEs(formData.priority),
      ubicacion: {
        estado: formData.estado || '',
        municipio: formData.municipio || '',
        direccion: formData.direccion || '',
      },
      descripcion: formData.description || '',
      personalAsignado: Array.isArray(formData.assignedPersonnel) ? formData.assignedPersonnel : [],
      cronograma: {
        fechaInicio: formData.startDate || '',
        fechaFin: formData.endDate || '',
      },
      presupuesto: {
        manoObra: Number(b.labor) || 0,
        piezas: Number(b.parts) || 0,
        equipos: Number(b.equipment) || 0,
        ...(equipoDolares !== undefined ? { equipoDolares } : {}),
        materiales: Number(b.materials) || 0,
        transporte: Number(b.transportation) || 0,
        otros: Number(b.other) || 0,
        _metaEquipos: { capturadoEn: isEquipmentInUSD ? 'USD' : 'MXN' },
      },
      ...(otherExpenses.length > 0
        ? {
            desgloseOtrosGastos: otherExpenses.map((expense) => ({
              concepto: expense.concept,
              monto: expense.amount,
            })),
          }
        : {}),
      estado: formData.status,
    };
  };

  const handleSubmit = async (e) => {
    e?.preventDefault();
    if (!validate()) {
      showWarning('Revisa los campos requeridos del formulario.');
      return;
    }
    setIsSubmitting(true);
    try {
      const payload = buildPayloadForBackend();
      await proyectoService.createProyecto(payload);
      handleSuccess('create', 'Proyecto');
      onSubmit && onSubmit(payload);
      onClose && onClose();
    } catch (err) {
      console.error('Error creando proyecto:', err);
      handleError(err, 'Error creando proyecto');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  const b = formData.budgetBreakdown || {};
  const otherExpensesTotal = otherExpenses.reduce((sum, exp) => sum + (Number(exp.amount) || 0), 0);
  const totalMXN =
    (Number(b?.labor) || 0) +
    (Number(b?.parts) || 0) +
    (Number(b?.equipment) || 0) +
    (Number(b?.materials) || 0) +
    (Number(b?.transportation) || 0) +
    (Number(b?.other) || 0) +
    otherExpensesTotal;

  const totalUSD = showTotalInUSD && exchangeRate > 0 ? totalMXN / exchangeRate : 0;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-1050 p-4">
      <div className="bg-card border border-border rounded-lg w-full max-w-4xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-border">
          <div>
            <h2 className="text-xl font-semibold text-foreground">Crear Nuevo Proyecto</h2>
            <p className="text-sm text-muted-foreground">Complete la información del proyecto</p>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <Icon name="X" size={20} />
          </Button>
        </div>

        <form onSubmit={handleSubmit} className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="md:col-span-2">
              <h3 className="text-lg font-medium text-foreground mb-4">Información Básica</h3>
            </div>

            <Input
              label="Nombre del Proyecto"
              type="text"
              placeholder="Ej: Instalación HVAC Edificio Central"
              value={formData?.name}
              onChange={(e) => handleInputChange('name', e?.target?.value)}
              error={errors?.name}
              required
            />

            <Input
              label="Código del Proyecto"
              type="text"
              placeholder="Ej: PROJ-2025-001"
              value={formData?.code}
              onChange={(e) => handleInputChange('code', e?.target?.value)}
              error={errors?.code}
              description="Se generará automáticamente si se deja vacío"
            />

            <Select
              label="Tipo de Proyecto"
              options={projectTypes}
              value={formData?.type}
              onChange={(value) => handleInputChange('type', value)}
              error={errors?.type}
              required
            />

            <Select
              label="Cliente"
              options={clientOptions}
              value={formData?.client}
              onChange={(value) => handleInputChange('client', value)}
              error={errors?.client}
              searchable
              required
              loading={loadingClients}
            />

            <Select
              label="Departamento Responsable"
              options={departmentOptions}
              value={formData?.department}
              onChange={(value) => handleInputChange('department', value)}
              error={errors?.department}
              required
            />

            <Select
              label="Prioridad"
              options={priorityOptions}
              value={formData?.priority}
              onChange={(value) => handleInputChange('priority', value)}
              error={errors?.priority}
              required
            />

            <Select
              label="Estado del Proyecto"
              options={projectStatusOptions}
              value={formData?.status}
              onChange={(value) => handleInputChange('status', value)}
              error={errors?.status}
              required
            />

            <div className="md:col-span-2 mt-2">
              <h3 className="text-lg font-medium text-foreground mb-2">Ubicación del Proyecto</h3>
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
                  value={formData.estado}
                  onChange={(value) => {
                    handleInputChange('estado', value);
                    handleInputChange('municipio', '');
                  }}
                  options={
                    estados
                      ? [{ value: '', label: 'Selecciona un estado' }, ...estados.map((e) => ({ value: e.code, label: e.name }))]
                      : []
                  }
                  loading={loadingEstados}
                  error={errors?.estado}
                  required
                  disabled={loadingEstados || !!errorEstados}
                  placeholder={loadingEstados ? 'Cargando estados...' : 'Selecciona un estado'}
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
                  value={formData.municipio}
                  onChange={(value) => handleInputChange('municipio', value)}
                  options={
                    formData.estado === ''
                      ? [{ value: '', label: 'Selecciona un estado primero' }]
                      : loadingMunicipios
                      ? [{ value: '', label: 'Cargando municipios...' }]
                      : errorMunicipios
                      ? [{ value: '', label: 'Error al cargar municipios' }]
                      : [
                          { value: '', label: 'Selecciona un municipio' },
                          ...(municipios ? Object.entries(municipios.municipios || {}).map(([code, name]) => ({ value: code, label: name })) : []),
                        ]
                  }
                  loading={loadingMunicipios}
                  error={errors?.municipio}
                  required
                  disabled={formData.estado === '' || loadingMunicipios || !!errorMunicipios}
                  placeholder={
                    formData.estado === ''
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
                value={formData?.direccion}
                onChange={(e) => handleInputChange('direccion', e?.target?.value)}
                error={errors?.direccion}
                placeholder="Dirección completa"
                className="h-12 md:h-14 w-full text-base"
              />
            </div>

            <div className="md:col-span-2 mt-6">
              <h3 className="text-lg font-medium text-foreground mb-4">Desglose de Presupuesto</h3>
            </div>

            <Input
              label="Mano de Obra (MXN)"
              type="text"
              inputMode="decimal"
              placeholder="0.00"
              value={formatWithCommas(b?.labor)}
              onChange={(e) => handleBudgetChange('labor', e?.target?.value)}
            />

            <Input
              label="Piezas (MXN)"
              type="text"
              inputMode="decimal"
              placeholder="0.00"
              value={formatWithCommas(b?.parts)}
              onChange={(e) => handleBudgetChange('parts', e?.target?.value)}
            />

            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium text-foreground">
                  {isEquipmentInUSD ? 'Equipos (USD se convierte a MXN)' : 'Equipos (MXN)'}
                </label>
                <label className="inline-flex items-center gap-2 text-sm text-foreground cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={isEquipmentInUSD}
                    onChange={(e) => toggleEquipmentUSD(e.target.checked)}
                    className="h-4 w-4 accent-primary cursor-pointer"
                  />
                  Precio en dólares
                </label>
              </div>

              <input
                type="text"
                inputMode="decimal"
                placeholder={isEquipmentInUSD ? '0.00 USD' : '0.00 MXN'}
                value={isEquipmentInUSD ? uiEquipmentUSD : formatWithCommas(b?.equipment)}
                onChange={(e) => handleBudgetChange('equipment', e?.target?.value)}
                readOnly={isEquipmentInUSD}
                className={`w-full px-3 py-2 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent ${
                  isEquipmentInUSD ? 'bg-muted cursor-not-allowed' : ''
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
                    Guardado en MXN: <span className="font-semibold">${formatWithCommas(b?.equipment, 2)}</span>
                  </div>

                  {fxError && <div className="text-xs text-destructive">{fxError}</div>}
                </div>
              )}
            </div>

            <Input
              label="Materiales (MXN)"
              type="text"
              inputMode="decimal"
              placeholder="0.00"
              value={formatWithCommas(b?.materials)}
              onChange={(e) => handleBudgetChange('materials', e?.target?.value)}
            />

            <Input
              label="Transporte (MXN)"
              type="text"
              inputMode="decimal"
              placeholder="0.00"
              value={formatWithCommas(b?.transportation)}
              onChange={(e) => handleBudgetChange('transportation', e?.target?.value)}
            />

            <Input
              label="Otros Gastos (MXN)"
              type="text"
              inputMode="decimal"
              placeholder="0.00"
              value={formatWithCommas(b?.other)}
              onChange={(e) => handleBudgetChange('other', e?.target?.value)}
            />

            <div className="md:col-span-2 mt-4">
              <h4 className="text-base font-medium text-foreground mb-3">Desglose de Otros Gastos</h4>

              <div className="bg-muted border border-border rounded-lg p-4">
                {otherExpenses.length > 0 && (
                  <div className="mb-4 space-y-2">
                    {otherExpenses.map((expense, index) => (
                      <div
                        key={index}
                        className={`flex items-center justify-between bg-card p-3 rounded-md border transition-all ${
                          editingExpenseIndex === index ? 'border-blue-500 ring-2 ring-blue-200' : 'border-border'
                        }`}
                      >
                        <div className="flex-1">
                          <span className="text-sm font-medium text-foreground">{expense.concept}</span>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="text-sm font-semibold text-primary">
                            ${formatWithCommas(expense.amount, 2)} MXN
                          </span>
                          <button
                            type="button"
                            onClick={() => handleEditExpense(index)}
                            className="text-blue-600 hover:text-blue-700 transition-colors"
                            title="Editar"
                            disabled={editingExpenseIndex !== null && editingExpenseIndex !== index}
                          >
                            <Icon name="Edit" size={18} />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleRemoveExpense(index)}
                            className="text-destructive hover:text-destructive/80 transition-colors"
                            title="Eliminar"
                          >
                            <Icon name="Trash2" size={18} />
                          </button>
                        </div>
                      </div>
                    ))}
                    <div className="flex justify-between items-center pt-2 border-t border-border mt-3">
                      <span className="text-sm font-medium text-foreground">Subtotal:</span>
                      <span className="text-base font-semibold text-primary">
                        ${formatWithCommas(otherExpensesTotal, 2)} MXN
                      </span>
                    </div>
                  </div>
                )}

                <div className="space-y-3">
                  {editingExpenseIndex !== null && (
                    <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-md p-2 flex items-center justify-between">
                      <span className="text-sm text-blue-700 dark:text-blue-300 font-medium">Editando gasto</span>
                      <button
                        type="button"
                        onClick={handleCancelEdit}
                        className="text-sm text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 font-medium"
                      >
                        Cancelar
                      </button>
                    </div>
                  )}
                  <div className="grid grid-cols-1 md:grid-cols-[2fr_1fr_auto] gap-3 items-end">
                    <div>
                      <label className="block text-sm font-medium text-foreground mb-1">Concepto</label>
                      <input
                        type="text"
                        placeholder="Ej. Viáticos, Hospedaje, Combustible"
                        value={newExpense.concept}
                        onChange={(e) => setNewExpense({ ...newExpense, concept: e.target.value })}
                        onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddExpense())}
                        className="w-full px-3 py-2 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent bg-background text-foreground"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-foreground mb-1">Monto</label>
                      <input
                        type="text"
                        inputMode="decimal"
                        placeholder="0.00"
                        value={newExpense.amount}
                        onChange={(e) => setNewExpense({ ...newExpense, amount: e.target.value })}
                        onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddExpense())}
                        className="w-full px-3 py-2 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent bg-background text-foreground"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={handleAddExpense}
                      className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-md transition-colors duration-200 flex items-center justify-center gap-2 shadow-sm hover:shadow-md whitespace-nowrap"
                    >
                      <Icon name={editingExpenseIndex !== null ? 'Check' : 'Plus'} size={18} />
                      {editingExpenseIndex !== null ? 'Guardar' : 'Agregar Gasto'}
                    </button>
                  </div>
                </div>
              </div>
            </div>

            <div className="md:col-span-2 mt-4">
              <div className="bg-muted p-4 rounded-lg">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium text-foreground">Total del Presupuesto (MXN):</span>
                  <span className="text-lg font-semibold text-primary">${formatWithCommas(totalMXN, 2)} MXN</span>
                </div>

                {showTotalInUSD && (
                  <div className="mt-2 flex justify-between items-center">
                    <span className="text-xs text-muted-foreground">Total estimado en USD (usando tipo de cambio actual):</span>
                    <span className="text-sm font-semibold text-foreground">
                      {exchangeRate > 0 ? `$${formatWithCommas(totalUSD, 2)} USD` : '—'}
                    </span>
                  </div>
                )}

                {showTotalInUSD && exchangeRate <= 0 && (
                  <div className="mt-1 text-xs text-destructive">
                    No hay un tipo de cambio válido para calcular el total en USD.
                  </div>
                )}

                {/* Si quieres el switch de Total en USD, aquí lo puedes poner (ya tienes el state) */}
                {/* <label className="mt-3 inline-flex items-center gap-2 text-sm cursor-pointer">
                  <input
                    type="checkbox"
                    checked={showTotalInUSD}
                    onChange={(e) => setShowTotalInUSD(e.target.checked)}
                    className="h-4 w-4 accent-primary"
                  />
                  Mostrar total en USD
                </label> */}
              </div>
            </div>

            <div className="md:col-span-2 mt-6">
              <h3 className="text-lg font-medium text-foreground mb-4">Cronograma</h3>
            </div>

            <Input
              label="Fecha de Inicio"
              type="date"
              value={formData?.startDate}
              onChange={(e) => handleInputChange('startDate', e?.target?.value)}
              error={errors?.startDate}
              required
            />

            <Input
              label="Fecha de Finalización"
              type="date"
              value={formData?.endDate}
              onChange={(e) => handleInputChange('endDate', e?.target?.value)}
              error={errors?.endDate}
              required
            />

            <div className="md:col-span-2 mt-6">
              <h3 className="text-lg font-medium text-foreground mb-4">Asignación de Personal</h3>
            </div>

            <div className="md:col-span-2">
              <Select
                label="Personal Asignado"
                options={personnelOptionsFinal}
                value={formData?.assignedPersonnel}
                onChange={(value) => handleInputChange('assignedPersonnel', value)}
                multiple
                searchable
                description="Seleccione el personal que trabajará en este proyecto"
              />
            </div>

            <div className="md:col-span-2 mt-6">
              <label className="block text-sm font-medium text-foreground mb-2">Descripción del Proyecto</label>
              <textarea
                rows={4}
                placeholder="Describa los objetivos, alcance y detalles importantes del proyecto..."
                value={formData?.description}
                onChange={(e) => handleInputChange('description', e?.target?.value)}
                className="w-full px-3 py-2 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent resize-none"
              />
            </div>
          </div>

          <div className="flex items-center justify-end space-x-4 mt-8 pt-6 border-t border-border">
            <Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting}>
              Cancelar
            </Button>
            <Button type="submit" loading={isSubmitting} iconName="Plus" iconPosition="left">
              {isSubmitting ? 'Creando...' : 'Crear Proyecto'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreateProjectModal;
