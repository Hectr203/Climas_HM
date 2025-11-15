import React, { useState, useEffect } from 'react';
import Icon from '../../../components/AppIcon';
import Button from '../../../components/ui/Button';

const PAGE_SIZE_OPTIONS = [5, 10, 20, 50];

const ClientTable = ({ clients, onViewDetails, onEditClient, onViewProjects, onViewContracts }) => {
  const [sortField, setSortField] = useState('empresa');
  const [sortDirection, setSortDirection] = useState('asc');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(PAGE_SIZE_OPTIONS[0]);

  const handleSort = (field) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
    setCurrentPage(1);
  };

  const sortedClients = [...clients]?.sort((a, b) => {
    const aValue = a?.[sortField] || '';
    const bValue = b?.[sortField] || '';
    if (sortDirection === 'asc') {
      return aValue > bValue ? 1 : -1;
    } else {
      return aValue < bValue ? 1 : -1;
    }
  });

  // Calcular datos de paginación
  const totalItems = sortedClients.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const startIndex = (currentPage - 1) * pageSize;
  const endIndex = Math.min(startIndex + pageSize, totalItems);
  const paginatedClients = sortedClients.slice(startIndex, endIndex);

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

  // Función para capitalizar la primera letra
  const capitalize = (text) => {
    if (!text) return '';
    const str = String(text);
    return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
  };

  const getStatusColor = (status) => {
    const normalizedStatus = (status || '').toString().toLowerCase();
    switch (normalizedStatus) {
      case 'activo':
        return 'bg-success text-success-foreground';
      case 'inactivo':
        return 'bg-error text-error-foreground';
      case 'pendiente':
        return 'bg-warning text-warning-foreground';
      case 'prospecto':
        return 'bg-info text-info-foreground';
      default:
        return 'bg-secondary text-secondary-foreground';
    }
  };

  const getHealthColor = (health) => {
    const normalizedHealth = (health || '').toString().toLowerCase();
    switch (normalizedHealth) {
      case 'excelente':
        return 'text-success';
      case 'buena':
        return 'text-primary';
      case 'regular':
        return 'text-warning';
      case 'mala':
        return 'text-error';
      default:
        return 'text-muted-foreground';
    }
  };

  const SortableHeader = ({ field, children }) => (
    <th
      className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider cursor-pointer hover:bg-muted transition-smooth"
      onClick={() => handleSort(field)}
    >
      <div className="flex items-center space-x-1">
        <span>{children}</span>
        <Icon
          name={
            sortField === field
              ? sortDirection === 'asc'
                ? 'ChevronUp'
                : 'ChevronDown'
              : 'ChevronsUpDown'
          }
          size={14}
        />
      </div>
    </th>
  );

  return (
    <div className="bg-card border border-border rounded-lg overflow-hidden card-shadow overflow-x-auto">
      <table className="min-w-full divide-y divide-border">
        <thead className="bg-muted">
          <tr>
            <SortableHeader field="empresa">Empresa</SortableHeader>
            <SortableHeader field="contacto">Contacto</SortableHeader>
            <SortableHeader field="industria">Industria</SortableHeader>
            <SortableHeader field="ubicacionEmpre">Ubicación</SortableHeader>
            <SortableHeader field="estado">Estado</SortableHeader>
            {/* <SortableHeader field="relacion">Relación</SortableHeader>
            <SortableHeader field="totalProjects">Proyectos</SortableHeader>
            <SortableHeader field="totalValue">Valor Total</SortableHeader> */}
            <th className="px-6 py-3 text-right text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Acciones
            </th>
          </tr>
        </thead>
        <tbody className="bg-card divide-y divide-border">
          {paginatedClients?.map((client) => (
            <tr key={client?.id || client?._id || client?.empresa} className="hover:bg-muted transition-smooth">
              <td className="px-6 py-4 whitespace-nowrap">
                <div className="flex items-center">
                  <div className="w-10 h-10 bg-primary rounded-lg flex items-center justify-center flex-shrink-0">
                    <Icon name="Building2" size={16} color="white" />
                  </div>
                  <div className="ml-4">
                    <div className="text-sm font-medium text-foreground">{String(client?.empresa || '')}</div>
                    <div className="text-sm text-muted-foreground">RFC: {String(client?.rfc || '')}</div>
                  </div>
                </div>
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                <div className="text-sm text-foreground">{String(client?.contacto || '')}</div>
                <div className="text-sm text-muted-foreground">{String(client?.email || '')}</div>
                <div className="text-sm text-muted-foreground">{String(client?.telefono || '')}</div>
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-foreground">{String(client?.industria || '')}</td>
              <td className="px-6 py-4 whitespace-nowrap">
                <div className="text-sm text-foreground">
                  {client?.ubicacionEmpre?.municipio || ''}{client?.ubicacionEmpre?.municipio && client?.ubicacionEmpre?.estado ? ', ' : ''}{client?.ubicacionEmpre?.estado || ''}
                </div>
                {client?.ubicacion?.direccion && (
                  <div className="text-xs text-muted-foreground max-w-[200px] truncate" title={client.ubicacion.direccion}>
                    {String(client.ubicacion.direccion)}
                  </div>
                )}
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                <span className={`px-2 py-1 text-xs rounded-full ${getStatusColor(client?.estado)}`}>
                  {capitalize(client?.estado || '')}
                </span>
              </td>
              {/* <td className="px-6 py-4 whitespace-nowrap">
                <span className={`text-sm font-medium ${getHealthColor(client?.relacion)}`}>
                  {capitalize(client?.relacion || '')}
                </span>
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                <div className="text-sm text-foreground">{Number(client?.totalProjects || 0)}</div>
                <div className="text-xs text-muted-foreground">{Number(client?.activeContracts || 0)} contratos</div>
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                <div className="text-sm font-semibold text-success">
                  ${Number(client?.totalValue || 0).toLocaleString('es-MX')}
                </div>
              </td> */}
              <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                <div className="flex items-center justify-end space-x-2">
                  {/* <Button variant="ghost" size="sm" onClick={() => onViewProjects(client)} title="Ver proyectos">
                    <Icon name="FolderOpen" size={16} />
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => onViewContracts(client)} title="Ver contratos">
                    <Icon name="FileText" size={16} />
                  </Button> */}
                  <Button variant="ghost" size="sm" onClick={() => onEditClient(client)} title="Editar cliente">
                    <Icon name="Edit" size={16} />
                  </Button>
                  {/* <Button variant="ghost" size="sm" onClick={() => onViewDetails(client)} title="Ver detalles">
                    <Icon name="Eye" size={16} />
                  </Button> */}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Paginación */}
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
  );
};

export default ClientTable;
