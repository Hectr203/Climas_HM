import React, { useState } from 'react';
import Button from '../../../components/ui/Button';
import Input from '../../../components/ui/Input';
import Select from '../../../components/ui/Select';
import Icon from '../../../components/AppIcon';
import useInventory from '../../../hooks/useInventory';

const NewItemModal = ({ isOpen, onClose, onAddItem }) => {
  const { createArticulo, loading } = useInventory();
  
  const [formData, setFormData] = useState({
    itemCode: '',
    name: '',
    description: '',
    specifications: '',
    category: '',
    unit: 'pcs',
    unitCost: '',
    reorderPoint: '',
    currentStock: '',
    supplierName: '',
    supplierContact: '',
    notes: '',
    enableReorderPoint: false
  });

  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const categories = [
    'Equipos HVAC',
    'Refrigeración',
    'Componentes Eléctricos',
    'Plomería',
    'Herramientas',
    'Accesorios',
    'Consumibles',
    'Repuestos',
    'Materiales de Instalación'
  ];

  const units = [
    'pcs',
    'kg',
    'lt',
    'm',
    'ft',
    'galón',
    'caja',
    'rollo',
    'juego'
  ];

  const handleInputChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
    // Clear error when user starts typing
    if (errors?.[field]) {
      setErrors(prev => ({
        ...prev,
        [field]: ''
      }));
    }
  };

  const validateForm = () => {
    const newErrors = {};

    if (!formData?.itemCode?.trim()) {
      newErrors.itemCode = 'El código de artículo es requerido';
    }
    if (!formData?.name?.trim()) {
      newErrors.name = 'El nombre del artículo es requerido';
    }
    if (!formData?.description?.trim()) {
      newErrors.description = 'La descripción es requerida';
    }
    if (!formData?.category) {
      newErrors.category = 'La categoría es requerida';
    }
    if (!formData?.unitCost || parseFloat(formData?.unitCost) <= 0) {
      newErrors.unitCost = 'El costo unitario debe ser mayor a 0';
    }
    if (formData?.enableReorderPoint && (!formData?.reorderPoint || parseInt(formData?.reorderPoint) < 0)) {
      newErrors.reorderPoint = 'El punto de reorden debe ser 0 o mayor';
    }
    if (!formData?.currentStock || parseInt(formData?.currentStock) < 0) {
      newErrors.currentStock = 'El stock actual debe ser 0 o mayor';
    }
    if (!formData?.supplierName?.trim()) {
      newErrors.supplierName = 'El nombre del proveedor es requerido';
    }

    setErrors(newErrors);
    return Object.keys(newErrors)?.length === 0;
  };

  const handleSubmit = async (e) => {
    e?.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);
    
    try {
      // Crear el payload según la estructura del backend
      const payload = {
        codigoArticulo: formData?.itemCode?.trim(),
        nombre: formData?.name?.trim(),
        descripcion: formData?.description?.trim(),
        especificaciones: formData?.specifications?.trim() || '',
        categoria: formData?.category,
        unidad: formData?.unit,
        costoUnitario: parseFloat(formData?.unitCost),
        puntoReorden: formData?.enableReorderPoint && formData?.reorderPoint ? parseInt(formData?.reorderPoint) : 0,
        stockActual: parseInt(formData?.currentStock),
        ubicacion: 'Almacén Principal', // Siempre será Almacén Principal
        nombreProveedor: formData?.supplierName?.trim(),
        contactoProveedor: formData?.supplierContact?.trim() || '',
        notas: formData?.notes?.trim() || ''
      };

      // Llamar al servicio para crear el artículo
      const nuevoArticulo = await createArticulo(payload);

      // Transformar la respuesta del backend al formato esperado por el componente
      const itemForTable = {
        id: nuevoArticulo.id,
        itemCode: nuevoArticulo.codigoArticulo,
        name: nuevoArticulo.nombre || '',
        description: nuevoArticulo.descripcion,
        specifications: nuevoArticulo.especificaciones,
        category: nuevoArticulo.categoria,
        currentStock: nuevoArticulo.stockActual,
        reservedStock: nuevoArticulo.stockReservado || 0,
        reorderPoint: nuevoArticulo.puntoReorden,
        unit: nuevoArticulo.unidad,
        supplier: {
          name: nuevoArticulo.proveedor?.nombre || nuevoArticulo.nombreProveedor,
          contact: nuevoArticulo.proveedor?.contacto || nuevoArticulo.contactoProveedor
        },
        location: nuevoArticulo.ubicacion,
        lastUpdated: new Date(nuevoArticulo.fechaActualizacion || nuevoArticulo.fechaCreacion),
        unitCost: nuevoArticulo.costoUnitario,
        notes: nuevoArticulo.notas
      };

      // Llamar a la función del componente padre para actualizar la tabla
      if (onAddItem) {
        await onAddItem(itemForTable);
      }
      
      // Reset form and close modal
      handleReset();
      onClose();
    } catch (error) {
      console.error('Error creating article:', error);
      setErrors({ submit: 'Error al crear el artículo. Intente nuevamente.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReset = () => {
    setFormData({
      itemCode: '',
      name: '',
      description: '',
      specifications: '',
      category: '',
      unit: 'pcs',
      unitCost: '',
      reorderPoint: '',
      currentStock: '',
      supplierName: '',
      supplierContact: '',
      notes: '',
      enableReorderPoint: false
    });
    setErrors({});
  };

  const handleClose = () => {
    handleReset();
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-background rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] flex flex-col">
        {/* Modal Header */}
        <div className="flex items-center justify-between p-6 border-b border-border flex-shrink-0">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
              <Icon name="Package" size={20} className="text-primary" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-foreground">
                Nuevo Artículo
              </h2>
              <p className="text-sm text-muted-foreground">
                Agregar nuevo artículo al inventario
              </p>
            </div>
          </div>
          <button
            onClick={handleClose}
            className="p-2 hover:bg-muted rounded-lg transition-colors"
            disabled={isSubmitting}
          >
            <Icon name="X" size={20} />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto flex-1 min-h-0">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Basic Information */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium text-foreground flex items-center">
                <Icon name="Info" size={18} className="mr-2" />
                Información Básica
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">
                    Código de Artículo *
                  </label>
                  <Input
                    type="text"
                    value={formData?.itemCode}
                    onChange={(e) => handleInputChange('itemCode', e?.target?.value)}
                    placeholder="Ej: HVAC-001"
                    error={errors?.itemCode}
                    disabled={isSubmitting}
                  />
                  {errors?.itemCode && (
                    <p className="text-sm text-destructive mt-1">{errors?.itemCode}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">
                    Nombre *
                  </label>
                  <Input
                    type="text"
                    value={formData?.name}
                    onChange={(e) => handleInputChange('name', e?.target?.value)}
                    placeholder="Nombre del artículo"
                    error={errors?.name}
                    disabled={isSubmitting}
                  />
                  {errors?.name && (
                    <p className="text-sm text-destructive mt-1">{errors?.name}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">
                    Categoría *
                  </label>
                  <select
                    value={formData?.category}
                    onChange={(e) => handleInputChange('category', e.target.value)}
                    disabled={isSubmitting}
                    className="w-full px-3 py-2 border border-border rounded-md bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                  >
                    <option value="">Seleccionar categoría</option>
                    {categories?.map(cat => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                  {errors?.category && (
                    <p className="text-sm text-destructive mt-1">{errors?.category}</p>
                  )}
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-foreground mb-2">
                    Descripción *
                  </label>
                  <Input
                    type="text"
                    value={formData?.description}
                    onChange={(e) => handleInputChange('description', e?.target?.value)}
                    placeholder="Descripción completa del artículo"
                    error={errors?.description}
                    disabled={isSubmitting}
                  />
                  {errors?.description && (
                    <p className="text-sm text-destructive mt-1">{errors?.description}</p>
                  )}
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-foreground mb-2">
                    Especificaciones
                  </label>
                  <Input
                    type="text"
                    value={formData?.specifications}
                    onChange={(e) => handleInputChange('specifications', e?.target?.value)}
                    placeholder="Especificaciones técnicas del artículo"
                    disabled={isSubmitting}
                  />
                </div>
              </div>
            </div>

            {/* Stock and Cost Information */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium text-foreground flex items-center">
                <Icon name="BarChart" size={18} className="mr-2" />
                Stock y Costos
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">
                    Stock Actual *
                  </label>
                  <Input
                    type="number"
                    min="0"
                    value={formData?.currentStock}
                    onChange={(e) => handleInputChange('currentStock', e?.target?.value)}
                    placeholder="0"
                    error={errors?.currentStock}
                    disabled={isSubmitting}
                  />
                  {errors?.currentStock && (
                    <p className="text-sm text-destructive mt-1">{errors?.currentStock}</p>
                  )}
                </div>

                <div>
                  <div className="flex items-center space-x-2 mb-2">
                    <input
                      type="checkbox"
                      id="enableReorderPoint"
                      checked={formData?.enableReorderPoint}
                      onChange={(e) => handleInputChange('enableReorderPoint', e.target.checked)}
                      disabled={isSubmitting}
                      className="w-4 h-4 text-primary border-border rounded focus:ring-2 focus:ring-primary"
                    />
                    <label htmlFor="enableReorderPoint" className="text-sm font-medium text-foreground cursor-pointer">
                    Stock Mínimo
                    </label>
                  </div>
                  <Input
                    type="number"
                    min="0"
                    value={formData?.reorderPoint}
                    onChange={(e) => handleInputChange('reorderPoint', e?.target?.value)}
                    placeholder="0"
                    error={errors?.reorderPoint}
                    disabled={isSubmitting || !formData?.enableReorderPoint}
                    className={!formData?.enableReorderPoint ? 'bg-muted cursor-not-allowed' : ''}
                  />
                  {errors?.reorderPoint && (
                    <p className="text-sm text-destructive mt-1">{errors?.reorderPoint}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">
                    Unidad
                  </label>
                  <select
                    value={formData?.unit}
                    onChange={(e) => handleInputChange('unit', e.target.value)}
                    disabled={isSubmitting}
                    className="w-full px-3 py-2 border border-border rounded-md bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                  >
                    {units?.map(unit => (
                      <option key={unit} value={unit}>{unit}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">
                    Costo Unitario ($) *
                  </label>
                  <Input
                    type="number"
                    min="0"
                    step="0.01"
                    value={formData?.unitCost}
                    onChange={(e) => handleInputChange('unitCost', e?.target?.value)}
                    placeholder="0.00"
                    error={errors?.unitCost}
                    disabled={isSubmitting}
                  />
                  {errors?.unitCost && (
                    <p className="text-sm text-destructive mt-1">{errors?.unitCost}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">
                    Ubicación
                  </label>
                  <Input
                    type="text"
                    value="Almacén Principal"
                    disabled={true}
                    className="bg-muted cursor-not-allowed"
                  />
                </div>
              </div>
            </div>

            {/* Supplier Information */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium text-foreground flex items-center">
                <Icon name="Building" size={18} className="mr-2" />
                Información del Proveedor
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">
                    Nombre del Proveedor *
                  </label>
                  <Input
                    type="text"
                    value={formData?.supplierName}
                    onChange={(e) => handleInputChange('supplierName', e?.target?.value)}
                    placeholder="Nombre de la empresa proveedora"
                    error={errors?.supplierName}
                    disabled={isSubmitting}
                  />
                  {errors?.supplierName && (
                    <p className="text-sm text-destructive mt-1">{errors?.supplierName}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">
                    Contacto del Proveedor
                  </label>
                  <Input
                    type="text"
                    value={formData?.supplierContact}
                    onChange={(e) => handleInputChange('supplierContact', e?.target?.value)}
                    placeholder="Email, teléfono o contacto"
                    disabled={isSubmitting}
                  />
                </div>
              </div>
            </div>

            {/* Notes */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium text-foreground flex items-center">
                <Icon name="FileText" size={18} className="mr-2" />
                Notas Adicionales
              </h3>
              
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Observaciones
                </label>
                <textarea
                  value={formData?.notes}
                  onChange={(e) => handleInputChange('notes', e?.target?.value)}
                  placeholder="Notas adicionales sobre el artículo..."
                  className="w-full px-3 py-2 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent resize-none"
                  rows={3}
                  disabled={isSubmitting}
                />
              </div>
            </div>

            {/* Error Message */}
            {errors?.submit && (
              <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-4">
                <div className="flex items-center">
                  <Icon name="AlertCircle" size={16} className="text-destructive mr-2" />
                  <p className="text-sm text-destructive">{errors?.submit}</p>
                </div>
              </div>
            )}
          </form>
        </div>

        {/* Modal Footer */}
        <div className="flex items-center justify-end space-x-3 p-6 border-t border-border flex-shrink-0 bg-background">
          <Button
            type="button"
            variant="outline"
            onClick={handleClose}
            disabled={isSubmitting || loading}
          >
            Cancelar
          </Button>
          <Button
            type="submit"
            onClick={handleSubmit}
            disabled={isSubmitting || loading}
            iconName={(isSubmitting || loading) ? "Loader" : "Plus"}
            iconSize={16}
            className={(isSubmitting || loading) ? "animate-spin" : ""}
          >
            {(isSubmitting || loading) ? 'Creando Artículo...' : 'Crear Artículo'}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default NewItemModal;