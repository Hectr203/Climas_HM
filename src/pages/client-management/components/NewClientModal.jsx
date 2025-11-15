import React, { useState } from 'react';
import useClient from '../../../hooks/useClient';
import Icon from '../../../components/AppIcon';
import Button from '../../../components/ui/Button';
import Input from '../../../components/ui/Input';
import Select from '../../../components/ui/Select';
import { useNotifications } from '../../../context/NotificationContext.jsx';
import { useEstados, useMunicipios } from '../../../hooks/useEstado';

const NewClientModal = ({ isOpen, onClose, onSubmit, mode = 'create', initialData = null }) => {
  const { createClient, editClient } = useClient();
  const { showSuccess, showError } = useNotifications();
  const [formData, setFormData] = useState({
    companyName: '',
    contactPerson: '',
    email: '',
    phone: '',
    industry: '',
    status: 'Activo',
    relationshipHealth: 'Buena',
    rfc: '',
    clientSince: new Date()?.toISOString()?.split('T')?.[0],
    totalProjects: 0,
    activeContracts: 0,
    totalValue: 0,
    lastContact: new Date()?.toISOString()?.split('T')?.[0],
    nextFollowUp: '',
    website: '',
    notes: '',
    estadoEmpresa: '',
    municipioEmpresa: '',
    ubicacionUrl: '',
    estadoDireccion: '',
    municipioDireccion: '',
    direccionCompleta: ''
  });

  // Estado para contactos adicionales (máximo 3 adicionales)
  const [additionalContacts, setAdditionalContacts] = useState([]);

  // Hooks para estados y municipios
  const { estados, loading: loadingEstados, error: errorEstados } = useEstados();
  const { municipios: municipiosEmpresa, loading: loadingMunicipiosEmpresa, error: errorMunicipiosEmpresa } = useMunicipios(formData.estadoEmpresa);
  const { municipios: municipiosDireccion, loading: loadingMunicipiosDireccion, error: errorMunicipiosDireccion } = useMunicipios(formData.estadoDireccion);

  React.useEffect(() => {
    if (isOpen && mode === 'edit' && initialData) {
      setFormData({
        companyName: initialData.companyName || initialData.empresa || '',
        contactPerson: initialData.contactPerson || initialData.contacto || '',
        email: initialData.email || '',
        phone: initialData.phone || initialData.telefono || '',
        industry: initialData.industry || initialData.industria || '',
        status: initialData.status || initialData.estado || 'Activo',
        relationshipHealth: initialData.relationshipHealth || initialData.relacion || 'Buena',
        rfc: initialData.rfc || '',
        clientSince: initialData.clientSince || initialData.fechaDesde || '',
        totalProjects: initialData.totalProjects || 0,
        activeContracts: initialData.activeContracts || 0,
        totalValue: initialData.totalValue || 0,
        lastContact: initialData.lastContact || '',
        nextFollowUp: initialData.nextFollowUp || initialData.proximoSeguimiento || '',
        website: initialData.website || initialData.sitioWeb || '',
        notes: initialData.notes || initialData.notas || '',
        estadoEmpresa: initialData.ubicacionEmpre?.estado || '',
        municipioEmpresa: initialData.ubicacionEmpre?.municipio || '',
        ubicacionUrl: initialData.ubicacionUrl || '',
        estadoDireccion: (initialData.ubicacion && initialData.ubicacion.estado) || '',
        municipioDireccion: (initialData.ubicacion && initialData.ubicacion.municipio) || '',
        direccionCompleta: initialData.address || (initialData.ubicacion && initialData.ubicacion.direccion) || ''
      });
      
      // Cargar contactos adicionales si existen
      if (initialData.contactos && Array.isArray(initialData.contactos) && initialData.contactos.length > 1) {
        // El primer contacto es el principal, los demás son adicionales
        const extraContacts = initialData.contactos.slice(1);
        setAdditionalContacts(extraContacts);
      } else {
        setAdditionalContacts([]);
      }
    } else if (isOpen && mode === 'create') {
      // Limpiar contactos adicionales en modo create
      setAdditionalContacts([]);
    }
  }, [isOpen, mode, initialData]);

  const [errors, setErrors] = useState({});

  const industries = [
    'Manufactura',
    'Comercial',
    'Hospitalidad',
    'Educación',
    'Salud',
    'Gobierno',
    'Retail',
    'Oficinas',
    'Residencial',
    'Industrial',
    'Otro'
  ];

  const locations = [
    'Monterrey',
    'Ciudad de México',
    'Guadalajara',
    'Tijuana',
    'Puebla',
    'León',
    'Querétaro',
    'Mérida',
    'Cancún',
    'Otro'
  ];

  const statusOptions = [
    'Activo',
    'Pendiente',
    'Inactivo',
    'Prospecto'
  ];

  const relationshipHealthOptions = [
    'Excelente',
    'Buena',
    'Regular',
    'Mala'
  ];

  const validateForm = () => {
    const newErrors = {};

    if (!formData?.companyName?.trim()) {
      newErrors.companyName = 'El nombre de la empresa es requerido';
    } else if (formData.companyName.length < 3) {
      newErrors.companyName = 'El nombre debe tener al menos 3 caracteres';
    }

    if (!formData?.contactPerson?.trim()) {
      newErrors.contactPerson = 'La persona de contacto es requerida';
    } else if (formData.contactPerson.length < 3) {
      newErrors.contactPerson = 'El nombre debe tener al menos 3 caracteres';
    }

    if (!formData?.email?.trim()) {
      newErrors.email = 'El email es requerido';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/?.test(formData?.email)) {
      newErrors.email = 'El formato del email no es válido';
    }

    if (!formData?.phone?.trim()) {
      newErrors.phone = 'El teléfono es requerido';
    } else if (!/^\d{10}$/?.test(formData?.phone)) {
      newErrors.phone = 'El teléfono debe tener exactamente 10 dígitos';
    }

    if (!formData?.industry) {
      newErrors.industry = 'La industria es requerida';
    }

    if (!formData?.rfc?.trim()) {
      newErrors.rfc = 'El RFC es requerido';
    } else if (!/^[A-Z&Ñ]{3,4}[0-9]{6}[A-Z0-9]{3}$/?.test(formData?.rfc)) {
      newErrors.rfc = 'El formato del RFC no es válido (Ej. ABC123456XYZ)';
    }

    // Validación para sitio web (opcional pero si se llena debe ser válido)
    if (formData?.website?.trim() && !/^https?:\/\/.+\..+/?.test(formData?.website)) {
      newErrors.website = 'El formato del sitio web no es válido (debe comenzar con http:// o https://)';
    }

    // Validación para ubicación empresa
    if (!formData?.estadoEmpresa?.trim()) {
      newErrors.estadoEmpresa = 'El estado de la ubicación de la empresa es requerido';
    }

    if (!formData?.municipioEmpresa?.trim()) {
      newErrors.municipioEmpresa = 'El municipio de la ubicación de la empresa es requerido';
    }

    // Validación para dirección del cliente
    if (!formData?.estadoDireccion?.trim()) {
      newErrors.estadoDireccion = 'El estado de la dirección es requerido';
    }

    if (!formData?.municipioDireccion?.trim()) {
      newErrors.municipioDireccion = 'El municipio de la dirección es requerido';
    }

    if (!formData?.direccionCompleta?.trim()) {
      newErrors.direccionCompleta = 'La dirección completa es requerida';
    } else if (formData.direccionCompleta.length < 10) {
      newErrors.direccionCompleta = 'La dirección debe ser más específica (mínimo 10 caracteres)';
    }

    // Validación para ubicacionUrl (opcional pero si se llena debe ser válida)
    if (formData?.ubicacionUrl?.trim() && !/^https?:\/\/.+\..+/?.test(formData?.ubicacionUrl)) {
      newErrors.ubicacionUrl = 'El formato de la URL no es válido (debe comenzar con http:// o https://)';
    }

    // Validación para contactos adicionales
    additionalContacts.forEach((contact, index) => {
      const hasAnyField = contact.contacto?.trim() || contact.email?.trim() || contact.telefono?.trim();
      
      if (hasAnyField) {
        // Si tiene algún campo, todos deben estar completos
        if (!contact.contacto?.trim()) {
          newErrors[`additionalContact_${index}_name`] = 'El nombre es requerido si agregas este contacto';
        } else if (contact.contacto.length < 3) {
          newErrors[`additionalContact_${index}_name`] = 'El nombre debe tener al menos 3 caracteres';
        }
        
        if (!contact.email?.trim()) {
          newErrors[`additionalContact_${index}_email`] = 'El email es requerido si agregas este contacto';
        } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/?.test(contact.email)) {
          newErrors[`additionalContact_${index}_email`] = 'El formato del email no es válido';
        }
        
        if (!contact.telefono?.trim()) {
          newErrors[`additionalContact_${index}_phone`] = 'El teléfono es requerido si agregas este contacto';
        } else if (!/^\d{10}$/?.test(contact.telefono)) {
          newErrors[`additionalContact_${index}_phone`] = 'El teléfono debe tener exactamente 10 dígitos';
        }
      }
    });

    setErrors(newErrors);
    return Object.keys(newErrors)?.length === 0;
  };

  const handleInputChange = (field, value) => {
    // Validación y formateo para teléfono
    if (field === 'phone') {
      // Eliminar caracteres no numéricos
      let cleanValue = value.replace(/\D/g, '');
      // Limitar a 10 dígitos
      cleanValue = cleanValue.slice(0, 10);
      setFormData(prev => ({
        ...prev,
        [field]: cleanValue
      }));
    } 
    // Validación para RFC - solo mayúsculas y alfanumérico
    else if (field === 'rfc') {
      const cleanValue = value.toUpperCase().replace(/[^A-ZÑ&0-9]/g, '').slice(0, 13);
      setFormData(prev => ({
        ...prev,
        [field]: cleanValue
      }));
    }
    // Validación para nombre de empresa - limitar caracteres
    else if (field === 'companyName') {
      const cleanValue = value.slice(0, 100);
      setFormData(prev => ({
        ...prev,
        [field]: cleanValue
      }));
    }
    // Validación para persona de contacto
    else if (field === 'contactPerson') {
      const cleanValue = value.slice(0, 100);
      setFormData(prev => ({
        ...prev,
        [field]: cleanValue
      }));
    }
    // Validación para dirección completa
    else if (field === 'direccionCompleta') {
      const cleanValue = value.slice(0, 200);
      setFormData(prev => ({
        ...prev,
        [field]: cleanValue
      }));
    }
    // Validación para sitio web
    else if (field === 'website') {
      const cleanValue = value.slice(0, 150);
      setFormData(prev => ({
        ...prev,
        [field]: cleanValue
      }));
    }
    // Validación para ubicacionUrl
    else if (field === 'ubicacionUrl') {
      const cleanValue = value.slice(0, 200);
      setFormData(prev => ({
        ...prev,
        [field]: cleanValue
      }));
    }
    // Otros campos sin validación especial
    else {
      setFormData(prev => ({
        ...prev,
        [field]: value
      }));
    }

    // Clear error when user starts typing
    if (errors?.[field]) {
      setErrors(prev => ({
        ...prev,
        [field]: ''
      }));
    }
  };

  // Funciones para manejar contactos adicionales
  const addAdditionalContact = () => {
    if (additionalContacts.length < 3) {
      setAdditionalContacts([...additionalContacts, { contacto: '', email: '', telefono: '' }]);
    }
  };

  const removeAdditionalContact = (index) => {
    const newContacts = additionalContacts.filter((_, i) => i !== index);
    setAdditionalContacts(newContacts);
    // Limpiar errores relacionados con este contacto
    const newErrors = { ...errors };
    delete newErrors[`additionalContact_${index}_name`];
    delete newErrors[`additionalContact_${index}_email`];
    delete newErrors[`additionalContact_${index}_phone`];
    setErrors(newErrors);
  };

  const handleAdditionalContactChange = (index, field, value) => {
    const newContacts = [...additionalContacts];
    
    // Validación y formateo
    if (field === 'telefono') {
      value = value.replace(/\D/g, '').slice(0, 10);
    } else if (field === 'contacto') {
      value = value.slice(0, 100);
    } else if (field === 'email') {
      value = value.slice(0, 100);
    }
    
    newContacts[index][field] = value;
    setAdditionalContacts(newContacts);
    
    // Limpiar error si existe
    const errorKey = `additionalContact_${index}_${field === 'contacto' ? 'name' : field === 'telefono' ? 'phone' : 'email'}`;
    if (errors[errorKey]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[errorKey];
        return newErrors;
      });
    }
  };

  const handleSubmit = async (e) => {
    e?.preventDefault();
    if (!validateForm()) {
      return;
    }
    
    // Construir array de contactos: principal + adicionales que estén completos
    const contactosCompletos = additionalContacts.filter(c => {
      // Solo incluir contactos que tengan los 3 campos completos
      return c.contacto?.trim() && c.email?.trim() && c.telefono?.trim();
    });
    
    const contactos = [
      {
        contacto: formData.contactPerson,
        email: formData.email,
        telefono: formData.phone
      },
      ...contactosCompletos
    ];
    
    const clientData = {
      empresa: formData.companyName,
      contactos: contactos,
      contacto: formData.contactPerson,
      email: formData.email,
      telefono: formData.phone,
      industria: formData.industry,
      ubicacionEmpre: {
        estado: formData.estadoEmpresa,
        municipio: formData.municipioEmpresa,
      },
      ubicacionUrl: formData.ubicacionUrl,
      ubicacion: {
        estado: formData.estadoDireccion,
        municipio: formData.municipioDireccion,
        direccion: formData.direccionCompleta
      },
      rfc: formData.rfc?.toUpperCase(),
      sitioWeb: formData.website,
      estado: formData.status,
      relacion: formData.relationshipHealth,
      fechaDesde: formData.clientSince,
      proximoSeguimiento: formData.nextFollowUp,
      notas: formData.notes,
      totalProjects: parseInt(formData.totalProjects) || 0,
      activeContracts: parseInt(formData.activeContracts) || 0,
      totalValue: parseInt(formData.totalValue) || 0,
      lastContact: formData.lastContact
    };
    console.log('Datos enviados al servicio:', clientData);
    if (mode === 'edit' && initialData && initialData.id) {
      // Actualizar cliente usando la función pasada por props
      const res = await editClient(initialData.id, clientData);
      if (res && res.success) {
        showSuccess(`Cliente "${clientData.empresa}" actualizado exitosamente.`);
        handleClose();
      } else {
        showError('Error al actualizar el cliente');
      }
    } else {
      // Crear cliente usando la función pasada por props
      const res = await createClient(clientData);
      if (res && res.success) {
        showSuccess(`Cliente "${clientData.empresa}" guardado exitosamente.`);
        handleClose();
      } else {
        showError('Error al guardar el cliente');
      }
    }
  };

  const handleClose = () => {
    setFormData({
      companyName: '',
      contactPerson: '',
      email: '',
      phone: '',
      industry: '',
      status: 'Activo',
      relationshipHealth: 'Buena',
      rfc: '',
      clientSince: new Date()?.toISOString()?.split('T')?.[0],
      totalProjects: 0,
      activeContracts: 0,
      totalValue: 0,
      lastContact: new Date()?.toISOString()?.split('T')?.[0],
      nextFollowUp: '',
      website: '',
      notes: '',
      estadoEmpresa: '',
      municipioEmpresa: '',
      ubicacionUrl: '',
      estadoDireccion: '',
      municipioDireccion: '',
      direccionCompleta: ''
    });
    setAdditionalContacts([]);
    setErrors({});
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-card rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-card border-b border-border p-6 rounded-t-lg">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-semibold text-foreground">
                {mode === 'edit' ? 'Editar Cliente' : 'Nuevo Cliente'}
              </h2>
              <p className="text-sm text-muted-foreground mt-1">
                {mode === 'edit' ? 'Actualiza la información del cliente' : 'Agrega un nuevo cliente al sistema'}
              </p>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={handleClose}
            >
              <Icon name="X" size={20} />
            </Button>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Información Básica */}
            <div className="md:col-span-2">
              <h3 className="text-lg font-medium text-foreground mb-4 flex items-center">
                <Icon name="Building2" size={20} className="mr-2" />
                Información Básica
              </h3>
            </div>

            <div>
              <Input
                label="Nombre de la Empresa"
                placeholder="Ej. Grupo Industrial Monterrey"
                value={formData?.companyName}
                onChange={(e) => handleInputChange('companyName', e?.target?.value)}
                error={errors?.companyName}
                required
              />
            </div>

            {/* Contacto Principal */}
            <div className="md:col-span-2 mt-6">
              <h3 className="text-lg font-medium text-foreground mb-2 flex items-center">
                <Icon name="User" size={20} className="mr-2" />
                Contacto Principal
              </h3>
              <p className="text-sm text-muted-foreground mb-4">
                Información del contacto principal (obligatorio)
              </p>
            </div>

            <div>
              <Input
                label="Persona de Contacto"
                placeholder="Ej. Carlos Hernández"
                value={formData?.contactPerson}
                onChange={(e) => handleInputChange('contactPerson', e?.target?.value)}
                error={errors?.contactPerson}
                required
              />
            </div>

            <div>
              <Input
                type="email"
                label="Email"
                placeholder="Ej. carlos.hernandez@empresa.com.mx"
                value={formData?.email}
                onChange={(e) => handleInputChange('email', e?.target?.value)}
                error={errors?.email}
                required
              />
            </div>

            <div>
              <Input
                label="Teléfono"
                placeholder="1234567890 (10 dígitos)"
                value={formData?.phone}
                onChange={(e) => handleInputChange('phone', e?.target?.value)}
                error={errors?.phone}
                required
                maxLength={10}
              />
              {formData?.phone && formData.phone.length > 0 && (
                <p className="text-xs text-muted-foreground mt-1">
                  {formData.phone.length}/10 dígitos
                </p>
              )}
            </div>

            {/* Contactos Adicionales */}
            <div className="md:col-span-2 mt-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-lg font-medium text-foreground flex items-center">
                    <Icon name="Users" size={20} className="mr-2" />
                    Contactos Adicionales
                  </h3>
                  <p className="text-sm text-muted-foreground mt-1">
                    Puedes agregar hasta 3 contactos adicionales (opcional)
                  </p>
                </div>
                {additionalContacts.length < 3 && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={addAdditionalContact}
                    iconName="Plus"
                    iconPosition="left"
                  >
                    Agregar Contacto
                  </Button>
                )}
              </div>

              {additionalContacts.map((contact, index) => (
                <div key={index} className="border border-border rounded-lg p-4 mb-4 bg-muted/30">
                  <div className="flex items-center justify-between mb-4">
                    <h4 className="text-sm font-medium text-foreground">
                      Contacto Adicional {index + 1}
                    </h4>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => removeAdditionalContact(index)}
                      iconName="X"
                    >
                      Eliminar
                    </Button>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <Input
                        label="Nombre"
                        placeholder="Ej. María García"
                        value={contact.contacto}
                        onChange={(e) => handleAdditionalContactChange(index, 'contacto', e.target.value)}
                        error={errors?.[`additionalContact_${index}_name`]}
                      />
                    </div>
                    <div>
                      <Input
                        type="email"
                        label="Email"
                        placeholder="Ej. maria@empresa.com"
                        value={contact.email}
                        onChange={(e) => handleAdditionalContactChange(index, 'email', e.target.value)}
                        error={errors?.[`additionalContact_${index}_email`]}
                      />
                    </div>
                    <div>
                      <Input
                        label="Teléfono"
                        placeholder="1234567890"
                        value={contact.telefono}
                        onChange={(e) => handleAdditionalContactChange(index, 'telefono', e.target.value)}
                        error={errors?.[`additionalContact_${index}_phone`]}
                        maxLength={10}
                      />
                      {contact.telefono && contact.telefono.length > 0 && (
                        <p className="text-xs text-muted-foreground mt-1">
                          {contact.telefono.length}/10 dígitos
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="md:col-span-2">
              <Select
                label="Industria"
                value={formData?.industry}
                onChange={(value) => handleInputChange('industry', value)}
                error={errors?.industry}
                options={industries?.map(industry => ({ value: industry, label: industry }))}
                placeholder="Selecciona una industria"
                required
              />
            </div>

            {/* Ubicación de la Empresa */}
            <div className="md:col-span-2 mt-6">
              <h3 className="text-lg font-medium text-foreground mb-4 flex items-center">
                <Icon name="Building" size={20} className="mr-2" />
                Ubicación de la Empresa
              </h3>
              <p className="text-sm text-muted-foreground mb-4">
                Estado y municipio donde se encuentra ubicada la empresa
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:col-span-2">
              <div>
                <Select
                  label={<>Estado <span className="text-destructive">*</span></>}
                  value={formData.estadoEmpresa}
                  onChange={value => {
                    handleInputChange('estadoEmpresa', value);
                    handleInputChange('municipioEmpresa', '');
                  }}
                  options={
                    estados ? [{ value: '', label: 'Selecciona un estado' }, ...estados.map(e => ({ value: e.code, label: e.name }))] : []
                  }
                  loading={loadingEstados}
                  error={errors?.estadoEmpresa}
                  required
                  disabled={loadingEstados || !!errorEstados}
                  placeholder={loadingEstados ? 'Cargando estados...' : 'Selecciona un estado'}
                  searchable
                />
              </div>
              <div>
                <Select
                  label={<>Municipio <span className="text-destructive">*</span></>}
                  value={formData.municipioEmpresa}
                  onChange={value => handleInputChange('municipioEmpresa', value)}
                  options={
                    formData.estadoEmpresa === ''
                      ? [{ value: '', label: 'Selecciona un estado primero' }]
                      : loadingMunicipiosEmpresa
                        ? [{ value: '', label: 'Cargando municipios...' }]
                        : errorMunicipiosEmpresa
                          ? [{ value: '', label: 'Error al cargar municipios' }]
                          : [{ value: '', label: 'Selecciona un municipio' }, ...(municipiosEmpresa ? Object.values(municipiosEmpresa.municipios || {}).map((m, idx) => ({ value: m, label: m })) : [])]
                  }
                  loading={loadingMunicipiosEmpresa}
                  error={errors?.municipioEmpresa}
                  required
                  disabled={formData.estadoEmpresa === '' || loadingMunicipiosEmpresa || !!errorMunicipiosEmpresa}
                  placeholder={formData.estadoEmpresa === '' ? 'Selecciona un estado primero' : loadingMunicipiosEmpresa ? 'Cargando municipios...' : 'Selecciona un municipio'}
                  searchable
                />
              </div>
            </div>

            <div className="md:col-span-2">
              <Input
                label="URL de Ubicación"
                placeholder="Ej. https://maps.google.com/..."
                value={formData?.ubicacionUrl}
                onChange={(e) => handleInputChange('ubicacionUrl', e?.target?.value)}
                error={errors?.ubicacionUrl}
              />
              <p className="text-xs text-muted-foreground mt-1">
                Opcional: Link de Google Maps o ubicación web de la empresa
              </p>
            </div>

            {/* RFC y Sitio Web */}
            <div className="md:col-span-2 mt-6">
              <h3 className="text-lg font-medium text-foreground mb-4 flex items-center">
                <Icon name="FileText" size={20} className="mr-2" />
                Información Fiscal y Web
              </h3>
            </div>

            <div>
              <Input
                label="RFC"
                placeholder="Ej. ABC123456XYZ"
                value={formData?.rfc}
                onChange={(e) => handleInputChange('rfc', e?.target?.value)}
                error={errors?.rfc}
                required
                maxLength={13}
              />
            </div>

            <div>
              <Input
                label="Sitio Web"
                placeholder="Ej. https://www.empresa.com.mx"
                value={formData?.website}
                onChange={(e) => handleInputChange('website', e?.target?.value)}
                error={errors?.website}
              />
            </div>

            {/* Información de Estado */}
            <div className="md:col-span-2 mt-6">
              <h3 className="text-lg font-medium text-foreground mb-4 flex items-center">
                <Icon name="Settings" size={20} className="mr-2" />
                Estado y Relación
              </h3>
            </div>

            <div>
              <Select
                label="Estado"
                value={formData?.status}
                onChange={(value) => handleInputChange('status', value)}
                options={statusOptions?.map(status => ({ value: status, label: status }))}
                required
              />
            </div>

            <div>
              <Select
                label="Salud de la Relación"
                value={formData?.relationshipHealth}
                onChange={(value) => handleInputChange('relationshipHealth', value)}
                options={relationshipHealthOptions?.map(health => ({ value: health, label: health }))}
                required
              />
            </div>

            <div>
              <Input
                type="date"
                label="Cliente Desde"
                value={formData?.clientSince}
                onChange={(e) => handleInputChange('clientSince', e?.target?.value)}
                required
              />
            </div>

            <div>
              <Input
                type="date"
                label="Próximo Seguimiento"
                value={formData?.nextFollowUp}
                onChange={(e) => handleInputChange('nextFollowUp', e?.target?.value)}
              />
            </div>

            {/* Dirección del Cliente */}
            <div className="md:col-span-2 mt-6">
              <h3 className="text-lg font-medium text-foreground mb-4 flex items-center">
                <Icon name="MapPin" size={20} className="mr-2" />
                Dirección del Cliente
              </h3>
              <p className="text-sm text-muted-foreground mb-4">
                Dirección completa donde se puede contactar o visitar al cliente
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:col-span-2">
              <div>
                <Select
                  label={<>Estado <span className="text-destructive">*</span></>}
                  value={formData.estadoDireccion}
                  onChange={value => {
                    handleInputChange('estadoDireccion', value);
                    handleInputChange('municipioDireccion', '');
                  }}
                  options={
                    estados ? [{ value: '', label: 'Selecciona un estado' }, ...estados.map(e => ({ value: e.code, label: e.name }))] : []
                  }
                  loading={loadingEstados}
                  error={errors?.estadoDireccion}
                  required
                  disabled={loadingEstados || !!errorEstados}
                  placeholder={loadingEstados ? 'Cargando estados...' : 'Selecciona un estado'}
                  searchable
                />
              </div>
              <div>
                <Select
                  label={<>Municipio <span className="text-destructive">*</span></>}
                  value={formData.municipioDireccion}
                  onChange={value => handleInputChange('municipioDireccion', value)}
                  options={
                    formData.estadoDireccion === ''
                      ? [{ value: '', label: 'Selecciona un estado primero' }]
                      : loadingMunicipiosDireccion
                        ? [{ value: '', label: 'Cargando municipios...' }]
                        : errorMunicipiosDireccion
                          ? [{ value: '', label: 'Error al cargar municipios' }]
                          : [{ value: '', label: 'Selecciona un municipio' }, ...(municipiosDireccion ? Object.values(municipiosDireccion.municipios || {}).map((m, idx) => ({ value: m, label: m })) : [])]
                  }
                  loading={loadingMunicipiosDireccion}
                  error={errors?.municipioDireccion}
                  required
                  disabled={formData.estadoDireccion === '' || loadingMunicipiosDireccion || !!errorMunicipiosDireccion}
                  placeholder={formData.estadoDireccion === '' ? 'Selecciona un estado primero' : loadingMunicipiosDireccion ? 'Cargando municipios...' : 'Selecciona un municipio'}
                  searchable
                />
              </div>
            </div>

            <div className="md:col-span-2">
              <Input
                label="Dirección completa"
                placeholder="Ej. Av. Constitución 1234, Col. Centro"
                value={formData?.direccionCompleta}
                onChange={(e) => handleInputChange('direccionCompleta', e?.target?.value)}
                error={errors?.direccionCompleta}
                required
                maxLength={200}
              />
              {formData?.direccionCompleta && formData.direccionCompleta.length > 0 && (
                <p className="text-xs text-muted-foreground mt-1">
                  {formData.direccionCompleta.length}/200 caracteres
                </p>
              )}
            </div>

            <div className="md:col-span-2 mt-6">
              <h3 className="text-lg font-medium text-foreground mb-4 flex items-center">
                <Icon name="FileText" size={20} className="mr-2" />
                Notas Adicionales
              </h3>
            </div>

            <div className="md:col-span-2">
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">
                  Notas
                </label>
                <textarea
                  className="w-full px-3 py-2 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent resize-none bg-background text-foreground"
                  rows="4"
                  placeholder="Información adicional sobre el cliente..."
                  value={formData?.notes}
                  onChange={(e) => handleInputChange('notes', e?.target?.value)}
                />
              </div>
            </div>
          </div>

          <div className="flex items-center justify-end space-x-4 mt-8 pt-6 border-t border-border">
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
            >
              Cancelar
            </Button>
            {mode === 'edit' ? (
              <Button
                type="submit"
                variant="default"
                iconName="Save"
                iconPosition="left"
              >
                Guardar
              </Button>
            ) : (
              <Button
                type="submit"
                variant="default"
                iconName="Plus"
                iconPosition="left"
              >
                Agregar Cliente
              </Button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
};

export default NewClientModal;