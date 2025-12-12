import React, { useState, useEffect } from 'react';
import Icon from '../../../components/AppIcon';
import Button from '../../../components/ui/Button';
import Image from '../../../components/AppImage';
import { useNotifications } from '../../../context/NotificationContext';

const ImageLightbox = ({ image, images, onClose, onNavigate, onDelete, onUpdate, onDownload }) => {
  const { showSuccess, showError, showConfirm } = useNotifications();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState({
    name: '',
    category: '',
    description: ''
  });

  const categoryOptions = [
    { value: 'general', label: 'General' },
    { value: 'construction', label: 'Construcción' },
    { value: 'installation', label: 'Instalación' },
    { value: 'testing', label: 'Pruebas' },
    { value: 'completion', label: 'Finalización' },
    { value: 'quality-control', label: 'Control de Calidad' },
    { value: 'safety', label: 'Seguridad' },
    { value: 'documentation', label: 'Documentación' }
  ];

  useEffect(() => {
    const index = images?.findIndex(img => img?.id === image?.id);
    setCurrentIndex(index >= 0 ? index : 0);
  }, [image, images]);

  useEffect(() => {
    setEditForm({
      name: image?.nombre || image?.name || image?.originalFileName || '',
      category: image?.categoria || image?.category || 'general',
      description: image?.descripcion || image?.description || ''
    });
  }, [image]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyPress = (e) => {
      switch (e?.key) {
        case 'Escape':
          onClose();
          break;
        case 'ArrowLeft':
          navigatePrevious();
          break;
        case 'ArrowRight':
          navigateNext();
          break;
        default:
          break;
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [currentIndex]);

  const navigateNext = () => {
    if (images?.length && currentIndex < images?.length - 1) {
      const nextIndex = currentIndex + 1;
      setCurrentIndex(nextIndex);
      const nextImage = images?.[nextIndex];
      // Pasar la imagen al callback para que se cargue su URL
      onNavigate?.(nextImage);
    }
  };

  const navigatePrevious = () => {
    if (images?.length && currentIndex > 0) {
      const prevIndex = currentIndex - 1;
      setCurrentIndex(prevIndex);
      const prevImage = images?.[prevIndex];
      // Pasar la imagen al callback para que se cargue su URL
      onNavigate?.(prevImage);
    }
  };

  const handleSaveEdit = async () => {
    try {
      await onUpdate(image?.id, editForm);
      showSuccess('Imagen actualizada exitosamente');
      setIsEditing(false);
    } catch (error) {
      showError('Error al actualizar la imagen');
    }
  };

  const handleDelete = async () => {
    const imageName = image?.nombre || image?.name || image?.originalFileName || 'esta imagen';
    
    // Cerrar el lightbox primero
    onClose();
    
    // Usar un delay para que el lightbox se cierre antes de mostrar el confirm
    setTimeout(() => {
      showConfirm(
        `¿Está seguro de que desea eliminar "${imageName}"?`,
        {
          onConfirm: async () => {
            try {
              await onDelete(image);
              showSuccess('Imagen eliminada exitosamente');
            } catch (error) {
              showError(error?.message || 'Error al eliminar la imagen');
            }
          }
        }
      );
    }, 100);
  };

  const formatDate = (timestamp) => {
    return new Date(timestamp)?.toLocaleDateString('es-MX', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getCategoryLabel = (category) => {
    const option = categoryOptions?.find(opt => opt?.value === category);
    return option?.label || category;
  };

  return (
    <div className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center">
      {/* Overlay */}
      <div 
        className="absolute inset-0" 
        onClick={onClose}
      />
      {/* Content */}
      <div className="relative max-w-7xl max-h-screen w-full h-full flex flex-col lg:flex-row">
        {/* Image Container */}
        <div className="flex-1 flex items-center justify-center p-4 lg:p-8">
          <div className="relative">
            <Image
              src={image?.src || image?.url}
              alt={image?.name}
              className="max-w-full max-h-[70vh] lg:max-h-[80vh] object-contain"
            />
            
            {/* Navigation Buttons */}
            {images?.length > 1 && (
              <>
                <button
                  onClick={navigatePrevious}
                  disabled={currentIndex === 0}
                  className="absolute left-4 top-1/2 transform -translate-y-1/2 p-2 bg-black/50 text-white rounded-full hover:bg-black/70 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Icon name="ChevronLeft" size={24} />
                </button>
                
                <button
                  onClick={navigateNext}
                  disabled={currentIndex === images?.length - 1}
                  className="absolute right-4 top-1/2 transform -translate-y-1/2 p-2 bg-black/50 text-white rounded-full hover:bg-black/70 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Icon name="ChevronRight" size={24} />
                </button>
              </>
            )}
          </div>
        </div>
        
        {/* Info Panel */}
        <div className="w-full lg:w-96 bg-card border-l border-border flex flex-col">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-border">
            <h3 className="text-lg font-semibold text-foreground">
              {isEditing ? 'Editar Imagen' : 'Detalles'}
            </h3>
            <div className="flex items-center space-x-2">
              {!isEditing && (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setIsEditing(true)}
                >
                  <Icon name="Edit" size={18} />
                </Button>
              )}
              <Button
                variant="ghost"
                size="icon"
                onClick={onClose}
              >
                <Icon name="X" size={18} />
              </Button>
            </div>
          </div>
          
          {/* Content */}
          <div className="flex-1 overflow-y-auto p-4">
            {isEditing ? (
              /* Edit Form */
              (<div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">
                    Nombre
                  </label>
                  <input
                    type="text"
                    value={editForm?.name}
                    onChange={(e) => setEditForm(prev => ({ ...prev, name: e?.target?.value }))}
                    className="w-full px-3 py-2 border border-border rounded-md"
                    placeholder="Nombre de la imagen"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">
                    Categoría
                  </label>
                  <select
                    value={editForm?.category}
                    onChange={(e) => setEditForm(prev => ({ ...prev, category: e?.target?.value }))}
                    className="w-full px-3 py-2 border border-border rounded-md"
                  >
                    {categoryOptions?.map(option => (
                      <option key={option?.value} value={option?.value}>
                        {option?.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">
                    Descripción
                  </label>
                  <textarea
                    value={editForm?.description}
                    onChange={(e) => setEditForm(prev => ({ ...prev, description: e?.target?.value }))}
                    className="w-full px-3 py-2 border border-border rounded-md resize-none"
                    rows="4"
                    placeholder="Descripción de la imagen..."
                  />
                </div>
                <div className="flex space-x-2">
                  <Button
                    onClick={handleSaveEdit}
                    iconName="Save"
                    iconPosition="left"
                    className="flex-1"
                  >
                    Guardar
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => setIsEditing(false)}
                    className="flex-1"
                  >
                    Cancelar
                  </Button>
                </div>
              </div>)
            ) : (
              /* View Mode */
              (<div className="space-y-6">
                <div>
                  <h4 className="font-semibold text-foreground text-lg mb-2">
                    {image?.nombre || image?.name || image?.originalFileName || 'Sin nombre'}
                  </h4>
                  
                  <div className="space-y-3">
                    <div className="flex items-center space-x-2">
                      <Icon name="Tag" size={16} className="text-muted-foreground" />
                      <span className="text-sm text-foreground">
                        {getCategoryLabel(image?.categoria || image?.category)}
                      </span>
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      <Icon name="Calendar" size={16} className="text-muted-foreground" />
                      <span className="text-sm text-foreground">
                        {image?.createdAt || image?.fechaCreacion || image?.timestamp 
                          ? formatDate(image?.createdAt || image?.fechaCreacion || image?.timestamp)
                          : 'Invalid Date'
                        }
                      </span>
                    </div>
                    
                    {images?.length > 1 && (
                      <div className="flex items-center space-x-2">
                        <Icon name="Image" size={16} className="text-muted-foreground" />
                        <span className="text-sm text-foreground">
                          {currentIndex + 1} de {images?.length}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
                {(image?.descripcion || image?.description) && (
                  <div>
                    <h5 className="font-medium text-foreground mb-2">Descripción</h5>
                    <p className="text-sm text-muted-foreground">
                      {image?.descripcion || image?.description}
                    </p>
                  </div>
                )}
                {/* Actions */}
                <div className="space-y-2">
                  <Button
                    variant="outline"
                    className="w-full"
                    iconName="Download"
                    iconPosition="left"
                    onClick={async () => {
                      try {
                        const imageName = image?.nombre || image?.name || image?.originalFileName || 'imagen.jpg';
                        
                        // Usar el método de descarga del hook (endpoint proxy del backend)
                        if (onDownload) {
                          await onDownload(image?.id, imageName);
                          showSuccess('Imagen descargada exitosamente');
                        } else {
                          // Fallback: usar link directo si no hay método disponible
                          const imageUrl = image?.url || image?.src;
                          const link = document.createElement('a');
                          link.href = imageUrl;
                          link.download = imageName;
                          link.target = '_blank';
                          link.rel = 'noopener noreferrer';
                          document.body.appendChild(link);
                          link.click();
                          document.body.removeChild(link);
                          showSuccess('Imagen descargada exitosamente');
                        }
                      } catch (error) {
                        showError('No se pudo descargar la imagen');
                      }
                    }}
                  >
                    Descargar
                  </Button>
                  
                  <Button
                    variant="destructive"
                    className="w-full"
                    iconName="Trash2"
                    iconPosition="left"
                    onClick={handleDelete}
                  >
                    Eliminar
                  </Button>
                </div>
              </div>)
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ImageLightbox;