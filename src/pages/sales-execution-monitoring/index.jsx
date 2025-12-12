import React, { useState, useEffect } from 'react';
import Icon from '../../components/AppIcon';
import Button from '../../components/ui/Button';
import Sidebar from '../../components/ui/Sidebar';
import Header from '../../components/ui/Header';
import Breadcrumb from '../../components/ui/Breadcrumb';

import StartupTrackingPanel from './components/StartupTrackingPanel';
import ExecutionProgressPanel from './components/ExecutionProgressPanel';
import ClientCommunicationPanel from './components/ClientCommunicationPanel';
import ChangeRequestPanel from './components/ChangeRequestPanel';
import DeliveryManagementPanel from './components/DeliveryManagementPanel';
import TraceabilityPanel from './components/TraceabilityPanel';

const SalesExecutionMonitoring = () => {
  const [projects, setProjects] = useState([]);
  const [selectedProject, setSelectedProject] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showControls, setShowControls] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [headerMenuOpen, setHeaderMenuOpen] = useState(false);
  const [activePanel, setActivePanel] = useState('execution');

  // Execution phases following the Spanish workflow diagram (steps 17-32)
  const executionPhases = [
    {
      id: 'work-order-generated',
      name: 'Orden Generada',
      description: 'WorkOrder interno generado con alcances finales',
      color: 'bg-blue-600',
      icon: 'FileText',
      step: 17
    },
    {
      id: 'startup-tracking',
      name: 'Seguimiento de Arranque',
      description: 'Confirmar fechas y responsable en campo',
      color: 'bg-indigo-600',
      icon: 'PlayCircle',
      step: 19
    },
    {
      id: 'execution-monitoring',
      name: 'Monitoreo de Ejecución',
      description: 'Punto de contacto del cliente durante la obra',
      color: 'bg-purple-600',
      icon: 'Activity',
      step: 20
    },
    {
      id: 'delivery-coordination',
      name: 'Coordinación de Entrega',
      description: 'Entrega final y gestión de conformidad',
      color: 'bg-orange-600',
      icon: 'Truck',
      step: 27
    },
    {
      id: 'billing-process',
      name: 'Proceso de Facturación',
      description: 'Facturación y generación de recibo',
      color: 'bg-green-600',
      icon: 'Receipt',
      step: 32
    }
  ];

  // Mock execution projects data following the workflow
  const mockProjects = [
    {
      id: "EXEC-001",
      workOrderRef: "WO-2024-UDG-001",
      clientName: "Urban Development Group",
      projectType: "construction",
      salesRep: "Alejandro Torres",
      phase: "startup-tracking",
      priority: "high",
      contractValue: 3750000,
      startDate: "2024-04-15",
      estimatedEndDate: "2024-08-30",
      clientContact: {
        name: "Arq. Sofia Ramírez",
        phone: "+52 55 6789 0123",
        email: "desarrollo@urbandevelopment.mx"
      },
      projectDetails: {
        description: "Sistema HVAC para centro comercial",
        location: "Tijuana, Baja California",
        scope: "Instalación completa de climatización con controles inteligentes"
      },
      fieldSupervisor: {
        name: "Ing. Roberto Campos",
        phone: "+52 55 1111 2222",
        email: "roberto.campos@aireflowpro.com"
      },
      startup: {
        confirmedDate: "2024-04-15",
        status: "confirmed",
        preWorkMeeting: "2024-04-12",
        accessPermits: true,
        safetyBriefing: true
      },
      milestones: [
        {
          id: "milestone-1",
          name: "Equipos principales instalados",
          targetDate: "2024-05-15",
          status: "pending",
          progress: 0
        },
        {
          id: "milestone-2",
          name: "Ductos y conexiones completadas",
          targetDate: "2024-06-30",
          status: "pending",
          progress: 0
        },
        {
          id: "milestone-3",
          name: "Pruebas y puesta en marcha",
          targetDate: "2024-07-15",
          status: "pending",
          progress: 0
        },
        {
          id: "milestone-4",
          name: "Entrega final y documentación",
          targetDate: "2024-08-30",
          status: "pending",
          progress: 0
        }
      ],
      communications: [
        {
          id: "comm-exec-1",
          type: "email",
          date: "2024-03-30",
          content: "Confirmación de inicio de obra para el 15 de abril",
          participants: ["Arq. Sofia Ramírez", "Ing. Roberto Campos"],
          urgency: "normal"
        }
      ],
      changeRequests: [],
      traceability: {
        agreements: [],
        evidence: [],
        communications: []
      }
    },
    {
      id: "EXEC-002",
      workOrderRef: "WO-2024-ABC-002",
      clientName: "Corporación ABC",
      projectType: "construction",
      salesRep: "María García",
      phase: "execution-monitoring",
      priority: "urgent",
      contractValue: 2500000,
      startDate: "2024-03-20",
      estimatedEndDate: "2024-06-20",
      clientContact: {
        name: "Ing. Carlos Rodriguez",
        phone: "+52 55 1234 5678",
        email: "contacto@corporacionabc.com"
      },
      projectDetails: {
        description: "Instalación de sistema HVAC para edificio corporativo",
        location: "Ciudad de México",
        scope: "Sistema completo de climatización para 12 pisos"
      },
      fieldSupervisor: {
        name: "Ing. Ana Martínez",
        phone: "+52 55 3333 4444",
        email: "ana.martinez@aireflowpro.com"
      },
      startup: {
        confirmedDate: "2024-03-20",
        status: "completed",
        actualStartDate: "2024-03-20"
      },
      progress: {
        overallProgress: 65,
        currentPhase: "Instalación de ductos - Pisos 7-12",
        nextMilestone: "Instalación equipos principales",
        daysRemaining: 45
      },
      milestones: [
        {
          id: "milestone-1",
          name: "Preparación y permisos",
          targetDate: "2024-03-25",
          status: "completed",
          progress: 100,
          completedDate: "2024-03-24"
        },
        {
          id: "milestone-2",
          name: "Instalación pisos 1-6",
          targetDate: "2024-04-30",
          status: "completed",
          progress: 100,
          completedDate: "2024-04-28"
        },
        {
          id: "milestone-3",
          name: "Instalación pisos 7-12",
          targetDate: "2024-05-30",
          status: "in_progress",
          progress: 75
        },
        {
          id: "milestone-4",
          name: "Pruebas y entrega",
          targetDate: "2024-06-20",
          status: "pending",
          progress: 0
        }
      ],
      communications: [
        {
          id: "comm-exec-2",
          type: "whatsapp",
          date: "2024-04-28",
          content: "Cliente reporta satisfacción con progreso. Solicita actualización semanal",
          participants: ["Ing. Carlos Rodriguez"],
          urgency: "normal"
        },
        {
          id: "comm-exec-3",
          type: "email",
          date: "2024-04-25",
          content: "Envío de fotos de progreso y actualización de cronograma",
          participants: ["Ing. Carlos Rodriguez", "María García"],
          urgency: "normal"
        }
      ],
      changeRequests: [
        {
          id: "change-1",
          description: "Agregar control individual por piso en lugar de control centralizado",
          requestDate: "2024-04-20",
          status: "approved",
          commercialImpact: {
            cost: 180000,
            timeImpact: "2 semanas adicionales"
          },
          approvalDate: "2024-04-22",
          implementation: "in_progress"
        }
      ],
      traceability: {
        agreements: [
          "Cambio aprobado por email el 2024-04-22",
          "Confirmación de costo adicional firmado"
        ],
        evidence: [
          "Fotos de progreso pisos 1-6 completos",
          "Certificado de calidad de materiales"
        ],
        communications: [
          "Reunión semanal de seguimiento establecida",
          "Canal WhatsApp para comunicación urgente"
        ]
      }
    },
    {
      id: "EXEC-003",
      workOrderRef: "WO-2024-TEC-003",
      clientName: "Tech Solutions SA",
      projectType: "pieces",
      salesRep: "Patricia Morales",
      phase: "delivery-coordination",
      priority: "medium",
      contractValue: 1950000,
      startDate: "2024-02-15",
      estimatedEndDate: "2024-04-30",
      clientContact: {
        name: "Lic. Miguel Hernández",
        phone: "+52 55 2345 6789",
        email: "infraestructura@techsolutions.com"
      },
      projectDetails: {
        description: "Modernización de sistema de climatización para oficinas",
        location: "Puebla, Puebla",
        scope: "Reemplazo de equipos obsoletos y optimización energética"
      },
      fieldSupervisor: {
        name: "Ing. Carlos Vega",
        phone: "+52 55 5555 6666",
        email: "carlos.vega@aireflowpro.com"
      },
      progress: {
        overallProgress: 95,
        currentPhase: "Pruebas finales y documentación",
        nextMilestone: "Entrega final",
        daysRemaining: 5
      },
      delivery: {
        type: "pieces",
        scheduledDate: "2024-04-30",
        status: "scheduled",
        deliverables: [
          "Equipos HVAC instalados y operando",
          "Manual de operación y mantenimiento",
          "Certificados de calidad",
          "Garantías de equipos y mano de obra"
        ],
        clientAcceptance: {
          status: "pending",
          checklist: [
            { item: "Funcionamiento de todos los equipos", checked: true },
            { item: "Temperaturas según especificaciones", checked: true },
            { item: "Documentación técnica completa", checked: false },
            { item: "Capacitación al personal", checked: false }
          ]
        }
      },
      milestones: [
        {
          id: "milestone-1",
          name: "Desmontaje equipos obsoletos",
          status: "completed",
          progress: 100,
          completedDate: "2024-03-05"
        },
        {
          id: "milestone-2",
          name: "Instalación nuevos equipos",
          status: "completed",
          progress: 100,
          completedDate: "2024-04-10"
        },
        {
          id: "milestone-3",
          name: "Pruebas y optimización",
          status: "completed",
          progress: 100,
          completedDate: "2024-04-25"
        },
        {
          id: "milestone-4",
          name: "Documentación y entrega",
          status: "in_progress",
          progress: 80
        }
      ],
      communications: [
        {
          id: "comm-exec-4",
          type: "email",
          date: "2024-04-26",
          content: "Confirmación de fecha de entrega final para el 30 de abril",
          participants: ["Lic. Miguel Hernández"],
          urgency: "normal"
        }
      ],
      traceability: {
        agreements: [
          "Cronograma de entrega confirmado por cliente",
          "Especificaciones técnicas validadas"
        ],
        evidence: [
          "Fotos de instalación completada",
          "Pruebas de rendimiento energético",
          "Certificados de equipos"
        ]
      }
    },
    {
      id: "EXEC-004",
      workOrderRef: "WO-2024-GRN-004",
      clientName: "Green Energy México",
      projectType: "construction",
      salesRep: "Carmen Díaz",
      phase: "billing-process",
      priority: "low",
      contractValue: 4200000,
      startDate: "2024-01-15",
      estimatedEndDate: "2024-03-31",
      clientContact: {
        name: "Ing. Fernando López",
        phone: "+52 55 4567 8901",
        email: "ventas@greenenergy.mx"
      },
      projectDetails: {
        description: "Sistema HVAC para complejo residencial sustentable",
        location: "Monterrey, Nuevo León",
        scope: "Instalación completa con controles inteligentes y eficiencia energética"
      },
      progress: {
        overallProgress: 100,
        currentPhase: "Proyecto completado",
        status: "completed",
        completedDate: "2024-03-28"
      },
      delivery: {
        type: "construction",
        status: "accepted",
        acceptanceDate: "2024-03-30",
        clientFeedback: "Excelente calidad y cumplimiento de cronograma"
      },
      billing: {
        status: "in_progress",
        invoiceGenerated: true,
        invoiceNumber: "FACT-2024-0089",
        invoiceDate: "2024-04-01",
        amount: 4200000,
        paymentTerms: "30 días",
        billingData: {
          businessName: "Green Energy México S.A. de C.V.",
          rfc: "GEM123456789",
          address: "Av. Constitución 2500, Monterrey, NL"
        }
      },
      traceability: {
        agreements: [
          "Acta de entrega-recepción firmada",
          "Conformidad del cliente documentada",
          "Garantías entregadas y explicadas"
        ],
        evidence: [
          "Fotos de instalación final",
          "Certificados de pruebas de funcionamiento",
          "Manual de usuario entregado"
        ]
      }
    }
  ];

  useEffect(() => {
    const loadProjects = async () => {
      setIsLoading(true);
      await new Promise(resolve => setTimeout(resolve, 1000));
      setProjects(mockProjects);
      setIsLoading(false);
    };

    loadProjects();
  }, []);

  const handleProjectSelect = (project) => {
    setSelectedProject(project);
    setShowControls(true);
  };

  const handlePhaseTransition = (projectId, newPhase) => {
    setProjects(prev => prev?.map(proj =>
      proj?.id === projectId
        ? { ...proj, phase: newPhase }
        : proj
    ));
  };

  const handleStartupConfirmation = (projectId, startupData) => {
    setProjects(prev => prev?.map(proj =>
      proj?.id === projectId
        ? { ...proj, startup: { ...proj?.startup, ...startupData } }
        : proj
    ));
  };

  const handleProgressUpdate = (projectId, progressData) => {
    setProjects(prev => prev?.map(proj =>
      proj?.id === projectId
        ? { ...proj, progress: { ...proj?.progress, ...progressData } }
        : proj
    ));
  };

  const handleCommunicationAdd = (projectId, communication) => {
    setProjects(prev => prev?.map(proj =>
      proj?.id === projectId
        ? {
          ...proj,
          communications: [...(proj?.communications || []), communication]
        }
        : proj
    ));
  };

  const handleChangeRequest = (projectId, changeRequest) => {
    setProjects(prev => prev?.map(proj =>
      proj?.id === projectId
        ? {
          ...proj,
          changeRequests: [...(proj?.changeRequests || []), changeRequest]
        }
        : proj
    ));
  };

  const handleDeliveryUpdate = (projectId, deliveryData) => {
    setProjects(prev => prev?.map(proj =>
      proj?.id === projectId
        ? { ...proj, delivery: { ...proj?.delivery, ...deliveryData } }
        : proj
    ));
  };

  const getProjectsByPhase = (phaseId) => {
    return projects?.filter(proj => proj?.phase === phaseId) || [];
  };

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'urgent': return 'border-l-red-600 bg-red-50';
      case 'high': return 'border-l-orange-500 bg-orange-50';
      case 'medium': return 'border-l-yellow-500 bg-yellow-50';
      case 'low': return 'border-l-green-500 bg-green-50';
      default: return 'border-l-gray-400 bg-gray-50';
    }
  };

  const getProgressColor = (progress) => {
    if (progress >= 90) return 'text-green-600 bg-green-100';
    if (progress >= 70) return 'text-blue-600 bg-blue-100';
    if (progress >= 50) return 'text-yellow-600 bg-yellow-100';
    return 'text-red-600 bg-red-100';
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
              <p className="text-muted-foreground">Cargando proyectos en ejecución...</p>
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

            {/* Header */}
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between mb-8">
              <div>
                <h1 className="text-3xl font-bold text-foreground mb-2">Monitoreo de Ejecución de Ventas</h1>
                <p className="text-muted-foreground">
                  Supervisión integral de proyectos desde WorkOrder hasta facturación final
                </p>
              </div>

              <div className="flex items-center space-x-4 mt-4 lg:mt-0">
                <Button
                  variant="outline"
                  iconName="RefreshCw"
                  iconPosition="left"
                  onClick={() => window.location?.reload()}
                >
                  Actualizar
                </Button>
                <Button
                  iconName="BarChart3"
                  iconPosition="left"
                  onClick={() => setActivePanel('dashboard')}
                >
                  Dashboard
                </Button>
              </div>
            </div>

            <div className="flex gap-6">
              {/* Main Execution Board */}
              <div className="flex-1">
                <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 mb-8">
                  {executionPhases?.map((phase) => (
                    <div key={phase?.id} className="bg-card rounded-lg shadow-sm border">
                      <div className={`p-4 ${phase?.color} text-white rounded-t-lg`}>
                        <div className="flex items-center space-x-2">
                          <Icon name={phase?.icon} size={20} />
                          <h3 className="font-semibold text-sm">{phase?.name}</h3>
                        </div>
                        <p className="text-xs mt-1 opacity-90">{phase?.description}</p>
                        <div className="text-xs mt-2 bg-white/20 rounded px-2 py-1 inline-block">
                          {getProjectsByPhase(phase?.id)?.length} proyectos
                        </div>
                        <div className="text-xs mt-1 opacity-75">
                          Paso {phase?.step}
                        </div>
                      </div>

                      <div className="p-4 space-y-3 min-h-[500px]">
                        {getProjectsByPhase(phase?.id)?.map((project) => (
                          <div
                            key={project?.id}
                            onClick={() => handleProjectSelect(project)}
                            className={`p-3 rounded-lg border-l-4 cursor-pointer hover:shadow-md transition-all ${getPriorityColor(project?.priority)}`}
                          >
                            <div className="flex items-start justify-between mb-2">
                              <h4 className="font-medium text-sm text-foreground line-clamp-2">
                                {project?.clientName}
                              </h4>
                              <span className={`text-xs px-2 py-1 rounded-full ${project?.priority === 'urgent' ? 'bg-red-100 text-red-800' :
                                  project?.priority === 'high' ? 'bg-orange-100 text-orange-800' :
                                    project?.priority === 'medium' ? 'bg-yellow-100 text-yellow-800' : 'bg-green-100 text-green-800'
                                }`}>
                                {project?.priority === 'urgent' ? 'Urgente' :
                                  project?.priority === 'high' ? 'Alta' :
                                    project?.priority === 'medium' ? 'Media' : 'Baja'}
                              </span>
                            </div>

                            <div className="flex items-center space-x-2 mb-2">
                              <Icon name="FileText" size={12} className="text-muted-foreground" />
                              <span className="text-xs text-muted-foreground">{project?.workOrderRef}</span>
                            </div>

                            <div className="flex items-center space-x-2 mb-2">
                              <Icon name="User" size={12} className="text-muted-foreground" />
                              <span className="text-xs text-muted-foreground">{project?.salesRep}</span>
                            </div>

                            {project?.progress?.overallProgress && (
                              <div className="mb-2">
                                <div className="flex items-center justify-between mb-1">
                                  <span className="text-xs text-muted-foreground">Progreso</span>
                                  <span className={`text-xs px-2 py-1 rounded ${getProgressColor(project?.progress?.overallProgress)}`}>
                                    {project?.progress?.overallProgress}%
                                  </span>
                                </div>
                                <div className="w-full bg-gray-200 rounded-full h-2">
                                  <div
                                    className="bg-blue-600 h-2 rounded-full transition-all"
                                    style={{ width: `${project?.progress?.overallProgress}%` }}
                                  ></div>
                                </div>
                              </div>
                            )}

                            <div className="flex items-center justify-between">
                              <div className="text-xs font-medium text-foreground">
                                ${project?.contractValue?.toLocaleString()}
                              </div>
                              <div className="flex items-center space-x-1">
                                <Icon
                                  name={project?.projectType === 'construction' ? 'Building' : 'Package'}
                                  size={12}
                                  className="text-muted-foreground"
                                />
                                <span className="text-xs text-muted-foreground capitalize">
                                  {project?.projectType === 'construction' ? 'Obra' : 'Piezas'}
                                </span>
                              </div>
                            </div>

                            {project?.fieldSupervisor && (
                              <div className="flex items-center space-x-1 mt-2">
                                <Icon name="HardHat" size={12} className="text-blue-600" />
                                <span className="text-xs text-blue-600">{project?.fieldSupervisor?.name}</span>
                              </div>
                            )}

                            {project?.changeRequests?.length > 0 && (
                              <div className="flex items-center space-x-1 mt-2">
                                <Icon name="AlertTriangle" size={12} className="text-orange-600" />
                                <span className="text-xs text-orange-600">
                                  {project?.changeRequests?.length} cambio(s)
                                </span>
                              </div>
                            )}
                          </div>
                        ))}

                        {getProjectsByPhase(phase?.id)?.length === 0 && (
                          <div className="text-center py-8">
                            <Icon name="Inbox" size={32} className="text-muted-foreground mx-auto mb-2" />
                            <p className="text-sm text-muted-foreground">Sin proyectos</p>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Controls Panel */}
              {showControls && selectedProject && (
                <div className="w-96 bg-card rounded-lg shadow-lg border h-fit">
                  <div className="p-4 border-b">
                    <div className="flex items-center justify-between">
                      <h3 className="font-semibold">Control de Ejecución</h3>
                      <Button
                        variant="ghost"
                        size="sm"
                        iconName="X"
                        onClick={() => setShowControls(false)}
                      />
                    </div>
                  </div>

                  {/* Panel Tabs */}
                  <div className="border-b">
                    <div className="flex">
                      {[
                        { id: 'execution', label: 'Ejecución', icon: 'Activity' },
                        { id: 'communication', label: 'Comunicación', icon: 'MessageCircle' },
                        { id: 'changes', label: 'Cambios', icon: 'Edit' },
                        { id: 'delivery', label: 'Entrega', icon: 'Truck' },
                        { id: 'traceability', label: 'Trazabilidad', icon: 'Search' }
                      ]?.map((tab) => (
                        <button
                          key={tab?.id}
                          onClick={() => setActivePanel(tab?.id)}
                          className={`flex-1 px-3 py-2 text-xs border-b-2 flex items-center justify-center space-x-1 ${activePanel === tab?.id
                              ? 'border-blue-600 text-blue-600 bg-blue-50' : 'border-transparent text-muted-foreground hover:text-foreground'
                            }`}
                        >
                          <Icon name={tab?.icon} size={14} />
                          <span className="hidden sm:block">{tab?.label}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="p-4 space-y-6">
                    {/* Project Info */}
                    <div className="space-y-2">
                      <h4 className="font-medium">{selectedProject?.clientName}</h4>
                      <p className="text-sm text-muted-foreground">{selectedProject?.workOrderRef}</p>
                      <div className="flex items-center space-x-4 text-xs text-muted-foreground">
                        <span>${selectedProject?.contractValue?.toLocaleString()}</span>
                        <span>{selectedProject?.projectDetails?.location}</span>
                      </div>
                    </div>

                    {/* Dynamic Panel Content */}
                    {activePanel === 'execution' && selectedProject?.phase === 'startup-tracking' && (
                      <StartupTrackingPanel
                        project={selectedProject}
                        onConfirm={(startupData) => handleStartupConfirmation(selectedProject?.id, startupData)}
                      />
                    )}

                    {activePanel === 'execution' && selectedProject?.phase === 'execution-monitoring' && (
                      <ExecutionProgressPanel
                        project={selectedProject}
                        onUpdate={(progressData) => handleProgressUpdate(selectedProject?.id, progressData)}
                      />
                    )}

                    {activePanel === 'communication' && (
                      <ClientCommunicationPanel
                        project={selectedProject}
                        onAddCommunication={(communication) => handleCommunicationAdd(selectedProject?.id, communication)}
                      />
                    )}

                    {activePanel === 'changes' && (
                      <ChangeRequestPanel
                        project={selectedProject}
                        onRequestChange={(changeRequest) => handleChangeRequest(selectedProject?.id, changeRequest)}
                      />
                    )}

                    {activePanel === 'delivery' && (selectedProject?.phase === 'delivery-coordination' || selectedProject?.delivery) && (
                      <DeliveryManagementPanel
                        project={selectedProject}
                        onUpdate={(deliveryData) => handleDeliveryUpdate(selectedProject?.id, deliveryData)}
                      />
                    )}

                    {activePanel === 'traceability' && (
                      <TraceabilityPanel
                        project={selectedProject}
                      // console.log eliminado
                      />
                    )}

                    {/* Phase Transition Controls */}
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Avanzar Fase</label>
                      <div className="grid grid-cols-1 gap-2">
                        {executionPhases?.map((phase) => (
                          <Button
                            key={phase?.id}
                            variant={selectedProject?.phase === phase?.id ? "default" : "outline"}
                            size="sm"
                            onClick={() => handlePhaseTransition(selectedProject?.id, phase?.id)}
                            disabled={selectedProject?.phase === phase?.id}
                            className="text-xs justify-start"
                          >
                            <Icon name={phase?.icon} size={14} className="mr-2" />
                            {phase?.name}
                          </Button>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SalesExecutionMonitoring;