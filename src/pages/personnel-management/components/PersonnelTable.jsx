import React, { useEffect, useMemo, useState } from 'react';
import Icon from '../../../components/AppIcon';
import Button from '../../../components/ui/Button';
import Image from '../../../components/AppImage';
import usePerson from '../../../hooks/usePerson';
import { 
  departmentOptions, 
  positionOptions, 
  statusOptions, 
  medicalStatusOptions 
} from './personnelConstants';

const PAGE_SIZE_OPTIONS = [5, 10, 20, 50];

const PersonnelTable = ({ personnel, onViewProfile, onEditPersonnel, onAssignPPE, hasActiveFilters, filters, onClearFilters }) => {
  const { persons, loading, error, getPersons } = usePerson();

  const [sortConfig, setSortConfig] = useState({ key: 'nombreCompleto', direction: 'asc' });
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(PAGE_SIZE_OPTIONS[0]);

  // 🔹 Cargar empleados al montar
  useEffect(() => {
    getPersons();
  }, []);

  // 🔹 Fuente de datos (props o hook)
  // Si personnel está definido (incluso si es array vacío), usarlo
  // Solo usar persons del hook si personnel no está definido (null/undefined)
  const dataSource = useMemo(() => {
    if (personnel !== null && personnel !== undefined) {
      return personnel; // Usar personnel incluso si está vacío (resultado de filtros)
    }
    return persons || [];
  }, [personnel, persons]);

  // 🔹 Reiniciar a la primera página cuando cambian los datos filtrados
  useEffect(() => {
    setCurrentPage(1);
  }, [personnel]);

  // 🔹 Ordenamiento
  const sortedPersonnel = useMemo(() => {
    const sorted = [...(dataSource || [])];
    if (!sortConfig.key) return sorted;
    sorted.sort((a, b) => {
      const aVal = a[sortConfig.key] || '';
      const bVal = b[sortConfig.key] || '';
      if (aVal < bVal) return sortConfig.direction === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortConfig.direction === 'asc' ? 1 : -1;
      return 0;
    });
    return sorted;
  }, [dataSource, sortConfig]);

  // 🔹 Paginación
  const totalItems = sortedPersonnel.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const startIndex = (currentPage - 1) * pageSize;
  const endIndex = Math.min(startIndex + pageSize, totalItems);
  const paginatedPersonnel = sortedPersonnel.slice(startIndex, endIndex);

  useEffect(() => {
    if (currentPage > totalPages) setCurrentPage(totalPages);
    if (currentPage < 1) setCurrentPage(1);
  }, [currentPage, totalPages]);

  const handleChangePageSize = (e) => {
    const v = Number(e?.target?.value) || PAGE_SIZE_OPTIONS[0];
    setPageSize(v);
    setCurrentPage(1);
  };

  const goToPage = (n) => setCurrentPage(Math.min(Math.max(1, n), totalPages));
  const prevPage = () => goToPage(currentPage - 1);
  const nextPage = () => goToPage(currentPage + 1);

  const handleSort = (key) => {
    setSortConfig((prev) => ({
      key,
      direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc',
    }));
    setCurrentPage(1);
  };

  // 🔹 Badges de estado
  const getStatusBadge = (status) => {
    const config = {
      Activo: { bg: 'bg-success', text: 'text-success-foreground' },
      Inactivo: { bg: 'bg-error', text: 'text-error-foreground' },
      Suspendido: { bg: 'bg-warning', text: 'text-warning-foreground' },
    }[status] || { bg: 'bg-muted', text: 'text-muted-foreground' };

    return (
      <span className={`px-2 py-1 text-xs font-medium rounded-full ${config.bg} ${config.text}`}>
        {status}
      </span>
    );
  };

  const getComplianceBadge = (status) => {
    const config = {
      Completo: { bg: 'bg-success', text: 'text-success-foreground', icon: 'CheckCircle' },
      Pendiente: { bg: 'bg-warning', text: 'text-warning-foreground', icon: 'Clock' },
      Vencido: { bg: 'bg-error', text: 'text-error-foreground', icon: 'AlertCircle' },
      'Actualizar datos': { bg: 'bg-info', text: 'text-info-foreground', icon: 'AlertCircle' },
    }[status] || { bg: 'bg-muted', text: 'text-muted-foreground', icon: 'Clock' };

    return (
      <span
        className={`inline-flex items-center space-x-1 px-2 py-1 text-xs font-medium rounded-full ${config.bg} ${config.text}`}
      >
        <Icon name={config.icon} size={12} />
        <span>{status}</span>
      </span>
    );
  };

  const SortableHeader = ({ label, sortKey }) => (
    <th
      className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider cursor-pointer hover:bg-muted transition-smooth"
      onClick={() => handleSort(sortKey)}
    >
      <div className="flex items-center space-x-1">
        <span>{label}</span>
        <Icon
          name={
            sortConfig.key === sortKey
              ? sortConfig.direction === 'asc'
                ? 'ChevronUp'
                : 'ChevronDown'
              : 'ChevronsUpDown'
          }
          size={14}
        />
      </div>
    </th>
  );

  // 🔹 Estados de carga y error
  if (loading)
    return (
      <div className="flex justify-center items-center py-10">
        <Icon name="Loader2" className="animate-spin mr-2" size={18} />
        <span className="text-muted-foreground">Cargando empleados...</span>
      </div>
    );

  if (error)
    return (
      <div className="text-center py-10 text-error">
        <Icon name="AlertCircle" className="inline-block mr-2" size={18} />
        Error al cargar los empleados: {error.userMessage || error.message}
      </div>
    );

  // Función para obtener etiquetas de los filtros activos
  const getActiveFiltersLabels = () => {
    if (!filters) return [];
    
    const activeFilters = [];
    
    // Obtener todas las opciones combinadas para buscar etiquetas
    const allDepartmentOptions = [
      { value: '', label: 'Todos los Departamentos' },
      ...departmentOptions
    ];
    const allStatusOptions = [
      { value: '', label: 'Todos los Estados' },
      ...statusOptions
    ];
    const allPositionOptions = [
      { value: '', label: 'Todos los Puestos' },
      ...positionOptions
    ];
    const allMedicalOptions = [
      { value: '', label: 'Todos los Estados' },
      ...medicalStatusOptions
    ];
    const allPPEOptions = [
      { value: '', label: 'Todos los Estados' },
      ...medicalStatusOptions
    ];
    
    if (filters.search?.trim()) {
      activeFilters.push(`Búsqueda: "${filters.search}"`);
    }
    
    if (filters.department) {
      const dept = allDepartmentOptions.find(opt => opt.value === filters.department);
      if (dept) activeFilters.push(`Departamento: ${dept.label}`);
    }
    
    if (filters.status) {
      const status = allStatusOptions.find(opt => opt.value === filters.status);
      if (status) activeFilters.push(`Estado: ${status.label}`);
    }
    
    if (filters.position) {
      const position = allPositionOptions.find(opt => opt.value === filters.position);
      if (position) activeFilters.push(`Puesto: ${position.label}`);
    }
    
    if (filters.medicalCompliance) {
      const medical = allMedicalOptions.find(opt => opt.value === filters.medicalCompliance);
      if (medical) activeFilters.push(`Estudios Médicos: ${medical.label}`);
    }
    
    if (filters.ppeCompliance) {
      const ppe = allPPEOptions.find(opt => opt.value === filters.ppeCompliance);
      if (ppe) activeFilters.push(`EPP: ${ppe.label}`);
    }
    
    if (filters.hireDateFrom) {
      const dateFrom = new Date(filters.hireDateFrom);
      activeFilters.push(`Fecha desde: ${dateFrom.toLocaleDateString('es-ES')}`);
    }
    
    if (filters.hireDateTo) {
      const dateTo = new Date(filters.hireDateTo);
      activeFilters.push(`Fecha hasta: ${dateTo.toLocaleDateString('es-ES')}`);
    }
    
    return activeFilters;
  };

  // Si hay filtros activos y no hay resultados, mostrar mensaje específico
  if (!sortedPersonnel?.length && hasActiveFilters) {
    const activeFiltersLabels = getActiveFiltersLabels();
    
    return (
      <div className="bg-card rounded-lg border border-border p-12">
        <div className="text-center py-10">
          <Icon name="SearchX" className="inline-block mb-4 text-muted-foreground" size={48} />
          <h3 className="text-lg font-semibold text-foreground mb-2">
            No se encontraron registros
          </h3>
          <p className="text-muted-foreground mb-3">
            No hay empleados que coincidan con los filtros seleccionados.
          </p>
          
          {activeFiltersLabels.length > 0 && (
            <div className="mt-4 mb-4">
              <p className="text-sm font-medium text-foreground mb-2">
                Filtros aplicados:
              </p>
              <div className="flex flex-wrap justify-center gap-2">
                {activeFiltersLabels.map((filterLabel, index) => (
                  <span
                    key={index}
                    className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-muted text-muted-foreground border border-border"
                  >
                    {filterLabel}
                  </span>
                ))}
              </div>
            </div>
          )}
          
          <div className="mt-6">
            <Button
              variant="outline"
              onClick={onClearFilters}
              iconName="X"
              iconPosition="left"
              iconSize={16}
            >
              Limpiar Filtros
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // Si no hay datos en absoluto (sin filtros activos), mostrar mensaje
  // Solo mostrar este mensaje si NO hay filtros activos y NO hay datos
  if (!sortedPersonnel?.length && !hasActiveFilters) {
    return (
      <div className="bg-card rounded-lg border border-border p-12">
        <div className="text-center py-10">
          <Icon name="UserX" className="inline-block mb-4 text-muted-foreground" size={48} />
          <h3 className="text-lg font-semibold text-foreground mb-2">
            No hay empleados registrados
          </h3>
          <p className="text-muted-foreground">
            Comienza agregando un nuevo empleado al sistema.
          </p>
        </div>
      </div>
    );
  }

  // 🔹 Render principal
  return (
    <div className="bg-card rounded-lg border border-border overflow-hidden">
      {/* Tabla Desktop */}
      <div className="hidden lg:block overflow-x-auto">
        <table className="min-w-full divide-y divide-border">
          <thead className="bg-muted">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Empleado
              </th>
              <SortableHeader label="Departamento" sortKey="departamento" />
              <SortableHeader label="Puesto" sortKey="puesto" />
              <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Estado
              </th>
              {/* COLUMNA OCULTA: Estudios Médicos - Para mostrarla, descomenta la línea siguiente */}
              {/* <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Estudios Médicos
              </th> */}
              <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Equipo de Protección Personal (EPP)
              </th>
              <SortableHeader label="Última Actualización" sortKey="fechaIngreso" />
              <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Acciones
              </th>
            </tr>
          </thead>

          <tbody className="bg-card divide-y divide-border">
            {paginatedPersonnel.map((emp) => (
              <tr key={emp.id} className="hover:bg-muted/50 transition-smooth">
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 rounded-full overflow-hidden bg-muted">
                      <Image
                        src={emp.foto || '/default-avatar.png'}
                        alt={emp.nombreCompleto}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div>
                      <div className="text-sm font-medium text-foreground">{emp.nombreCompleto}</div>
                      <div className="text-sm text-muted-foreground">{emp.empleadoId}</div>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm">{emp.departamento || '-'}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm">{emp.puesto || '-'}</td>
                <td className="px-6 py-4 whitespace-nowrap">{getStatusBadge(emp.estado)}</td>
                {/* COLUMNA OCULTA: Estudios Médicos - Para mostrarla, descomenta el bloque siguiente */}
                {/* <td className="px-6 py-4 whitespace-nowrap">
                  {(() => {
                    // Usar estadoEstudiosMedicos si existe directamente en el objeto
                    if (emp.estadoEstudiosMedicos) {
                      return getComplianceBadge(emp.estadoEstudiosMedicos);
                    }
                    
                    // Si no existe, buscar en examenesMedicos[0]
                    const medicalData = Array.isArray(emp.examenesMedicos) && emp.examenesMedicos[0]
                      ? emp.examenesMedicos[0]
                      : {};
                    
                    if (medicalData.estadoEstudiosMedicos) {
                      return getComplianceBadge(medicalData.estadoEstudiosMedicos);
                    }
                    
                    // Si tiene datos de exámenes médicos pero no tiene estadoEstudiosMedicos, mostrar "Actualizar datos"
                    if (medicalData.ultimoExamenMedico !== undefined || 
                        medicalData.proximoExamenMedico !== undefined ||
                        medicalData.urlDocumentoMedico !== undefined) {
                      return getComplianceBadge('Actualizar datos');
                    }
                    
                    // Si no hay datos, mostrar "Pendiente"
                    return getComplianceBadge('Pendiente');
                  })()}
                </td> */}
                <td className="px-6 py-4 whitespace-nowrap">
                  {(() => {
                    // Usar estadoEquipoEPP si existe en el JSON
                    if (emp.estadoEquipoEPP) {
                      return getComplianceBadge(emp.estadoEquipoEPP);
                    }
                    
                    // Si no existe, intentar calcularlo
                    const equiposData = Array.isArray(emp.equipos) && emp.equipos[0]
                      ? emp.equipos[0]
                      : {};
                    
                    const equipoProteccionPersonal = equiposData.equipoProteccionPersonal || {};
                    const equipoAdicional = equiposData.equipoAdicional || {};
                    
                    // Si tiene datos pero no tiene estadoEquipoEPP, mostrar "Actualizar datos"
                    if (equipoProteccionPersonal.cascoSeguridad !== undefined || 
                        equipoProteccionPersonal.chalecoReflectivo !== undefined ||
                        equipoProteccionPersonal.botasSeguridad !== undefined ||
                        equipoAdicional.guantesTrabajo !== undefined ||
                        equipoAdicional.gafasSeguridad !== undefined ||
                        equipoAdicional.mascarilla !== undefined) {
                      return getComplianceBadge('Actualizar datos');
                    }
                    
                    // Si no tiene datos, mostrar "Pendiente"
                    return getComplianceBadge('Pendiente');
                  })()}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-muted-foreground">
                  {emp.fechaIngreso || '-'}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center space-x-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onViewProfile(emp)}
                      iconName="Eye"
                      iconSize={16}
                    >
                      Ver
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onEditPersonnel(emp)}
                      iconName="Edit"
                      iconSize={16}
                    >
                      Editar
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onAssignPPE(emp)}
                      iconName="Shield"
                      iconSize={16}
                    >
                      EPP
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* 🔹 Paginación Desktop */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between border-t border-border px-4 py-3 gap-3">
          <div className="flex items-center gap-3">
            <label className="text-xs text-muted-foreground">Mostrar</label>
            <select
              value={pageSize}
              onChange={handleChangePageSize}
              className="text-sm px-2 py-1 border border-border rounded bg-background text-foreground"
            >
              {PAGE_SIZE_OPTIONS.map((opt) => (
                <option key={opt} value={opt}>{opt}</option>
              ))}
            </select>
            <span className="text-xs text-muted-foreground">por página</span>
            <span className="text-xs text-muted-foreground ml-3">
              Mostrando <span className="font-medium">{totalItems === 0 ? 0 : startIndex + 1}</span>-<span className="font-medium">{endIndex}</span> de <span className="font-medium">{totalItems}</span>
            </span>
          </div>
          <div className="flex items-center gap-1">
            <Button variant="outline" size="sm" onClick={() => goToPage(1)} disabled={currentPage === 1} iconName="ChevronsLeft" />
            <Button variant="outline" size="sm" onClick={prevPage} disabled={currentPage === 1} iconName="ChevronLeft" />
            <span className="px-2 text-sm text-foreground">{currentPage} / {totalPages}</span>
            <Button variant="outline" size="sm" onClick={nextPage} disabled={currentPage === totalPages} iconName="ChevronRight" />
            <Button variant="outline" size="sm" onClick={() => goToPage(totalPages)} disabled={currentPage === totalPages} iconName="ChevronsRight" />
          </div>
        </div>
      </div>

      {/* Vista Móvil */}
      <div className="lg:hidden space-y-4 p-4">{paginatedPersonnel.map((emp) => (
          <div key={emp.id} className="bg-card border border-border rounded-lg p-4">
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center space-x-3">
                <div className="w-12 h-12 rounded-full overflow-hidden bg-muted">
                  <Image
                    src={emp.foto || '/default-avatar.png'}
                    alt={emp.nombreCompleto}
                    className="w-full h-full object-cover"
                  />
                </div>
                <div>
                  <h3 className="text-sm font-medium text-foreground">{emp.nombreCompleto}</h3>
                  <p className="text-xs text-muted-foreground">{emp.empleadoId}</p>
                </div>
              </div>
              {getStatusBadge(emp.estado)}
            </div>

            <div className="space-y-2 mb-4">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Departamento:</span>
                <span>{emp.departamento || '-'}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Puesto:</span>
                <span>{emp.puesto || '-'}</span>
              </div>
              {/* VISTA MÓVIL - COLUMNA OCULTA: Estudios Médicos - Para mostrarla, descomenta el bloque siguiente */}
              {/* <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Estudios Médicos:</span>
                {(() => {
                  // Usar estadoEstudiosMedicos si existe directamente en el objeto
                  if (emp.estadoEstudiosMedicos) {
                    return getComplianceBadge(emp.estadoEstudiosMedicos);
                  }
                  
                  // Si no existe, buscar en examenesMedicos[0]
                  const medicalData = Array.isArray(emp.examenesMedicos) && emp.examenesMedicos[0]
                    ? emp.examenesMedicos[0]
                    : {};
                  
                  if (medicalData.estadoEstudiosMedicos) {
                    return getComplianceBadge(medicalData.estadoEstudiosMedicos);
                  }
                  
                  // Si tiene datos de exámenes médicos pero no tiene estadoEstudiosMedicos, mostrar "Actualizar datos"
                  if (medicalData.ultimoExamenMedico !== undefined || 
                      medicalData.proximoExamenMedico !== undefined ||
                      medicalData.urlDocumentoMedico !== undefined) {
                    return getComplianceBadge('Actualizar datos');
                  }
                  
                  // Si no hay datos, mostrar "Pendiente"
                  return getComplianceBadge('Pendiente');
                })()}
              </div> */}
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">EPP:</span>
                {(() => {
                  // Usar estadoEquipoEPP si existe en el JSON
                  if (emp.estadoEquipoEPP) {
                    return getComplianceBadge(emp.estadoEquipoEPP);
                  }
                  
                  // Si no existe, intentar calcularlo
                  const equiposData = Array.isArray(emp.equipos) && emp.equipos[0]
                    ? emp.equipos[0]
                    : {};
                  
                  const equipoProteccionPersonal = equiposData.equipoProteccionPersonal || {};
                  const equipoAdicional = equiposData.equipoAdicional || {};
                  
                  // Si tiene datos pero no tiene estadoEquipoEPP, mostrar "Actualizar datos"
                  if (equipoProteccionPersonal.cascoSeguridad !== undefined || 
                      equipoProteccionPersonal.chalecoReflectivo !== undefined ||
                      equipoProteccionPersonal.botasSeguridad !== undefined ||
                      equipoAdicional.guantesTrabajo !== undefined ||
                      equipoAdicional.gafasSeguridad !== undefined ||
                      equipoAdicional.mascarilla !== undefined) {
                    return getComplianceBadge('Actualizar datos');
                  }
                  
                  // Si no tiene datos, mostrar "Pendiente"
                  return getComplianceBadge('Pendiente');
                })()}
              </div>
            </div>

            <div className="flex space-x-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => onViewProfile(emp)}
                iconName="Eye"
                iconSize={16}
                className="flex-1"
              >
                Ver Perfil
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onEditPersonnel(emp)}
                iconName="Edit"
                iconSize={16}
              >
                Editar
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onAssignPPE(emp)}
                iconName="Shield"
                iconSize={16}
              >
                EPP
              </Button>
            </div>
          </div>
        ))}

        {/* 🔹 Paginación móvil */}
        <div className="flex flex-col gap-3 pt-4">
          <div className="flex items-center gap-3">
            <label className="text-xs text-muted-foreground">Mostrar</label>
            <select
              value={pageSize}
              onChange={handleChangePageSize}
              className="text-sm px-2 py-1 border border-border rounded bg-background text-foreground"
            >
              {PAGE_SIZE_OPTIONS.map((opt) => (
                <option key={opt} value={opt}>{opt}</option>
              ))}
            </select>
            <span className="text-xs text-muted-foreground">por página</span>
          </div>
          <div className="flex items-center justify-between">
            <div className="text-xs text-muted-foreground">
              {totalItems === 0 ? '0 de 0' : `${startIndex + 1}-${endIndex} de ${totalItems}`}
            </div>
            <div className="flex items-center gap-1">
              <Button variant="outline" size="sm" onClick={() => goToPage(1)} disabled={currentPage === 1} iconName="ChevronsLeft" />
              <Button variant="outline" size="sm" onClick={prevPage} disabled={currentPage === 1} iconName="ChevronLeft" />
              <span className="px-2 text-sm text-foreground">{currentPage}/{totalPages}</span>
              <Button variant="outline" size="sm" onClick={nextPage} disabled={currentPage === totalPages} iconName="ChevronRight" />
              <Button variant="outline" size="sm" onClick={() => goToPage(totalPages)} disabled={currentPage === totalPages} iconName="ChevronsRight" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PersonnelTable;
