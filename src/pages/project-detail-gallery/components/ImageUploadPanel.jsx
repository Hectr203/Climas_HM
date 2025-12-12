import React, { useState, useRef } from 'react';
import Icon from '../../../components/AppIcon';
import Button from '../../../components/ui/Button';
import Image from '../../../components/AppImage';
import { useNotifications } from '../../../context/NotificationContext';

const ImageUploadPanel = ({ onImagesUploaded, projectId, isUploading = false, uploadType = 'proyecto' }) => {
  const { showError, showWarning } = useNotifications();
  const [dragActive, setDragActive] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [previewImages, setPreviewImages] = useState([]);
  const fileInputRef = useRef(null);

  const handleFileSelect = (files) => {
    const validFiles = Array.from(files)?.filter(file => {
      const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
      const maxSize = 5 * 1024 * 1024; // 5MB
      
      if (!validTypes?.includes(file?.type)) {
        alert(`Archivo ${file?.name} no es un tipo de imagen válido`);
        return false;
      }
      
      if (file?.size > maxSize) {
        alert(`Archivo ${file?.name} es demasiado grande. Máximo 5MB`);
        return false;
      }
      
      return true;
    });

    if (validFiles?.length === 0) return;

    setSelectedFiles(prev => [...prev, ...validFiles]);
    
    // Generate previews
    validFiles?.forEach(file => {
      const reader = new FileReader();
      reader.onload = (e) => {
        setPreviewImages(prev => [...prev, {
          id: `${file?.name}-${Date.now()}`,
          file,
          src: e?.target?.result,
          name: file?.name,
          category: uploadType === 'taller' ? 'recepcion' : 'general',
          description: ''
        }]);
      };
      reader?.readAsDataURL(file);
    });
  };

  const handleDrag = (e) => {
    e?.preventDefault();
    e?.stopPropagation();
    
    if (e?.type === 'dragenter' || e?.type === 'dragover') {
      setDragActive(true);
    } else if (e?.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e) => {
    e?.preventDefault();
    e?.stopPropagation();
    setDragActive(false);
    
    if (e?.dataTransfer?.files?.length) {
      handleFileSelect(e?.dataTransfer?.files);
    }
  };

  const handleFileInput = (e) => {
    if (e?.target?.files?.length) {
      handleFileSelect(e?.target?.files);
    }
  };

  const updateImageMetadata = (imageId, field, value) => {
    setPreviewImages(prev => prev?.map(img => 
      img?.id === imageId ? { ...img, [field]: value } : img
    ));
  };

  const removeImage = (imageId) => {
    setPreviewImages(prev => prev?.filter(img => img?.id !== imageId));
    setSelectedFiles(prev => prev?.filter(file => 
      !previewImages?.some(img => img?.id === imageId && img?.file === file)
    ));
  };

  const handleUpload = async () => {
    if (previewImages?.length === 0) {
      showWarning('Seleccione al menos una imagen para subir');
      return;
    }

    // Prepare images with metadata
    const imagesToUpload = previewImages?.map(img => ({
      file: img?.file,
      name: img?.name, // Nombre personalizado editado por el usuario
      category: img?.category,
      description: img?.description,
      projectId,
      timestamp: new Date()?.toISOString()
    }));

    try {
      await onImagesUploaded(imagesToUpload);
      
      // Clear selections after successful upload
      setSelectedFiles([]);
      setPreviewImages([]);
      
      // Reset file input
      if (fileInputRef?.current) {
        fileInputRef.current.value = '';
      }
    } catch (error) {
      showError('Error al subir las imágenes. Por favor intente nuevamente.');
    }
  };

  // Categorías diferentes según el tipo de upload
  const categoryOptions = uploadType === 'taller' 
    ? [
        { value: 'recepcion', label: 'Recepción de Material' },
        { value: 'seguridad', label: 'Lista de Seguridad' },
        { value: 'fabricacion', label: 'Fabricación' },
        { value: 'calidad', label: 'Control de Calidad' },
        { value: 'envio', label: 'Listo para Envío' }
      ]
    : [
        { value: 'general', label: 'General' },
        { value: 'construction', label: 'Construcción' },
        { value: 'installation', label: 'Instalación' },
        { value: 'testing', label: 'Pruebas' },
        { value: 'completion', label: 'Finalización' },
        { value: 'quality-control', label: 'Control de Calidad' },
        { value: 'safety', label: 'Seguridad' },
        { value: 'documentation', label: 'Documentación' }
      ];

  return (
    <div className="bg-card border border-border rounded-lg p-6">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold text-foreground">
          {uploadType === 'taller' ? 'Subir Imágenes de Taller' : 'Subir Imágenes del Proyecto'}
        </h3>
        <div className="text-sm text-muted-foreground">
          Formatos: JPG, PNG, GIF, WebP • Máximo: 5MB
        </div>
      </div>
      {/* Drag & Drop Zone */}
      <div
        className={`relative border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
          dragActive 
            ? 'border-primary bg-primary/5' :'border-border hover:border-primary/50'
        }`}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
      >
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept="image/*"
          onChange={handleFileInput}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
          disabled={isUploading}
        />
        
        <div className="flex flex-col items-center space-y-4">
          <div className={`p-4 rounded-full ${dragActive ? 'bg-primary/10' : 'bg-muted'}`}>
            <Icon name="Upload" size={32} className={dragActive ? 'text-primary' : 'text-muted-foreground'} />
          </div>
          
          <div>
            <p className="text-lg font-medium text-foreground mb-1">
              {dragActive ? 'Suelte las imágenes aquí' : 'Arrastra imágenes aquí'}
            </p>
            <p className="text-sm text-muted-foreground">
              o haz clic para seleccionar archivos
            </p>
          </div>
          
          <Button
            variant="outline"
            size="sm"
            disabled={isUploading}
            onClick={() => fileInputRef?.current?.click()}
          >
            Seleccionar Archivos
          </Button>
        </div>
      </div>
      {/* Preview Images */}
      {previewImages?.length > 0 && (
        <div className="mt-6">
          <h4 className="text-md font-medium text-foreground mb-4">
            Imágenes Seleccionadas ({previewImages?.length})
          </h4>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {previewImages?.map((img) => (
              <div key={img?.id} className="border border-border rounded-lg overflow-hidden">
                {/* Image Preview */}
                <div className="relative h-48">
                  <Image
                    src={img?.src}
                    alt={img?.name}
                    className="w-full h-full object-cover"
                  />
                  <button
                    onClick={() => removeImage(img?.id)}
                    className="absolute top-2 right-2 p-1 bg-red-500 text-white rounded-full hover:bg-red-600"
                  >
                    <Icon name="X" size={16} />
                  </button>
                </div>
                
                {/* Metadata Form */}
                <div className="p-4 space-y-3">
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-1">
                      Nombre
                    </label>
                    <input
                      type="text"
                      value={img?.name}
                      onChange={(e) => updateImageMetadata(img?.id, 'name', e?.target?.value)}
                      className="w-full px-3 py-2 border border-border rounded-md text-sm"
                      placeholder="Nombre de la imagen"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-1">
                      Categoría
                    </label>
                    <select
                      value={img?.category}
                      onChange={(e) => updateImageMetadata(img?.id, 'category', e?.target?.value)}
                      className="w-full px-3 py-2 border border-border rounded-md text-sm"
                    >
                      {categoryOptions?.map(option => (
                        <option key={option?.value} value={option?.value}>
                          {option?.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-1">
                      Descripción
                    </label>
                    <textarea
                      value={img?.description}
                      onChange={(e) => updateImageMetadata(img?.id, 'description', e?.target?.value)}
                      className="w-full px-3 py-2 border border-border rounded-md text-sm resize-none"
                      rows="2"
                      placeholder="Descripción opcional..."
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
          
          {/* Upload Button */}
          <div className="flex justify-center mt-6">
            <Button
              onClick={handleUpload}
              disabled={isUploading || previewImages?.length === 0}
              iconName="Upload"
              iconPosition="left"
              className="px-8"
            >
              {isUploading ? 'Subiendo...' : `Subir ${previewImages?.length} Imagen(es)`}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};

export default ImageUploadPanel;