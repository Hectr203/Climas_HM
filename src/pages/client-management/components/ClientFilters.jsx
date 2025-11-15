import React from 'react';
import Input from '../../../components/ui/Input';
import Select from '../../../components/ui/Select';
import Button from '../../../components/ui/Button';
import Icon from '../../../components/AppIcon';

const ClientFilters = ({ 
  filters, 
  onFiltersChange, 
  onClearFilters, 
  onExport,
  estados = []
}) => {
  const industryOptions = [
    { value: '', label: 'Todas las industrias' },
    { value: 'Manufactura', label: 'Manufactura' },
    { value: 'Comercial', label: 'Comercial' },
    { value: 'Hospitalidad', label: 'Hospitalidad' },
    { value: 'Educación', label: 'Educación' },
    { value: 'Salud', label: 'Salud' },
    { value: 'Retail', label: 'Retail' },
    { value: 'Oficinas', label: 'Oficinas' },
    { value: 'Residencial', label: 'Residencial' }
  ];

  const statusOptions = [
    { value: '', label: 'Todos los estados' },
    { value: 'Activo', label: 'Activo' },
    { value: 'Inactivo', label: 'Inactivo' },
    { value: 'Pendiente', label: 'Pendiente' }
  ];

  const relationshipOptions = [
    { value: '', label: 'Todas las relaciones' },
    { value: 'Excelente', label: 'Excelente' },
    { value: 'Buena', label: 'Buena' },
    { value: 'Regular', label: 'Regular' },
    { value: 'Mala', label: 'Mala' }
  ];

  const locationOptions = [
    { value: '', label: 'Todas las ubicaciones' },
    ...(Array.isArray(estados) ? estados.map(estado => ({
      value: estado?.name || estado?.nombre || estado,
      label: estado?.name || estado?.nombre || estado
    })) : [])
  ];

  const handleFilterChange = (field, value) => {
    onFiltersChange({
      ...filters,
      [field]: value
    });
  };

  const hasActiveFilters = Object.values(filters)?.some(value => value !== '');

  return (
    <div className="bg-card border border-border rounded-lg p-6 card-shadow mb-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-foreground">Filtros de Búsqueda</h3>
        <div className="flex items-center space-x-2">
          {hasActiveFilters && (
            <Button
              variant="outline"
              size="sm"
              onClick={onClearFilters}
              iconName="X"
              iconPosition="left"
            >
              Limpiar Filtros
            </Button>
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={onExport}
            iconName="Download"
            iconPosition="left"
          >
            Exportar
          </Button>
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
        <Input
          type="search"
          label="Buscar Cliente"
          placeholder="Nombre de empresa, contacto..."
          value={filters?.search}
          onChange={(e) => handleFilterChange('search', e?.target?.value)}
        />

        <Select
          label="Industria"
          options={industryOptions}
          value={filters?.industry}
          onChange={(value) => handleFilterChange('industry', value)}
        />

        <Select
          label="Estado"
          options={statusOptions}
          value={filters?.status}
          onChange={(value) => handleFilterChange('status', value)}
        />

        <Select
          label="Relación"
          options={relationshipOptions}
          value={filters?.relationshipHealth}
          onChange={(value) => handleFilterChange('relationshipHealth', value)}
        />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Select
          label="Ubicación"
          options={locationOptions}
          value={filters?.location}
          onChange={(value) => handleFilterChange('location', value)}
          searchable={true}
          placeholder="Seleccionar estado..."
        />

        <Input
          type="text"
          label="RFC"
          placeholder="RFC del cliente"
          value={filters?.rfc}
          onChange={(e) => handleFilterChange('rfc', e?.target?.value)}
        />

        {/* <Input
          type="number"
          label="Proyectos Mínimos"
          placeholder="Número mínimo"
          value={filters?.minProjects}
          onChange={(e) => handleFilterChange('minProjects', e?.target?.value)}
        />

        <Input
          type="number"
          label="Valor Mínimo (MXN)"
          placeholder="Valor mínimo"
          value={filters?.minValue}
          onChange={(e) => handleFilterChange('minValue', e?.target?.value)}
        /> */}
      </div>
      {hasActiveFilters && (
        <div className="mt-4 pt-4 border-t border-border">
          <div className="flex items-center space-x-2 text-sm text-muted-foreground">
            <Icon name="Filter" size={16} />
            <span>Filtros activos aplicados</span>
          </div>
        </div>
      )}
    </div>
  );
};

export default ClientFilters;