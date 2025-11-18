import React, { useState, useEffect } from 'react';
import Icon from '../../../components/AppIcon';
import Button from '../../../components/ui/Button';
import useRequisi from '../../../hooks/useRequisi';
import useInventario from '../../../hooks/useInventario';
import RequisitionModal from "../components/RequisitionModal";
import { useNotifications } from '../../../context/NotificationContext';

const toISODate = (dateInput) => {
  if (!dateInput) return new Date().toISOString().split('T')[0];
  // Si viene como timestamp numérico
  if (!isNaN(dateInput) && String(dateInput).length >= 10) {
    const d = new Date(Number(dateInput));
    if (!isNaN(d.getTime())) return d.toISOString().split('T')[0];
  }
  // YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateInput)) return dateInput;
  // DD/MM/YYYY -> convert
  if (/^\d{2}\/\d{2}\/\d{4}$/.test(dateInput)) {
    const [d, m, y] = dateInput.split('/');
    return `${y}-${m.padStart(2,'0')}-${d.padStart(2,'0')}`;
  }
  // Try Date parse
  try {
    const d = new Date(dateInput);
    if (!isNaN(d.getTime())) return d.toISOString().split('T')[0];
  } catch (e) {}
  return new Date().toISOString().split('T')[0];
};

// Formatea para mostrar en UI: devuelve string local (es-MX) o '—'
const formatDisplayDate = (dateInput) => {
  if (!dateInput) return '—';
  // Normalizar a Date
  let d;
  if (!isNaN(dateInput) && String(dateInput).length >= 10) d = new Date(Number(dateInput));
  else if (/^\d{2}\/\d{2}\/\d{4}$/.test(dateInput)) {
    const [day, month, year] = dateInput.split('/');
    d = new Date(`${year}-${month}-${day}`);
  } else d = new Date(dateInput);

  if (isNaN(d.getTime())) return String(dateInput);
  return d.toLocaleDateString('es-MX');
};

