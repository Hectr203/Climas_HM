import React, { useState, useEffect } from 'react';
import Icon from '../../components/AppIcon';
import Button from '../../components/ui/Button';
import Sidebar from '../../components/ui/Sidebar';
import Header from '../../components/ui/Header';
import Breadcrumb from '../../components/ui/Breadcrumb';
import QuotationBuilder from './components/QuotationBuilder';
import ViewUnitPrices from './components/ViewUnitPrices';
import MaterialRiskChecklist from './components/MaterialRiskChecklist';
import QuotationPreview from './components/QuotationPreview';
import ClientCommunication from './components/ClientCommunication';
import RevisionHistory from './components/RevisionHistory';
import InternalReview from './components/InternalReview';
import NewQuotationModal from './components/NewQuotationModal';
import useQuotation from '../../hooks/useQuotation';
import quotationService from '../../services/quotationService';

const QuotationDevelopmentCenter = () => {
  const [quotations, setQuotations] = useState([]);
  const [selectedQuotation, setSelectedQuotation] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('builder');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [headerMenuOpen, setHeaderMenuOpen] = useState(false);
  const [isNewQuotationModalOpen, setIsNewQuotationModalOpen] = useState(false);
  const [showRejected, setShowRejected] = useState(false);
  const [allQuotations, setAllQuotations] = useState([]);

  // Verificar parámetros de URL al cargar
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const opportunityId = params.get('opportunityId');
    const newQuotation = params.get('newQuotation');
    const quotationId = params.get('id'); // Nuevo parámetro para seleccionar cotización específica

    if (opportunityId && newQuotation === 'true') {
      window.dispatchEvent(new CustomEvent('setNewQuotationModalFromOpportunity'));
      setIsNewQuotationModalOpen(true);
    }

    // Si hay un ID de cotización en la URL, seleccionar esa cotización y cambiar a la pestaña de revisión
    if (quotationId && quotations.length > 0) {
      const quotationToSelect = quotations.find(q => q.id === quotationId);
      if (quotationToSelect) {
        handleQuotationSelect(quotationToSelect);
        setActiveTab('review'); // Cambiar a la pestaña de revisión
        // Limpiar el parámetro de la URL para evitar re-selección en recargas
        const newParams = new URLSearchParams(window.location.search);
        newParams.delete('id');
        window.history.replaceState({}, '', `${window.location.pathname}?${newParams.toString()}`);
      }
    }
  }, [quotations]); // Agregar quotations como dependencia

  const { getCotizaciones, getCotizacionById, getConstructorByCotizacionId } = useQuotation();

  useEffect(() => {
    const fetchQuotations = async () => {
      setIsLoading(true);
      try {
        const response = await getCotizaciones();
        // console.log eliminado
        const cotizaciones = Array.isArray(response.data?.data) ? response.data.data : [];
        // console.log eliminado
        // Mapeo adaptado a la estructura real del backend con datos del constructor
        const mapped = await Promise.all(cotizaciones.map(async (cotizacion) => {
          let constructorData = null;

          // Intentar obtener datos del constructor para cada cotización
          try {
            constructorData = await getConstructorByCotizacionId(cotizacion.id);
          } catch (err) {
            // Si no existe constructor, usar datos por defecto
            constructorData = null;
          }

          return {
            id: cotizacion.id || '', // id de Cosmos
            folio: cotizacion.folio || '', // folio
            clientId: cotizacion.informacion_basica?.cliente?.find?.(c => 'id_cliente' in c)?.id_cliente || '',
            clientName: cotizacion.informacion_basica?.cliente?.find?.(c => c?.nombre_cliente)?.nombre_cliente || '',
            projectId: cotizacion.informacion_basica?.proyecto?.find?.(p => 'id_proyecto' in p)?.id_proyecto || '',
            projectName: cotizacion.informacion_basica?.proyecto?.find?.(p => p?.nombre_proyecto)?.nombre_proyecto || '',
            projectType: cotizacion.informacion_basica?.tipo_proyecto || '',
            description: cotizacion.detalles_proyecto?.descripcion_proyecto || '',
            location: cotizacion.detalles_proyecto?.ubicacion_proyecto?.[0] || {},
            executionTime: cotizacion.detalles_proyecto?.tiempo_ejecucion || '',
            contactInfo: cotizacion.informacion_contacto?.[0]?.persona_contacto1?.[0] || {},
            additionalNotes: cotizacion.asignacion?.notas_adicionales || '',
            status: 'development',
            createdDate: cotizacion.fechaCreacion ? new Date(cotizacion.fechaCreacion).toLocaleDateString('es-MX') : '',
            lastModified: cotizacion.fechaActualizacion ? new Date(cotizacion.fechaActualizacion).toLocaleDateString('es-MX') : '',
            assignedTo: cotizacion.asignacion?.responsables?.[0]?.nombre_responsable || '',
            assignedToId: cotizacion.asignacion?.responsables?.[0]?.id_responsable || '',
            priority: cotizacion.informacion_basica?.prioridad || 'media',
            estado_aprobacion: cotizacion.estado_aprobacion || 'pendiente',
            quotationData: {
              // Usar monto del constructor si existe, sino usar el presupuesto estimado
              totalAmount: constructorData?.monto_total || cotizacion.detalles_proyecto?.presupuesto_estimado_mxn || 0,
              discountPercentage: constructorData?.porcentaje_descuento || 0
            }
          };
        }));
        setAllQuotations(mapped);
        // Filtrar cotizaciones según el estado actual
        const filtered = showRejected
          ? mapped.filter(q => q.estado_aprobacion === 'rechazada')
          : mapped.filter(q => q.estado_aprobacion !== 'rechazada');
        setQuotations(filtered);
      } catch (err) {
        setQuotations([]);
      } finally {
        setIsLoading(false);
      }
    };
    fetchQuotations();
  }, []);

  const handleCreateQuotation = (newQuotation) => {
    // Extraer datos relevantes según el formato recibido
    const mappedQuotation = {
      id: newQuotation?.folio || newQuotation?.id || '',
      clientId: newQuotation?.informacion_basica?.cliente?.find?.(c => 'id_cliente' in c)?.id_cliente || '',
      clientName: newQuotation?.informacion_basica?.cliente?.find?.(c => c?.nombre_cliente)?.nombre_cliente || '',
      projectId: newQuotation?.informacion_basica?.proyecto?.find?.(p => 'id_proyecto' in p)?.id_proyecto || '',
      projectName: newQuotation?.informacion_basica?.proyecto?.find?.(p => p?.nombre_proyecto)?.nombre_proyecto || '',
      projectType: newQuotation?.informacion_basica?.tipo_proyecto || '',
      description: newQuotation?.detalles_proyecto?.descripcion_proyecto || '',
      location: newQuotation?.detalles_proyecto?.ubicacion_proyecto?.[0] || {},
      executionTime: newQuotation?.detalles_proyecto?.tiempo_ejecucion || '',
      contactInfo: newQuotation?.informacion_contacto?.[0]?.persona_contacto1?.[0] || {},
      additionalNotes: newQuotation?.asignacion?.notas_adicionales || '',
      status: 'development',
      createdDate: newQuotation?.fechaCreacion ? new Date(newQuotation?.fechaCreacion).toLocaleDateString('es-MX') : new Date().toLocaleDateString('es-MX'),
      lastModified: newQuotation?.fechaActualizacion ? new Date(newQuotation?.fechaActualizacion).toLocaleDateString('es-MX') : new Date().toLocaleDateString('es-MX'),
      assignedTo: newQuotation?.asignacion?.responsables?.[0]?.nombre_responsable || '',
      assignedToId: newQuotation?.asignacion?.responsables?.[0]?.id_responsable || '',
      priority: newQuotation?.informacion_basica?.prioridad || 'media',
      estado_aprobacion: newQuotation?.estado_aprobacion || 'pendiente',
      quotationData: {
        totalAmount: newQuotation?.detalles_proyecto?.presupuesto_estimado_mxn || 0
      }
    };
    // Agregar a allQuotations primero
    setAllQuotations(prev => [mappedQuotation, ...prev]);
    setSelectedQuotation(mappedQuotation);
    setActiveTab('builder');
    setIsNewQuotationModalOpen(false);
    // Limpiar el parámetro newQuotation de la URL para evitar que se abra el modal tras recargar
    const params = new URLSearchParams(window.location.search);
    if (params.has('newQuotation')) {
      params.delete('newQuotation');
      window.history.replaceState({}, '', `${window.location.pathname}?${params.toString()}`);
    }
    // Recargar cotizaciones desde el backend para tener la lista actualizada
    getCotizaciones().then(response => {
      const cotizaciones = Array.isArray(response.data?.data) ? response.data.data : [];
      const mapped = cotizaciones.map(cotizacion => ({
        id: cotizacion.id || '',
        folio: cotizacion.folio || '',
        clientId: cotizacion.informacion_basica?.cliente?.find?.(c => 'id_cliente' in c)?.id_cliente || '',
        clientName: cotizacion.informacion_basica?.cliente?.find?.(c => c?.nombre_cliente)?.nombre_cliente || '',
        projectId: cotizacion.informacion_basica?.proyecto?.find?.(p => 'id_proyecto' in p)?.id_proyecto || '',
        projectName: cotizacion.informacion_basica?.proyecto?.find?.(p => p?.nombre_proyecto)?.nombre_proyecto || '',
        projectType: cotizacion.informacion_basica?.tipo_proyecto || '',
        description: cotizacion.detalles_proyecto?.descripcion_proyecto || '',
        location: cotizacion.detalles_proyecto?.ubicacion_proyecto?.[0] || {},
        executionTime: cotizacion.detalles_proyecto?.tiempo_ejecucion || '',
        contactInfo: cotizacion.informacion_contacto?.[0]?.persona_contacto1?.[0] || {},
        additionalNotes: cotizacion.asignacion?.notas_adicionales || '',
        status: 'development',
        createdDate: cotizacion.fechaCreacion ? new Date(cotizacion.fechaCreacion).toLocaleDateString('es-MX') : '',
        lastModified: cotizacion.fechaActualizacion ? new Date(cotizacion.fechaActualizacion).toLocaleDateString('es-MX') : '',
        assignedTo: cotizacion.asignacion?.responsables?.[0]?.nombre_responsable || '',
        assignedToId: cotizacion.asignacion?.responsables?.[0]?.id_responsable || '',
        priority: cotizacion.informacion_basica?.prioridad || 'media',
        estado_aprobacion: cotizacion.estado_aprobacion || 'pendiente',
        quotationData: {
          totalAmount: cotizacion.detalles_proyecto?.presupuesto_estimado_mxn || 0
        }
      }));
      setAllQuotations(mapped);
    });
  };

  const handleQuotationSelect = async (quotation) => {
    setIsLoading(true);
    try {
      // Si el objeto ya tiene la estructura mapeada, úsalo directamente
      if (quotation.quotationData && quotation.projectName) {
        setSelectedQuotation(quotation);
      } else {
        const quotationDetail = await getCotizacionById(quotation.id);
        const mappedQuotation = {
          id: quotationDetail.id || '', // id de Cosmos
          folio: quotationDetail.folio || '', // folio
          clientName: quotationDetail.informacion_basica?.cliente?.find?.(c => c?.nombre_cliente)?.nombre_cliente || '',
          projectName: quotationDetail.informacion_basica?.proyecto?.find?.(p => p?.nombre_proyecto)?.nombre_proyecto || '',
          status: 'development',
          createdDate: quotationDetail.fechaCreacion ? new Date(quotationDetail.fechaCreacion).toLocaleDateString('es-MX') : '',
          lastModified: quotationDetail.fechaActualizacion ? new Date(quotationDetail.fechaActualizacion).toLocaleDateString('es-MX') : '',
          assignedTo: quotationDetail.asignacion?.responsables?.[0]?.nombre_responsable || '',
          priority: quotationDetail.informacion_basica?.prioridad || 'media',
          quotationData: {
            totalAmount: quotationDetail.detalles_proyecto?.presupuesto_estimado_mxn || 0
          }
        };
        setSelectedQuotation(mappedQuotation);
      }
    } catch (err) {
      // Manejo de error si es necesario
    } finally {
      setIsLoading(false);
    }
  };

  const handleQuotationUpdate = (quotationId, updates) => {
    // Actualizar allQuotations primero (esto triggerea el useEffect para re-filtrar)
    setAllQuotations(prev => {
      const updated = prev?.map(quote =>
        quote?.id === quotationId
          ? { ...quote, ...updates, lastModified: new Date()?.toISOString()?.split('T')?.[0] }
          : quote
      );
      return updated;
    });

    // Actualizar cotización seleccionada si es la misma
    if (selectedQuotation?.id === quotationId) {
      setSelectedQuotation(prev => ({ ...prev, ...updates }));

      // Si la cotización fue rechazada y estamos en vista normal, deseleccionarla
      if (updates.estado_aprobacion === 'rechazada' && !showRejected) {
        setSelectedQuotation(null);
      }
      // Si la cotización fue aprobada/pendiente y estamos en vista rechazadas, deseleccionarla
      if (updates.estado_aprobacion !== 'rechazada' && showRejected) {
        setSelectedQuotation(null);
      }
    }
  };

  const handleAddRevision = (quotationId, revision) => {
    const newRevision = {
      ...revision,
      version: `1.${Date.now()?.toString()?.slice(-1)}`,
      date: new Date()?.toISOString()?.split('T')?.[0]
    };

    setQuotations(prev => prev?.map(quote =>
      quote?.id === quotationId
        ? {
          ...quote,
          revisions: [...(quote?.revisions || []), newRevision],
          lastModified: newRevision?.date
        }
        : quote
    ));
  };

  const handleSubmitInternalReview = (quotationId, reviewData) => {
    setQuotations(prev => prev?.map(quote =>
      quote?.id === quotationId
        ? { ...quote, internalReview: reviewData }
        : quote
    ));
  };

  const handleClientCommunication = (quotationId, communication) => {
    const newComm = {
      ...communication,
      id: `comm-${Date.now()}`,
      date: new Date()?.toISOString()?.split('T')?.[0]
    };

    setQuotations(prev => prev?.map(quote =>
      quote?.id === quotationId
        ? {
          ...quote,
          communications: [...(quote?.communications || []), newComm]
        }
        : quote
    ));
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'development': return 'bg-blue-100 text-blue-800'; // Desarrollo
      case 'review': return 'bg-yellow-100 text-yellow-800'; // Revisión
      case 'approved': return 'bg-green-100 text-green-800'; // Aprobada
      case 'rejected': return 'bg-red-100 text-red-800'; // Rechazada
      case 'sent': return 'bg-indigo-100 text-indigo-800'; // Enviada
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'urgente': return 'border-l-red-600';
      case 'alta': return 'border-l-orange-500';
      case 'media': return 'border-l-yellow-500';
      case 'baja': return 'border-l-green-500';
      default: return 'border-l-gray-400';
    }
  };

  // Filtrar cotizaciones cuando cambie el estado de mostrar rechazadas
  useEffect(() => {
    if (allQuotations.length > 0) {
      const filtered = showRejected
        ? allQuotations.filter(q => q.estado_aprobacion === 'rechazada')
        : allQuotations.filter(q => q.estado_aprobacion !== 'rechazada');

      setQuotations(filtered);

      // Si la cotización seleccionada no está en el filtro actual, deseleccionarla
      if (selectedQuotation && !filtered.find(q => q.id === selectedQuotation.id)) {
        setSelectedQuotation(null);
      }
    }
  }, [showRejected, allQuotations]);

  useEffect(() => {
    // Ya no selecciona automáticamente la primera cotización
  }, [quotations, selectedQuotation]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex">
        <Sidebar isCollapsed={sidebarCollapsed} onToggle={() => setSidebarCollapsed(!sidebarCollapsed)} />
        <div className={`flex-1 transition-all duration-300 ${sidebarCollapsed ? 'lg:ml-16' : 'lg:ml-60'}`}>
          <Header onMenuToggle={() => setHeaderMenuOpen(!headerMenuOpen)} isMenuOpen={headerMenuOpen} />
          <div className="flex items-center justify-center h-96">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
              <p className="text-muted-foreground">Cargando centro de desarrollo...</p>
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
            <div className="mb-6">
              <Breadcrumb />
            </div>

            {/* Header */}
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between mb-8">
              <div>
                <h1 className="text-3xl font-bold text-foreground mb-2">Centro de Desarrollo de Cotizaciones</h1>
                <p className="text-muted-foreground">
                  Creación y gestión avanzada de cotizaciones con validación de costos y comunicación directa
                </p>
              </div>

              <div className="flex items-center space-x-4 mt-4 lg:mt-0">
                <Button
                  variant={showRejected ? "default" : "outline"}
                  onClick={() => setShowRejected(!showRejected)}
                  iconName={showRejected ? "Eye" : "EyeOff"}
                  iconPosition="left"
                >
                  {showRejected ? 'Ver Aprobadas y Pendientes' : 'Ver Rechazadas'}
                </Button>
                <Button
                  iconName="Plus"
                  iconPosition="left"
                  onClick={() => {
                    window.dispatchEvent(new CustomEvent('resetNewQuotationModal'));
                    setIsNewQuotationModalOpen(true);
                  }}
                >
                  Nueva Cotización
                </Button>
              </div>
            </div>

            <div className="flex gap-6">
              {/* Quotations List */}
              <div className="w-80">
                <div className="bg-card rounded-lg shadow-sm border">
                  <div className="p-4 border-b">
                    <h3 className="font-semibold">
                      {showRejected ? 'Cotizaciones Rechazadas' : 'Cotizaciones Activas'}
                    </h3>
                  </div>

                  <div className="p-4 space-y-3 max-h-[calc(100vh-300px)] overflow-y-auto">
                    {quotations?.length === 0 ? (
                      <div className="text-center py-8">
                        <Icon name={showRejected ? "XCircle" : "FileText"} size={32} className="text-muted-foreground mx-auto mb-2" />
                        <p className="text-sm text-muted-foreground">
                          {showRejected
                            ? 'No hay cotizaciones rechazadas'
                            : 'No hay cotizaciones aprobadas o pendientes'}
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {showRejected
                            ? 'Las cotizaciones rechazadas aparecerán aquí'
                            : 'Las cotizaciones rechazadas se mueven automáticamente al historial'}
                        </p>
                      </div>
                    ) : (
                      quotations?.map((quotation) => (
                        <div
                          key={quotation?.id}
                          onClick={() => handleQuotationSelect(quotation)}
                          className={`p-3 rounded-lg border-l-4 cursor-pointer hover:shadow-md transition-all relative ${selectedQuotation?.id === quotation?.id ? 'bg-blue-100 border-blue-500' : 'bg-card hover:bg-muted/50'} ${getPriorityColor(quotation?.priority)}`}
                        >
                          {/* Indicador de estado de aprobación */}
                          <div className={`absolute top-2 right-2 w-3 h-3 rounded-full transition-all duration-300 ${quotation?.estado_aprobacion === 'aprobada'
                            ? 'bg-green-500 shadow-green-200 shadow-lg'
                            : quotation?.estado_aprobacion === 'rechazada'
                              ? 'bg-red-500 shadow-red-200 shadow-lg'
                              : 'bg-orange-500 animate-pulse shadow-orange-200 shadow-lg'
                            }`}></div>

                          <div className="flex items-start justify-between mb-2">
                            <h4 className="font-medium text-sm text-foreground line-clamp-2">
                              {quotation?.projectName || 'Sin proyecto'}
                            </h4>
                            <span className={`text-xs px-2 py-1 rounded-full ${getStatusColor(quotation?.status)}`}>
                              {quotation?.status === 'development' ? 'Desarrollo' :
                                quotation?.status === 'review' ? 'Revisión' :
                                  quotation?.status === 'approved' ? 'Aprobada' :
                                    quotation?.status === 'rejected' ? 'Rechazada' :
                                      quotation?.status === 'sent' ? 'Enviada' :
                                        quotation?.status || 'Sin estado'}
                            </span>
                          </div>
                          <p className="text-xs text-muted-foreground mb-2">{quotation?.clientName || 'Sin cliente'}</p>
                          <div className="flex items-center space-x-2 mb-2">
                            <Icon name="User" size={12} className="text-muted-foreground" />
                            <span className="text-xs text-muted-foreground">{quotation?.assignedTo || 'Sin responsable'}</span>
                          </div>
                          {/* Solo mostrar el folio, nunca el id de Cosmos */}
                          <p className="text-xs text-muted-foreground mb-2">{quotation?.folio || 'Sin folio'}</p>
                          {/* El id de Cosmos no se muestra */}
                          <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-1">
                              <Icon name="Calendar" size={12} className="text-muted-foreground" />
                              <span className="text-xs text-muted-foreground">
                                {quotation?.lastModified || quotation?.createdDate || ''}
                              </span>
                            </div>
                            <div className="text-xs font-medium text-foreground">
                              ${(() => {
                                const totalAmount = quotation?.quotationData?.totalAmount || 0;
                                const discountPercentage = quotation?.quotationData?.discountPercentage || 0;
                                const finalAmount = totalAmount - (totalAmount * (discountPercentage / 100));
                                return finalAmount.toLocaleString('es-MX');
                              })()}
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>

              {/* Main Quotation Development Area */}
              <div className="flex-1">
                {selectedQuotation ? (
                  <div className="bg-card rounded-lg shadow-sm border">
                    {/* Tabs */}
                    <div className="border-b">
                      <div className="flex space-x-1 p-1">
                        {[
                          { id: 'builder', label: 'Constructor', icon: 'Settings' },
                          { id: 'unit_prices', label: 'Precios Unitarios', icon: 'DollarSign' },
                          { id: 'materials', label: 'Materiales', icon: 'Package' },
                          { id: 'preview', label: 'Vista Previa', icon: 'Eye' },
                          { id: 'communication', label: 'Comunicación', icon: 'MessageSquare' },
                          { id: 'review', label: 'Revisión', icon: 'Users' },
                          { id: 'history', label: 'Historial', icon: 'Clock' }
                        ]?.map((tab) => (
                          <button
                            key={tab?.id}
                            onClick={() => setActiveTab(tab?.id)}
                            className={`flex items-center space-x-2 px-4 py-2 text-sm rounded-lg transition-all ${activeTab === tab?.id
                              ? (tab?.id === 'review'
                                ? (selectedQuotation?.estado_aprobacion === 'aprobada' ? 'bg-green-600 text-white' :
                                  selectedQuotation?.estado_aprobacion === 'rechazada' ? 'bg-red-600 text-white' :
                                    'bg-orange-600 text-white')
                                : 'bg-primary text-primary-foreground')
                              : (tab?.id === 'review'
                                ? (selectedQuotation?.estado_aprobacion === 'aprobada' ? 'text-green-600 hover:bg-green-50' :
                                  selectedQuotation?.estado_aprobacion === 'rechazada' ? 'text-red-600 hover:bg-red-50' :
                                    'text-orange-600 hover:bg-orange-50')
                                : 'text-muted-foreground hover:text-foreground hover:bg-muted')
                              }`}
                          >
                            <Icon name={tab?.icon} size={16} />
                            <span>{tab?.label}</span>
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Tab Content */}
                    <div className="p-6">
                      {activeTab === 'builder' && (
                        <QuotationBuilder
                          cotizacion={selectedQuotation}
                          onUpdate={(updates) => handleQuotationUpdate(selectedQuotation?.id, updates)}
                          onAddRevision={(revision) => handleAddRevision(selectedQuotation?.id, revision)}
                        />
                      )}

                      {activeTab === 'materials' && (
                        <MaterialRiskChecklist
                          quotation={selectedQuotation}
                          onUpdate={(updates) => handleQuotationUpdate(selectedQuotation?.id, updates)}
                        />
                      )}

                      {activeTab === 'unit_prices' && (
                        <ViewUnitPrices
                          quotation={selectedQuotation}
                          onUpdate={(updates) => handleQuotationUpdate(selectedQuotation?.id, updates)}
                        />
                      )}

                      {activeTab === 'preview' && (
                        <QuotationPreview
                          quotation={selectedQuotation}
                        />
                      )}

                      {activeTab === 'communication' && (
                        <ClientCommunication
                          quotation={selectedQuotation}
                          onAddCommunication={(comm) => handleClientCommunication(selectedQuotation?.id, comm)}
                        />
                      )}

                      {activeTab === 'review' && (
                        <InternalReview
                          quotation={selectedQuotation}
                          onSubmitReview={(reviewData) => handleSubmitInternalReview(selectedQuotation?.id, reviewData)}
                          onQuotationUpdate={handleQuotationUpdate}
                        />
                      )}

                      {activeTab === 'history' && (
                        <RevisionHistory
                          quotation={selectedQuotation}
                        />
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="bg-card rounded-lg shadow-sm border h-96 flex items-center justify-center">
                    <div className="text-center">
                      <Icon name="FileText" size={48} className="text-muted-foreground mx-auto mb-4" />
                      <h3 className="text-lg font-medium text-foreground mb-2">Seleccionar Cotización</h3>
                      <p className="text-muted-foreground">
                        Selecciona una cotización de la lista para comenzar a trabajar
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* New Quotation Modal */}
      <NewQuotationModal
        isOpen={isNewQuotationModalOpen}
        onClose={() => setIsNewQuotationModalOpen(false)}
        onCreateQuotation={handleCreateQuotation}
      />
    </div>
  );
};

export default QuotationDevelopmentCenter;