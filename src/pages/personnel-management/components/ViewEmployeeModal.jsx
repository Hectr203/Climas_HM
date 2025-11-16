import React, { useState, useEffect } from 'react';
import Icon from '../../../components/AppIcon';
import Button from '../../../components/ui/Button';
import Input from '../../../components/ui/Input';
import Select from '../../../components/ui/Select';
import usePerson from '../../../hooks/usePerson';
import { 
  departmentOptions, 
  positionOptions, 
  statusOptions, 
  medicalStatusOptions, 
  relationshipOptions 
} from './personnelConstants';

const ViewEmployeeModal = ({ isOpen, onClose, employeeId }) => {
  const [step, setStep] = useState(0);
  const [employee, setEmployee] = useState(null);
  const [loading, setLoading] = useState(false);
  const { getPersonById } = usePerson();

  // Cargar datos del empleado cuando se abre el modal
  useEffect(() => {
    if (isOpen && employeeId) {
      setLoading(true);
      setEmployee(null);
      const loadEmployee = async () => {
        try {
          const data = await getPersonById(employeeId);
          if (data) {
            setEmployee(data);
          }
        } catch (error) {
          console.error("Error al cargar empleado:", error);
        } finally {
          setLoading(false);
        }
      };
      loadEmployee();
    } else {
      setEmployee(null);
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, employeeId]);

  if (!isOpen || !employeeId || loading || !employee) return null;

  // Extraer datos de arrays anidados según la estructura de la API
  const medicalData = Array.isArray(employee.examenesMedicos) && employee.examenesMedicos[0]
    ? employee.examenesMedicos[0]
    : {};
  
  const medicalStudies = {
    lastExam: medicalData.ultimoExamenMedico || '',
    nextExam: medicalData.proximoExamenMedico || '',
    status: medicalData.estadoEstudiosMedicos || 'Pendiente',
    documents: medicalData.urlDocumentoMedico ? [medicalData.urlDocumentoMedico] : []
  };

  const equiposData = Array.isArray(employee.equipos) && employee.equipos[0]
    ? employee.equipos[0]
    : {};
  
  const equipoProteccionPersonal = equiposData.equipoProteccionPersonal || {};
  const equipoAdicional = equiposData.equipoAdicional || {};
  
  const ppe = {
    helmet: equipoProteccionPersonal.cascoSeguridad || false,
    vest: equipoProteccionPersonal.chalecoReflectivo || false,
    boots: equipoProteccionPersonal.botasSeguridad || false,
    gloves: equipoAdicional.guantesTrabajo || false,
    glasses: equipoAdicional.gafasSeguridad || false,
    mask: equipoAdicional.mascarilla || false
  };

  const contactoData = Array.isArray(employee.contactoEmergencia) && employee.contactoEmergencia[0]
    ? employee.contactoEmergencia[0]
    : {};
  
  const emergencyContact = {
    name: contactoData.nombreContacto || '',
    phone: contactoData.telefonoContacto || '',
    relationship: contactoData.relacion || ''
  };

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
            <Icon name="Eye" size={24} className="text-primary" />
            <div>
              <h2 className="text-xl font-semibold text-foreground">Perfil del Empleado</h2>
              <p className="text-sm text-muted-foreground">Ver detalles del empleado</p>
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
                    : 'border-transparent text-muted-foreground'
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
                  value={employee.nombreCompleto ?? ''}
                  disabled
                />
                <Input
                  label="ID de Empleado"
                  value={employee.empleadoId ?? ''}
                  disabled
                />
                <Input
                  label="Correo Electrónico"
                  type="email"
                  value={employee.email ?? ''}
                  disabled
                />
                <Input
                  label="Teléfono"
                  type="tel"
                  value={employee.telefono ?? ''}
                  disabled
                />
                <Select
                  label="Departamento"
                  options={departmentOptions}
                  value={employee.departamento ?? ''}
                  disabled
                />
                <Select
                  label="Puesto"
                  options={positionOptions}
                  value={employee.puesto ?? ''}
                  disabled
                />
                <Input
                  label="Fecha de Ingreso"
                  type="date"
                  value={employee.fechaIngreso ?? ''}
                  disabled
                />
                <Select
                  label="Estado"
                  options={statusOptions}
                  value={employee.estado ?? ''}
                  disabled
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
                  value={medicalStudies.lastExam ?? ''}
                  disabled
                />
                <Input
                  label="Próximo Examen Médico"
                  type="date"
                  value={medicalStudies.nextExam ?? ''}
                  disabled
                />
                <Select
                  label="Estado de Estudios Médicos"
                  options={medicalStatusOptions}
                  value={medicalStudies.status ?? 'Pendiente'}
                  disabled
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
                    <div className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        checked={ppe.helmet ?? false}
                        disabled
                        className="rounded border-border"
                      />
                      <label className="text-sm text-foreground">Casco de Seguridad</label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        checked={ppe.vest ?? false}
                        disabled
                        className="rounded border-border"
                      />
                      <label className="text-sm text-foreground">Chaleco Reflectivo</label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        checked={ppe.boots ?? false}
                        disabled
                        className="rounded border-border"
                      />
                      <label className="text-sm text-foreground">Botas de Seguridad</label>
                    </div>
                  </div>
                </div>
                <div className="space-y-4">
                  <h4 className="text-sm font-medium text-foreground">Equipo Adicional</h4>
                  <div className="space-y-3">
                    <div className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        checked={ppe.gloves ?? false}
                        disabled
                        className="rounded border-border"
                      />
                      <label className="text-sm text-foreground">Guantes de Trabajo</label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        checked={ppe.glasses ?? false}
                        disabled
                        className="rounded border-border"
                      />
                      <label className="text-sm text-foreground">Gafas de Seguridad</label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        checked={ppe.mask ?? false}
                        disabled
                        className="rounded border-border"
                      />
                      <label className="text-sm text-foreground">Mascarilla</label>
                    </div>
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
                  value={emergencyContact.name ?? ''}
                  disabled
                />
                <Input
                  label="Teléfono de Contacto"
                  type="tel"
                  value={emergencyContact.phone ?? ''}
                  disabled
                />
                <Select
                  label="Relación"
                  options={relationshipOptions}
                  value={emergencyContact.relationship ?? ''}
                  disabled
                />
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end space-x-3 p-6 border-t border-border">
          <Button variant="outline" onClick={onClose}>
            Cerrar
          </Button>
        </div>
      </div>
    </div>
  );
};

export default ViewEmployeeModal;

