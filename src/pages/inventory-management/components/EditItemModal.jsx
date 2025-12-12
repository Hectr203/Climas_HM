import React, { useState, useEffect } from 'react';
import Button from '../../../components/ui/Button';
import Input from '../../../components/ui/Input';
import Select from '../../../components/ui/Select';
import Icon from '../../../components/AppIcon';
import useInventory from '../../../hooks/useInventory';

const EditItemModal = ({ isOpen, onClose, item, onUpdateSuccess }) => {
  const { updateArticulo, loading } = useInventory();
  
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
    location: 'Almacén Principal',
    supplierName: '',
    supplierContact: '',
    notes: ''
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

  const locations = [
    'Almacén Principal',
    'Almacén Secundario',
    'Taller',
    'Oficina',
    'Vehículo 1',
    'Vehículo 2',
    'Bodega Externa'
  ];

  // Cargar datos del item cuando se abre el modal
  useEffect(() => {
    if (isOpen && item) {
      setFormData({
        itemCode: String(item.itemCode || ''),
        name: String(item.name || ''),
        description: String(item.description || ''),
        specifications: String(item.specifications || ''),
        category: String(item.category || ''),
        unit: String(item.unit || 'pcs'),
        unitCost: item.unitCost !== undefined && item.unitCost !== null ? String(item.unitCost) : '',
        reorderPoint: item.reorderPoint !== undefined && item.reorderPoint !== null ? String(item.reorderPoint) : '',
        currentStock: item.currentStock !== undefined && item.currentStock !== null ? String(item.currentStock) : '',
        location: String(item.location || 'Almacén Principal'),
        supplierName: String(item.supplier?.name || ''),
        supplierContact: String(item.supplier?.contact || ''),
        notes: String(item.notes || '')
      });
      setErrors({});
    }
  }, [isOpen, item]);

  const handleInputChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
    // Limpiar errores cuando el usuario escribe
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
    if (!formData?.reorderPoint || parseInt(formData?.reorderPoint) < 0) {
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
      const payload = {
        codigoArticulo: formData?.itemCode?.trim(),
        nombre: formData?.name?.trim(),
        descripcion: formData?.description?.trim(),
        especificaciones: formData?.specifications?.trim() || '',
        categoria: formData?.category,
        unidad: formData?.unit,
        costoUnitario: parseFloat(formData?.unitCost),
        puntoReorden: parseInt(formData?.reorderPoint),
        stockActual: parseInt(formData?.currentStock),
        ubicacion: formData?.location,
        nombreProveedor: formData?.supplierName?.trim(),
        contactoProveedor: formData?.supplierContact?.trim() || '',
        notas: formData?.notes?.trim() || ''
      };

      await updateArticulo(item.id, payload);
      
      if (onUpdateSuccess) {
        onUpdateSuccess();
      }
      
      onClose();
    } catch (error) {
      console.error('Error updating article:', error);
      setErrors({ submit: 'Error al actualizar el artículo. Intente nuevamente.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
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
      location: 'Almacén Principal',
      supplierName: '',
      supplierContact: '',
      notes: ''
    });
    setErrors({});
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center sm:justify-end p-2 sm:p-4 sm:pr-8">
      <div className="bg-background rounded-lg shadow-xl w-full max-w-6xl max-h-[95vh] sm:max-h-[90vh] flex flex-col overflow-hidden sm:mr-4">
        {/* Modal Header */}
        <div className="flex items-center justify-between p-4 sm:p-6 border-b border-border flex-shrink-0">
          <div className="flex items-center space-x-2 sm:space-x-3 min-w-0 flex-1">
            <div className="w-8 h-8 sm:w-10 sm:h-10 bg-primary/10 rounded-lg flex items-center justify-center flex-shrink-0">
              <Icon name="Edit" size={16} className="text-primary sm:w-5 sm:h-5" />
            </div>
            <div className="min-w-0 flex-1">
              <h2 className="text-lg sm:text-xl font-semibold text-foreground">Actualizar Artículo</h2>
              <p className="text-xs sm:text-sm text-muted-foreground hidden sm:block">Modificar información del artículo</p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleClose}
            iconName="X"
            iconSize={16}
          />
        </div>

        {/* Modal Content */}
        <div className="flex-1 min-h-0 overflow-y-auto">
          <form onSubmit={handleSubmit} className="p-4 sm:p-6">
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 sm:gap-6">
            {/* Información Básica */}
            <div className="space-y-3 sm:space-y-4">
              <div className="bg-muted/50 rounded-lg p-3 sm:p-4">
                <h3 className="text-base sm:text-lg font-semibold text-foreground mb-3 sm:mb-4 flex items-center space-x-2">
                  <Icon name="Info" size={16} className="text-primary sm:w-[18px] sm:h-[18px]" />
                  <span>Información Básica</span>
                </h3>
                
                <div className="space-y-4">
                  <Input
                    label="Código del Artículo"
                    value={formData.itemCode}
                    onChange={(e) => handleInputChange('itemCode', e.target.value)}
                    error={errors.itemCode}
                    placeholder="Ej: HVAC-001"
                    disabled={isSubmitting || loading}
                  />

                  <Input
                    label="Nombre"
                    value={formData.name}
                    onChange={(e) => handleInputChange('name', e.target.value)}
                    error={errors.name}
                    placeholder="Nombre del artículo"
                    disabled={isSubmitting || loading}
                  />
                  
                  <Input
                    label="Descripción"
                    value={formData.description}
                    onChange={(e) => handleInputChange('description', e.target.value)}
                    error={errors.description}
                    placeholder="Descripción del artículo"
                    disabled={isSubmitting || loading}
                  />
                  
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">
                      Especificaciones
                    </label>
                    <textarea
                      value={formData.specifications || ''}
                      onChange={(e) => handleInputChange('specifications', e.target.value)}
                      placeholder="Especificaciones técnicas detalladas..."
                      className="w-full min-h-[80px] px-3 py-2 border border-border rounded-md bg-background text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent resize-y"
                      disabled={isSubmitting || loading}
                    />
                    {errors.specifications && (
                      <p className="text-error text-xs mt-1">{errors.specifications}</p>
                    )}
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">
                      Categoría {errors.category && <span className="text-error">*</span>}
                    </label>
                    <select
                      value={formData.category || ''}
                      onChange={(e) => handleInputChange('category', e.target.value)}
                      disabled={isSubmitting || loading}
                      className="w-full px-3 py-2 border border-border rounded-md bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                    >
                      <option value="">Seleccionar categoría</option>
                      {categories.map(category => (
                        <option key={category} value={category}>{category}</option>
                      ))}
                    </select>
                    {errors.category && (
                      <p className="text-error text-xs mt-1">{errors.category}</p>
                    )}
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">
                      Ubicación
                    </label>
                    <select
                      value={formData.location || 'Almacén Principal'}
                      onChange={(e) => handleInputChange('location', e.target.value)}
                      disabled={isSubmitting || loading}
                      className="w-full px-3 py-2 border border-border rounded-md bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                    >
                      {locations.map(location => (
                        <option key={location} value={location}>{location}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>
            </div>

            {/* Stock e Inventario */}
            <div className="space-y-3 sm:space-y-4">
              <div className="bg-muted/50 rounded-lg p-3 sm:p-4">
                <h3 className="text-base sm:text-lg font-semibold text-foreground mb-3 sm:mb-4 flex items-center space-x-2">
                  <Icon name="BarChart3" size={16} className="text-primary sm:w-[18px] sm:h-[18px]" />
                  <span>Stock e Inventario</span>
                </h3>
                
                <div className="space-y-3 sm:space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                    <Input
                      label="Stock Actual"
                      type="number"
                      value={formData.currentStock}
                      onChange={(e) => handleInputChange('currentStock', e.target.value)}
                      error={errors.currentStock}
                      placeholder="0"
                      min="0"
                      disabled={isSubmitting || loading}
                    />
                    
                    <Input
                      label="Stock Minimo"
                      type="number"
                      value={formData.reorderPoint}
                      onChange={(e) => handleInputChange('reorderPoint', e.target.value)}
                      error={errors.reorderPoint}
                      placeholder="0"
                      min="0"
                      disabled={isSubmitting || loading}
                    />
                  </div>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                    <div>
                      <label className="block text-sm font-medium text-foreground mb-2">
                        Unidad
                      </label>
                      <select
                        value={formData.unit || 'pcs'}
                        onChange={(e) => handleInputChange('unit', e.target.value)}
                        disabled={isSubmitting || loading}
                        className="w-full px-3 py-2 border border-border rounded-md bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                      >
                        {units.map(unit => (
                          <option key={unit} value={unit}>{unit}</option>
                        ))}
                      </select>
                    </div>
                    
                    <Input
                      label="Costo Unitario"
                      type="number"
                      value={formData.unitCost}
                      onChange={(e) => handleInputChange('unitCost', e.target.value)}
                      error={errors.unitCost}
                      placeholder="0.00"
                      min="0"
                      step="0.01"
                      disabled={isSubmitting || loading}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Información del Proveedor */}
            <div className="bg-muted/50 rounded-lg p-3 sm:p-4">
              <h3 className="text-base sm:text-lg font-semibold text-foreground mb-3 sm:mb-4 flex items-center space-x-2">
                <Icon name="Truck" size={16} className="text-primary sm:w-[18px] sm:h-[18px]" />
                <span>Proveedor</span>
              </h3>
              
              <div className="space-y-4">
                <Input
                  label="Nombre del Proveedor"
                  value={formData.supplierName}
                  onChange={(e) => handleInputChange('supplierName', e.target.value)}
                  error={errors.supplierName}
                  placeholder="Nombre de la empresa proveedora"
                  disabled={isSubmitting || loading}
                />
                
                <Input
                  label="Contacto del Proveedor"
                  value={formData.supplierContact}
                  onChange={(e) => handleInputChange('supplierContact', e.target.value)}
                  error={errors.supplierContact}
                  placeholder="Email, teléfono o persona de contacto"
                  disabled={isSubmitting || loading}
                />
              </div>
            </div>

            {/* Notas Adicionales */}
            <div className="bg-muted/50 rounded-lg p-3 sm:p-4">
              <h3 className="text-base sm:text-lg font-semibold text-foreground mb-3 sm:mb-4 flex items-center space-x-2">
                <Icon name="FileText" size={16} className="text-primary sm:w-[18px] sm:h-[18px]" />
                <span>Notas Adicionales</span>
              </h3>
              
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Notas y Observaciones
                </label>
                <textarea
                  value={formData.notes || ''}
                  onChange={(e) => handleInputChange('notes', e.target.value)}
                  placeholder="Notas adicionales, instrucciones de uso, compatibilidad, etc..."
                  className="w-full min-h-[80px] px-3 py-2 border border-border rounded-md bg-background text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent resize-y"
                  disabled={isSubmitting || loading}
                />
              </div>
            </div>
          </div>

            {/* Error Message */}
            {errors.submit && (
              <div className="mt-4 p-3 bg-error/10 border border-error/20 rounded-md">
                <p className="text-error text-sm">{errors.submit}</p>
              </div>
            )}
          </form>
        </div>

        {/* Modal Footer */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-end space-y-2 sm:space-y-0 sm:space-x-3 p-4 sm:p-6 border-t border-border bg-background flex-shrink-0">
          <Button
            type="button"
            variant="outline"
            onClick={handleClose}
            disabled={isSubmitting || loading}
            className="w-full sm:w-auto order-2 sm:order-1"
          >
            Cancelar
          </Button>
          <Button
            type="submit"
            onClick={handleSubmit}
            disabled={isSubmitting || loading}
            iconName={(isSubmitting || loading) ? "Loader" : "Save"}
            iconSize={16}
            className={`w-full sm:w-auto order-1 sm:order-2 ${(isSubmitting || loading) ? "animate-spin" : ""}`}
          >
            {(isSubmitting || loading) ? 'Actualizando...' : 'Guardar Cambios'}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default EditItemModal;