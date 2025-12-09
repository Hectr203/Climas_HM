import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Header from '../../components/ui/Header';
import Sidebar from '../../components/ui/Sidebar';
import Breadcrumb from '../../components/ui/Breadcrumb';
import Icon from '../../components/AppIcon';
import KPICard from './components/KPICard';
import ProjectStatusTable from './components/ProjectStatusTable';
import NotificationPanel from './components/NotificationPanel';
import QuickActions from './components/QuickActions';
import FinancialSummary from './components/FinancialSummary';
import DepartmentWorkload from './components/DepartmentWorkload';

const MainDashboard = () => {
  const navigate = useNavigate();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());
  const userRole = localStorage.getItem('userRole') || localStorage.getItem('rol');

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 60000); // Update every minute

    return () => clearInterval(timer);
  }, []);

  const handleSidebarToggle = () => {
    setSidebarCollapsed(!sidebarCollapsed);
  };

  const handleMobileMenuToggle = () => {
    setMobileMenuOpen(!mobileMenuOpen);
  };

  const kpiData = [
    {
      title: 'Proyectos Activos',
      value: '24',
      change: '+3',
      changeType: 'positive',
      icon: 'FolderOpen',
      color: 'primary'
    },
    {
      title: 'Aprobaciones Pendientes',
      value: '8',
      change: '+2',
      changeType: 'negative',
      icon: 'AlertCircle',
      color: 'warning'
    },
    {
      title: 'Margen Mensual',
      value: '30.7%',
      change: '+2.3%',
      changeType: 'positive',
      icon: 'TrendingUp',
      color: 'success'
    },
    {
      title: 'Eficiencia Operativa',
      value: '87%',
      change: '+5%',
      changeType: 'positive',
      icon: 'Target',
      color: 'primary'
    }
  ];

  const formatTime = (date) => {
    return date?.toLocaleTimeString('es-MX', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    });
  };

  const formatDate = (date) => {
    return date?.toLocaleDateString('es-MX', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
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
              </div>
              <div className="mt-4 lg:mt-0 text-right">
                <div className="text-2xl font-bold text-foreground">{formatTime(currentTime)}</div>
                <div className="text-sm text-muted-foreground capitalize">{formatDate(currentTime)}</div>
              </div>
            </div>
          </div>

          {/* KPI Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
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

          {/* Card especial para rol obra */}
          {userRole === 'obra' && (
            <div className="mb-8">
              <div
                onClick={() => navigate('/my-tools')}
                className="bg-gradient-to-r from-blue-500 to-blue-600 p-6 rounded-lg shadow-lg cursor-pointer hover:shadow-xl transform hover:-translate-y-1 transition-all duration-200"
              >
                <div className="flex items-center justify-between text-white">
                  <div>
                    <h3 className="text-2xl font-bold mb-2">Mis Herramientas</h3>
                    <p className="text-blue-100">Ver y devolver herramientas asignadas</p>
                  </div>
                  <Icon name="Package" className="w-16 h-16 opacity-80" />
                </div>
              </div>
            </div>
          )}

          {/* Quick Actions */}
          <div className="mb-8">
            <QuickActions />
          </div>

          {/* Financial Summary */}
          <div className="mb-8">
            <FinancialSummary />
          </div>

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