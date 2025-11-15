import React from "react";
import { BrowserRouter, Routes as RouterRoutes, Route, Navigate } from "react-router-dom";
import ScrollToTop from "components/ScrollToTop";
import ErrorBoundary from "components/ErrorBoundary";
import ProtectedRoute from "components/ProtectedRoute";
import { ButtonHandlersProvider } from "./components/GlobalButtonHandlers";
import { getDefaultPath } from "./utils/auth";
import NotFound from "pages/NotFound";
import ProjectManagement from './pages/project-management';
import ProjectDetailGallery from './pages/project-detail-gallery';
import ProjectGalleryViewer from './pages/project-gallery-viewer';
import ProjectDocumentationCenter from './pages/project-documentation-center';
import ProjectWorkflowManagement from './pages/project-workflow-management';
import QuotationBuilder from './pages/quotation-builder';
import MainDashboard from './pages/main-dashboard';
import InventoryManagement from './pages/inventory-management';
import LoginPage from './pages/login';
import FinancialManagement from './pages/financial-management';
import PersonnelManagement from './pages/personnel-management';
import ClientManagement from './pages/client-management';
import WorkOrderProcessing from './pages/work-order-processing';
import WorkshopOperationsManagement from './pages/workshop-operations-management';
import WorkshopOperationsCenter from './pages/workshop-operations-center';
import SalesOpportunityManagement from './pages/sales-opportunity-management';
import QuotationDevelopmentCenter from './pages/quotation-development-center';
import SalesExecutionMonitoring from './pages/sales-execution-monitoring';
import ProjectAbonosManagement from './pages/project-abonos-management';
import UserManagement from './pages/user-management';

const Routes = () => {
  // Componente para redirigir dashboard al inicio del rol
  const DashboardRedirect = () => {
    const userRole = localStorage.getItem('userRole');
    const defaultPath = getDefaultPath(userRole);
    return <Navigate to={defaultPath} replace />;
  };

  return (
    <ErrorBoundary>
      <ButtonHandlersProvider>
        <ScrollToTop />
        <RouterRoutes>
          {/* Public Route: Login */}
          <Route path="/login" element={<LoginPage />} />

          {/* Redirigir la raíz a login si no está autenticado */}
          <Route path="/" element={<LoginPage />} />
          
          {/* Redirigir dashboard al inicio del rol actual */}
          <Route path="/dashboard" element={<DashboardRedirect />} />
          
            <Route 
              path="/proyectos" 
              element={
                <ProtectedRoute requiredPath="/proyectos">
                  <ProjectManagement />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/galeria-proyecto/:projectId" 
              element={
                <ProtectedRoute requiredPath="/galeria-proyecto">
                  <ProjectDetailGallery />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/visor-galeria/:projectId" 
              element={
                <ProtectedRoute requiredPath="/visor-galeria">
                  <ProjectGalleryViewer />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/documentacion-proyectos" 
              element={
                <ProtectedRoute requiredPath="/documentacion-proyectos">
                  <ProjectDocumentationCenter />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/flujo-proyecto" 
              element={
                <ProtectedRoute requiredPath="/flujo-proyecto">
                  <ProjectWorkflowManagement />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/constructor-cotizaciones" 
              element={
                <ProtectedRoute requiredPath="/constructor-cotizaciones">
                  <QuotationBuilder />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/inventario" 
              element={
                <ProtectedRoute requiredPath="/inventario">
                  <InventoryManagement />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/finanzas" 
              element={
                <ProtectedRoute requiredPath="/finanzas">
                  <FinancialManagement />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/personal" 
              element={
                <ProtectedRoute requiredPath="/personal">
                  <PersonnelManagement />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/clientes" 
              element={
                <ProtectedRoute requiredPath="/clientes">
                  <ClientManagement />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/operaciones" 
              element={
                <ProtectedRoute requiredPath="/operaciones">
                  <WorkOrderProcessing />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/operaciones-taller" 
              element={
                <ProtectedRoute requiredPath="/operaciones-taller">
                  <WorkshopOperationsManagement />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/centro-operaciones-taller" 
              element={
                <ProtectedRoute requiredPath="/centro-operaciones-taller">
                  <WorkshopOperationsCenter />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/oportunidades" 
              element={
                <ProtectedRoute requiredPath="/oportunidades">
                  <SalesOpportunityManagement />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/usuarios" 
              element={
                <ProtectedRoute requiredPath="/usuarios">
                  <UserManagement />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/cotizaciones" 
              element={
                <ProtectedRoute requiredPath="/cotizaciones">
                  <QuotationDevelopmentCenter />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/abonos" 
              element={
                <ProtectedRoute requiredPath="/abonos">
                  <ProjectAbonosManagement />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/monitoreo-ventas" 
              element={
                <ProtectedRoute requiredPath="/monitoreo-ventas">
                  <SalesExecutionMonitoring />
                </ProtectedRoute>
              } 
            />
            
            {/* Catch-all route for 404 */}
            <Route path="*" element={<NotFound />} />
          </RouterRoutes>
        </ButtonHandlersProvider>
      </ErrorBoundary>
  );
};

export default Routes;