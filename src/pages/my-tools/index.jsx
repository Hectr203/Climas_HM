import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { jwtDecode } from 'jwt-decode';
import useHerramientas from '../../hooks/useHerramientas';
import useAuth from '../../hooks/useAuth';
import usePerson from '../../hooks/usePerson';
import { useConfirmDialog } from '../../ui/ConfirmDialogContext';
import { useNotifications } from '../../context/NotificationContext';
import Icon from '../../components/AppIcon';
import Button from '../../components/ui/Button';
import Select from '../../components/ui/Select';
import Sidebar from '../../components/ui/Sidebar';

/**
 * Página para personal de obra
 * Muestra solo las herramientas asignadas al empleado logueado
 * Permite devolver herramientas al taller
 */
const MyToolsPage = () => {
  const navigate = useNavigate();
  const { logout } = useAuth();
  const { showConfirm } = useConfirmDialog();
  const { showSuccess, showError } = useNotifications();
  const [herramientas, setHerramientas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [returning, setReturning] = useState(null);
  const [empleadoData, setEmpleadoData] = useState({ id: '', nombre: '' });
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [personalTaller, setPersonalTaller] = useState([]);
  const [showReturnModal, setShowReturnModal] = useState(false);
  const [herramientaADevolver, setHerramientaADevolver] = useState(null);
  const [personalSeleccionado, setPersonalSeleccionado] = useState('');

  const { getHerramientas, asignarUbicacion } = useHerramientas();
  const { getPersonsByDepartment } = usePerson();

  useEffect(() => {
    // Obtener datos del empleado del JWT
    try {
      const token = localStorage.getItem('authToken');
      if (token) {
        const decoded = jwtDecode(token);
        setEmpleadoData({
          id: decoded.id,
          nombre: decoded.nombreCompleto || decoded.email || 'Usuario'
        });
      }
    } catch (error) {
      console.error('Error al decodificar token:', error);
    }

    loadMyTools();
    loadPersonalTaller();
  }, []);

  const loadPersonalTaller = async () => {
    try {
      const response = await getPersonsByDepartment('Taller');
      setPersonalTaller(response || []);
    } catch (error) {
      console.error('Error al cargar personal del taller:', error);
      setPersonalTaller([]);
    }
  };

  const loadMyTools = async () => {
    setLoading(true);
    try {
      // Obtener ID del empleado del token
      const token = localStorage.getItem('authToken');
      const decoded = jwtDecode(token);
      const empleadoId = decoded.id;

      console.log('🔍 Filtrando herramientas para empleado:', empleadoId);
      
      // Obtener herramientas usando sin_filtro_automatico porque el backend
      // todavía no tiene el campo empleado_id_asignado correctamente mapeado
      const response = await getHerramientas({ 
        ubicacion_tipo: 'obra',
        sin_filtro_automatico: 'true'
      });
      
      const todasHerramientas = response?.data || response || [];

      // Filtrar manualmente las herramientas del empleado actual
      // Buscar coincidencia por empleado_id_asignado, empleado_id, o ubicacion_nombre
      const misHerramientas = Array.isArray(todasHerramientas)
        ? todasHerramientas.filter(h => {
            const coincideEmpleadoAsignado = h.empleado_id_asignado === empleadoId;
            const coincideEmpleadoId = h.empleado_id === empleadoId;
            const coincideNombre = h.ubicacion_nombre === empleadoId;
            const coincideId = h.ubicacion_id === empleadoId;
            
            return coincideEmpleadoAsignado || coincideEmpleadoId || coincideNombre || coincideId;
          })
        : [];
      setHerramientas(misHerramientas);
    } catch (error) {
      console.error('Error al cargar herramientas:', error);
      setHerramientas([]);
    } finally {
      setLoading(false);
    }
  };

  const handleReturnClick = (herramienta) => {
    setHerramientaADevolver(herramienta);
    setPersonalSeleccionado('');
    setShowReturnModal(true);
  };

  const handleConfirmReturn = async () => {
    if (!personalSeleccionado) {
      showError('Selecciona a quién le devuelves la herramienta');
      return;
    }

    const personal = personalTaller.find(p => p.id === personalSeleccionado);
    if (!personal) {
      showError('Personal no encontrado');
      return;
    }

    setShowReturnModal(false);
    setReturning(herramientaADevolver.id);

    try {
      // IMPORTANTE: Verificar datos de la herramienta ANTES de devolver
      console.log('🔍 DATOS COMPLETOS DE LA HERRAMIENTA:', herramientaADevolver);
      console.log('📋 empleado_id en herramienta:', herramientaADevolver.empleado_id);
      console.log('📋 ubicacion_nombre en herramienta:', herramientaADevolver.ubicacion_nombre);
      console.log('📋 ubicacion_tipo en herramienta:', herramientaADevolver.ubicacion_tipo);
      
      const payload = {
        ubicacion_tipo: 'taller',
        ubicacion_id: null,
        ubicacion_nombre: personal.nombreCompleto,
        observaciones: `Devuelto por ${empleadoData.nombre}`
      };
      
      console.log('📤 Enviando devolución:', payload);
      console.log('🔧 Herramienta ID:', herramientaADevolver.id);
      console.log('👤 Empleado ID del JWT:', empleadoData.id);
      console.log('👤 Personal taller destino:', personal.nombreCompleto);
      
      await asignarUbicacion(herramientaADevolver.id, payload);

      // Recargar lista de herramientas
      await loadMyTools();
      
      showSuccess(`Herramienta devuelta a ${personal.nombreCompleto} en el taller`);
    } catch (error) {
      console.error('❌ Error al devolver herramienta:', error);
      console.error('❌ Respuesta completa del backend:', error.response);
      console.error('❌ Data del error:', error.response?.data);
      console.error('❌ Mensaje del error:', error.response?.data?.message);
      console.error('❌ Status:', error.response?.status);
      
      const errorMsg = error.response?.data?.message || error.message || 'Error al devolver herramienta';
      showError(`${errorMsg} - Contacta al administrador si el problema persiste`);
    } finally {
      setReturning(null);
      setHerramientaADevolver(null);
    }
  };

  const handleLogout = async () => {
    const confirmed = await showConfirm({
      title: 'Cerrar Sesión',
      message: '¿Deseas cerrar sesión?',
      confirmText: 'Cerrar Sesión',
      cancelText: 'Cancelar'
    });

    if (confirmed) {
      logout();
      navigate('/login');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Icon name="Loader2" className="w-8 h-8 animate-spin text-blue-600" />
        <span className="ml-3 text-gray-600">Cargando herramientas...</span>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-gray-50">
      {/* Sidebar */}
      <Sidebar 
        collapsed={sidebarCollapsed} 
        userRole="obra"
        userName={empleadoData.nombre}
        onCollapsedChange={setSidebarCollapsed}
      />

      {/* Main Content */}
      <div className={`flex-1 transition-all duration-300 ${
        sidebarCollapsed ? 'ml-0 lg:ml-20' : 'ml-0 lg:ml-64'
      }`}>
        <div className="max-w-7xl mx-auto p-4 md:p-6">
          {/* Toggle Sidebar Button */}
          <button
            className="lg:hidden fixed top-4 left-4 z-50 bg-white border border-gray-200 rounded-lg p-2 shadow-lg hover:bg-gray-50"
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
          >
            <Icon name={sidebarCollapsed ? "ChevronRight" : "ChevronLeft"} className="w-5 h-5" />
          </button>

          {/* Header */}
          <div className="mb-6">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl md:text-3xl font-bold text-gray-900 flex items-center gap-2">
                  <Icon name="Package" className="w-8 h-8 text-blue-600" />
                  Mis Herramientas
                </h1>
                <p className="text-gray-600 mt-2">
                  Herramientas asignadas a: <strong className="text-gray-900">{empleadoData.nombre}</strong>
                </p>
                <p className="text-sm text-gray-500 mt-1">
                  Total: <strong>{herramientas.length}</strong> herramienta{herramientas.length !== 1 ? 's' : ''}
                </p>
              </div>
              
              {/* Logout Button */}
              <Button
                variant="outline"
                size="sm"
                onClick={handleLogout}
                className="hidden md:flex items-center gap-2"
              >
                <Icon name="LogOut" className="w-4 h-4" />
                Cerrar Sesión
              </Button>
            </div>
          </div>

      {/* Lista de herramientas */}
      {herramientas.length === 0 ? (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-8 text-center">
          <Icon name="Package" className="w-16 h-16 mx-auto text-blue-400 mb-4" />
          <h3 className="text-lg font-semibold text-blue-900 mb-2">
            No tienes herramientas asignadas
          </h3>
          <p className="text-blue-700">
            Actualmente no tienes herramientas bajo tu responsabilidad
          </p>
        </div>
      ) : (
        <div className="grid gap-4">
          {herramientas.map((herramienta) => (
            <div
              key={herramienta.id}
              className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
            >
              <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
                {/* Información de la herramienta */}
                <div className="flex-1">
                  <div className="flex items-start gap-3">
                    <div className="bg-blue-100 p-2 rounded-lg">
                      <Icon name="Wrench" className="w-6 h-6 text-blue-600" />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-semibold text-lg text-gray-900">
                        {herramienta.nombre}
                      </h3>
                      {herramienta.descripcion && (
                        <p className="text-sm text-gray-600 mt-1">
                          {herramienta.descripcion}
                        </p>
                      )}
                      
                      {/* Tags */}
                      <div className="flex flex-wrap items-center gap-2 mt-3">
                        <span className="text-xs bg-gray-100 px-3 py-1 rounded-full font-medium">
                          <Icon name="Hash" className="w-3 h-3 inline mr-1" />
                          {herramienta.numero_pieza}
                        </span>
                        <span className="text-xs bg-blue-100 text-blue-700 px-3 py-1 rounded-full font-medium">
                          <Icon name="MapPin" className="w-3 h-3 inline mr-1" />
                          En Obra
                        </span>
                        {herramienta.created_at && (
                          <span className="text-xs text-gray-500">
                            <Icon name="Clock" className="w-3 h-3 inline mr-1" />
                            Asignada: {new Date(herramienta.created_at).toLocaleDateString()}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
                
                {/* Botón de devolución */}
                <div className="flex md:flex-col gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleReturnClick(herramienta)}
                    disabled={returning === herramienta.id}
                    className="whitespace-nowrap"
                  >
                    {returning === herramienta.id ? (
                      <>
                        <Icon name="Loader2" className="w-4 h-4 mr-2 animate-spin" />
                        Devolviendo...
                      </>
                    ) : (
                      <>
                        <Icon name="RotateCcw" className="w-4 h-4 mr-2" />
                        Devolver al Taller
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

          {/* Información adicional */}
          <div className="mt-6 p-4 bg-gray-50 border border-gray-200 rounded-lg">
            <div className="flex items-start gap-3">
              <Icon name="Info" className="w-5 h-5 text-blue-600 mt-0.5" />
              <div className="flex-1">
                <h4 className="font-semibold text-gray-900 mb-1">Información</h4>
                <ul className="text-sm text-gray-600 space-y-1">
                  <li>• Las herramientas devueltas quedarán disponibles en el taller</li>
                  <li>• Todos los movimientos quedan registrados en el historial</li>
                  <li>• Si necesitas una herramienta, contacta al encargado del taller</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Modal de Devolución */}
      {showReturnModal && herramientaADevolver && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold text-gray-900">Devolver Herramienta</h3>
              <button
                onClick={() => setShowReturnModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <Icon name="X" className="w-5 h-5" />
              </button>
            </div>

            <div className="mb-4">
              <p className="text-gray-700 mb-2">
                Herramienta: <strong>{herramientaADevolver.nombre}</strong>
              </p>
              <p className="text-sm text-gray-600">
                Selecciona a quién del taller le entregas la herramienta:
              </p>
            </div>

            <div className="mb-6">
              <Select
                value={personalSeleccionado}
                onChange={setPersonalSeleccionado}
                placeholder="Selecciona personal del taller"
                searchable={true}
                options={personalTaller.map(p => ({
                  value: p.id,
                  label: p.puesto ? `${p.nombreCompleto} — ${p.puesto}` : p.nombreCompleto
                }))}
              />
            </div>

            <div className="flex gap-3">
              <Button
                variant="outline"
                onClick={() => setShowReturnModal(false)}
                className="flex-1"
              >
                Cancelar
              </Button>
              <Button
                onClick={handleConfirmReturn}
                disabled={!personalSeleccionado}
                className="flex-1"
              >
                <Icon name="RotateCcw" className="w-4 h-4 mr-2" />
                Devolver
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MyToolsPage;
