import React, { useState, useEffect, useMemo, useRef } from "react";
import Icon from "../../../components/AppIcon";
import Button from "../../../components/ui/Button";
import useOperac from "../../../hooks/useOperac";
import useClient from "../../../hooks/useClient";
import WorkOrderModal from "../components/WorkOrderModal";
import { useNotifications } from "../../../context/NotificationContext";
import jsPDF from "jspdf";
import "jspdf-autotable";

const PAGE_SIZE_OPTIONS = [5, 10, 20, 50];

const WorkOrderTable = ({
  workOrders,
  requisitions,
  onStatusUpdate,
  onAssignTechnician,
  onViewDetails,
  onEditOrder,
  loading,
  error,
  onVisibleOrdersChange,
}) => {
const { oportunities, getOportunities, deleteWorkOrder } = useOperac();
  const { clients, getClients, loading: loadingClients } = useClient();
  const { showConfirm, showOperationSuccess, showHttpError, showInfo } = useNotifications();

  const [expandedRows, setExpandedRows] = useState(new Set());
  const [sortConfig, setSortConfig] = useState({ key: "prioridad", direction: "asc" });
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(PAGE_SIZE_OPTIONS[0]);
  const [localRequisitions, setLocalRequisitions] = useState([]);

  // Modal
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [modalMode, setModalMode] = useState("view");
  const [isModalOpen, setIsModalOpen] = useState(false);

  useEffect(() => {
    if (!workOrders?.length) getOportunities();
    getClients();
  }, []);

  // Sincroniza requisiciones automáticamente
  useEffect(() => {
    if (requisitions) setLocalRequisitions(requisitions);
  }, [requisitions]);

  const dataSource = useMemo(
    () => (workOrders?.length ? workOrders : oportunities || []),
    [workOrders, oportunities]
  );
  
    // PARA ELIMINARLO PERO NO DESDE EL BACK SI NO VISUAL
const [deletedOrderIds, setDeletedOrderIds] = useState(() => {
  const stored = localStorage.getItem("deletedWorkOrders");
  return stored ? new Set(JSON.parse(stored)) : new Set();
});

useEffect(() => {
  localStorage.setItem("deletedWorkOrders", JSON.stringify([...deletedOrderIds]));
}, [deletedOrderIds]);

const sortedOrders = useMemo(() => {
  const filtered = dataSource.filter((order) => !deletedOrderIds.has(order.id));
  if (!sortConfig.key) return filtered;
  const sorted = [...filtered];
  sorted.sort((a, b) => {
    const aVal = a[sortConfig.key] || "";
    const bVal = b[sortConfig.key] || "";
    if (aVal < bVal) return sortConfig.direction === "asc" ? -1 : 1;
    if (aVal > bVal) return sortConfig.direction === "asc" ? 1 : -1;
    return 0;
  });
  return sorted;
}, [dataSource, sortConfig, deletedOrderIds]);


  // Paginación
  const totalItems = sortedOrders.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const startIndex = (currentPage - 1) * pageSize;
  const endIndex = Math.min(startIndex + pageSize, totalItems);
  const paginatedData = sortedOrders.slice(startIndex, endIndex);

  // Notify parent of visible orders (current page)
  // Usar useRef para evitar actualizaciones innecesarias y ciclos infinitos
  const prevPaginatedDataRef = useRef(null);
  useEffect(() => {
    if (!onVisibleOrdersChange) return;
    
    // Comparar IDs para evitar actualizaciones innecesarias
    const currentIds = paginatedData.map(order => order?.id).join(',');
    const prevIds = prevPaginatedDataRef.current?.map(order => order?.id).join(',') || '';
    
    // Solo actualizar si los IDs realmente cambiaron
    if (currentIds !== prevIds) {
      onVisibleOrdersChange(paginatedData);
      prevPaginatedDataRef.current = paginatedData;
    }
  }, [paginatedData, onVisibleOrdersChange]);

  useEffect(() => {
    // Solo ajustar la página si está fuera de rango válido
    if (totalPages > 0) {
      if (currentPage > totalPages) {
        setCurrentPage(totalPages);
      } else if (currentPage < 1) {
        setCurrentPage(1);
      }
    }
  }, [currentPage, totalPages]);

  const handleChangePageSize = (e) => {
    const v = Number(e?.target?.value) || PAGE_SIZE_OPTIONS[0];
    setPageSize(v);
    setCurrentPage(1);
  };

  const goToPage = (n) => setCurrentPage(Math.min(Math.max(1, n), totalPages));
  const prevPage = () => goToPage(currentPage - 1);
  const nextPage = () => goToPage(currentPage + 1);
  

const handleDelete = (order) => {
  showConfirm(`¿Seguro que deseas eliminar la orden "${order.ordenTrabajo}"?`, {
    onConfirm: () => {
      setDeletedOrderIds((prev) => new Set([...prev, order.id]));
      showOperationSuccess("delete", "Orden de trabajo");
      onEditOrder?.({ type: "delete", id: order.id });
    },
    onCancel: () => {
      showInfo("Eliminación cancelada");
    },
  });
};
  const handleSort = (key) => {
    setSortConfig((prev) => ({
      key,
      direction: prev.key === key && prev.direction === "asc" ? "desc" : "asc",
    }));
    setCurrentPage(1);
  };

  const handlePageChange = (newPage) => {
    if (newPage >= 1 && newPage <= totalPages) setCurrentPage(newPage);
  };

  const toggleRowExpansion = (orderId) => {
    const newExpanded = new Set(expandedRows);
    if (newExpanded.has(orderId)) newExpanded.delete(orderId);
    else newExpanded.add(orderId);
    setExpandedRows(newExpanded);
  };

  const handleView = (order) => {
    setSelectedOrder(order);
    setModalMode("view");
    setIsModalOpen(true);
  };

  const handleEdit = (order) => {
    setSelectedOrder(order);
    setModalMode("edit");
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedOrder(null);
  };

  const getPriorityColor = (priority) => {
    switch (priority) {
      case "Crítica":
        return "bg-red-100 text-red-800";
      case "Alta":
        return "bg-orange-100 text-orange-800";
      case "Media":
        return "bg-yellow-100 text-yellow-800";
      case "Baja":
        return "bg-green-100 text-green-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case "Pendiente":
        return "bg-yellow-100 text-yellow-800";
      case "En Progreso":
        return "bg-blue-100 text-blue-800";
      case "Completada":
        return "bg-green-100 text-green-800";
      case "En Pausa":
        return "bg-orange-100 text-orange-800";
      case "Cancelada":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const SortableHeader = ({ label, sortKey }) => (
    <th
      className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider cursor-pointer hover:bg-muted transition-all"
      onClick={() => handleSort(sortKey)}
    >
      <div className="flex items-center space-x-1">
        <span>{label}</span>
        <Icon
          name={
            sortConfig.key === sortKey
              ? sortConfig.direction === "asc"
                ? "ChevronUp"
                : "ChevronDown"
              : "ChevronsUpDown"
          }
          size={14}
        />
      </div>
    </th>
  );
  

  if (loading || loadingClients)
    return (
      <div className="flex justify-center items-center py-10">
        <Icon name="Loader2" className="animate-spin mr-2" size={18} />
        <span className="text-muted-foreground">Cargando órdenes de trabajo...</span>
      </div>
    );

  if (error)
    return (
      <div className="text-center py-10 text-error">
        <Icon name="AlertCircle" className="inline-block mr-2" size={18} />
        Error al cargar los datos: {error.message}
      </div>
    );

  if (!sortedOrders?.length)
    return (
      <div className="text-center py-10 text-muted-foreground">
        <Icon name="ClipboardX" className="inline-block mr-2" size={18} />
        No hay órdenes registradas.
      </div>
    );

      // Exportar datos a PDF
  const handleExportPDF = () => {
    if (!sortedOrders || sortedOrders.length === 0) {
      alert("No hay datos disponibles para exportar.");
      return;
    }

    const doc = new jsPDF({
      orientation: "landscape",
      unit: "pt",
      format: "A4",
    });

    //  Encabezado del reporte
    doc.setFontSize(16);
    doc.text("Reporte de Órdenes de Trabajo", 40, 40);

    //  Fecha actual
    const fechaActual = new Date().toLocaleDateString("es-MX", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
    doc.setFontSize(10);
    doc.text(`Generado el ${fechaActual}`, 40, 60);

    //  Columnas del PDF
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

    //  Filas de la tabla
    const tableRows = sortedOrders.map((order) => [
      order?.ordenTrabajo || "—",
      order?.tecnicoAsignado?.nombre || "Sin técnico",
      order?.prioridad || "—",
      order?.estado || "—",
      order?.fechaLimite || "—",
      order?.cliente?.empresa || order?.cliente?.nombre || "Sin cliente",
      order?.tipo || "—",
      order?.notasAdicionales || "—",
    ]);

    //  Generar tabla
    doc.autoTable({
      head: [tableColumn],
      body: tableRows,
      startY: 80,
      styles: {
        fontSize: 9,
        cellPadding: 5,
      },
      headStyles: {
        fillColor: [25, 118, 210],
        textColor: 255,
        fontStyle: "bold",
      },
      alternateRowStyles: { fillColor: [245, 245, 245] },
    });

    //  Descargar archivo
    doc.save(`ordenes_trabajo_${new Date().toISOString().split("T")[0]}.pdf`);
  };


  return (
    <div className="bg-card rounded-lg border border-border overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-muted">
            <tr>
              <SortableHeader label="Orden de Trabajo" sortKey="ordenTrabajo" />
              <SortableHeader label="Técnico Asignado" sortKey="tecnicoAsignado" />
              <SortableHeader label="Nombre del Proyecto" sortKey="nombreProyecto" />
              <SortableHeader label="Prioridad" sortKey="prioridad" />
              <SortableHeader label="Estado" sortKey="estado" />
              <SortableHeader label="Fecha Límite" sortKey="fechaLimite" />
              <SortableHeader label="Cliente" sortKey="cliente" />
              <SortableHeader label="Tipo Proyecto" sortKey="tipo" />
              <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Notas
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Acciones
              </th>
            </tr>
          </thead>

          <tbody className="bg-card divide-y divide-border">
  {paginatedData.length === 0 ? (
    <tr>
      <td colSpan="9" className="py-10 text-center text-muted-foreground">
        <Icon name="SearchX" className="inline-block mr-2" size={18} />
        No se encontraron resultados con los filtros aplicados.
      </td>
    </tr>
  ) : (
    paginatedData.map((order) => (
      <React.Fragment key={order.id}>
        <tr className="hover:bg-muted/50 transition-colors">
          <td className="px-6 py-4 whitespace-nowrap text-sm">
            <div className="flex items-center space-x-3">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => toggleRowExpansion(order.id)}
                className="w-6 h-6"
              >
                <Icon
                  name={expandedRows.has(order.id) ? "ChevronDown" : "ChevronRight"}
                  size={16}
                />
              </Button>
              <div>{order.ordenTrabajo || "—"}</div>
            </div>
          </td>

          <td className="px-6 py-4 whitespace-nowrap text-sm">
  {order.tecnicoAsignado?.nombre || "Sin técnico"}
</td>

<td className="px-6 py-4 whitespace-nowrap text-sm">
  {order.proyectoNombre || order.nombreProyecto || "Sin proyecto"}
</td>

<td className="px-6 py-4 whitespace-nowrap">
  <span
    className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getPriorityColor(
      order.prioridad
    )}`}
  >
    {order.prioridad}
  </span>
</td>


          <td className="px-6 py-4 whitespace-nowrap">
            <span
              className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(
                order.estado
              )}`}
            >
              {order.estado}
            </span>
          </td>

          <td className="px-6 py-4 whitespace-nowrap text-sm">{order.fechaLimite}</td>
          <td className="px-6 py-4 whitespace-nowrap text-sm">
            {order.cliente?.nombre || order.cliente?.empresa || "Sin cliente"}
          </td>
          <td className="px-6 py-4 whitespace-nowrap text-sm">{order.tipo || "—"}</td>
          <td className="px-6 py-4 whitespace-nowrap text-sm text-muted-foreground">
            {order.notasAdicionales || "-"}
          </td>

          <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
            <div className="flex items-center justify-end space-x-2">
              <Button
                variant="ghost"
                size="sm"
                iconName="Eye"
                iconSize={16}
                onClick={() => handleView(order)}
              >
                Ver
              </Button>
              <Button
                variant="outline"
                size="sm"
                iconName="Edit"
                iconSize={16}
                onClick={() => handleEdit(order)}
              >
                Editar
              </Button>
              <Button
  variant="ghost"
  size="icon"
  onClick={() => handleDelete(order)}
  title="Eliminar orden"
>
  <Icon name="Trash2" size={16} className="text-destructive" />
</Button>
            </div>
          </td>
        </tr>

        {/*  Fila expandida con descripción, EPP y materiales */}
        {expandedRows.has(order.id) && (
          <tr>
            <td colSpan="9" className="px-6 py-4 bg-muted/30">
              <div className="space-y-3">
                <h4 className="text-sm font-medium text-foreground">
                  Descripción del Trabajo
                </h4>
                <p className="text-sm text-muted-foreground">
                  {order.descripcion || "Sin descripción"}
                </p>

                {/* === EQUIPO DE PROTECCIÓN PERSONAL === */}
                <h4 className="text-sm font-medium text-foreground">
                  Equipo de Protección Personal
                </h4>
                <ul className="text-sm text-muted-foreground grid grid-cols-2 md:grid-cols-3 gap-2">
                  {[
                    { key: "cascoSeguridad", label: "Casco de Seguridad" },
                    { key: "gafasProteccion", label: "Gafas de Protección" },
                    { key: "guantesTrabajo", label: "Guantes de Trabajo" },
                    { key: "calzadoSeguridad", label: "Calzado de Seguridad" },
                    { key: "arnesSeguridad", label: "Arnés de Seguridad" },
                    { key: "respiradorN95", label: "Respirador N95" },
                    { key: "chalecoReflectivo", label: "Chaleco Reflectivo" },
                  ].map(({ key, label }) => (
                    <li key={key} className="flex items-center space-x-2">
                      <Icon
                        name={order[key] ? "CheckCircle" : "XCircle"}
                        size={14}
                      />
                      <span>{label}</span>
                    </li>
                  ))}
                </ul>

                {/* === MATERIALES REGISTRADOS === */}
                <h4 className="text-sm font-medium text-foreground mt-4">
                  Materiales Registrados
                </h4>
                <div className="text-sm">
  {(() => {
    const reqForOrder = requisitions?.filter(
      (req) => req.numeroOrdenTrabajo === order.ordenTrabajo
    );

    if (!reqForOrder || reqForOrder.length === 0) {
      return (
        <p className="text-muted-foreground text-sm">
          No hay materiales registrados para esta orden
        </p>
      );
    }

    return reqForOrder.map((req, reqIndex) => {
      // Debug
      console.log('Requisición en tabla:', req);
      console.log('Materiales inventario:', req.materiales);
      console.log('Materiales manuales:', req.materialesManuales);
      
      // Normalizar materiales
      const materialesInventario = req.materiales || req.items || [];
      const materialesManuales = req.materialesManuales || req.manualItems || [];
      
      return (
      <div key={reqIndex} className="mb-4 border border-border rounded-lg p-3 bg-card">
        <div className="flex items-center justify-between mb-2">
          <p className="text-xs font-medium text-muted-foreground">
            Requisición: {req.numeroOrdenTrabajo || req.requestNumber}
          </p>
          <span className={`text-[10px] px-2 py-0.5 rounded-full ${
            req.estado === 'Aprobada' ? 'bg-green-100 text-green-700' :
            req.estado === 'Pendiente' ? 'bg-yellow-100 text-yellow-700' :
            'bg-red-100 text-red-700'
          }`}>
            {req.estado}
          </span>
        </div>

        {/* Materiales del Inventario */}
        {materialesInventario.length > 0 && (
          <div className="mb-3">
            <p className="text-xs font-semibold text-blue-700 mb-1 flex items-center">
              <Icon name="Package" size={14} className="mr-1" />
              Del Inventario ({materialesInventario.length})
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 ml-4">
              {materialesInventario.map((item, idx) => (
                <div key={idx} className="flex items-start space-x-2 text-xs bg-blue-50 p-2 rounded border border-blue-200">
                  <span className="text-blue-600 mt-0.5">•</span>
                  <div className="flex-1">
                    <p className="font-medium text-foreground">
                      {item.nombreMaterial || item.nombre || item.name}
                    </p>
                    {(item.codigoArticulo || item.codigo) && (
                      <p className="text-[10px] text-muted-foreground">
                        Código: {item.codigoArticulo || item.codigo}
                      </p>
                    )}
                    <p className="text-muted-foreground">
                      Cantidad: {item.cantidad || item.quantity} {item.unidad || item.unit}
                    </p>
                    {item.urgencia && item.urgencia !== 'Normal' && (
                      <span className={`text-[10px] px-1.5 py-0.5 rounded ${
                        item.urgencia === 'Urgente' || item.urgencia === 'Crítica'
                          ? 'bg-red-100 text-red-700'
                          : 'bg-orange-100 text-orange-700'
                      }`}>
                        {item.urgencia}
                      </span>
                    )}
                    {item.descripcionEspecificaciones && (
                      <p className="text-[10px] text-muted-foreground mt-1 italic">
                        {item.descripcionEspecificaciones}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Materiales Manuales */}
        {materialesManuales.length > 0 && (
          <div>
            <p className="text-xs font-semibold text-green-700 mb-1 flex items-center">
              <Icon name="Edit3" size={14} className="mr-1" />
              Manuales ({materialesManuales.length})
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 ml-4">
              {materialesManuales.map((item, idx) => (
                <div key={idx} className="flex items-start space-x-2 text-xs bg-green-50 p-2 rounded border border-green-200">
                  <span className="text-green-600 mt-0.5">•</span>
                  <div className="flex-1">
                    <p className="font-medium text-foreground">
                      {item.nombreMaterial || item.nombre || item.name}
                    </p>
                    <p className="text-muted-foreground">
                      Cantidad: {item.cantidad || item.quantity} {item.unidad || item.unit}
                    </p>
                    {item.urgencia && item.urgencia !== 'Normal' && (
                      <span className={`text-[10px] px-1.5 py-0.5 rounded ${
                        item.urgencia === 'Urgente' || item.urgencia === 'Crítica'
                          ? 'bg-red-100 text-red-700'
                          : 'bg-orange-100 text-orange-700'
                      }`}>
                        {item.urgencia}
                      </span>
                    )}
                    {item.descripcionEspecificaciones && (
                      <p className="text-[10px] text-muted-foreground mt-1 italic">
                        {item.descripcionEspecificaciones}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Si no hay materiales en esta requisición */}
        {materialesInventario.length === 0 && materialesManuales.length === 0 && (
          <p className="text-xs text-muted-foreground ml-4">
            Esta requisición no tiene materiales registrados
          </p>
        )}
      </div>
    );
    });
  })()}
</div>


                <p className="text-sm text-muted-foreground">
                  <strong>Requiere estudios médicos actualizados:</strong>{" "}
                  {order.requiereEstudiosMedicosActualizados ? "Sí" : "No"}
                </p>
              </div>
            </td>
          </tr>
        )}
      </React.Fragment>
    ))
  )}
</tbody>

        </table>

        {/* Modal */}
        {isModalOpen && (
          <WorkOrderModal
            isOpen={isModalOpen}
            onClose={handleCloseModal}
            workOrder={selectedOrder}
            mode={modalMode}
            onSaveSuccess={(updatedOrder) => {
              if (onEditOrder) onEditOrder(updatedOrder);
              handleCloseModal();
            }}
          />
        )}
      </div>

      {/* Paginación */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between border-t border-border px-4 py-3 gap-3">
        <div className="flex items-center gap-3">
          <label className="text-xs text-muted-foreground">Mostrar</label>
          <select
            value={pageSize}
            onChange={handleChangePageSize}
            className="text-sm px-2 py-1 border border-border rounded bg-background text-foreground"
          >
            {PAGE_SIZE_OPTIONS.map((opt) => (
              <option key={opt} value={opt}>{opt}</option>
            ))}
          </select>
          <span className="text-xs text-muted-foreground">por página</span>
          <span className="text-xs text-muted-foreground ml-3">
            Mostrando <span className="font-medium">{totalItems === 0 ? 0 : startIndex + 1}</span>-<span className="font-medium">{endIndex}</span> de <span className="font-medium">{totalItems}</span>
          </span>
        </div>
        <div className="flex items-center gap-1">
          <Button variant="outline" size="sm" onClick={() => goToPage(1)} disabled={currentPage === 1} iconName="ChevronsLeft" />
          <Button variant="outline" size="sm" onClick={prevPage} disabled={currentPage === 1} iconName="ChevronLeft" />
          <span className="px-2 text-sm text-foreground">{currentPage} / {totalPages}</span>
          <Button variant="outline" size="sm" onClick={nextPage} disabled={currentPage === totalPages} iconName="ChevronRight" />
          <Button variant="outline" size="sm" onClick={() => goToPage(totalPages)} disabled={currentPage === totalPages} iconName="ChevronsRight" />
        </div>
      </div>
    </div>
  );
};

export default WorkOrderTable;