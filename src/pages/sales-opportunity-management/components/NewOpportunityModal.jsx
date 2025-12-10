import React, { useState, useEffect } from 'react';
import Icon from '../../../components/AppIcon';
import Button from '../../../components/ui/Button';
import Input from '../../../components/ui/Input';
import Select from '../../../components/ui/Select';
import useClient from '../../../hooks/useClient';
import usePerson from '../../../hooks/usePerson';
import useProyecto from '../../../hooks/useProyect';

const NewOpportunityModal = ({ isOpen, onClose, onCreateOpportunity, error }) => {
  const [formData, setFormData] = useState({
    clientId: '',
    projectId: '',
    contactChannel: 'whatsapp',
    projectType: 'project',
    priority: 'medium',
    contactPerson: '',
    phone: '',
    email: '',
    projectDescription: '',
    location: '',
    estimatedBudget: '',
    timeline: '',
    salesRep: 'María García',
    notes: ''
  });
  // Proyectos
  const { proyectos, getProyectos, loading: loadingProyectos, error: errorProyectos } = useProyecto();

  // Filtrar proyectos por cliente seleccionado
  const proyectosCliente = Array.isArray(proyectos)
    ? proyectos.filter(p => {
        const clienteId = p?.cliente?.id || p?.client?.id;
        return clienteId === formData.clientId;
      })
    : [];

  // Opciones para el select de proyectos
  const proyectoOptions = proyectosCliente.map(p => ({
    value: p.id || p._id,
    label: p.nombre || p.name || p.nombreProyecto || 'Proyecto sin nombre'
  }));

  const { clients, getClients, loading: loadingClients, error: errorClients } = useClient();
 
  const { departmentPersons, getPersonsByDepartment, loading: loadingSalesReps, error: errorSalesReps } = usePerson();

  useEffect(() => {
    if (isOpen) {
      getClients();
      getPersonsByDepartment('Ventas');
      getProyectos();
    }
  }, [isOpen]);
  // Limpiar datos de proyecto solo si el cliente realmente cambió (sin ciclo infinito)
  const prevClientIdRef = React.useRef('');
  useEffect(() => {
    if (isOpen && prevClientIdRef.current !== formData.clientId) {
      setFormData(prev => ({
        ...prev,
        projectId: '',
        projectType: 'project',
        projectDescription: '',
        location: '',
        estimatedBudget: '',
        timeline: ''
      }));
      prevClientIdRef.current = formData.clientId;
    }
  }, [isOpen, formData.clientId]);

  // Cuando selecciona un proyecto, autollenar detalles
  useEffect(() => {
    if (!formData.projectId) return;
    const proyecto = proyectosCliente.find(p => (p.id || p._id) === formData.projectId);
    if (proyecto) {
      // Formatear ubicación correctamente
      let ubicacionTexto = '';
      if (proyecto.ubicacion) {
        if (typeof proyecto.ubicacion === 'string') {
          ubicacionTexto = proyecto.ubicacion;
        } else if (typeof proyecto.ubicacion === 'object') {
          const { direccion = '', municipio = '', estado = '' } = proyecto.ubicacion;
          ubicacionTexto = `${direccion}${municipio ? ', ' + municipio : ''}${estado ? ', ' + estado : ''}`.trim();
        }
      }
      
      setFormData(prev => ({
        ...prev,
        projectType: proyecto.tipoProyecto || proyecto.type || 'project',
        projectDescription: proyecto.descripcion || proyecto.description || proyecto.descripcionProyecto || '',
        location: ubicacionTexto || proyecto.location || '',
        estimatedBudget: String(proyecto.presupuesto?.total || proyecto.presupuesto || ''),
        timeline: proyecto.cronograma?.fechaFin
          ? `${proyecto.cronograma?.fechaInicio || ''} - ${proyecto.cronograma?.fechaFin}`
          : (typeof proyecto.cronograma === 'string' ? proyecto.cronograma : '')
      }));
    }
    // Solo se ejecuta cuando cambia projectId
    // eslint-disable-next-line
  }, [formData.projectId]);

  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Opciones de ejecutivos de ventas
  const salesRepOptions = Array.isArray(departmentPersons) && departmentPersons.length > 0
  ? departmentPersons.map(emp => ({ value: emp.nombreCompleto || emp.nombre || emp.name || emp.fullName || emp.email, label: emp.nombreCompleto || emp.nombre || emp.name || emp.fullName || emp.email }))
    : [];

  const handleInputChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));

    // Clear error when user starts typing
    if (errors?.[field]) {
      setErrors(prev => ({
        ...prev,
        [field]: ''
      }));
    }
  };

  const validateForm = () => {
    const newErrors = {};


    if (!formData?.clientId?.trim()) {
      newErrors.clientId = 'El cliente es requerido';
    }
    if (!formData?.projectId?.trim()) {
      newErrors.projectId = 'El proyecto es requerido';
    }

    if (!formData?.contactPerson?.trim()) {
      newErrors.contactPerson = 'La persona de contacto es requerida';
    }

    if (!formData?.phone?.trim()) {
      newErrors.phone = 'El teléfono es requerido';
    }

    if (!formData?.email?.trim()) {
      newErrors.email = 'El email es requerido';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/?.test(formData?.email)) {
      newErrors.email = 'El formato del email no es válido';
    }

    if (!formData?.projectDescription?.trim()) {
      newErrors.projectDescription = 'La descripción del proyecto es requerida';
    }

    if (!formData?.location?.trim()) {
      newErrors.location = 'La ubicación es requerida';
    }

    if (!String(formData?.estimatedBudget).trim()) {
      newErrors.estimatedBudget = 'El presupuesto estimado es requerido';
    }

    if (!formData?.timeline?.trim()) {
      newErrors.timeline = 'El cronograma es requerido';
    }

    setErrors(newErrors);
    return Object.keys(newErrors)?.length === 0;
  };

  const generateOpportunityId = () => {
    const timestamp = Date.now();
    const random = Math.floor(Math.random() * 1000);
    return `SALES-${timestamp?.toString()?.slice(-6)}${random?.toString()?.padStart(3, '0')}`;
  };

  const handleSubmit = async (e) => {
    e?.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);

    try {
      // Simulate API call delay
      await new Promise(resolve => setTimeout(resolve, 1000));

      const selectedClient = clients?.find(c => c.id === formData?.clientId || c._id === formData?.clientId);
      const newOpportunity = {
        clienteId: formData?.clientId,
        proyectoId: formData?.projectId,
        nombreCliente: selectedClient?.companyName || selectedClient?.empresa || selectedClient?.nombre || selectedClient?.name || '',
        canalContacto: formData?.contactChannel,
        tipoProyecto: formData?.projectType,
        prioridad: formData?.priority,
        personaContacto: formData?.contactPerson?.trim(),
        telefono: formData?.phone?.trim(),
        email: formData?.email?.trim(),
        descripcionProyecto: formData?.projectDescription?.trim(),
        ubicacion: formData?.location?.trim(),
        presupuestoEstimado: String(formData?.estimatedBudget).trim(),
        cronogramaEsperado: formData?.timeline?.trim(),
        ejecutivoVentas: departmentPersons?.find(emp => (emp.nombreCompleto || emp.nombre || emp.name || emp.fullName || emp.email) === formData?.salesRep)?.nombreCompleto || formData?.salesRep,
        notasAdicionales: formData?.notes?.trim() || `Nueva oportunidad registrada por ${formData?.salesRep}`
      };

      onCreateOpportunity?.(newOpportunity);
      handleClose();
    } catch (error) {
      console.error('Error creating opportunity:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    setFormData({
      clientId: '',
      contactChannel: 'whatsapp',
      projectType: 'project',
      priority: 'medium',
      contactPerson: '',
      phone: '',
      email: '',
      projectDescription: '',
      location: '',
      estimatedBudget: '',
      timeline: '',
      salesRep: 'María García',
      notes: ''
    });
    setErrors({});
    setIsSubmitting(false);
    onClose?.();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black/50 transition-opacity" 
        onClick={handleClose}
      />
      {/* Modal */}
      <div className="relative bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <div>
            <h2 className="text-xl font-semibold text-foreground">Nueva Oportunidad de Venta</h2>
            <p className="text-sm text-muted-foreground mt-1">
              Registra una nueva oportunidad comercial
            </p>
          </div>
          <Button
            variant="ghost"
            size="sm"
            iconName="X"
            onClick={handleClose}
            disabled={isSubmitting}
          />
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="overflow-y-auto max-h-[calc(90vh-140px)]">
          <div className="p-6 space-y-6">
            {/* Basic Information */}
            <div>
              <h3 className="text-lg font-medium text-foreground mb-4 flex items-center">
                <Icon name="Building2" size={18} className="mr-2" />
                Información Básica
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">
                    Cliente <span className="text-destructive">*</span>
                  </label>
                  <Select
                    value={formData?.clientId}
                    onChange={(value) => handleInputChange('clientId', value)}
                    options={
                      Array.isArray(clients) && clients.length > 0
                        ? clients.map(c => ({
                            value: c.id || c._id,
                            label: c.companyName || c.empresa || 'Sin nombre'
                          }) )
                        : []
                    }
                    placeholder={
                      loadingClients
                        ? 'Cargando clientes...'
                        : (clients.length === 0 ? 'No hay clientes registrados' : 'Selecciona un cliente')
                    }
                    loading={loadingClients}
                    error={errors?.clientId}
                    searchable
                  />
                  {errorClients && <div className="text-xs text-destructive">Error al cargar clientes</div>}
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">
                    Proyecto <span className="text-destructive">*</span>
                  </label>
                  <Select
                    value={formData?.projectId}
                    onChange={(value) => handleInputChange('projectId', value)}
                    options={proyectoOptions}
                    placeholder={formData.clientId ? (loadingProyectos ? 'Cargando proyectos...' : (proyectoOptions.length === 0 ? 'No hay proyectos para este cliente' : 'Selecciona un proyecto')) : 'Selecciona un cliente primero'}
                    loading={loadingProyectos}
                    error={errors?.projectId}
                    searchable
                    disabled={!formData.clientId}
                  />
                  {errorProyectos && <div className="text-xs text-destructive">Error al cargar proyectos</div>}
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">
                    Canal de Contacto <span className="text-destructive">*</span>
                  </label>
                  <Select
                    value={formData?.contactChannel}
                    onChange={(value) => handleInputChange('contactChannel', value)}
                    options={[
                      { value: 'facebook', label: 'Facebook' },
                      { value: 'instagram', label: 'Instagram' },
                      { value: 'whatsapp', label: 'WhatsApp' },
                      { value: 'email', label: 'Email' },
                      { value: 'phone', label: 'Teléfono' }
                    ]}
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">
                    Tipo de Proyecto <span className="text-destructive">*</span>
                  </label>
                  <Select
                    value={formData?.projectType}
                    onChange={(value) => handleInputChange('projectType', value)}
                    options={[
                      { value: 'project', label: 'Proyecto Completo' },
                      { value: 'piece', label: 'Pieza/Servicio' }
                    ]}
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">
                    Prioridad <span className="text-destructive">*</span>
                  </label>
                  <Select
                    value={formData?.priority}
                    onChange={(value) => handleInputChange('priority', value)}
                    options={[
                      { value: 'urgent', label: 'Urgente' },
                      { value: 'high', label: 'Alta' },
                      { value: 'medium', label: 'Media' },
                      { value: 'low', label: 'Baja' }
                    ]}
                  />
                </div>
              </div>
            </div>

            {/* Contact Information */}
            <div>
              <h3 className="text-lg font-medium text-foreground mb-4 flex items-center">
                <Icon name="Users" size={18} className="mr-2" />
                Información de Contacto
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Input
                  label="Persona de Contacto"
                  required
                  value={formData?.contactPerson}
                  onChange={(e) => handleInputChange('contactPerson', e?.target?.value)}
                  error={errors?.contactPerson}
                  placeholder="Ej. Ing. Carlos Rodriguez"
                />

                <Input
                  label="Teléfono"
                  required
                  value={formData?.phone}
                  onChange={(e) => {
                    // Solo permitir números y máximo 10 dígitos
                    const val = e?.target?.value.replace(/[^0-9]/g, '').slice(0, 10);
                    handleInputChange('phone', val);
                  }}
                  error={errors?.phone}
                  placeholder="Ej. 5512345678"
                  maxLength={10}
                  inputMode="numeric"
                  autoComplete="tel"
                />

                <div className="md:col-span-2">
                  <Input
                    label="Email"
                    type="email"
                    required
                    value={formData?.email}
                    onChange={(e) => handleInputChange('email', e?.target?.value)}
                    error={errors?.email}
                    placeholder="contacto@empresa.com"
                  />
                  {error?.status === 409 && error?.data?.error?.includes('correo') && (
                    <p className="text-xs text-destructive mt-1">Correo registrado</p>
                  )}
                  {error?.status === 409 && error?.data?.error?.includes('correo') && (
                    <p className="text-xs text-destructive mt-1">Correo registrado</p>
                  )}
                </div>
              </div>
            </div>

            {/* Project Details */}
            <div>
              <h3 className="text-lg font-medium text-foreground mb-4 flex items-center">
                <Icon name="FileText" size={18} className="mr-2" />
                Detalles del Proyecto
              </h3>
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-foreground">
                    Descripción del Proyecto <span className="text-destructive">*</span>
                  </label>
                  <textarea
                    className="mt-2 flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 min-h-[100px]"
                    value={formData?.projectDescription}
                    onChange={(e) => handleInputChange('projectDescription', e?.target?.value)}
                    placeholder="Describe el proyecto o servicio solicitado..."
                  />
                  {errors?.projectDescription && (
                    <p className="text-sm text-destructive mt-1">{errors?.projectDescription}</p>
                  )}
                </div>

                <Input
                  label="Ubicación"
                  required
                  value={formData?.location}
                  onChange={(e) => handleInputChange('location', e?.target?.value)}
                  error={errors?.location}
                  placeholder="Ciudad, Estado"
                />

                <Input
                  label="Presupuesto Estimado (MXN)"
                  type="number"
                  required
                  value={formData?.estimatedBudget}
                  onChange={(e) => handleInputChange('estimatedBudget', e?.target?.value)}
                  error={errors?.estimatedBudget}
                  placeholder="0"
                  min="0"
                  step="0.01"
                />

                <Input
                  label="Cronograma Esperado"
                  required
                  value={formData?.timeline}
                  onChange={(e) => handleInputChange('timeline', e?.target?.value)}
                  error={errors?.timeline}
                  placeholder="Ej. 3 meses, 8 semanas"
                />
              </div>
            </div>

            {/* Assignment */}
            <div>
              <h3 className="text-lg font-medium text-foreground mb-4 flex items-center">
                <Icon name="UserCheck" size={18} className="mr-2" />
                Asignación
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">
                    Ejecutivo de Ventas <span className="text-destructive">*</span>
                  </label>
                  <Select
                    value={formData?.salesRep}
                    onChange={(value) => handleInputChange('salesRep', value)}
                    options={salesRepOptions}
                    loading={loadingSalesReps}
                    error={errorSalesReps}
                    placeholder={loadingSalesReps ? 'Cargando ejecutivos...' : (salesRepOptions.length === 0 ? 'No hay ejecutivos de ventas' : 'Selecciona ejecutivo')}
                    searchable
                   />
                </div>

                <div>
                  <label className="text-sm font-medium text-foreground">Notas Adicionales</label>
                  <textarea
                    className="mt-2 flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 min-h-[80px]"
                    value={formData?.notes}
                    onChange={(e) => handleInputChange('notes', e?.target?.value)}
                    placeholder="Información adicional relevante..."
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-end space-x-4 p-6 border-t bg-gray-50 dark:bg-gray-800/50">
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              disabled={isSubmitting}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting}
              iconName={isSubmitting ? "Loader2" : "Plus"}
              iconPosition="left"
              className={isSubmitting ? "animate-spin" : ""}
            >
              {isSubmitting ? 'Creando...' : 'Crear Oportunidad'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default NewOpportunityModal;