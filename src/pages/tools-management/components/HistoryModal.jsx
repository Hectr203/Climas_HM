import React, { useState, useEffect } from 'react';
import Icon from '../../../components/AppIcon';
import Button from '../../../components/ui/Button';

/**
 * Modal para ver historial de movimientos de una herramienta
 * HU 5 – Ver historial de movimientos de una herramienta
 */
const HistoryModal = ({ tool, onClose, getHistorial }) => {
  const [historial, setHistorial] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadHistorial();
  }, []);

  const loadHistorial = async () => {
    setLoading(true);
    try {
      const data = await getHistorial(tool.id);
      setHistorial(data || []);
    } finally {
      setLoading(false);
    }
  };

  const getLocationIcon = (tipo) => {
    switch (tipo) {
      case 'proyecto': return 'FolderOpen';
      case 'obra': return 'Building2';
      case 'oficina': return 'Briefcase';
      case 'taller': return 'Wrench';
      default: return 'MapPin';
    }
  };

  const getLocationColor = (tipo) => {
    switch (tipo) {
      case 'proyecto': return 'text-blue-600 bg-blue-50';
      case 'obra': return 'text-orange-600 bg-orange-50';
      case 'oficina': return 'text-purple-600 bg-purple-50';
      case 'taller': return 'text-green-600 bg-green-50';
      default: return 'text-gray-600 bg-gray-50';
    }
  };

  const formatFecha = (fecha) => {
    if (!fecha) return 'Fecha no disponible';
    try {
      const date = new Date(fecha);
      return new Intl.DateTimeFormat('es-MX', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      }).format(date);
    } catch (e) {
      return fecha;
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-3xl w-full max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
              <Icon name="History" className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-gray-900">
                Historial de Movimientos
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

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {loading ? (
            <div className="flex flex-col items-center justify-center h-64">
              <Icon name="Loader2" className="w-12 h-12 text-blue-600 animate-spin mb-4" />
              <p className="text-gray-600">Cargando historial...</p>
            </div>
          ) : historial.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 text-center">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                <Icon name="History" className="w-8 h-8 text-gray-400" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Sin movimientos registrados
              </h3>
              <p className="text-gray-600 max-w-sm">
                Esta herramienta aún no tiene movimientos registrados. El historial se actualizará cuando se asigne a una nueva ubicación.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Timeline */}
              <div className="relative">
                {historial.map((movimiento, index) => (
                  <div key={movimiento.id || index} className="relative pl-8 pb-8 last:pb-0">
                    {/* Timeline Line */}
                    {index < historial.length - 1 && (
                      <div className="absolute left-3 top-6 w-0.5 h-full bg-gray-200" />
                    )}

                    {/* Timeline Dot */}
                    <div className="absolute left-0 top-1.5 w-6 h-6 rounded-full bg-blue-600 flex items-center justify-center">
                      <Icon name="MapPin" className="w-3 h-3 text-white" />
                    </div>

                    {/* Content */}
                    <div className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm hover:shadow-md transition-shadow">
                      {/* Header */}
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center gap-3">
                          <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg ${getLocationColor(movimiento.ubicacion_tipo)}`}>
                            <Icon name={getLocationIcon(movimiento.ubicacion_tipo)} className="w-4 h-4" />
                            <span className="text-sm font-medium capitalize">
                              {movimiento.ubicacion_tipo}
                            </span>
                          </div>
                          {index === 0 && (
                            <span className="px-2 py-1 bg-green-100 text-green-700 text-xs font-medium rounded">
                              Actual
                            </span>
                          )}
                        </div>
                        <span className="text-xs text-gray-500">
                          {formatFecha(movimiento.fecha_asignacion || movimiento.created_at)}
                        </span>
                      </div>

                      {/* Location Details */}
                      {movimiento.ubicacion_nombre && (
                        <p className="text-gray-900 font-medium mb-2 flex items-center gap-2">
                          <Icon name="MapPin" className="w-4 h-4 text-gray-400" />
                          {movimiento.ubicacion_nombre}
                        </p>
                      )}

                      {/* Observaciones */}
                      {movimiento.observaciones && (
                        <p className="text-sm text-gray-600 mb-2">
                          <span className="font-medium">Observaciones:</span> {movimiento.observaciones}
                        </p>
                      )}

                      {/* User */}
                      {movimiento.usuario_nombre && (
                        <div className="flex items-center gap-2 text-sm text-gray-500 mt-3 pt-3 border-t border-gray-100">
                          <Icon name="User" className="w-4 h-4" />
                          <span>Registrado por: {movimiento.usuario_nombre}</span>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {/* Summary */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 flex gap-3">
                <Icon name="Info" className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                <div className="text-sm text-blue-800">
                  <p className="font-medium mb-1">
                    Total de movimientos: {historial.length}
                  </p>
                  <p className="text-blue-700">
                    Esta herramienta ha sido movida {historial.length} {historial.length === 1 ? 'vez' : 'veces'}
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="bg-gray-50 border-t border-gray-200 px-6 py-4 flex justify-end">
          <Button
            onClick={onClose}
            variant="outline"
          >
            Cerrar
          </Button>
        </div>
      </div>
    </div>
  );
};

export default HistoryModal;
