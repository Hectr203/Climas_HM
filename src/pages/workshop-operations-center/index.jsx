import React, { useState, useEffect } from 'react';
import Header from '../../components/ui/Header';
import Sidebar from '../../components/ui/Sidebar';
import Breadcrumb from '../../components/ui/Breadcrumb';

import Button from '../../components/ui/Button';

import WorkflowBoard from './components/WorkflowBoard';
import MaterialReceptionPanel from './components/MaterialReceptionPanel';
import SafetyChecklistPanel from './components/SafetyChecklistPanel';
import AttendancePanel from './components/AttendancePanel';
import QualityControlPanel from './components/QualityControlPanel';
import EvidenceSubmissionPanel from './components/EvidenceSubmissionPanel';
import ChangeOrderPanel from './components/ChangeOrderPanel';
import WorkshopStats from './components/WorkshopStats';
import ShiftManagementPanel from './components/ShiftManagementPanel';

const WorkshopOperationsCenter = () => {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [activePanel, setActivePanel] = useState('workflow');
  const [workOrders, setWorkOrders] = useState([]);
  const [currentShift, setCurrentShift] = useState({
    start: '8:00',
    end: '18:00',
    date: new Date()?.toISOString()?.split('T')?.[0],
    attendanceCount: 12,
    totalTechnicians: 15
  });

  // Mock data for workshop work orders following the operational flow
  const mockWorkOrders = [
    {
      id: 1,
      orderNumber: 'WO-2024-001',
      projectReference: 'Torre Corporativa ABC',
      clientName: 'Corporación ABC S.A.',
      stage: 'material_reception',
      priority: 'Alta',
      assignedTechnicians: [
        { id: 1, name: 'Carlos Mendoza', role: 'Técnico Senior' },
        { id: 2, name: 'Ana García', role: 'Especialista HVAC' }
      ],
      materialsReceived: {
        status: 'pending',
        items: [
          { name: 'Compresor Rotativo 5HP', quantity: '2 unidades', received: false, condition: null },
          { name: 'Filtro de Aire HEPA', quantity: '8 unidades', received: false, condition: null },
          { name: 'Ductos Galvanizados', quantity: '150 metros', received: false, condition: null }
        ],
        photos: [],
        notes: ''
      },
      safetyChecklist: {
        status: 'pending',
        items: [
          { name: 'EPP Completo', checked: false },
          { name: 'Herramientas en buen estado', checked: false },
          { name: 'Área de trabajo despejada', checked: false },
          { name: 'Certificaciones vigentes', checked: false }
        ]
      },
      manufacturing: {
        progress: 0,
        startDate: null,
        estimatedCompletion: '2024-10-15',
        photos: [],
        notes: ''
      },
      qualityControl: {
        status: 'pending',
        checkpoints: [
          { name: 'Verificación de instalación', passed: null },
          { name: 'Pruebas de funcionamiento', passed: null },
          { name: 'Inspección visual', passed: null },
          { name: 'Documentación técnica', passed: null }
        ],
        photos: [],
        inspector: null
      },
      evidenceSubmission: {
        status: 'pending',
        photos: [],
        documents: [],
        submittedToProjects: false,
        submissionDate: null
      },
      changeOrders: []
    },
    {
      id: 2,
      orderNumber: 'WO-2024-002',
      projectReference: 'Centro Comercial Plaza Norte',
      clientName: 'Inmobiliaria Plaza Norte',
      stage: 'safety_attendance',
      priority: 'Media',
      assignedTechnicians: [
        { id: 3, name: 'Roberto Silva', role: 'Técnico Junior' },
        { id: 4, name: 'María López', role: 'Supervisora' }
      ],
      materialsReceived: {
        status: 'completed',
        items: [
          { name: 'Filtros de Aire', quantity: '20 unidades', received: true, condition: 'good' },
          { name: 'Refrigerante R-410A', quantity: '2 cilindros', received: true, condition: 'good' },
          { name: 'Aceite para Compresor', quantity: '5 litros', received: true, condition: 'good' }
        ],
        photos: ['material-photo-1.jpg', 'material-photo-2.jpg'],
        notes: 'Todos los materiales recibidos en excelente estado'
      },
      safetyChecklist: {
        status: 'in_progress',
        items: [
          { name: 'EPP Completo', checked: true },
          { name: 'Herramientas en buen estado', checked: true },
          { name: 'Área de trabajo despejada', checked: false },
          { name: 'Certificaciones vigentes', checked: false }
        ]
      },
      manufacturing: {
        progress: 0,
        startDate: null,
        estimatedCompletion: '2024-10-12',
        photos: [],
        notes: ''
      },
      qualityControl: {
        status: 'pending',
        checkpoints: [
          { name: 'Verificación de instalación', passed: null },
          { name: 'Pruebas de funcionamiento', passed: null },
          { name: 'Inspección visual', passed: null },
          { name: 'Documentación técnica', passed: null }
        ],
        photos: [],
        inspector: null
      },
      evidenceSubmission: {
        status: 'pending',
        photos: [],
        documents: [],
        submittedToProjects: false,
        submissionDate: null
      },
      changeOrders: []
    },
    {
      id: 3,
      orderNumber: 'WO-2024-003',
      projectReference: 'Hospital General San José',
      clientName: 'Hospital General San José',
      stage: 'manufacturing',
      priority: 'Crítica',
      assignedTechnicians: [
        { id: 5, name: 'Diego Ramírez', role: 'Técnico Senior' },
        { id: 6, name: 'Laura Jiménez', role: 'Especialista HVAC' }
      ],
      materialsReceived: {
        status: 'completed',
        items: [
          { name: 'Compresor Scroll 10HP', quantity: '1 unidad', received: true, condition: 'good' },
          { name: 'Kit de Conexiones', quantity: '1 set', received: true, condition: 'good' },
          { name: 'Refrigerante R-134A', quantity: '3 cilindros', received: true, condition: 'good' }
        ],
        photos: ['material-photo-3.jpg', 'material-photo-4.jpg'],
        notes: 'Materiales de emergencia recibidos y verificados'
      },
      safetyChecklist: {
        status: 'completed',
        items: [
          { name: 'EPP Completo', checked: true },
          { name: 'Herramientas en buen estado', checked: true },
          { name: 'Área de trabajo despejada', checked: true },
          { name: 'Certificaciones vigentes', checked: true }
        ]
      },
      manufacturing: {
        progress: 85,
        startDate: '2024-10-01',
        estimatedCompletion: '2024-10-03',
        photos: ['progress-photo-1.jpg', 'progress-photo-2.jpg'],
        notes: 'Instalación de emergencia en UCI en progreso avanzado'
      },
      qualityControl: {
        status: 'pending',
        checkpoints: [
          { name: 'Verificación de instalación', passed: null },
          { name: 'Pruebas de funcionamiento', passed: null },
          { name: 'Inspección visual', passed: null },
          { name: 'Documentación técnica', passed: null }
        ],
        photos: [],
        inspector: null
      },
      evidenceSubmission: {
        status: 'pending',
        photos: [],
        documents: [],
        submittedToProjects: false,
        submissionDate: null
      },
      changeOrders: [
        {
          id: 1,
          type: 'client',
          description: 'Cambio en ubicación de unidad por requerimientos médicos',
          requestedBy: 'Hospital General San José',
          date: '2024-10-02',
          status: 'approved',
          impact: 'Reubicación de equipos, sin cambio en cronograma'
        }
      ]
    },
    {
      id: 4,
      orderNumber: 'WO-2024-004',
      projectReference: 'Edificio Residencial Vista Mar',
      clientName: 'Constructora Vista Mar',
      stage: 'quality_control',
      priority: 'Media',
      assignedTechnicians: [
        { id: 7, name: 'Patricia Morales', role: 'Supervisora' },
        { id: 8, name: 'Alejandro Ruiz', role: 'Técnico Senior' }
      ],
      materialsReceived: {
        status: 'completed',
        items: [
          { name: 'Unidades VRF', quantity: '24 unidades', received: true, condition: 'good' },
          { name: 'Controles Remotos', quantity: '24 unidades', received: true, condition: 'good' },
          { name: 'Tubería de Cobre', quantity: '200 metros', received: true, condition: 'good' }
        ],
        photos: ['material-photo-5.jpg', 'material-photo-6.jpg'],
        notes: 'Sistema VRF completo recibido según especificaciones'
      },
      safetyChecklist: {
        status: 'completed',
        items: [
          { name: 'EPP Completo', checked: true },
          { name: 'Herramientas en buen estado', checked: true },
          { name: 'Área de trabajo despejada', checked: true },
          { name: 'Certificaciones vigentes', checked: true }
        ]
      },
      manufacturing: {
        progress: 100,
        startDate: '2024-09-20',
        estimatedCompletion: '2024-09-30',
        photos: ['final-photo-1.jpg', 'final-photo-2.jpg'],
        notes: 'Instalación VRF completada exitosamente en todos los pisos'
      },
      qualityControl: {
        status: 'in_progress',
        checkpoints: [
          { name: 'Verificación de instalación', passed: true },
          { name: 'Pruebas de funcionamiento', passed: true },
          { name: 'Inspección visual', passed: false },
          { name: 'Documentación técnica', passed: null }
        ],
        photos: ['qc-photo-1.jpg'],
        inspector: 'Patricia Morales'
      },
      evidenceSubmission: {
        status: 'pending',
        photos: [],
        documents: [],
        submittedToProjects: false,
        submissionDate: null
      },
      changeOrders: []
    },
    {
      id: 5,
      orderNumber: 'WO-2024-005',
      projectReference: 'Oficinas Corporativas TechSoft',
      clientName: 'TechSoft Solutions',
      stage: 'evidence_submission',
      priority: 'Baja',
      assignedTechnicians: [
        { id: 9, name: 'Fernando Castro', role: 'Especialista IoT' },
        { id: 10, name: 'Gabriela Vázquez', role: 'Técnico Senior' }
      ],
      materialsReceived: {
        status: 'completed',
        items: [
          { name: 'Sensores IoT', quantity: '15 unidades', received: true, condition: 'good' },
          { name: 'Gateway de Comunicación', quantity: '1 unidad', received: true, condition: 'good' },
          { name: 'Cableado de Red', quantity: '100 metros', received: true, condition: 'good' }
        ],
        photos: ['iot-material-1.jpg', 'iot-material-2.jpg'],
        notes: 'Sistema IoT completo con tecnología de vanguardia'
      },
      safetyChecklist: {
        status: 'completed',
        items: [
          { name: 'EPP Completo', checked: true },
          { name: 'Herramientas en buen estado', checked: true },
          { name: 'Área de trabajo despejada', checked: true },
          { name: 'Certificaciones vigentes', checked: true }
        ]
      },
      manufacturing: {
        progress: 100,
        startDate: '2024-09-25',
        estimatedCompletion: '2024-10-01',
        photos: ['iot-install-1.jpg', 'iot-install-2.jpg'],
        notes: 'Sistema IoT instalado y configurado completamente'
      },
      qualityControl: {
        status: 'completed',
        checkpoints: [
          { name: 'Verificación de instalación', passed: true },
          { name: 'Pruebas de funcionamiento', passed: true },
          { name: 'Inspección visual', passed: true },
          { name: 'Documentación técnica', passed: true }
        ],
        photos: ['qc-final-1.jpg', 'qc-final-2.jpg'],
        inspector: 'Gabriela Vázquez'
      },
      evidenceSubmission: {
        status: 'in_progress',
        photos: ['evidence-1.jpg', 'evidence-2.jpg', 'evidence-3.jpg'],
        documents: ['manual-usuario.pdf', 'certificado-instalacion.pdf'],
        submittedToProjects: false,
        submissionDate: null
      },
      changeOrders: []
    }
  ];

  const [workshopStats, setWorkshopStats] = useState({
    activeWorkOrders: 5,
    completedToday: 2,
    pendingMaterials: 3,
    qualityIssues: 1,
    attendanceRate: 80,
    averageProgress: 54
  });

  useEffect(() => {
    setWorkOrders(mockWorkOrders);

    // Update workshop stats based on work orders
    const stats = {
      activeWorkOrders: mockWorkOrders?.length,
      completedToday: mockWorkOrders?.filter(wo => wo?.stage === 'evidence_submission')?.length,
      pendingMaterials: mockWorkOrders?.filter(wo => wo?.materialsReceived?.status === 'pending')?.length,
      qualityIssues: mockWorkOrders?.filter(wo =>
        wo?.qualityControl?.checkpoints?.some(cp => cp?.passed === false)
      )?.length,
      attendanceRate: Math.round((currentShift?.attendanceCount / currentShift?.totalTechnicians) * 100),
      averageProgress: Math.round(
        mockWorkOrders?.reduce((sum, wo) => sum + wo?.manufacturing?.progress, 0) / mockWorkOrders?.length
      )
    };
    setWorkshopStats(stats);
  }, [currentShift?.attendanceCount, currentShift?.totalTechnicians]);

  const handleSidebarToggle = () => {
    setSidebarCollapsed(!sidebarCollapsed);
  };

  const handleMobileMenuToggle = () => {
    setMobileMenuOpen(!mobileMenuOpen);
  };

  const handleStageUpdate = (workOrderId, newStage) => {
    setWorkOrders(prevOrders =>
      prevOrders?.map(wo =>
        wo?.id === workOrderId ? { ...wo, stage: newStage } : wo
      )
    );
  };

  const handleMaterialReception = (workOrderId, materialData) => {
    setWorkOrders(prevOrders =>
      prevOrders?.map(wo =>
        wo?.id === workOrderId
          ? {
            ...wo,
            materialsReceived: { ...wo?.materialsReceived, ...materialData },
            stage: materialData?.status === 'completed' ? 'safety_attendance' : wo?.stage
          }
          : wo
      )
    );
  };

  const handleSafetyChecklist = (workOrderId, safetyData) => {
    setWorkOrders(prevOrders =>
      prevOrders?.map(wo =>
        wo?.id === workOrderId
          ? {
            ...wo,
            safetyChecklist: { ...wo?.safetyChecklist, ...safetyData },
            stage: safetyData?.status === 'completed' ? 'manufacturing' : wo?.stage
          }
          : wo
      )
    );
  };

  const handleManufacturingUpdate = (workOrderId, manufacturingData) => {
    setWorkOrders(prevOrders =>
      prevOrders?.map(wo =>
        wo?.id === workOrderId
          ? {
            ...wo,
            manufacturing: { ...wo?.manufacturing, ...manufacturingData },
            stage: manufacturingData?.progress === 100 ? 'quality_control' : wo?.stage
          }
          : wo
      )
    );
  };

  const handleQualityControl = (workOrderId, qualityData) => {
    setWorkOrders(prevOrders =>
      prevOrders?.map(wo =>
        wo?.id === workOrderId
          ? {
            ...wo,
            qualityControl: { ...wo?.qualityControl, ...qualityData },
            stage: qualityData?.status === 'completed' ? 'evidence_submission' : wo?.stage
          }
          : wo
      )
    );
  };

  const handleEvidenceSubmission = (workOrderId, evidenceData) => {
    setWorkOrders(prevOrders =>
      prevOrders?.map(wo =>
        wo?.id === workOrderId
          ? {
            ...wo,
            evidenceSubmission: { ...wo?.evidenceSubmission, ...evidenceData }
          }
          : wo
      )
    );
  };

  const handleChangeOrder = (workOrderId, changeOrderData) => {
    setWorkOrders(prevOrders =>
      prevOrders?.map(wo =>
        wo?.id === workOrderId
          ? {
            ...wo,
            changeOrders: [...(wo?.changeOrders || []), changeOrderData]
          }
          : wo
      )
    );
  };

  const handleAttendanceUpdate = (attendanceData) => {
    setCurrentShift(prev => ({ ...prev, ...attendanceData }));
  };

  const handleReportToProjects = (workOrderId, reportType, reportData) => {
    // console.log eliminado
    // Integration with Projects department
  };

  const handleRequestToPurchases = (workOrderId, requestType, requestData) => {
    // console.log eliminado
    // Integration with Purchases department
  };

  return (
    <div className="min-h-screen bg-background">
      <Header
        onMenuToggle={() => setMobileMenuOpen(!mobileMenuOpen)}
        isMenuOpen={mobileMenuOpen}
        sidebarCollapsed={sidebarCollapsed}
      />
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
      <div className={`transition-all duration-300 ${sidebarCollapsed ? 'lg:ml-16' : 'lg:ml-60'
        }`}>
        <div className="p-6">
          {/* Breadcrumb */}
          <div className="mb-6">
            <Breadcrumb />
          </div>

          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-2xl font-bold text-foreground">Centro de Operaciones del Taller</h1>
              <p className="text-muted-foreground">
                Gestión integral del flujo operativo del taller - Turno {currentShift?.start} a {currentShift?.end}
              </p>
            </div>
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2 bg-muted rounded-lg p-1">
                <Button
                  variant={activePanel === 'workflow' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setActivePanel('workflow')}
                  iconName="Workflow"
                >
                  Flujo
                </Button>
                <Button
                  variant={activePanel === 'operations' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setActivePanel('operations')}
                  iconName="Settings"
                >
                  Operaciones
                </Button>
              </div>
              <Button
                variant="default"
                iconName="FileText"
                iconPosition="left"
              >
                Reporte Semanal
              </Button>
            </div>
          </div>

          {/* Workshop Stats */}
          <WorkshopStats stats={workshopStats} currentShift={currentShift} />

          {/* Shift Management Panel */}
          <ShiftManagementPanel
            currentShift={currentShift}
            onAttendanceUpdate={handleAttendanceUpdate}
          />

          {/* Main Workshop Content */}
          {activePanel === 'workflow' ? (
            <div className="space-y-6">
              {/* Workflow Board - Kanban Style */}
              <WorkflowBoard
                workOrders={workOrders}
                onStageUpdate={handleStageUpdate}
                onMaterialReception={handleMaterialReception}
                onSafetyChecklist={handleSafetyChecklist}
                onManufacturingUpdate={handleManufacturingUpdate}
                onQualityControl={handleQualityControl}
                onEvidenceSubmission={handleEvidenceSubmission}
                onChangeOrder={handleChangeOrder}
                onReportToProjects={handleReportToProjects}
                onRequestToPurchases={handleRequestToPurchases}
              />
            </div>
          ) : (
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
              {/* Material Reception Panel */}
              <MaterialReceptionPanel
                workOrders={workOrders?.filter(wo => wo?.stage === 'material_reception' || wo?.materialsReceived?.status === 'pending')}
                onMaterialReception={handleMaterialReception}
                onReportToProjects={handleReportToProjects}
                onRequestToPurchases={handleRequestToPurchases}
              />

              {/* Safety & Attendance Panel */}
              <div className="space-y-6">
                <SafetyChecklistPanel
                  workOrders={workOrders?.filter(wo => wo?.stage === 'safety_attendance')}
                  onSafetyUpdate={handleSafetyChecklist}
                />

                <AttendancePanel
                  currentShift={currentShift}
                  onAttendanceUpdate={handleAttendanceUpdate}
                />
              </div>

              {/* Quality Control Panel */}
              <QualityControlPanel
                workOrders={workOrders?.filter(wo => wo?.stage === 'quality_control')}
                onQualityUpdate={handleQualityControl}
                onReportToProjects={handleReportToProjects}
              />

              {/* Evidence Submission Panel */}
              <EvidenceSubmissionPanel
                workOrders={workOrders?.filter(wo => wo?.stage === 'evidence_submission')}
                onEvidenceSubmission={handleEvidenceSubmission}
                onReportToProjects={handleReportToProjects}
              />

              {/* Change Order Panel */}
              <div className="xl:col-span-2">
                <ChangeOrderPanel
                  workOrders={workOrders}
                  onChangeOrder={handleChangeOrder}
                  onReportToProjects={handleReportToProjects}
                />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default WorkshopOperationsCenter;