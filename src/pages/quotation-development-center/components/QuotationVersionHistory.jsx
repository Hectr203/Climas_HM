import React, { useState, useEffect } from 'react';
import Icon from '../../../components/AppIcon';
import Button from '../../../components/ui/Button';
import useQuotation from '../../../hooks/useQuotation';
import { useNotifications } from '../../../context/NotificationContext';

const formatDate = (dateString) => {
  if (!dateString) return 'N/A';
  const date = new Date(dateString);
  return date.toLocaleString('es-MX', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
};

const formatCurrency = (amount) => {
  if (amount === null || amount === undefined) return '$0.00';
  return new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency: 'MXN'
  }).format(Number(amount));
};

const QuotationVersionHistory = ({ 
  isOpen, 
  onClose, 
  quotationId, 
  currentVersion,
  onSelectVersion 
}) => {
  const [versions, setVersions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedVersion, setSelectedVersion] = useState(null);
  
  const { getQuotationVersions } = useQuotation();
  const { showError, showSuccess } = useNotifications();

  useEffect(() => {
    if (isOpen && quotationId) {
      loadVersions();
    }
  }, [isOpen, quotationId]);

  const loadVersions = async () => {
    setLoading(true);
    try {
      const response = await getQuotationVersions(quotationId);
      const versionsList = response?.data || response || [];
      // Ordenar por versión descendente
      const sorted = versionsList.sort((a, b) => b.version - a.version);
      setVersions(sorted);
    } catch (error) {
      console.error('Error cargando versiones:', error);
      showError('Error al cargar el historial de versiones');
    } finally {
      setLoading(false);
    }
  };

  const handleSelectVersion = (version) => {
    setSelectedVersion(version);
  };

  const handleApplyVersion = () => {
    if (selectedVersion) {
      onSelectVersion(selectedVersion);
      showSuccess(`Versión ${selectedVersion.version} seleccionada`);
      onClose();
    }
  };

  const getVersionBadge = (version) => {
    if (version.version === currentVersion) {
      return (
        <span className="px-2 py-1 bg-green-100 text-green-800 text-xs font-semibold rounded-full">
          Actual
        </span>
      );
    }
    return (
      <span className="px-2 py-1 bg-gray-100 text-gray-600 text-xs font-semibold rounded-full">
        v{version.version}
      </span>
    );
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-card border border-border rounded-lg w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-border">
          <div>
            <h2 className="text-xl font-semibold text-foreground flex items-center gap-2">
              <Icon name="History" size={24} />
              Historial de Versiones
            </h2>
            <p className="text-sm text-muted-foreground mt-1">
              Seleccione una versión para restaurar o comparar
            </p>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <Icon name="X" size={20} />
          </Button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : versions.length === 0 ? (
            <div className="text-center py-12">
              <Icon name="FileX" size={48} className="mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">No hay versiones guardadas</p>
            </div>
          ) : (
            <div className="space-y-3">
              {versions.map((version) => (
                <div
                  key={version.id || version.version}
                  onClick={() => handleSelectVersion(version)}
                  className={`p-4 border rounded-lg cursor-pointer transition-all ${
                    selectedVersion?.version === version.version
                      ? 'border-primary bg-primary/5 ring-2 ring-primary/20'
                      : 'border-border hover:border-primary/50 hover:bg-muted/50'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        {getVersionBadge(version)}
                        <span className="text-sm font-medium text-foreground">
                          Versión {version.version}
                        </span>
                        {selectedVersion?.version === version.version && (
                          <Icon name="Check" size={16} className="text-primary" />
                        )}
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
                        <div>
                          <span className="text-muted-foreground">Fecha:</span>
                          <p className="text-foreground font-medium">
                            {formatDate(version.fechaCreacion || version.createdAt)}
                          </p>
                        </div>
                        
                        <div>
                          <span className="text-muted-foreground">Total:</span>
                          <p className="text-foreground font-medium">
                            {(() => {
                              const montoFinal = version.montoFinal || version.snapshot?.totales?.montoFinal;
                              const montoTotal = version.montoTotal || version.totalGeneral || version.total || version.snapshot?.totales?.montoTotal || version.snapshot?.constructor?.monto_total || 0;
                              const descuento = version.porcentajeDescuento || version.snapshot?.totales?.descuento || 0;
                              
                              if (descuento > 0 && montoFinal) {
                                return (
                                  <span className="space-y-1">
                                    <span className="line-through text-muted-foreground text-xs block">{formatCurrency(montoTotal)}</span>
                                    <span className="text-green-600 font-bold">{formatCurrency(montoFinal)}</span>
                                    <span className="text-xs text-orange-600 block">-{descuento}%</span>
                                  </span>
                                );
                              }
                              return formatCurrency(montoTotal);
                            })()}
                          </p>
                        </div>
                        
                        <div>
                          <span className="text-muted-foreground">Modificado por:</span>
                          <p className="text-foreground font-medium">
                            {version.modificadoPor || version.creadoPor || 'Sistema'}
                          </p>
                        </div>
                      </div>

                      {version.notas && (
                        <div className="mt-2 text-sm">
                          <span className="text-muted-foreground">Notas:</span>
                          <p className="text-foreground">{version.notas}</p>
                        </div>
                      )}

                      {version.cambios && version.cambios.length > 0 && (
                        <div className="mt-2">
                          <span className="text-xs text-muted-foreground">Cambios:</span>
                          <ul className="list-disc list-inside text-xs text-foreground mt-1">
                            {version.cambios.map((cambio, idx) => (
                              <li key={idx}>{cambio}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 p-6 border-t border-border">
          <Button variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button
            variant="default"
            onClick={handleApplyVersion}
            disabled={!selectedVersion || selectedVersion.version === currentVersion}
            iconName="CheckCircle"
            iconPosition="left"
          >
            Restaurar Versión
          </Button>
        </div>
      </div>
    </div>
  );
};

export default QuotationVersionHistory;
