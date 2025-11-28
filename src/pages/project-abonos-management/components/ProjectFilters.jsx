import React, { useState } from 'react';
import { Search, X, ChevronUp, ChevronDown, Download } from 'lucide-react';

/* =========================
   UI básicos (con mejoras)
========================= */
const Button = ({
  children,
  variant = 'default',
  size = 'default',
  onClick,
  iconName,
  iconPosition,
  className = '',
  disabled = false,
  type = 'button',
  title,
}) => {
  const Icon =
    iconName === 'X'
      ? X
      : iconName === 'ChevronUp'
      ? ChevronUp
      : iconName === 'ChevronDown'
      ? ChevronDown
      : iconName === 'Download'
      ? Download
      : null;

  const baseClasses =
    'inline-flex items-center justify-center font-medium rounded-md transition-colors';
  const variantClasses = {
    default: 'bg-primary text-primary-foreground hover:bg-primary/90',
    outline: 'border border-input bg-background hover:bg-accent hover:text-accent-foreground',
    ghost: 'hover:bg-accent hover:text-accent-foreground',
  };
  const sizeClasses = {
    default: 'h-10 px-4 py-2',
    sm: 'h-9 rounded-md px-3 text-sm',
  };
  const disabledClasses = disabled ? 'opacity-60 cursor-not-allowed' : '';

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      title={title}
      className={`${baseClasses} ${variantClasses[variant]} ${sizeClasses[size]} ${disabledClasses} ${className}`}
    >
      {Icon && iconPosition === 'left' && <Icon size={16} className="mr-2" />}
      {children}
      {Icon && iconPosition === 'right' && <Icon size={16} className="ml-2" />}
    </button>
  );
};

const Input = ({ label, type = 'text', placeholder, value, onChange, className = '' }) => {
  return (
    <div className="w-full">
      {label && <label className="block text-sm font-medium text-foreground mb-2">{label}</label>}
      <input
        type={type}
        placeholder={placeholder}
        value={value}
        onChange={onChange}
        className={`flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 ${className}`}
      />
    </div>
  );
};

const Select = ({ label, options, value, onChange, className = '' }) => {
  return (
    <div className={className}>
      {label && <label className="block text-sm font-medium text-foreground mb-2">{label}</label>}
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </div>
  );
};

