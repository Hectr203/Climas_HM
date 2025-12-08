import React, { useState } from 'react';
import Icon from '../../../components/AppIcon';
import Button from '../../../components/ui/Button';
import Input from '../../../components/ui/Input';
import useConsumoMateriales from '../../../hooks/useConsumoMateriales';
import { useNotifications } from '../../../context/NotificationContext';

const ConsumptionHistory = () => {
  const { showError } = useNotifications();
  const { historico, getHistoricoConsumo, loading } = useConsumoMateriales();
  
  const [fechaInicio, setFechaInicio] = useState(() => {
    const fecha = new Date();
    fecha.setDate(fecha.getDate() - 7); // Últimos 7 días por defecto
    return fecha.toISOString().split('T')[0];
  });
  
  const [fechaFin, setFechaFin] = useState(() => {
    return new Date().toISOString().split('T')[0];
  });

  const [mostrarFiltros, setMostrarFiltros] = useState(true);

  const handleBuscar = async () => {
    if (!fechaInicio || !fechaFin) {
      showError('Debe seleccionar fecha de inicio y fin');
      return;
    }

    if (new Date(fechaInicio) > new Date(fechaFin)) {
      showError('La fecha de inicio debe ser anterior a la fecha de fin');
      return;
    }

    try {
      await getHistoricoConsumo(fechaInicio, fechaFin);
    } catch (error) {
      console.error('Error al obtener histórico:', error);
      showError('Error al obtener el histórico de consumo');
    }
  };

  const formatearFecha = (fechaStr) => {
    if (!fechaStr) return 'Sin fecha';
    const fecha = new Date(fechaStr);
    return fecha.toLocaleDateString('es-MX', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const formatearFechaHora = (fechaStr) => {
    if (!fechaStr) return 'Sin fecha';
    const fecha = new Date(fechaStr);
    return fecha.toLocaleDateString('es-MX', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Agrupar histórico por fecha
  const historicoAgrupado = React.useMemo(() => {
    if (!Array.isArray(historico)) return [];

    const grupos = {};
    historico.forEach(registro => {
      const fecha = registro.fecha || registro.fechaRegistro?.split('T')[0] || 'sin-fecha';
      if (!grupos[fecha]) {
        grupos[fecha] = {
          fecha,
          registros: []
        };
      }
      grupos[fecha].registros.push(registro);
    });

    // Ordenar por fecha descendente
    return Object.values(grupos).sort((a, b) => 
      new Date(b.fecha) - new Date(a.fecha)
    );
  }, [historico]);

  // Calcular estadísticas
  const estadisticas = React.useMemo(() => {
    if (!Array.isArray(historico)) {
      return {
        totalRegistros: 0,
        totalMateriales: 0,
        diasConConsumo: 0,
        materialesUnicos: new Set()
      };
    }

    const materialesUnicos = new Set();
    let totalMateriales = 0;

    historico.forEach(registro => {
      if (registro.materiales && Array.isArray(registro.materiales)) {
        registro.materiales.forEach(m => {
          materialesUnicos.add(m.articuloId || m.articuloNombre);
          totalMateriales += parseFloat(m.cantidad) || 0;
        });
      } else {
        // Si viene como objeto individual
        materialesUnicos.add(registro.articuloId || registro.articuloNombre);
        totalMateriales += parseFloat(registro.cantidad) || 0;
      }
    });

    return {
      totalRegistros: historico.length,
      totalMateriales,
      diasConConsumo: historicoAgrupado.length,
      materialesUnicos: materialesUnicos.size
    };
  }, [historico, historicoAgrupado]);

  return (
    <div className="bg-card rounded-lg border border-border p-4 md:p-6 card-shadow">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-4 md:mb-6 gap-4">
        <div className="flex items-center space-x-3 min-w-0">
          <div className="w-8 h-8 bg-purple-500 rounded-lg flex items-center justify-center flex-shrink-0">
            <Icon name="History" size={20} color="white" />
          </div>
          <div className="min-w-0">
            <h3 className="text-base md:text-lg font-semibold text-foreground">Histórico de Consumo</h3>
            <p className="text-xs md:text-sm text-muted-foreground">
              Consulta el consumo de materiales por rango de fechas
            </p>
          </div>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setMostrarFiltros(!mostrarFiltros)}
          iconName={mostrarFiltros ? "ChevronUp" : "ChevronDown"}
          className="text-xs md:text-sm"
        >
          {mostrarFiltros ? 'Ocultar' : 'Mostrar'} Filtros
        </Button>
      </div>

      {/* Filtros */}
      {mostrarFiltros && (
        <div className="bg-muted/50 rounded-lg p-3 md:p-4 mb-4 md:mb-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2 md:gap-4">
            <div>
              <label className="text-xs md:text-sm font-medium mb-2 block text-foreground">
                Fecha Inicio
              </label>
              <Input
                type="date"
                value={fechaInicio}
                onChange={(e) => setFechaInicio(e.target.value)}
                className="w-full text-sm"
              />
            </div>
            <div>
              <label className="text-xs md:text-sm font-medium mb-2 block text-foreground">
                Fecha Fin
              </label>
              <Input
                type="date"
                value={fechaFin}
                onChange={(e) => setFechaFin(e.target.value)}
                className="w-full text-sm"
              />
            </div>
            <div className="flex items-end">
              <Button
                onClick={handleBuscar}
                iconName="Search"
                iconPosition="left"
                disabled={loading}
                className="w-full text-xs md:text-sm"
              >
                {loading ? 'Buscando...' : 'Buscar'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Estadísticas */}
      {estadisticas.totalRegistros > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 md:gap-4 mb-4 md:mb-6">
          <div className="bg-primary/10 rounded-lg p-2 md:p-3 border border-primary/20">
            <div className="text-xs md:text-sm text-muted-foreground">Total Registros</div>
            <div className="text-lg md:text-2xl font-bold text-primary">{estadisticas.totalRegistros}</div>
          </div>
          <div className="bg-blue-500/10 rounded-lg p-2 md:p-3 border border-blue-500/20">
            <div className="text-xs md:text-sm text-muted-foreground">Días con Consumo</div>
            <div className="text-lg md:text-2xl font-bold text-blue-600">{estadisticas.diasConConsumo}</div>
          </div>
          <div className="bg-green-500/10 rounded-lg p-2 md:p-3 border border-green-500/20">
            <div className="text-xs md:text-sm text-muted-foreground">Materiales Únicos</div>
            <div className="text-lg md:text-2xl font-bold text-green-600">{estadisticas.materialesUnicos}</div>
          </div>
          <div className="bg-orange-500/10 rounded-lg p-2 md:p-3 border border-orange-500/20">
            <div className="text-xs md:text-sm text-muted-foreground">Total Consumido</div>
            <div className="text-lg md:text-2xl font-bold text-orange-600">
              {estadisticas.totalMateriales.toFixed(2)}
            </div>
          </div>
        </div>
      )}

      {/* Histórico agrupado por fecha */}
      {loading && historico.length === 0 ? (
        <div className="flex items-center justify-center py-6 md:py-8">
          <div className="text-muted-foreground text-sm md:text-base">Cargando histórico...</div>
        </div>
      ) : historicoAgrupado.length === 0 ? (
        <div className="text-center py-6 md:py-8 text-muted-foreground">
          <Icon name="FileX" size={40} className="mx-auto mb-2 opacity-50" />
          <p className="text-sm md:text-base">No hay registros de consumo en el rango de fechas seleccionado</p>
          <p className="text-xs md:text-sm mt-2">Selecciona un rango de fechas y haz clic en "Buscar"</p>
        </div>
      ) : (
        <div className="space-y-3 md:space-y-4">
          {historicoAgrupado.map((grupo, grupoIndex) => (
            <div
              key={grupo.fecha}
              className="border border-border rounded-lg p-3 md:p-4 bg-muted/30"
            >
              <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-3 md:mb-4 pb-2 md:pb-3 border-b border-border gap-2">
                <div className="flex items-center space-x-2 min-w-0">
                  <Icon name="Calendar" size={18} className="text-primary flex-shrink-0" />
                  <div className="min-w-0">
                    <div className="font-semibold text-sm md:text-base text-foreground">
                      {formatearFecha(grupo.fecha)}
                    </div>
                    <div className="text-xs md:text-sm text-muted-foreground">
                      {grupo.registros.length} registro(s)
                    </div>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                {grupo.registros.map((registro, regIndex) => (
                  <div
                    key={registro.id || regIndex}
                    className="bg-card rounded border border-border/50 p-2 md:p-3"
                  >
                    <div className="flex items-center justify-between mb-2 gap-1">
                      <div className="text-xs md:text-sm text-muted-foreground truncate">
                        Registro #{regIndex + 1} • {formatearFechaHora(registro.fechaRegistro || registro.createdAt)}
                      </div>
                    </div>

                    {registro.materiales && Array.isArray(registro.materiales) ? (
                      <div className="space-y-1">
                        {registro.materiales.map((material, matIndex) => (
                          <div
                            key={matIndex}
                            className="flex flex-col md:flex-row md:items-center md:justify-between p-1 md:p-2 bg-muted/30 rounded gap-1"
                          >
                            <div className="flex-1 min-w-0">
                              <div className="font-medium text-xs md:text-sm text-foreground truncate">
                                {material.nombre || material.articuloNombre || 'Material sin nombre'}
                              </div>
                              <div className="text-xs text-muted-foreground truncate">
                                {material.codigo || material.articuloCodigo || 'Sin código'} • 
                                {material.cantidad} {material.unidad || 'pcs'}
                                {material.notas && ` • ${material.notas}`}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="flex flex-col md:flex-row md:items-center md:justify-between p-1 md:p-2 bg-muted/30 rounded gap-1">
                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-xs md:text-sm text-foreground truncate">
                            {registro.nombre || registro.articuloNombre || 'Material sin nombre'}
                          </div>
                          <div className="text-xs text-muted-foreground truncate">
                            {registro.codigo || registro.articuloCodigo || 'Sin código'} • 
                            {registro.cantidad} {registro.unidad || 'pcs'}
                            {registro.notas && ` • ${registro.notas}`}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default ConsumptionHistory;
