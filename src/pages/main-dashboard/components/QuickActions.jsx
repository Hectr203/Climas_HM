import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Icon from '../../../components/AppIcon';
import Button from '../../../components/ui/Button';
import useGastos from '../../../hooks/useGastos';
import useInventario from '../../../hooks/useInventario';
import { useNotifications } from '../../../context/NotificationContext';

const QuickActions = ({ onRefresh }) => {
  const navigate = useNavigate();
  const { showSuccess, showError } = useNotifications();
  const { getGastos } = useGastos();
  const { inventario, loading: inventarioLoading, getInventario } = useInventario();
  
  const [pendingExpenses, setPendingExpenses] = useState(0);
  const [lowStockItems, setLowStockItems] = useState(0);
  const [gastosLoading, setGastosLoading] = useState(false);

  useEffect(() => {
    // Cargar gastos y calcular pendientes
    const loadGastos = async () => {
      setGastosLoading(true);
      try {
        const gastosData = await getGastos();
        const gastos = Array.isArray(gastosData) ? gastosData : [];
        const pending = gastos.filter(gasto => 
          gasto.estado === 'pendiente' || gasto.estado === 'no aprobado'
        ).length;
        setPendingExpenses(pending);
      } catch (error) {
        console.error('Error al cargar gastos:', error);
        setPendingExpenses(0);
      }
      setGastosLoading(false);
    };
    
    loadGastos();
  }, [getGastos]);

  useEffect(() => {
    // Cargar inventario inicial
    getInventario();
  }, []);

  useEffect(() => {
    // Calcular artículos con stock bajo (menos de 10 unidades)
    if (inventario && Array.isArray(inventario)) {
      const lowStock = inventario.filter(articulo => 
        (articulo.cantidad || articulo.stock || 0) < 10
      ).length;
      setLowStockItems(lowStock);
    }
  }, [inventario]);

  const quickActions = [
    {
      id: 'new-project',
      title: 'Crear Proyecto',
      description: 'Ir a la gestión de proyectos',
      icon: 'Plus',
      color: 'bg-primary text-primary-foreground',
      action: () => navigate('/proyectos')
    },
    {
      id: 'approve-expenses',
      title: 'Revisar Gastos',
      description: 'Gestionar solicitudes de gastos',
      icon: 'CheckCircle',
      color: 'bg-success text-success-foreground',
      action: () => navigate('/finanzas'),
      disabled: gastosLoading
    },
    {
      id: 'generate-report',
      title: 'Generar Reportes',
      description: 'Crear reportes financieros, gastos y estados de proyectos',
      icon: 'FileText',
      color: 'bg-accent text-accent-foreground',
      action: () => navigate('/finanzas')
    },
    {
      id: 'inventory-check',
      title: 'Gestionar Inventario',
      description: 'Revisar y gestionar inventario de artículos',
      icon: 'Package',
      color: 'bg-warning text-warning-foreground',
      action: () => navigate('/inventario'),
      disabled: inventarioLoading
    },
    {
      id: 'client-contact',
      title: 'Gestionar Clientes',
      description: 'Ver clientes, contactar y dar seguimiento a cotizaciones',
      icon: 'Phone',
      color: 'bg-secondary text-secondary-foreground',
      action: () => navigate('/clientes')
    },
    // {
    //   id: 'schedule-maintenance',
    //   title: 'Programar Mantenimiento',
    //   description: 'Equipos requieren servicio',
    //   icon: 'Calendar',
    //   color: 'bg-muted text-foreground',
    //   action: () => navigate('/operaciones')
    // }
  ];

  const handleActionClick = (action) => {
    try {
      if (action?.disabled) {
        showError('Esta función está cargando, por favor espera un momento');
        return;
      }
      
      if (action?.action) {
        action.action();
      }
    } catch (error) {
      showError(`Error al ejecutar ${action.title}`);
      console.error(`Error en acción ${action.id}:`, error);
    }
  };

  const handleRefreshData = async () => {
    try {

      // Refrescar datos locales
      await Promise.all([
        getGastos(),
        getInventario()
      ]);
      
      // Refrescar datos del dashboard principal si está disponible
      if (onRefresh) {
        await onRefresh();
      }
      
      showSuccess('Datos actualizados correctamente');
    } catch (error) {
      console.error('Error al actualizar datos:', error);
      showError('Error al actualizar los datos');
    }
  };

  const handleMoreOptions = () => {
  // console.log eliminado
    // Add dropdown menu or modal with additional options
  };

  return (
    <div className="bg-card border border-border rounded-lg card-shadow">
      <div className="p-6 border-b border-border">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-foreground">Acciones Rápidas</h3>
            <p className="text-sm text-muted-foreground">Funciones críticas de acceso directo</p>
          </div>
          {/* <Button variant="ghost" size="icon" onClick={handleMoreOptions}>
            <Icon name="MoreHorizontal" size={20} />
          </Button> */}
        </div>
      </div>
      <div className="p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {quickActions?.map((action) => (
            <button
              key={action?.id}
              onClick={() => handleActionClick(action)}
              disabled={action?.disabled}
              className={`p-4 border border-border rounded-lg hover:border-primary hover:shadow-md transition-all duration-200 text-left group ${
                action?.disabled ? 'opacity-50 cursor-not-allowed' : ''
              }`}
            >
              <div className="flex items-start space-x-3">
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${action?.color} group-hover:scale-110 transition-transform`}>
                  <Icon name={action?.icon} size={20} />
                </div>
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <h4 className="font-medium text-foreground group-hover:text-primary transition-smooth">
                      {action?.title}
                    </h4>
                    {action?.badge && (
                      <span className="px-2 py-1 text-xs font-medium bg-error text-error-foreground rounded-full">
                        {action?.badge}
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">{action?.description}</p>
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>

    </div>
  );
};

export default QuickActions;