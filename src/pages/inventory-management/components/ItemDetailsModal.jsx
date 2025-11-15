import React from 'react';
import Button from '../../../components/ui/Button';
import Icon from '../../../components/AppIcon';

const ItemDetailsModal = ({ isOpen, onClose, item }) => {
  if (!isOpen || !item) return null;

  const getStockStatus = (current, reorderPoint) => {
    if (current === 0) return { status: 'out-of-stock', label: 'Agotado', color: 'text-error', bgColor: 'bg-error/10' };
    if (current <= reorderPoint) return { status: 'low-stock', label: 'Stock Bajo', color: 'text-warning', bgColor: 'bg-warning/10' };
    return { status: 'in-stock', label: 'En Stock', color: 'text-success', bgColor: 'bg-success/10' };
  };

  const stockStatus = getStockStatus(item.currentStock, item.reorderPoint);

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency: 'MXN'
    }).format(amount || 0);
  };

  const formatDate = (date) => {
    return new Intl.DateTimeFormat('es-MX', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(new Date(date));
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-2 sm:p-4">
      <div className="bg-background rounded-lg shadow-xl w-full max-w-6xl max-h-[95vh] sm:max-h-[90vh] flex flex-col overflow-hidden">
        {/* Modal Header */}
        <div className="flex items-center justify-between p-4 sm:p-6 border-b border-border flex-shrink-0">
          <div className="flex items-center space-x-2 sm:space-x-3 min-w-0 flex-1">
            <div className="w-8 h-8 sm:w-10 sm:h-10 bg-primary/10 rounded-lg flex items-center justify-center flex-shrink-0">
              <Icon name="Package" size={16} className="text-primary sm:w-5 sm:h-5" />
            </div>
            <div className="min-w-0 flex-1">
              <h2 className="text-lg sm:text-xl font-semibold text-foreground truncate">Detalles del Artículo</h2>
              <p className="text-xs sm:text-sm text-muted-foreground truncate">{item.itemCode}</p>
            </div>
          </div>
          <div className="flex items-center space-x-2 ml-2">
            <span className={`inline-flex items-center space-x-2 px-3 py-1 rounded-full text-sm font-medium ${stockStatus.color} ${stockStatus.bgColor}`}>
              <div className={`w-2 h-2 rounded-full ${
                stockStatus.status === 'out-of-stock' ? 'bg-error' :
                stockStatus.status === 'low-stock' ? 'bg-warning' : 'bg-success'
              }`} />
              <span>{stockStatus.label}</span>
            </span>
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              iconName="X"
              iconSize={16}
            />
          </div>
        </div>

        {/* Modal Content */}
        <div className="p-4 sm:p-6 overflow-y-auto flex-1 min-h-0">
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 sm:gap-6">
            {/* Información Básica */}
            <div className="space-y-3 sm:space-y-4">
              <div className="bg-muted/50 rounded-lg p-3 sm:p-4">
                <h3 className="text-base sm:text-lg font-semibold text-foreground mb-3 sm:mb-4 flex items-center space-x-2">
                  <Icon name="Info" size={16} className="text-primary sm:w-[18px] sm:h-[18px]" />
                  <span>Información Básica</span>
                </h3>
                
                <div className="space-y-3">
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Código</label>
                    <p className="font-mono text-sm text-foreground bg-background rounded px-2 py-1">
                      {item.itemCode}
                    </p>
                  </div>

                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Nombre</label>
                    <p className="text-sm text-foreground bg-background rounded px-2 py-1">
                      {item.name}
                    </p>
                  </div>
                  
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Descripción</label>
                    <p className="text-sm text-foreground bg-background rounded px-2 py-1">
                      {item.description}
                    </p>
                  </div>
                  
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Especificaciones</label>
                    <p className="text-sm text-foreground bg-background rounded px-2 py-2 min-h-[60px]">
                      {item.specifications}
                    </p>
                  </div>
                  
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Categoría</label>
                    <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-secondary/10 text-secondary">
                      {item.category}
                    </span>
                  </div>
                  
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Ubicación</label>
                    <p className="text-sm text-foreground bg-background rounded px-2 py-1">
                      {item.location}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Información de Stock */}
            <div className="space-y-3 sm:space-y-4">
              <div className="bg-muted/50 rounded-lg p-3 sm:p-4">
                <h3 className="text-base sm:text-lg font-semibold text-foreground mb-3 sm:mb-4 flex items-center space-x-2">
                  <Icon name="BarChart3" size={16} className="text-primary sm:w-[18px] sm:h-[18px]" />
                  <span>Stock e Inventario</span>
                </h3>
                
                <div className="grid grid-cols-3 gap-2 sm:gap-4">
                  <div className="bg-background rounded-lg p-2 sm:p-3 text-center">
                    <div className="text-xl sm:text-2xl font-bold text-foreground">{item.currentStock}</div>
                    <div className="text-xs text-muted-foreground">Stock Actual</div>
                    <div className="text-xs text-muted-foreground">{item.unit}</div>
                  </div>
                  
                  <div className="bg-background rounded-lg p-2 sm:p-3 text-center">
                    <div className="text-xl sm:text-2xl font-bold text-warning">{item.reorderPoint}</div>
                    <div className="text-xs text-muted-foreground">Punto de Reorden</div>
                    <div className="text-xs text-muted-foreground">{item.unit}</div>
                  </div>
                  
                  <div className="bg-background rounded-lg p-2 sm:p-3 text-center">
                    <div className="text-base sm:text-lg font-bold text-primary break-all">{formatCurrency(item.unitCost)}</div>
                    <div className="text-xs text-muted-foreground">Costo Unitario</div>
                  </div>
                </div>

                {/* Valor Total */}
                <div className="mt-3 bg-background rounded-lg p-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-foreground">Valor Total en Stock:</span>
                    <span className="text-lg font-bold text-primary">
                      {formatCurrency(item.unitCost * item.currentStock)}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Información del Proveedor */}
            <div className="bg-muted/50 rounded-lg p-3 sm:p-4">
              <h3 className="text-base sm:text-lg font-semibold text-foreground mb-3 sm:mb-4 flex items-center space-x-2">
                <Icon name="Truck" size={16} className="text-primary sm:w-[18px] sm:h-[18px]" />
                <span>Proveedor</span>
              </h3>
              
              <div className="space-y-3">
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Nombre</label>
                  <p className="text-sm text-foreground bg-background rounded px-2 py-1">
                    {item.supplier?.name}
                  </p>
                </div>
                
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Contacto</label>
                  <p className="text-sm text-foreground bg-background rounded px-2 py-2">
                    {item.supplier?.contact}
                  </p>
                </div>
              </div>
            </div>

            {/* Información Adicional */}
            <div className="bg-muted/50 rounded-lg p-3 sm:p-4">
              <h3 className="text-base sm:text-lg font-semibold text-foreground mb-3 sm:mb-4 flex items-center space-x-2">
                <Icon name="FileText" size={16} className="text-primary sm:w-[18px] sm:h-[18px]" />
                <span>Información Adicional</span>
              </h3>
              
              <div className="space-y-3">
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Notas</label>
                  <p className="text-sm text-foreground bg-background rounded px-2 py-2 min-h-[60px]">
                    {item.notes || 'Sin notas adicionales'}
                  </p>
                </div>
                
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Última Actualización</label>
                  <p className="text-sm text-foreground bg-background rounded px-2 py-1">
                    {formatDate(item.lastUpdated)}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="flex items-center justify-end space-x-3 p-4 sm:p-6 border-t border-border bg-background flex-shrink-0">
          <Button
            variant="outline"
            onClick={onClose}
            className="w-full sm:w-auto"
          >
            Cerrar
          </Button>
        </div>
      </div>
    </div>
  );
};

export default ItemDetailsModal;