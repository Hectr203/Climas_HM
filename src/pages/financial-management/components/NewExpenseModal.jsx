// modules/finanzas/NewExpenseModal.jsx
import React, { useEffect, useMemo, useState } from 'react';
import Icon from '../../../components/AppIcon';
import Button from '../../../components/ui/Button';
import Input from '../../../components/ui/Input';
import Select from '../../../components/ui/Select';
import useFinanzas from '../../../hooks/useFinanzas';
import useProyect from '../../../hooks/useProyect';

const NewExpenseModal = ({ isOpen, onClose, onSubmit }) => {
  const { createGasto, loading: loadingFinanzas } = useFinanzas();
  const { getProyectos, proyectos, loading: loadingProyectos } = useProyect();

  const [formData, setFormData] = useState({
    date: new Date().toISOString().split('T')[0],
    time: new Date().toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit' }),
    category: '',
    description: '',
    amount: '',
    currency: 'MXN',
    projectId: '',
    projectName: '',
    projectCode: '',
    vendor: '',
    requestedBy: '',
    paymentMethod: 'Transferencia',
    priority: 'Media',
    departmentBudget: '',
    notes: '',
    receiptRequired: true,
    authorizedBy: '',
    dueDate: '',
    taxDeductible: true,
  });

  const [errors, setErrors] = useState({});

  const categories = [
    'Materiales','Viajes','Nómina','Equipos','Proveedores','Servicios',
    'Oficina','Marketing','Capacitación','Transporte','Mantenimiento','Otro'
  ];
  const currencies = ['MXN', 'USD', 'EUR'];
  const paymentMethods = ['Transferencia','Cheque','Efectivo','Tarjeta Corporativa','Facturación Directa'];
  const priorities = ['Baja','Media','Alta','Urgente'];
  const departmentBudgets = ['Operaciones','Proyectos','Administración','Ventas','Recursos Humanos','IT','General'];

  // Cargar proyectos solo al abrir el modal y si aún no los tenemos
  useEffect(() => {
    if (isOpen && Array.isArray(proyectos) && proyectos.length === 0) {
      getProyectos().catch(() => {});
    }
  }, [isOpen, getProyectos, proyectos]);

  // Opciones del select de proyectos (SOLO nombre visible)
  const projectOptions = useMemo(() => {
    const list = Array.isArray(proyectos) ? proyectos : [];
    return list.map((p) => {
      const id =
        p.id ??
        p.Id ??
        p._id ??
        p.proyectoId ??
        p.codigo ??
        p.code;

      const nombre =
        p.nombreProyecto ??
        p.nombre ??
        p.name ??
        p.titulo ??
        p.descripcion ??
        'Proyecto';

      const codigo = p.codigo ?? p.code ?? p.clave ?? p.projectCode ?? '';

      return {
        value: String(id ?? nombre), // fallback seguro por si no hay id
        label: nombre,               // ⇐ SOLO nombre
        raw: { id, nombre, codigo },
      };
    });
  }, [proyectos]);

  const validateForm = () => {
    const newErrors = {};
    if (!formData.date) newErrors.date = 'La fecha es requerida';
    if (!formData.category) newErrors.category = 'La categoría es requerida';
    if (!formData.description.trim()) newErrors.description = 'La descripción es requerida';

    const normalized = String(formData.amount ?? '').replace(/,/g, '');
    if (!normalized) newErrors.amount = 'El monto es requerido';
    else if (isNaN(parseFloat(normalized)) || parseFloat(normalized) <= 0)
      newErrors.amount = 'El monto debe ser un número válido mayor a 0';

    if (!formData.requestedBy.trim()) newErrors.requestedBy = 'El solicitante es requerido';
    if (!formData.projectId) newErrors.project = 'El proyecto es requerido';
    if (!formData.departmentBudget) newErrors.departmentBudget = 'El presupuesto departamental es requerido';

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleInputChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) setErrors((prev) => ({ ...prev, [field]: '' }));
  };

  // Selección de proyecto: guarda id, nombre y (auto) código
  const handleProjectChange = (value) => {
    const opt = projectOptions.find((o) => o.value === value);
    const id = opt?.raw?.id ?? value;
    const nombre = opt?.raw?.nombre ?? '';
    const codigo = opt?.raw?.codigo ?? '';
    setFormData((prev) => ({
      ...prev,
      projectId: String(id ?? ''),
      projectName: nombre,
      projectCode: codigo,
    }));
    if (errors.project) setErrors((prev) => ({ ...prev, project: '' }));
  };

  // Monto con limpieza suave
  const handleAmountChange = (e) => {
    const raw = e?.target?.value ?? '';
    const sanitized = raw.replace(/[^\d.,]/g, '');
    const normalized = sanitized.replace(/,/g, '').replace(/(\..*)\./g, '$1');
    setFormData((prev) => ({ ...prev, amount: normalized }));
    if (errors.amount) setErrors((prev) => ({ ...prev, amount: '' }));
  };

  const handleSubmit = async (e) => {
    e?.preventDefault();
    if (!validateForm()) return;

    const amountNumber = parseFloat(String(formData.amount).replace(/,/g, ''));
    const payload = {
      fecha: formData.date,
      hora: formData.time,
      categoria: formData.category,
      descripcion: formData.description,
      monto: amountNumber,
      moneda: formData.currency,
      idProyecto: formData.projectId ? Number(formData.projectId) : null,
      codigoProyecto: formData.projectCode || null,
      proveedor: formData.vendor || null,
      solicitadoPor: formData.requestedBy,
      metodoPago: formData.paymentMethod,
      prioridad: formData.priority,
      presupuestoDepartamento: formData.departmentBudget,
      notas: formData.notes || null,
      requiereComprobante: !!formData.receiptRequired,
      autorizadoPor: formData.authorizedBy || null,
      fechaLimitePago: formData.dueDate || null,
      deducibleImpuestos: !!formData.taxDeductible,
    };

    try {
      const created = await createGasto(payload);

      // 🔄 Normalizar respuesta para que la tabla pueda usarla directo
      let newExpense = created;

      // Si el backend envía { data: {...} } o algo similar
      if (created && typeof created === 'object') {
        if (created.data && !Array.isArray(created.data)) {
          newExpense = created.data;
        } else if (created.item) {
          newExpense = created.item;
        }
      }

      // Fallback: usamos el payload + algún id
      if (!newExpense || typeof newExpense !== 'object') {
        newExpense = {
          ...payload,
          id: created?.id ?? created?._id ?? Date.now(),
        };
      } else {
        // aseguramos campos mínimos que usa ExpenseTable
        newExpense = {
          ...newExpense,
          fecha: newExpense.fecha ?? payload.fecha,
          categoria: newExpense.categoria ?? payload.categoria,
          descripcion: newExpense.descripcion ?? payload.descripcion,
          monto: newExpense.monto ?? payload.monto,
          estado: newExpense.estado ?? newExpense.status ?? 'Pendiente',
          idProyecto: newExpense.idProyecto ?? payload.idProyecto,
          codigoProyecto: newExpense.codigoProyecto ?? payload.codigoProyecto,
        };
      }

      // ✅ Disparar evento global para que ExpenseTable lo agregue sin refrescar
      if (typeof window !== 'undefined') {
        window.dispatchEvent(
          new CustomEvent('gasto:created', {
            detail: newExpense,
          })
        );
      }

      // 👇 notificar al padre (por si el contenedor también necesita reaccionar)
      if (typeof onSubmit === 'function') {
        onSubmit(newExpense);
      }

      handleClose();
    } catch (err) {
      console.error('Error al crear gasto:', err);
    }
  };

  const handleClose = () => {
    setFormData({
      date: new Date().toISOString().split('T')[0],
      time: new Date().toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit' }),
      category: '',
      description: '',
      amount: '',
      currency: 'MXN',
      projectId: '',
      projectName: '',
      projectCode: '',
      vendor: '',
      requestedBy: '',
      paymentMethod: 'Transferencia',
      priority: 'Media',
      departmentBudget: '',
      notes: '',
      receiptRequired: true,
      authorizedBy: '',
      dueDate: '',
      taxDeductible: true,
    });
    setErrors({});
    onClose && onClose();
  };

  if (!isOpen) return null;
  const isBusy = loadingFinanzas || loadingProyectos;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-card rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-y-auto">
        {/* Header (mismo diseño) */}
        <div className="sticky top-0 bg-card border-b border-border p-6 rounded-t-lg">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-semibold text-foreground">Nuevo Gasto</h2>
              <p className="text-sm text-muted-foreground mt-1">
                Registra un nuevo gasto para autorización
              </p>
            </div>
            <Button variant="ghost" size="icon" onClick={handleClose} disabled={isBusy}>
              <Icon name="X" size={20} />
            </Button>
          </div>
        </div>

        {/* Formulario */}
        <form onSubmit={handleSubmit} className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Información del Gasto */}
            <div className="md:col-span-2">
              <h3 className="text-lg font-medium text-foreground mb-4 flex items-center">
                <Icon name="Receipt" size={20} className="mr-2" />
                Información del Gasto
              </h3>
            </div>

            <div>
              <Input
                type="date"
                label="Fecha"
                value={formData.date}
                onChange={(e) => handleInputChange('date', e.target.value)}
                error={errors?.date}
                required
                disabled={isBusy}
              />
            </div>

            <div>
              <Input
                type="time"
                label="Hora"
                value={formData.time}
                onChange={(e) => handleInputChange('time', e.target.value)}
                required
                disabled={isBusy}
              />
            </div>

            <div>
              <Select
                label="Categoría"
                value={formData.category}
                onChange={(value) => handleInputChange('category', value)}
                error={errors?.category}
                options={categories.map((c) => ({ value: c, label: c }))}
                placeholder="Selecciona una categoría"
                required
                disabled={isBusy}
              />
            </div>

            <div>
              <Select
                label="Prioridad"
                value={formData.priority}
                onChange={(value) => handleInputChange('priority', value)}
                options={priorities.map((p) => ({ value: p, label: p }))}
                required
                disabled={isBusy}
              />
            </div>

            <div className="md:col-span-2">
              <Input
                label="Descripción"
                placeholder="Ej. Compra de materiales para instalación HVAC"
                value={formData.description}
                onChange={(e) => handleInputChange('description', e.target.value)}
                error={errors?.description}
                required
                disabled={isBusy}
              />
            </div>

            {/* Información Financiera */}
            <div className="md:col-span-2 mt-6">
              <h3 className="text-lg font-medium text-foreground mb-4 flex items-center">
                <Icon name="DollarSign" size={20} className="mr-2" />
                Información Financiera
              </h3>
            </div>

            <div>
              <Input
                type="text"
                inputMode="decimal"
                label="Monto"
                placeholder="Ej. 2500.00"
                value={formData.amount}
                onChange={handleAmountChange}
                error={errors?.amount}
                required
                disabled={isBusy}
              />
            </div>

            <div>
              <Select
                label="Moneda"
                value={formData.currency}
                onChange={(value) => handleInputChange('currency', value)}
                options={currencies.map((c) => ({ value: c, label: c }))}
                required
                disabled={isBusy}
              />
            </div>

            <div>
              <Select
                label="Método de Pago"
                value={formData.paymentMethod}
                onChange={(value) => handleInputChange('paymentMethod', value)}
                options={paymentMethods.map((m) => ({ value: m, label: m }))}
                required
                disabled={isBusy}
              />
            </div>

            <div>
              <Select
                label="Presupuesto Departamental"
                value={formData.departmentBudget}
                onChange={(value) => handleInputChange('departmentBudget', value)}
                error={errors?.departmentBudget}
                options={departmentBudgets.map((d) => ({ value: d, label: d }))}
                placeholder="Selecciona un departamento"
                required
                disabled={isBusy}
              />
            </div>

            {/* Información del Proyecto */}
            <div className="md:col-span-2 mt-6">
              <h3 className="text-lg font-medium text-foreground mb-4 flex items-center">
                <Icon name="Folder" size={20} className="mr-2" />
                Información del Proyecto
              </h3>
            </div>

            <div>
              <Select
                label="Proyecto"
                value={formData.projectId}
                onChange={handleProjectChange}
                error={errors?.project}
                options={projectOptions}
                placeholder={loadingProyectos ? 'Cargando proyectos…' : 'Selecciona un proyecto'}
                required
                disabled={isBusy || loadingProyectos}
              />
            </div>

            <div>
              <Input
                label="Código de Proyecto"
                placeholder="Se completa automáticamente"
                value={formData.projectCode}
                onChange={(e) => handleInputChange('projectCode', e.target.value)}
                readOnly
                disabled
              />
            </div>

            <div>
              <Input
                label="Proveedor/Vendor"
                placeholder="Ej. Materiales Industriales SA"
                value={formData.vendor}
                onChange={(e) => handleInputChange('vendor', e.target.value)}
                disabled={isBusy}
              />
            </div>

            <div>
              <Input
                label="Solicitado por"
                placeholder="Ej. Carlos Mendoza"
                value={formData.requestedBy}
                onChange={(e) => handleInputChange('requestedBy', e.target.value)}
                error={errors?.requestedBy}
                required
                disabled={isBusy}
              />
            </div>

            {/* Información Adicional */}
            <div className="md:col-span-2 mt-6">
              <h3 className="text-lg font-medium text-foreground mb-4 flex items-center">
                <Icon name="FileText" size={20} className="mr-2" />
                Información Adicional
              </h3>
            </div>

            <div>
              <Input
                label="Autorizado por"
                placeholder="Ej. Ana García"
                value={formData.authorizedBy}
                onChange={(e) => handleInputChange('authorizedBy', e.target.value)}
                disabled={isBusy}
              />
            </div>

            <div>
              <Input
                type="date"
                label="Fecha Límite de Pago"
                value={formData.dueDate}
                onChange={(e) => handleInputChange('dueDate', e.target.value)}
                disabled={isBusy}
              />
            </div>

            <div className="md:col-span-2">
              <div className="flex items-center gap-6">
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={formData.receiptRequired}
                    onChange={(e) => handleInputChange('receiptRequired', e.target.checked)}
                    className="h-4 w-4 text-primary focus:ring-primary border-border rounded"
                    disabled={isBusy}
                  />
                  <span className="text-sm text-foreground">Comprobante requerido</span>
                </label>

                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={formData.taxDeductible}
                    onChange={(e) => handleInputChange('taxDeductible', e.target.checked)}
                    className="h-4 w-4 text-primary focus:ring-primary border-border rounded"
                    disabled={isBusy}
                  />
                  <span className="text-sm text-foreground">Deducible de impuestos</span>
                </label>
              </div>
            </div>

            <div className="md:col-span-2">
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">Notas Adicionales</label>
                <textarea
                  className="w-full px-3 py-2 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent resize-none bg-background text-foreground"
                  rows="4"
                  placeholder="Información adicional sobre el gasto..."
                  value={formData.notes}
                  onChange={(e) => handleInputChange('notes', e.target.value)}
                  disabled={isBusy}
                />
              </div>
            </div>
          </div>

          <div className="flex items-center justify-end space-x-4 mt-8 pt-6 border-t border-border">
            <Button type="button" variant="outline" onClick={handleClose} disabled={isBusy}>
              Cancelar
            </Button>
            <Button
              type="submit"
              variant="default"
              iconName={isBusy ? undefined : 'Plus'}
              iconPosition="left"
              disabled={isBusy}
              loading={isBusy}
            >
              {isBusy ? 'Guardando…' : 'Registrar Gasto'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default NewExpenseModal;
