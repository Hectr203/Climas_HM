import React, { useState, useEffect } from 'react';
import Icon from '../../../components/AppIcon';
import Button from '../../../components/ui/Button';
import Input from '../../../components/ui/Input';
import Select from '../../../components/ui/Select';
import usePerson from '../../../hooks/usePerson';
import personService from '../../../services/personService';

/**
 * Modal para asignar o cambiar ubicación de una herramienta
 * HU 2 – Asignar herramienta a una ubicación
 * HU 3 – Cambiar ubicación de la herramienta
 * 
 * FLUJO ACTUALIZADO:
 * - Admin: puede asignar a cualquier ubicación (taller, oficina, obra)
 * - Taller: puede asignar a taller, oficina, obra (hub central)
 * - Oficina: puede asignar a taller y obra
 * - Obra: solo puede asignar a taller
 * 
 * NOTA: Solo obra requiere seleccionar proyecto activo para relación
 */
const AssignLocationModal = ({ tool, onClose, onConfirm, getProyectosParaAsignar }) => {
  const [formData, setFormData] = useState({
    ubicacion_tipo: tool.ubicacion_tipo || 'taller',
    ubicacion_id: tool.ubicacion_id || null,
    ubicacion_nombre: '',
    observaciones: ''
  });
  
  // Guardar referencia del empleado seleccionado (para obra)
  const [empleadoSeleccionado, setEmpleadoSeleccionado] = useState(null);

  const [proyectos, setProyectos] = useState([]);
  const [loadingProyectos, setLoadingProyectos] = useState(false);
  const [personal, setPersonal] = useState([]);
  const [loadingPersonal, setLoadingPersonal] = useState(false);
  const [errors, setErrors] = useState({});
  const [isSaving, setIsSaving] = useState(false);

  // Hook para obtener personal
  const { getPersonsByDepartment } = usePerson();

  // Obtener rol del usuario del localStorage
  const userRole = localStorage.getItem('userRole') || 'oficina';

  // Definir ubicaciones permitidas según rol
  // SINCRONIZADO CON BACKEND (DOCUMENTACION_API_HERRAMIENTAS_FRONTEND.md)
  const getUbicacionesPermitidas = () => {
    switch (userRole) {
      case 'admin':
        return ['taller', 'oficina', 'obra'];
      case 'taller':
        return ['taller', 'oficina', 'obra'];
      case 'oficina':
        return ['taller', 'obra']; // Backend permite taller y obra
      case 'obra':
        return ['taller'];
      default:
        return ['taller'];
    }
  };

  const ubicacionesPermitidas = getUbicacionesPermitidas();

  useEffect(() => {
    loadProyectos();
  }, []);

  // Cargar personal cuando cambia el tipo de ubicación o proyecto (para obra)
  useEffect(() => {
    if (formData.ubicacion_tipo) {
      if (formData.ubicacion_tipo === 'obra' && formData.ubicacion_id) {
        // Para obra, cargar personal del proyecto seleccionado
        loadPersonalPorProyecto(formData.ubicacion_id);
      } else if (formData.ubicacion_tipo !== 'obra') {
        // Para taller y oficina, cargar por departamento
        loadPersonal(formData.ubicacion_tipo);
      }
    }
  }, [formData.ubicacion_tipo, formData.ubicacion_id]);

  const loadProyectos = async () => {
    setLoadingProyectos(true);
    try {
      const response = await getProyectosParaAsignar();
      
      // Manejar tanto formato directo como {success, data}
      if (Array.isArray(response)) {
        setProyectos(response);
      } else if (response && Array.isArray(response.data)) {
        setProyectos(response.data);
      } else {
        console.warn('Formato inesperado de proyectos:', response);
        setProyectos([]);
      }
    } catch (error) {
      console.error('Error al cargar proyectos:', error);
      setProyectos([]);
    } finally {
      setLoadingProyectos(false);
    }
  };

  const loadPersonal = async (ubicacionTipo) => {
    setLoadingPersonal(true);
    try {
      // Mapear tipo de ubicación a departamento
      const departmentMap = {
        'taller': 'Taller',
        'oficina': 'Proyectos', // Oficina carga personal del departamento Proyectos
        'obra': 'Obra'
      };
      
      const department = departmentMap[ubicacionTipo];
      if (!department) {
        setPersonal([]);
        return;
      }

      const response = await getPersonsByDepartment(department);
      
      if (Array.isArray(response)) {
        setPersonal(response);
      } else {
        console.warn('Formato inesperado de personal:', response);
        setPersonal([]);
      }
    } catch (error) {
      console.error('Error al cargar personal:', error);
      setPersonal([]);
    } finally {
      setLoadingPersonal(false);
    }
  };

  const loadPersonalPorProyecto = async (proyectoId) => {
    setLoadingPersonal(true);
    try {
      // Buscar el proyecto en la lista para obtener su personal asignado
      const proyecto = proyectos.find(p => p.id === proyectoId || p.id === parseInt(proyectoId));
      
      console.log('📋 Proyecto encontrado:', proyecto);
      console.log('📋 Personal asignado al proyecto:', proyecto?.personalAsignado);
      
      if (proyecto && proyecto.personalAsignado && Array.isArray(proyecto.personalAsignado)) {
        // Convertir el array de strings a objetos
        // Formato: "NOMBRE — puesto" → {id: nombre, nombreCompleto: nombre, puesto: puesto}
        const personalFormateado = proyecto.personalAsignado.map((personaStr, index) => {
          const [nombre, puesto] = personaStr.split(' — ');
          const nombreLimpio = nombre?.trim() || 'Sin nombre';
          
          return {
            id: nombreLimpio, // Usar el nombre como ID
            nombreCompleto: nombreLimpio,
            puesto: puesto?.trim() || '',
            _esDelProyecto: true // Marcador para identificar que viene del proyecto
          };
        });
        
        console.log('📋 Personal formateado del proyecto:', personalFormateado);
        setPersonal(personalFormateado);
      } else {
        console.warn('Proyecto sin personal asignado');
        setPersonal([]);
      }
    } catch (error) {
      console.error('Error al cargar personal del proyecto:', error);
      setPersonal([]);
    } finally {
      setLoadingPersonal(false);
    }
  };

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    
    // Si cambia el tipo de ubicación, limpiar ubicacion_id y nombre
    if (field === 'ubicacion_tipo') {
      setFormData(prev => ({
        ...prev,
        ubicacion_id: null,
        ubicacion_nombre: ''
      }));
    }

    // Si selecciona un proyecto para obra, validar que exista
    if (field === 'ubicacion_id' && formData.ubicacion_tipo === 'obra' && value) {
      const proyecto = proyectos.find(p => p.id === value || p.id === parseInt(value));
      if (!proyecto && proyectos.length > 0) {
        console.warn('Proyecto no encontrado en la lista');
      }
    }

    // Limpiar error del campo
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const validateForm = () => {
    const newErrors = {};

    // Para taller, se requiere personal
    if (formData.ubicacion_tipo === 'taller') {
      if (!formData.ubicacion_nombre) {
        newErrors.ubicacion_nombre = 'Selecciona el personal asignado';
      }
      setFormData(prev => ({
        ...prev,
        ubicacion_id: null
      }));
    } 
    // Para oficina, solo se requiere personal
    else if (formData.ubicacion_tipo === 'oficina') {
      if (!formData.ubicacion_nombre) {
        newErrors.ubicacion_nombre = 'Selecciona el personal asignado';
      }
    }
    // Para obra, se requiere proyecto y personal asignado
    else if (formData.ubicacion_tipo === 'obra') {
      if (!formData.ubicacion_id) {
        newErrors.ubicacion_id = 'Selecciona un proyecto';
      }
      if (!formData.ubicacion_nombre) {
        newErrors.ubicacion_nombre = 'Selecciona el personal asignado';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setIsSaving(true);
    try {
      // Preparar datos según formato del backend
      const payload = { ...formData };
      
      // Para obra, formatear ubicacion_id como 'proyecto-{id}' o usar el empleadoId
      if (formData.ubicacion_tipo === 'obra') {
        if (formData.ubicacion_id) {
          payload.ubicacion_id = `proyecto-${formData.ubicacion_id}`;
        }
        
        // Si hay empleado seleccionado
        if (empleadoSeleccionado) {
          // Si viene del proyecto (solo tiene nombre), buscar el empleado real por nombre
          if (empleadoSeleccionado._esDelProyecto) {
            console.log('🔍 Buscando empleado real por nombre:', empleadoSeleccionado.nombreCompleto);
            
            try {
              // Obtener TODOS los empleados sin filtrar por departamento
              const responseEmpleados = await personService.getPersons();
              const todosEmpleados = responseEmpleados?.data || [];
              
              // Buscar por coincidencia de nombre
              const empleadoReal = todosEmpleados.find(emp => {
                const nombreCompleto = (emp.nombreCompleto || '').trim().toUpperCase();
                const nombreBuscado = empleadoSeleccionado.nombreCompleto.toUpperCase();
                return nombreCompleto.includes(nombreBuscado) || nombreBuscado.includes(nombreCompleto);
              });
              
              if (empleadoReal) {
                console.log('✅ Empleado real encontrado:', empleadoReal);
                payload.empleado_id = empleadoReal.id;
                payload.ubicacion_nombre = empleadoReal.nombreCompleto;
              } else {
                console.warn('⚠️ No se encontró empleado real, usando solo el nombre');
                payload.empleado_id = null;
                payload.ubicacion_nombre = empleadoSeleccionado.nombreCompleto;
              }
            } catch (error) {
              console.error('Error al buscar empleado real:', error);
              payload.empleado_id = null;
              payload.ubicacion_nombre = empleadoSeleccionado.nombreCompleto;
            }
          } else {
            // Si ya tiene ID real (viene de la BD)
            payload.empleado_id = empleadoSeleccionado.id;
            payload.ubicacion_nombre = empleadoSeleccionado.nombreCompleto || empleadoSeleccionado.id;
          }
        }
      }
      
      console.log('📤 Enviando payload:', payload);
      await onConfirm(payload);
    } finally {
      setIsSaving(false);
    }
  };

  const getLocationIcon = (tipo) => {
    switch (tipo) {
      case 'oficina': return 'Briefcase';
      case 'obra': return 'Building2';
      case 'taller': return 'Wrench';
      default: return 'MapPin';
    }
  };

  const getLocationColor = (tipo) => {
    switch (tipo) {
      case 'oficina': return 'border-purple-300 bg-purple-50';
      case 'obra': return 'border-orange-300 bg-orange-50';
      case 'taller': return 'border-green-300 bg-green-50';
      default: return 'border-gray-300 bg-gray-50';
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
              <Icon name="MapPin" className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-gray-900">
                Asignar Ubicación
              </h2>
              <p className="text-sm text-gray-600">
                {tool.nombre} - {tool.numero_pieza}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <Icon name="X" className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Current Location */}
          {tool.ubicacion_tipo && (
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
              <p className="text-sm font-medium text-gray-700 mb-2">
                Ubicación Actual
              </p>
              <div className="flex items-center gap-3">
                <Icon name={getLocationIcon(tool.ubicacion_tipo)} className="w-5 h-5 text-gray-600" />
                <div>
                  <p className="font-medium text-gray-900 capitalize">
                    {tool.ubicacion_tipo}
                  </p>
                  {tool.ubicacion_nombre && (
                    <p className="text-sm text-gray-600">{tool.ubicacion_nombre}</p>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Tipo de Ubicación */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">
              Nueva Ubicación <span className="text-red-500">*</span>
            </label>
            <div className="grid grid-cols-3 gap-3">
              {['taller', 'oficina', 'obra'].map((tipo) => {
                const isPermitido = ubicacionesPermitidas.includes(tipo);
                return (
                  <button
                    key={tipo}
                    type="button"
                    onClick={() => isPermitido && handleChange('ubicacion_tipo', tipo)}
                    disabled={!isPermitido}
                    className={`p-4 rounded-lg border-2 transition-all ${
                      !isPermitido
                        ? 'opacity-40 cursor-not-allowed bg-gray-50'
                        : formData.ubicacion_tipo === tipo
                        ? getLocationColor(tipo) + ' border-current'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                    title={!isPermitido ? 'No tienes permiso para asignar a esta ubicación' : ''}
                  >
                    <Icon 
                      name={getLocationIcon(tipo)} 
                      className={`w-6 h-6 mx-auto mb-2 ${
                        !isPermitido
                          ? 'text-gray-300'
                          : formData.ubicacion_tipo === tipo ? 'text-current' : 'text-gray-400'
                      }`}
                    />
                    <p className={`text-sm font-medium capitalize ${
                      !isPermitido
                        ? 'text-gray-400'
                        : formData.ubicacion_tipo === tipo ? 'text-gray-900' : 'text-gray-600'
                    }`}>
                      {tipo}
                    </p>
                  </button>
                );
              })}
            </div>
            {userRole === 'oficina' && (
              <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded-lg flex gap-2">
                <Icon name="Info" className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-blue-800">
                  Puedes enviar herramientas a <strong>Taller</strong> u <strong>Obra</strong>. Se recomienda enviar a taller primero para revisión.
                </p>
              </div>
            )}
            {userRole === 'obra' && (
              <div className="mt-3 p-3 bg-amber-50 border border-amber-200 rounded-lg flex gap-2">
                <Icon name="AlertCircle" className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-amber-800">
                  Solo puedes devolver herramientas al <strong>Taller</strong>.
                </p>
              </div>
            )}
          </div>

          {/* Personal de Taller */}
          {formData.ubicacion_tipo === 'taller' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Personal Asignado <span className="text-red-500">*</span>
              </label>
              {loadingPersonal ? (
                <div className="flex items-center justify-center p-4 bg-gray-50 rounded-lg">
                  <Icon name="Loader2" className="w-5 h-5 animate-spin text-blue-600 mr-2" />
                  <span className="text-gray-600">Cargando personal...</span>
                </div>
              ) : personal.length === 0 ? (
                <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <p className="text-sm text-yellow-800">
                    <Icon name="AlertTriangle" className="w-4 h-4 inline mr-1" />
                    No hay personal disponible en el departamento Taller.
                  </p>
                </div>
              ) : (
                <Select
                  value={formData.ubicacion_nombre || ''}
                  onChange={(value) => handleChange('ubicacion_nombre', value)}
                  placeholder="Selecciona el personal asignado"
                  searchable={true}
                  options={personal.map((persona) => ({
                    value: persona.id || persona._id,
                    label: persona.nombreCompleto || `${persona.nombre || ''} ${persona.apellido || ''}`.trim() || persona.email || 'Sin nombre'
                  }))}
                  className={errors.ubicacion_nombre ? 'border-red-500' : ''}
                />
              )}
              {errors.ubicacion_nombre && (
                <p className="text-red-500 text-sm mt-1">{errors.ubicacion_nombre}</p>
              )}
            </div>
          )}

          {/* Personal de Oficina */}
          {formData.ubicacion_tipo === 'oficina' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Personal Asignado <span className="text-red-500">*</span>
              </label>
              {loadingPersonal ? (
                <div className="flex items-center justify-center p-4 bg-gray-50 rounded-lg">
                  <Icon name="Loader2" className="w-5 h-5 animate-spin text-blue-600 mr-2" />
                  <span className="text-gray-600">Cargando personal...</span>
                </div>
              ) : personal.length === 0 ? (
                <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <p className="text-sm text-yellow-800">
                    <Icon name="AlertTriangle" className="w-4 h-4 inline mr-1" />
                    No hay personal disponible en el departamento Proyectos.
                  </p>
                </div>
              ) : (
                <Select
                  value={formData.ubicacion_nombre || ''}
                  onChange={(value) => handleChange('ubicacion_nombre', value)}
                  placeholder="Selecciona el personal asignado"
                  searchable={true}
                  options={personal.map((persona) => ({
                    value: persona.id || persona._id,
                    label: persona.nombreCompleto || `${persona.nombre || ''} ${persona.apellido || ''}`.trim() || persona.email || 'Sin nombre'
                  }))}
                  className={errors.ubicacion_nombre ? 'border-red-500' : ''}
                />
              )}
              {errors.ubicacion_nombre && (
                <p className="text-red-500 text-sm mt-1">{errors.ubicacion_nombre}</p>
              )}
            </div>
          )}

          {/* Selector de Proyecto para Obra */}
          {formData.ubicacion_tipo === 'obra' && (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Proyecto Asociado <span className="text-red-500">*</span>
                </label>
                {loadingProyectos ? (
                  <div className="flex items-center justify-center p-4 bg-gray-50 rounded-lg">
                    <Icon name="Loader2" className="w-5 h-5 animate-spin text-blue-600 mr-2" />
                    <span className="text-gray-600">Cargando proyectos...</span>
                  </div>
                ) : (
                  <Select
                    value={formData.ubicacion_id || ''}
                    onChange={(value) => handleChange('ubicacion_id', value)}
                    placeholder="Selecciona un proyecto activo"
                    searchable={true}
                    options={proyectos.map((proyecto) => ({
                      value: proyecto.id || proyecto._id || proyecto.codigo,
                      label: proyecto.nombre || proyecto.nombreProyecto || proyecto.codigo || 'Sin nombre'
                    }))}
                    className={errors.ubicacion_id ? 'border-red-500' : ''}
                  />
                )}
                {errors.ubicacion_id && (
                  <p className="text-red-500 text-sm mt-1">{errors.ubicacion_id}</p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Personal Asignado <span className="text-red-500">*</span>
                </label>
                {loadingPersonal ? (
                  <div className="flex items-center justify-center p-4 bg-gray-50 rounded-lg">
                    <Icon name="Loader2" className="w-5 h-5 animate-spin text-blue-600 mr-2" />
                    <span className="text-gray-600">Cargando personal...</span>
                  </div>
                ) : personal.length === 0 ? (
                  <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                    <p className="text-sm text-yellow-800">
                      <Icon name="AlertTriangle" className="w-4 h-4 inline mr-1" />
                      Este proyecto no tiene personal asignado. Asigna personal al proyecto primero.
                    </p>
                  </div>
                ) : (
                  <Select
                    value={empleadoSeleccionado?.id || formData.ubicacion_nombre || ''}
                    onChange={(value) => {
                      // Buscar el empleado completo por su ID REAL
                      const empleado = personal.find(p => p.id === value || p._id === value);
                      if (empleado) {
                        setEmpleadoSeleccionado(empleado);
                        // Guardar el nombre completo en ubicacion_nombre
                        handleChange('ubicacion_nombre', empleado.nombreCompleto || empleado.id);
                      } else {
                        setEmpleadoSeleccionado(null);
                        handleChange('ubicacion_nombre', value);
                      }
                    }}
                    placeholder="Selecciona el personal asignado"
                    searchable={true}
                    options={personal.map((persona) => ({
                      value: persona.id || persona._id,
                      label: persona.nombreCompleto || 
                             `${persona.nombre || ''} ${persona.apellido || ''}`.trim() || 
                             persona.email || 
                             'Sin nombre'
                    }))}
                    className={errors.ubicacion_nombre ? 'border-red-500' : ''}
                  />
                )}
                {errors.ubicacion_nombre && (
                  <p className="text-red-500 text-sm mt-1">{errors.ubicacion_nombre}</p>
                )}
              </div>
            </>
          )}

          {/* Observaciones */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Observaciones
            </label>
            <textarea
              value={formData.observaciones}
              onChange={(e) => handleChange('observaciones', e.target.value)}
              placeholder="Motivo del cambio, condiciones de la herramienta, etc."
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
            />
          </div>

          {/* Info */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 flex gap-3">
            <Icon name="Info" className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-blue-800">
              Este cambio quedará registrado en el historial de movimientos de la herramienta.
            </p>
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-4 border-t border-gray-200">
            <Button
              type="button"
              onClick={onClose}
              variant="outline"
              className="flex-1"
              disabled={isSaving}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              className="flex-1 bg-blue-600 hover:bg-blue-700 text-white"
              disabled={isSaving}
            >
              {isSaving ? (
                <>
                  <Icon name="Loader2" className="w-5 h-5 animate-spin" />
                  Asignando...
                </>
              ) : (
                <>
                  <Icon name="Check" className="w-5 h-5" />
                  Confirmar Asignación
                </>
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AssignLocationModal;
