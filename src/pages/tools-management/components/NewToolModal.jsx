import React, { useState } from 'react';
import Icon from '../../../components/AppIcon';
import Button from '../../../components/ui/Button';
import Input from '../../../components/ui/Input';

/**
 * Modal para registrar una nueva herramienta
 * HU 1 – Registrar nueva herramienta
 * 
 * PERMISOS: Admin, Taller y Oficina pueden crear herramientas
 * IMPORTANTE: El numero_pieza debe ser único en todo el sistema
 */
const NewToolModal = ({ onClose, onSave }) => {
  const [formData, setFormData] = useState({
    nombre: '',
    descripcion: '',
    numero_pieza: '',
    ubicacion_tipo: 'taller',
    ubicacion_id: null,
    ubicacion_nombre: ''
  });

  const [errors, setErrors] = useState({});
  const [isSaving, setIsSaving] = useState(false);

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Limpiar error del campo al escribir
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const validateForm = () => {
    const newErrors = {};

    if (!formData.nombre.trim()) {
      newErrors.nombre = 'El nombre es obligatorio';
    }

    if (!formData.numero_pieza.trim()) {
      newErrors.numero_pieza = 'El número de pieza es obligatorio';
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
      // Si la ubicación inicial es taller, agregar el nombre
      const dataToSave = {
        ...formData,
        ubicacion_nombre: formData.ubicacion_tipo === 'taller' ? 'Taller Principal' : formData.ubicacion_nombre
      };
      
      await onSave(dataToSave);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
              <Icon name="Wrench" className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-gray-900">
                Registrar Nueva Herramienta
              </h2>
              <p className="text-sm text-gray-600">
                Ingresa los datos de la herramienta
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
          {/* Nombre */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Nombre de la Herramienta <span className="text-red-500">*</span>
            </label>
            <Input
              type="text"
              value={formData.nombre}
              onChange={(e) => handleChange('nombre', e.target.value)}
              placeholder="Ej: Taladro Inalámbrico"
              className={errors.nombre ? 'border-red-500' : ''}
            />
            {errors.nombre && (
              <p className="text-red-500 text-sm mt-1">{errors.nombre}</p>
            )}
          </div>

          {/* Número de Pieza */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Número de Pieza <span className="text-red-500">*</span>
            </label>
            <Input
              type="text"
              value={formData.numero_pieza}
              onChange={(e) => handleChange('numero_pieza', e.target.value)}
              placeholder="Ej: TD-2024-001"
              className={errors.numero_pieza ? 'border-red-500' : ''}
            />
            {errors.numero_pieza && (
              <p className="text-red-500 text-sm mt-1">{errors.numero_pieza}</p>
            )}
          </div>

          {/* Descripción */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Descripción
            </label>
            <textarea
              value={formData.descripcion}
              onChange={(e) => handleChange('descripcion', e.target.value)}
              placeholder="Descripción detallada de la herramienta, marca, modelo, etc."
              rows={4}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
            />
          </div>

          {/* Ubicación Inicial */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Ubicación Inicial
            </label>
            <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-lg border border-gray-200">
              <Icon name="Wrench" className="w-5 h-5 text-green-600" />
              <div>
                <p className="font-medium text-gray-900">Taller Principal</p>
                <p className="text-sm text-gray-600">
                  La herramienta se registrará en el taller por defecto
                </p>
              </div>
            </div>
            <p className="text-xs text-gray-500 mt-2">
              Podrás asignar la herramienta a otro lugar después del registro
            </p>
          </div>

          {/* Info Box */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 flex gap-3">
            <Icon name="Info" className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-blue-800">
              <p className="font-medium mb-1">Información importante</p>
              <ul className="list-disc list-inside space-y-1 text-blue-700">
                <li>El nombre debe ser descriptivo y único</li>
                <li>El número de pieza te ayudará a identificarla rápidamente</li>
                <li>Puedes cambiar la ubicación en cualquier momento</li>
              </ul>
            </div>
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
                  Registrando...
                </>
              ) : (
                <>
                  <Icon name="Check" className="w-5 h-5" />
                  Registrar Herramienta
                </>
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default NewToolModal;
