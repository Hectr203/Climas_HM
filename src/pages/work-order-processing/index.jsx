import React, { useState, useEffect } from 'react';
import Header from '../../components/ui/Header';
import Sidebar from '../../components/ui/Sidebar';
import Breadcrumb from '../../components/ui/Breadcrumb';
import Button from '../../components/ui/Button';
import WorkOrderTable from './components/WorkOrderTable';
import FilterToolbar from './components/FilterToolbar';
import InventoryPanel from './components/InventoryPanel';
import WorkOrderModal from './components/WorkOrderModal';
import RequisitionModal from './components/RequisitionModal';
// import StatsCards from './components/StatsCards';
import useOperac from '../../hooks/useOperac';
import useRequisi from '../../hooks/useRequisi';
import jsPDF from "jspdf";
import "jspdf-autotable";


const WorkOrderProcessing = () => {
  const { oportunities, loading, error, getOportunities } = useOperac();
  const { requisitions, loading: loadingRequisitions, getRequisitions, updateRequisition, createRequisition, deleteRequisition } = useRequisi();

  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Estados locales
  const [localOrders, setLocalOrders] = useState([]); // para sincronizar órdenes
  const [localRequisitions, setLocalRequisitions] = useState([]); // para requisiciones
  const [visibleOrders, setVisibleOrders] = useState([]); // órdenes actualmente visibles en la tabla (página actual)

  const [filteredOrders, setFilteredOrders] = useState([]);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [selectedRequisition, setSelectedRequisition] = useState(null);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isRequisitionModalOpen, setIsRequisitionModalOpen] = useState(false);
  const [stats, setStats] = useState({});
  const [exportMenuOpen, setExportMenuOpen] = useState(false);

  // Obtener requisiciones y oportunidades al iniciar
  useEffect(() => {
    const fetchData = async () => {
      const reqData = await getRequisitions();
      setLocalRequisitions(reqData || []);

      const oppData = await getOportunities();
      setLocalOrders(oppData || []);
      setFilteredOrders(oppData || []);
    };
    fetchData();
  }, []);

  // Mantener sincronía si cambian los datos del hook
  useEffect(() => {
    if (oportunities && oportunities.length > 0) {
      setLocalOrders(oportunities);
      setFilteredOrders(oportunities);
    }
  }, [oportunities]);

  useEffect(() => {
    if (requisitions && requisitions.length > 0) {
      setLocalRequisitions(requisitions);
    }
  }, [requisitions]);

  // Filtros dinámicos
  const handleFiltersChange = (filters) => {
    let filtered = [...(localOrders || [])];

    // Búsqueda general
    if (filters?.search) {
      const search = filters.search.toLowerCase();
      filtered = filtered.filter(order =>
        order?.ordenTrabajo?.toLowerCase()?.includes(search) ||
        order?.cliente?.nombre?.toLowerCase()?.includes(search) ||
        order?.cliente?.empresa?.toLowerCase()?.includes(search) ||
        order?.tipo?.toLowerCase()?.includes(search) ||
        order?.tecnicoAsignado?.nombre?.toLowerCase()?.includes(search) ||
        order?.notasAdicionales?.toLowerCase()?.includes(search)
      );
    }

    //  Estado
    if (filters?.status)
      filtered = filtered.filter(order => order?.estado === filters.status);

    // Prioridad
    if (filters?.priority)
      filtered = filtered.filter(order => order?.prioridad === filters.priority);

    // Técnico
    if (filters?.technician)
      filtered = filtered.filter(order =>
        order?.tecnicoAsignado?.nombre === filters.technician
      );

    // Proyecto (por tipo)
    if (filters?.project)
      filtered = filtered.filter(order => order?.tipo === filters.project);

    // Rango de fechas
    if (filters?.dateRange) {
      const today = new Date();
      filtered = filtered.filter(order => {
        const dueDate = new Date(order?.fechaLimite);
        if (isNaN(dueDate)) return false;
        switch (filters.dateRange) {
          case 'today':
            return dueDate.toDateString() === today.toDateString();
          case 'week': {
            const startOfWeek = new Date(today);
            startOfWeek.setDate(today.getDate() - today.getDay());
            const endOfWeek = new Date(startOfWeek);
            endOfWeek.setDate(startOfWeek.getDate() + 6);
            return dueDate >= startOfWeek && dueDate <= endOfWeek;
          }
          case 'month':
            return (
              dueDate.getMonth() === today.getMonth() &&
              dueDate.getFullYear() === today.getFullYear()
            );
          case 'overdue':
            return dueDate < today;
          default:
            return true;
        }
      });
    }

    setFilteredOrders(filtered);
  };

  // Actualizar estatus
  const handleStatusUpdate = (order, newStatus) => {
    const updatedOrders = localOrders.map(wo =>
      wo.id === order.id ? { ...wo, estado: newStatus } : wo
    );
    setLocalOrders(updatedOrders);
    setFilteredOrders(updatedOrders);
  };

  // CRUD de órdenes
  const handleSaveOrder = async (data) => {
    // 🗑 Si es eliminación
    if (data?.type === "delete") {
      setLocalOrders(prev => prev.filter(o => o.id !== data.id));
      setFilteredOrders(prev => prev.filter(o => o.id !== data.id));
      return;
    }

    //Si es creación o edición
    let newOrder = { ...data };

    if (!newOrder?.id) {
      newOrder.id = Date.now();
      newOrder.estado = 'Pendiente';
      newOrder.fechaCreacion = new Date().toISOString();
    }

    setLocalOrders(prev => {
      const exists = prev.some(o => o.id === newOrder.id);
      return exists
        ? prev.map(o => (o.id === newOrder.id ? newOrder : o))
        : [newOrder, ...prev];
    });

    setFilteredOrders(prev => {
      const exists = prev.some(o => o.id === newOrder.id);
      return exists
        ? prev.map(o => (o.id === newOrder.id ? newOrder : o))
        : [newOrder, ...prev];
    });

    setIsModalOpen(false);
    setSelectedOrder(null);
  };


  // Crear nueva orden
  const handleCreateNewOrder = () => {
    const newOrder = {
      id: null,
      orderNumber: '',
      projectName: '',
      clientName: '',
      type: '',
      priority: 'Media',
      status: 'Pendiente',
      assignedTechnician: '',
      technicianRole: '',
      dueDate: '',
      progress: 0,
      description: '',
      requiredMaterials: [],
      attachments: [],
      requiredPPE: [],
      medicalRequirements: false,
      notes: ''
    };
    setSelectedOrder(newOrder);
    setIsModalOpen(true);
  };

  // Crear nueva requisición
  const handleCreateNewRequisition = () => {
    const newRequisition = {
      id: null,
      requestNumber: '',
      orderNumber: '',
      projectName: '',
      requestedBy: 'Usuario Actual',
      requestDate: new Date().toISOString().split('T')[0],
      status: 'Pendiente',
      priority: 'Media',
      description: '',
      items: [],
      justification: '',
      approvedBy: '',
      approvalDate: '',
      notes: ''
    };
    setSelectedRequisition(newRequisition);
    setIsRequisitionModalOpen(true);
  };

  // Guardar requisición
  const handleSaveRequisition = async (savedRequisition) => {
    let newReq = { ...savedRequisition };
    try {
      if (!newReq?.id) {
        // Si es una nueva requisición, la creamos en el backend
        const response = await createRequisition(newReq);
        if (response) {
          newReq = response;
        }
      } else {
        // Si es una actualización, actualizamos en el backend
        const response = await updateRequisition(newReq.id, newReq);
        if (response) {
          newReq = response;
        }
      }

      setLocalRequisitions(prev => [newReq, ...prev.filter(r => r.id !== newReq.id)]);
      setLocalOrders(prev => [newReq, ...prev.filter(r => r.id !== newReq.id)]);

      // Forzar actualización de requisiciones
      await getRequisitions();

      setIsRequisitionModalOpen(false);
      setSelectedRequisition(null);
    } catch (error) {
      console.error("Error al guardar la requisición:", error);
    }
  };

  // PDF ORDENES
  const handleExportData = () => {
    if (!visibleOrders || visibleOrders.length === 0) {
      alert("No hay datos visibles para exportar.");
      return;
    }

    const doc = new jsPDF({
      orientation: "landscape",
      unit: "pt",
      format: "A4",
    });

    const gray = "#333333";

    //ENCABEZADO
    doc.setFillColor(10, 74, 138);
    doc.rect(0, 0, doc.internal.pageSize.getWidth(), 40, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(18);
    doc.text("REPORTE DE ÓRDENES DE TRABAJO", doc.internal.pageSize.getWidth() / 2, 25, {
      align: "center",
    });

    //FECHA DE GENERACIÓN
    const fechaActual = new Date().toLocaleDateString("es-MX", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    });

    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.setTextColor(255, 255, 255);
    doc.text(`Generado el ${fechaActual}`, doc.internal.pageSize.getWidth() - 120, 25);

    //SECCIÓN DATOS GENERALES
    let startY = 60;
    doc.setTextColor(gray);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(13);
    doc.text("Resumen General", doc.internal.pageSize.getWidth() / 2, startY, { align: "center" });

    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    const totalOrdenes = visibleOrders.length;
    const completadas = visibleOrders.filter((o) => o.estado === "Completada" || o.status === "Completada").length;
    const pendientes = visibleOrders.filter((o) => o.estado === "Pendiente" || o.status === "Pendiente").length;
    const enProceso = visibleOrders.filter((o) => o.estado === "En Proceso" || o.status === "En Proceso").length;

    startY += 20;
    const resumenTexto = `Total de Órdenes: ${totalOrdenes}   |   Completadas: ${completadas}   |   Pendientes: ${pendientes}   |   En Proceso: ${enProceso}`;
    doc.text(resumenTexto, doc.internal.pageSize.getWidth() / 2, startY, { align: "center" });


    //ORDENAR POR PRIORIDAD
    const prioridadOrden = ["Alta", "Media", "Baja", "Crítico"];
    const sortedOrders = [...visibleOrders].sort((a, b) => {
      const prioridadA = prioridadOrden.indexOf((a.prioridad || a.priority || "").trim());
      const prioridadB = prioridadOrden.indexOf((b.prioridad || b.priority || "").trim());
      return (prioridadA === -1 ? 99 : prioridadA) - (prioridadB === -1 ? 99 : prioridadB);
    });

    //TABLA
    const tableColumn = [
      "N° Orden",
      "Técnico Asignado",
      "Prioridad",
      "Estado",
      "Fecha Límite",
      "Cliente",
      "Tipo Proyecto",
      "Notas",
    ];

    const tableRows = sortedOrders.map((order) => [
      order?.ordenTrabajo || order?.orderNumber || "—",
      order?.tecnicoAsignado?.nombre || order?.assignedTechnician || "Sin técnico",
      order?.prioridad || order?.priority || "—",
      order?.estado || order?.status || "—",
      order?.fechaLimite || order?.dueDate || "—",
      order?.cliente?.empresa || order?.cliente?.nombre || order?.clientName || "Sin cliente",
      order?.tipo || order?.projectName || "—",
      order?.notasAdicionales || order?.notes || "—",
    ]);

    doc.autoTable({
      startY: startY + 25,
      head: [tableColumn],
      body: tableRows,
      theme: "grid",
      styles: { fontSize: 9, cellPadding: 5 },
      headStyles: {
        fillColor: [10, 74, 138],
        textColor: 255,
        halign: "center",
        fontStyle: "bold",
      },
      bodyStyles: { textColor: [50, 50, 50] },
      alternateRowStyles: { fillColor: [245, 245, 245] },
      margin: { left: 30, right: 30 },
    });
    //GUARDAR PDF
    doc.save(`REPORTE_TRABAJO_${new Date().toISOString().split("T")[0]}.pdf`);
  };

  // PDF ELIMINADAS
  const handleExportDeleted = () => {
    const allOrders = (oportunities && oportunities.length ? oportunities : (localOrders || []));
    let deletedOrders = [];
    try {
      const stored = localStorage.getItem("deletedWorkOrders");
      const deletedIds = stored ? JSON.parse(stored) : [];
      const deletedIdStr = Array.isArray(deletedIds) ? deletedIds.map((i) => String(i)) : [];
      if (deletedIdStr.length > 0) {
        deletedOrders = allOrders.filter((o) => deletedIdStr.includes(String(o.id)));
      }
    } catch (e) {
      deletedOrders = [];
    }
    if (!deletedOrders.length) {
      deletedOrders = allOrders.filter((o) => {
        const estado = (o?.estado || o?.status || "").toString().toLowerCase();
        if (estado.includes("elimin") || estado.includes("borr") || estado.includes("deleted")) return true;
        if (o?.deleted === true || o?.isDeleted === true || o?.removed === true || o?.deletedAt) return true;
        return false;
      });
      if (!deletedOrders.length) {
        const diff = allOrders.filter(o => !filteredOrders.some(f => f?.id === o?.id));
        if (diff.length) deletedOrders = diff;
      }
    }

    if (!deletedOrders || deletedOrders.length === 0) {
      alert('No hay órdenes eliminadas para exportar.');
      return;
    }

    const doc = new jsPDF({ orientation: 'landscape', unit: 'pt', format: 'A4' });
    const gray = '#333333';

    // Encabezado
    doc.setFillColor(180, 30, 30);
    doc.rect(0, 0, doc.internal.pageSize.getWidth(), 40, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(18);
    doc.text('ÓRDENES ELIMINADAS', doc.internal.pageSize.getWidth() / 2, 25, { align: 'center' });

    // Fecha
    const fecha = new Date().toLocaleDateString('es-MX', { year: 'numeric', month: '2-digit', day: '2-digit' });
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.setTextColor(255, 255, 255);
    doc.text(`Generado el ${fecha}`, doc.internal.pageSize.getWidth() - 120, 25);

    doc.setTextColor(gray);
    doc.setFontSize(10);
    doc.text(`Total Eliminadas: ${deletedOrders.length}`, 40, 60);


    const tableColumn = [
      'N° Orden',
      'Técnico Asignado',
      'Prioridad',
      'Estado',
      'Fecha Límite',
      'Cliente',
      'Tipo Proyecto',
      'Notas',
    ];

    // Ordenar por prioridad como en la otra exportación
    const prioridadOrden = ['Alta', 'Media', 'Baja', 'Crítico'];
    const sortedDeleted = [...deletedOrders].sort((a, b) => {
      const prioridadA = prioridadOrden.indexOf((a.prioridad || a.priority || '').trim());
      const prioridadB = prioridadOrden.indexOf((b.prioridad || b.priority || '').trim());
      return (prioridadA === -1 ? 99 : prioridadA) - (prioridadB === -1 ? 99 : prioridadB);
    });

    const tableRowsDeleted = sortedDeleted.map((order) => [
      order?.ordenTrabajo || order?.orderNumber || '—',
      order?.tecnicoAsignado?.nombre || order?.assignedTechnician || 'Sin técnico',
      order?.prioridad || order?.priority || '—',
      order?.estado || order?.status || '—',
      order?.fechaLimite || order?.dueDate || '—',
      order?.cliente?.empresa || order?.cliente?.nombre || order?.clientName || 'Sin cliente',
      order?.tipo || order?.projectName || '—',
      order?.notasAdicionales || order?.notes || '—',
    ]);

    doc.autoTable({
      startY: 80,
      head: [tableColumn],
      body: tableRowsDeleted,
      theme: 'grid',
      styles: { fontSize: 9, cellPadding: 5 },
      headStyles: { fillColor: [180, 30, 30], textColor: 255, halign: 'center', fontStyle: 'bold' },
      bodyStyles: { textColor: [50, 50, 50] },
      alternateRowStyles: { fillColor: [250, 245, 245] },
      margin: { left: 30, right: 30 },
    });

    doc.save(`ORDENES_ELIMINADAS_${new Date().toISOString().split('T')[0]}.pdf`);
  };

  return (
    <div className="min-h-screen bg-background">
      <Header
        onMenuToggle={() => setMobileMenuOpen(!mobileMenuOpen)}
        isMenuOpen={mobileMenuOpen}
        sidebarCollapsed={sidebarCollapsed}
      />
      <div className="hidden lg:block">
        <Sidebar isCollapsed={sidebarCollapsed} onToggle={() => setSidebarCollapsed(!sidebarCollapsed)} />
      </div>
      <div className="lg:hidden">
        <Header onMenuToggle={() => setMobileMenuOpen(!mobileMenuOpen)} isMenuOpen={mobileMenuOpen} />
      </div>

      <div className={`transition-all duration-300 ${sidebarCollapsed ? 'lg:ml-16' : 'lg:ml-60'}`}>
        <div className="p-6">
          <div className="mb-6">
            <Breadcrumb />
            <div className="flex items-center justify-between mt-4">
              <div>
                <h1 className="text-3xl font-bold text-foreground">Procesamiento de Órdenes de Trabajo</h1>
                <p className="text-muted-foreground mt-2">
                  Gestión integral de órdenes de trabajo, asignación de técnicos y control de materiales
                </p>
              </div>
              <div className="flex items-center space-x-3">
                <Button
                  variant="outline"
                  iconName="Plus"
                  iconSize={16}
                  onClick={handleCreateNewOrder}
                  className="border-black text-black hover:bg-gray-100 hover:text-black"
                >
                  Nueva Orden
                </Button>

                <Button
                  variant="outline"
                  iconName="ClipboardList"
                  iconSize={16}
                  onClick={handleCreateNewRequisition}
                  className="border-black text-black hover:bg-gray-100 hover:text-black"
                >
                  Nueva Requisición
                </Button>

                <div className="flex justify-end p-4">
                  <div className="relative">
                    <Button
                      variant="outline"
                      iconName="Download"
                      iconSize={16}
                      onClick={() => setExportMenuOpen((s) => !s)}
                      className="border-blue-600 text-blue-600 hover:bg-blue-50 hover:text-blue-700"
                      aria-haspopup="true"
                      aria-expanded={exportMenuOpen}
                    >
                      Exportar
                    </Button>

                    {exportMenuOpen && (
                      <div className="absolute right-0 mt-2 w-44 bg-white border border-border rounded shadow z-50">
                        <button
                          className="flex items-center gap-2 w-full px-4 py-3 text-sm text-gray-700 hover:bg-muted/60 transition-colors"
                          onClick={() => {
                            setExportMenuOpen(false);
                            handleExportData();
                          }}
                        >
                          <svg
                            className="w-4 h-4 text-blue-600"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            viewBox="0 0 24 24"
                          >
                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v12m0 0l4-4m-4 4l-4-4M4 17v2a2 2 0 002 2h12a2 2 0 002-2v-2" />
                          </svg>
                          Registros
                        </button>

                        <button
                          className="flex items-center gap-2 w-full px-4 py-3 text-sm text-red-600 hover:bg-red-50 transition-colors"
                          onClick={() => {
                            setExportMenuOpen(false);
                            handleExportDeleted();
                          }}
                        >
                          <svg
                            className="w-4 h-4"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            viewBox="0 0 24 24"
                          >
                            <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6M9 7h6m2 0H7m3-3h4a1 1 0 011 1v2H9V5a1 1 0 011-1z" />
                          </svg>
                          Eliminadas
                        </button>

                      </div>
                    )}
                  </div>
                </div>


              </div>
            </div>
          </div>

          {/* <StatsCards stats={stats} /> */}

          <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
            <div className="xl:col-span-2 space-y-6">
              <FilterToolbar
                onFiltersChange={handleFiltersChange}
                totalCount={localOrders?.length}
                filteredCount={filteredOrders?.length}
              />

              <WorkOrderTable
                workOrders={filteredOrders}
                requisitions={localRequisitions}
                onStatusUpdate={handleStatusUpdate}
                onAssignTechnician={setSelectedOrder}
                onViewDetails={setSelectedOrder}
                onEditOrder={handleSaveOrder}
                loading={loading}
                error={error}
                onVisibleOrdersChange={setVisibleOrders}
              />
            </div>

            <div className="xl:col-span-1">
              <InventoryPanel
                onCreatePurchaseOrder={() => { }}
                onRequestMaterial={() => { }}
                onCreateRequisition={handleCreateNewRequisition}
                requisitions={localRequisitions}
                loading={loadingRequisitions}
                onRequisitionUpdated={setLocalRequisitions}
              />
            </div>
          </div>

          <WorkOrderModal
            isOpen={isModalOpen}
            onClose={() => { setIsModalOpen(false); setSelectedOrder(null); }}
            workOrder={selectedOrder}
            onSaveSuccess={handleSaveOrder}
          />

          <RequisitionModal
            isOpen={isRequisitionModalOpen}
            onClose={() => { setIsRequisitionModalOpen(false); setSelectedRequisition(null); }}
            requisition={selectedRequisition}
            visibleOrders={visibleOrders}
            onSave={handleSaveRequisition}
          />
        </div>
      </div>
    </div>
  );
};

export default WorkOrderProcessing;
