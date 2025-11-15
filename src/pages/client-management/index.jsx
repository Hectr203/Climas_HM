import React, { useState, useEffect } from 'react';
import useClient from '../../hooks/useClient';
import useCommunication from '../../hooks/useCommunication';
import { useEstados } from '../../hooks/useEstado';
import Header from '../../components/ui/Header';
import Sidebar from '../../components/ui/Sidebar';
import Breadcrumb from '../../components/ui/Breadcrumb';
import Icon from '../../components/AppIcon';
import Button from '../../components/ui/Button';

import ClientCard from './components/ClientCard';
import ClientTable from './components/ClientTable';
import ClientFilters from './components/ClientFilters';
import ClientCommunicationPanel from './components/ClientCommunicationPanel';
import DocumentStatus from './components/DocumentStatus';
import ContractAlerts from './components/ContractAlerts';
import NewClientModal from './components/NewClientModal';

const ClientManagement = () => {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [viewMode, setViewMode] = useState('table');
  const [selectedClient, setSelectedClient] = useState(null);
  const [showSidebar, setShowSidebar] = useState(false);
  const [showNewClientModal, setShowNewClientModal] = useState(false);
  const [clientCommunications, setClientCommunications] = useState([]);
  
  const { clients, getClients, createClient, editClient, loading, error } = useClient();
  const { estados } = useEstados();
  const { 
    createCommunication, 
    getComunicacionesByCliente, 
    loading: loadingComm 
  } = useCommunication();

  // Cálculo de clientes activos (case-insensitive para 'estado')
  // Cálculo de total clientes del mes anterior
  const getPreviousMonthClients = (clientsArr) => {
    if (!Array.isArray(clientsArr)) return 0;
    const now = new Date();
    const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    return clientsArr.filter(c => {
      const createdAt = c?.createdAt ? new Date(c.createdAt) : null;
      return createdAt && createdAt < firstDayOfMonth;
    }).length;
  };
  const getActiveClients = (clientsArr) => {
    if (!Array.isArray(clientsArr)) return 0;
    return clientsArr.filter(c => {
      const estado = (c?.estado || c?.status || '').toString().toLowerCase();
      return estado === 'activo';
    }).length;
  };

  // Cálculo de clientes activos del mes anterior
  const getPreviousMonthActiveClients = (clientsArr) => {
    if (!Array.isArray(clientsArr)) return 0;
    const now = new Date();
    // Primer día del mes actual
    const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    return clientsArr.filter(c => {
      const estado = (c?.estado || c?.status || '').toString().toLowerCase();
      const createdAt = c?.createdAt ? new Date(c.createdAt) : null;
      return estado === 'activo' && createdAt && createdAt < firstDayOfMonth;
    }).length;
  };

  // Cálculo de variación porcentual
  const getMonthlyVariation = (current, previous) => {
    if (typeof previous !== 'number' || previous === 0) return '+0%';
    const percent = ((current - previous) / previous) * 100;
    return `${percent > 0 ? '+' : ''}${percent.toFixed(0)}%`;
  };

  useEffect(() => {
    getClients();
    // eslint-disable-next-line
  }, []);

  const [filters, setFilters] = useState({
    search: '',
    industry: '',
    status: '',
    relationshipHealth: '',
    location: '',
    rfc: '',
    minProjects: '',
    minValue: ''
  });

  const handleSidebarToggle = () => {
    setSidebarCollapsed(!sidebarCollapsed);
  };

  const handleMobileMenuToggle = () => {
    setMobileMenuOpen(!mobileMenuOpen);
  };

  // Mock data for communications
  const mockCommunications = [
    {
      id: 1,
      type: "email",
      subject: "Propuesta de Mantenimiento Anual",
      description: "Envío de propuesta para contrato de mantenimiento anual de sistemas HVAC. Incluye revisiones trimestrales y soporte 24/7.",
      contactPerson: "Carlos Hernández",
      date: "2024-09-28T10:30:00",
      hasAttachments: true
    },
    {
      id: 2,
      type: "phone",
      subject: "Seguimiento de Proyecto Torre B",
      description: "Llamada telefónica para revisar avances del proyecto de instalación en Torre B. Cliente satisfecho con el progreso.",
      contactPerson: "María González",
      date: "2024-09-25T14:15:00",
      hasAttachments: false
    },
    {
      id: 3,
      type: "meeting",
      subject: "Reunión de Cierre de Proyecto",
      description: "Reunión presencial para la entrega final del proyecto de climatización del hotel. Firma de acta de aceptación.",
      contactPerson: "Roberto Martínez",
      date: "2024-09-20T09:00:00",
      hasAttachments: true
    },
    {
      id: 4,
      type: "contract",
      subject: "Renovación de Contrato de Servicio",
      description: "Proceso de renovación del contrato de servicio técnico para el próximo año académico.",
      contactPerson: "Ana Rodríguez",
      date: "2024-09-18T16:45:00",
      hasAttachments: true
    }
  ];

  // Mock data for documents
  const mockDocuments = [
    {
      id: 1,
      name: "RFC - Grupo Industrial Monterrey",
      type: "RFC",
      status: "Completo",
      uploadDate: "2024-03-15",
      expirationDate: null,
      notes: "Documento fiscal actualizado"
    },
    {
      id: 2,
      name: "Contrato de Servicios 2024",
      type: "Contrato",
      status: "Completo",
      uploadDate: "2024-01-10",
      expirationDate: "2024-12-31",
      notes: "Contrato anual de mantenimiento"
    },
    {
      id: 3,
      name: "Garantía Equipos HVAC",
      type: "Garantía",
      status: "Pendiente",
      uploadDate: "2024-06-20",
      expirationDate: "2025-06-20",
      notes: "Pendiente firma del cliente"
    },
    {
      id: 4,
      name: "Información Fiscal",
      type: "Facturación",
      status: "En Revisión",
      uploadDate: "2024-09-01",
      expirationDate: null,
      notes: "Actualización de datos fiscales"
    }
  ];

  // Mock data for contracts
  const mockContracts = [
    {
      id: 1,
      contractNumber: "CONT-2024-001",
      clientName: "Grupo Industrial Monterrey",
      startDate: "2024-01-01",
      expirationDate: "2024-12-31",
      value: 850000,
      description: "Contrato de mantenimiento anual para sistemas HVAC industriales"
    },
    {
      id: 2,
      contractNumber: "CONT-2024-002",
      clientName: "Hotel Ejecutivo Guadalajara",
      startDate: "2024-03-15",
      expirationDate: "2024-10-15",
      value: 450000,
      description: "Instalación y mantenimiento de sistema de climatización"
    },
    {
      id: 3,
      contractNumber: "CONT-2023-015",
      clientName: "Clínica Médica Especializada",
      startDate: "2023-11-01",
      expirationDate: "2024-09-25",
      value: 320000,
      description: "Sistema de ventilación especializada para áreas médicas"
    }
  ];

  const [filteredClients, setFilteredClients] = useState(clients);

  useEffect(() => {
    let filtered = clients;

    // Filtro de búsqueda (empresa, contacto, email)
    if (filters?.search) {
      const search = filters.search.trim().toLowerCase();
      filtered = filtered?.filter(client => {
        const empresa = (client?.empresa || client?.companyName || '').toString().toLowerCase();
        const contacto = (client?.contacto || client?.contactPerson || '').toString().toLowerCase();
        const email = (client?.email || '').toString().toLowerCase();
        return empresa.includes(search) || contacto.includes(search) || email.includes(search);
      });
    }

    // Industria
    if (filters?.industry) {
      const industry = filters.industry.trim().toLowerCase();
      filtered = filtered?.filter(client => (client?.industria || client?.industry || '').toString().toLowerCase() === industry);
    }

    // Estado
    if (filters?.status) {
      const estado = filters.status.trim().toLowerCase();
      filtered = filtered?.filter(client => (client?.estado || client?.status || '').toString().toLowerCase() === estado);
    }

    // Relación
    if (filters?.relationshipHealth) {
      const relacion = filters.relationshipHealth.trim().toLowerCase();
      filtered = filtered?.filter(client => (client?.relacion || client?.relationshipHealth || '').toString().toLowerCase() === relacion);
    }

    // Ubicación
    if (filters?.location) {
      const location = filters.location.trim().toLowerCase();
      filtered = filtered?.filter(client => {
        const estadoEmpresa = (client?.ubicacionEmpre?.estado || '').toString().toLowerCase();
        const municipioEmpresa = (client?.ubicacionEmpre?.municipio || '').toString().toLowerCase();
        const estadoDireccion = (client?.ubicacion?.estado || '').toString().toLowerCase();
        const municipioDireccion = (client?.ubicacion?.municipio || '').toString().toLowerCase();
        return estadoEmpresa.includes(location) || 
               municipioEmpresa.includes(location) || 
               estadoDireccion.includes(location) || 
               municipioDireccion.includes(location);
      });
    }

    // RFC
    if (filters?.rfc) {
      const rfc = filters.rfc.trim().toLowerCase();
      filtered = filtered?.filter(client => (client?.rfc || '').toString().toLowerCase().includes(rfc));
    }

    // Proyectos mínimos
    if (filters?.minProjects) {
      filtered = filtered?.filter(client => (parseInt(client?.totalProjects || client?.proyectos || 0) || 0) >= parseInt(filters?.minProjects));
    }

    // Valor mínimo
    if (filters?.minValue) {
      filtered = filtered?.filter(client => (parseInt(client?.totalValue || client?.valor || 0) || 0) >= parseInt(filters?.minValue));
    }

    setFilteredClients(filtered);
  }, [filters, clients]);

  const handleFiltersChange = (newFilters) => {
    setFilters(newFilters);
  };

  const handleClearFilters = () => {
    setFilters({
      search: '',
      industry: '',
      status: '',
      relationshipHealth: '',
      location: '',
      rfc: '',
      minProjects: '',
      minValue: ''
    });
  };

  const handleExportClients = () => {
    if (!filteredClients || filteredClients.length === 0) {
      alert('No hay datos para exportar');
      return;
    }

    // Preparar los datos para exportar (sin Cliente Desde, Total Proyectos, Contratos Activos, Valor Total)
    const dataToExport = filteredClients.map(client => {
      // Extraer contactos adicionales si existen
      const contactosAdicionales = Array.isArray(client.contactos) && client.contactos.length > 1
        ? client.contactos.slice(1).map((c, idx) => `${c.contacto} (${c.email}, ${c.telefono})`).join(' | ')
        : '';

      return {
        'Empresa': client.companyName || client.empresa || '',
        'RFC': client.rfc || '',
        'Contacto Principal': client.contactPerson || client.contacto || '',
        'Email Principal': client.email || '',
        'Teléfono Principal': client.phone || client.telefono || '',
        'Contactos Adicionales': contactosAdicionales,
        'Industria': client.industry || client.industria || '',
        'Ubicación Empresa - Estado': client.ubicacionEmpre?.estado || '',
        'Ubicación Empresa - Municipio': client.ubicacionEmpre?.municipio || '',
        'URL Ubicación Empresa': client.ubicacionUrl || '',
        'Dirección Cliente - Estado': client.ubicacion?.estado || '',
        'Dirección Cliente - Municipio': client.ubicacion?.municipio || '',
        'Dirección Completa': client.ubicacion?.direccion || client.address || '',
        'Sitio Web': client.website || client.sitioWeb || '',
        'Estado': client.status || client.estado || '',
        'Relación': client.relationshipHealth || client.relacion || '',
        'Próximo Seguimiento': client.nextFollowUp || client.proximoSeguimiento || '',
        'Notas': client.notes || client.notas || ''
      };
    });

    // Convertir a CSV
    const headers = Object.keys(dataToExport[0]);
    const csvContent = [
      headers.join(','),
      ...dataToExport.map(row => 
        headers.map(header => {
          const value = row[header];
          // Escapar comillas y envolver en comillas si contiene comas
          const escaped = String(value).replace(/"/g, '""');
          return `"${escaped}"`;
        }).join(',')
      )
    ].join('\n');

    // Crear el archivo y descargarlo
    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    
    const fecha = new Date().toISOString().split('T')[0];
    link.setAttribute('href', url);
    link.setAttribute('download', `clientes_${fecha}.csv`);
    link.style.visibility = 'hidden';
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleViewDetails = (client) => {
    setSelectedClient(client);
    setShowSidebar(true);
    // Cargar comunicaciones del cliente
    loadClientCommunications(client.id || client._id);
  };

  // Función para cargar comunicaciones del cliente
  const loadClientCommunications = async (clientId) => {
    if (!clientId) return;
    
    try {
      const response = await getComunicacionesByCliente(clientId);
      if (response && response.data && response.data.comunicaciones) {
        // Mapear los datos del backend al formato del frontend
        const mappedComms = response.data.comunicaciones.map(comm => ({
          id: comm.id,
          type: comm.tipoComunicacion || comm.medioDifusion || 'email',
          subject: comm.asunto,
          description: comm.mensaje,
          contactPerson: comm.creadoPor || 'Sistema',
          date: comm.fechaCreacion,
          hasAttachments: false,
          urgency: comm.nivelUrgencia || 'normal',
          status: comm.estado || 'completado'
        }));
        setClientCommunications(mappedComms);
      } else {
        setClientCommunications([]);
      }
    } catch (error) {
      console.error('Error al cargar comunicaciones:', error);
      setClientCommunications([]);
    }
  };

  const [editModalState, setEditModalState] = useState({ open: false, client: null });

  const handleEditClient = (client) => {
    setEditModalState({ open: true, client });
  };

  const handleSubmitEditClient = async (updatedClient) => {
    if (!updatedClient?.id) return;
    const response = await editClient(updatedClient.id, updatedClient);
    // Espera a que el estado se actualice antes de cerrar el modal
    if (response && response.success) {
      setEditModalState({ open: false, client: null });
      // Recargar la lista de clientes para asegurar que esté actualizada
      await getClients(true);
    }
  };

  const handleViewProjects = (client) => {
    console.log('Ver proyectos del cliente:', client);
    window.location.href = `/proyectos?client=${client?.id}`;
  };

  const handleViewContracts = (client) => {
    console.log('Ver contratos del cliente:', client);
  };

  const handleAddClient = () => {
    setShowNewClientModal(true);
  };

  const handleSubmitNewClient = async (clientData) => {
    const result = await createClient(clientData);
    if (result && result.success) {
      setShowNewClientModal(false);
      // Recargar la lista de clientes para asegurar que esté actualizada
      await getClients(true);
    }
  };

  const handleSubmitCommunication = async (commData) => {
    if (!selectedClient) return;

    const payload = {
      tipoComunicacion: commData.tipoComunicacion,
      nivelUrgencia: commData.nivelUrgencia,
      asunto: commData.asunto,
      mensaje: commData.mensaje,
      idCliente: selectedClient.id || selectedClient._id,
      idOportunidad: '' // Vacío para comunicaciones directas del cliente
    };

    const response = await createCommunication(payload);
    if (response) {
      // Recargar comunicaciones
      loadClientCommunications(selectedClient.id || selectedClient._id);
    }
  };

  const handleViewCommunicationDetails = (communication) => {
    console.log('Ver detalles de comunicación:', communication);
  };

  const handleUploadDocument = (document = null) => {
    console.log('Subiendo documento:', document);
  };

  const handleViewDocument = (document) => {
    console.log('Ver documento:', document);
  };

  const handleDownloadDocument = (document) => {
    console.log('Descargar documento:', document);
  };

  const handleViewContract = (contract) => {
    console.log('Ver contrato:', contract);
  };

  const handleRenewContract = (contract) => {
    console.log('Renovar contrato:', contract);
  };

  const handleScheduleRenewal = (contract) => {
    console.log('Programar renovación:', contract);
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Desktop Sidebar */}
      <div className="hidden lg:block">
        <Sidebar 
          isCollapsed={sidebarCollapsed} 
          onToggle={handleSidebarToggle}
        />
      </div>

      {/* Mobile Header */}
      <div className="lg:hidden">
        <Header 
          onMenuToggle={handleMobileMenuToggle}
          isMenuOpen={mobileMenuOpen}
        />
      </div>

      {/* Main Content */}
      <div className={`transition-all duration-300 ${
        sidebarCollapsed ? 'lg:ml-16' : 'lg:ml-60'
      }`}>
        <div className="flex">
              {/* Main Content */}
              <div className={`flex-1 transition-all duration-300 ${showSidebar ? 'mr-96' : ''}`}>
                <div className="p-6">
                  {/* Modals */}
                  <NewClientModal
                   isOpen={showNewClientModal}
                   onClose={() => setShowNewClientModal(false)}
                   onSubmit={handleSubmitNewClient}
                   mode="create"
                   createClient={createClient}
                   editClient={editClient}
                  />
                  <NewClientModal
                   isOpen={editModalState.open}
                   onClose={() => setEditModalState({ open: false, client: null })}
                   onSubmit={handleSubmitEditClient}
                   initialData={editModalState.client}
                   mode="edit"
                   createClient={createClient}
                   editClient={editClient}
                  />
                  {/* Breadcrumb */}
              <div className="mb-6">
                <Breadcrumb />
              </div>

              {/* Header */}
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h1 className="text-2xl font-bold text-foreground">Gestión de Clientes</h1>
                  <p className="text-muted-foreground">
                    Administra relaciones con clientes, contratos y comunicaciones
                  </p>
                </div>
                <div className="flex items-center space-x-4">
                  <div className="flex items-center space-x-2 bg-muted rounded-lg p-1">
                    <Button
                      variant={viewMode === 'table' ? 'default' : 'ghost'}
                      size="sm"
                      onClick={() => setViewMode('table')}
                      iconName="Table"
                    >
                      Tabla
                    </Button>
                    <Button
                      variant={viewMode === 'cards' ? 'default' : 'ghost'}
                      size="sm"
                      onClick={() => setViewMode('cards')}
                      iconName="Grid3X3"
                    >
                      Tarjetas
                    </Button>
                  </div>
                  <Button
                    variant="default"
                    onClick={handleAddClient}
                    iconName="Plus"
                    iconPosition="left"
                  >
                    Nuevo Cliente
                  </Button>
                </div>
              </div>

              {/* Stats Cards */}
              {/* <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
                <div className="bg-card border border-border rounded-lg p-6 card-shadow">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Total Clientes</p>
                      <p className="text-2xl font-bold text-foreground">{Array.isArray(clients) ? clients.length : 0}</p>
                    </div>
                    <div className="w-12 h-12 bg-primary rounded-lg flex items-center justify-center">
                      <Icon name="Users" size={24} color="white" />
                    </div>
                  </div>
                  <div className="mt-4 flex items-center space-x-2">
                    <Icon name="TrendingUp" size={16} className="text-success" />
                    <span className="text-sm text-success">{getMonthlyVariation(Array.isArray(clients) ? clients.length : 0, getPreviousMonthClients(clients))} este mes</span>
                  </div>
                </div>

                <div className="bg-card border border-border rounded-lg p-6 card-shadow">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Clientes Activos</p>
                      <p className="text-2xl font-bold text-foreground">
                        {getActiveClients(clients)}
                      </p>
                    </div>
                    <div className="w-12 h-12 bg-success rounded-lg flex items-center justify-center">
                      <Icon name="UserCheck" size={24} color="white" />
                    </div>
                  </div>
                  <div className="mt-4 flex items-center space-x-2">
                    <Icon name="TrendingUp" size={16} className="text-success" />
                    <span className="text-sm text-success">{getMonthlyVariation(getActiveClients(clients), getPreviousMonthActiveClients(clients))} este mes</span>
                  </div>
                </div>

                <div className="bg-card border border-border rounded-lg p-6 card-shadow">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Contratos Activos</p>
                      <p className="text-2xl font-bold text-foreground">
                        {Array.isArray(clients) ? clients.reduce((sum, client) => sum + (Number(client?.activeContracts) || 0), 0) : 0}
                      </p>
                    </div>
                    <div className="w-12 h-12 bg-accent rounded-lg flex items-center justify-center">
                      <Icon name="FileCheck" size={24} color="white" />
                    </div>
                  </div>
                  <div className="mt-4 flex items-center space-x-2">
                    <Icon name="TrendingUp" size={16} className="text-success" />
                    <span className="text-sm text-success">+5% este mes</span>
                  </div>
                </div>

                <div className="bg-card border border-border rounded-lg p-6 card-shadow">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Valor Total</p>
                      <p className="text-2xl font-bold text-foreground">
                        ${Array.isArray(clients) ? clients.reduce((sum, client) => sum + (Number(client?.totalValue) || 0), 0).toLocaleString('es-MX') : '0'}
                      </p>
                    </div>
                    <div className="w-12 h-12 bg-warning rounded-lg flex items-center justify-center">
                      <Icon name="DollarSign" size={24} color="white" />
                    </div>
                  </div>
                  <div className="mt-4 flex items-center space-x-2">
                    <Icon name="TrendingUp" size={16} className="text-success" />
                    <span className="text-sm text-success">+15% este mes</span>
                  </div>
                </div>
              </div> */}

              {/* Filters */}
              <ClientFilters
                filters={filters}
                onFiltersChange={handleFiltersChange}
                onClearFilters={handleClearFilters}
                onExport={handleExportClients}
                estados={estados}
              />

              {/* Client List */}
              {viewMode === 'table' ? (
                <div style={{overflowX: 'auto', width: '100%'}}>
                  <ClientTable
                    clients={filteredClients}
                    onViewDetails={handleViewDetails}
                    onEditClient={handleEditClient}
                    onViewProjects={handleViewProjects}
                    onViewContracts={handleViewContracts}
                  />
                </div>
              ) : (
                <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
                  {filteredClients?.map((client) => (
                    <ClientCard
                      key={client?.id}
                      client={client}
                      onViewDetails={handleViewDetails}
                      onEditClient={handleEditClient}
                      onViewProjects={handleViewProjects}
                      onViewContracts={handleViewContracts}
                    />
                  ))}
                </div>
              )}

              {filteredClients?.length === 0 && (
                <div className="text-center py-12">
                  <Icon name="Users" size={64} className="text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-foreground mb-2">No se encontraron clientes</h3>
                  <p className="text-muted-foreground mb-4">
                    Ajusta los filtros de búsqueda o agrega un nuevo cliente
                  </p>
                  <Button
                    variant="default"
                    onClick={handleAddClient}
                    iconName="Plus"
                    iconPosition="left"
                  >
                    Agregar Primer Cliente
                  </Button>
                </div>
              )}
            </div>
          </div>

          {/* Sidebar */}
          {showSidebar && (
            <div className="fixed right-0 top-0 h-full bg-card border-l border-border shadow-lg z-1000 overflow-y-auto" style={{width: '500px', minWidth: '440px'}}>
              <div className="p-6">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-lg font-semibold text-foreground">
                    {selectedClient?.companyName}
                  </h2>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setShowSidebar(false)}
                  >
                    <Icon name="X" size={20} />
                  </Button>
                </div>

                <div className="space-y-6">
                  {/* Communication Panel */}
                  <ClientCommunicationPanel client={selectedClient} />

                  {/* Document Status */}
                  <DocumentStatus
                    documents={mockDocuments}
                    onUploadDocument={handleUploadDocument}
                    onViewDocument={handleViewDocument}
                    onDownloadDocument={handleDownloadDocument}
                  />

                  {/* Contract Alerts */}
                  <ContractAlerts
                    contracts={mockContracts}
                    onViewContract={handleViewContract}
                    onRenewContract={handleRenewContract}
                    onScheduleRenewal={handleScheduleRenewal}
                  />
                </div>
              </div>
            </div>
          )}

          {/* Sidebar Overlay */}
          {showSidebar && (
            <div
              className="fixed inset-0 bg-black bg-opacity-50 z-999 lg:hidden"
              onClick={() => setShowSidebar(false)}
            />
          )}

          {/* New Client Modal */}
          <NewClientModal
            isOpen={showNewClientModal}
            onClose={() => setShowNewClientModal(false)}
            onSubmit={handleSubmitNewClient}
          />
        </div>
      </div>
    </div>
  );
};

export default ClientManagement;