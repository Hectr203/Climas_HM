// Ejemplo de cómo integrar el sistema de versiones en tu componente de cotización

import React, { useState } from 'react';
import QuotationVersionHistory from './components/QuotationVersionHistory';
import Button from '../../components/ui/Button';
import Icon from '../../components/AppIcon';
import useQuotation from '../../hooks/useQuotation';
import { useNotifications } from '../../context/NotificationContext';

const QuotationDetailPage = ({ quotation }) => {
  const [showVersionHistory, setShowVersionHistory] = useState(false);
  const [currentQuotation, setCurrentQuotation] = useState(quotation);
  
  const { createVersion, restoreVersion } = useQuotation();
  const { showSuccess, showError } = useNotifications();

  // Función para guardar versión manualmente
  const handleSaveVersion = async () => {
    try {
      const notas = prompt('Ingrese una nota para esta versión (opcional):');
      
      await createVersion(currentQuotation.id, {
        notas: notas || 'Versión guardada manualmente',
        cambios: [], // Puedes detectar cambios automáticamente si lo deseas
        creadoPor: 'Usuario Actual' // Obtener del contexto de autenticación
      });
      
      showSuccess('Versión guardada exitosamente');
    } catch (error) {
      showError('Error al guardar la versión');
      console.error(error);
    }
  };

  // Función para manejar la selección de una versión
  const handleSelectVersion = async (version) => {
    try {
      // Opción 1: Solo visualizar (cargar datos de la versión)
      setCurrentQuotation({
        ...currentQuotation,
        ...version.snapshot
      });

      // Opción 2: Restaurar permanentemente
      // const restored = await restoreVersion(currentQuotation.id, version.id);
      // setCurrentQuotation(restored);
      
      showSuccess(`Visualizando versión ${version.version}`);
    } catch (error) {
      showError('Error al cargar la versión');
      console.error(error);
    }
  };

  return (
    <div className="p-6">
      {/* Header con botones de acción */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Cotización #{currentQuotation.folio}</h1>
        
        <div className="flex gap-3">
          {/* Botón para guardar versión actual */}
          <Button
            variant="outline"
            onClick={handleSaveVersion}
            iconName="Save"
            iconPosition="left"
          >
            Guardar Versión
          </Button>

          {/* Botón para ver historial de versiones */}
          <Button
            variant="outline"
            onClick={() => setShowVersionHistory(true)}
            iconName="History"
            iconPosition="left"
          >
            Ver Historial
          </Button>

          {/* Otros botones... */}
          <Button variant="default">
            Guardar Cambios
          </Button>
        </div>
      </div>

      {/* Indicador de versión actual */}
      {currentQuotation.version && (
        <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg flex items-center gap-2">
          <Icon name="Info" size={16} className="text-blue-600" />
          <span className="text-sm text-blue-800">
            Versión actual: <strong>v{currentQuotation.version}</strong>
            {currentQuotation.fechaActualizacion && (
              <> • Última modificación: {new Date(currentQuotation.fechaActualizacion).toLocaleString('es-MX')}</>
            )}
          </span>
        </div>
      )}

      {/* Contenido de la cotización */}
      <div className="space-y-6">
        {/* Tu contenido actual de cotización aquí */}
        <div className="bg-card rounded-lg border border-border p-6">
          {/* Materiales, servicios, etc. */}
        </div>
      </div>

      {/* Modal de historial de versiones */}
      <QuotationVersionHistory
        isOpen={showVersionHistory}
        onClose={() => setShowVersionHistory(false)}
        quotationId={currentQuotation.id}
        currentVersion={currentQuotation.version}
        onSelectVersion={handleSelectVersion}
      />
    </div>
  );
};

export default QuotationDetailPage;


// ============================================================
// EJEMPLO 2: Integración con auto-guardado
// ============================================================

const QuotationBuilderWithAutoVersion = ({ quotation }) => {
  const [hasChanges, setHasChanges] = useState(false);
  const { createVersion } = useQuotation();

  // Detectar cambios automáticamente
  const handleQuotationChange = (updatedData) => {
    setHasChanges(true);
    // ... actualizar estado local
  };

  // Auto-guardar versión cada X cambios
  useEffect(() => {
    if (hasChanges) {
      const timer = setTimeout(async () => {
        await createVersion(quotation.id, {
          notas: 'Versión auto-guardada',
          creadoPor: 'Sistema'
        });
        setHasChanges(false);
      }, 5000); // Guardar después de 5 segundos de inactividad

      return () => clearTimeout(timer);
    }
  }, [hasChanges, quotation.id, createVersion]);

  return (
    <div>
      {hasChanges && (
        <div className="fixed bottom-4 right-4 bg-yellow-100 border border-yellow-300 rounded-lg p-3 flex items-center gap-2">
          <Icon name="AlertCircle" className="text-yellow-600" />
          <span className="text-sm text-yellow-800">
            Cambios sin guardar. Se guardará automáticamente...
          </span>
        </div>
      )}
      
      {/* Tu formulario de cotización */}
    </div>
  );
};


// ============================================================
// EJEMPLO 3: Comparación de versiones
// ============================================================

const VersionComparison = ({ version1, version2 }) => {
  const getDifferences = () => {
    const diffs = [];
    
    // Comparar totales
    if (version1.totalGeneral !== version2.totalGeneral) {
      diffs.push({
        field: 'Total',
        old: version1.totalGeneral,
        new: version2.totalGeneral,
        change: version2.totalGeneral - version1.totalGeneral
      });
    }

    // Comparar número de materiales
    if (version1.materiales?.length !== version2.materiales?.length) {
      diffs.push({
        field: 'Materiales',
        old: version1.materiales?.length || 0,
        new: version2.materiales?.length || 0,
        change: (version2.materiales?.length || 0) - (version1.materiales?.length || 0)
      });
    }

    return diffs;
  };

  return (
    <div className="space-y-4">
      <h3 className="font-semibold">Diferencias entre versiones</h3>
      {getDifferences().map((diff, idx) => (
        <div key={idx} className="flex items-center justify-between p-3 bg-muted rounded-lg">
          <span className="font-medium">{diff.field}</span>
          <div className="flex items-center gap-4">
            <span className="text-muted-foreground">{diff.old}</span>
            <Icon name="ArrowRight" size={16} />
            <span className="font-semibold">{diff.new}</span>
            <span className={`text-sm ${diff.change > 0 ? 'text-green-600' : 'text-red-600'}`}>
              ({diff.change > 0 ? '+' : ''}{diff.change})
            </span>
          </div>
        </div>
      ))}
    </div>
  );
};
