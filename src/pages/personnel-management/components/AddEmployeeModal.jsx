import React, { useState, useRef, useEffect } from 'react';
import { useNotifications } from '../../../context/NotificationContext';
import Icon from '../../../components/AppIcon';
import Button from '../../../components/ui/Button';
import Input from '../../../components/ui/Input';
import Select from '../../../components/ui/Select';
import { Checkbox } from '../../../components/ui/Checkbox';
import usePerson from '../../../hooks/usePerson';
import { 
  departmentOptions, 
  positionOptions, 
  statusOptions, 
  relationshipOptions 
} from './personnelConstants';

const AddEmployeeModal = ({ isOpen, onClose, onSave }) => {
  const [localError, setLocalError] = useState(null);
  const [isSaving, setIsSaving] = useState(false);
  const { createPerson, uploadEmployeeImage, uploadEmployeeDocument } = usePerson();
  const { showSuccess, showWarning, showError } = useNotifications();
  
  // Referencias para los inputs de archivo
  const profileImageInputRef = useRef(null);
  const documentInputRef = useRef(null);

  const [formData, setFormData] = useState({
    name: '',
    employeeId: '',
    email: '',
    phone: '',
    department: '',
    position: '',
    hireDate: '',
    status: 'Activo',
    medicalStudies: {
      lastExam: '',
      nextExam: '',
      status: 'Pendiente',
      documents: []
    },
    ppe: {
      helmet: false,
      vest: false,
      boots: false,
      gloves: false,
      glasses: false,
      mask: false
    },
    certifications: [],
    emergencyContact: {
      name: '',
      phone: '',
      relationship: ''
    }
  });

  // Estados para archivos
  const [profileImage, setProfileImage] = useState(null);
  const [profileImagePreview, setProfileImagePreview] = useState(null);
  const [documents, setDocuments] = useState([]);

  // Tipos de documentos disponibles
  const documentTypes = [
    { value: 'INE', label: 'INE (Identificación)' },
    { value: 'ComprobanteD', label: 'Comprobante de Domicilio' },
    { value: 'Contrato', label: 'Contrato Laboral' },
    { value: 'CURP', label: 'CURP' },
    { value: 'RFC', label: 'RFC' },
    { value: 'NSS', label: 'Número de Seguridad Social' },
    { value: 'ActaNacimiento', label: 'Acta de Nacimiento' },
    { value: 'Curriculum', label: 'Currículum Vitae' },
    { value: 'CartaRecomendacion', label: 'Carta de Recomendación' },
    { value: 'ComprobanteBancario', label: 'Comprobante Bancario' },
    { value: 'ComprobantEstudios', label: 'Comprobante de Estudios' }
  ];

  const [step, setStep] = useState(0);
  // Mapeo de steps: 0=general, 1=imagen, 2=documentos, 3=ppe, 4=emergency
  const steps = ['general', 'imagen', 'documentos', 'ppe', 'emergency'];

  // Limpiar estados cuando se cierra el modal
  useEffect(() => {
    if (!isOpen) {
      // Resetear todo al cerrar
      setFormData({
        name: '',
        employeeId: '',
        email: '',
        phone: '',
        department: '',
        position: '',
        hireDate: '',
        status: 'Activo',
        medicalStudies: {
          lastExam: '',
          nextExam: '',
          status: 'Pendiente',
          documents: []
        },
        ppe: {
          helmet: false,
          vest: false,
          boots: false,
          gloves: false,
          glasses: false,
          mask: false
        },
        certifications: [],
        emergencyContact: {
          name: '',
          phone: '',
          relationship: ''
        }
      });
      setProfileImage(null);
      setProfileImagePreview(null);
      setDocuments([]);
      setStep(0);
      setLocalError(null);
    }
  }, [isOpen]);

  const handleInputChange = (field, value) => {
    if (field.includes('.')) {
      const [parent, child] = field.split('.');
      setFormData(prev => ({
        ...prev,
        [parent]: {
          ...prev[parent],
          [child]: value
        }
      }));
    } else {
      setFormData(prev => ({ ...prev, [field]: value }));
    }
  };

  const handlePPEChange = (item, checked) => {
    setFormData(prev => ({
      ...prev,
      ppe: {
        ...prev.ppe,
        [item]: checked
      }
    }));
  };

  // Manejadores de imagen de perfil
  const handleProfileImageChange = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      // Validar tipo de archivo
      const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
      if (!validTypes.includes(file.type)) {
        showWarning('Solo se permiten imágenes (JPG, PNG, WEBP)');
        return;
      }
      // Validar tamaño (5MB)
      if (file.size > 5 * 1024 * 1024) {
        showWarning('La imagen no debe superar los 5MB');
        return;
      }
      
      setProfileImage(file);
      
      // Crear preview
      const reader = new FileReader();
      reader.onloadend = () => {
        setProfileImagePreview(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleRemoveProfileImage = () => {
    setProfileImage(null);
    setProfileImagePreview(null);
    if (profileImageInputRef.current) {
      profileImageInputRef.current.value = '';
    }
  };

  // Manejadores de documentos
  const handleAddDocument = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      // Validar tipo de archivo
      const validTypes = [
        'application/pdf',
        'image/jpeg',
        'image/jpg',
        'image/png',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
      ];
      if (!validTypes.includes(file.type)) {
        showWarning('Solo se permiten archivos PDF, imágenes (JPG, PNG) o documentos Word');
        return;
      }
      // Validar tamaño (10MB)
      if (file.size > 10 * 1024 * 1024) {
        showWarning('El documento no debe superar los 10MB');
        return;
      }
      
      setDocuments(prev => [
        ...prev,
        {
          id: Date.now(),
          file,
          tipoDocumento: '',
          descripcion: ''
        }
      ]);
      
      // Limpiar input
      if (documentInputRef.current) {
        documentInputRef.current.value = '';
      }
    }
  };

  const handleDocumentTypeChange = (docId, tipoDocumento) => {
    setDocuments(prev =>
      prev.map(doc =>
        doc.id === docId ? { ...doc, tipoDocumento } : doc
      )
    );
  };

  const handleDocumentDescriptionChange = (docId, descripcion) => {
    setDocuments(prev =>
      prev.map(doc =>
        doc.id === docId ? { ...doc, descripcion } : doc
      )
    );
  };

  const handleRemoveDocument = (docId) => {
    setDocuments(prev => prev.filter(doc => doc.id !== docId));
  };

  const handleApiError = (error) => {
    const status = error?.status || error?.response?.status;
    // El mensaje puede estar en diferentes lugares según la estructura de la respuesta
    const message = error?.data?.error || error?.data?.message || error?.userMessage || error?.message || 'Ha ocurrido un error inesperado';

    // Limpiar el estado de guardado
    setIsSaving(false);

    // Manejar errores 400 (Bad Request)
    if (status === 400) {
      // Campos requeridos faltantes
      if (message.includes('Campos requeridos faltantes') || message.includes('faltantes')) {
        showError(message, { duration: 7000 });
        return;
      }
      // Email inválido
      if (message.includes("email") && (message.includes("no es válido") || message.includes("inválido"))) {
        showError("El correo electrónico ingresado no es válido.", { duration: 6000 });
        setLocalError({ status: 400, field: 'email' });
        return;
      }
      // Teléfono inválido
      if (message.includes("telefono") || message.includes("teléfono")) {
        if (message.includes("10 dígitos")) {
          showError("El número de teléfono debe tener exactamente 10 dígitos.", { duration: 6000 });
          return;
        }
        showError(message, { duration: 6000 });
        return;
      }
      // Fecha inválida
      if (message.includes("fechaIngreso") || message.includes("fecha")) {
        showError("La fecha de ingreso debe ser una fecha válida.", { duration: 6000 });
        return;
      }
      // Payload incompleto
      if (message.includes("Payload incompleto") || message.includes("incompleto")) {
        showError("Los datos enviados están incompletos. Por favor, verifique todos los campos requeridos.", { duration: 7000 });
        return;
      }
      // Error genérico 400
      showError(message, { duration: 7000 });
      return;
    }

    // Manejar errores 409 (Conflict) - Duplicados
    if (status === 409) {
      // Email duplicado
      if (message.includes("correo") || message.includes("email")) {
        showError("Ya existe un empleado con el mismo correo electrónico.", { duration: 7000 });
        setLocalError({ status: 409, field: 'email' });
        return;
      }
      // Teléfono duplicado
      if (message.includes("teléfono") || message.includes("telefono")) {
        showError("Ya existe un empleado con el mismo número de teléfono.", { duration: 7000 });
        setLocalError({ status: 409, field: 'phone' });
        return;
      }
      // EmpleadoId duplicado (solo para actualizar)
      if (message.includes("empleadoId") || message.includes("empleado")) {
        showError("Ya existe un empleado con el mismo ID de empleado.", { duration: 7000 });
        setLocalError({ status: 409, field: 'employeeId' });
        return;
      }
      // Error genérico 409
      showError(message || "Ya existe un empleado con los mismos datos.", { duration: 7000 });
      setLocalError({ status: 409 });
      return;
    }

    // Manejar errores 500 (Internal Server Error)
    if (status === 500) {
      // Empleado no encontrado
      if (message.includes("No se encontró") || message.includes("no encontrado")) {
        showError("No se encontró el empleado especificado.", { duration: 7000 });
        return;
      }
      // Error genérico del servidor
      showError(message || "Error del servidor. Por favor, intente nuevamente más tarde.", { duration: 8000 });
      return;
    }

    // Error de red u otros
    if (!status) {
      showError("Error de conexión. Por favor, verifique su conexión a internet e intente nuevamente.", { duration: 7000 });
      return;
    }

    // Error genérico no clasificado
    showError(message, { duration: 7000 });
  };

  const validateRequiredFields = () => {
    const requiredFields = [
      { field: formData.name, label: 'Nombre Completo' },
      { field: formData.employeeId, label: 'ID de Empleado' },
      { field: formData.email, label: 'Correo Electrónico' },
      { field: formData.phone, label: 'Teléfono' },
      { field: formData.hireDate, label: 'Fecha de Ingreso' }
    ];

    const emptyFields = requiredFields.filter(item => !item.field || item.field.trim() === '');
    
    // Mostrar una alerta individual por cada campo faltante
    if (emptyFields.length > 0) {
      emptyFields.forEach((item, index) => {
        setTimeout(() => {
          showWarning(
            <span>El campo <strong>"{item.label}"</strong> es requerido.</span>,
            { duration: 5000 }
          );
        }, index * 300); // Delay de 300ms entre cada notificación
      });
      return false;
    }

    // Validar que el teléfono tenga exactamente 10 dígitos
    if (formData.phone && formData.phone.length !== 10) {
      showWarning('El número de teléfono debe tener exactamente 10 dígitos.', { duration: 5000 });
      return false;
    }

    // Validar formato de email básico
    if (formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      showWarning('Por favor, ingrese un correo electrónico válido.', { duration: 5000 });
      return false;
    }

    // Validar contacto de emergencia: si alguno tiene datos, todos deben estar completos
    const hasEmergencyName = formData.emergencyContact.name && formData.emergencyContact.name.trim() !== '';
    const hasEmergencyPhone = formData.emergencyContact.phone && formData.emergencyContact.phone.trim() !== '';
    const hasEmergencyRelationship = formData.emergencyContact.relationship && formData.emergencyContact.relationship.trim() !== '';

    if (hasEmergencyName || hasEmergencyPhone || hasEmergencyRelationship) {
      const missingFields = [];
      if (!hasEmergencyName) missingFields.push('Nombre del Contacto');
      if (!hasEmergencyPhone) missingFields.push('Teléfono de Contacto');
      if (!hasEmergencyRelationship) missingFields.push('Relación');

      if (missingFields.length > 0) {
        missingFields.forEach((field, index) => {
          setTimeout(() => {
            showWarning(
              <span>El campo <strong>"{field}"</strong> es requerido para el contacto de emergencia.</span>,
              { duration: 5000 }
            );
          }, index * 300);
        });
        return false;
      }

      // Validar que el teléfono de emergencia tenga exactamente 10 dígitos
      if (formData.emergencyContact.phone && formData.emergencyContact.phone.length !== 10) {
        showWarning('El número telefónico del contacto de emergencia está incompleto. Debe tener exactamente 10 dígitos.', { duration: 5000 });
        return false;
      }
    }

    return true;
  };

  const handleSave = async () => {
    // No permitir guardar si ya se está guardando
    if (isSaving) {
      return;
    }

    setLocalError(null);
    setIsSaving(true);
    
    // Validar campos requeridos antes de guardar
    if (!validateRequiredFields()) {
      setIsSaving(false);
      return;
    }

    try {
      // Estructurar datos según el formato de la API
      const payload = {
        nombreCompleto: formData.name,
        empleadoId: formData.employeeId,
        email: formData.email,
        telefono: formData.phone,
        departamento: formData.department,
        puesto: formData.position,
        fechaIngreso: formData.hireDate,
        estado: formData.status,
        activo: true,
        examenesMedicos: [{
          ultimoExamenMedico: formData.medicalStudies.lastExam || null,
          proximoExamenMedico: formData.medicalStudies.nextExam || null,
          estadoEstudiosMedicos: formData.medicalStudies.status || null,
          urlDocumentoMedico: formData.medicalStudies.documents?.[0] || null
        }],
        equipos: [{
          equipoProteccionPersonal: {
            cascoSeguridad: formData.ppe.helmet || false,
            chalecoReflectivo: formData.ppe.vest || false,
            botasSeguridad: formData.ppe.boots || false
          },
          equipoAdicional: {
            guantesTrabajo: formData.ppe.gloves || false,
            gafasSeguridad: formData.ppe.glasses || false,
            mascarilla: formData.ppe.mask || false
          }
        }],
        contactoEmergencia: [{
          nombreContacto: formData.emergencyContact.name || null,
          telefonoContacto: formData.emergencyContact.phone || '',
          relacion: formData.emergencyContact.relationship || null
        }],
        documentosGenerales: formData.certifications ?? []
      };

      const result = await createPerson(payload);
      const empleadoId = result?.id || result?.data?.id;

      if (!empleadoId) {
        throw new Error('No se pudo obtener el ID del empleado creado');
      }

      // Subir imagen de perfil si existe
      if (profileImage) {
        try {
          await uploadEmployeeImage(profileImage, empleadoId, 'Foto de perfil');
        } catch (imgError) {
          console.error('Error al subir imagen de perfil:', imgError);
          showWarning('Empleado creado, pero hubo un error al subir la imagen de perfil');
        }
      }

      // Subir documentos si existen
      if (documents.length > 0) {
        let uploadedCount = 0;
        for (const doc of documents) {
          if (!doc.tipoDocumento) {
            showWarning(`Documento "${doc.file.name}" omitido: tipo de documento no especificado`);
            continue;
          }
          try {
            await uploadEmployeeDocument(
              doc.file,
              empleadoId,
              doc.tipoDocumento,
              doc.descripcion || `${doc.tipoDocumento} del empleado`
            );
            uploadedCount++;
          } catch (docError) {
            console.error(`Error al subir documento ${doc.file.name}:`, docError);
            showWarning(`Error al subir documento "${doc.file.name}"`);
          }
        }
        if (uploadedCount > 0) {
          showSuccess(`${uploadedCount} documento(s) subido(s) exitosamente`);
        }
      }

      setIsSaving(false);
      showSuccess('Personal registrado exitosamente.');

      if (onSave) onSave(result);
      onClose();
    } catch (error) {
      console.error("Error al guardar:", error);
      handleApiError(error);
      // El estado de isSaving se limpia en handleApiError
    }
  };

  if (!isOpen) return null;

  const tabs = [
    { id: 'general', label: 'Información General', icon: 'User' },
    { id: 'imagen', label: 'Imagen de Perfil', icon: 'Image' },
    { id: 'documentos', label: 'Documentos', icon: 'FileText' },
    { id: 'ppe', label: 'EPP', icon: 'Shield' },
    { id: 'emergency', label: 'Contacto de Emergencia', icon: 'Phone' }
  ];

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-1050 flex items-center justify-center p-4">
      <div className="bg-card rounded-lg border border-border w-full max-w-4xl max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-border">
          <div className="flex items-center space-x-3">
            <Icon name="UserPlus" size={24} className="text-primary" />
            <div>
              <h2 className="text-xl font-semibold text-foreground">Nuevo Empleado</h2>
              <p className="text-sm text-muted-foreground">Agregar nuevo empleado al sistema</p>
            </div>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <Icon name="X" size={20} />
          </Button>
        </div>

        {/* Tabs */}
        <div className="border-b border-border">
          <nav className="flex space-x-8 px-6">
            {tabs.map((tab, idx) => (
              <button
                key={tab.id}
                onClick={() => {
                  if (!isSaving) {
                    setStep(idx);
                    // Limpiar error al cambiar de pestaña
                    if (localError) setLocalError(null);
                  }
                }}
                disabled={isSaving}
                className={`flex items-center space-x-2 py-4 px-1 border-b-2 font-medium text-sm transition-smooth ${
                  step === idx
                    ? 'border-primary text-primary'
                    : 'border-transparent text-muted-foreground hover:text-foreground'
                } ${isSaving ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
              >
                <Icon name={tab.icon} size={16} />
                <span>{tab.label}</span>
              </button>
            ))}
          </nav>
        </div>

        {/* Contenido */}
        <div className="p-6 overflow-y-auto max-h-[60vh]">
          {/* Información General */}
          {step === 0 && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Input
                  label="Nombre Completo"
                  value={formData.name}
                  onChange={(e) => handleInputChange('name', e.target.value)}
                  required
                />
                <Input
                  label="ID de Empleado"
                  value={formData.employeeId}
                  onChange={(e) => handleInputChange('employeeId', e.target.value)}
                  required
                />
                <Input
                  label="Correo Electrónico"
                  type="email"
                  value={formData.email}
                  onChange={(e) => {
                    handleInputChange('email', e.target.value);
                    if (localError) setLocalError(null);
                  }}
                  required
                />
                {(localError?.status === 409 && localError?.field === 'email') && (
                  <span className="block text-xs text-red-600 mt-1">Este correo ya está registrado</span>
                )}
                <Input
                  label="Teléfono"
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => {
                    const value = e.target.value;
                    if (/^\d{0,10}$/.test(value)) {
                      handleInputChange('phone', value);
                    }
                  }}
                  onBlur={(e) => {
                    if (e.target.value && e.target.value.length !== 10) {
                      showWarning('El número de teléfono debe tener exactamente 10 dígitos.', { duration: 5000 });
                    }
                  }}
                  inputMode="numeric"
                  maxLength={10}
                  pattern="\d{10}"
                  placeholder="Ingresa 10 dígitos"
                  required
                />
                <Select
                  label="Departamento"
                  options={departmentOptions}
                  value={formData.department}
                  onChange={(value) => handleInputChange('department', value)}
                />
                <Select
                  label="Puesto"
                  options={positionOptions}
                  value={formData.position}
                  onChange={(value) => handleInputChange('position', value)}
                />
                <Input
                  label="Fecha de Ingreso"
                  type="date"
                  value={formData.hireDate}
                  onChange={(e) => handleInputChange('hireDate', e.target.value)}
                  required
                />
                <Select
                  label="Estado"
                  options={statusOptions}
                  value={formData.status}
                  onChange={(value) => handleInputChange('status', value)}
                />
              </div>
            </div>
          )}

          {/* Imagen de Perfil */}
          {step === 1 && (
            <div className="space-y-6">
              <div className="flex flex-col items-center space-y-4">
                {/* Preview de la imagen */}
                <div className="relative">
                  {profileImagePreview ? (
                    <div className="relative">
                      <img
                        src={profileImagePreview}
                        alt="Preview"
                        className="w-40 h-40 rounded-full object-cover border-4 border-border"
                      />
                      <button
                        type="button"
                        onClick={handleRemoveProfileImage}
                        className="absolute top-0 right-0 bg-red-500 text-white rounded-full p-2 hover:bg-red-600 transition-smooth"
                        disabled={isSaving}
                      >
                        <Icon name="X" size={16} />
                      </button>
                    </div>
                  ) : (
                    <div className="w-40 h-40 rounded-full bg-muted border-4 border-border flex items-center justify-center">
                      <Icon name="User" size={48} className="text-muted-foreground" />
                    </div>
                  )}
                </div>

                {/* Botón para subir imagen */}
                <div className="text-center space-y-2">
                  <input
                    ref={profileImageInputRef}
                    type="file"
                    accept="image/jpeg,image/jpg,image/png,image/webp"
                    onChange={handleProfileImageChange}
                    className="hidden"
                    disabled={isSaving}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => profileImageInputRef.current?.click()}
                    iconName="Upload"
                    iconPosition="left"
                    disabled={isSaving}
                  >
                    {profileImage ? 'Cambiar Imagen' : 'Seleccionar Imagen'}
                  </Button>
                  <p className="text-xs text-muted-foreground">
                    Formatos: JPG, PNG, WEBP • Tamaño máximo: 5MB
                  </p>
                  {profileImage && (
                    <p className="text-xs text-primary font-medium">
                      {profileImage.name} ({(profileImage.size / 1024).toFixed(0)} KB)
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Documentos */}
          {step === 2 && (
            <div className="space-y-6">
              {/* Botón para agregar documento */}
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-sm font-medium text-foreground">Documentos del Empleado</h4>
                  <p className="text-xs text-muted-foreground mt-1">
                    Agrega documentos importantes (INE, contratos, comprobantes, etc.)
                  </p>
                </div>
                <div>
                  <input
                    ref={documentInputRef}
                    type="file"
                    accept="application/pdf,image/jpeg,image/jpg,image/png,.doc,.docx"
                    onChange={handleAddDocument}
                    className="hidden"
                    disabled={isSaving}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => documentInputRef.current?.click()}
                    iconName="Plus"
                    iconPosition="left"
                    disabled={isSaving}
                  >
                    Agregar Documento
                  </Button>
                </div>
              </div>

              {/* Lista de documentos */}
              {documents.length > 0 ? (
                <div className="space-y-4">
                  {documents.map((doc) => (
                    <div
                      key={doc.id}
                      className="p-4 border border-border rounded-lg space-y-3"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex items-center space-x-3 flex-1">
                          <Icon name="FileText" size={20} className="text-primary" />
                          <div className="flex-1">
                            <p className="text-sm font-medium text-foreground">{doc.file.name}</p>
                            <p className="text-xs text-muted-foreground">
                              {(doc.file.size / 1024).toFixed(0)} KB
                            </p>
                          </div>
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon-sm"
                          onClick={() => handleRemoveDocument(doc.id)}
                          disabled={isSaving}
                        >
                          <Icon name="Trash2" size={16} className="text-red-500" />
                        </Button>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <Select
                          label="Tipo de Documento"
                          options={documentTypes}
                          value={doc.tipoDocumento}
                          onChange={(value) => handleDocumentTypeChange(doc.id, value)}
                          placeholder="Seleccionar tipo..."
                          required
                        />
                        <Input
                          label="Descripción (opcional)"
                          value={doc.descripcion}
                          onChange={(e) => handleDocumentDescriptionChange(doc.id, e.target.value)}
                          placeholder="Ej: INE actualizada 2025"
                        />
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12 border-2 border-dashed border-border rounded-lg">
                  <Icon name="FileText" size={48} className="text-muted-foreground mx-auto mb-3" />
                  <p className="text-sm text-muted-foreground">No hay documentos agregados</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Haz clic en "Agregar Documento" para comenzar
                  </p>
                </div>
              )}

              <div className="bg-muted/50 p-3 rounded-lg">
                <p className="text-xs text-muted-foreground">
                  💡 <strong>Nota:</strong> Puedes agregar múltiples documentos. Asegúrate de especificar
                  el tipo de documento para cada uno antes de guardar.
                </p>
              </div>
            </div>
          )}

          {/* EPP */}
          {step === 3 && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <h4 className="text-sm font-medium text-foreground">Equipo de Protección Personal</h4>
                  <div className="space-y-3">
                    <Checkbox
                      label="Casco de Seguridad"
                      checked={formData.ppe.helmet || false}
                      onChange={(e) => handlePPEChange('helmet', e.target.checked)}
                    />
                    <Checkbox
                      label="Chaleco Reflectivo"
                      checked={formData.ppe.vest || false}
                      onChange={(e) => handlePPEChange('vest', e.target.checked)}
                    />
                    <Checkbox
                      label="Botas de Seguridad"
                      checked={formData.ppe.boots || false}
                      onChange={(e) => handlePPEChange('boots', e.target.checked)}
                    />
                  </div>
                </div>
                <div className="space-y-4">
                  <h4 className="text-sm font-medium text-foreground">Equipo Adicional</h4>
                  <div className="space-y-3">
                    <Checkbox
                      label="Guantes de Trabajo"
                      checked={formData.ppe.gloves || false}
                      onChange={(e) => handlePPEChange('gloves', e.target.checked)}
                    />
                    <Checkbox
                      label="Gafas de Seguridad"
                      checked={formData.ppe.glasses || false}
                      onChange={(e) => handlePPEChange('glasses', e.target.checked)}
                    />
                    <Checkbox
                      label="Mascarilla"
                      checked={formData.ppe.mask || false}
                      onChange={(e) => handlePPEChange('mask', e.target.checked)}
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Contacto de Emergencia */}
          {step === 4 && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Input
                  label="Nombre del Contacto"
                  value={formData.emergencyContact.name}
                  onChange={(e) => handleInputChange('emergencyContact.name', e.target.value)}
                />
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <label className="text-sm font-medium text-foreground">Teléfono de Contacto</label>
                    <span className="text-xs text-muted-foreground">
                      {formData.emergencyContact.phone?.length || 0}/10
                    </span>
                  </div>
                  <Input
                    type="tel"
                    value={formData.emergencyContact.phone}
                    onChange={(e) => {
                      const value = e.target.value;
                      // Solo permitir números y máximo 10 dígitos
                      if (/^\d{0,10}$/.test(value)) {
                        handleInputChange('emergencyContact.phone', value);
                      }
                    }}
                    inputMode="numeric"
                    maxLength={10}
                    pattern="\d{10}"
                    placeholder="Ingresa 10 dígitos"
                  />
                </div>
                <Select
                  label="Relación"
                  options={relationshipOptions}
                  value={formData.emergencyContact.relationship}
                  onChange={(value) => handleInputChange('emergencyContact.relationship', value)}
                />
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end space-x-3 p-6 border-t border-border">
          <Button variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          {step > 0 && (
            <Button
              variant="secondary"
              onClick={() => {
                setStep((prev) => prev - 1);
                if (localError) setLocalError(null);
              }}
              iconName="ArrowLeft"
              iconPosition="left"
              disabled={isSaving}
            >
              Anterior
            </Button>
          )}
          {step < steps.length - 1 ? (
            <Button
              onClick={() => {
                setStep((prev) => prev + 1);
                if (localError) setLocalError(null);
              }}
              iconName="ArrowRight"
              iconPosition="right"
              disabled={isSaving}
            >
              Siguiente
            </Button>
          ) : (
            <Button
              onClick={handleSave}
              iconName="Save"
              iconPosition="left"
              disabled={isSaving}
            >
              {isSaving ? 'Guardando...' : 'Crear Empleado'}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};

export default AddEmployeeModal;

