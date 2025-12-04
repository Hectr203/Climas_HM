import React, { useState } from 'react';
import Icon from '../../../components/AppIcon';
import Button from '../../../components/ui/Button';
import Input from '../../../components/ui/Input';

const NewVersionModal = ({ 
  isOpen, 
  onClose, 
  onSave, 
  loading = false,
  currentVersion 
}) => {
  const [formData, setFormData] = useState({
    notas: '',
    cambios: ['']
  });

  const handleAddChange = () => {
    setFormData(prev => ({
      ...prev,
      cambios: [...prev.cambios, '']
    }));
  };

  const handleRemoveChange = (index) => {
    setFormData(prev => ({
      ...prev,
      cambios: prev.cambios.filter((_, i) => i !== index)
    }));
  };

  const handleChangeInput = (index, value) => {
    setFormData(prev => ({
      ...prev,
      cambios: prev.cambios.map((cambio, i) => i === index ? value : cambio)
    }));
  };

  const handleSave = () => {
    // Filtrar cambios vacíos
    const cambiosLimpios = formData.cambios.filter(c => c.trim() !== '');
    
    onSave({
      notas: formData.notas.trim(),
      cambios: cambiosLimpios
    });
    
    // Resetear formulario
    setFormData({
      notas: '',
      cambios: ['']
    });
  };

  const handleCancel = () => {
    setFormData({
      notas: '',
      cambios: ['']
    });
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-card border border-border rounded-lg w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-border">
          <div>
            <h2 className="text-xl font-semibold text-foreground flex items-center gap-2">
              <Icon name="Save" size={24} />
              Crear Nueva Versión
            </h2>
            <p className="text-sm text-muted-foreground mt-1">
              Se guardará una copia del estado actual de la cotización
            </p>
            {currentVersion && (
              <p className="text-xs text-muted-foreground mt-1">
                Nueva versión: <strong className="text-primary">v{currentVersion + 1}</strong>
              </p>
            )}
          </div>
          <Button variant="ghost" size="icon" onClick={handleCancel} disabled={loading}>
            <Icon name="X" size={20} />
          </Button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Notas */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              Notas de la versión
            </label>
            <textarea
              value={formData.notas}
              onChange={(e) => setFormData(prev => ({ ...prev, notas: e.target.value }))}
              placeholder="Describe brevemente esta versión (ej: 'Actualización de precios', 'Ajuste de materiales')"
              className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent resize-none"
              rows={3}
              disabled={loading}
            />
          </div>

          {/* Lista de Cambios */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-sm font-medium text-foreground">
                Lista de cambios realizados
              </label>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleAddChange}
                iconName="Plus"
                iconPosition="left"
                disabled={loading}
              >
                Agregar cambio
              </Button>
            </div>
            
            <div className="space-y-2">
              {formData.cambios.map((cambio, index) => (
                <div key={index} className="flex items-start gap-2">
                  <div className="flex-1">
                    <Input
                      value={cambio}
                      onChange={(e) => handleChangeInput(index, e.target.value)}
                      placeholder={`Cambio ${index + 1} (ej: 'Actualizado precio de tubería')`}
                      disabled={loading}
                    />
                  </div>
                  {formData.cambios.length > 1 && (
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleRemoveChange(index)}
                      disabled={loading}
                      className="text-destructive hover:text-destructive"
                    >
                      <Icon name="Trash2" size={16} />
                    </Button>
                  )}
                </div>
              ))}
            </div>
            
            <p className="text-xs text-muted-foreground mt-2">
              Puedes dejar campos vacíos si no aplican. Solo se guardarán los cambios con texto.
            </p>
          </div>

          {/* Información adicional */}
          <div className="bg-muted/30 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <Icon name="Info" size={20} className="text-primary mt-0.5" />
              <div className="text-sm text-foreground">
                <p className="font-medium mb-1">¿Qué se guardará?</p>
                <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                  <li>Información completa de la cotización</li>
                  <li>Datos del cliente y proyecto</li>
                  <li>Materiales y precios actuales</li>
                  <li>Cronograma y condiciones</li>
                  <li>Totales y cálculos</li>
                </ul>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 p-6 border-t border-border">
          <Button variant="outline" onClick={handleCancel} disabled={loading}>
            Cancelar
          </Button>
          <Button
            variant="default"
            onClick={handleSave}
            disabled={loading || (!formData.notas.trim() && !formData.cambios.some(c => c.trim()))}
            iconName={loading ? "Loader2" : "Save"}
            iconPosition="left"
          >
            {loading ? 'Guardando...' : 'Crear Versión'}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default NewVersionModal;
