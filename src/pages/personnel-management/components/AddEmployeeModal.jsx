import React, { useState } from 'react';
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
  medicalStatusOptions, 
  relationshipOptions 
} from './personnelConstants';

const AddEmployeeModal = ({ isOpen, onClose, onSave }) => {
  const [localError, setLocalError] = useState(null);
  const { createPerson } = usePerson();
  const { showSuccess, showWarning, showError } = useNotifications();

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

  const [step, setStep] = useState(0);
  const steps = ['general', 'medical', 'ppe', 'emergency'];

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

  const handleApiError = (error) => {
    const status = error?.status || error?.response?.status;
      // El mensaje puede estar en diferentes lugares según la estructura de la respuesta
    const message = error?.data?.error || error?.data?.message || error?.userMessage || error?.message || 'Ha ocurrido un error inesperado';

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
    setLocalError(null);
    
    // Validar campos requeridos antes de guardar
    if (!validateRequiredFields()) {
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
      showSuccess('Personal registrado exitosamente.');

      if (onSave) onSave(result);
      onClose();
    } catch (error) {
      console.error("Error al guardar:", error);
      handleApiError(error);
    }
  };

  if (!isOpen) return null;

  const tabs = [
    { id: 'general', label: 'Información General', icon: 'User' },
    { id: 'medical', label: 'Archivos', icon: 'FileText' },
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
                onClick={() => setStep(idx)}
                className={`flex items-center space-x-2 py-4 px-1 border-b-2 font-medium text-sm transition-smooth ${
                  step === idx
                    ? 'border-primary text-primary'
                    : 'border-transparent text-muted-foreground hover:text-foreground'
                }`}
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

          {/* Estudios Médicos */}
          {step === 1 && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Input
                  label="Último Examen Médico"
                  type="date"
                  value={formData.medicalStudies.lastExam}
                  onChange={(e) => handleInputChange('medicalStudies.lastExam', e.target.value)}
                />
                <Input
                  label="Próximo Examen Médico"
                  type="date"
                  value={formData.medicalStudies.nextExam}
                  onChange={(e) => handleInputChange('medicalStudies.nextExam', e.target.value)}
                />
                <Select
                  label="Estado de Estudios Médicos"
                  options={medicalStatusOptions}
                  value={formData.medicalStudies.status}
                  onChange={(value) => handleInputChange('medicalStudies.status', value)}
                />
              </div>
              <div className="border border-border rounded-lg p-4">
                <h4 className="text-sm font-medium text-foreground mb-3">Documentos Médicos</h4>
                <div className="space-y-2">
                  <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                    <div className="flex items-center space-x-3">
                      <Icon name="FileText" size={16} />
                      <span className="text-sm text-foreground">Examen médico general</span>
                    </div>
                    <Button variant="ghost" size="sm" iconName="Download" iconSize={14}>
                      Descargar
                    </Button>
                  </div>
                  <Button variant="outline" size="sm" iconName="Upload" iconPosition="left" iconSize={14}>
                    Subir Documento
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* EPP */}
          {step === 2 && (
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
          {step === 3 && (
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
              onClick={() => setStep((prev) => prev - 1)}
              iconName="ArrowLeft"
              iconPosition="left"
              disabled={localError?.status === 409 && localError?.field === 'email'}
            >
              Anterior
            </Button>
          )}
          {step < steps.length - 1 ? (
            <Button
              onClick={() => setStep((prev) => prev + 1)}
              iconName="ArrowRight"
              iconPosition="right"
              disabled={localError?.status === 409 && localError?.field === 'email'}
            >
              Siguiente
            </Button>
          ) : (
            <Button
              onClick={handleSave}
              iconName="Save"
              iconPosition="left"
              disabled={localError?.status === 409 && localError?.field === 'email'}
            >
              Crear Empleado
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};

export default AddEmployeeModal;