/* =========================
   ProjectFilters conectado
========================= */
const ProjectFilters = ({
  onFiltersChange,
  totalProjects,
  filteredProjects,
  onExport, // 👈 NUEVO: handler para exportar que viene del padre
}) => {
  const [filters, setFilters] = useState({
    search: '',
    paymentStatus: '', // Nuevo: 'pagado', 'en-proceso', '' (todos)
    status: '',
    minBudget: '',
    maxBudget: '',
    department: '',
    priority: '',
  });

  const [isExpanded, setIsExpanded] = useState(false);

  const statusOptions = [
    { value: '', label: 'Todos los Estados' },
    { value: 'planning', label: 'Planificación' },
    { value: 'in-progress', label: 'En Progreso' },
    { value: 'on-hold', label: 'En Pausa' },
    { value: 'review', label: 'En Revisión' },
    { value: 'completed', label: 'Completado' },
    { value: 'cancelled', label: 'Cancelado' },
  ];

  const departmentOptions = [
    { value: '', label: 'Todos los Departamentos' },
    { value: 'sales', label: 'Ventas' },
    { value: 'engineering', label: 'Ingeniería' },
    { value: 'installation', label: 'Instalación' },
    { value: 'maintenance', label: 'Mantenimiento' },
    { value: 'administration', label: 'Administración' },
  ];

  const priorityOptions = [
    { value: '', label: 'Todas las Prioridades' },
    { value: 'low', label: 'Baja' },
    { value: 'medium', label: 'Media' },
    { value: 'high', label: 'Alta' },
    { value: 'urgent', label: 'Urgente' },
  ];

  const handleFilterChange = (key, value) => {
    const newFilters = { ...filters, [key]: value };
    setFilters(newFilters);
    onFiltersChange?.(newFilters);
  };

  const paymentStatusOptions = [
    { value: '', label: 'Todos los Estados de Pago' },
    { value: 'pagado', label: 'Proyectos Pagados' },
    { value: 'en-proceso', label: 'En Proceso de Pago' },
    { value: 'sin-pago', label: 'Sin Pagos' },
  ];

  const clearAllFilters = () => {
    const cleared = {
      search: '',
      paymentStatus: '',
      status: '',
      minBudget: '',
      maxBudget: '',
      department: '',
      priority: '',
    };
    setFilters(cleared);
    onFiltersChange?.(cleared);
  };

  const hasActiveFilters = Object.values(filters).some((v) => v !== '');

  const handleExportClick = () => {
    if (!onExport) return;
    if (!filteredProjects || filteredProjects <= 0) {
      alert('No hay proyectos para exportar con los filtros actuales.');
      return;
    }
    onExport(); // el padre exporta lo que ya está filtrado/visible
  };

  return (
    <div className="bg-card border border-border rounded-lg p-6 mb-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-4">
          <h3 className="text-lg font-semibold text-foreground">Filtros de Proyectos</h3>
          <div className="text-sm text-muted-foreground">
            Mostrando {filteredProjects} de {totalProjects} proyectos
          </div>
        </div>
        <div className="flex items-center space-x-2">
          {hasActiveFilters && (
            <Button variant="outline" size="sm" onClick={clearAllFilters} iconName="X" iconPosition="left">
              Limpiar Filtros
            </Button>
          )}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsExpanded(!isExpanded)}
            iconName={isExpanded ? 'ChevronUp' : 'ChevronDown'}
            iconPosition="right"
          >
            {isExpanded ? 'Menos Filtros' : 'Más Filtros'}
          </Button>
        </div>
      </div>

      {/* Search Bar */}
      <div className="mb-4">
        <div className="relative">
          <Input
            type="search"
            placeholder="Buscar por nombre de proyecto, código..."
            value={filters.search}
            onChange={(e) => handleFilterChange('search', e.target.value)}
            className="pl-10"
          />
          <Search size={16} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground" />
        </div>
      </div>

      {/* Quick Filters */}
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-4">
        <Select
          label="Estado de Pago"
          options={paymentStatusOptions}
          value={filters.paymentStatus}
          onChange={(value) => handleFilterChange('paymentStatus', value)}
          className="w-full"
        />
        <Select
          label="Estado del Proyecto"
          options={statusOptions}
          value={filters.status}
          onChange={(value) => handleFilterChange('status', value)}
          className="w-full"
        />
        <Select
          label="Departamento"
          options={departmentOptions}
          value={filters.department}
          onChange={(value) => handleFilterChange('department', value)}
          className="w-full"
        />
        <div className="flex items-end">
          <Button
            variant="outline"
            size="default"
            iconName="Download"
            iconPosition="left"
            className="w-full"
            onClick={handleExportClick}
            disabled={!filteredProjects}
            title={filteredProjects ? 'Exportar proyectos filtrados' : 'No hay resultados para exportar'}
          >
            Exportar
          </Button>
        </div>
      </div>

      {/* Advanced Filters */}
      {isExpanded && (
        <div className="border-t border-border pt-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Input
              label="Presupuesto Mínimo"
              type="number"
              placeholder="$0"
              value={filters.minBudget}
              onChange={(e) => handleFilterChange('minBudget', e.target.value)}
              className="w-full"
            />
            <Input
              label="Presupuesto Máximo"
              type="number"
              placeholder="$999,999"
              value={filters.maxBudget}
              onChange={(e) => handleFilterChange('maxBudget', e.target.value)}
              className="w-full"
            />
            <Input
              label="Fecha de Inicio"
              type="date"
              value={filters.startDate}
              onChange={(e) => handleFilterChange('startDate', e.target.value)}
              className="w-full"
            />
            <Input
              label="Fecha de Finalización"
              type="date"
              value={filters.endDate}
              onChange={(e) => handleFilterChange('endDate', e.target.value)}
              className="w-full"
            />
          </div>
        </div>
      )}

      {/* Active Filters pills */}
      {hasActiveFilters && (
        <div className="flex flex-wrap gap-2 mt-4 pt-4 border-t border-border">
          <span className="text-sm text-muted-foreground">Filtros activos:</span>
          {Object.entries(filters).map(([key, value]) => {
            if (!value) return null;

            // etiquetas amigables
            let displayValue = value;
            if (key === 'paymentStatus')
              displayValue = paymentStatusOptions.find((opt) => opt.value === value)?.label || value;
            if (key === 'status')
              displayValue = statusOptions.find((opt) => opt.value === value)?.label || value;
            if (key === 'department')
              displayValue = departmentOptions.find((opt) => opt.value === value)?.label || value;
            if (key === 'priority')
              displayValue = priorityOptions.find((opt) => opt.value === value)?.label || value;
            if (key === 'minBudget' || key === 'maxBudget') displayValue = `$${value}`;

            return (
              <div
                key={key}
                className="flex items-center space-x-1 bg-primary/10 text-primary px-2 py-1 rounded-md text-sm"
              >
                <span>{displayValue}</span>
                <button
                  onClick={() => handleFilterChange(key, '')}
                  className="hover:bg-primary/20 rounded-full p-0.5"
                >
                  <X size={12} />
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default ProjectFilters;

/* ==========================================
   Función de filtrado para el componente padre
========================================== */
export const applyProjectFilters = (projects, filters) => {
  let filtered = [...projects];

  // Search
  if (filters?.search) {
    const searchTerm = filters.search.toLowerCase();
    filtered = filtered.filter(
      (project) =>
        project?.name?.toLowerCase()?.includes(searchTerm) ||
        project?.code?.toLowerCase()?.includes(searchTerm) ||
        project?.client?.name?.toLowerCase()?.includes(searchTerm)
    );
  }

  // Status
  if (filters?.status) {
    filtered = filtered.filter((project) => project?.status === filters.status);
  }

  // Department
  if (filters?.department) {
    filtered = filtered.filter(
      (project) => project?.department?.toLowerCase() === filters.department.toLowerCase()
    );
  }

  // Priority
  if (filters?.priority) {
    filtered = filtered.filter((project) => project?.priority === filters.priority);
  }

  // Date range (sobre startDate)
  if (filters?.dateRange) {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    filtered = filtered.filter((project) => {
      const startDate = new Date(project?.startDate);
      if (isNaN(startDate)) return false;

      switch (filters.dateRange) {
        case 'today':
          return startDate.toDateString() === today.toDateString();
        case 'week': {
          const weekAgo = new Date(today);
          weekAgo.setDate(weekAgo.getDate() - 7);
          return startDate >= weekAgo && startDate <= now;
        }
        case 'month':
          return (
            startDate.getMonth() === now.getMonth() &&
            startDate.getFullYear() === now.getFullYear()
          );
        case 'quarter': {
          const quarter = Math.floor(now.getMonth() / 3);
          const projectQuarter = Math.floor(startDate.getMonth() / 3);
          return projectQuarter === quarter && startDate.getFullYear() === now.getFullYear();
        }
        case 'year':
          return startDate.getFullYear() === now.getFullYear();
        default:
          return true;
      }
    });
  }

  // Budget
  if (filters?.minBudget) {
    const minBudget = Number(filters.minBudget);
    filtered = filtered.filter((project) => Number(project?.budget) >= minBudget);
  }
  if (filters?.maxBudget) {
    const maxBudget = Number(filters.maxBudget);
    filtered = filtered.filter((project) => Number(project?.budget) <= maxBudget);
  }

  // Start date exacta
  if (filters?.startDate) {
    const filterStartDate = new Date(filters.startDate);
    filtered = filtered.filter((project) => {
      const projectStartDate = new Date(project?.startDate);
      return !isNaN(projectStartDate) && projectStartDate >= filterStartDate;
    });
  }

  // End date exacta
  if (filters?.endDate) {
    const filterEndDate = new Date(filters.endDate);
    filtered = filtered.filter((project) => {
      const projectEndDate = new Date(project?.endDate);
      return !isNaN(projectEndDate) && projectEndDate <= filterEndDate;
    });
  }

  return filtered;
};
