import React, { useEffect, useState } from 'react';
import Icon from '../../components/AppIcon';
import Button from '../../components/ui/Button';
import Sidebar from '../../components/ui/Sidebar';
import Header from '../../components/ui/Header';
import Breadcrumb from '../../components/ui/Breadcrumb';
import FilterGastos from "./components/FilterGastos";
import FilterControls from './components/FilterControls';
import ExpenseTrackingTable from './components/ExpenseTrackingTable';
import FinancialSummaryWidget from './components/FinancialSummaryWidget';
import ReceiptManagementPanel from './components/ReceiptManagementPanel';
import PaymentAuthorizationModal from './components/PaymentAuthorizationModal';
import NewExpenseModal from './components/NewExpenseModal';
import GastosTable from './components/GastosTable';
import useFinanzas from '../../hooks/useFinanzas';

const FinanzasManagement = () => {
  const { getGastos, createGasto, deleteGasto, loading, finanzas } = useFinanzas();

  const [expenses, setExpenses] = useState([]);
  const [filters, setFilters] = useState({});
  const [activeTab, setActiveTab] = useState('expenses');

  const [showAuthModal, setShowAuthModal] = useState(false);
  const [showNewExpenseModal, setShowNewExpenseModal] = useState(false);
  const [selectedExpense, setSelectedExpense] = useState(null);

  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [headerMenuOpen, setHeaderMenuOpen] = useState(false);

  // ========================================================
  // Cargar gastos del backend al montar
  // ========================================================
  useEffect(() => {
    const fetchData = async () => {
      try {
        const data = await getGastos();
        if (Array.isArray(data)) setExpenses(data);
        else console.warn('⚠️ getGastos no devolvió un array:', data);
      } catch (err) {
        console.error('Error al obtener gastos:', err);
      }
    };
    fetchData();
    // 👇 no pongas getGastos como dependencia o se cicla
  }, []);

  // ========================================================
  // Handlers
  // ========================================================
  const handleFiltersChange = (newFilters) => setFilters(newFilters);
  const handleResetFilters = () => setFilters({});

  const handleViewExpense = (expense) => {
    setSelectedExpense(expense);
    setShowAuthModal(true);
  };

  const handleAuthorizePayment = async (authData) => {
    try {
      console.log('Autorizando pago:', authData);
      // Aquí puedes actualizar el estado del gasto o recargar la lista
    } catch (e) {
      console.error('Error al autorizar pago:', e);
    }
  };

  const handleAddNewExpense = async (createdExpense) => {
    try {
      if (!createdExpense) return;
      setExpenses((prev) => [createdExpense, ...prev]);
      setShowNewExpenseModal(false);
    } catch (err) {
      console.error('Error al agregar gasto:', err);
    }
  };

  const handleDeleteExpense = async (expenseId) => {
    if (!window.confirm('¿Seguro que deseas eliminar este gasto?')) return;
    try {
      await deleteGasto(expenseId);
      setExpenses((prev) => prev.filter((x) => x.id !== expenseId));
    } catch (err) {
      console.error('Error al eliminar gasto:', err);
      alert('No se pudo eliminar el gasto.');
    }
  };

  const tabs = [
    { id: 'expenses', label: 'Seguimiento de Gastos', icon: 'Table' },
    { id: 'ordenes', label: 'Órdenes de Compra', icon: 'ShoppingCart'},

    // TODO: Re-implementar cuando se tengan los datos
    // { id: 'summary', label: 'Resumen Financiero', icon: 'BarChart3' },
    // { id: 'receipts', label: 'Gestión de Recibos', icon: 'FileText' },
  ];

  // ========================================================
  // Render principal
  // ========================================================
  return (
    <div className="min-h-screen bg-background">
      <Header
        onMenuToggle={() => setHeaderMenuOpen(!headerMenuOpen)}
        isMenuOpen={headerMenuOpen}
      />
      <Sidebar
        isCollapsed={sidebarCollapsed}
        onToggle={() => setSidebarCollapsed(!sidebarCollapsed)}
      />

      <main
        className={`transition-all duration-300 ${
          sidebarCollapsed ? 'lg:ml-16' : 'lg:ml-60'
        }`}
      >
        <div className="p-6 space-y-6">
          {/* Breadcrumb */}
          <div className="mb-6">
            <Breadcrumb />
          </div>

          {/* HEADER */}
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between space-y-4 lg:space-y-0">
            <div>
              <h1 className="text-2xl font-bold text-foreground">
                Gestión Financiera
              </h1>
              <p className="text-muted-foreground">
                Control integral de gastos, autorizaciones y reportes financieros
              </p>
            </div>

            <div className="flex items-center space-x-3">
              <Button
                variant="outline"
                iconName="Download"
                iconPosition="left"
              >
                Exportar Reporte
              </Button>
              <Button
                variant="default"
                onClick={() => setShowNewExpenseModal(true)}
                iconName="Plus"
                iconPosition="left"
              >
                Nuevo Gasto
              </Button>
            </div>
          </div>

          {/* TABS */}
          <div className="border-b border-border">
            <nav className="flex space-x-8">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center space-x-2 py-4 px-1 border-b-2 font-medium text-sm transition-smooth ${
                    activeTab === tab.id
                      ? 'border-primary text-primary'
                      : 'border-transparent text-muted-foreground hover:text-foreground hover:border-muted-foreground'
                  }`}
                >
                  <Icon name={tab.icon} size={16} />
                  <span>{tab.label}</span>
                </button>
              ))}
            </nav>
          </div>

          {/* CONTENIDO */}
          <div className="space-y-6">
            {activeTab === 'expenses' && (
              <>
                <FilterControls
                  onFiltersChange={handleFiltersChange}
                  onReset={handleResetFilters}
                />

                {loading ? (
                  <div className="flex items-center justify-center h-64">
                    <div className="text-center">
                      <div className="animate-spin h-10 w-10 border-b-2 border-primary rounded-full mx-auto mb-3" />
                      <p className="text-muted-foreground">
                        Cargando gastos...
                      </p>
                    </div>
                  </div>
                ) : expenses.length === 0 ? (
                  <div className="text-center py-12">
                    <Icon
                      name="FolderOpen"
                      size={64}
                      className="text-muted-foreground mx-auto mb-4"
                    />
                    <h3 className="text-lg font-medium text-foreground mb-2">
                      No hay gastos registrados
                    </h3>
                    <p className="text-muted-foreground mb-6">
                      Crea un nuevo gasto para comenzar
                    </p>
                    <Button
                      onClick={() => setShowNewExpenseModal(true)}
                      iconName="Plus"
                      iconPosition="left"
                    >
                      Crear Gasto
                    </Button>
                  </div>
                ) : (
                  <ExpenseTrackingTable
                    filters={filters}
                    expenses={expenses}
                    onViewDetails={handleViewExpense}
                    onDelete={handleDeleteExpense}
                  />
                )}
              </>
            )}
{activeTab === "ordenes" && (
  <>
    <FilterGastos
      filters={filters}
      onFilterChange={handleFiltersChange}
      onClearFilters={handleResetFilters}
      totalCount={0}
      filteredCount={0}
    />
    <GastosTable filters={filters} />
  </>
)}

            
            {activeTab === 'summary' && (
              <FinancialSummaryWidget summaryData={{ totalExpenses: 0, totalRevenue: 0 }} />
            )}

            {activeTab === 'receipts' && (
              <ReceiptManagementPanel receipts={[]} />
            )}
            
          </div>
        </div>
      </main>
      

      {/* MODALES */}
      <PaymentAuthorizationModal
        isOpen={showAuthModal}
        onClose={() => setShowAuthModal(false)}
        expense={selectedExpense}
        onAuthorize={handleAuthorizePayment}
      />

      <NewExpenseModal
        isOpen={showNewExpenseModal}
        onClose={() => setShowNewExpenseModal(false)}
        onSubmit={handleAddNewExpense}
      />
    </div>
  );
};

export default FinanzasManagement;
