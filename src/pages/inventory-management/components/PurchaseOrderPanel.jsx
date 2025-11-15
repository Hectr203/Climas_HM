import React, { useState } from 'react';
import Icon from '../../../components/AppIcon';
import Button from '../../../components/ui/Button';
import jsPDF from 'jspdf';
import 'jspdf-autotable';

const PurchaseOrderPanel = ({ orders, onViewOrder, onApproveOrder, onCreateOrder, onDeleteOrder }) => {
  const [orderToDelete, setOrderToDelete] = useState(null);
  
  const handleDeleteClick = (order) => {
    if (window.confirm(`¿Estás seguro de que deseas eliminar la orden de compra ${order.numeroOrden}?`)) {
      onDeleteOrder(order);
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency: 'MXN'
    }).format(amount);
  };

  const formatDate = (date) => {
    return new Intl.DateTimeFormat('es-MX', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(new Date(date));
  };

//PDF 
const onDownloadOrder = (order) => {
  const doc = new jsPDF();
  const gray = "#333333";

  // Para que salga el texto bien en el apartado de Metodo de pago
  const formatText = (text) => {
    if (!text) return "—";
    return text
      .replace(/_/g, " ")
      .toLowerCase()
      .replace(/\b\w/g, (c) => c.toUpperCase());
  };

  // ENCABEZADO
  doc.setFillColor(10, 74, 139);
  doc.rect(0, 0, 210, 25, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(16);
  doc.setFont("helvetica", "bold");
  doc.text("ORDEN DE COMPRA", 105, 15, { align: "center" });

  //DATOS GENERALES
  doc.setFont("helvetica", "bold");
  doc.setTextColor(gray);
  doc.setFontSize(12);
  doc.text("Datos Generales", 105, 35, { align: "center" });

  const leftX = 20;
  const rightX = 120;
  const baseY = 44;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.text(`Número: ${order.numeroOrden || "—"}`, leftX, baseY);
  doc.text(`Fecha: ${formatDate(order.fechaCreacion)}`, leftX, baseY + 7);
  doc.text(`Estado: ${getStatusLabel(order.estado)}`, leftX, baseY + 14);
  doc.text(`Proveedor: ${order.proveedor?.nombre || "—"}`, rightX, baseY);
  doc.text(`Creado por: ${order.creadoPor || "—"}`, rightX, baseY + 7);

  const maxWidthNotas = 70;
  const notaTexto = `Notas: ${order.notas || "—"}`;
  const notaLineas = doc.splitTextToSize(notaTexto, maxWidthNotas);
  const notaAltura = notaLineas.length * 5;

  doc.text(notaLineas, rightX, baseY + 14);

  if (order.fechaEntregaEsperada) {
    doc.text(
      `Entrega Esperada: ${formatDate(order.fechaEntregaEsperada)}`,
      leftX,
      baseY + 21
    );
  }

  // DETALLES DE PAGO
  const pagoY = Math.max(baseY + 28, baseY + 14 + notaAltura + 5);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.text("Detalles de Pago", 105, pagoY, { align: "center" });

  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  const infoPagoY = pagoY + 8;
  const metodoPagoFormateado = formatText(order.metodoPago);
  const prioridadFormateada = formatText(order.prioridadAprobacion || "Normal");

  doc.text(`Método de Pago: ${metodoPagoFormateado}`, leftX, infoPagoY);
  doc.text(`Prioridad: ${prioridadFormateada}`, leftX, infoPagoY + 7);
  const maxWidthComentarios = 70;
  const comentarioTexto = `Comentarios: ${order.comentariosAprobador || "Sin comentarios"}`;
  const comentarioLineas = doc.splitTextToSize(comentarioTexto, maxWidthComentarios);
  const comentarioAltura = comentarioLineas.length * 5;
  doc.text(comentarioLineas, rightX, infoPagoY);

  // TABLA DE ARTÍCULOS
  const tableY = infoPagoY + 9 + comentarioAltura;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.text("Detalle de Productos", 105, tableY, { align: "center" });

  const tableHead = [
    ["Código", "Descripción", "Cantidad", "Costo Unit.", "Subtotal"],
  ];

  const tableBody = order.articulos?.map((item) => [
    item.codigoArticulo || "—",
    item.descripcion || item.nombre || "—",
    `${item.cantidadOrdenada || 0} ${item.unidad || ""}`.trim(),
    formatCurrency(item.costoUnitario || 0),
    formatCurrency(item.subtotal || 0),
  ]);

  doc.autoTable({
    head: tableHead,
    body: tableBody,
    startY: tableY + 5,
    theme: "grid",
    styles: { fontSize: 9 },
    headStyles: {
      fillColor: [10, 74, 138],
      textColor: 255,
      halign: "center",
      fontStyle: "bold",
    },
    bodyStyles: { halign: "center" },
    margin: { left: 15, right: 15 },
  });

  // TOTAL
  const finalY = doc.lastAutoTable.finalY || tableY + 10;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(gray);
  doc.text(`Total: ${formatCurrency(order.totalOrden)}`, 195, finalY + 10, {
    align: "right",
  });

  // SECCIÓN APROBACIONES
  const pageHeight = doc.internal.pageSize.getHeight();
  const approvalSectionY = pageHeight - 35;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.text("Aprobaciones", 105, approvalSectionY - 5, { align: "center" });

  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  const lineY = approvalSectionY + 10;
  const leftXLine = 20;
  const rightXLine = 135;

  doc.text("_____________________________", leftXLine, lineY);
  doc.text("_____________________________", rightXLine, lineY);
  doc.text("Responsable de Aprobación", leftXLine + 10, lineY + 6);
  doc.text("Departamento de Compras", rightXLine + 7, lineY + 6);

  // DESCARGAR PDF
  doc.save(`orden-compra-${order.numeroOrden}.pdf`);
};


  const [activeTab, setActiveTab] = useState('pending');

  console.log('Órdenes recibidas en PurchaseOrderPanel:', orders);
  
  const tabs = [
    { id: 'pending', label: 'Pendientes', count: orders?.filter(o => o?.estado === 'pending')?.length },
    { id: 'approved', label: 'Aprobadas', count: orders?.filter(o => o?.estado === 'approved')?.length },
    { id: 'received', label: 'Recibidas', count: orders?.filter(o => o?.estado === 'received')?.length }
  ];

  const getStatusColor = (status) => {
    switch (status) {
      case 'pending': return 'text-warning bg-warning/10';
      case 'approved': return 'text-primary bg-primary/10';
      case 'received': return 'text-success bg-success/10';
      case 'cancelled': return 'text-error bg-error/10';
      default: return 'text-muted-foreground bg-muted';
    }
  };

  const getStatusLabel = (status) => {
    switch (status) {
      case 'pending': return 'Pendiente';
      case 'approved': return 'Aprobada';
      case 'received': return 'Recibida';
      case 'cancelled': return 'Cancelada';
      default: return status;
    }
  };


  const filteredOrders = orders?.filter(order => order?.estado === activeTab);

  return (
    <div className="bg-card rounded-lg border border-border">
      {/* Header */}
      <div className="flex items-center justify-between p-6 border-b border-border">
        <div className="flex items-center space-x-3">
          <Icon name="ShoppingCart" size={20} className="text-primary" />
          <h3 className="text-lg font-semibold text-foreground">Órdenes de Compra</h3>
        </div>
        
        <Button
          variant="default"
          onClick={onCreateOrder}
          iconName="Plus"
          iconSize={16}
        >
          Nueva Orden
        </Button>
      </div>
      {/* Tabs */}
      <div className="flex border-b border-border">
        {tabs?.map((tab) => (
          <button
            key={tab?.id}
            onClick={() => setActiveTab(tab?.id)}
            className={`flex items-center space-x-2 px-6 py-3 text-sm font-medium border-b-2 transition-smooth ${
              activeTab === tab?.id
                ? 'border-primary text-primary bg-primary/5' :'border-transparent text-muted-foreground hover:text-foreground hover:bg-muted/50'
            }`}
          >
            <span>{tab?.label}</span>
            {tab?.count > 0 && (
              <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                activeTab === tab?.id ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
              }`}>
                {tab?.count}
              </span>
            )}
          </button>
        ))}
      </div>
      {/* Orders List */}
      <div className="divide-y divide-border max-h-96 overflow-y-auto">
        {filteredOrders?.length === 0 ? (
          <div className="text-center py-8">
            <Icon name="ShoppingCart" size={48} className="text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">No hay órdenes {getStatusLabel(activeTab)?.toLowerCase()}</p>
            <Button
              variant="outline"
              size="sm"
              onClick={onCreateOrder}
              iconName="Plus"
              iconSize={16}
              className="mt-4"
            >
              Crear Primera Orden
            </Button>
          </div>
        ) : (
          filteredOrders?.map((order) => (
            <div key={order?.id} className="p-4 hover:bg-muted/50 transition-smooth">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center space-x-3 mb-2">
                    <h4 className="font-medium text-foreground">{order?.numeroOrden}</h4>
                    <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(order?.estado)}`}>
                      {getStatusLabel(order?.estado)}
                    </span>
                    {order?.esUrgente && (
                      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-error/10 text-error">
                        <Icon name="AlertCircle" size={12} className="mr-1" />
                        Urgente
                      </span>
                    )}
                  </div>
                  
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm text-muted-foreground mb-3">
                    <div>
                      <span className="font-medium">Proveedor:</span>
                      <div className="text-foreground">{order?.proveedor?.nombre}</div>
                    </div>
                    <div>
                      <span className="font-medium">Fecha:</span>
                      <div className="text-foreground">{formatDate(order?.fechaOrden)}</div>
                    </div>
                    <div>
                      <span className="font-medium">Total:</span>
                      <div className="text-foreground font-medium">{formatCurrency(order?.totalOrden)}</div>
                    </div>
                    <div>
                      <span className="font-medium">Artículos:</span>
                      <div className="text-foreground">{order?.cantidadArticulos} artículos</div>
                    </div>
                  </div>
                  
                  {order?.expectedDelivery && (
                    <div className="text-xs text-muted-foreground mb-3">
                      Entrega esperada: {formatDate(order?.expectedDelivery)}
                    </div>
                  )}
                  
                  <div className="flex items-center space-x-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onViewOrder(order)}
                      iconName="Eye"
                      iconSize={16}
                    >
                      Ver Detalles
                    </Button>
                    
                    {order?.status === 'pending' && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => onApproveOrder(order)}
                        iconName="Check"
                        iconSize={16}
                      >
                        Aprobar
                      </Button>
                    )}
                    
                    {order?.status === 'approved' && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => console.log('Track order:', order)}
                        iconName="Truck"
                        iconSize={16}
                      >
                        Rastrear
                      </Button>
                    )}
                    
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onDownloadOrder(order)}
                      iconName="Download"
                      iconSize={16}
                    >
                      Descargar
                    </Button>

                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDeleteClick(order)}
                      iconName="Trash2"
                      iconSize={16}
                      className="text-error hover:text-error"
                    >
                      Eliminar
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default PurchaseOrderPanel;