import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Icon from '../../../components/AppIcon';
import Button from '../../../components/ui/Button';
import usePerson from '../../../hooks/usePerson';
import useProyect from '../../../hooks/useProyect';
import useGastos from '../../../hooks/useGastos';
import useOperac from '../../../hooks/useOperac';

const DepartmentWorkload = () => {
  const navigate = useNavigate();
  const [selectedPeriod, setSelectedPeriod] = useState('week');
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(true);

  // Hooks para obtener datos
  const { persons, getPersons } = usePerson();
  const { proyectos, getProyectos } = useProyect();
  const { getGastos } = useGastos();
  const { getOrdenesCompra } = useOperac();

  // Función para navegar a gestión de personal
  const handleManagePersonnel = () => {
    navigate('/personal');
  };

  // Función para calcular workload basado en datos reales
  const calculateWorkload = (employeeCount, activeProjects) => {
    if (employeeCount === 0) return 0;
    
    // Cálculo basado en proyectos por empleado
    const projectsPerEmployee = activeProjects / employeeCount;
    let baseWorkload = Math.min((projectsPerEmployee * 20), 100); // Máximo 100%
    
    // Ajuste por período: semana vs mes
    if (selectedPeriod === 'month') {
      // En vista mensual, el workload puede ser mayor debido a acumulación
      baseWorkload = Math.min(baseWorkload * 1.2, 100);
    }
    
    return Math.round(baseWorkload);
  };



  // Cargar datos iniciales
  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        await Promise.all([
          getPersons(),
          getProyectos()
        ]);
      } catch (error) {
        console.error('Error cargando datos:', error);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, []);

  // Procesar datos cuando cambien persons, proyectos o período
  useEffect(() => {
    if (persons && proyectos) {
      const departmentData = processDepartmentData();
      setDepartments(departmentData);
    } else if (!loading) {
      // Si no hay datos y ya terminó de cargar, mostrar departamentos vacíos
      setDepartments(getEmptyDepartments());
    }
  }, [persons, proyectos, loading, selectedPeriod]);

  const processDepartmentData = () => {

    
    // Agrupar personas por departamento
    const personsByDept = {};
    if (Array.isArray(persons) && persons.length > 0) {

      persons.forEach(person => {
        let dept = (person.departamento || person.area || person.department || person.dept || 'otros').toLowerCase().trim();
        
        // Normalizar nombres de departamentos
        if (dept.includes('admin')) dept = 'administracion';
        else if (dept.includes('proyecto') || dept.includes('project')) dept = 'proyectos';
        else if (dept.includes('taller') || dept.includes('workshop')) dept = 'taller';
        else if (dept.includes('venta') || dept.includes('sales') || dept.includes('comercial')) dept = 'ventas';
        
        if (!personsByDept[dept]) personsByDept[dept] = [];
        personsByDept[dept].push(person);
      });
    } else {

    }

    // Contar proyectos activos


    const activeProjects = Array.isArray(proyectos) 
      ? proyectos.filter(p => {
          const estado = (p.estado || p.status || '').toLowerCase();
          return estado === 'activo' || 
                 estado === 'en_progreso' || 
                 estado === 'en progreso' ||
                 estado === 'active' || 
                 estado === 'iniciado' ||
                 estado === 'in_progress' ||
                 estado === 'progress' ||
                 !estado || // Si no tiene estado, asumimos que está activo
                 estado !== 'completado' && estado !== 'terminado' && estado !== 'cancelled' && estado !== 'cancelado';
        }).length 
      : proyectos?.length || 0; // Si no es array pero existe, usar su length o asumir que hay proyectos
    


    return [
      {
        id: 'administration',
        name: 'Administración',
        icon: 'FileText',
        color: 'bg-primary',
        activeProjects: activeProjects > 0 ? Math.floor(activeProjects * 0.3) : (proyectos?.length > 0 ? Math.floor(proyectos.length * 0.3) : 0),

        totalEmployees: (personsByDept['administracion'] || personsByDept['admin'] || []).length,
        workload: calculateWorkload((personsByDept['administracion'] || personsByDept['admin'] || []).length, activeProjects > 0 ? Math.floor(activeProjects * 0.3) : 0),
        staff: (personsByDept['administracion'] || personsByDept['admin'] || []).slice(0, 3).map(person => ({
          name: person.nombre || person.name || person.nombreCompleto || person.fullName || 'Sin nombre',
          role: person.puesto || person.cargo || person.position || person.role || 'Ejecutivo',
          status: 'active'
        })) || [{ name: 'Sin personal', role: 'N/A', status: 'offline' }]
      },
      {
        id: 'projects',
        name: 'Proyectos',
        icon: 'FolderOpen',
        color: 'bg-success',
        activeProjects: activeProjects > 0 ? Math.floor(activeProjects * 0.5) : (proyectos?.length > 0 ? Math.floor(proyectos.length * 0.5) : 0),

        totalEmployees: (personsByDept['proyectos'] || personsByDept['projects'] || []).length,
        workload: calculateWorkload((personsByDept['proyectos'] || personsByDept['projects'] || []).length, activeProjects > 0 ? Math.floor(activeProjects * 0.5) : 0),
        staff: (personsByDept['proyectos'] || personsByDept['projects'] || []).slice(0, 3).map(person => ({
          name: person.nombre || person.name || person.nombreCompleto || person.fullName || 'Sin nombre',
          role: person.puesto || person.cargo || person.position || person.role || 'Empleado',
          status: 'active'
        })) || [{ name: 'Sin personal', role: 'N/A', status: 'offline' }]
      },
      {
        id: 'workshop',
        name: 'Taller',
        icon: 'Wrench',
        color: 'bg-warning',
        activeProjects: activeProjects > 0 ? Math.floor(activeProjects * 0.2) : (proyectos?.length > 0 ? Math.floor(proyectos.length * 0.2) : 0),

        totalEmployees: (personsByDept['taller'] || personsByDept['workshop'] || []).length,
        workload: calculateWorkload((personsByDept['taller'] || personsByDept['workshop'] || []).length, activeProjects > 0 ? Math.floor(activeProjects * 0.2) : 0),
        staff: (personsByDept['taller'] || personsByDept['workshop'] || []).slice(0, 3).map(person => ({
          name: person.nombre || person.name || person.nombreCompleto || person.fullName || 'Sin nombre',
          role: person.puesto || person.cargo || person.position || person.role || 'Técnico',
          status: 'busy'
        })) || [{ name: 'Sin personal', role: 'N/A', status: 'offline' }]
      },
      {
        id: 'sales',
        name: 'Ventas',
        icon: 'Users',
        color: 'bg-accent',
        activeProjects: activeProjects > 0 ? Math.floor(activeProjects * 0.4) : (proyectos?.length > 0 ? Math.floor(proyectos.length * 0.4) : 0),

        totalEmployees: (personsByDept['ventas'] || personsByDept['sales'] || []).length,
        workload: calculateWorkload((personsByDept['ventas'] || personsByDept['sales'] || []).length, activeProjects > 0 ? Math.floor(activeProjects * 0.4) : 0),
        staff: (personsByDept['ventas'] || personsByDept['sales'] || []).slice(0, 3).map(person => ({
          name: person.nombre || person.name || person.nombreCompleto || 'Sin nombre',
          role: person.puesto || person.cargo || person.position || 'Ejecutivo',
          status: 'active'
        })) || [{ name: 'Sin personal', role: 'N/A', status: 'offline' }]
      }
    ];
  };

  const getEmptyDepartments = () => [
    {
      id: 'administration',
      name: 'Administración',
      icon: 'FileText',
      color: 'bg-primary',
      activeProjects: 0,
      totalEmployees: 0,
      workload: 0,
      staff: [{ name: 'Sin personal', role: 'N/A', status: 'offline' }]
    },
    {
      id: 'projects',
      name: 'Proyectos',
      icon: 'FolderOpen',
      color: 'bg-success',
      activeProjects: 0,
      totalEmployees: 0,
      workload: 0,
      staff: [{ name: 'Sin personal', role: 'N/A', status: 'offline' }]
    },
    {
      id: 'workshop',
      name: 'Taller',
      icon: 'Wrench',
      color: 'bg-warning',
      activeProjects: 0,
      totalEmployees: 0,
      workload: 0,
      staff: [{ name: 'Sin personal', role: 'N/A', status: 'offline' }]
    },
    {
      id: 'sales',
      name: 'Ventas',
      icon: 'Users',
      color: 'bg-accent',
      activeProjects: 0,
      totalEmployees: 0,
      workload: 0,
      staff: [{ name: 'Sin personal', role: 'N/A', status: 'offline' }]
    }
  ];

  const getWorkloadColor = (workload) => {
    if (workload >= 90) return 'bg-red-500';
    if (workload >= 75) return 'bg-orange-500';
    if (workload >= 50) return 'bg-yellow-500';
    if (workload >= 25) return 'bg-blue-500';
    if (workload > 0) return 'bg-green-500';
    return 'bg-gray-300';
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'active': return 'bg-success';
      case 'busy': return 'bg-warning';
      case 'offline': return 'bg-muted';
      default: return 'bg-muted';
    }
  };

  const getStatusText = (status) => {
    switch (status) {
      case 'active': return 'Disponible';
      case 'busy': return 'Ocupado';
      case 'offline': return 'Desconectado';
      default: return 'Desconocido';
    }
  };

  return (
    <div className="bg-card border border-border rounded-lg card-shadow">
      <div className="p-6 border-b border-border">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-foreground">Distribución de Personal por Departamento</h3>
            <p className="text-sm text-muted-foreground">
              Personal activo y carga de trabajo - {selectedPeriod === 'week' ? 'Vista Semanal' : 'Vista Mensual'}
            </p>
          </div>
          <div className="flex items-center space-x-2">
            <Button
              variant={selectedPeriod === 'week' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setSelectedPeriod('week')}
            >
              Semana
            </Button>
            <Button
              variant={selectedPeriod === 'month' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setSelectedPeriod('month')}
            >
              Mes
            </Button>
          </div>
        </div>
      </div>
      <div className="p-6">
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <div className="text-center">
              <Icon name="Loader2" size={32} className="animate-spin text-muted-foreground mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">Cargando datos de departamentos...</p>
            </div>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {departments?.map((dept) => (
            <div key={dept?.id} className="border border-border rounded-lg p-4">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center space-x-3">
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${dept?.color} text-white`}>
                    <Icon name={dept?.icon} size={20} />
                  </div>
                  <div>
                    <h4 className="font-semibold text-foreground">{dept?.name}</h4>
                    <p className="text-sm text-muted-foreground">{dept?.staff?.length} miembros</p>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-lg font-bold text-foreground">{dept?.workload}%</div>
                  <div className="text-xs text-muted-foreground">Capacidad</div>
                </div>
              </div>

              {/* Workload Bar */}
              <div className="mb-4">
                <div className="flex items-center justify-between text-sm mb-2">
                  <span className="text-muted-foreground">Carga de trabajo</span>
                  <span className="font-medium text-foreground">{dept?.workload}%</span>
                </div>
                <div className="w-full bg-muted rounded-full h-2">
                  <div 
                    className={`h-2 rounded-full transition-all duration-300 ${getWorkloadColor(dept?.workload)}`}
                    style={{ width: `${dept?.workload}%` }}
                  />
                </div>
              </div>

              {/* Department Stats */}
              <div className="grid grid-cols-3 gap-4 mb-4">
                <div className="text-center">
                  <div className="text-lg font-bold text-foreground">{dept?.activeProjects}</div>
                  <div className="text-xs text-muted-foreground">Proyectos</div>
                </div>
                <div className="text-center">
                  <div className="text-lg font-bold text-foreground">{dept?.staff?.length || 0}</div>
                  <div className="text-xs text-muted-foreground">Personal</div>
                </div>
                <div className="text-center">
                  <div className="text-lg font-bold text-foreground">{dept?.totalEmployees}</div>
                  <div className="text-xs text-muted-foreground">Total Empleados</div>
                </div>
              </div>

              {/* Staff List */}
              <div className="space-y-2">
                <h5 className="text-sm font-medium text-foreground mb-2">Personal</h5>
                {dept?.staff?.map((member, index) => (
                  <div key={index} className="flex items-center justify-between p-2 bg-muted rounded-lg">
                    <div className="flex items-center space-x-3">
                      <div className="w-8 h-8 bg-secondary rounded-full flex items-center justify-center">
                        <Icon name="User" size={14} color="white" />
                      </div>
                      <div>
                        <div className="text-sm font-medium text-foreground">{member?.name}</div>
                        <div className="text-xs text-muted-foreground">{member?.role}</div>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <div className={`w-2 h-2 rounded-full ${getStatusColor(member?.status)}`} 
                           title={getStatusText(member?.status)} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
            <div className="p-6 border-t border-border">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4 text-sm text-muted-foreground">
                  <div className="flex items-center space-x-2">
                    <div className="w-2 h-2 rounded-full bg-success" />
                    <span>Disponible</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className="w-2 h-2 rounded-full bg-warning" />
                    <span>Ocupado</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className="w-2 h-2 rounded-full bg-muted" />
                    <span>Desconectado</span>
                  </div>
                </div>
                <Button 
                  variant="outline" 
                  size="sm" 
                  iconName="Users" 
                  iconPosition="left"
                  onClick={handleManagePersonnel}
                >
                  Gestionar Personal
                </Button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default DepartmentWorkload;