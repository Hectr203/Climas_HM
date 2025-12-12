// SalesOpportunityManagement.jsx
import React, { useState, useEffect, useMemo } from 'react';
import Icon from '../../components/AppIcon';
import Button from '../../components/ui/Button';
import Sidebar from '../../components/ui/Sidebar';
import Header from '../../components/ui/Header';
import Breadcrumb from '../../components/ui/Breadcrumb';
import ClientRegistrationPanel from './components/ClientRegistrationPanel';
import CommunicationPanel from './components/CommunicationPanel';
import QuotationRequestPanel from './components/QuotationRequestPanel';
import WorkOrderPanel from './components/WorkOrderPanel';
import ChangeManagementPanel from './components/ChangeManagementPanel';
import NewOpportunityModal from './components/NewOpportunityModal';
import { useOpportunity } from '../../hooks/useOpportunity';
import { useNotifications } from '../../context/NotificationContext';


const SalesOpportunityManagement = () => {
  const { oportunidades, loading, error, crearOportunidad, fetchOportunidades, actualizarOportunidad } = useOpportunity();
  const { showOperationSuccess } = useNotifications();
  // Estado local de oportunidades para el mock y handlers
  const [opportunities, setOpportunities] = useState([]);
  const [selectedOpportunity, setSelectedOpportunity] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showControls, setShowControls] = useState(false);
  const [showNewOpportunityModal, setShowNewOpportunityModal] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [headerMenuOpen, setHeaderMenuOpen] = useState(false);

  // Verificar si viene de crear cotización
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('cotizacionCreada') === 'true') {
      showOperationSuccess('Cotización creada exitosamente. La oportunidad permanece en Desarrollo de Cotización.');
      // Limpiar el parámetro de la URL
      window.history.replaceState({}, '', '/oportunidades');
      // Recargar oportunidades para ver los datos actualizados
      fetchOportunidades();
    }
  }, []);

  // Etapas del flujo de ventas
  const salesStages = useMemo(() => [
    {
      id: 'initial-contact',
      name: 'Contacto Inicial',
      description: 'Recepción de solicitud (WhatsApp/Correo)',
      color: 'bg-blue-500',
      icon: 'MessageCircle'
    },
    {
      id: 'information-validation',
      name: 'Validación de Información',
      description: 'Clasificación y validación de información mínima',
      color: 'bg-indigo-500',
      icon: 'CheckSquare'
    },
    {
      id: 'quotation-development',
      name: 'Desarrollo de Cotización',
      description: 'Preparar cotización con alcances, supuestos y tiempos',
      color: 'bg-purple-500',
      icon: 'FileText'
    },
    {
      id: 'client-review',
      name: 'Revisión del Cliente',
      description: 'Envío de cotización y seguimiento de aprobación',
      color: 'bg-yellow-500',
      icon: 'Eye'
    },
    {
      id: 'closure',
      name: 'Cierre',
      description: 'Aprobación final o cierre de oportunidad',
      color: 'bg-green-500',
      icon: 'CheckCircle2'
    }
  ], []);

  // Mock inicial (puedes reemplazar por fetch real)
  const mockOpportunities = useMemo(() => ([
    {
      id: "SALES-001",
      clientName: "Corporación ABC",
      contactChannel: "whatsapp",
      projectType: "project",
      salesRep: "María García",
      stage: "initial-contact",
      priority: "high",
      stageDuration: 2,
      contactInfo: {
        phone: "+52 55 1234 5678",
        email: "contacto@corporacionabc.com",
        contactPerson: "Ing. Carlos Rodriguez"
      },
      projectDetails: {
        description: "Instalación de sistema HVAC para edificio corporativo",
        location: "Ciudad de México",
        estimatedBudget: 2500000,
        timeline: "3 meses"
      },
      documents: [],
      communications: [
        {
          id: "comm-1",
          type: "whatsapp",
          date: "2024-03-28",
          content: "Cliente solicita cotización para sistema HVAC",
          urgency: "normal"
        }
      ],
      notes: "Cliente contactó por WhatsApp. Requiere instalación completa."
    },
    {
      id: "SALES-002",
      clientName: "Industrias XYZ",
      contactChannel: "email",
      projectType: "piece",
      salesRep: "Roberto Silva",
      stage: "information-validation",
      priority: "medium",
      stageDuration: 5,
      contactInfo: {
        phone: "+52 55 9876 5432",
        email: "proyectos@industriasxyz.com",
        contactPerson: "Arq. Ana Martinez"
      },
      projectDetails: {
        description: "Mantenimiento y actualización de sistema existente",
        location: "Guadalajara, Jalisco",
        estimatedBudget: 850000,
        timeline: "6 semanas"
      },
      requirements: {
        complete: false,
        checklist: {
          technicalSpecs: true,
          locationAccess: false,
          budgetRange: true,
          timeline: true,
          permits: false
        }
      },
      communications: [
        {
          id: "comm-2",
          type: "email",
          date: "2024-03-25",
          content: "Enviamos formulario de requerimientos técnicos",
          urgency: "normal"
        }
      ],
      notes: "Pendiente confirmación de acceso y permisos"
    },
    {
      id: "SALES-003",
      clientName: "Green Energy México",
      contactChannel: "whatsapp",
      projectType: "project",
      salesRep: "Carmen Díaz",
      stage: "quotation-development",
      priority: "urgent",
      stageDuration: 8,
      contactInfo: {
        phone: "+52 55 4567 8901",
        email: "ventas@greenenergy.mx",
        contactPerson: "Ing. Fernando López"
      },
      projectDetails: {
        description: "Sistema HVAC para complejo residencial sustentable",
        location: "Monterrey, Nuevo León",
        estimatedBudget: 4200000,
        timeline: "4 meses"
      },
      requirements: {
        complete: true,
        checklist: {
          technicalSpecs: true,
          locationAccess: true,
          budgetRange: true,
          timeline: true,
          permits: true
        }
      },
      quotationData: {
        scope: "Instalación completa de sistema HVAC con controles inteligentes",
        assumptions: [
          "Acceso libre a todas las áreas durante horario laboral",
          "Cliente proporciona conexiones eléctricas principales"
        ],
        timeline: "16 semanas",
        conditions: "50% anticipo, 50% contra entrega",
        materials: ["Unidades condensadoras", "Ductos", "Controles"],
        riskAssessment: "Medio - proyecto en construcción",
        extraCosts: []
      },
      communications: [
        {
          id: "comm-3",
          type: "whatsapp",
          date: "2024-03-20",
          content: "Cliente solicita ajustes en cronograma",
          urgency: "urgent"
        }
      ],
      notes: "Cotización en desarrollo. Cliente muy interesado."
    },
    {
      id: "SALES-004",
      clientName: "Tech Solutions SA",
      contactChannel: "email",
      projectType: "project",
      salesRep: "Patricia Morales",
      stage: "client-review",
      priority: "high",
      stageDuration: 12,
      contactInfo: {
        phone: "+52 55 2345 6789",
        email: "infraestructura@techsolutions.com",
        contactPerson: "Lic. Miguel Hernández"
      },
      projectDetails: {
        description: "Modernización de sistema de climatización para oficinas",
        location: "Puebla, Puebla",
        estimatedBudget: 1800000,
        timeline: "10 semanas"
      },
      quotationData: {
        scope: "Reemplazo de equipos obsoletos y optimización energética",
        assumptions: [
          "Trabajo nocturno y fines de semana",
          "Coordinación con otros contratistas"
        ],
        timeline: "10 semanas",
        conditions: "30% anticipo, 40% avance 50%, 30% finalización",
        totalAmount: 1950000,
        validity: "30 días"
      },
      quotationStatus: {
        sent: true,
        sentDate: "2024-03-15",
        method: "email",
        attachments: ["Cotización_TechSolutions.pdf", "Cronograma.pdf"],
        clientFeedback: "Cliente solicitó ajustes menores"
      },
      communications: [
        {
          id: "comm-4",
          type: "email",
          date: "2024-03-22",
          content: "Cliente acepta condiciones, solicita ajuste en cronograma",
          urgency: "normal"
        }
      ],
      notes: "Cotización enviada. Cliente en proceso de aprobación interna."
    },
    {
      id: "SALES-005",
      clientName: "Urban Development Group",
      contactChannel: "whatsapp",
      projectType: "project",
      salesRep: "Alejandro Torres",
      stage: "closure",
      priority: "medium",
      stageDuration: 15,
      contactInfo: {
        phone: "+52 55 6789 0123",
        email: "desarrollo@urbandevelopment.mx",
        contactPerson: "Arq. Sofia Ramírez"
      },
      projectDetails: {
        description: "Sistema HVAC para centro comercial",
        location: "Tijuana, Baja California",
        estimatedBudget: 3500000,
        timeline: "5 meses"
      },
      quotationData: {
        totalAmount: 3750000,
        approved: true,
        approvalDate: "2024-03-26"
      },
      contractualInfo: {
        paymentConditions: "40% anticipo, 30% avance 50%, 30% finalización",
        billingData: {
          businessName: "Urban Development Group S.A. de C.V.",
          rfc: "UDG123456789",
          address: "Av. Revolución 1234, Tijuana, BC"
        },
        deliverySchedule: [
          { milestone: "Equipos principales", date: "2024-05-15" },
          { milestone: "Instalación completa", date: "2024-07-30" }
        ]
      },
      workOrderGenerated: true,
      workOrderRef: "WO-2024-UDG-001",
      communications: [
        {
          id: "comm-5",
          type: "email",
          date: "2024-03-26",
          content: "Contrato firmado. Iniciando proceso interno",
          urgency: "normal"
        }
      ],
      notes: "¡Oportunidad cerrada exitosamente! Orden de trabajo generada."
    }
  ]), []);

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      setIsLoading(true);
      // Simula fetch
      await new Promise((r) => setTimeout(r, 600));
      if (!mounted) return;
      setOpportunities(mockOpportunities);
      setIsLoading(false);
    };
    load();
    return () => {
      mounted = false;
    };
  }, [mockOpportunities]);

  // --- Handlers ---
  const handleCreateOpportunity = (newOpportunity) => {
    crearOportunidad(newOpportunity)
      .then(response => {
        console.log('Respuesta backend oportunidad:', response);
        // Si el backend responde con éxito, actualiza el estado local
        if (response && response.success && response.data) {
          setOpportunities(prev => [response.data, ...prev]);
        }
        setShowNewOpportunityModal(false);
      })
      .catch(error => {
        // Manejo de error opcional
        console.error('Error al guardar oportunidad:', error);
      });
  };

  const handleNewOpportunityClick = () => {
    setShowNewOpportunityModal(true);
    setShowControls(false);
    setSelectedOpportunity(null);
  };

  const handleStageTransition = async (opportunityId, newStage) => {
    try {
      // Si se selecciona "Desarrollo de Cotización", redirigir antes de la actualización
      if (newStage === 'quotation-development') {
        // Actualiza primero el estado
        await actualizarOportunidad(opportunityId, { etapa: newStage });
        // Redirige a cotizaciones con los parámetros necesarios
        window.location.href = `/cotizaciones?opportunityId=${opportunityId}&newQuotation=true`;
        return;
      }

      // Para otras etapas, continúa con el flujo normal
      await actualizarOportunidad(opportunityId, { etapa: newStage });
      if (selectedOpportunity?.id === opportunityId) {
        setSelectedOpportunity(prev => ({ ...prev, stage: newStage, stageDuration: 0 }));
      }
    } catch (err) {
      // Manejo de error ya está en el hook
    }
  };

  const handleOpportunitySelect = (opportunity) => {
    setSelectedOpportunity(opportunity);
    setShowControls(true);
  };

  const handleClientRegistration = (opportunityId, clientData) => {
    setOpportunities(prev => prev?.map(opp =>
      opp?.id === opportunityId
        ? { ...opp, contactInfo: { ...opp?.contactInfo, ...clientData } }
        : opp
    ));
    if (selectedOpportunity?.id === opportunityId) {
      setSelectedOpportunity(prev => ({ ...prev, contactInfo: { ...prev?.contactInfo, ...clientData } }));
    }
  };

  const handleCommunicationAdd = (opportunityId, communication) => {
    setOpportunities(prev => prev?.map(opp =>
      opp?.id === opportunityId
        ? {
          ...opp,
          communications: [...(opp?.communications || []), communication]
        }
        : opp
    ));
    if (selectedOpportunity?.id === opportunityId) {
      setSelectedOpportunity(prev => ({ ...prev, communications: [...(prev?.communications || []), communication] }));
    }
  };

  const handleQuotationUpdate = (opportunityId, quotationData) => {
    setOpportunities(prev => prev?.map(opp =>
      opp?.id === opportunityId
        ? { ...opp, quotationData }
        : opp
    ));
    if (selectedOpportunity?.id === opportunityId) {
      setSelectedOpportunity(prev => ({ ...prev, quotationData }));
    }
  };

  const handleWorkOrderGeneration = (opportunityId, workOrderData) => {
    setOpportunities(prev => prev?.map(opp =>
      opp?.id === opportunityId
        ? {
          ...opp,
          workOrderGenerated: true,
          workOrderRef: workOrderData?.reference
        }
        : opp
    ));
    if (selectedOpportunity?.id === opportunityId) {
      setSelectedOpportunity(prev => ({ ...prev, workOrderGenerated: true, workOrderRef: workOrderData?.reference }));
    }
  };

  const getOpportunitiesByStage = (stageId) => {
    if (!oportunidades) return [];
    // Si la etapa es 'initial-contact', incluir las que no tienen etapa
    if (stageId === 'initial-contact') {
      return oportunidades.filter(opp => !opp.stage || opp.stage === 'initial-contact');
    }
    return oportunidades.filter(opp => opp.stage === stageId);
  };

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'urgent': return 'border-l-4 border-red-600 bg-red-50';
      case 'high': return 'border-l-4 border-orange-500 bg-orange-50';
      case 'medium': return 'border-l-4 border-yellow-500 bg-yellow-50';
      case 'low': return 'border-l-4 border-green-500 bg-green-50';
      default: return 'border-l-4 border-gray-400 bg-gray-50';
    }
  };

  const getDurationColor = (days) => {
    if (days <= 3) return 'text-green-600';
    if (days <= 7) return 'text-yellow-600';
    return 'text-red-600';
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex">
        <Sidebar isCollapsed={sidebarCollapsed} onToggle={() => setSidebarCollapsed(!sidebarCollapsed)} />
        <div className={`flex-1 transition-all duration-300 ${sidebarCollapsed ? 'lg:ml-16' : 'lg:ml-60'}`}>
          <Header onMenuToggle={() => setHeaderMenuOpen(!headerMenuOpen)} isMenuOpen={headerMenuOpen} />
          <div className="flex items-center justify-center h-96">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
              <p className="text-muted-foreground">Cargando oportunidades de venta...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // --- Render ---
  return (
    <div className="min-h-screen bg-background flex">
      <Sidebar isCollapsed={sidebarCollapsed} onToggle={() => setSidebarCollapsed(!sidebarCollapsed)} />

      <div className={`flex-1 transition-all duration-300 ${sidebarCollapsed ? 'lg:ml-16' : 'lg:ml-60'}`}>
        <Header onMenuToggle={() => setHeaderMenuOpen(!headerMenuOpen)} isMenuOpen={headerMenuOpen} sidebarCollapsed={sidebarCollapsed} />

        <main className="">
          <div className="container mx-auto px-4 py-8">
            {/* Breadcrumb */}
            <div className="mb-6">
              <Breadcrumb />
            </div>

            {/* Encabezado */}
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between mb-8">
              <div>
                <h1 className="text-3xl font-bold text-foreground mb-2">Gestión de Oportunidades de Venta</h1>
                <p className="text-muted-foreground">
                  Flujo completo de ventas desde contacto inicial hasta cierre de oportunidad
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
                  iconName="Plus"
                  iconPosition="left"
                  onClick={handleNewOpportunityClick}
                >
                  Nueva Oportunidad
                </Button>
              </div>
            </div>

            {/* Kanban + Panel derecho */}
            <div className="relative flex transition-all duration-300">
              {/* Kanban container */}
              <div
                className={`flex-1 pb-6 transition-all duration-300 ${showControls ? 'mr-[32rem]' : ''}`}
              >
                {/* Scroll horizontal en desktop; en mobile se apilan columnas (flex-col) */}
                <div className="lg:overflow-x-auto lg:overflow-y-hidden">
                  <div className="flex gap-6 min-w-max px-0 lg:px-6
                                  flex-col lg:flex-row">
                    {salesStages.map((stage) => (
                      <div
                        key={stage.id}
                        className="flex flex-col w-full lg:w-[280px] bg-white rounded-2xl shadow-md border border-gray-200 overflow-hidden hover:shadow-lg transition-shadow"
                      >
                        {/* Header etapa */}
                        <div className={`${stage.color} p-4 text-white flex flex-col rounded-t-2xl`}>
                          <div className="flex items-center space-x-2">
                            <Icon name={stage.icon} size={20} />
                            <h3 className="font-semibold text-base">{stage.name}</h3>
                          </div>
                          <p className="text-xs mt-1 opacity-90">{stage.description}</p>
                          <span className="text-xs mt-2 bg-white/20 rounded px-2 py-1 w-fit">
                            {getOpportunitiesByStage(stage.id)?.length} oportunidades
                          </span>
                        </div>

                        {/* Contenido tarjetas y mensaje vacío */}
                        <div className="p-4 space-y-3 bg-gray-50 overflow-y-auto max-h-[60vh] scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-transparent">
                          {/* Tarjetas */}
                          {getOpportunitiesByStage(stage.id)?.map((opportunity) => (
                            <article
                              key={opportunity.id}
                              onClick={() => handleOpportunitySelect(opportunity)}
                              role="button"
                              tabIndex={0}
                              onKeyDown={(e) => { if (e.key === 'Enter') handleOpportunitySelect(opportunity); }}
                              className={`p-3 rounded-xl cursor-pointer hover:scale-[1.02] transform transition-all ${getPriorityColor(opportunity.priority)}`}
                              aria-label={`${opportunity.clientName} - ${opportunity.id}`}
                            >
                              <div className="flex items-start justify-between mb-2">
                                <h4 className="font-medium text-sm text-gray-900 line-clamp-2">
                                  {opportunity.clientName}
                                </h4>
                                <span
                                  className={`text-xs px-2 py-1 rounded-full ${opportunity.priority === 'urgent'
                                      ? 'bg-red-100 text-red-800'
                                      : opportunity.priority === 'high'
                                        ? 'bg-orange-100 text-orange-800'
                                        : opportunity.priority === 'medium'
                                          ? 'bg-yellow-100 text-yellow-800'
                                          : 'bg-green-100 text-green-800'
                                    }`}
                                >
                                  {opportunity.priority === 'urgent'
                                    ? 'Urgente'
                                    : opportunity.priority === 'high'
                                      ? 'Alta'
                                      : opportunity.priority === 'medium'
                                        ? 'Media'
                                        : 'Baja'}
                                </span>
                              </div>

                              <div className="flex items-center justify-between text-xs text-gray-500 mb-1">
                                <div className="flex items-center space-x-2">
                                  <Icon
                                    name={opportunity.contactChannel === 'whatsapp' ? 'MessageCircle' : 'Mail'}
                                    size={12}
                                  />
                                  <span className="capitalize">{opportunity.contactChannel}</span>
                                  <span
                                    className={`px-2 py-0.5 rounded text-xs ${opportunity.projectType === 'project'
                                        ? 'bg-blue-100 text-blue-800'
                                        : 'bg-purple-100 text-purple-800'
                                      }`}
                                  >
                                    {opportunity.projectType === 'project' ? 'Proyecto' : 'Pieza'}
                                  </span>
                                </div>
                              </div>

                              <div className="flex items-center space-x-2 mb-1">
                                <Icon name="User" size={12} />
                                <span className="text-xs text-gray-600">{opportunity.salesRep}</span>
                              </div>

                              <div className="flex items-center justify-between">
                                <div className="flex items-center space-x-1">
                                  <Icon name="Clock" size={12} />
                                  <span
                                    className={`text-xs font-medium ${getDurationColor(
                                      opportunity.stageDuration
                                    )}`}
                                  >
                                    {opportunity.stageDuration} días
                                  </span>
                                </div>
                              </div>

                              {opportunity.workOrderGenerated && (
                                <div className="flex items-center space-x-1 mt-2 text-green-600">
                                  <Icon name="CheckCircle2" size={12} />
                                  <span className="text-xs font-medium">Orden generada</span>
                                </div>
                              )}
                            </article>
                          ))}
                          {/* Mensaje vacío */}
                          {getOpportunitiesByStage(stage.id)?.length === 0 && (
                            <div className="text-center py-8 text-gray-400">
                              <Icon name="Inbox" size={28} className="mx-auto mb-2" />
                              <p className="text-sm">Sin oportunidades</p>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Panel derecho - Desktop: fixed right panel; Mobile: slide-over full screen */}
              {showControls && (
                <>
                  {/* Overlay solo para mobile */}
                  <div
                    className="lg:hidden fixed inset-0 bg-black/40 z-30"
                    onClick={() => setShowControls(false)}
                    aria-hidden="true"
                  />

                  {/* Fondo semitransparente solo para mobile */}
                  <div
                    className="fixed inset-0 bg-black/30 z-40 lg:hidden"
                    onClick={() => setShowControls(false)}
                  />

                  <aside
                    className={`fixed top-16 right-4 w-11/12 max-w-xs h-[80vh] bg-white z-[60] rounded-l-2xl shadow-xl overflow-y-auto
                  transform transition-transform duration-300
                  ${showControls ? 'translate-x-0' : 'translate-x-full'}
                  lg:top-[6rem] lg:right-0 lg:w-[25rem] lg:h-[calc(100vh-6rem)] lg:translate-x-0 lg:rounded-l-2xl lg:shadow-xl lg:border-l`}
                    role="region"
                    aria-label="Controles de oportunidad"
                  >
                    {/* Header sticky */}
                    <div className="sticky top-0 bg-white border-b p-4 flex justify-between items-center z-50">
                      <h3 className="font-semibold text-gray-800 text-lg">Controles de Oportunidad</h3>
                      <Button
                        variant="ghost"
                        size="sm"
                        iconName="X"
                        onClick={() => setShowControls(false)}
                        aria-label="Cerrar controles"
                      />
                    </div>

                    {/* Contenido */}
                    <div className="p-4 space-y-6">
                      {selectedOpportunity ? (
                        <div className="space-y-4">
                          <div>
                            <h4 className="font-medium mb-2 text-sm sm:text-base">{selectedOpportunity?.clientName}</h4>
                          </div>

                          {/* OCULTO TEMPORALMENTE - Paneles según etapa */}
                          {/* {(selectedOpportunity?.stage === 'initial-contact' || !selectedOpportunity?.stage) && (
                            <ClientRegistrationPanel
                              opportunity={selectedOpportunity}
                              onRegister={(clientData) =>
                                handleClientRegistration(selectedOpportunity?.id, clientData)
                              }
                            />
                          )} */}

                          {/* Panel de Comunicación - VISIBLE */}
                          <CommunicationPanel
                            opportunity={selectedOpportunity}
                            onAddCommunication={(communication) =>
                              handleCommunicationAdd(selectedOpportunity?.id, communication)
                            }
                          />

                          {/* OCULTO TEMPORALMENTE - QuotationRequestPanel */}
                          {/* {(selectedOpportunity?.stage === 'quotation-development' ||
                            selectedOpportunity?.stage === 'client-review' ||
                            selectedOpportunity?.stage === 'closure') && (
                            <QuotationRequestPanel
                              opportunity={{
                                ...selectedOpportunity,
                                quotationData: selectedOpportunity?.quotationData || {
                                  scope: '',
                                  assumptions: [],
                                  timeline: '',
                                  conditions: '',
                                  materials: [],
                                  riskAssessment: 'low',
                                  extraCosts: [],
                                  totalAmount: 0,
                                  validity: '30 días'
                                }
                              }}
                              onUpdate={(quotationData) =>
                                handleQuotationUpdate(selectedOpportunity?.id, quotationData)
                              }
                            />
                          )} */}

                          {/* OCULTO TEMPORALMENTE - Panel de revisión del cliente */}
                          {/* {selectedOpportunity?.stage === 'client-review' && selectedOpportunity?.quotationStatus && (
                            <div className="border rounded-lg p-4 bg-muted/10">
                              <h4 className="font-medium mb-2 flex items-center">
                                <Icon name="Eye" size={16} className="mr-2 text-yellow-600" />
                                Revisión del Cliente
                              </h4>
                              <div className="text-sm mb-2">
                                <strong>Enviado:</strong> {selectedOpportunity.quotationStatus.sent ? 'Sí' : 'No'}<br />
                                <strong>Fecha de envío:</strong> {selectedOpportunity.quotationStatus.sentDate}<br />
                                <strong>Método:</strong> {selectedOpportunity.quotationStatus.method}<br />
                                <strong>Adjuntos:</strong> {selectedOpportunity.quotationStatus.attachments?.join(', ') || 'Ninguno'}<br />
                                <strong>Feedback del cliente:</strong> {selectedOpportunity.quotationStatus.clientFeedback || 'Sin comentarios'}
                              </div>
                            </div>
                          )} */}

                          {/* OCULTO TEMPORALMENTE - Panel de orden de trabajo en cierre */}
                          {/* {selectedOpportunity?.stage === 'closure' && (
                            <WorkOrderPanel
                              opportunity={selectedOpportunity}
                              onGenerateWorkOrder={(workOrderData) =>
                                handleWorkOrderGeneration(selectedOpportunity?.id, workOrderData)
                              }
                            />
                          )} */}

                          {/* OCULTO TEMPORALMENTE - ChangeManagementPanel */}
                          {/* {selectedOpportunity?.stage !== 'initial-contact' && (
                            <ChangeManagementPanel
                              opportunity={selectedOpportunity}
                              onRequestChange={(changeData) =>
                                console.log('Change requested:', changeData)
                              }
                            />
                          )} */}

                          {/* Botones para cambiar etapa - VISIBLE */}
                          <div className="space-y-2">
                            <label className="text-sm font-medium">Avanzar Etapa</label>
                            <div className="grid grid-cols-1 gap-2">{salesStages?.map((stage) => (
                              <Button
                                key={stage?.id}
                                variant={selectedOpportunity?.stage === stage?.id ? 'default' : 'outline'}
                                size="sm"
                                onClick={() =>
                                  handleStageTransition(selectedOpportunity?.id, stage?.id)
                                }
                                disabled={selectedOpportunity?.stage === stage?.id}
                                className="text-xs justify-start"
                              >
                                <Icon name={stage?.icon} size={14} className="mr-2" />
                                {stage?.name}
                              </Button>
                            ))}
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div className="text-center text-gray-500 py-6">
                          <p className="mb-2">Selecciona una oportunidad para ver controles</p>
                          <Button onClick={() => setShowControls(false)}>Cerrar</Button>
                        </div>
                      )}
                    </div>
                  </aside>
                </>
              )}
            </div>
          </div>
        </main>

        {/* Modal para nueva oportunidad */}
        <NewOpportunityModal
          isOpen={showNewOpportunityModal}
          onClose={() => setShowNewOpportunityModal(false)}
          onCreateOpportunity={handleCreateOpportunity}
          error={error}
        />
      </div>
    </div>
  );
};

export default SalesOpportunityManagement;
