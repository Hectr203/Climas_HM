import React, { useState, useEffect } from 'react';
import Icon from '../../../components/AppIcon';
import Button from '../../../components/ui/Button';
import Image from '../../../components/AppImage';
import ImageLightbox from './ImageLightbox';
import { useNotifications } from '../../../context/NotificationContext';

const ImageGallery = ({ 
  images = [], 
  projectId, 
  onDeleteImage, 
  onUpdateImage, 
  onDownloadImage, 
  projectInfo, 
  obtenerImagenUrl,
  emptyMessage = 'Las imágenes subidas para este proyecto aparecerán aquí',
  emptyIcon = 'Image',
  galleryType = 'proyecto' // 'proyecto' o 'taller'
}) => {
  const { showError, showSuccess, showConfirm } = useNotifications();
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [sortBy, setSortBy] = useState('newest');
  const [searchTerm, setSearchTerm] = useState('');
  const [lightboxImage, setLightboxImage] = useState(null);
  const [viewMode, setViewMode] = useState('masonry'); // masonry, grid, list
  const [imageUrls, setImageUrls] = useState({}); // Cache de URLs temporales

  // Categorías diferentes según el tipo de galería
  const categoryOptions = galleryType === 'taller'
    ? [
        { value: 'all', label: 'Todas las Categorías' },
        { value: 'recepcion', label: 'Recepción de Material' },
        { value: 'seguridad', label: 'Lista de Seguridad' },
        { value: 'fabricacion', label: 'Fabricación' },
        { value: 'calidad', label: 'Control de Calidad' },
        { value: 'envio', label: 'Listo para Envío' }
      ]
    : [
        { value: 'all', label: 'Todas las Categorías' },
        { value: 'general', label: 'General' },
        { value: 'construction', label: 'Construcción' },
        { value: 'installation', label: 'Instalación' },
        { value: 'testing', label: 'Pruebas' },
        { value: 'completion', label: 'Finalización' },
        { value: 'quality-control', label: 'Control de Calidad' },
        { value: 'safety', label: 'Seguridad' },
        { value: 'documentation', label: 'Documentación' }
      ];

  const sortOptions = [
    { value: 'newest', label: 'Más Recientes' },
    { value: 'oldest', label: 'Más Antiguos' },
    { value: 'name', label: 'Por Nombre' },
    { value: 'category', label: 'Por Categoría' }
  ];

  const viewModeOptions = [
    { value: 'masonry', label: 'Mosaico', icon: 'Grid' },
    { value: 'grid', label: 'Cuadrícula', icon: 'Grid3X3' },
    { value: 'list', label: 'Lista', icon: 'List' }
  ];

  // Filter and sort images
  const filteredImages = images
    ?.filter(image => {
      const imgCategory = image?.categoria || image?.category || 'general';
      const matchesCategory = selectedCategory === 'all' || imgCategory === selectedCategory;
      
      const imgName = image?.nombre || image?.name || image?.originalFileName || '';
      const imgDesc = image?.descripcion || image?.description || '';
      const matchesSearch = !searchTerm || 
        imgName?.toLowerCase()?.includes(searchTerm?.toLowerCase()) ||
        imgDesc?.toLowerCase()?.includes(searchTerm?.toLowerCase());
      
      return matchesCategory && matchesSearch;
    })
    ?.sort((a, b) => {
      switch (sortBy) {
        case 'newest': {
          const dateA = new Date(a?.createdAt || a?.timestamp || 0).getTime();
          const dateB = new Date(b?.createdAt || b?.timestamp || 0).getTime();
          return dateB - dateA;
        }
        case 'oldest': {
          const dateA = new Date(a?.createdAt || a?.timestamp || 0).getTime();
          const dateB = new Date(b?.createdAt || b?.timestamp || 0).getTime();
          return dateA - dateB;
        }
        case 'name': {
          const nameA = a?.nombre || a?.name || a?.originalFileName || '';
          const nameB = b?.nombre || b?.name || b?.originalFileName || '';
          return nameA?.localeCompare(nameB);
        }
        case 'category': {
          const catA = a?.categoria || a?.category || '';
          const catB = b?.categoria || b?.category || '';
          return catA?.localeCompare(catB);
        }
        default:
          return 0;
      }
    });

  const getCategoryColor = (category) => {
    // Colores para categorías de taller
    const tallerColors = {
      'recepcion': 'bg-blue-100 text-blue-800',
      'seguridad': 'bg-orange-100 text-orange-800',
      'fabricacion': 'bg-purple-100 text-purple-800',
      'calidad': 'bg-green-100 text-green-800',
      'envio': 'bg-teal-100 text-teal-800'
    };
    
    // Colores para categorías de proyecto
    const proyectoColors = {
      'general': 'bg-gray-100 text-gray-800',
      'construction': 'bg-blue-100 text-blue-800',
      'installation': 'bg-green-100 text-green-800',
      'testing': 'bg-yellow-100 text-yellow-800',
      'completion': 'bg-purple-100 text-purple-800',
      'quality-control': 'bg-red-100 text-red-800',
      'safety': 'bg-orange-100 text-orange-800',
      'documentation': 'bg-indigo-100 text-indigo-800'
    };
    
    const colors = galleryType === 'taller' ? tallerColors : proyectoColors;
    return colors?.[category] || 'bg-gray-100 text-gray-800';
  };

  const getCategoryLabel = (category) => {
    const option = categoryOptions?.find(opt => opt?.value === category);
    return option?.label || category;
  };

  const formatDate = (timestamp) => {
    if (!timestamp) return 'Fecha no disponible';
    return new Date(timestamp)?.toLocaleDateString('es-MX', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Cargar URL temporal de imagen cuando se necesite
  const cargarUrlImagen = async (imagenId) => {
      // Verificar caché primero
    if (imageUrls[imagenId]) {
      const cached = imageUrls[imagenId];
      
      // Si hay error en caché, no reintentar por 5 minutos
      if (cached.error) {
        const tiempoTranscurrido = Date.now() - cached.timestamp;
        if (tiempoTranscurrido < 5 * 60 * 1000) {
          return null;
        }
      }
      
      // Verificar si la URL no ha expirado (55 min)
      if (cached.url) {
        const tiempoTranscurrido = Date.now() - cached.timestamp;
        if (tiempoTranscurrido < 55 * 60 * 1000) {
          return cached.url;
        }
      }
    }    try {
      const result = await obtenerImagenUrl(projectId, imagenId, 60);
      
      if (result.success && result.url) {
        setImageUrls(prev => ({
          ...prev,
          [imagenId]: {
            url: result.url,
            timestamp: Date.now(),
            error: false
          }
        }));
        return result.url;
      } else {
        // Guardar error en caché
        setImageUrls(prev => ({
          ...prev,
          [imagenId]: {
            url: null,
            timestamp: Date.now(),
            error: true,
            errorMessage: result.message
          }
        }));
      }
    } catch (error) {
      // Guardar error en caché
      setImageUrls(prev => ({
        ...prev,
        [imagenId]: {
          url: null,
          timestamp: Date.now(),
          error: true,
          errorMessage: error.message
        }
      }));
    }
    return null;
  };

  // ✅ ELIMINADO: Ya no cargamos URLs automáticamente, solo bajo demanda
  // Las URLs se cargarán cuando el usuario haga clic en "Ver" o en la imagen

  const handleDeleteImage = async (image) => {
    const imageName = image?.nombre || image?.name || image?.originalFileName || 'esta imagen';
    
    showConfirm(
      `¿Está seguro de que desea eliminar "${imageName}"?`, 
      {
        onConfirm: async () => {
          try {
            await onDeleteImage(image?.id);
            showSuccess('Imagen eliminada exitosamente');
          } catch (error) {
            showError(error?.message || 'Error al eliminar la imagen');
          }
        }
      }
    );
  };

  const exportGallery = () => {
    const galleryData = {
      project: projectInfo,
      images: filteredImages,
      exportDate: new Date()?.toISOString(),
      totalImages: filteredImages?.length
    };

    const blob = new Blob([JSON.stringify(galleryData, null, 2)], { 
      type: 'application/json' 
    });
    
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `galeria-${projectInfo?.code || 'proyecto'}-${new Date()?.toISOString()?.split('T')?.[0]}.json`;
    document.body?.appendChild(link);
    link?.click();
    document.body?.removeChild(link);
    URL.revokeObjectURL(url);
  };

  if (!images?.length) {
    return (
      <div className="text-center py-12">
        <Icon name={emptyIcon} size={64} className="text-muted-foreground mx-auto mb-4" />
        <h3 className="text-lg font-medium text-foreground mb-2">No hay imágenes</h3>
        <p className="text-muted-foreground">
          {emptyMessage}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Controls */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        {/* Search and Filters */}
        <div className="flex flex-col sm:flex-row gap-4 flex-1">
          <div className="relative flex-1 max-w-sm">
            <Icon name="Search" size={20} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e?.target?.value)}
              placeholder="Buscar imágenes..."
              className="w-full pl-10 pr-4 py-2 border border-border rounded-md text-sm"
            />
          </div>
          
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e?.target?.value)}
            className="px-3 py-2 border border-border rounded-md text-sm min-w-48"
          >
            {categoryOptions?.map(option => (
              <option key={option?.value} value={option?.value}>
                {option?.label}
              </option>
            ))}
          </select>
          
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e?.target?.value)}
            className="px-3 py-2 border border-border rounded-md text-sm min-w-40"
          >
            {sortOptions?.map(option => (
              <option key={option?.value} value={option?.value}>
                {option?.label}
              </option>
            ))}
          </select>
        </div>

        {/* View Mode and Actions */}
        <div className="flex items-center space-x-4">
          <div className="flex bg-muted rounded-lg p-1">
            {viewModeOptions?.map(mode => (
              <button
                key={mode?.value}
                onClick={() => setViewMode(mode?.value)}
                className={`flex items-center space-x-2 px-3 py-2 rounded-md transition-smooth ${
                  viewMode === mode?.value
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
                title={mode?.label}
              >
                <Icon name={mode?.icon} size={16} />
                <span className="hidden sm:inline text-sm">{mode?.label}</span>
              </button>
            ))}
          </div>
        </div>
      </div>
      {/* Results Count */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          Mostrando {filteredImages?.length} de {images?.length} imágenes
        </p>
        {searchTerm && (
          <Button
            variant="ghost"
            size="sm"
            iconName="X"
            iconPosition="left"
            onClick={() => setSearchTerm('')}
          >
            Limpiar búsqueda
          </Button>
        )}
      </div>
      {/* Image Gallery */}
      {filteredImages?.length === 0 ? (
        <div className="text-center py-8">
          <Icon name="Search" size={48} className="text-muted-foreground mx-auto mb-4" />
          <p className="text-muted-foreground">
            No se encontraron imágenes con los filtros seleccionados
          </p>
        </div>
      ) : (
        <>
          {/* Masonry View */}
          {viewMode === 'masonry' && (
            <div className="columns-1 md:columns-2 lg:columns-3 xl:columns-4 gap-6 space-y-6">
              {filteredImages?.map((image, index) => {
                const imageUrl = imageUrls[image?.id]?.url || null;
                // Priorizar nombre personalizado sobre originalFileName
                const imageName = image?.nombre || image?.name || image?.originalFileName || 'Sin nombre';
                const imageDesc = image?.descripcion || image?.description || '';
                
                return (
                  <div 
                    key={image?.id || index} 
                    className="break-inside-avoid bg-card border border-border rounded-lg overflow-hidden hover:shadow-md transition-shadow"
                  >
                    <div className="relative group">
                      {imageUrl ? (
                        <img
                          src={imageUrl}
                          alt={imageName}
                          className="w-full h-auto cursor-pointer object-cover"
                          onClick={async () => {
                            const url = await cargarUrlImagen(image?.id);
                            if (url) {
                              setLightboxImage({ ...image, url });
                            }
                          }}
                        />
                      ) : (
                        <div 
                          className="w-full aspect-video bg-muted flex flex-col items-center justify-center cursor-pointer hover:bg-muted/80 transition-colors"
                          onClick={async () => {
                            const url = await cargarUrlImagen(image?.id);
                            // Forzar actualización después de cargar
                            if (url) {
                              // El estado ya se actualiza en cargarUrlImagen
                            }
                          }}
                        >
                          <Icon name="Image" size={32} className="text-muted-foreground mb-2" />
                          <span className="text-xs text-muted-foreground">Click para cargar preview</span>
                        </div>
                      )}
                      <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                        <Button
                          variant="outline"
                          size="sm"
                          iconName="Eye"
                          onClick={async (e) => {
                            e.stopPropagation(); // Evitar que dispare el onClick del padre
                            const url = await cargarUrlImagen(image?.id);
                            if (url) {
                              setLightboxImage({ ...image, url });
                            }
                          }}
                        >
                          Ver
                        </Button>
                      </div>
                    </div>
                    
                    <div className="p-4">
                      <div className="flex items-start justify-between mb-2">
                        <h4 className="font-medium text-foreground text-sm">{imageName}</h4>
                        <button
                          onClick={() => handleDeleteImage(image)}
                          className="p-1 text-red-500 hover:bg-red-50 rounded"
                        >
                          <Icon name="Trash2" size={14} />
                        </button>
                      </div>
                    
                    <div className="space-y-2">
                      {imageDesc && (
                        <p className="text-xs text-muted-foreground">
                          {imageDesc}
                        </p>
                      )}
                      
                      <p className="text-xs text-muted-foreground">
                        {formatDate(image?.createdAt || image?.timestamp)}
                      </p>
                      
                      {image?.size && (
                        <p className="text-xs text-muted-foreground">
                          {(image.size / 1024 / 1024).toFixed(2)} MB
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              );
              })}
            </div>
          )}

          {/* Grid View */}
          {viewMode === 'grid' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
              {filteredImages?.map((image, index) => {
                const imageUrl = imageUrls[image?.id]?.url || null;
                const imageName = image?.nombre || image?.name || image?.originalFileName || 'Sin nombre';
                const imageCategory = image?.categoria || image?.category || 'general';
                
                return (
                  <div 
                    key={image?.id || index}
                    className="bg-card border border-border rounded-lg overflow-hidden hover:shadow-md transition-shadow"
                  >
                    <div className="relative aspect-square group">
                      {imageUrl ? (
                        <img
                          src={imageUrl}
                          alt={imageName}
                          className="w-full h-full object-cover cursor-pointer"
                          onClick={async () => {
                            const url = await cargarUrlImagen(image?.id);
                            if (url) {
                              setLightboxImage({ ...image, url });
                            }
                          }}
                        />
                      ) : (
                        <div 
                          className="w-full h-full bg-muted flex flex-col items-center justify-center cursor-pointer hover:bg-muted/80 transition-colors"
                          onClick={async () => {
                            await cargarUrlImagen(image?.id);
                          }}
                        >
                          <Icon name="Image" size={32} className="text-muted-foreground mb-2" />
                          <span className="text-xs text-muted-foreground">Click para cargar</span>
                        </div>
                      )}
                      <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                        <Button
                          variant="outline"
                          size="sm"
                          iconName="Eye"
                          onClick={async (e) => {
                            e.stopPropagation();
                            const url = await cargarUrlImagen(image?.id);
                            if (url) {
                              setLightboxImage({ ...image, url });
                            }
                          }}
                        >
                          Ver
                        </Button>
                      </div>
                      <button
                        onClick={() => handleDeleteImage(image)}
                        className="absolute top-2 right-2 p-1 bg-red-500 text-white rounded-full hover:bg-red-600 opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <Icon name="Trash2" size={14} />
                      </button>
                    </div>
                    
                    <div className="p-3">
                      <h4 className="font-medium text-foreground text-sm mb-1 truncate" title={imageName}>
                        {imageName}
                      </h4>
                      <span className={`inline-block px-2 py-1 rounded-full text-xs font-medium ${getCategoryColor(imageCategory)}`}>
                        {getCategoryLabel(imageCategory)}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* List View */}
          {viewMode === 'list' && (
            <div className="space-y-4">
              {filteredImages?.map((image, index) => {
                const imageUrl = imageUrls[image?.id]?.url || null;
                const imageName = image?.nombre || image?.name || image?.originalFileName || 'Sin nombre';
                const imageCategory = image?.categoria || image?.category || 'general';
                const imageDesc = image?.descripcion || image?.description || '';
                
                return (
                  <div 
                    key={image?.id || index}
                    className="bg-card border border-border rounded-lg p-4 hover:shadow-sm transition-shadow"
                  >
                    <div className="flex items-center space-x-4">
                      <div className="relative w-16 h-16 flex-shrink-0">
                        {imageUrl ? (
                          <img
                            src={imageUrl}
                            alt={imageName}
                            className="w-full h-full object-cover rounded cursor-pointer"
                            onClick={async () => {
                              const url = await cargarUrlImagen(image?.id);
                              if (url) {
                                setLightboxImage({ ...image, url });
                              }
                            }}
                          />
                        ) : (
                          <div 
                            className="w-full h-full bg-muted flex items-center justify-center rounded cursor-pointer hover:bg-muted/80 transition-colors"
                            onClick={async () => {
                              await cargarUrlImagen(image?.id);
                            }}
                          >
                            <Icon name="Image" size={24} className="text-muted-foreground" />
                          </div>
                        )}
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between">
                          <div className="flex-1 min-w-0 pr-4">
                            <h4 className="font-medium text-foreground truncate">{imageName}</h4>
                            <div className="flex items-center space-x-2 mt-1">
                              <span className={`inline-block px-2 py-1 rounded-full text-xs font-medium ${getCategoryColor(imageCategory)}`}>
                                {getCategoryLabel(imageCategory)}
                              </span>
                              <span className="text-xs text-muted-foreground">
                                {formatDate(image?.createdAt || image?.timestamp)}
                              </span>
                            </div>
                            {imageDesc && (
                              <p className="text-sm text-muted-foreground mt-2 line-clamp-2">
                                {imageDesc}
                              </p>
                            )}
                          </div>
                          
                          <div className="flex items-center space-x-2 flex-shrink-0">
                            <Button
                              variant="ghost"
                              size="sm"
                              iconName="Eye"
                              onClick={async () => {
                                const url = await cargarUrlImagen(image?.id);
                                if (url) {
                                  setLightboxImage({ ...image, url });
                                }
                              }}
                            />
                            <Button
                              variant="ghost"
                              size="sm"
                              iconName="Trash2"
                              onClick={() => handleDeleteImage(image)}
                              className="text-red-500 hover:text-red-600"
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}
      {/* Lightbox */}
      {lightboxImage && (
        <ImageLightbox
          image={lightboxImage}
          images={filteredImages}
          onClose={() => setLightboxImage(null)}
          onNavigate={async (newImage) => {
            // Cargar URL de la nueva imagen antes de mostrarla
            const url = await cargarUrlImagen(newImage?.id);
            setLightboxImage({ ...newImage, url: url || newImage?.url });
          }}
          onDelete={handleDeleteImage}
          onUpdate={onUpdateImage}
          onDownload={(imagenId, nombreArchivo) => onDownloadImage?.(projectId, imagenId, nombreArchivo)}
        />
      )}
    </div>
  );
};

export default ImageGallery;