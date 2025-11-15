import React, { useState, useEffect } from 'react';
import OrderDetailsModal from './components/OrderDetailsModal';
import Header from '../../components/ui/Header';
import Sidebar from '../../components/ui/Sidebar';
import Breadcrumb from '../../components/ui/Breadcrumb';
import ordenCompraService from '../../services/ordenCompraService';
import InventoryTable from './components/InventoryTable';
import InventoryFilters from './components/InventoryFilters';
import StockAlerts from './components/StockAlerts';
import PurchaseOrderPanel from './components/PurchaseOrderPanel';
import MaterialRequirements from './components/MaterialRequirements';
import InventoryStats from './components/InventoryStats';
import NewItemModal from './components/NewItemModal';
import ItemDetailsModal from './components/ItemDetailsModal';
import EditItemModal from './components/EditItemModal';
import CreatePOModal from './components/CreatePOModal';
import Icon from '../../components/AppIcon';
import Button from '../../components/ui/Button';
import RequisitionModal from '../work-order-processing/components/RequisitionModal';
import useInventory from '../../hooks/useInventory';
import useOrder from '../../hooks/useOrder';
import useRequisi from '../../hooks/useRequisi';
import { useNotifications } from '../../context/NotificationContext';
// Función auxiliar para formatear fechas
const formatDate = (dateString) => {
  if (!dateString) return '';
  
  // Si ya está en formato YYYY-MM-DD, lo devolvemos tal cual
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateString)) return dateString;
  
  // Si está en formato DD/MM/YYYY, lo convertimos
  const parts = dateString.split('/');
  if (parts.length === 3) {
    const [day, month, year] = parts;
    return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
  }
  
  // Si es una fecha válida, la convertimos a YYYY-MM-DD
  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return '';
    return date.toISOString().split('T')[0];
  } catch {
    return '';
  }
};

