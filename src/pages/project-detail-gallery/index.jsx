import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import Icon from '../../components/AppIcon';
import Button from '../../components/ui/Button';
import Sidebar from '../../components/ui/Sidebar';
import Header from '../../components/ui/Header';
import Breadcrumb from '../../components/ui/Breadcrumb';
import ImageUploadPanel from './components/ImageUploadPanel';
import ImageGallery from './components/ImageGallery';
import ProjectInfoPanel from './components/ProjectInfoPanel';
import useProyectoImagenes from '../../hooks/useProyectoImagenes';
import useTallerImagenes from '../../hooks/useTallerImagenes';
import useProyecto from '../../hooks/useProyect';
import useClient from '../../hooks/useClient';
import { useNotifications } from '../../context/NotificationContext';

const ProjectDetailGallery = () => {
  const { projectId } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { showSuccess, showError, showWarning } = useNotifications();
  const [project, setProject] = useState(null);
  const [clientInfo, setClientInfo] = useState(null);
  const tabParam = searchParams.get('tab');
  const [activeTab, setActiveTab] = useState(tabParam || 'gallery');
  const [isLoading, setIsLoading] = useState(true);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [headerMenuOpen, setHeaderMenuOpen] = useState(false);

  const { 
    imagenes, 
    loading: imagenesLoading, 
    subirImagen, 
    listarImagenes, 
    obtenerImagenUrl,
    eliminarImagen,
    actualizarImagen,
    descargarImagen
  } = useProyectoImagenes();

  const {
    imagenes: imagenesTaller,
    loading: tallerLoading,
    subirImagen: subirImagenTaller,
    listarImagenes: listarImagenesTaller,
    obtenerImagenUrl: obtenerImagenUrlTaller,
    eliminarImagen: eliminarImagenTaller,
    actualizarImagen: actualizarImagenTaller,
    descargarImagen: descargarImagenTaller
  } = useTallerImagenes();

  const { getProyectoById } = useProyecto();
  const { clients, getClients } = useClient();

  // Mock project data - in a real app, this would come from an API
  const mockProjects = [
    {
      id: "1",
      code: "PROJ-2024-001",
      name: "Instalación HVAC Torre Corporativa",
      type: "Instalación HVAC",
      client: {
        name: "ABC Corporation",
        contact: "contacto@abccorp.com",
        type: "commercial"
      },
      status: "in-progress",
      statusLabel: "En Progreso",
      priority: "high",
      priorityLabel: "Alta",
      budget: 850000,
      startDate: "2024-01-15",
      endDate: "2024-04-30",
      progress: 65,
      department: "Ingeniería",
      location: "Ciudad de México, CDMX",
      image: "https://images.unsplash.com/photo-1541888946425-d81bb19240f5?w=400",
      assignedPersonnel: [
        { name: "Carlos Martínez", role: "Ingeniero Jefe" },
        { name: "Ana Rodríguez", role: "Técnico Especialista" },
        { name: "Luis García", role: "Supervisor de Obra" }
      ],
      workOrders: [
        { code: "WO-2024-001", status: "completed", statusLabel: "Completada" },
        { code: "WO-2024-002", status: "in-progress", statusLabel: "En Progreso" },
        { code: "WO-2024-003", status: "planning", statusLabel: "Planificación" }
      ]
    },
    {
      id: "2",
      code: "PROJ-2024-002",
      name: "Mantenimiento Sistema Industrial",
      type: "Mantenimiento",
      client: {
        name: "XYZ Industries",
        contact: "servicios@xyzind.com",
        type: "industrial"
      },
      status: "completed",
      statusLabel: "Completado",
      priority: "medium",
      priorityLabel: "Media",
      budget: 320000,
      startDate: "2024-02-01",
      endDate: "2024-03-15",
      progress: 100,
      department: "Mantenimiento",
      location: "Guadalajara, JAL",
      image: "https://images.unsplash.com/photo-1581094794329-c8112a89af12?w=400",
      assignedPersonnel: [
        { name: "María López", role: "Coordinadora" },
        { name: "José Hernández", role: "Técnico" }
      ],
      workOrders: [
        { code: "WO-2024-004", status: "completed", statusLabel: "Completada" },
        { code: "WO-2024-005", status: "completed", statusLabel: "Completada" }
      ]
    }
  ];

  // Mock images data - in a real app, this would come from an API
  const mockImages = [
    {
      id: 'img1',
      projectId: '1',
      name: 'Instalación inicial del sistema',
      src: 'https://images.unsplash.com/photo-1541888946425-d81bb19240f5?w=800',
      category: 'installation',
      description: 'Vista general de la instalación del sistema HVAC en la torre corporativa',
      timestamp: '2024-01-20T10:30:00Z'
    },
    {
      id: 'img2',
      projectId: '1',
      name: 'Pruebas de funcionamiento',
      src: 'https://images.unsplash.com/photo-1581094794329-c8112a89af12?w=800',
      category: 'testing',
      description: 'Verificación de las conexiones y funcionamiento del sistema',
      timestamp: '2024-02-15T14:20:00Z'
    },
    {
      id: 'img3',
      projectId: '1',
      name: 'Control de calidad',
      src: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=800',
      category: 'quality-control',
      description: 'Inspección de calidad de los componentes instalados',
      timestamp: '2024-03-01T09:15:00Z'
    },
    {
      id: 'img4',
      projectId: '2',
      name: 'Mantenimiento preventivo',
      src: 'https://images.unsplash.com/photo-1497366216548-37526070297c?w=800',
      category: 'general',
      description: 'Tareas de mantenimiento preventivo del sistema industrial',
      timestamp: '2024-02-10T11:45:00Z'
    }
  ];

  useEffect(() => {
    const loadProjectData = async () => {
      setIsLoading(true);
      
      try {
        // Cargar datos del proyecto desde el backend
        const proyectoData = await getProyectoById(projectId);
        
        if (!proyectoData) {
          navigate('/project-management');
          return;
        }
        
        setProject(proyectoData);
        
        // Si el proyecto tiene un clienteId, cargar la información completa del cliente
        // Buscar en: clienteId, clientId, o dentro del objeto cliente
        const clienteId = proyectoData.clienteId 
          || proyectoData.clientId 
          || proyectoData.cliente?.id 
          || proyectoData.cliente?._id
          || proyectoData.client?.id 
          || proyectoData.client?._id;
        
        if (clienteId) {
          const clientesList = await getClients();
          
          if (clientesList && clientesList.length > 0) {
            const clienteCompleto = clientesList.find(
              c => c.id === clienteId || c._id === clienteId
            );
            
            if (clienteCompleto) {
              setClientInfo(clienteCompleto);
            }
          }
        }
        
        // Cargar imágenes del proyecto
        await listarImagenes(projectId);
        await listarImagenesTaller(projectId);
        
      } catch (error) {
        console.error('Error loading project data:', error);
        navigate('/project-management');
      } finally {
        setIsLoading(false);
      }
    };

    if (projectId) {
      loadProjectData();
    }
  }, [projectId, navigate, getProyectoById, listarImagenes, getClients]);

  const handleImagesUploaded = async (newImages) => {
    try {
      const uploadPromises = newImages.map(async (img) => {
        const metadata = {
          descripcion: img.description || img.descripcion || '',
          categoria: img.category || img.categoria || '',
          nombre: img.name || img.nombre || ''
        };
        
        const result = await subirImagen(projectId, img.file, metadata);
        return result;
      });

      const results = await Promise.all(uploadPromises);
      
      const successCount = results.filter(r => r.success).length;
      const failCount = results.filter(r => !r.success).length;

      if (successCount > 0) {
        // Recargar imágenes después de subir
        await listarImagenes(projectId);
        
        // Switch to gallery view after upload
        setActiveTab('gallery');
        
        if (failCount > 0) {
          showWarning(`${successCount} imagen(es) subida(s) exitosamente. ${failCount} imagen(es) fallaron`);
        } else {
          showSuccess(`${successCount} imagen(es) subida(s) exitosamente`);
        }
      } else {
        showError('Error al subir las imágenes');
      }
      
    } catch (error) {
      console.error('Error uploading images:', error);
      showError('Error al subir las imágenes');
      throw error;
    }
  };

  const handleTallerImagesUploaded = async (newImages) => {
    try {
      const uploadPromises = newImages.map(async (img) => {
        const metadata = {
          descripcion: img.description || img.descripcion || '',
          categoria: img.category || img.categoria || '',
          nombre: img.name || img.nombre || ''
        };
        
        const result = await subirImagenTaller(projectId, img.file, metadata);
        return result;
      });

      const results = await Promise.all(uploadPromises);
      
      const successCount = results.filter(r => r.success).length;
      const failCount = results.filter(r => !r.success).length;

      if (successCount > 0) {
        // Recargar imágenes de taller después de subir
        await listarImagenesTaller(projectId);
        
        // Switch to taller view after upload
        setActiveTab('taller');
        
        if (failCount > 0) {
          showWarning(`${successCount} imagen(es) de taller subida(s) exitosamente. ${failCount} imagen(es) fallaron`);
        } else {
          showSuccess(`${successCount} imagen(es) de taller subida(s) exitosamente`);
        }
      } else {
        showError('Error al subir las imágenes de taller');
      }
      
    } catch (error) {
      console.error('Error uploading taller images:', error);
      showError('Error al subir las imágenes de taller');
      throw error;
    }
  };

  const handleDeleteImage = async (imageId) => {
    try {
      const result = await eliminarImagen(projectId, imageId);
      
      if (result.success) {
        // Recargar imágenes después de eliminar
        await listarImagenes(projectId);
        return result;
      } else {
        throw new Error(result.message || 'Error al eliminar la imagen');
      }
      
    } catch (error) {
      console.error('Error deleting image:', error);
      throw error;
    }
  };

  const handleUpdateImage = async (imageId, updates) => {
    try {
      const result = await actualizarImagen(projectId, imageId, updates);
      
      if (result.success) {
        // Recargar imágenes para obtener datos actualizados del servidor
        await listarImagenes(projectId);
        return result;
      } else {
        throw new Error(result.message || 'Error al actualizar la imagen');
      }
      
    } catch (error) {
      console.error('Error updating image:', error);
      throw error;
    }
  };

  const tabs = [
    { id: 'gallery', label: 'Galería de Imágenes', icon: 'Image', count: imagenes?.length },
    { id: 'taller', label: 'Imágenes de Taller', icon: 'Wrench', count: imagenesTaller?.length },
    { id: 'upload', label: 'Subir Imágenes', icon: 'Upload' },
    { id: 'project', label: 'Info del Proyecto', icon: 'Info' }
  ];

  const breadcrumbItems = [
    { label: 'Gestión de Proyectos', path: '/project-management' },
    { label: project?.nombre || project?.name || 'Cargando...', path: '#' },
    { label: 'Galería', path: '#' }
  ];

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex">
        <Sidebar isCollapsed={sidebarCollapsed} onToggle={() => setSidebarCollapsed(!sidebarCollapsed)} />
        <div className={`flex-1 transition-all duration-300 ${sidebarCollapsed ? 'lg:ml-16' : 'lg:ml-60'}`}>
          <Header onMenuToggle={() => setHeaderMenuOpen(!headerMenuOpen)} isMenuOpen={headerMenuOpen} />
          <div className="flex items-center justify-center h-96">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
              <p className="text-muted-foreground">Cargando proyecto...</p>
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
        <Header onMenuToggle={() => setHeaderMenuOpen(!headerMenuOpen)} isMenuOpen={headerMenuOpen} />
        
        <div className="">
          <div className="container mx-auto px-4 py-8">
            {/* Breadcrumb */}
            <Breadcrumb items={breadcrumbItems} />
            
            {/* Header */}
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between mb-8">
              <div>
                <div className="flex items-center space-x-3 mb-2">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => navigate('/proyectos')}
                  >
                    <Icon name="ArrowLeft" size={20} />
                  </Button>
                  <h1 className="text-3xl font-bold text-foreground">
                    {project?.nombre || project?.name || 'Proyecto'}
                  </h1>
                </div>
                <p className="text-muted-foreground">
                  Documentación visual y gestión de imágenes del proyecto
                </p>
              </div>
              
              <div className="flex items-center space-x-4 mt-4 lg:mt-0">
                <div className="text-sm text-muted-foreground">
                  {activeTab === 'taller' ? (
                    <>{imagenesTaller?.length} imagen{imagenesTaller?.length !== 1 ? 'es' : ''} de taller</>
                  ) : (
                    <>{imagenes?.length} imagen{imagenes?.length !== 1 ? 'es' : ''}</>
                  )}
                </div>
                {activeTab === 'taller' ? (
                  <Button
                    onClick={() => setActiveTab('upload-taller')}
                    iconName="Plus"
                    iconPosition="left"
                    disabled={tallerLoading}
                  >
                    {tallerLoading ? 'Cargando...' : 'Agregar Imágenes de Taller'}
                  </Button>
                ) : (
                  <Button
                    onClick={() => setActiveTab('upload')}
                    iconName="Plus"
                    iconPosition="left"
                    disabled={imagenesLoading}
                  >
                    {imagenesLoading ? 'Cargando...' : 'Agregar Imágenes'}
                  </Button>
                )}
              </div>
            </div>

            {/* Tabs */}
            <div className="border-b border-border mb-8">
              <div className="flex space-x-8">
                {tabs?.map((tab) => (
                  <button
                    key={tab?.id}
                    onClick={() => setActiveTab(tab?.id)}
                    className={`flex items-center space-x-2 pb-4 border-b-2 transition-colors ${
                      activeTab === tab?.id
                        ? 'border-primary text-primary' :'border-transparent text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    <Icon name={tab?.icon} size={18} />
                    <span className="font-medium">{tab?.label}</span>
                    {tab?.count !== undefined && (
                      <span className="bg-muted px-2 py-1 rounded-full text-xs">
                        {tab?.count}
                      </span>
                    )}
                  </button>
                ))}
              </div>
            </div>

            {/* Tab Content */}
            <div className="space-y-8">
              {activeTab === 'gallery' && (
                <ImageGallery
                  images={imagenes}
                  projectId={projectId}
                  projectInfo={project}
                  onDeleteImage={handleDeleteImage}
                  onUpdateImage={handleUpdateImage}
                  onDownloadImage={descargarImagen}
                  obtenerImagenUrl={obtenerImagenUrl}
                />
              )}

              {activeTab === 'taller' && (
                <>
                  <ImageGallery
                    images={imagenesTaller}
                    projectId={projectId}
                    projectInfo={project}
                    onDeleteImage={async (imagenId) => {
                      try {
                        await eliminarImagenTaller(projectId, imagenId);
                        await listarImagenesTaller(projectId);
                        showSuccess('Imagen de taller eliminada');
                      } catch (error) {
                        showError('Error al eliminar imagen');
                      }
                    }}
                    onUpdateImage={async (imagenId, metadata) => {
                      try {
                        await actualizarImagenTaller(projectId, imagenId, metadata);
                        await listarImagenesTaller(projectId);
                        showSuccess('Imagen de taller actualizada');
                      } catch (error) {
                        showError('Error al actualizar imagen');
                      }
                    }}
                    onDownloadImage={descargarImagenTaller}
                    obtenerImagenUrl={obtenerImagenUrlTaller}
                    emptyMessage="No hay imágenes de taller para este proyecto"
                    emptyIcon="Wrench"
                    galleryType="taller"
                  />
                </>
              )}

              {activeTab === 'upload' && (
                <ImageUploadPanel
                  projectId={projectId}
                  onImagesUploaded={handleImagesUploaded}
                  isUploading={imagenesLoading}
                  uploadType="proyecto"
                />
              )}

              {activeTab === 'upload-taller' && (
                <ImageUploadPanel
                  projectId={projectId}
                  onImagesUploaded={handleTallerImagesUploaded}
                  isUploading={tallerLoading}
                  uploadType="taller"
                />
              )}

              {activeTab === 'project' && (
                <ProjectInfoPanel project={project} clientInfo={clientInfo} />
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProjectDetailGallery;