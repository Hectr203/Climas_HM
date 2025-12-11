import React, { useState, useEffect } from 'react';
import Icon from '../../../components/AppIcon';
import Button from '../../../components/ui/Button';
import Input from '../../../components/ui/Input';
import Select from '../../../components/ui/Select';
import Image from '../../../components/AppImage';
import usePerson from '../../../hooks/usePerson';
import { 
  departmentOptions, 
  positionOptions, 
  statusOptions, 
  // medicalStatusOptions, // Oculto temporalmente - descomenta si reactivas la sección Archivos
  relationshipOptions 
} from './personnelConstants';

const ViewEmployeeModal = ({ isOpen, onClose, employeeId }) => {
  const [step, setStep] = useState(0);
  const [employee, setEmployee] = useState(null);
  const [loading, setLoading] = useState(false);
  const { getPersonById, getEmployeeImageUrl, listEmployeeDocuments, downloadEmployeeDocument } = usePerson();
  
  // Estados para archivos
  const [profileImageUrl, setProfileImageUrl] = useState(null);
  const [documents, setDocuments] = useState([]);
  const [loadingDocuments, setLoadingDocuments] = useState(false);

  // Cargar datos del empleado cuando se abre el modal
  useEffect(() => {
    if (isOpen && employeeId) {
      setLoading(true);
      setEmployee(null);
      setProfileImageUrl(null);
      setDocuments([]);
      
      const loadEmployee = async () => {
        try {
          const data = await getPersonById(employeeId);
          if (data) {
            setEmployee(data);
            
            // Cargar imagen de perfil
            loadEmployeeImage(employeeId);
            
            // Cargar documentos
            loadEmployeeDocuments(employeeId);
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
      setProfileImageUrl(null);
      setDocuments([]);
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, employeeId]);

  // Cargar imagen de perfil
  const loadEmployeeImage = async (empId) => {
    try {
      const imageData = await getEmployeeImageUrl(empId, 120);
      if (imageData && imageData.sasUrl) {
        setProfileImageUrl(imageData.sasUrl);
      }
    } catch (error) {
      // Silencioso - sin imagen
    }
  };

  // Cargar documentos del empleado
  const loadEmployeeDocuments = async (empId) => {
    setLoadingDocuments(true);
    try {
      const docsData = await listEmployeeDocuments(empId);
      if (docsData && Array.isArray(docsData.documentos)) {
        setDocuments(docsData.documentos);
      }
    } catch (error) {
      // Silencioso - sin documentos
    } finally {
      setLoadingDocuments(false);
    }
  };

  // Descargar documento
  const handleDownloadDocument = async (documentId) => {
    try {
      const docData = await downloadEmployeeDocument(documentId);
      if (docData && docData.sasUrl) {
        window.open(docData.sasUrl, '_blank');
      }
    } catch (error) {
      console.error('Error al descargar documento:', error);
    }
  };

  if (!isOpen || !employeeId || loading || !employee) return null;

  // Extraer datos de arrays anidados según la estructura de la API
  // Datos de Estudios Médicos - OCULTOS TEMPORALMENTE
  // Descomenta si reactivas la sección Archivos
  const medicalData = Array.isArray(employee.examenesMedicos) && employee.examenesMedicos[0]
    ? employee.examenesMedicos[0]
    : {};
  
  const _medicalStudies = {
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

          {/* Imagen de Perfil */}
          {step === 1 && (
            <div className="space-y-6">
              <div className="flex flex-col items-center space-y-4">
                <div className="relative">
                  {profileImageUrl ? (
                    <div className="w-48 h-48 rounded-full overflow-hidden border-4 border-border">
                      <Image
                        src={profileImageUrl}
                        alt={employee.nombreCompleto}
                        className="w-full h-full object-cover"
                      />
                    </div>
                  ) : (
                    <div className="w-48 h-48 rounded-full bg-muted border-4 border-border flex items-center justify-center">
                      <Icon name="User" size={64} className="text-muted-foreground" />
                    </div>
                  )}
                </div>
                <div className="text-center">
                  <h3 className="text-lg font-semibold text-foreground">{employee.nombreCompleto}</h3>
                  <p className="text-sm text-muted-foreground">{employee.empleadoId}</p>
                  {!profileImageUrl && (
                    <p className="text-xs text-muted-foreground mt-2">Sin foto de perfil</p>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Documentos */}
          {step === 2 && (
            <div className="space-y-6">
              <div>
                <h4 className="text-sm font-medium text-foreground mb-4">Documentos del Empleado</h4>
                
                {loadingDocuments ? (
                  <div className="text-center py-8">
                    <Icon name="Loader2" className="animate-spin mx-auto mb-2" size={24} />
                    <p className="text-sm text-muted-foreground">Cargando documentos...</p>
                  </div>
                ) : documents.length > 0 ? (
                  <div className="space-y-3">
                    {documents.map((doc) => (
                      <div
                        key={doc.id}
                        className="p-4 border border-border rounded-lg flex items-center justify-between bg-muted/30 hover:bg-muted/50 transition-smooth"
                      >
                        <div className="flex items-center space-x-3 flex-1">
                          <Icon name="FileText" size={24} className="text-primary" />
                          <div className="flex-1">
                            <p className="text-sm font-medium text-foreground">
                              {doc.tipoDocumento || 'Documento'}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {doc.nombreOriginal} • {(doc.size / 1024).toFixed(0)} KB
                            </p>
                            {doc.descripcion && (
                              <p className="text-xs text-muted-foreground mt-1">
                                {doc.descripcion}
                              </p>
                            )}
                          </div>
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDownloadDocument(doc.id)}
                          iconName="Download"
                          iconPosition="left"
                        >
                          Descargar
                        </Button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12 border-2 border-dashed border-border rounded-lg">
                    <Icon name="FileText" size={48} className="text-muted-foreground mx-auto mb-3" />
                    <p className="text-sm text-muted-foreground">No hay documentos disponibles</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Este empleado no tiene documentos adjuntos
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Estudios Médicos - OCULTO TEMPORALMENTE */}
          {/* La sección de Archivos está oculta hasta que se complete la implementación */}
          {/* Para reactivar, descomenta el bloque siguiente y ajusta los índices de las secciones EPP y Contacto de Emergencia */}
          {/* También necesitarás descomentar la importación de medicalStatusOptions y cambiar _medicalStudies a medicalStudies */}
          {/* {step === 1 && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Input
                  label="Último Examen Médico"
                  type="date"
                  value={_medicalStudies.lastExam ?? ''}
                  disabled
                />
                <Input
                  label="Próximo Examen Médico"
                  type="date"
                  value={_medicalStudies.nextExam ?? ''}
                  disabled
                />
                <Select
                  label="Estado de Estudios Médicos"
                  options={medicalStatusOptions}
                  value={_medicalStudies.status ?? 'Pendiente'}
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
          )} */}

          {/* EPP */}
          {step === 3 && (
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
          {step === 4 && (
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

