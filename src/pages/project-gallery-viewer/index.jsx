import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Icon from '../../components/AppIcon';
import Button from '../../components/ui/Button';
import Sidebar from '../../components/ui/Sidebar';
import Header from '../../components/ui/Header';
import Breadcrumb from '../../components/ui/Breadcrumb';
import ImageGallery from './components/ImageGallery';
import FilterToolbar from './components/FilterToolbar';
import ImageLightbox from './components/ImageLightbox';
import BulkActions from './components/BulkActions';
import ProjectInfo from './components/ProjectInfo';

const ProjectGalleryViewer = () => {
  const { projectId } = useParams();
  const navigate = useNavigate();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [headerMenuOpen, setHeaderMenuOpen] = useState(false);
  const [images, setImages] = useState([]);
  const [filteredImages, setFilteredImages] = useState([]);
  const [selectedImages, setSelectedImages] = useState([]);
  const [currentImage, setCurrentImage] = useState(null);
  const [isLightboxOpen, setIsLightboxOpen] = useState(false);
  const [isUploadingImages, setIsUploadingImages] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [viewMode, setViewMode] = useState('grid');
  const [slideshowMode, setSlideshowMode] = useState(false);

  // Sample project data
  const project = {
    id: projectId,
    code: "PROJ-2024-001",
    name: "Instalación HVAC Torre Corporativa",
    client: "ABC Corporation",
    status: "En Progreso",
    location: "Ciudad de México, CDMX"
  };

  // Sample images with project phases
  const mockImages = [
    {
      id: "img-1",
      url: "https://images.unsplash.com/photo-1541888946425-d81bb19240f5?w=800&h=600&fit=crop",
      thumbnail: "https://images.unsplash.com/photo-1541888946425-d81bb19240f5?w=300&h=200&fit=crop",
      title: "Recepción de Materiales - Ductos HVAC",
      category: "material-reception",
      categoryLabel: "Recepción de Material",
      phase: "planning",
      phaseLabel: "Planificación",
      uploadDate: "2024-10-01T10:30:00Z",
      fileSize: "2.4 MB",
      fileType: "image/jpeg",
      dimensions: "1920x1080",
      uploader: "Carlos Martínez",
      description: "Llegada de ductos principales para sistema HVAC",
      tags: ["hvac", "ductos", "materiales", "recepción"]
    },
    {
      id: "img-2",
      url: "https://images.unsplash.com/photo-1584464491033-06628f3a6b7b?w=800&h=600&fit=crop",
      thumbnail: "https://images.unsplash.com/photo-1584464491033-06628f3a6b7b?w=300&h=200&fit=crop",
      title: "Instalación de Unidades Enfriadoras",
      category: "manufacturing",
      categoryLabel: "Fabricación",
      phase: "in-progress",
      phaseLabel: "En Progreso",
      uploadDate: "2024-10-02T14:20:00Z",
      fileSize: "3.1 MB",
      fileType: "image/jpeg",
      dimensions: "1920x1080",
      uploader: "Ana Rodríguez",
      description: "Proceso de instalación de unidades enfriadoras en azotea",
      tags: ["instalación", "enfriadores", "azotea", "hvac"]
    },
    {
      id: "img-3",
      url: "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=800&h=600&fit=crop",
      thumbnail: "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=300&h=200&fit=crop",
      title: "Control de Calidad - Soldaduras",
      category: "quality-control",
      categoryLabel: "Control de Calidad",
      phase: "in-progress",
      phaseLabel: "En Progreso",
      uploadDate: "2024-10-02T16:45:00Z",
      fileSize: "1.8 MB",
      fileType: "image/jpeg",
      dimensions: "1920x1080",
      uploader: "Luis García",
      description: "Inspección de soldaduras en conexiones principales",
      tags: ["control-calidad", "soldaduras", "inspección", "conexiones"]
    },
    {
      id: "img-4",
      url: "https://images.unsplash.com/photo-1497366216548-37526070297c?w=800&h=600&fit=crop",
      thumbnail: "https://images.unsplash.com/photo-1497366216548-37526070297c?w=300&h=200&fit=crop",
      title: "Documentación Técnica",
      category: "documentation",
      categoryLabel: "Documentación",
      phase: "completed",
      phaseLabel: "Completado",
      uploadDate: "2024-10-03T09:10:00Z",
      fileSize: "0.9 MB",
      fileType: "image/jpeg",
      dimensions: "1920x1080",
      uploader: "Carlos Martínez",
      description: "Planos y especificaciones técnicas actualizadas",
      tags: ["documentación", "planos", "especificaciones", "técnico"]
    },
    {
      id: "img-5",
      url: "https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=800&h=600&fit=crop",
      thumbnail: "https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=300&h=200&fit=crop",
      title: "Instalación Final - Sala de Máquinas",
      category: "installation",
      categoryLabel: "Instalación",
      phase: "completed",
      phaseLabel: "Completado",
      uploadDate: "2024-10-03T11:30:00Z",
      fileSize: "2.7 MB",
      fileType: "image/jpeg",
      dimensions: "1920x1080",
      uploader: "Ana Rodríguez",
      description: "Vista final de la sala de máquinas completamente instalada",
      tags: ["instalación", "sala-máquinas", "completado", "final"]
    },
    {
      id: "img-6",
      url: "https://images.unsplash.com/photo-1581094794329-c8112a89af12?w=800&h=600&fit=crop",
      thumbnail: "https://images.unsplash.com/photo-1581094794329-c8112a89af12?w=300&h=200&fit=crop",
      title: "Pruebas de Sistema - Operación",
      category: "testing",
      categoryLabel: "Pruebas",
      phase: "in-progress",
      phaseLabel: "En Progreso",
      uploadDate: "2024-10-03T13:45:00Z",
      fileSize: "2.1 MB",
      fileType: "image/jpeg",
      dimensions: "1920x1080",
      uploader: "Luis García",
      description: "Realización de pruebas operativas del sistema HVAC",
      tags: ["pruebas", "operación", "sistema", "funcionamiento"]
    },
    {
      id: "img-7",
      url: "https://images.unsplash.com/photo-1504307651254-35680f356dfd?w=800&h=600&fit=crop",
      thumbnail: "https://images.unsplash.com/photo-1504307651254-35680f356dfd?w=300&h=200&fit=crop",
      title: "Capacitación del Personal",
      category: "training",
      categoryLabel: "Capacitación",
      phase: "completed",
      phaseLabel: "Completado",
      uploadDate: "2024-10-03T15:20:00Z",
      fileSize: "1.5 MB",
      fileType: "image/jpeg",
      dimensions: "1920x1080",
      uploader: "Carlos Martínez",
      description: "Sesión de capacitación para personal de mantenimiento",
      tags: ["capacitación", "personal", "mantenimiento", "entrenamiento"]
    },
    {
      id: "img-8",
      url: "https://images.unsplash.com/photo-1560472354-b33ff0c44a43?w=800&h=600&fit=crop",
      thumbnail: "https://images.unsplash.com/photo-1560472354-b33ff0c44a43?w=300&h=200&fit=crop",
      title: "Entrega Final del Proyecto",
      category: "completion",
      categoryLabel: "Finalización",
      phase: "completed",
      phaseLabel: "Completado",
      uploadDate: "2024-10-03T17:00:00Z",
      fileSize: "3.3 MB",
      fileType: "image/jpeg",
      dimensions: "1920x1080",
      uploader: "Ana Rodríguez",
      description: "Acta de entrega firmada y sistema funcionando",
      tags: ["entrega", "finalización", "acta", "completado"]
    }
  ];

  useEffect(() => {
    const loadImages = async () => {
      setIsLoading(true);
      await new Promise(resolve => setTimeout(resolve, 800));
      setImages(mockImages);
      setFilteredImages(mockImages);
      setIsLoading(false);
    };

    loadImages();
  }, [projectId]);

  const handleFilterChange = (filters) => {
    let filtered = [...images];

    if (filters?.search) {
      const searchTerm = filters?.search?.toLowerCase();
      filtered = filtered?.filter(img =>
        img?.title?.toLowerCase()?.includes(searchTerm) ||
        img?.description?.toLowerCase()?.includes(searchTerm) ||
        img?.tags?.some(tag => tag?.toLowerCase()?.includes(searchTerm))
      );
    }

    if (filters?.category) {
      filtered = filtered?.filter(img => img?.category === filters?.category);
    }

    if (filters?.phase) {
      filtered = filtered?.filter(img => img?.phase === filters?.phase);
    }

    if (filters?.dateFrom) {
      filtered = filtered?.filter(img =>
        new Date(img?.uploadDate) >= new Date(filters?.dateFrom)
      );
    }

    if (filters?.dateTo) {
      filtered = filtered?.filter(img =>
        new Date(img?.uploadDate) <= new Date(filters?.dateTo)
      );
    }

    setFilteredImages(filtered);
  };

  const handleImageSelect = (imageId) => {
    setSelectedImages(prev =>
      prev?.includes(imageId)
        ? prev?.filter(id => id !== imageId)
        : [...prev, imageId]
    );
  };

  const handleSelectAll = () => {
    if (selectedImages?.length === filteredImages?.length) {
      setSelectedImages([]);
    } else {
      setSelectedImages(filteredImages?.map(img => img?.id));
    }
  };

  const handleImageClick = (image) => {
    setCurrentImage(image);
    setIsLightboxOpen(true);
  };

  const handleImageUpload = async () => {
    try {
      setIsUploadingImages(true);

      const fileInput = document.createElement('input');
      fileInput.type = 'file';
      fileInput.accept = 'image/*';
      fileInput.multiple = true;

      fileInput.onchange = async (event) => {
        const files = Array.from(event?.target?.files || []);

        if (files?.length > 0) {
          const newImages = [];

          for (const file of files) {
            if (!file?.type?.startsWith('image/')) continue;
            if (file?.size > 10 * 1024 * 1024) continue; // 10MB limit

            const reader = new FileReader();
            reader.onload = (e) => {
              const newImage = {
                id: `img-${Date.now()}-${Math.random()?.toString(36)?.substr(2, 9)}`,
                url: e?.target?.result,
                thumbnail: e?.target?.result,
                title: file?.name?.replace(/\.[^/.]+$/, ""),
                category: "new-upload",
                categoryLabel: "Nueva Imagen",
                phase: "in-progress",
                phaseLabel: "En Progreso",
                uploadDate: new Date()?.toISOString(),
                fileSize: `${(file?.size / 1024 / 1024)?.toFixed(1)} MB`,
                fileType: file?.type,
                dimensions: "Unknown",
                uploader: "Usuario Actual",
                description: `Imagen subida: ${file?.name}`,
                tags: ["nueva", "upload", "reciente"]
              };

              newImages?.push(newImage);

              if (newImages?.length === files?.length) {
                setImages(prev => [...newImages, ...prev]);
                setFilteredImages(prev => [...newImages, ...prev]);
                console.log(`${files?.length} imágenes cargadas exitosamente`);
              }
            };

            reader?.readAsDataURL(file);
          }
        }

        setIsUploadingImages(false);
      };

      fileInput?.click();

    } catch (error) {
      console.error('Error al subir imágenes:', error);
      setIsUploadingImages(false);
    }
  };

  const handleBulkDownload = async () => {
    if (selectedImages?.length === 0) return;

    try {
      const selectedImageData = images?.filter(img => selectedImages?.includes(img?.id));

      for (const image of selectedImageData) {
        const link = document.createElement('a');
        link.href = image?.url;
        link.download = `${image?.title || 'image'}.jpg`;
        document.body?.appendChild(link);
        link?.click();
        document.body?.removeChild(link);

        // Add delay between downloads
        await new Promise(resolve => setTimeout(resolve, 200));
      }

      console.log(`${selectedImages?.length} imágenes descargadas`);
    } catch (error) {
      console.error('Error al descargar imágenes:', error);
    }
  };

  const handleBulkDelete = () => {
    if (selectedImages?.length === 0) return;

    const confirmed = window.confirm(
      `¿Está seguro de que desea eliminar ${selectedImages?.length} imagen(es) seleccionada(s)?\n\nEsta acción no se puede deshacer.`
    );

    if (confirmed) {
      setImages(prev => prev?.filter(img => !selectedImages?.includes(img?.id)));
      setFilteredImages(prev => prev?.filter(img => !selectedImages?.includes(img?.id)));
      setSelectedImages([]);
      console.log(`${selectedImages?.length} imágenes eliminadas`);
    }
  };

  const startSlideshow = () => {
    if (filteredImages?.length > 0) {
      setSlideshowMode(true);
      setCurrentImage(filteredImages?.[0]);
      setIsLightboxOpen(true);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex">
        <Sidebar isCollapsed={sidebarCollapsed} onToggle={() => setSidebarCollapsed(!sidebarCollapsed)} />
        <div className={`flex-1 transition-all duration-300 ${sidebarCollapsed ? 'lg:ml-16' : 'lg:ml-60'}`}>
          <Header onMenuToggle={() => setHeaderMenuOpen(!headerMenuOpen)} isMenuOpen={headerMenuOpen} />
          <div className="flex items-center justify-center h-96">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
              <p className="text-muted-foreground">Cargando galería del proyecto...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex">
      <Sidebar isCollapsed={sidebarCollapsed} onToggle={() => setSidebarCollapsed(!sidebarCollapsed)} />

      <div className={`flex-1 transition-all duration-300 ${sidebarCollapsed ? 'lg:ml-16' : 'lg:ml-60'}`}>
        <Header onMenuToggle={() => setHeaderMenuOpen(!headerMenuOpen)} isMenuOpen={headerMenuOpen} sidebarCollapsed={sidebarCollapsed} />

        <div className="">
          <div className="container mx-auto px-4 py-8">
            {/* Breadcrumb */}
            <div className="mb-6">
              <Breadcrumb />
            </div>

            {/* Header with Navigation */}
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center space-x-4">
                <Button
                  variant="outline"
                  size="sm"
                  iconName="ArrowLeft"
                  iconPosition="left"
                  onClick={() => navigate('/proyectos')}
                >
                  Volver a Proyectos
                </Button>
                <div>
                  <h1 className="text-2xl font-bold text-foreground">Galería del Proyecto</h1>
                  <p className="text-muted-foreground">{project?.name} - {project?.code}</p>
                </div>
              </div>

              <div className="flex items-center space-x-3">
                {/* View Mode Toggle */}
                <div className="flex bg-muted rounded-lg p-1">
                  <button
                    onClick={() => setViewMode('grid')}
                    className={`px-3 py-2 rounded-md transition-smooth ${viewMode === 'grid' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'
                      }`}
                  >
                    <Icon name="Grid3X3" size={16} />
                  </button>
                  <button
                    onClick={() => setViewMode('list')}
                    className={`px-3 py-2 rounded-md transition-smooth ${viewMode === 'list' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'
                      }`}
                  >
                    <Icon name="List" size={16} />
                  </button>
                </div>

                <Button
                  onClick={startSlideshow}
                  variant="outline"
                  iconName="Play"
                  iconPosition="left"
                >
                  Presentación
                </Button>

                <Button
                  onClick={handleImageUpload}
                  disabled={isUploadingImages}
                  iconName={isUploadingImages ? "Loader2" : "Upload"}
                  iconPosition="left"
                  className={isUploadingImages ? "animate-spin" : ""}
                >
                  {isUploadingImages ? 'Subiendo...' : 'Subir Imágenes'}
                </Button>
              </div>
            </div>

            {/* Project Info Panel */}
            <ProjectInfo project={project} imageCount={filteredImages?.length} />

            {/* Filter Toolbar */}
            <FilterToolbar
              onFilterChange={handleFilterChange}
              totalImages={images?.length}
              filteredImages={filteredImages?.length}
              selectedCount={selectedImages?.length}
              onSelectAll={handleSelectAll}
            />

            {/* Bulk Actions */}
            {selectedImages?.length > 0 && (
              <BulkActions
                selectedCount={selectedImages?.length}
                onBulkDownload={handleBulkDownload}
                onBulkDelete={handleBulkDelete}
                onClearSelection={() => setSelectedImages([])}
              />
            )}

            {/* Main Gallery */}
            <ImageGallery
              images={filteredImages}
              selectedImages={selectedImages}
              onImageSelect={handleImageSelect}
              onImageClick={handleImageClick}
              viewMode={viewMode}
            />

            {/* Empty State */}
            {filteredImages?.length === 0 && !isLoading && (
              <div className="text-center py-16">
                <Icon name="Image" size={64} className="text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-medium text-foreground mb-2">
                  {images?.length === 0 ? 'No hay imágenes en este proyecto' : 'No se encontraron imágenes'}
                </h3>
                <p className="text-muted-foreground mb-6">
                  {images?.length === 0
                    ? 'Comience subiendo las primeras imágenes del proyecto'
                    : 'Intente ajustar los filtros para encontrar las imágenes deseadas'
                  }
                </p>
                <Button
                  onClick={handleImageUpload}
                  iconName="Upload"
                  iconPosition="left"
                >
                  Subir Primera Imagen
                </Button>
              </div>
            )}

            {/* Lightbox */}
            <ImageLightbox
              isOpen={isLightboxOpen}
              onClose={() => {
                setIsLightboxOpen(false);
                setSlideshowMode(false);
              }}
              currentImage={currentImage}
              images={filteredImages}
              onNavigate={setCurrentImage}
              slideshowMode={slideshowMode}
              onToggleSlideshow={() => setSlideshowMode(!slideshowMode)}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProjectGalleryViewer;