import React, { useState, useEffect, useMemo } from 'react';
import Icon from '../../../components/AppIcon';
import Button from '../../../components/ui/Button';
import Input from '../../../components/ui/Input';
import Select from '../../../components/ui/Select';
import useConsumoMateriales from '../../../hooks/useConsumoMateriales';
import useInventarioTaller from '../../../hooks/useInventarioTaller';
import { useNotifications } from '../../../context/NotificationContext';

const MaterialConsumptionPanel = ({ onInventoryUpdate }) => {
  const { showSuccess, showError } = useNotifications();
  const { inventarioTaller, getInventarioTaller, loading: inventoryLoading } = useInventarioTaller();
  const { registrarConsumo, loading: consumoLoading } = useConsumoMateriales();
  
  const [materiales, setMateriales] = useState([]);
  const [nuevoMaterial, setNuevoMaterial] = useState({
    articuloId: '',
    cantidad: '',
    unidad: '',
    notas: ''
  });
  const [busquedaArticulo, setBusquedaArticulo] = useState('');
  const [mostrarSelector, setMostrarSelector] = useState(false);

  useEffect(() => {
    getInventarioTaller(true); // Solo materiales disponibles en taller
  }, [getInventarioTaller]);

  // Filtrar artículos según búsqueda (desde inventario de taller)
  const articulosFiltrados = useMemo(() => {
    if (!busquedaArticulo.trim()) return inventarioTaller;
    
    const busquedaLower = busquedaArticulo.toLowerCase();
    return inventarioTaller.filter(articulo => 
      articulo?.nombreMaterial?.toLowerCase().includes(busquedaLower) ||
      articulo?.articuloId?.toLowerCase().includes(busquedaLower) ||
      articulo?.origen?.requisicionId?.toLowerCase().includes(busquedaLower)
    );
  }, [inventarioTaller, busquedaArticulo]);

  // Obtener artículo seleccionado (del inventario de taller)
  const articuloSeleccionado = useMemo(() => {
    return inventarioTaller.find(a => a.articuloId === nuevoMaterial.articuloId);
  }, [inventarioTaller, nuevoMaterial.articuloId]);

  const handleAgregarMaterial = () => {
    if (!nuevoMaterial.articuloId || !nuevoMaterial.cantidad || parseFloat(nuevoMaterial.cantidad) <= 0) {
      showError('Debe seleccionar un artículo y especificar una cantidad válida');
      return;
    }

    const articulo = articuloSeleccionado;
    if (!articulo) {
      showError('Artículo no encontrado');
      return;
    }

    // Verificar stock disponible en taller
    const stockActual = articulo.cantidadDisponible || 0;
    const cantidadSolicitada = parseFloat(nuevoMaterial.cantidad);
    
    if (cantidadSolicitada > stockActual) {
      showError(`Stock insuficiente en taller. Disponible: ${stockActual} ${articulo.unidad || 'pcs'}`);
      return;
    }

    const material = {
      articuloId: nuevoMaterial.articuloId,
      cantidad: cantidadSolicitada,
      unidad: nuevoMaterial.unidad || articulo.unidad || 'pcs',
      notas: nuevoMaterial.notas || '',
      nombre: articulo.nombreMaterial || 'Sin nombre',
      codigo: articulo.articuloId || 'Sin código',
      stockDisponible: stockActual,
      origen: articulo.origen // Información de trazabilidad
    };

    setMateriales(prev => [...prev, material]);
    setNuevoMaterial({
      articuloId: '',
      cantidad: '',
      unidad: '',
      notas: ''
    });
    setBusquedaArticulo('');
    setMostrarSelector(false);
  };

  const handleEliminarMaterial = (index) => {
    setMateriales(prev => prev.filter((_, i) => i !== index));
  };

  const handleSeleccionarArticulo = (articulo) => {
    setNuevoMaterial(prev => ({
      ...prev,
      articuloId: articulo.articuloId,
      unidad: articulo.unidad || 'pcs'
    }));
    setMostrarSelector(false);
    setBusquedaArticulo('');
  };

  const handleRegistrarConsumo = async () => {
    if (materiales.length === 0) {
      showError('Debe agregar al menos un material');
      return;
    }

    try {
      // Agregar ordenTrabajo a cada material si está disponible en origen
      const materialesConOrden = materiales.map(m => ({
        ...m,
        ordenTrabajo: m.origen?.ordenTrabajo || m.origen?.numeroOrdenTrabajo || null
      }));
      
      await registrarConsumo(materialesConOrden, null, () => {
        // Recargar inventario del taller después del consumo
        getInventarioTaller(true);
        // Notificar al componente padre si existe el callback
        if (onInventoryUpdate) {
          onInventoryUpdate();
        }
      });
      setMateriales([]);
      showSuccess('Consumo registrado y descontado del inventario del taller');
    } catch (error) {
      console.error('Error al registrar consumo:', error);
    }
  };

  const loading = inventoryLoading || consumoLoading;

  return (
    <div className="bg-card rounded-lg border border-border p-4 md:p-6 card-shadow">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-4 md:mb-6 gap-4">
        <div className="flex items-center space-x-3 min-w-0">
          <div className="w-8 h-8 bg-orange-500 rounded-lg flex items-center justify-center flex-shrink-0">
            <Icon name="PackageMinus" size={20} color="white" />
          </div>
          <div className="min-w-0">
            <h3 className="text-base md:text-lg font-semibold text-foreground">Registro de Consumo Diario</h3>
            <p className="text-xs md:text-sm text-muted-foreground">
              Registra los materiales utilizados en el día
            </p>
          </div>
        </div>
      </div>

      {/* Formulario para agregar materiales */}
      <div className="bg-muted/50 rounded-lg p-3 md:p-4 mb-4 md:mb-6">
        <h4 className="font-medium mb-3 md:mb-4 text-sm md:text-base text-foreground">Agregar Material</h4>
        
        <div className="space-y-3 md:space-y-4">
          {/* Búsqueda y selección de artículo */}
          <div>
            <label className="text-xs md:text-sm font-medium mb-2 block text-foreground">
              Artículo
            </label>
            <div className="relative">
              <Input
                value={busquedaArticulo}
                onChange={(e) => {
                  setBusquedaArticulo(e.target.value);
                  setMostrarSelector(true);
                }}
                onFocus={() => setMostrarSelector(true)}
                placeholder="Buscar artículo..."
                className="w-full text-sm"
              />
              {mostrarSelector && articulosFiltrados.length > 0 && (
                <div className="absolute z-10 w-full mt-1 bg-card border border-border rounded-lg shadow-lg max-h-48 md:max-h-60 overflow-y-auto">
                  {articulosFiltrados.map(articulo => {
                    const stockActual = articulo.cantidadDisponible || 0;
                    return (
                      <button
                        key={articulo.id || articulo.articuloId}
                        type="button"
                        onClick={() => handleSeleccionarArticulo(articulo)}
                        className="w-full text-left px-3 md:px-4 py-2 hover:bg-muted transition-colors flex flex-col text-sm"
                      >
                        <div className="min-w-0 flex-1">
                          <div className="font-medium text-foreground truncate">
                            {articulo.nombreMaterial || 'Sin nombre'}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {articulo.articuloId || 'Sin código'} • 
                            Stock en Taller: {stockActual} {articulo.unidad || 'pcs'}
                          </div>
                          {articulo.origen?.requisicionId && (
                            <div className="text-xs text-blue-500 mt-1">
                              📦 Origen: Req. {articulo.origen.requisicionId.substring(0, 8)}
                            </div>
                          )}
                        </div>
                        {articuloSeleccionado?.articuloId === articulo.articuloId && (
                          <Icon name="Check" size={16} className="text-primary flex-shrink-0 ml-2" />
                        )}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
            {articuloSeleccionado && (
              <div className="mt-2 p-2 bg-primary/10 rounded text-xs md:text-sm">
                <div className="flex items-center justify-between">
                  <span className="font-medium">Seleccionado: </span>
                  <span className="text-xs text-blue-600">
                    {articuloSeleccionado.origen?.requisicionId && `📦 Req: ${articuloSeleccionado.origen.requisicionId.substring(0, 8)}`}
                  </span>
                </div>
                <span className="truncate inline-block max-w-full">
                  {articuloSeleccionado.nombreMaterial} 
                  {' '}(Stock en Taller: {articuloSeleccionado.cantidadDisponible || 0} {articuloSeleccionado.unidad || 'pcs'})
                </span>
              </div>
            )}
          </div>

          {/* Cantidad y unidad */}
          <div className="grid grid-cols-2 gap-2 md:gap-4">
            <div>
              <label className="text-xs md:text-sm font-medium mb-2 block text-foreground">
                Cantidad
              </label>
              <Input
                type="number"
                value={nuevoMaterial.cantidad}
                onChange={(e) => setNuevoMaterial(prev => ({ ...prev, cantidad: e.target.value }))}
                placeholder="Cantidad"
                min="0.01"
                step="0.01"
                disabled={!nuevoMaterial.articuloId}
                className="text-sm"
              />
            </div>
            <div>
              <label className="text-xs md:text-sm font-medium mb-2 block text-foreground">
                Unidad
              </label>
              <Input
                value={nuevoMaterial.unidad || articuloSeleccionado?.unidad || 'pcs'}
                onChange={(e) => setNuevoMaterial(prev => ({ ...prev, unidad: e.target.value }))}
                placeholder="Unidad"
                disabled={!nuevoMaterial.articuloId}
                className="text-sm"
              />
            </div>
          </div>

          {/* Notas */}
          <div>
            <label className="text-xs md:text-sm font-medium mb-2 block text-foreground">
              Notas (opcional)
            </label>
            <Input
              value={nuevoMaterial.notas}
              onChange={(e) => setNuevoMaterial(prev => ({ ...prev, notas: e.target.value }))}
              placeholder="Observaciones..."
              className="text-sm"
            />
          </div>

          <Button
            onClick={handleAgregarMaterial}
            iconName="Plus"
            iconPosition="left"
            disabled={!nuevoMaterial.articuloId || !nuevoMaterial.cantidad || loading}
            className="w-full"
          >
            Agregar a la Lista
          </Button>
        </div>
      </div>

      {/* Lista de materiales a consumir */}
      {materiales.length > 0 && (
        <div className="mb-4 md:mb-6">
          <h4 className="font-medium mb-2 md:mb-3 text-sm md:text-base text-foreground">Materiales a Consumir</h4>
          <div className="space-y-2">
            {materiales.map((material, index) => (
              <div
                key={index}
                className="flex items-center justify-between p-2 md:p-3 bg-muted/50 rounded-lg gap-2"
              >
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-sm md:text-base text-foreground truncate">{material.nombre}</div>
                  <div className="text-xs md:text-sm text-muted-foreground truncate">
                    {material.codigo} • {material.cantidad} {material.unidad}
                    {material.notas && ` • ${material.notas}`}
                  </div>
                  {material.origen?.requisicionId && (
                    <div className="text-xs text-blue-500 mt-1">
                      Origen: Requisición {material.origen.requisicionId.substring(0, 8)}
                    </div>
                  )}
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleEliminarMaterial(index)}
                  iconName="X"
                  className="flex-shrink-0"
                >
                  Eliminar
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Botón para registrar consumo */}
      <Button
        onClick={handleRegistrarConsumo}
        iconName="Save"
        iconPosition="left"
        disabled={materiales.length === 0 || loading}
        className="w-full text-sm md:text-base"
        variant="default"
      >
        {loading ? 'Registrando...' : 'Registrar Consumo'}
      </Button>
    </div>
  );
};

export default MaterialConsumptionPanel;
