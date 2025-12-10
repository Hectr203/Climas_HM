import React, { useState, useEffect, useCallback } from 'react';
import Header from '../../components/ui/Header';
import Sidebar from '../../components/ui/Sidebar';
import Breadcrumb from '../../components/ui/Breadcrumb';
import KPICard from './components/KPICard';
import ProjectStatusTable from './components/ProjectStatusTable';
import useProyect from '../../hooks/useProyect';
import useGastos from '../../hooks/useGastos';
import NotificationPanel from './components/NotificationPanel';
import QuickActions from './components/QuickActions';
// import FinancialSummary from './components/FinancialSummary';
import DepartmentWorkload from './components/DepartmentWorkload';

const MainDashboard = () => {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());
  
  // Estados para KPIs dinámicos
  const [proyectosActivos, setProyectosActivos] = useState(0);
  const [aprobacionesPendientes, setAprobacionesPendientes] = useState(0);
  const [loading, setLoading] = useState(true);
  const [lastUpdate, setLastUpdate] = useState(new Date());
  
  // Hooks
  const { proyectos, getProyectos } = useProyect();
  const { getGastos } = useGastos();

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 60000); // Update every minute

    return () => clearInterval(timer);
  }, []);

  // Función para cargar datos de KPIs
  const loadKPIData = useCallback(async () => {
    try {
      setLoading(true);
      
      // Cargar proyectos y calcular activos
      const proyectosData = await getProyectos();
      if (Array.isArray(proyectosData)) {

        
        // Contar proyectos activos (todos excepto cancelado, completado o pausa)
        const activos = proyectosData.filter(proyecto => {
          const estado = (proyecto.estado || proyecto.status || '').toLowerCase();
          return !estado.includes('cancelado') && 
                 !estado.includes('completado') && 
                 !estado.includes('terminado') &&
                 !estado.includes('finalizado') &&
                 !estado.includes('pausa') &&
                 !estado.includes('pausado') &&
                 !estado.includes('suspended') &&
                 !estado.includes('cancelled') &&
                 !estado.includes('completed') &&
                 !estado.includes('finished');
        }).length;
        

        setProyectosActivos(activos);
      }

      // Cargar gastos y calcular pendientes
      const gastosData = await getGastos();
      if (Array.isArray(gastosData)) {

        
        const pendientes = gastosData.filter(gasto => {
          const estado = (gasto.estado || gasto.status || '').toLowerCase();
          return estado.includes('pendiente') || 
                 estado.includes('revision') ||
                 estado.includes('esperando') ||
                 estado.includes('por aprobar') ||
                 estado.includes('sin aprobar') ||
                 estado === 'pending' ||
                 estado === 'waiting' ||
                 (!estado || estado === '') // Si no hay estado, asumir pendiente por aceptar
        }).length;
        

        setAprobacionesPendientes(pendientes);
      }
      
      setLastUpdate(new Date());
      
    } catch (error) {
      console.error('Error cargando datos KPI:', error);
      // Mantener valores por defecto en caso de error
      setProyectosActivos(0);
      setAprobacionesPendientes(0);
    } finally {
      setLoading(false);
    }
  }, [getProyectos, getGastos]);

  // Cargar datos inicial
  useEffect(() => {
    loadKPIData();
  }, [loadKPIData]);

  // Actualización automática cada 5 minutos
  useEffect(() => {
    const autoUpdateInterval = setInterval(() => {

      loadKPIData();
    }, 5 * 60 * 1000); // 5 minutos

    return () => clearInterval(autoUpdateInterval);
  }, [loadKPIData]);

  // Actualizar cuando la página vuelve a tener foco
  useEffect(() => {
    const handleFocus = () => {

      loadKPIData();
    };

    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, [loadKPIData]);

  const handleSidebarToggle = () => {
    setSidebarCollapsed(!sidebarCollapsed);
  };

  const handleMobileMenuToggle = () => {
    setMobileMenuOpen(!mobileMenuOpen);
  };

  const kpiData = [
    {
      title: 'Proyectos Activos',
      value: loading ? '...' : proyectosActivos.toString(),
      change: loading ? '' : '+0',
      changeType: 'positive',
      icon: 'FolderOpen',
      color: 'primary'
    },
    {
      title: 'Aprobaciones Pendientes',
      value: loading ? '...' : aprobacionesPendientes.toString(),
      change: loading ? '' : (aprobacionesPendientes > 0 ? '+0' : ''),
      changeType: aprobacionesPendientes > 0 ? 'negative' : 'neutral',
      icon: 'Clock',
      color: aprobacionesPendientes > 0 ? 'warning' : 'success'
    }
  ];

  const formatTime = (date) => {
    return date?.toLocaleTimeString('es-MX', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
      timeZone: 'America/Mexico_City'
    });
  };

  const formatDate = (date) => {
    return date?.toLocaleDateString('es-MX', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      timeZone: 'America/Mexico_City'
    });
  };

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

      {/* Main Content */}
      <div className={`transition-all duration-300 ${
        sidebarCollapsed ? 'lg:ml-16' : 'lg:ml-60'
      } lg:pt-0`}>
        <div className="p-6">
          {/* Header Section */}
          <div className="mb-8">
            <Breadcrumb />
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between mt-4">
              <div>
                <h1 className="text-3xl font-bold text-foreground">Panel Principal</h1>
                <p className="text-muted-foreground mt-2">
                  Resumen operativo y seguimiento de proyectos HVAC
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Última actualización: {lastUpdate.toLocaleTimeString('es-MX', {
                    hour: '2-digit',
                    minute: '2-digit',
                    second: '2-digit',
                    hour12: true,
                    timeZone: 'America/Mexico_City'
                  })}
                </p>
              </div>
              <div className="mt-4 lg:mt-0 text-right">
                <div className="text-2xl font-bold text-foreground">{formatTime(currentTime)}</div>
                <div className="text-sm text-muted-foreground capitalize">{formatDate(currentTime)}</div>
              </div>
            </div>
          </div>

          {/* KPI Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            {kpiData?.map((kpi, index) => (
              <KPICard
                key={index}
                title={kpi?.title}
                value={kpi?.value}
                change={kpi?.change}
                changeType={kpi?.changeType}
                icon={kpi?.icon}
                color={kpi?.color}
              />
            ))}
          </div>

          {/* Main Content Grid */}
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-8 mb-8">
            {/* Project Status Table - Ahora ocupa las 3 columnas */}
            <div className="xl:col-span-3">
              <ProjectStatusTable />
            </div>
          </div>

          {/* Quick Actions */}
          <div className="mb-8">
            <QuickActions onRefresh={loadKPIData} />
          </div>

          {/* Financial Summary */}
          {/* <div className="mb-8">
            <FinancialSummary />
          </div> */}

          {/* Department Workload */}
          <div className="mb-8">
            <DepartmentWorkload />
          </div>

          {/* Footer */}
          <div className="border-t border-border pt-6 mt-8">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between text-sm text-muted-foreground">
              <div>
                <p>&copy; {new Date()?.getFullYear()} AireFlow Pro. Todos los derechos reservados.</p>
              </div>
              <div className="mt-2 md:mt-0 flex items-center space-x-4">
                <span>Versión 2.1.0</span>
                <span>•</span>
                <span>Última actualización: 30/09/2024</span>
                <span>•</span>
                <span>Sistema operativo</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MainDashboard;