const InventoryPanel = ({
  onCreatePurchaseOrder,
  onRequestMaterial,
  onCreateRequisition,
  requisitions: externalRequisitions,
  onRequisitionUpdated,
}) => {
  const [activeTab, setActiveTab] = useState('inventory');
  const { showConfirm, showHttpError, showInfo, showOperationSuccess } = useNotifications();
  const { requisitions, loading: loadingRequis, getRequisitions, updateRequisition, deleteRequisition } = useRequisi();
  const { inventario, getInventario, loading: loadingInventario } = useInventario();
  const [localRequisitions, setLocalRequisitions] = useState([]);

  const displayedRequisitions = externalRequisitions?.length > 0 ? externalRequisitions : localRequisitions;

  useEffect(() => { getInventario(); }, []);
  useEffect(() => {
    const fetchRequisitions = async () => {
      const data = await getRequisitions();
      setLocalRequisitions(data);
    };
    fetchRequisitions();
  }, []);

  useEffect(() => {
    if (externalRequisitions?.length > 0) setLocalRequisitions(externalRequisitions);
  }, [externalRequisitions]);

  const getStockStatus = (currentStock, reorderPoint) => {
    if (currentStock <= 0) return 'Crítico';
    if (currentStock <= reorderPoint) return 'Bajo Stock';
    return 'En Stock';
  };

  const getStockStatusColor = (status) => {
    switch (status) {
      case 'Crítico': return 'bg-red-100 text-red-800';
      case 'Bajo Stock': return 'bg-orange-100 text-orange-800';
      case 'En Stock': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getRequestStatusColor = (status) => {
    switch (status) {
      case 'Pendiente': return 'bg-yellow-100 text-yellow-800';
      case 'Aprobada': return 'bg-green-100 text-green-800';
      case 'Rechazada': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const handleApprove = async (request) => {
    try {
      const updated = await updateRequisition(request.id, { estado: 'Aprobada' });
      if (!updated) return;
      const updatedList = localRequisitions.map((r) => r.id === request.id ? { ...r, estado: 'Aprobada' } : r);
      setLocalRequisitions(updatedList);
      onRequisitionUpdated?.(updatedList);
      showOperationSuccess();
    } catch (error) {
      showHttpError(error, "Error al aprobar la requisición");
    }
  };

  const handleReject = async (request) => {
    try {
      const updated = await updateRequisition(request.id, { estado: 'Rechazada' });
      if (!updated) return;
      const updatedList = localRequisitions.map((r) => r.id === request.id ? { ...r, estado: 'Rechazada' } : r);
      setLocalRequisitions(updatedList);
      onRequisitionUpdated?.(updatedList);
      showOperationSuccess();
    } catch (error) {
      showHttpError(error, "Error al rechazar la requisición");
    }
  };

  const handleDelete = (request) => {
    showConfirm(`¿Seguro que deseas eliminar la requisición "${request.numeroOrdenTrabajo}"?`, {
      onConfirm: async () => {
        try {
          const success = await deleteRequisition(request.id);
          if (!success) return;
          const updatedList = localRequisitions.filter((r) => r.id !== request.id);
          setLocalRequisitions(updatedList);
          onRequisitionUpdated?.(updatedList);
        } catch (error) {
          showHttpError(error, "Error al eliminar la requisición");
        }
      },
      onCancel: () => showInfo("Eliminación cancelada"),
    });
  };

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedRequisition, setSelectedRequisition] = useState(null);

  const handleEditRequisition = (req) => {
  const mappedReq = {
    id: req.id,
    orderNumber: req.numeroOrdenTrabajo || "",
    projectName: req.nombreProyecto || "",
    requestedBy: req.solicitadoPor || "",
    requestDate: toISODate(req.fechaSolicitud),
    status: req.estado || "Pendiente",
    priority: req.prioridad || "Media",
    description: req.descripcionSolicitud || "",

    //  materiales de inventario
    items: req.materiales?.map((m) => ({
      id: Date.now() + Math.random(),
      idArticulo: m.id || m.idArticulo || "", // mantiene referencia al inventario
      codigoArticulo: m.codigoArticulo || "",
      name: m.nombreMaterial || m.nombre || "", // admite ambos nombres
      quantity: m.cantidad,
      unit: m.unidad?.toLowerCase() || "unidades",
      urgency: m.urgencia || "Normal",
      description: m.descripcionEspecificaciones || "",
      type: "inventario",
    })) || [],

    //  materiales manuales
    manualItems: req.materialesManuales?.map((m) => ({
      id: Date.now() + Math.random(),
      name: m.nombreMaterial || m.nombre || "",
      quantity: m.cantidad || 1,
      unit: m.unidad || "pieza",
      urgency: m.urgencia || "Normal",
      description: m.descripcionEspecificaciones || "",
      type: "manual",
    })) || [],

    justification: req.justificacionSolicitud || "",
    notes: req.notasAdicionales || "",
  };

  setSelectedRequisition(mappedReq);
  setIsModalOpen(true);
};


  const handleSaveRequisition = (updatedReq) => {
    const updatedList = localRequisitions.map((r) => (r.id === updatedReq.id ? updatedReq : r));
    setLocalRequisitions(updatedList);
    onRequisitionUpdated?.(updatedList);
    setIsModalOpen(false);
  };

  return (
    <div className="bg-card border border-border rounded-lg overflow-hidden h-[600px]">
      {/* Tabs */}
      <div className="border-b border-border">
        <div className="flex">
          <button
            onClick={() => setActiveTab('inventory')}
            className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'inventory' ? 'border-primary text-primary bg-primary/5' : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            <div className="flex items-center space-x-2">
              <Icon name="Package" size={16} />
              <span>Inventario</span>
            </div>
          </button>

          <button
            onClick={() => setActiveTab('requests')}
            className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'requests' ? 'border-primary text-primary bg-primary/5' : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            <div className="flex items-center space-x-2">
              <Icon name="ClipboardList" size={16} />
              <span>Requisiciones</span>
            </div>
          </button>
        </div>
      </div>

      {/* Contenido */}
      <div className="p-4 h-[calc(100%-48px)]">
        {/* INVENTARIO */}
        {activeTab === 'inventory' && (
          <div className="space-y-4 h-full overflow-y-auto">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-foreground">Estado del Inventario</h3>
              <Button variant="outline" size="sm" iconName="RefreshCw" iconSize={16} onClick={getInventario}>
                Actualizar
              </Button>
            </div>

            {loadingInventario ? (
              <p className="text-sm text-muted-foreground">Cargando inventario...</p>
            ) : inventario.length === 0 ? (
              <p className="text-sm text-muted-foreground">No hay artículos en el inventario.</p>
            ) : (
              <div className="space-y-3">
                {inventario.map((item) => {
                  const nombre = item.descripcion || item.description || item.codigoArticulo || 'Artículo sin nombre';
                  const stock = item.stockActual ?? 0;
                  const puntoReorden = item.puntoReorden ?? 0;
                  const unidad = item.unidad ?? '';
                  const ubicacion = item.ubicacion ?? 'Sin ubicación';
                  const estado = getStockStatus(stock, puntoReorden);

                  return (
                    <div key={item.id} className="border border-border rounded-lg p-4">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex-1">
                          <h4 className="text-sm font-medium text-foreground">{nombre}</h4>
                          <p className="text-xs text-muted-foreground">SKU: {item.codigoArticulo || 'N/A'}</p>
                        </div>
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStockStatusColor(estado)}`}>{estado}</span>
                      </div>
                      <div className="grid grid-cols-2 gap-4 mb-3">
                        <div>
                          <p className="text-xs text-muted-foreground">Stock Actual</p>
                          <p className="text-sm font-medium text-foreground">{stock} {unidad}</p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">Punto de Reorden</p>
                          <p className="text-sm font-medium text-foreground">{puntoReorden} {unidad}</p>
                        </div>
                      </div>
                      <div className="flex items-center justify-between">
                        <div className="text-xs text-muted-foreground">
                          <Icon name="MapPin" size={12} className="inline mr-1" />
                          {ubicacion}
                        </div>
                        {(estado === 'Crítico' || estado === 'Bajo Stock') && (
                          <Button variant="outline" size="sm" onClick={() => onCreatePurchaseOrder(item)} iconName="ShoppingCart" iconSize={14}>Ordenar</Button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* REQUISICIONES */}
        {activeTab === 'requests' && (
          <div className="space-y-4 h-full overflow-y-auto">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-foreground">Requisiciones de Material</h3>
              <Button variant="default" size="sm" iconName="Plus" iconSize={16} onClick={onCreateRequisition}>
                Nueva Requisición
              </Button>
            </div>

            {loadingRequis ? (
              <p>Cargando requisiciones...</p>
            ) : (
              <div className="space-y-3">
                {displayedRequisitions.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No hay requisiciones disponibles.</p>
                ) : (
                  displayedRequisitions.map((request) => {
                    // Debug - ver estructura de datos
                    console.log('Requisición completa:', request);
                    console.log('Materiales inventario:', request.materiales);
                    console.log('Materiales manuales:', request.materialesManuales);
                    
                    // Normalizar materiales de inventario
                    const materialesInventario = request.materiales || request.items || [];
                    
                    // Normalizar materiales manuales
                    const materialesManuales = request.materialesManuales || request.manualItems || [];
                    
                    const allMaterials = [
                      ...materialesInventario,
                      ...materialesManuales
                    ];

                    return (
                      <div key={request.id} className="border border-border rounded-lg p-4 shadow-sm transition-all duration-300 hover:shadow-md">
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex-1">
                            <h4 className="text-sm font-medium text-foreground">{request.numeroOrdenTrabajo}</h4>
                            <p className="text-xs text-muted-foreground">{request.nombreProyecto}</p>
                          </div>
                          <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getRequestStatusColor(request.estado)}`}>{request.estado}</span>
                        </div>

                        <div className="mb-3">
                          <p className="text-xs text-muted-foreground mb-2">Materiales Solicitados:</p>
                          {allMaterials.length > 0 ? (
                            <div className="space-y-2">
                              {/* Materiales del Inventario */}
                              {materialesInventario.length > 0 && (
                                <div>
                                  <p className="text-xs font-medium text-blue-700 mb-1 flex items-center">
                                    <Icon name="Package" size={12} className="mr-1" />
                                    Del Inventario ({materialesInventario.length})
                                  </p>
                                  <ul className="space-y-1 ml-4">
                                    {materialesInventario.map((item, index) => (
                                      <li key={index} className="text-xs text-foreground flex items-start space-x-2">
                                        <span className="text-blue-600 mt-0.5">•</span>
                                        <span>
                                          <span className="font-medium">{item.nombreMaterial || item.nombre || item.name}</span>
                                          {item.codigoArticulo && (
                                            <span className="text-muted-foreground text-[10px]"> ({item.codigoArticulo})</span>
                                          )}
                                          <span className="text-muted-foreground"> - {item.cantidad || item.quantity} {item.unidad || item.unit}</span>
                                          {item.urgencia && item.urgencia !== 'Normal' && (
                                            <span className={`ml-1 text-[10px] px-1 py-0.5 rounded ${
                                              item.urgencia === 'Urgente' || item.urgencia === 'Crítica' 
                                                ? 'bg-red-100 text-red-700' 
                                                : 'bg-orange-100 text-orange-700'
                                            }`}>
                                              {item.urgencia}
                                            </span>
                                          )}
                                        </span>
                                      </li>
                                    ))}
                                  </ul>
                                </div>
                              )}
                              
                              {/* Materiales Manuales */}
                              {materialesManuales.length > 0 && (
                                <div>
                                  <p className="text-xs font-medium text-green-700 mb-1 flex items-center">
                                    <Icon name="Edit3" size={12} className="mr-1" />
                                    Manuales ({materialesManuales.length})
                                  </p>
                                  <ul className="space-y-1 ml-4">
                                    {materialesManuales.map((item, index) => (
                                      <li key={index} className="text-xs text-foreground flex items-start space-x-2">
                                        <span className="text-green-600 mt-0.5">•</span>
                                        <span>
                                          <span className="font-medium">{item.nombreMaterial || item.nombre || item.name}</span>
                                          <span className="text-muted-foreground"> - {item.cantidad || item.quantity} {item.unidad || item.unit}</span>
                                          {item.urgencia && item.urgencia !== 'Normal' && (
                                            <span className={`ml-1 text-[10px] px-1 py-0.5 rounded ${
                                              item.urgencia === 'Urgente' || item.urgencia === 'Crítica' 
                                                ? 'bg-red-100 text-red-700' 
                                                : 'bg-orange-100 text-orange-700'
                                            }`}>
                                              {item.urgencia}
                                            </span>
                                          )}
                                        </span>
                                      </li>
                                    ))}
                                  </ul>
                                </div>
                              )}
                            </div>
                          ) : (
                            <p className="text-xs text-muted-foreground">No se han agregado materiales aún.</p>
                          )}
                        </div>

                        <div className="flex items-center justify-between">
                          <div className="text-xs text-muted-foreground">
                            <Icon name="User" size={12} className="inline mr-1" />
                              {request.solicitadoPor} • {formatDisplayDate(request.fechaSolicitud)}
                          </div>

                          <div className="flex flex-col items-center gap-2 mt-2">
                            <div className="flex items-center justify-center gap-2">
                              <Button variant="outline" size="sm" iconName="Edit" iconSize={16} onClick={() => handleEditRequisition(request)} className="p-2 border-gray-300 hover:bg-gray-100" title="Editar" />
                              <Button variant="outline" size="sm" iconName="Trash2" iconSize={16} onClick={() => handleDelete(request)} className="p-2 text-red-600 border-gray-300 hover:bg-red-50" title="Eliminar" />
                            </div>

                            {request.estado === "Pendiente" && (
                              <div className="flex justify-center gap-2 mt-1">
                                <Button variant="outline" size="sm" iconName="X" iconSize={14} onClick={() => handleReject(request)} className="min-w-[100px] text-gray-700 border-gray-400 hover:bg-gray-100">Rechazar</Button>
                                <Button variant="default" size="sm" iconName="Check" iconSize={14} onClick={() => handleApprove(request)} className="min-w-[100px]">Aprobar</Button>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Modal */}
      <RequisitionModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        requisition={selectedRequisition}
        onSave={handleSaveRequisition}
      />
    </div>
  );
};

export default InventoryPanel;
