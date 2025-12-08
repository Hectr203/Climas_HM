import React from 'react';
import Icon from '../../../components/AppIcon';
import Image from '../../../components/AppImage';

const ProjectInfoPanel = ({ project, clientInfo }) => {
  if (!project) {
    return (
      <div className="bg-card border border-border rounded-lg p-6">
        <div className="text-center py-8">
          <Icon name="AlertCircle" size={48} className="text-muted-foreground mx-auto mb-4" />
          <p className="text-muted-foreground">No hay información del proyecto disponible</p>
        </div>
      </div>
    );
  }

  // Usar clientInfo si está disponible, sino usar los datos del proyecto
  const cliente = clientInfo || project?.cliente || project?.client;

  const formatCurrency = (amount) => {
    if (!amount || isNaN(amount)) return '$0.00';
    return new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency: 'MXN'
    })?.format(amount);
  };

  const formatDate = (date) => {
    if (!date) return 'Invalid Date';
    const parsedDate = new Date(date);
    if (isNaN(parsedDate.getTime())) return 'Invalid Date';
    return parsedDate.toLocaleDateString('es-MX', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  const getStatusColor = (status) => {
    const colors = {
      'planning': 'bg-blue-100 text-blue-800',
      'in-progress': 'bg-green-100 text-green-800',
      'on-hold': 'bg-yellow-100 text-yellow-800',
      'review': 'bg-purple-100 text-purple-800',
      'completed': 'bg-emerald-100 text-emerald-800',
      'cancelled': 'bg-red-100 text-red-800'
    };
    return colors?.[status] || 'bg-gray-100 text-gray-800';
  };

  const getPriorityColor = (priority) => {
    const colors = {
      'low': 'text-green-600',
      'medium': 'text-yellow-600',
      'high': 'text-orange-600',
      'urgent': 'text-red-600'
    };
    return colors?.[priority] || 'text-gray-600';
  };

  return (
    <div className="bg-card border border-border rounded-lg p-6">
      {/* Header */}
      <div className="flex items-center space-x-4 mb-6">
        {project?.imagen && (
          <Image
            src={project?.imagen}
            alt={project?.nombre || project?.name || 'Proyecto'}
            className="w-16 h-16 rounded-lg object-cover"
          />
        )}
        <div className="flex-1">
          <h2 className="text-xl font-semibold text-foreground mb-1">
            {project?.nombre || project?.name || 'Sin nombre'}
          </h2>
          <div className="flex items-center space-x-3">
            {(project?.codigo || project?.code) && (
              <span className="font-mono text-sm text-primary">
                {project?.codigo || project?.code}
              </span>
            )}
            {project?.estado && (
              <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(project?.estado?.toLowerCase())}`}>
                {project?.estado}
              </span>
            )}
          </div>
        </div>
      </div>
      {/* Project Details Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Basic Info */}
        <div className="space-y-4">
          <h3 className="font-medium text-foreground border-b border-border pb-2">
            Información General
          </h3>
          
          <div className="space-y-3 text-sm">
            {(project?.tipo || project?.type) && (
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Tipo:</span>
                <span className="text-foreground font-medium">{project?.tipo || project?.type}</span>
              </div>
            )}
            
            {(project?.departamento || project?.department) && (
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Departamento:</span>
                <span className="text-foreground">{project?.departamento || project?.department}</span>
              </div>
            )}
            
            {project?.prioridad && (
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Prioridad:</span>
                <div className="flex items-center space-x-1">
                  <Icon 
                    name="AlertCircle" 
                    size={14} 
                    className={getPriorityColor(project?.prioridad?.toLowerCase())}
                  />
                  <span className="text-foreground">{project?.prioridad}</span>
                </div>
              </div>
            )}
            
            {(project?.ubicacion || project?.location) && (
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Ubicación:</span>
                <span className="text-foreground text-right max-w-xs">
                  {(() => {
                    const ubicacion = project?.ubicacion || project?.location;
                    if (typeof ubicacion === 'string') {
                      return ubicacion;
                    } else if (typeof ubicacion === 'object' && ubicacion !== null) {
                      const parts = [
                        ubicacion.direccion,
                        ubicacion.municipio,
                        ubicacion.estado
                      ].filter(Boolean);
                      return parts.length > 0 ? parts.join(', ') : '-';
                    }
                    return '-';
                  })()}
                </span>
              </div>
            )}
            
            {(project?.descripcion || project?.description) && (
              <div className="pt-2 border-t border-border">
                <span className="text-muted-foreground block mb-2">Descripción:</span>
                <p className="text-foreground text-sm leading-relaxed">
                  {project?.descripcion || project?.description}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Timeline & Budget */}
        <div className="space-y-4">
          <h3 className="font-medium text-foreground border-b border-border pb-2">
            Cronograma y Presupuesto
          </h3>
          
          <div className="space-y-3 text-sm">
            {(project?.cronograma?.fechaInicio || project?.fechaInicio || project?.startDate) && (
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Fecha Inicio:</span>
                <span className="text-foreground">
                  {formatDate(project?.cronograma?.fechaInicio || project?.fechaInicio || project?.startDate)}
                </span>
              </div>
            )}
            
            {(project?.cronograma?.fechaFin || project?.fechaFin || project?.endDate) && (
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Fecha Fin:</span>
                <span className="text-foreground">
                  {formatDate(project?.cronograma?.fechaFin || project?.fechaFin || project?.endDate)}
                </span>
              </div>
            )}
            
            {(() => {
              // Calcular el presupuesto total
              let presupuestoTotal = 0;
              
              if (project?.totalPresupuesto !== undefined) {
                presupuestoTotal = project.totalPresupuesto;
              } else if (project?.presupuesto && typeof project.presupuesto === 'object') {
                // Si presupuesto es un objeto, sumar todos sus valores
                presupuestoTotal = Object.values(project.presupuesto).reduce((sum, val) => {
                  return sum + (typeof val === 'number' ? val : 0);
                }, 0);
              } else if (typeof project?.presupuesto === 'number') {
                presupuestoTotal = project.presupuesto;
              } else if (typeof project?.budget === 'number') {
                presupuestoTotal = project.budget;
              }
              
              return presupuestoTotal > 0 ? (
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Presupuesto Total:</span>
                  <span className="text-foreground font-medium">
                    {formatCurrency(presupuestoTotal)}
                  </span>
                </div>
              ) : null;
            })()}
            
            {/* Desglose del Presupuesto */}
            {project?.presupuesto && typeof project.presupuesto === 'object' && (
              <div className="col-span-full pt-2 border-t border-border">
                <span className="text-muted-foreground block mb-2 font-medium">Desglose del Presupuesto:</span>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2 text-xs">
                  {project.presupuesto.manoObra && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Mano de Obra:</span>
                      <span className="text-foreground font-medium">{formatCurrency(project.presupuesto.manoObra)}</span>
                    </div>
                  )}
                  {project.presupuesto.piezas && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Piezas:</span>
                      <span className="text-foreground font-medium">{formatCurrency(project.presupuesto.piezas)}</span>
                    </div>
                  )}
                  {project.presupuesto.equipos && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Equipos:</span>
                      <span className="text-foreground font-medium">{formatCurrency(project.presupuesto.equipos)}</span>
                    </div>
                  )}
                  {project.presupuesto.materiales && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Materiales:</span>
                      <span className="text-foreground font-medium">{formatCurrency(project.presupuesto.materiales)}</span>
                    </div>
                  )}
                  {project.presupuesto.transporte && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Transporte:</span>
                      <span className="text-foreground font-medium">{formatCurrency(project.presupuesto.transporte)}</span>
                    </div>
                  )}
                </div>
              </div>
            )}
            
            {(project?.costoReal !== undefined || project?.actualCost !== undefined) && (
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Costo Real:</span>
                <span className="text-foreground font-medium">
                  {formatCurrency(project?.costoReal || project?.actualCost)}
                </span>
              </div>
            )}
            
            {(project?.progreso !== undefined || project?.progress !== undefined) && (
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Progreso:</span>
                <div className="flex items-center space-x-2">
                  <div className="w-20 bg-muted rounded-full h-2">
                    <div 
                      className="bg-primary h-2 rounded-full transition-all duration-300"
                      style={{ width: `${Math.min(100, Math.max(0, project?.progreso || project?.progress || 0))}%` }}
                    />
                  </div>
                  <span className="text-foreground font-medium w-12 text-right">
                    {Math.round(project?.progreso || project?.progress || 0)}%
                  </span>
                </div>
              </div>
            )}
            
            {/* Resumen Financiero */}
            {project?.resumenFinanciero && (
              <div className="col-span-full pt-3 border-t border-border mt-2">
                <span className="text-muted-foreground block mb-3 font-medium">Resumen Financiero:</span>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  {project.resumenFinanciero.totalAbonado !== undefined && (
                    <div className="bg-green-50 dark:bg-green-950/20 p-3 rounded-lg">
                      <div className="text-xs text-muted-foreground mb-1">Total Abonado</div>
                      <div className="text-lg font-bold text-green-600 dark:text-green-400">
                        {formatCurrency(project.resumenFinanciero.totalAbonado)}
                      </div>
                    </div>
                  )}
                  {project.resumenFinanciero.totalRestante !== undefined && (
                    <div className="bg-orange-50 dark:bg-orange-950/20 p-3 rounded-lg">
                      <div className="text-xs text-muted-foreground mb-1">Total Restante</div>
                      <div className="text-lg font-bold text-orange-600 dark:text-orange-400">
                        {formatCurrency(project.resumenFinanciero.totalRestante)}
                      </div>
                    </div>
                  )}
                  {project.resumenFinanciero.porcentajePagado !== undefined && (
                    <div className="bg-blue-50 dark:bg-blue-950/20 p-3 rounded-lg">
                      <div className="text-xs text-muted-foreground mb-1">Porcentaje Pagado</div>
                      <div className="text-lg font-bold text-blue-600 dark:text-blue-400">
                        {project.resumenFinanciero.porcentajePagado.toFixed(2)}%
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
      {/* Client Info */}
      <div className="mt-6 pt-6 border-t border-border">
        <h3 className="font-medium text-foreground mb-3 flex items-center">
          <Icon name="User" size={18} className="mr-2" />
          Información del Cliente
        </h3>
        
        {cliente ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            {/* Empresa */}
            {(cliente.empresa || cliente.nombre || cliente.razonSocial || cliente.name) && (
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Empresa:</span>
                <span className="text-foreground font-medium">
                  {cliente.empresa || cliente.nombre || cliente.razonSocial || cliente.name}
                </span>
              </div>
            )}
            
            {/* Contacto */}
            {cliente.contacto && (
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Contacto:</span>
                <span className="text-foreground font-medium">
                  {cliente.contacto}
                </span>
              </div>
            )}
            
            {/* RFC */}
            {cliente.rfc && (
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">RFC:</span>
                <span className="text-foreground font-mono text-xs uppercase">
                  {cliente.rfc}
                </span>
              </div>
            )}
            
            {/* Email */}
            {cliente.email && (
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Email:</span>
                <a 
                  href={`mailto:${cliente.email}`}
                  className="text-primary hover:underline text-sm"
                >
                  {cliente.email}
                </a>
              </div>
            )}
            
            {/* Teléfono */}
            {cliente.telefono && (
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Teléfono:</span>
                <a 
                  href={`tel:${cliente.telefono}`}
                  className="text-foreground hover:text-primary"
                >
                  {cliente.telefono}
                </a>
              </div>
            )}
            
            {/* Tipo de Cliente */}
            {(cliente.tipo || cliente.type) && (
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Tipo:</span>
                <span className="text-foreground capitalize">
                  {cliente.tipo || cliente.type}
                </span>
              </div>
            )}
            
            {/* Industria */}
            {cliente.industria && (
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Industria:</span>
                <span className="text-foreground capitalize">
                  {cliente.industria}
                </span>
              </div>
            )}
            
            {/* Relación */}
            {cliente.relacion && (
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Relación:</span>
                <span className="text-foreground capitalize">
                  {cliente.relacion}
                </span>
              </div>
            )}
            
            {/* Origen del Cliente */}
            {cliente.origenCliente && (
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Origen:</span>
                <span className="text-foreground">
                  {cliente.origenCliente}
                </span>
              </div>
            )}
            
            {/* Dirección Fiscal (si existe como objeto) */}
            {cliente.direccionFiscal && typeof cliente.direccionFiscal === 'object' && (
              <div className="col-span-full pt-2 border-t border-border">
                <span className="text-muted-foreground block mb-2">Dirección Fiscal:</span>
                <p className="text-foreground text-sm leading-relaxed">
                  {[
                    cliente.direccionFiscal.calle,
                    cliente.direccionFiscal.numero,
                    cliente.direccionFiscal.colonia,
                    cliente.direccionFiscal.municipio,
                    cliente.direccionFiscal.estado,
                    cliente.direccionFiscal.cp
                  ].filter(Boolean).join(', ')}
                </p>
              </div>
            )}
            
            {/* Notas del Cliente */}
            {cliente.notas && (
              <div className="col-span-full pt-2 border-t border-border">
                <span className="text-muted-foreground block mb-2">Notas:</span>
                <p className="text-foreground text-sm leading-relaxed">
                  {cliente.notas}
                </p>
              </div>
            )}
          </div>
        ) : (
          <div className="text-center py-6 bg-muted/30 rounded-lg">
            <Icon name="UserX" size={32} className="text-muted-foreground mx-auto mb-2" />
            <p className="text-muted-foreground text-sm">
              No hay información del cliente asociada a este proyecto
            </p>
            <p className="text-muted-foreground text-xs mt-1">
              ID de Cliente: {
                project?.clienteId 
                || project?.clientId 
                || project?.cliente?.id 
                || project?.cliente?._id
                || project?.client?.id 
                || project?.client?._id
                || 'No asignado'
              }
            </p>
          </div>
        )}
      </div>
      {/* Assigned Personnel */}
      {project?.assignedPersonnel?.length > 0 && (
        <div className="mt-6 pt-6 border-t border-border">
          <h3 className="font-medium text-foreground mb-3">
            Personal Asignado
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {project?.assignedPersonnel?.map((person, index) => (
              <div key={index} className="flex items-center space-x-3 p-3 bg-muted/30 rounded-lg">
                <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center">
                  <Icon name="User" size={16} className="text-primary-foreground" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-foreground">{person?.name}</div>
                  <div className="text-xs text-muted-foreground">{person?.role}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
      {/* Work Orders */}
      {project?.workOrders?.length > 0 && (
        <div className="mt-6 pt-6 border-t border-border">
          <h3 className="font-medium text-foreground mb-3">
            Órdenes de Trabajo
          </h3>
          
          <div className="space-y-2">
            {project?.workOrders?.map((order, index) => (
              <div key={index} className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
                <span className="text-sm font-medium text-foreground">{order?.code}</span>
                <span className={`px-2 py-1 rounded text-xs font-medium ${getStatusColor(order?.status)}`}>
                  {order?.statusLabel}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default ProjectInfoPanel;