const InventoryManagement = () => {
  const { showSuccess, showError, showConfirm } = useNotifications();
  const { articulos, getArticulos, loading: inventoryLoading, error: inventoryError } = useInventory();
  const { 
    ordenes, 
    loading: orderLoading, 
    error: orderError,
    createOrden,
    getOrdenes,
    updateOrden 
  } = useOrder();
  const {
    requisitions,
    loading: requisitionsLoading,
    error: requisitionsError,
    getRequisitions,
    updateRequisition,
    deleteRequisition
  } = useRequisi();
  
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [activeView, setActiveView] = useState('overview');
  const [showNewItemModal, setShowNewItemModal] = useState(false);
  const [showItemDetailsModal, setShowItemDetailsModal] = useState(false);
  const [showEditItemModal, setShowEditItemModal] = useState(false);
  const [showCreatePOModal, setShowCreatePOModal] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [showOrderDetailsModal, setShowOrderDetailsModal] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [isUpdating, setIsUpdating] = useState(false);
  const [showItemSelectorModal, setShowItemSelectorModal] = useState(false); // ✅ Modal de selección
  const loading = inventoryLoading || orderLoading || requisitionsLoading || isUpdating;
  const error = inventoryError || orderError;
  const [filters, setFilters] = useState({
    search: '',
    category: '',
    status: '',
    supplier: '',
    location: '',
    minStock: '',
    maxStock: '',
    quickFilter: ''
  });

  // Transformar los artículos del backend al formato esperado por los componentes
  const inventoryItems = React.useMemo(() => {
    return articulos.map(articulo => ({
      id: articulo.id,
      itemCode: articulo.codigoArticulo,
      name: articulo.nombre || '',
      description: articulo.descripcion,
      specifications: articulo.especificaciones || 'Sin especificaciones',
      category: articulo.categoria,
      currentStock: articulo.stockActual,
      reservedStock: articulo.stockReservado || 0,
      reorderPoint: articulo.puntoReorden,
      unit: articulo.unidad,
      supplier: {
        name: articulo.proveedor?.nombre || articulo.nombreProveedor || 'Sin proveedor',
        contact: articulo.proveedor?.contacto || articulo.contactoProveedor || 'Sin contacto'
      },
      location: articulo.ubicacion,
      lastUpdated: new Date(articulo.fechaActualizacion || articulo.fechaCreacion),
      unitCost: articulo.costoUnitario,
      notes: articulo.notas
    }));
  }, [articulos]);

  // Generar alertas dinámicas basadas en los artículos reales
  const stockAlerts = React.useMemo(() => {
    return inventoryItems
      .filter(item => {
        const currentStock = item.currentStock || 0;
        const reorderPoint = item.reorderPoint || 0;
        return currentStock === 0 || currentStock <= reorderPoint;
      })
      .map((item, index) => {
        const currentStock = item.currentStock || 0;
        const reorderPoint = item.reorderPoint || 0;
        const description = item.description || 'Artículo sin descripción';
        const itemCode = item.itemCode || 'Sin código';
        const unit = item.unit || 'pcs';
        const supplierName = item.supplier?.name || 'Sin proveedor';
        
        return {
          id: index + 1,
          type: currentStock === 0 ? 'out-of-stock' : 'low-stock',
          title: currentStock === 0 
            ? `${description} Agotado`
            : `${description} en Stock Bajo`,
          message: currentStock === 0
            ? `El artículo ${itemCode} está completamente agotado.`
            : `Solo quedan ${currentStock} ${unit} disponibles, por debajo del punto de reorden de ${reorderPoint} ${unit}.`,
          itemCode: itemCode,
          currentStock: currentStock,
          reorderPoint: reorderPoint,
          unit: unit,
          supplier: supplierName,
          createdAt: new Date()
        };
      });
  }, [inventoryItems]);

  // Artículos con stock bajo para órdenes de compra
  const lowStockItems = React.useMemo(() => {
    return inventoryItems.filter(item => {
      const currentStock = item.currentStock || 0;
      const reorderPoint = item.reorderPoint || 0;
      return currentStock === 0 || currentStock <= reorderPoint;
    });
  }, [inventoryItems]);

  // Material requirements - to be implemented with backend
  const materialRequirements = [];

  // Calcular estadísticas dinámicas basadas en los artículos reales
  const inventoryStats = React.useMemo(() => {
    const totalItems = inventoryItems.length;
    const totalValue = inventoryItems.reduce((sum, item) => {
      const unitCost = item.unitCost || 0;
      const currentStock = item.currentStock || 0;
      return sum + (unitCost * currentStock);
    }, 0);
    const lowStockItems = inventoryItems.filter(item => {
      const currentStock = item.currentStock || 0;
      const reorderPoint = item.reorderPoint || 0;
      return currentStock > 0 && currentStock <= reorderPoint;
    }).length;
    const outOfStockItems = inventoryItems.filter(item => (item.currentStock || 0) === 0).length;
    
    // Agrupar por categorías
    const categoryGroups = inventoryItems.reduce((acc, item) => {
      if (item.category) {
        const category = item.category.toLowerCase().replace(/\s+/g, '');
        acc[category] = (acc[category] || 0) + 1;
      }
      return acc;
    }, {});

    return {
      totalItems,
      totalValue,
      lowStockItems,
      outOfStockItems,
      itemsChange: 0, // Podrías implementar lógica para calcular cambios
      valueChange: 0,
      lowStockChange: 0,
      outOfStockChange: 0,
      categories: categoryGroups
    };
  }, [inventoryItems]);

  // Filter inventory items based on current filters
  const filteredItems = inventoryItems?.filter(item => {
    if (filters?.search && !item?.description?.toLowerCase()?.includes(filters?.search?.toLowerCase()) &&
        !item?.itemCode?.toLowerCase()?.includes(filters?.search?.toLowerCase())) {
      return false;
    }
    if (filters?.category && item?.category !== filters?.category) return false;
    if (filters?.supplier && item?.supplier?.name !== filters?.supplier) return false;
    if (filters?.location && item?.location !== filters?.location) return false;
    if (filters?.minStock && item?.currentStock < parseInt(filters?.minStock)) return false;
    if (filters?.maxStock && item?.currentStock > parseInt(filters?.maxStock)) return false;
    
    if (filters?.status) {
      const stockStatus = item?.currentStock === 0 ? 'out-of-stock' :
                         item?.currentStock <= item?.reorderPoint ? 'low-stock' : 'in-stock';
      if (stockStatus !== filters?.status) return false;
    }
    
    if (filters?.quickFilter) {
      const stockStatus = item?.currentStock === 0 ? 'out-of-stock' :
                         item?.currentStock <= item?.reorderPoint ? 'low-stock' : 'in-stock';
      if (filters?.quickFilter !== stockStatus && filters?.quickFilter !== 'reserved') return false;
    }
    
    return true;
  });

  const handleFiltersChange = (newFilters) => {
    setFilters(newFilters);
  };

  const handleClearFilters = () => {
    setFilters({
      search: '',
      category: '',
      status: '',
      supplier: '',
      location: '',
      minStock: '',
      maxStock: '',
      quickFilter: ''
    });
  };

  const handleViewDetails = (item) => {
    console.log('View item details:', item);
    setSelectedItem(item);
    setShowItemDetailsModal(true);
  };

  const handleUpdateStock = (item) => {
    console.log('Update stock for:', item);
    
    // Si el item viene de una alerta (tiene la propiedad 'type'), 
    // buscar el artículo completo en el inventario por itemCode
    if (item.type && (item.type === 'out-of-stock' || item.type === 'low-stock')) {
      const inventoryItem = inventoryItems.find(invItem => invItem.itemCode === item.itemCode);
      if (inventoryItem) {
        setSelectedItem(inventoryItem);
      } else {
        console.error('No se encontró el artículo en el inventario:', item.itemCode);
        setSelectedItem(item); // Fallback al item original
      }
    } else {
      // Es un item directo del inventario
      setSelectedItem(item);
    }
    
    setShowEditItemModal(true);
  };

  const handleCreatePO = (item) => {
    // Si recibimos un objeto de alerta, necesitamos encontrar el artículo real de inventario
    if (item.type && (item.type === 'out-of-stock' || item.type === 'low-stock')) {
      // Buscar el artículo correspondiente por itemCode en el inventario
      const inventoryItem = inventoryItems.find(invItem => invItem.itemCode === item.itemCode);
      if (inventoryItem) {
        setSelectedItem(inventoryItem);
      } else {
        setSelectedItem(item); // Fallback si no se encuentra
      }
    } else {
      // Es un ítem directo del inventario
      setSelectedItem(item);
    }
    setShowCreatePOModal(true);
  };

  // Handlers para cerrar modales
  const handleCloseItemDetailsModal = () => {
    setShowItemDetailsModal(false);
    setSelectedItem(null);
  };

  const handleCloseEditItemModal = () => {
    setShowEditItemModal(false);
    setSelectedItem(null);
  };

  const handleClosePOModal = () => {
    setShowCreatePOModal(false);
    setSelectedItem(null);
    // No necesitamos resetear el estado del modal aquí,
    // ya que useEffect en el modal se encarga de eso cuando cambia initialItem
  };

  const handleSubmitPO = async (orderData) => {
    try {
      // Crear la orden en el backend
      await createOrden({
        ...orderData,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        estado: 'pending'  // Cambiado de status a estado para coincidir con el backend
      });

      // Recargar las órdenes para obtener la lista actualizada
      await getOrdenes();
      
      // Cerrar el modal y cambiar a la vista de órdenes
      setShowCreatePOModal(false);
      setSelectedItem(null);
      setActiveView('orders');
    } catch (error) {
      console.error('Error al crear la orden de compra:', error);
    }
  };

  // Handler para actualización exitosa
  const handleUpdateSuccess = async () => {
    try {
      await getArticulos(); // Recargar la lista de artículos
    } catch (error) {
      console.error('Error recargando artículos después de actualizar:', error);
    }
  };

  const handleApproveRequirement = (requirement) => {
    console.log('Approve requirement:', requirement);
  };

  const handleRejectRequirement = (requirement) => {
    console.log('Reject requirement:', requirement);
  };

  const handleDismissAlert = (alertId) => {
    console.log('Dismiss alert:', alertId);
  };

  // Manejadores para requisiciones
  const [selectedRequisition, setSelectedRequisition] = useState(null);
  const [showRequisitionModal, setShowRequisitionModal] = useState(false);

  const openRequisitionModal = (req) => {
  setSelectedRequisition(req);
  setIsRequisitionModalOpen(true);
};


const handleViewRequisition = (req) => {
  const reqForView = {
    id: req.id,
    orderNumber: req.numeroOrdenTrabajo,
    projectName: req.nombreProyecto,
    requestedBy: req.solicitadoPor,
    requestDate: req.fechaSolicitud,
    status: req.estado || 'Pendiente',
    priority: req.prioridad || 'Normal',
    description: req.descripcionSolicitud,
    items: req.materiales?.map(m => ({
      id: m.id || Date.now(),
      name: m.nombreMaterial,
      quantity: m.cantidad,
      unit: m.unidad,
      description: m.descripcionEspecificaciones,
      urgency: m.urgencia,
    })) || [],
    manualItems: req.materialesManuales?.map(m => ({
      id: m.id || Date.now(),
      name: m.nombreMaterial,
      quantity: m.cantidad,
      unit: m.unidad,
      description: m.descripcionEspecificaciones,
      urgency: m.urgencia,
    })) || [],
    justification: req.justificacionSolicitud,
    notes: req.notasAdicionales
  };

  setSelectedRequisition(reqForView);
  setViewOnly(true);   // 👈 MUY IMPORTANTE
  setShowRequisitionModal(true);
};





  const handleEditRequisition = (req) => {
    const reqForEdit = {
      id: req.id,
      orderNumber: req.numeroOrdenTrabajo,
      projectName: req.nombreProyecto,
      requestedBy: req.solicitadoPor,
      requestDate: req.fechaSolicitud,
      status: req.estado || 'Pendiente',
      priority: req.prioridad || 'Normal',
      description: req.descripcionSolicitud,
      items: req.materiales?.map(m => ({
        id: m.id || Date.now(),
        name: m.nombreMaterial,
        quantity: m.cantidad,
        unit: m.unidad,
        description: m.descripcionEspecificaciones
      })) || [],
      justification: req.justificacionSolicitud,
      notes: req.notasAdicionales
    };

    setSelectedRequisition(reqForEdit);
    setShowRequisitionModal(true);
    setViewOnly(false); 
  };

  

  const handleSaveRequisition = async (editedReq) => {
    try {
      setIsUpdating(true);
      // Convertir de nuevo al formato español para el backend
      const reqToUpdate = {
        id: editedReq.id,
        numeroOrdenTrabajo: editedReq.orderNumber,
        nombreProyecto: editedReq.projectName,
        solicitadoPor: editedReq.requestedBy,
        fechaSolicitud: formatDate(editedReq.requestDate),
        estado: editedReq.status,
        prioridad: editedReq.priority,
        descripcionSolicitud: editedReq.description,
        materiales: editedReq.items?.map(item => ({
          id: item.id,
          nombreMaterial: item.name,
          cantidad: item.quantity,
          unidad: item.unit,
          descripcionEspecificaciones: item.description
        })),
        justificacionSolicitud: editedReq.justification,
        notasAdicionales: editedReq.notes
      };

      const success = await updateRequisition(reqToUpdate.id, reqToUpdate);
      if (success) {
        showSuccess('Requisición actualizada correctamente');
        await getRequisitions();
        setShowRequisitionModal(false);
        setSelectedRequisition(null);
      } else {
        showError('No se pudo actualizar la requisición');
      }
    } catch (error) {
      console.error('Error al actualizar requisición:', error);
      showError('Error al actualizar la requisición');
    } finally {
      setIsUpdating(false);
    }
  };

  const handleDelete = async (req) => {
    showConfirm(
      `¿Está seguro que desea eliminar la requisición ${req.numeroOrdenTrabajo || 'seleccionada'}?`,
      {
        onConfirm: async () => {
          try {
            setIsUpdating(true);
            const success = await deleteRequisition(req.id);
            if (success) {
              showSuccess('Requisición eliminada correctamente');
              await getRequisitions();
            } else {
              showError('No se pudo eliminar la requisición');
            }
          } catch (error) {
            console.error('Error al eliminar requisición:', error);
            showError('Error al eliminar la requisición');
          } finally {
            setIsUpdating(false);
          }
        }
      }
    );
  };

  const handleViewOrder = (order) => {
    setSelectedOrder(order);
    setShowOrderDetailsModal(true);
  };

  const handleCloseOrderDetails = () => {
    setShowOrderDetailsModal(false);
    setSelectedOrder(null);
  };

  const handleDownloadOrder = async (order) => {
    try {
      // Crear el contenido del PDF-like
      const content = `
ORDEN DE COMPRA ${order.numeroOrden}
=============================
Fecha: ${new Date(order.fechaCreacion).toLocaleDateString()}
Proveedor: ${order.proveedor.nombre}
Estado: ${order.estado}
${order.esUrgente ? 'URGENTE\n' : ''}

ARTÍCULOS:
${order.articulos.map(item => `
${item.codigoArticulo} - ${item.descripcion}
Cantidad: ${item.cantidadOrdenada} ${item.unidad}
Precio unitario: ${item.costoUnitario.toLocaleString('es-MX', { style: 'currency', currency: 'MXN' })}
Subtotal: ${item.subtotal.toLocaleString('es-MX', { style: 'currency', currency: 'MXN' })}
`).join('\n')}

TOTAL: ${order.totalOrden.toLocaleString('es-MX', { style: 'currency', currency: 'MXN' })}

Notas:
${order.notas || 'Sin notas adicionales'}
`;

      // Crear y descargar el archivo
      const blob = new Blob([content], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `orden-compra-${order.numeroOrden}.txt`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error al descargar la orden:', error);
    }
  };

  const handleDeleteOrder = async (order) => {
    try {
      await ordenCompraService.deleteOrden(order.id);
      await getOrdenes(); // Recargar la lista
    } catch (error) {
      console.error('Error al eliminar la orden:', error);
    }
  };

  const handleApproveOrder = async (order) => {
    try {
      await updateOrden(order.id, {
        ...order,
        status: 'approved',
        updatedAt: new Date().toISOString()
      });
      await getOrdenes(); // Recargar la lista de órdenes
    } catch (error) {
      console.error('Error al aprobar la orden:', error);
    }
  };

  const handleCreateOrder = () => {
    setSelectedItem(null);
    setShowCreatePOModal(true);
  };

  const handleExport = async () => {
    try {
      // Función auxiliar para escapar valores CSV correctamente
      const escapeCSV = (value) => {
        if (value === null || value === undefined) return '""';
        const stringValue = String(value);
        // Escapar comillas dobles duplicándolas
        const escapedValue = stringValue.replace(/"/g, '""');
        // SIEMPRE encerrar en comillas para evitar problemas con comas y caracteres especiales
        return `"${escapedValue}"`;
      };

      // Create CSV content
      const csvHeaders = [
        'Código',
        'Nombre',
        'Descripción',
        'Categoría',
        'Stock Actual',
        'Stock Reservado',
        'Punto de Reorden',
        'Unidad',
        'Ubicación',
        'Proveedor',
        'Contacto Proveedor',
        'Costo Unitario',
        'Valor Total',
        'Última Actualización'
      ];
      
      const csvRows = inventoryItems?.map(item => [
        escapeCSV(item?.itemCode),
        escapeCSV(item?.name),
        escapeCSV(item?.description),
        escapeCSV(item?.category),
        escapeCSV(item?.currentStock),
        escapeCSV(item?.reservedStock || 0),
        escapeCSV(item?.reorderPoint),
        escapeCSV(item?.unit),
        escapeCSV(item?.location),
        escapeCSV(item?.supplier?.name),
        escapeCSV(item?.supplier?.contact),
        escapeCSV(item?.unitCost),
        escapeCSV(item?.currentStock * item?.unitCost),
        escapeCSV(new Date(item?.lastUpdated).toLocaleDateString('es-MX'))
      ]);

      const csvContent = [
        csvHeaders.map(h => escapeCSV(h)).join(','),
        ...csvRows.map(row => row.join(','))
      ].join('\n');

      // Agregar BOM (Byte Order Mark) UTF-8 para que Excel reconozca la codificación
      const BOM = '\uFEFF';
      const csvWithBOM = BOM + csvContent;

      // Download CSV file con codificación UTF-8
      const blob = new Blob([csvWithBOM], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `inventario-${new Date()?.toISOString()?.split('T')?.[0]}.csv`;
      document.body?.appendChild(link);
      link?.click();
      document.body?.removeChild(link);
      URL.revokeObjectURL(url);

      console.log('Inventario exportado exitosamente');
    } catch (error) {
      console.error('Error al exportar inventario:', error);
    }
  };

  const handleImportInventory = () => {
    // Create file input
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.csv,.xlsx,.xls';
    
    input.onchange = (e) => {
      const file = e?.target?.files?.[0];
      if (file) {
        console.log('Importando archivo:', file?.name);
        // In a real app, you would parse the file and add items
        // For now, simulate adding some sample items
        const sampleItems = [
          {
            id: Date.now() + 1,
            itemCode: 'IMP-001',
            description: 'Artículo Importado 1',
            specifications: 'Importado desde archivo CSV',
            category: 'Importados',
            currentStock: 10,
            reservedStock: 0,
            reorderPoint: 5,
            unit: 'pcs',
            supplier: { name: 'Proveedor Importado', contact: 'import@proveedor.com' },
            location: 'Almacén Principal',
            lastUpdated: new Date(),
            unitCost: 1000
          }
        ];
        setInventoryItems(prev => [...prev, ...sampleItems]);
        console.log('Archivo importado exitosamente');
      }
    };
    
    input?.click();
  };

  const handleAddNewItem = async (newItem) => {
    try {
      // El artículo ya fue creado en el backend por el NewItemModal
      // Solo necesitamos refrescar la lista de artículos
      await getArticulos();
      
      // If we're not on the inventory view, switch to it to show the new item
      if (activeView !== 'inventory') {
        setActiveView('inventory');
      }
      
      return Promise.resolve();
    } catch (error) {
      console.error('Error refreshing inventory after adding new item:', error);
      return Promise.reject(error);
    }
  };

  const handleOpenNewItemModal = () => {
    setShowNewItemModal(true);
  };

  const handleCloseNewItemModal = () => {
    setShowNewItemModal(false);
  };


  const viewTabs = [
    { id: 'overview', label: 'Resumen', icon: 'LayoutDashboard' },
    { id: 'inventory', label: 'Inventario', icon: 'Package' },
    { id: 'alerts', label: 'Alertas', icon: 'AlertTriangle' },
    { id: 'orders', label: 'Órdenes', icon: 'ShoppingCart' },
    { id: 'requirements', label: 'Requisiciones', icon: 'ClipboardList' }
  ];

  // Cargar datos al montar el componente
  useEffect(() => {
    let isMounted = true;

    const fetchData = async () => {
      if (!isInitialLoading) return;

      try {
        // Cargar órdenes primero ya que parece funcionar correctamente
        await getOrdenes();

        if (isMounted) {
          // Luego intentar cargar artículos y requisiciones en paralelo
          await Promise.allSettled([
            getArticulos().catch(err => {
              console.warn('Error al cargar artículos:', err);
              return [];
            }),
            getRequisitions().catch(err => {
              console.warn('Error al cargar requisiciones:', err);
              return [];
            })
          ]);
        }
      } catch (error) {
        console.warn('Error en la carga inicial:', error);
      } finally {
        if (isMounted) {
          setIsInitialLoading(false);
        }
      }
    };

    fetchData();

    return () => {
      isMounted = false;
    };
  }, []);

  // Recargar datos solo cuando se cambia a la pestaña de requisiciones
  useEffect(() => {
    if (activeView === 'requirements' && !loading) {
      getRequisitions();
    }
  }, [activeView]);

  useEffect(() => {
    document.title = 'Gestión de Inventario - AireFlow Pro';
  }, []);

  
  return (
    <div className="min-h-screen bg-background">
      <Header 
        onMenuToggle={() => setMobileMenuOpen(!mobileMenuOpen)}
        isMenuOpen={mobileMenuOpen}
      />
      <Sidebar 
        isCollapsed={sidebarCollapsed}
        onToggle={() => setSidebarCollapsed(!sidebarCollapsed)}
      />
      <main className={`transition-all duration-300 ${
        sidebarCollapsed ? 'lg:ml-16' : 'lg:ml-60'
      }`}>
        <div className="p-6">
          <Breadcrumb />
          
          {/* Page Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 sm:mb-8 space-y-4 sm:space-y-0">
            <div className="min-w-0 flex-1">
              <h1 className="text-2xl sm:text-3xl font-bold text-foreground mb-2">
                Gestión de Inventario
              </h1>
              <p className="text-sm sm:text-base text-muted-foreground">
                Control integral de partes, materiales y recursos para proyectos de Aire Acondicionado
              </p>
            </div>
            
            <div className="flex items-center space-x-2 sm:space-x-3 flex-shrink-0">
              <Button
                variant="outline"
                onClick={handleImportInventory}
                iconName="Upload"
                iconSize={16}
                className="text-sm"
              >
                <span className="hidden sm:inline">Importar</span>
                <span className="sm:hidden">Import</span>
              </Button>
              <Button
                variant="default"
                onClick={handleOpenNewItemModal}
                iconName="Plus"
                iconSize={16}
                className="text-sm"
              >
                <span className="hidden sm:inline">Nuevo Artículo</span>
                <span className="sm:hidden">Nuevo</span>
              </Button>
            </div>
          </div>

          {/* View Tabs */}
          <div className="flex flex-wrap space-x-1 mb-4 sm:mb-6 bg-muted p-1 rounded-lg w-fit max-w-full overflow-x-auto">
            {viewTabs?.map((tab) => (
              <button
                key={tab?.id}
                onClick={() => setActiveView(tab?.id)}
                className={`flex items-center space-x-1 sm:space-x-2 px-2 sm:px-4 py-2 rounded-md text-xs sm:text-sm font-medium transition-smooth whitespace-nowrap ${
                  activeView === tab?.id
                    ? 'bg-background text-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                <Icon name={tab?.icon} size={14} className="sm:w-4 sm:h-4" />
                <span className="hidden xs:inline sm:inline">{tab?.label}</span>
                {tab?.id === 'alerts' && stockAlerts?.length > 0 && (
                  <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-warning text-warning-foreground">
                    {stockAlerts?.length}
                  </span>
                )}
              </button>
            ))}
          </div>

          {/* Content based on active view */}
          {activeView === 'overview' && (
            <InventoryStats 
              stats={inventoryStats}
              items={filteredItems}
              onAddItem={() => setShowNewItemModal(true)}
              onUpdateStock={() => {
                // ✅ Abrir modal de selección de artículo
                setShowItemSelectorModal(true);
              }}
              onGenerateReport={() => {
                // Función auxiliar para escapar valores CSV correctamente
                const escapeCSV = (value) => {
                  if (value === null || value === undefined) return '""';
                  const stringValue = String(value);
                  // Escapar comillas dobles duplicándolas
                  const escapedValue = stringValue.replace(/"/g, '""');
                  // SIEMPRE encerrar en comillas para evitar problemas con comas y caracteres especiales
                  return `"${escapedValue}"`;
                };

                // Crear el contenido del CSV
                const headers = [
                  'Código',
                  'Nombre',
                  'Descripción',
                  'Categoría',
                  'Stock Actual',
                  'Stock Reservado',
                  'Punto de Reorden',
                  'Unidad',
                  'Proveedor',
                  'Ubicación',
                  'Costo Unitario',
                  'Valor Total',
                  'Última Actualización'
                ];

                const csvRows = filteredItems.map(item => [
                  escapeCSV(item.itemCode || ''),
                  escapeCSV(item.name || ''),
                  escapeCSV(item.description || ''),
                  escapeCSV(item.category || ''),
                  escapeCSV(item.currentStock || 0),
                  escapeCSV(item.reservedStock || 0),
                  escapeCSV(item.reorderPoint || 0),
                  escapeCSV(item.unit || ''),
                  escapeCSV(item.supplier?.name || ''),
                  escapeCSV(item.location || ''),
                  escapeCSV(item.unitCost || 0),
                  escapeCSV((item.currentStock || 0) * (item.unitCost || 0)),
                  escapeCSV(item.lastUpdated ? new Date(item.lastUpdated).toLocaleString('es-MX') : ''),
                ].join(','));

                const csvContent = [
                  headers.map(h => escapeCSV(h)).join(','),
                  ...csvRows
                ].join('\n');

                // Crear el blob con BOM UTF-8 y descargar
                const BOM = '\uFEFF';
                const blob = new Blob([BOM + csvContent], { type: 'text/csv;charset=utf-8;' });
                const link = document.createElement('a');
                const url = URL.createObjectURL(blob);
                
                link.setAttribute('href', url);
                link.setAttribute('download', `inventario_${new Date().toISOString().split('T')[0]}.csv`);
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
                URL.revokeObjectURL(url);
              }}
            />
          )}

          {activeView === 'inventory' && (
            <div className="space-y-6">
              <InventoryFilters
                filters={filters}
                onFiltersChange={handleFiltersChange}
                onClearFilters={handleClearFilters}
                onExport={handleExport}
                totalItems={inventoryItems?.length}
                filteredItems={filteredItems?.length}
                inventoryItems={inventoryItems}
              />
              <InventoryTable
                items={filteredItems}
                onViewDetails={handleViewDetails}
                onUpdateStock={handleUpdateStock}
                onCreatePO={handleCreatePO}
                onAddItem={() => {
                  setShowNewItemModal(true);
                }}
                onGenerateReport={handleExport}
              />
            </div>
          )}

          {activeView === 'alerts' && (
            <StockAlerts
              alerts={stockAlerts}
              onCreatePO={handleCreatePO}
              onUpdateStock={handleUpdateStock}
              onDismissAlert={handleDismissAlert}
            />
          )}

          {activeView === 'orders' && (
            <PurchaseOrderPanel
              orders={ordenes}
              onViewOrder={handleViewOrder}
              onApproveOrder={handleApproveOrder}
              onCreateOrder={handleCreateOrder}
              onDownloadOrder={handleDownloadOrder}
              onDeleteOrder={handleDeleteOrder}
            />
          )}
{activeView === 'requirements' && (
  <div className="bg-card rounded-lg border border-border shadow-sm">

    {/* Header */}
    <div className="flex items-center justify-between p-6 border-b border-border">
      <div className="flex items-center space-x-3">
        <Icon name="ClipboardList" size={20} className="text-primary" />
        <h3 className="text-lg font-semibold text-foreground">
          Requisiciones de Material
        </h3>
      </div>

      <Button
        variant="default"
        iconName="Plus"
        onClick={() => setShowCreatePOModal(true)}
      >
        Nueva Requisición
      </Button>
    </div>

    {/* Contenido */}
    <div className="divide-y divide-border max-h-96 overflow-y-auto">

      {requisitionsLoading ? (
        <div className="text-center py-8 text-muted-foreground">
          Cargando requisiciones...
        </div>
      ) : requisitions?.length > 0 ? (
        requisitions.map((req) => (
          <div
            key={req.id}
            className="p-5 hover:bg-muted/50 transition-colors"
          >
            <div className="flex items-start justify-between">

              {/* Info principal */}
              <div className="flex-1">

                {/* Encabezado */}
                <div className="flex items-center space-x-3 mb-2">
                  <h4 className="text-base font-semibold text-foreground">
                    {req.numeroOrdenTrabajo || 'Sin número'}
                  </h4>

                  <span className="px-2 py-1 rounded-full text-xs font-medium bg-primary/10 text-primary">
                    {req.estado || 'Pendiente'}
                  </span>
                </div>

                {/* Grid */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm text-muted-foreground mb-3">

                  <div>
                    <span className="font-medium">Proyecto:</span>
                    <div className="text-foreground">{req.nombreProyecto || 'Sin proyecto'}</div>
                  </div>

                  <div>
                    <span className="font-medium">Solicitado por:</span>
                    <div className="text-foreground">{req.solicitadoPor || 'No especificado'}</div>
                  </div>

                  <div>
                    <span className="font-medium">Fecha:</span>
                    <div className="text-foreground">
                      {req.fechaSolicitud
                        ? new Date(req.fechaSolicitud).toLocaleDateString('es-MX')
                        : 'No especificada'}
                    </div>
                  </div>

                  <div>
                    <span className="font-medium">Prioridad:</span>
                    <div className="text-foreground">{req.prioridad || 'Normal'}</div>
                  </div>
                </div>

                {/* Descripción */}
                {req.descripcionSolicitud && (
                  <div className="text-sm text-muted-foreground mb-3">
                    <span className="font-medium text-foreground">Descripción:</span>
                    <p className="text-foreground">{req.descripcionSolicitud}</p>
                  </div>
                )}

                {/* Materiales */}
                {req.materiales?.length > 0 && (
                  <div className="mb-3">
                    <span className="font-medium">Materiales solicitados:</span>
                    <ul className="mt-2 space-y-1 text-sm">
                      {req.materiales.map((item, index) => (
                        <li key={index} className="text-foreground">
                          {item.cantidad || item.quantity} {item.unidad || item.unit || 'unidades'} - {item.nombreMaterial || item.name}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Acciones */}
                <div className="flex items-center space-x-3 mt-3">

                  {/* VER DETALLES */}
                  <Button
                    variant="ghost"
                    size="sm"
                    iconName="Edit"
                    onClick={() => handleEditRequisition(req)}
                  >
                    Ver
                  </Button>

                  {/* EDITAR */}
                  <Button
                    variant="ghost"
                    size="sm"
                    iconName="Edit"
                    onClick={() => handleEditRequisition(req)}
                  >
                    Editar
                  </Button>

                  {/* ELIMINAR */}
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-error hover:text-error"
                    iconName="Trash2"
                    onClick={() => handleDelete(req)}
                  >
                    Eliminar
                  </Button>

                </div>

              </div>
            </div>
          </div>
        ))
      ) : (
        <div className="text-center py-8 text-muted-foreground">
          No hay requisiciones disponibles.
        </div>
      )}

    </div>
  </div>
)}


          {/* New Item Modal */}
          <NewItemModal
            isOpen={showNewItemModal}
            onClose={handleCloseNewItemModal}
            onAddItem={handleAddNewItem}
          />

          {/* Item Details Modal */}
          <ItemDetailsModal
            isOpen={showItemDetailsModal}
            onClose={handleCloseItemDetailsModal}
            item={selectedItem}
          />

          {/* Edit Item Modal */}
          <EditItemModal
            isOpen={showEditItemModal}
            onClose={handleCloseEditItemModal}
            item={selectedItem}
            onUpdateSuccess={handleUpdateSuccess}
          />

          {/* Modal de Requisición */}
          <RequisitionModal
            isOpen={showRequisitionModal}
            onClose={() => {
              setShowRequisitionModal(false);
              setSelectedRequisition(null);
            }}
            requisition={selectedRequisition}
            onSave={handleSaveRequisition}
          />

          {/* Create Purchase Order Modal */}
          <CreatePOModal
            isOpen={showCreatePOModal}
            onClose={handleClosePOModal}
            onSubmit={handleSubmitPO}
            initialItem={selectedItem}
            lowStockItems={lowStockItems}
          />

          {/* Order Details Modal */}
          <OrderDetailsModal
            isOpen={showOrderDetailsModal}
            onClose={handleCloseOrderDetails}
            order={selectedOrder}
          />

          {/* Item Selector Modal - Para "Actualizar Stock" */}
          {showItemSelectorModal && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[1000] p-4">
              <div className="bg-card rounded-lg border border-border w-full max-w-2xl max-h-[80vh] overflow-hidden flex flex-col">
                <div className="flex items-center justify-between p-6 border-b border-border">
                  <h2 className="text-xl font-semibold text-foreground">
                    Seleccionar Artículo para Actualizar
                  </h2>
                  <button
                    onClick={() => setShowItemSelectorModal(false)}
                    className="text-muted-foreground hover:text-foreground"
                  >
                    <Icon name="X" size={20} />
                  </button>
                </div>
                
                <div className="p-6 overflow-y-auto flex-1">
                  <div className="mb-4">
                    <input
                      type="text"
                      placeholder="Buscar artículo..."
                      className="w-full px-4 py-2 border border-border rounded-md"
                      onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                    />
                  </div>
                  
                  <div className="space-y-2">
                    {filteredItems?.slice(0, 50).map((item) => (
                      <button
                        key={item.id}
                        onClick={() => {
                          handleUpdateStock(item);
                          setShowItemSelectorModal(false);
                        }}
                        className="w-full text-left p-4 border border-border rounded-lg hover:bg-muted transition-colors"
                      >
                        <div className="flex justify-between items-start">
                          <div>
                            <p className="font-medium text-foreground">{item.description}</p>
                            <p className="text-sm text-muted-foreground">Código: {item.itemCode}</p>
                          </div>
                          <div className="text-right">
                            <p className="text-sm font-medium">Stock: {item.currentStock} {item.unit}</p>
                            <p className={`text-xs ${
                              item.currentStock === 0 ? 'text-red-500' :
                              item.currentStock <= item.reorderPoint ? 'text-yellow-500' :
                              'text-green-500'
                            }`}>
                              {item.currentStock === 0 ? 'Agotado' :
                               item.currentStock <= item.reorderPoint ? 'Stock bajo' :
                               'Disponible'}
                            </p>
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                  
                  {filteredItems?.length === 0 && (
                    <p className="text-center text-muted-foreground py-8">
                      No se encontraron artículos
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default InventoryManagement;