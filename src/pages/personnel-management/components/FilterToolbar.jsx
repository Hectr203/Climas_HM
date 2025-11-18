import React from 'react';
import Select from '../../../components/ui/Select';
import Input from '../../../components/ui/Input';
import Button from '../../../components/ui/Button';
import Icon from '../../../components/AppIcon';
import { departmentOptions as importedDepartmentOptions } from './personnelConstants';

const FilterToolbar = ({ 
  filters, 
  onFilterChange, 
  onClearFilters, 
  onExportData,
  totalCount,
  filteredCount 
}) => {
  // Agregar opción "Todos los Departamentos" al inicio de las opciones importadas
  const departmentOptions = [
    { value: '', label: 'Todos los Departamentos' },
    ...importedDepartmentOptions
  ];

  const statusOptions = [
    { value: '', label: 'Todos los Estados' },
    { value: 'Activo', label: 'Activo' },
    { value: 'Inactivo', label: 'Inactivo' },
    { value: 'Suspendido', label: 'Suspendido' }
  ];

  const complianceOptions = [
    { value: '', label: 'Todos los Estados' },
    { value: 'Completo', label: 'Completo' },
    { value: 'Pendiente', label: 'Pendiente' },
  ];

  const positionOptions = [
    { value: '', label: 'Todos los Puestos' },
    { value: 'Técnico HVAC', label: 'Técnico HVAC' },
    { value: 'Supervisor', label: 'Supervisor' },
    { value: 'Ingeniero', label: 'Ingeniero' },
    { value: 'Administrador', label: 'Administrador' },
    { value: 'Vendedor', label: 'Vendedor' },
    { value: 'Operario', label: 'Operario' }
  ];

  const handleFilterChange = (key, value) => {
    onFilterChange({ ...filters, [key]: value });
  };

  const hasActiveFilters = Object.values(filters)?.some(value => value !== '');

  return (
    <div className="bg-card rounded-lg border border-border p-6 mb-6">
      {/* Search and Quick Actions */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 mb-6">
        <div className="flex-1 max-w-md">
          <Input
            type="search"
            placeholder="Buscar por nombre, ID o puesto..."
            value={filters?.search || ''}
            onChange={(e) => handleFilterChange('search', e?.target?.value)}
            className="w-full"
          />
        </div>

        <div className="flex items-center space-x-3">
          <Button
            variant="outline"
            onClick={onExportData}
            iconName="Download"
            iconPosition="left"
            iconSize={16}
          >
            Exportar
          </Button>
          
          {hasActiveFilters && (
            <Button
              variant="ghost"
              onClick={onClearFilters}
              iconName="X"
              iconPosition="left"
              iconSize={16}
            >
              Limpiar Filtros
            </Button>
          )}
        </div>
      </div>
      {/* Filter Controls */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
        <Select
          label="Departamento"
          options={departmentOptions}
          value={filters?.department || ''}
          onChange={(value) => handleFilterChange('department', value)}
          className="w-full"
        />

        <Select
          label="Estado"
          options={statusOptions}
          value={filters?.status || ''}
          onChange={(value) => handleFilterChange('status', value)}
          className="w-full"
        />

        <Select
          label="Puesto"
          options={positionOptions}
          value={filters?.position || ''}
          onChange={(value) => handleFilterChange('position', value)}
          className="w-full"
        />

        <Select
          label="Estudios Médicos"
          options={complianceOptions}
          value={filters?.medicalCompliance || ''}
          onChange={(value) => handleFilterChange('medicalCompliance', value)}
          className="w-full"
        />
      </div>
      {/* Additional Filters Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-4">
        <Select
          label="EPP"
          options={complianceOptions}
          value={filters?.ppeCompliance || ''}
          onChange={(value) => handleFilterChange('ppeCompliance', value)}
          className="w-full"
        />

        <Input
          type="date"
          label="Fecha de Ingreso Desde"
          value={filters?.hireDateFrom || ''}
          onChange={(e) => handleFilterChange('hireDateFrom', e?.target?.value)}
          className="w-full"
        />

        <Input
          type="date"
          label="Fecha de Ingreso Hasta"
          value={filters?.hireDateTo || ''}
          onChange={(e) => handleFilterChange('hireDateTo', e?.target?.value)}
          className="w-full"
        />
      </div>
      {/* Results Summary */}
      <div className="flex items-center justify-between pt-4 border-t border-border">
        <div className="flex items-center space-x-4 text-sm text-muted-foreground">
          <span>
            Mostrando {filteredCount} de {totalCount} empleados
          </span>
          {hasActiveFilters && (
            <div className="flex items-center space-x-2">
              <Icon name="Filter" size={16} />
              <span>Filtros activos</span>
            </div>
          )}
        </div>

        <div className="flex items-center space-x-2 text-sm">
          <div className="flex items-center space-x-1">
            <div className="w-3 h-3 bg-success rounded-full"></div>
            <span className="text-muted-foreground">Completo</span>
          </div>
          <div className="flex items-center space-x-1">
            <div className="w-3 h-3 bg-warning rounded-full"></div>
            <span className="text-muted-foreground">Pendiente</span>
          </div>
          <div className="flex items-center space-x-1">
            <div className="w-3 h-3 bg-error rounded-full"></div>
            <span className="text-muted-foreground">Vencido</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FilterToolbar;