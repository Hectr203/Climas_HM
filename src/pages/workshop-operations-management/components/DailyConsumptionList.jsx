import React, { useState, useEffect } from 'react';
import Icon from '../../../components/AppIcon';
import Button from '../../../components/ui/Button';
import Input from '../../../components/ui/Input';
import useConsumoMateriales from '../../../hooks/useConsumoMateriales';
import { useNotifications } from '../../../context/NotificationContext';

const DailyConsumptionList = () => {
  const { showError } = useNotifications();
  const { consumoHoy, getConsumoHoy, getConsumoPorDia, loading } = useConsumoMateriales();
  const [fecha, setFecha] = useState(new Date().toISOString().split('T')[0]);
  const [consumoDia, setConsumoDia] = useState([]);

  useEffect(() => {
    cargarConsumoDia();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fecha]);

  const cargarConsumoDia = async () => {
    try {
      if (fecha === new Date().toISOString().split('T')[0]) {
        // Si es hoy, usar getConsumoHoy
        await getConsumoHoy();
      } else {
        // Si es otro día, usar getConsumoPorDia
        const data = await getConsumoPorDia(fecha);
        setConsumoDia(data);
      }
    } catch (error) {
      console.error('Error al cargar consumo del día:', error);
      showError('Error al cargar el consumo del día');
    }
  };

  // Usar consumoHoy si es hoy, sino consumoDia
  const materiales = fecha === new Date().toISOString().split('T')[0] ? consumoHoy : consumoDia;

  // Agrupar materiales por registro de consumo
  const consumosAgrupados = React.useMemo(() => {
    if (!Array.isArray(materiales)) return [];
    
    // Si los materiales vienen agrupados por registro
    if (materiales.length > 0 && materiales[0]?.materiales) {
      return materiales;
    }
    
    // Si vienen como lista plana, agrupar por fecha y hora de registro
    const grupos = {};
    materiales.forEach(material => {
      const key = material.fechaRegistro || material.createdAt || 'sin-fecha';
      if (!grupos[key]) {
        grupos[key] = {
          id: material.registroId || material.id,
          fecha: material.fecha || fecha,
          fechaRegistro: material.fechaRegistro || material.createdAt,
          materiales: []
        };
      }
      grupos[key].materiales.push(material);
    });
    return Object.values(grupos);
  }, [materiales, fecha]);

  const formatearFecha = (fechaStr) => {
    if (!fechaStr) return 'Sin fecha';
    const fecha = new Date(fechaStr);
    return fecha.toLocaleDateString('es-MX', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const calcularTotal = (materiales) => {
    return materiales.reduce((total, m) => {
      const cantidad = parseFloat(m.cantidad) || 0;
      return total + cantidad;
    }, 0);
  };

  if (loading && materiales.length === 0) {
    return (
      <div className="bg-card rounded-lg border border-border p-6 card-shadow">
        <div className="flex items-center justify-center py-8">
          <div className="text-muted-foreground">Cargando consumo del día...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-card rounded-lg border border-border p-4 md:p-6 card-shadow">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-4 md:mb-6 gap-4">
        <div className="flex items-center space-x-3 min-w-0">
          <div className="w-8 h-8 bg-green-500 rounded-lg flex items-center justify-center flex-shrink-0">
            <Icon name="List" size={20} color="white" />
          </div>
          <div className="min-w-0">
            <h3 className="text-base md:text-lg font-semibold text-foreground">Consumo del Día</h3>
            <p className="text-xs md:text-sm text-muted-foreground">
              Listado de materiales consumidos
            </p>
          </div>
        </div>
      </div>

      {/* Selector de fecha */}
      <div className="mb-4 md:mb-6">
        <label className="text-xs md:text-sm font-medium mb-2 block text-foreground">
          Fecha
        </label>
        <Input
          type="date"
          value={fecha}
          onChange={(e) => setFecha(e.target.value)}
          className="w-full text-sm"
        />
      </div>

      {/* Lista de consumos */}
      {consumosAgrupados.length === 0 ? (
        <div className="text-center py-6 md:py-8 text-muted-foreground">
          <Icon name="PackageX" size={40} className="mx-auto mb-2 opacity-50" />
          <p className="text-sm md:text-base">No hay materiales consumidos en esta fecha</p>
        </div>
      ) : (
        <div className="space-y-3 md:space-y-4">
          {consumosAgrupados.map((consumo, index) => (
            <div
              key={consumo.id || index}
              className="border border-border rounded-lg p-3 md:p-4 bg-muted/30"
            >
              <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-2 md:mb-3 gap-2">
                <div className="min-w-0">
                  <div className="font-medium text-sm md:text-base text-foreground">
                    Registro #{index + 1}
                  </div>
                  <div className="text-xs md:text-sm text-muted-foreground">
                    {formatearFecha(consumo.fechaRegistro)}
                  </div>
                </div>
                <div className="text-xs md:text-sm text-muted-foreground">
                  {consumo.materiales?.length || 0} material(es)
                </div>
              </div>

              <div className="space-y-1 md:space-y-2">
                {consumo.materiales?.map((material, matIndex) => (
                  <div
                    key={matIndex}
                    className="flex flex-col md:flex-row md:items-center md:justify-between p-2 md:p-2 bg-card rounded border border-border/50 gap-1"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-xs md:text-sm text-foreground truncate">
                        {material.nombre || material.articuloNombre || 'Material sin nombre'}
                      </div>
                      <div className="text-xs text-muted-foreground truncate">
                        {material.codigo || material.articuloCodigo || 'Sin código'} • 
                        Cantidad: {material.cantidad} {material.unidad || 'pcs'}
                        {material.notas && ` • ${material.notas}`}
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-2 md:mt-3 pt-2 md:pt-3 border-t border-border">
                <div className="flex flex-col md:flex-row md:items-center md:justify-between text-xs md:text-sm gap-1">
                  <span className="text-muted-foreground">Total de materiales:</span>
                  <span className="font-medium text-foreground">
                    {calcularTotal(consumo.materiales)} unidades
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Resumen del día */}
      {consumosAgrupados.length > 0 && (
        <div className="mt-4 md:mt-6 p-3 md:p-4 bg-primary/10 rounded-lg border border-primary/20">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2">
            <span className="font-medium text-sm md:text-base text-foreground">Resumen del día:</span>
            <span className="font-semibold text-primary text-xs md:text-sm">
              {consumosAgrupados.length} registro(s) •{' '}
              {consumosAgrupados.reduce((total, c) => total + (c.materiales?.length || 0), 0)} material(es) consumido(s)
            </span>
          </div>
        </div>
      )}
    </div>
  );
};

export default DailyConsumptionList;
