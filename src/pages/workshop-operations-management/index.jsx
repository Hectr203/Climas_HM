import React, { useState, useEffect } from 'react';
import Icon from '../../components/AppIcon';
import Button from '../../components/ui/Button';
import Sidebar from '../../components/ui/Sidebar';
import Breadcrumb from '../../components/ui/Breadcrumb';
import WorkflowBoard from './components/WorkflowBoard';
import useOperacAlt from '../../hooks/useOperacAlt';
import WorkflowControls from './components/WorkflowControls';
import MaterialReceptionPanel from './components/MaterialReceptionPanel';
import SafetyChecklistPanel from './components/SafetyChecklistPanel';
import AttendancePanel from './components/AttendancePanel';
import QualityControlPanel from './components/QualityControlPanel';
import ChangeOrderPanel from './components/ChangeOrderPanel';

const WorkshopOperationsManagement = () => {
  const [workOrders, setWorkOrders] = useState([]);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [activePanel, setActivePanel] = useState('workflow');
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [panelMissingByOrder, setPanelMissingByOrder] = useState({});
  const [isLoading, setIsLoading] = useState(true);
  const [currentShift, setCurrentShift] = useState('morning');
  const { oportunities, getOportunities, updateWorkOrder: updateWorkOrderRemote, deleteWorkOrder: deleteWorkOrderRemote } = useOperacAlt();

  useEffect(() => {
    const loadWorkOrders = async () => {
      setIsLoading(true);
      try {
        const data = await getOportunities();
        setWorkOrders(Array.isArray(data) ? data : []);
      } finally {
        setIsLoading(false);
      }
    };

    loadWorkOrders();
  }, []);

  const handleOrderStatusChange = (orderId, newStatus, payload = {}) => {
    if (payload && payload.hidden) {
      try {
        const matched = (workOrders || []).find(order => {
          if (!order) return false;
          const candidates = [order?.id, order?.ordenTrabajo, order?.folio, order?.raw?.id, order?.raw?.ordenTrabajo, order?.raw?.folio];
          return candidates.some(c => c !== undefined && c !== null && String(c) === String(orderId));
        });

        const backendId = matched?.id || matched?.ordenTrabajo || matched?.folio || null;

        if (backendId && deleteWorkOrderRemote) {
          const doRemoteDelete = () => {
            return deleteWorkOrderRemote(backendId).then((success) => {
              if (success) {
                setWorkOrders(prev => {
                  const list = prev || [];
                  return list.filter(order => {
                    if (!order) return false;
                    const candidates = [order?.id, order?.ordenTrabajo, order?.folio, order?.raw?.id, order?.raw?.ordenTrabajo, order?.raw?.folio];
                    return !candidates.some(c => c !== undefined && c !== null && String(c) === String(orderId));
                  });
                });
              }
              return success;
            }).catch(() => {
              return false;
            });
          };

          if (backendId && updateWorkOrderRemote) {
            updateWorkOrderRemote(backendId, { estadoProgreso: 100, completed: true })
              .then(() => doRemoteDelete())
              .catch(() => doRemoteDelete());
          } else {
            doRemoteDelete();
          }
        } else {
        }
      } catch (e) {
       //ignora los errores
      }

      return;
    }

    setWorkOrders(prev => (prev || []).map(order => {
      if (!order) return order;
      const candidates = [order?.id, order?.ordenTrabajo, order?.folio, order?.raw?.id, order?.raw?.ordenTrabajo, order?.raw?.folio];
      const matches = candidates.some(c => c !== undefined && c !== null && String(c) === String(orderId));
      if (!matches) return order;
      return {
        ...order,
        status: newStatus,
        statusLabel: getStatusLabel(newStatus),
        ...(payload.estadoProgreso !== undefined ? { estadoProgreso: payload.estadoProgreso } : {}),
        ...(payload.completed ? { completed: true } : {})
      };
    }));
    try {
      const matched = (workOrders || []).find(order => {
        if (!order) return false;
        const candidates = [order?.id, order?.ordenTrabajo, order?.folio, order?.raw?.id, order?.raw?.ordenTrabajo, order?.raw?.folio];
        return candidates.some(c => c !== undefined && c !== null && String(c) === String(orderId));
      });
      const backendId = matched?.id || matched?.ordenTrabajo || matched?.folio || null;
      if (backendId && updateWorkOrderRemote) {
        // send the payload + status so backend can update progress/status
        const remotePayload = { ...(payload || {}), status: newStatus };
        updateWorkOrderRemote(backendId, remotePayload).catch(() => {
          // already handled inside hook (notifications)
        });
      } else {
        // no backend id or updateWorkOrderRemote available for this order
      }
    } catch (e) {
      // error while attempting remote update
    }
  };

          // Force-remove helper (used by debug control) - removes matching order by id/ordenTrabajo/folio or by JSON substring
          const handleForceRemove = (orderId) => {
            if (!orderId) return;
            setWorkOrders(prev => {
              const list = prev || [];
              // attempt exact-field removal first
              const directMatches = list.filter(order => {
                if (!order) return false;
                const candidates = [order?.id, order?.ordenTrabajo, order?.folio, order?.raw?.id, order?.raw?.ordenTrabajo, order?.raw?.folio];
                return candidates.some(c => c !== undefined && c !== null && String(c) === String(orderId));
              });
              if (directMatches.length > 0) {
                return list.filter(order => {
                  if (!order) return false;
                  const candidates = [order?.id, order?.ordenTrabajo, order?.folio, order?.raw?.id, order?.raw?.ordenTrabajo, order?.raw?.folio];
                  return !candidates.some(c => c !== undefined && c !== null && String(c) === String(orderId));
                });
              }

              // fallback: remove by JSON substring
              try {
                const needle = String(orderId);
                return list.filter(order => {
                  try { return !JSON.stringify(order).includes(needle); } catch (e) { return true; }
                });
              } catch (e) {
                return list;
              }
            });
          };

          const getStatusLabel = (status) => {
            const statusLabels = {
              'material-reception': 'Recepción Material',
              'safety-checklist': 'Lista Seguridad',
              'manufacturing': 'Fabricación',
              'quality-control': 'Control Calidad',
              'ready-shipment': 'Listo Envío'
            };
            return statusLabels?.[status] || status;
          };

          // map various backend status/estado strings to canonical column ids
          const mapToColumnId = (val) => {
            if (!val) return '';
            const v = String(val).toLowerCase().trim();
            if (['material-reception','recepcion material','recepción material','recepción_material','recepción','pendiente','pendiente por revisar','new','nuevo'].includes(v)) return 'material-reception';
            if (['safety-checklist','lista seguridad','seguridad','safety','checklist seguridad'].includes(v)) return 'safety-checklist';
            if (['manufacturing','fabricación','fabricacion','en progreso','progreso','producción','produccion','en pausa','pausa','pausado'].includes(v)) return 'manufacturing';
            if (['quality-control','control calidad','calidad','qc','quality','revisión'].includes(v)) return 'quality-control';
            if (['ready-shipment','listo envío','listo envio','envío','envio','enviado','completada','completado','listo'].includes(v)) return 'ready-shipment';
            // fallback: if it's already a canonical id
            if (['material-reception','safety-checklist','manufacturing','quality-control','ready-shipment'].includes(v)) return v;
            return '';
          };

          const columns = ['material-reception','safety-checklist','manufacturing','quality-control','ready-shipment'];

          const getPreviousColumn = (current) => {
            const idx = columns.indexOf(current);
            if (idx <= 0) return columns[0];
            return columns[idx - 1];
          };

          const computeProgressForColumn = (col) => {
            const idx = columns.indexOf(col);
            if (idx < 0) return 0;
            return Math.round((idx / (columns.length - 1)) * 100);
          };

          // allow parent to revert an order to previous status and restore progress
          const handleRevertStatus = (orderRef) => {
            setWorkOrders(prev => (prev || []).map(order => {
              if (!order) return order;
              // build candidate values for the existing order
              const orderCandidates = [order?.id, order?.ordenTrabajo, order?.folio, order?.raw?.id, order?.raw?.ordenTrabajo, order?.raw?.folio].filter(Boolean).map(String);

              // build candidate values from the provided reference (could be a string id or the selected object)
              let refCandidates = [];
              try {
                if (orderRef && typeof orderRef === 'object') {
                  refCandidates = [orderRef?.id, orderRef?.ordenTrabajo, orderRef?.folio, orderRef?.raw?.id, orderRef?.raw?.ordenTrabajo, orderRef?.raw?.folio].filter(Boolean).map(String);
                } else {
                  refCandidates = [String(orderRef)];
                }
              } catch (e) {
                refCandidates = [String(orderRef || '')];
              }

              const matches = orderCandidates.some(oc => refCandidates.some(rc => rc === oc));

              // fallback: if no exact match, allow substring match against serialized orderRef when it's a string
              if (!matches) {
                try {
                  const needle = typeof orderRef === 'string' ? orderRef : JSON.stringify(orderRef || '');
                  if (needle && JSON.stringify(order).includes(needle)) {
                    // consider this a match
                  } else return order;
                } catch (e) {
                  return order;
                }
              }

              const current = mapToColumnId(order?.status || order?.estado || '');
              const prevCol = getPreviousColumn(current || columns[0]);
              const restoredProgress = computeProgressForColumn(prevCol);
              
              // Persistir el cambio en la base de datos
              const backendId = order?.id || order?.raw?.id;
              if (backendId && updateWorkOrderRemote) {
                const remotePayload = {
                  status: prevCol,
                  estado: prevCol,
                  estadoProgreso: restoredProgress,
                  progress: restoredProgress
                };
                updateWorkOrderRemote(backendId, remotePayload).catch((err) => {
                  console.error('[handleRevertStatus] Error al actualizar en BD:', err);
                });
              }
              
              return {
                ...order,
                status: prevCol,
                statusLabel: getStatusLabel(prevCol),
                estadoProgreso: restoredProgress,
                progress: restoredProgress
              };
            }));
          };

          const handleMaterialReception = (orderId, receptionData) => {
            setWorkOrders(prev => prev?.map(order => 
              order?.id === orderId 
                ? { 
                    ...order, 
                    materials: {
                      ...order?.materials,
                      received: receptionData?.cantidadRecibida || receptionData?.received || 0,
                      total: receptionData?.materials?.reduce((sum, m) => sum + (Number(m.required) || 0), 0) || order?.materials?.total || 0,
                      status: receptionData?.status,
                      issues: receptionData?.problemasFaltantes || receptionData?.issues || []
                    },
                    recepcionMateriales: receptionData?.recepcionMateriales || {
                      cantidadRecibida: receptionData?.cantidadRecibida || receptionData?.received || 0,
                      notasAdicionales: receptionData?.notasAdicionales || receptionData?.notes || '',
                      problemasFaltantes: receptionData?.problemasFaltantes || receptionData?.issues || [],
                      totalPendientes: receptionData?.totalPendientes || receptionData?.pendientes || 0,
                      status: receptionData?.status,
                      materials: receptionData?.materials || [],
                      updatedAt: receptionData?.updatedAt || new Date().toISOString()
                    },
                    raw: {
                      ...order?.raw,
                      recepcionMateriales: receptionData?.recepcionMateriales || {
                        cantidadRecibida: receptionData?.cantidadRecibida || receptionData?.received || 0,
                        notasAdicionales: receptionData?.notasAdicionales || receptionData?.notes || '',
                        problemasFaltantes: receptionData?.problemasFaltantes || receptionData?.issues || [],
                        totalPendientes: receptionData?.totalPendientes || receptionData?.pendientes || 0,
                        status: receptionData?.status,
                        materials: receptionData?.materials || [],
                        updatedAt: receptionData?.updatedAt || new Date().toISOString()
                      }
                    },
                    status: receptionData?.status === 'complete' ? 'safety-checklist' : 'material-reception'
                  }
                : order
            ));
          };

          const handleSafetyChecklist = (orderId, payload) => {
            // payload can be a boolean (completed) or an object { completed: bool, missingPPE: [] }
            const completed = typeof payload === 'boolean' ? payload : !!(payload && payload.completed);
            const missingPPE = (payload && Array.isArray(payload.missingPPE)) ? payload.missingPPE : [];
            setWorkOrders(prev => prev?.map(order => 
              order?.id === orderId 
                ? { 
                    ...order, 
                    safetyChecklistCompleted: completed,
                    safetyChecklistMissing: missingPPE,
                    status: completed ? 'manufacturing' : 'safety-checklist'
                  }
                : order
            ));
            try {
              const matched = (workOrders || []).find(order => {
                if (!order) return false;
                const candidates = [order?.id, order?.ordenTrabajo, order?.folio, order?.raw?.id, order?.raw?.ordenTrabajo, order?.raw?.folio];
                return candidates.some(c => c !== undefined && c !== null && String(c) === String(orderId));
              });
              const backendId = matched?.id || matched?.ordenTrabajo || matched?.folio || null;
              if (backendId && updateWorkOrderRemote) {
                // Compose remote payload - include completed and missingPPE under flexible keys
                const remotePayload = {
                  safetyChecklistCompleted: completed,
                  safetyChecklistMissing: missingPPE,
                  completed: completed
                };
                updateWorkOrderRemote(backendId, remotePayload).catch(() => {
                  // failure to persist remotely is non-fatal; local state remains authoritative until next sync
                });
              }
            } catch (e) {
              // ignore errors
            }
          };

          const handleQualityControl = (orderId, qcData) => {
            setWorkOrders(prev => prev?.map(order => 
              order?.id === orderId 
                ? { 
                    ...order, 
                    qualityControlStatus: qcData?.status,
                    status: qcData?.status === 'approved' ? 'ready-shipment' : 'quality-control'
                  }
                : order
            ));
          };

          const handleChangeOrder = (orderId, changeData) => {
            setWorkOrders(prev => prev?.map(order => 
              order?.id === orderId 
                ? { 
                    ...order, 
                    changeOrders: [...(order?.changeOrders || []), {
                      id: Date.now(),
                      ...changeData,
                      date: new Date()?.toISOString()?.split('T')?.[0]
                    }]
                  }
                : order
            ));
          };

          const panelOptions = [
            { value: 'workflow', label: 'Flujo Taller', icon: 'Workflow' },
            { value: 'materials', label: 'Recepción Material', icon: 'Package' },
            { value: 'safety', label: 'Seguridad', icon: 'Shield' },
            { value: 'attendance', label: 'Asistencia', icon: 'Clock' },
            { value: 'quality', label: 'Control Calidad', icon: 'CheckCircle' },
            { value: 'changes', label: 'Órdenes Cambio', icon: 'Edit' }
          ];

          if (isLoading) {
            return (
              <div className="min-h-screen bg-background flex">
                <Sidebar isCollapsed={sidebarCollapsed} onToggle={() => setSidebarCollapsed(!sidebarCollapsed)} />
                <div className={`flex-1 transition-all duration-300 ${sidebarCollapsed ? 'lg:ml-16' : 'lg:ml-60'}`}>
                  <div className="flex items-center justify-center h-96">
                    <div className="text-center">
                      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
                      <p className="text-muted-foreground">Cargando proyectos...</p>
                    </div>
                  </div>
                </div>
              </div>
            );
          }

          return (
            <div className="min-h-screen bg-background">
              {/* Desktop Sidebar */}
              <div className="hidden lg:block">
                <Sidebar isCollapsed={sidebarCollapsed} onToggle={() => setSidebarCollapsed(!sidebarCollapsed)} />
              </div>

              {/* Mobile Header Placeholder */}
              <div className="lg:hidden">
                <div className="p-4 bg-background border-b">
                  <div className="flex items-center justify-between">
                    <div className="text-lg font-semibold">Gestión Operativa - Taller</div>
                    <button onClick={() => setMobileMenuOpen(!mobileMenuOpen)} className="p-2 rounded bg-muted">
                      <Icon name="Menu" size={18} />
                    </button>
                  </div>
                </div>
              </div>
              <React.StrictMode>
                {null}
              </React.StrictMode>

              <div className={`transition-all duration-300 ${
                sidebarCollapsed ? 'lg:ml-16' : 'lg:ml-60'
              } lg:pt-0`}>
                <div className="container mx-auto px-4 py-8">
                  {/* Breadcrumb */}
                  <div className="mb-6">
                    <Breadcrumb customItems={[
                      { label: 'Dashboard', path: '/dashboard', icon: 'Home' },
                      { label: 'Gestión Operativa - Área de Taller', path: '/workshop-operations-management', icon: 'Wrench', current: true }
                    ]} />
                  </div>
                {/* Header */}
                <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between mb-8">
                  <div>
                    <h1 className="text-3xl font-bold text-foreground mb-2">Gestión Operativa - Área de Taller</h1>
                    <p className="text-muted-foreground">
                      Flujo completo desde recepción de materiales hasta control de calidad y envío (8:00-18:00)
                    </p>
                  </div>
                  
                  <div className="flex items-center space-x-4 mt-4 lg:mt-0">
                    {/* Shift Indicator */}
                    <div className="bg-muted rounded-lg px-4 py-2">
                      <div className="flex items-center space-x-2">
                        <Icon name="Clock" size={16} className="text-primary" />
                        <span className="text-sm font-medium">
                          Turno: {currentShift === 'morning' ? '8:00 - 18:00' : 'Fuera de Horario'}
                        </span>
                        <div className={`w-2 h-2 rounded-full ${
                          currentShift === 'morning' ? 'bg-green-500' : 'bg-red-500'
                        }`}></div>
                      </div>
                    </div>

                    <div className="flex bg-muted rounded-lg p-1 overflow-x-auto no-scrollbar sticky top-20 z-40">
                      {panelOptions?.slice(0, 3)?.map((option) => (
                        <button
                          key={option?.value}
                          onClick={() => setActivePanel(option?.value)}
                          className={`flex items-center justify-center space-x-2 px-3 py-2 rounded-md transition-smooth whitespace-nowrap min-w-[96px] ${
                            activePanel === option?.value
                              ? 'bg-primary text-primary-foreground'
                              : 'text-muted-foreground hover:text-foreground'
                          }`}
                        >
                          <Icon name={option?.icon} size={28} />
                          <span className="text-sm font-medium">{option?.label}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Workshop Stats */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
                  <div className="bg-card border rounded-lg p-4">
                    <div className="flex items-center space-x-2 mb-2">
                      <Icon name="Package" className="text-blue-500" size={20} />
                      <span className="font-medium">Recepción</span>
                    </div>
                    <div className="text-2xl font-bold">{workOrders?.filter(o => mapToColumnId(o?.status || o?.estado) === 'material-reception')?.length}</div>
                    <div className="text-sm text-muted-foreground">Órdenes</div>
                  </div>
                  
                  <div className="bg-card border rounded-lg p-4">
                    <div className="flex items-center space-x-2 mb-2">
                      <Icon name="Shield" className="text-orange-500" size={20} />
                      <span className="font-medium">Seguridad</span>
                    </div>
                    <div className="text-2xl font-bold">{workOrders?.filter(o => mapToColumnId(o?.status || o?.estado) === 'safety-checklist')?.length}</div>
                    <div className="text-sm text-muted-foreground">Listas</div>
                  </div>

                  <div className="bg-card border rounded-lg p-4">
                    <div className="flex items-center space-x-2 mb-2">
                      <Icon name="Wrench" className="text-purple-500" size={20} />
                      <span className="font-medium">Fabricación</span>
                    </div>
                    <div className="text-2xl font-bold">{workOrders?.filter(o => mapToColumnId(o?.status || o?.estado) === 'manufacturing')?.length}</div>
                    <div className="text-sm text-muted-foreground">En Proceso</div>
                  </div>

                  <div className="bg-card border rounded-lg p-4">
                    <div className="flex items-center space-x-2 mb-2">
                      <Icon name="CheckCircle" className="text-green-500" size={20} />
                      <span className="font-medium">Calidad</span>
                    </div>
                    <div className="text-2xl font-bold">{workOrders?.filter(o => mapToColumnId(o?.status || o?.estado) === 'quality-control')?.length}</div>
                    <div className="text-sm text-muted-foreground">Revisión</div>
                  </div>

                  <div className="bg-card border rounded-lg p-4">
                    <div className="flex items-center space-x-2 mb-2">
                      <Icon name="Truck" className="text-teal-500" size={20} />
                      <span className="font-medium">Envío</span>
                    </div>
                    <div className="text-2xl font-bold">{workOrders?.filter(o => mapToColumnId(o?.status || o?.estado) === 'ready-shipment')?.length}</div>
                    <div className="text-sm text-muted-foreground">Listos</div>
                  </div>
                </div>

                {/* Main Content Area */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                  {/* Primary Workflow Board */}
                  <div className="lg:col-span-2">
                    {activePanel === 'workflow' && (
                      <WorkflowBoard
                        workOrders={workOrders}
                        onStatusChange={handleOrderStatusChange}
                        onOrderSelect={setSelectedOrder}
                      />
                    )}

                    {activePanel === 'materials' && (
                      <MaterialReceptionPanel
                        workOrders={workOrders?.filter(o => o?.status === 'material-reception')}
                        selectedOrder={selectedOrder}
                        onMaterialReception={handleMaterialReception}
                      />
                    )}

                    {activePanel === 'safety' && (() => {
                      const hasPPEFields = (o) => {
                        if (!o) return false;
                        const keys = ['cascoSeguridad','gafasProteccion','guantesTrabajo','calzadoSeguridad','arnesSeguridad','respiradorN95','chalecoReflectivo','requiereEstudiosMedicosActualizados','safetyChecklistMissing'];
                        for (const k of keys) {
                          if (o[k] !== undefined) return true;
                          if (o.raw && o.raw[k] !== undefined) return true;
                        }
                        return false;
                      };

                      const safetyOrders = (workOrders || []).filter(o => mapToColumnId(o?.status || o?.estado) === 'safety-checklist' || hasPPEFields(o));

                      return (
                        <SafetyChecklistPanel
                          workOrders={safetyOrders}
                          selectedOrder={selectedOrder}
                          onSafetyComplete={handleSafetyChecklist}
                          onLocalMissingChange={(orderId, missingArray) => {
                            try {
                              const key = String(orderId || (selectedOrder?.id || selectedOrder?.ordenTrabajo || ''));
                              setPanelMissingByOrder(prev => ({ ...prev, [key]: Array.isArray(missingArray) ? missingArray : [] }));
                            } catch (e) {}
                          }}
                        />
                      );
                    })()}
                  </div>

                  {/* Secondary Controls Panel */}
                  <div className="space-y-6">
                    {(() => {
                      const cols = ['material-reception','safety-checklist','manufacturing','quality-control','ready-shipment'];
                      const totalActive = cols.reduce((acc, col) => acc + (workOrders?.filter(o => mapToColumnId(o?.status || o?.estado) === col)?.length || 0), 0);
                      return (
                        <WorkflowControls
                          selectedOrder={selectedOrder}
                          currentShift={currentShift}
                          totalOrders={totalActive}
                          workOrdersIds={(workOrders || []).map(o => o?.id || o?.ordenTrabajo || o?.folio)}
                          workOrders={workOrders}
                          onForceRemove={handleForceRemove}
                          onRevertStatus={handleRevertStatus}
                          onSafetyComplete={handleSafetyChecklist}
                          localMissingByOrder={panelMissingByOrder}
                        />
                      );
                    })()}

                    {/* Secondary Panels */}
                    {activePanel === 'attendance' && (
                      <AttendancePanel currentShift={currentShift} />
                    )}

                    {activePanel === 'quality' && (
                      <QualityControlPanel
                        workOrders={workOrders?.filter(o => o?.status === 'quality-control')}
                        onQualityUpdate={handleQualityControl}
                      />
                    )}

                    {activePanel === 'changes' && (
                      <ChangeOrderPanel
                        workOrders={workOrders}
                        onChangeOrder={handleChangeOrder}
                      />
                    )}
                  </div>
                </div>
                {/* Log workOrders on change to help debugging Finalizar */}
                {/* Remove this effect after verification */}
                {(() => {
                  try {
                    // eslint-disable-next-line no-console
                    console.debug('[Workshop] workOrders count:', workOrders?.length, 'ids:', (workOrders || []).map(o => o?.id || o?.ordenTrabajo || o?.folio));
                  } catch (e) {}
                  return null;
                })()}
                {/* Empty State */}
                {workOrders?.length === 0 && !isLoading && (
                  <div className="text-center py-12">
                    <Icon name="Wrench" size={64} className="text-muted-foreground mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-foreground mb-2">No hay órdenes de trabajo</h3>
                    <p className="text-muted-foreground mb-6">
                      Las órdenes aparecerán aquí cuando sean enviadas por el área de Proyectos
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
          );
        };

        export default WorkshopOperationsManagement;