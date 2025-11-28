import React, { useState, useEffect } from 'react';
import Icon from '../../components/AppIcon';
import Button from '../../components/ui/Button';
import Breadcrumb from '../../components/ui/Breadcrumb';
import QuotationForm from './components/QuotationForm';
import QuotationPreview from './components/QuotationPreview';
import MaterialIdentification from './components/MaterialIdentification';
import CommunicationPanel from './components/CommunicationPanel';
import VersionControl from './components/VersionControl';

const QuotationBuilder = () => {
  const [currentQuotation, setCurrentQuotation] = useState(null);
  const [quotations, setQuotations] = useState([]);
  const [activeStep, setActiveStep] = useState('form');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  // Mock data for quotations
  const mockQuotations = [
    {
      id: "QUO-2024-001",
      projectId: "PROJ-WF-001",
      projectName: "Instalación HVAC Torre Corporativa",
      client: {
        name: "ABC Corporation",
        contact: "contacto@abccorp.com",
        address: "Av. Reforma 123, Ciudad de México"
      },
      status: "draft",
      statusLabel: "Borrador",
      createdAt: "2024-03-20T10:00:00Z",
      updatedAt: "2024-03-25T14:30:00Z",
      version: 1,
      hasCatalog: true,
      materials: [
        { 
          id: 1, 
          name: "Unidad Manejadora de Aire 10 TR", 
          quantity: 2, 
          unitPrice: 45000, 
          total: 90000,
          identified: true,
          source: "catalog"
        },
        { 
          id: 2, 
          name: "Ductos Galvanizados 24x18", 
          quantity: 50, 
          unitPrice: 850, 
          total: 42500,
          identified: true,
          source: "catalog"
        },
        { 
          id: 3, 
          name: "Rejillas de Retorno 24x24", 
          quantity: 8, 
          unitPrice: 1200, 
          total: 9600,
          identified: true,
          source: "plan_analysis"
        }
      ],
      calculations: {
        installationPercentage: 25,
        parts: 15,
        travel: 8,
        personnel: 12,
        subtotal: 142100,
        installationCost: 35525,
        partsCost: 21315,
        travelCost: 11368,
        personnelCost: 17052,
        total: 227360,
        advance: 68208, // 30%
        progress: 159152, // 70%
        warranty: "12 meses"
      },
      communication: {
        method: "email",
        sentAt: null,
        adjustments: 0
      },
      notes: "Cotización basada en catálogo proporcionado por cliente"
    },
    {
      id: "QUO-2024-002",
      projectId: "PROJ-WF-003",
      projectName: "Actualización Sistema Residencial",
      client: {
        name: "Green Energy México",
        contact: "info@greenenergy.mx",
        address: "Calle Innovación 456, Monterrey"
      },
      status: "pending_validation",
      statusLabel: "Pendiente Validación",
      createdAt: "2024-03-18T09:00:00Z",
      updatedAt: "2024-03-24T16:45:00Z",
      version: 2,
      hasCatalog: false,
      materials: [
        { 
          id: 1, 
          name: "Bomba de Calor Residencial 3 TR", 
          quantity: 1, 
          unitPrice: 28000, 
          total: 28000,
          identified: true,
          source: "plan_analysis"
        },
        { 
          id: 2, 
          name: "Termostato Programable WiFi", 
          quantity: 3, 
          unitPrice: 2500, 
          total: 7500,
          identified: true,
          source: "plan_analysis"
        }
      ],
      calculations: {
        installationPercentage: 20,
        parts: 18,
        travel: 12,
        personnel: 15,
        subtotal: 35500,
        installationCost: 7100,
        partsCost: 6390,
        travelCost: 4260,
        personnelCost: 5325,
        total: 58575,
        advance: 17572, // 30%
        progress: 41003, // 70%
        warranty: "18 meses"
      },
      communication: {
        method: "whatsapp",
        sentAt: null,
        adjustments: 1
      },
      notes: "Materiales identificados desde planos de obra. Requiere validación."
    }
  ];

  useEffect(() => {
    const loadQuotations = async () => {
      setIsLoading(true);
      await new Promise(resolve => setTimeout(resolve, 1000));
      setQuotations(mockQuotations);
      setCurrentQuotation(mockQuotations?.[0]);
      setIsLoading(false);
    };

    loadQuotations();
  }, []);

  const handleQuotationUpdate = (updatedData) => {
    setCurrentQuotation(prev => ({
      ...prev,
      ...updatedData,
      updatedAt: new Date()?.toISOString()
    }));
  };

  const handleMaterialUpdate = (materials) => {
    const subtotal = materials?.reduce((sum, item) => sum + (item?.total || 0), 0);
    
    const calculations = {
      ...currentQuotation?.calculations,
      subtotal,
      installationCost: (currentQuotation?.calculations?.installationPercentage / 100) * subtotal,
      partsCost: (currentQuotation?.calculations?.parts / 100) * subtotal,
      travelCost: (currentQuotation?.calculations?.travel / 100) * subtotal,
      personnelCost: (currentQuotation?.calculations?.personnel / 100) * subtotal
    };
    
    calculations.total = calculations?.installationCost + calculations?.partsCost + calculations?.travelCost + calculations?.personnelCost + subtotal;
    calculations.advance = (30 / 100) * calculations?.total;
    calculations.progress = (70 / 100) * calculations?.total;

    setCurrentQuotation(prev => ({
      ...prev,
      materials,
      calculations,
      updatedAt: new Date()?.toISOString()
    }));
  };

  const handleCalculationUpdate = (calculations) => {
    const updatedCalculations = {
      ...calculations,
      installationCost: (calculations?.installationPercentage / 100) * currentQuotation?.calculations?.subtotal,
      partsCost: (calculations?.parts / 100) * currentQuotation?.calculations?.subtotal,
      travelCost: (calculations?.travel / 100) * currentQuotation?.calculations?.subtotal,
      personnelCost: (calculations?.personnel / 100) * currentQuotation?.calculations?.subtotal
    };

    updatedCalculations.total = updatedCalculations?.installationCost + updatedCalculations?.partsCost + 
                               updatedCalculations?.travelCost + updatedCalculations?.personnelCost + 
                               currentQuotation?.calculations?.subtotal;
    updatedCalculations.advance = (30 / 100) * updatedCalculations?.total;
    updatedCalculations.progress = (70 / 100) * updatedCalculations?.total;

    setCurrentQuotation(prev => ({
      ...prev,
      calculations: updatedCalculations,
      updatedAt: new Date()?.toISOString()
    }));
  };

  const handleSaveQuotation = async () => {
    setIsSaving(true);
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    setQuotations(prev => prev?.map(q => 
      q?.id === currentQuotation?.id ? currentQuotation : q
    ));
    
    setIsSaving(false);
  };

  const handleValidationSubmit = async () => {
    setIsSaving(true);
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    const updatedQuotation = {
      ...currentQuotation,
      status: "pending_validation",
      statusLabel: "Pendiente Validación",
      validation: {
        submittedAt: new Date()?.toISOString(),
        reviewer: "Ventas/Martín"
      }
    };

    setCurrentQuotation(updatedQuotation);
    setQuotations(prev => prev?.map(q => 
      q?.id === currentQuotation?.id ? updatedQuotation : q
    ));
    
    setIsSaving(false);
  };

  const handleCommunicationSend = async (method, message) => {
    setIsSaving(true);
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    const updatedQuotation = {
      ...currentQuotation,
      communication: {
        method,
        sentAt: new Date()?.toISOString(),
        message,
        adjustments: currentQuotation?.communication?.adjustments || 0
      },
      status: "sent",
      statusLabel: "Enviada"
    };

    setCurrentQuotation(updatedQuotation);
    setQuotations(prev => prev?.map(q => 
      q?.id === currentQuotation?.id ? updatedQuotation : q
    ));
    
    setIsSaving(false);
  };

  const steps = [
    { id: 'form', label: 'Formulario', icon: 'Edit3' },
    { id: 'materials', label: 'Materiales', icon: 'Package' },
    { id: 'preview', label: 'Vista Previa', icon: 'Eye' },
    { id: 'communication', label: 'Comunicación', icon: 'Send' }
  ];

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <div className="flex items-center justify-center h-96">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">Cargando constructor de cotizaciones...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-foreground mb-2">Constructor de Cotizaciones</h1>
            <p className="text-muted-foreground">
              Creación y gestión integral de cotizaciones con cálculos automatizados
            </p>
          </div>
          
          <div className="flex items-center space-x-4 mt-4 lg:mt-0">
            <Button
              variant="outline"
              iconName="Download"
              iconPosition="left"
              // console.log eliminado
            >
              Exportar PDF
            </Button>
            <Button
              onClick={handleSaveQuotation}
              disabled={isSaving}
              iconName={isSaving ? "Loader2" : "Save"}
              iconPosition="left"
            >
              {isSaving ? 'Guardando...' : 'Guardar Cotización'}
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Sidebar - Quotation List */}
          <div className="lg:col-span-1">
            <div className="bg-card rounded-lg shadow-sm border p-4">
              <h3 className="font-semibold mb-4">Cotizaciones</h3>
              <div className="space-y-2">
                {quotations?.map((quotation) => (
                  <div
                    key={quotation?.id}
                    onClick={() => setCurrentQuotation(quotation)}
                    className={`p-3 rounded-lg cursor-pointer transition-all border ${
                      currentQuotation?.id === quotation?.id
                        ? 'bg-primary/10 border-primary' :'hover:bg-muted border-transparent'
                    }`}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <h4 className="font-medium text-sm line-clamp-2">{quotation?.projectName}</h4>
                      <span className={`text-xs px-2 py-1 rounded-full ${
                        quotation?.status === 'draft' ? 'bg-gray-100 text-gray-800' :
                        quotation?.status === 'pending_validation' ? 'bg-yellow-100 text-yellow-800' :
                        quotation?.status === 'approved'? 'bg-green-100 text-green-800' : 'bg-blue-100 text-blue-800'
                      }`}>
                        {quotation?.statusLabel}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground mb-1">{quotation?.client?.name}</p>
                    <p className="text-xs text-muted-foreground">{quotation?.id}</p>
                    <div className="flex items-center justify-between mt-2">
                      <span className="text-xs text-muted-foreground">v{quotation?.version}</span>
                      <span className="text-xs font-medium">
                        ${Number(quotation?.savedTotal ?? quotation?.calculations?.total ?? quotation?.quotationData?.totalAmount ?? 0).toLocaleString('es-MX')}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Main Content */}
          <div className="lg:col-span-3">
            {currentQuotation && (
              <div className="space-y-6">
                {/* Step Navigation */}
                <div className="flex bg-muted rounded-lg p-1">
                  {steps?.map((step) => (
                    <button
                      key={step?.id}
                      onClick={() => setActiveStep(step?.id)}
                      className={`flex items-center space-x-2 px-4 py-2 rounded-md transition-smooth flex-1 justify-center ${
                        activeStep === step?.id
                          ? 'bg-primary text-primary-foreground'
                          : 'text-muted-foreground hover:text-foreground'
                      }`}
                    >
                      <Icon name={step?.icon} size={16} />
                      <span className="hidden sm:inline text-sm">{step?.label}</span>
                    </button>
                  ))}
                </div>

                {/* Current Quotation Info */}
                <div className="bg-card rounded-lg shadow-sm border p-4">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h3 className="font-semibold">{currentQuotation?.projectName}</h3>
                      <p className="text-sm text-muted-foreground">{currentQuotation?.client?.name}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-medium">{currentQuotation?.id}</p>
                      <p className="text-xs text-muted-foreground">Versión {currentQuotation?.version}</p>
                    </div>
                  </div>

                  {/* Catalog Status */}
                  {currentQuotation?.hasCatalog ? (
                    <div className="p-3 bg-green-50 rounded-lg">
                      <div className="flex items-center space-x-2">
                        <Icon name="CheckCircle" size={16} className="text-green-600" />
                        <p className="text-sm text-green-800 font-medium">Cotización desde catálogo cliente</p>
                      </div>
                    </div>
                  ) : (
                    <div className="p-3 bg-yellow-50 rounded-lg">
                      <div className="flex items-center space-x-2">
                        <Icon name="Search" size={16} className="text-yellow-600" />
                        <p className="text-sm text-yellow-800 font-medium">Identificación de materiales desde planos</p>
                      </div>
                    </div>
                  )}
                </div>

                {/* Step Content */}
                <div className="bg-card rounded-lg shadow-sm border">
                  {activeStep === 'form' && (
                    <QuotationForm
                      quotation={currentQuotation}
                      onUpdate={handleQuotationUpdate}
                      onCalculationUpdate={handleCalculationUpdate}
                      onValidationSubmit={handleValidationSubmit}
                      isSaving={isSaving}
                    />
                  )}

                  {activeStep === 'materials' && (
                    <MaterialIdentification
                      quotation={currentQuotation}
                      onMaterialUpdate={handleMaterialUpdate}
                    />
                  )}

                  {activeStep === 'preview' && (
                    <QuotationPreview
                      quotation={currentQuotation}
                      // console.log eliminado
                    />
                  )}

                  {activeStep === 'communication' && (
                    <CommunicationPanel
                      quotation={currentQuotation}
                      onSend={handleCommunicationSend}
                      isSending={isSaving}
                    />
                  )}
                </div>

                {/* Version Control */}
                <VersionControl
                  quotation={currentQuotation}
                  // console.log eliminado
                />
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default QuotationBuilder;