import React, { useState, useEffect } from 'react';
import { Navigate } from 'react-router-dom';
import Icon from '../../components/AppIcon';
import Button from '../../components/ui/Button';
import Sidebar from '../../components/ui/Sidebar';
import Header from '../../components/ui/Header';
import Breadcrumb from '../../components/ui/Breadcrumb';
import Input from '../../components/ui/Input';
import Select from '../../components/ui/Select';
import { useNotifications } from '../../context/NotificationContext';
import usePrecioMaterial from '../../hooks/usePrecioMaterial';
import useAuth from '../../hooks/useAuth';

/**
 * Página de Gestión de Precios de Materiales
 * Permite consultar precios de productos mediante web scraping de VentDepot
 */
const PriceManagement = () => {
  const { showSuccess, showError, showInfo } = useNotifications();
  const { getPreciosMaterial, scrapePrices, loading } = usePrecioMaterial();
  const { user, hasAnyRole, isAuthenticated } = useAuth();

  // Verificar permisos - solo admin y proyectos
  const allowedRoles = ['admin', 'proyectos'];
  const hasAccess = isAuthenticated && hasAnyRole(allowedRoles);

  // Si no tiene acceso, redirigir
  if (!hasAccess) {
    return <Navigate to="/" replace />;
  }

  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [headerMenuOpen, setHeaderMenuOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('search');
  const [searchQuery, setSearchQuery] = useState('');
  const [scrapedProducts, setScrapedProducts] = useState([]);
  const [savedProducts, setSavedProducts] = useState([]);
  const [scraping, setScraping] = useState(false);
  
  // Estado para formulario de nuevo producto
  const [showAddForm, setShowAddForm] = useState(false);
  const [savingManual, setSavingManual] = useState(false);
  
  // Estado para modal de confirmación de eliminación
  const [deleteModal, setDeleteModal] = useState({ open: false, productId: null, productName: '' });
  const [newProduct, setNewProduct] = useState({
    name: '',
    clave_ventdepot: '',
    precio: '',
    dimensiones_base: '',
    dimensiones_altura: '',
    dimensiones_fondo: '',
    peso_kg: '',
    tiempo_fabricacion_dias: '',
    garantia_anos: '',
  });

  useEffect(() => {
    loadSavedProducts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadSavedProducts = async () => {
    try {
      const data = await getPreciosMaterial();
      const normalize = (p) => {
        // Obtener ID correcto (MongoDB usa _id, puede ser string o ObjectId)
        let productId = p.id || p._id;
        if (productId && typeof productId === 'object' && productId.$oid) {
          productId = productId.$oid;
        }
        return {
        id: productId,
        name: p.name || p.nombre || p.title || '',
        dimensiones_base: p.dimensiones_base || p.dimensionesBase || '',
        dimensiones_altura: p.dimensiones_altura || p.dimensionesAltura || '',
        dimensiones_fondo: p.dimensiones_fondo || p.dimensionesFondo || '',
        peso_kg: p.peso_kg ?? p.pesoKg ?? null,
        peso_lb: p.peso_lb ?? p.pesoLb ?? null,
        tiempo_fabricacion_dias: p.tiempo_fabricacion_dias ?? p.tiempoFabricacionDias ?? null,
        garantia_anos: p.garantia_anos ?? p.garantia ?? null,
        clave_ventdepot: p.clave_ventdepot || p.clave || p.sku || '',
        precio: p.precio ?? p.price ?? null,
        imagen_url: p.imagen_url || p.image || '',
        raw: p,
      };
      };
      
      // Filtrar productos válidos (que tengan al menos nombre o clave)
      const normalized = Array.isArray(data) ? data.map(normalize) : [];
      const validProducts = normalized.filter(p => p.name || p.clave_ventdepot);
      
      // Ordenar por clave descendente (MXSPS-001 al final, MXSPS-999 primero)
      validProducts.sort((a, b) => {
        const claveA = a.clave_ventdepot || '';
        const claveB = b.clave_ventdepot || '';
        return claveB.localeCompare(claveA, undefined, { numeric: true });
      });
      
      setSavedProducts(validProducts);
    } catch (error) {
      console.error('Error al cargar productos:', error);
      showError('Error al cargar los productos guardados');
    }
  };

  // Abrir modal de confirmación para eliminar
  const openDeleteModal = (productId, productName) => {
    if (!productId) return showError('ID de producto no valido');
    setDeleteModal({ open: true, productId, productName: productName || 'este producto' });
  };

  // Cerrar modal de eliminación
  const closeDeleteModal = () => {
    setDeleteModal({ open: false, productId: null, productName: '' });
  };

  // Confirmar eliminación de producto
  const confirmDeleteProduct = async () => {
    const { productId } = deleteModal;
    closeDeleteModal();
    
    try {
      showInfo('Eliminando producto...');
      const { default: precioMaterialService } = await import('../../services/precioMaterialService');
      await precioMaterialService.deletePrecioMaterial(productId);
      
      // Forzar actualización inmediata del estado local
      setSavedProducts(prev => prev.filter(p => p.id !== productId));
      
      // Recargar desde el servidor para asegurar sincronización
      await loadSavedProducts();
      showSuccess('Producto eliminado correctamente');
    } catch (err) {
      console.error('Error al eliminar producto:', err);
      showError('Error al eliminar el producto');
      // Recargar de todas formas para sincronizar
      await loadSavedProducts();
    }
  };

  const handleScrape = async () => {
    setScraping(true);
    try {
      const query = searchQuery.trim() || '';
      showInfo(query ? 'Buscando productos...' : 'Extrayendo todos los productos de VentDepot...');
      const data = await scrapePrices(query);
      
      if (!data || data.length === 0) {
        showInfo('No se encontraron productos');
        setScrapedProducts([]);
        return;
      }
      
      // Identificar productos existentes vs nuevos
      const existingClaves = new Set(savedProducts.map(p => p.clave_ventdepot).filter(Boolean));
      const existingCount = (data || []).filter(p => p.clave_ventdepot && existingClaves.has(p.clave_ventdepot)).length;
      const newCount = data.length - existingCount;
      
      // Guardar/actualizar todos los productos automáticamente (upsert)
      showInfo(`Guardando ${data.length} productos (${existingCount} actualizaciones, ${newCount} nuevos)...`);
      const { default: precioMaterialService } = await import('../../services/precioMaterialService');
      await precioMaterialService.batchUpsertPrecios(data);
      
      // Mostrar todos los productos scrapeados en la UI
      setScrapedProducts(data);
      
      // Recargar productos guardados para reflejar cambios
      await loadSavedProducts();
      
      showSuccess(`Se procesaron ${data.length} productos (${existingCount} actualizados, ${newCount} nuevos)`);
    } catch (error) {
      console.error('Error al extraer precios:', error);
      showError('Error al extraer precios de la página');
    } finally {
      setScraping(false);
    }
  };

  const handleSaveAll = async () => {
    if (!scrapedProducts.length) return showInfo('No hay productos para guardar');
    try {
      showInfo('Guardando productos en la base...');
      const { default: precioMaterialService } = await import('../../services/precioMaterialService');
      await precioMaterialService.batchUpsertPrecios(scrapedProducts);
      await loadSavedProducts();
      setScrapedProducts([]); // Limpiar productos scrapeados
      setActiveTab('saved'); // Cambiar a pestaña de guardados
      showSuccess('Productos guardados/actualizados correctamente');
    } catch (err) {
      console.error('Error al guardar batch:', err);
      showError('Error al guardar los productos');
      throw err;
    }
  };

  const handleSaveOne = async (product) => {
    try {
      showInfo('Guardando producto...');
      const { default: precioMaterialService } = await import('../../services/precioMaterialService');
      await precioMaterialService.createPrecioMaterial(product);
      await loadSavedProducts();
      showSuccess('Producto guardado');
    } catch (err) {
      console.error('Error al guardar producto:', err);
      showError('Error al guardar el producto');
      throw err;
    }
  };

  const handleRefreshPrices = async () => {
    try {
      showInfo('Actualizando precios...');
      await loadSavedProducts();
      showSuccess('Precios actualizados correctamente');
    } catch (error) {
      showError('Error al actualizar precios');
    }
  };

  // Guardar producto manual
  const handleSaveManualProduct = async () => {
    if (!newProduct.name.trim() || !newProduct.clave_ventdepot.trim()) {
      return showError('El nombre y la clave son obligatorios');
    }
    setSavingManual(true);
    try {
      const payload = {
        name: newProduct.name.trim(),
        clave_ventdepot: newProduct.clave_ventdepot.trim(),
        precio: newProduct.precio ? parseFloat(newProduct.precio) : null,
        dimensiones_base: newProduct.dimensiones_base || null,
        dimensiones_altura: newProduct.dimensiones_altura || null,
        dimensiones_fondo: newProduct.dimensiones_fondo || null,
        peso_kg: newProduct.peso_kg ? parseFloat(newProduct.peso_kg) : null,
        tiempo_fabricacion_dias: newProduct.tiempo_fabricacion_dias ? parseInt(newProduct.tiempo_fabricacion_dias, 10) : null,
        garantia_anos: newProduct.garantia_anos ? parseInt(newProduct.garantia_anos, 10) : null,
      };
      const { default: precioMaterialService } = await import('../../services/precioMaterialService');
      await precioMaterialService.createPrecioMaterial(payload);
      await loadSavedProducts();
      setNewProduct({ name: '', clave_ventdepot: '', precio: '', dimensiones_base: '', dimensiones_altura: '', dimensiones_fondo: '', peso_kg: '', tiempo_fabricacion_dias: '', garantia_anos: '' });
      setShowAddForm(false);
      showSuccess('Producto guardado correctamente');
    } catch (err) {
      console.error('Error al guardar producto manual:', err);
      showError('Error al guardar el producto');
    } finally {
      setSavingManual(false);
    }
  };

  const tabs = [
    { id: 'search', label: 'Buscar Precios', icon: 'Search' },
    { id: 'saved', label: 'Precios Guardados', icon: 'Database' },
  ];

  return (
    <div className="flex h-screen bg-background overflow-hidden">
      <Sidebar isCollapsed={sidebarCollapsed} onToggle={() => setSidebarCollapsed(!sidebarCollapsed)} />
      <div className={`flex-1 flex flex-col transition-all duration-300 ${sidebarCollapsed ? 'ml-16' : 'ml-60'}`}>
        <Header title="Gestión de Precios" onMenuToggle={() => setHeaderMenuOpen(!headerMenuOpen)} isMenuOpen={headerMenuOpen} />
        <div className="flex-1 overflow-y-auto p-6">
          <div className="max-w-7xl mx-auto space-y-6">
            <Breadcrumb items={[{ label: 'Negocio', path: '#' }, { label: 'Precios', path: '/precios' }]} />

            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div>
                <h1 className="text-3xl font-bold text-foreground">Gestión de Precios</h1>
                <p className="text-muted-foreground mt-1">Consulta y gestiona precios de productos</p>
              </div>
            </div>

            <div className="border-b border-border">
              <div className="flex space-x-1">
                {tabs.map((tab) => (
                  <button key={tab.id} onClick={() => setActiveTab(tab.id)} className={`flex items-center space-x-2 px-4 py-3 border-b-2 transition-colors ${activeTab === tab.id ? 'border-primary text-primary font-medium' : 'border-transparent text-muted-foreground hover:text-foreground hover:border-muted'}`}>
                    <Icon name={tab.icon} size={18} />
                    <span>{tab.label}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-6">
              {activeTab === 'search' && (
                <div className="space-y-6">
                  <div className="bg-card rounded-lg border border-border p-6">
                    <h2 className="text-xl font-semibold text-foreground mb-4">Buscar Productos</h2>
                    <p className="text-muted-foreground mb-4">Extrae precios de productos desde VentDepot.com</p>
                    <div className="flex gap-4">
                      <div className="flex-1">
                        <Input type="text" placeholder="Buscar productos específicos o dejar vacío para traer todos..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} onKeyPress={(e) => { if (e.key === 'Enter' && !scraping) handleScrape(); }} disabled={scraping} />
                      </div>
                      <Button onClick={handleScrape} disabled={scraping}>
                        {scraping ? (<><Icon name="Loader2" size={16} className="mr-2 animate-spin" />Extrayendo...</>) : (<><Icon name="Download" size={16} className="mr-2" />{searchQuery.trim() ? 'Buscar' : 'Traer Todos'}</>)}
                      </Button>
                    </div>
                  </div>

                  {scrapedProducts.length > 0 && (
                    <div className="bg-card rounded-lg border border-border p-6">
                      <h2 className="text-xl font-semibold text-foreground mb-4">Resultados ({scrapedProducts.length} productos)</h2>
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="border-b border-border bg-muted/50">
                              <th className="text-left p-3 font-semibold text-foreground whitespace-nowrap">Datos del Producto</th>
                              <th className="text-center p-3 font-semibold text-foreground whitespace-nowrap">Dimensiones de Empaque</th>
                              <th className="text-center p-3 font-semibold text-foreground whitespace-nowrap">Peso</th>
                              <th className="text-center p-3 font-semibold text-foreground whitespace-nowrap">Tiempo de Fabricación</th>
                              <th className="text-center p-3 font-semibold text-foreground whitespace-nowrap">Garantía</th>
                              <th className="text-center p-3 font-semibold text-foreground whitespace-nowrap">Clave VentDepot</th>
                              <th className="text-right p-3 font-semibold text-foreground whitespace-nowrap">Precio</th>
                            </tr>
                          </thead>
                          <tbody>
                            {scrapedProducts.map((product, index) => (
                              <tr key={index} className="border-b border-border hover:bg-muted/30 transition-colors">
                                <td className="p-3"><div className="max-w-md"><p className="font-medium text-foreground">{product.name}</p></div></td>
                                <td className="p-3 text-center"><div className="text-sm">{product.dimensiones_base && <p className="text-foreground">Base: {product.dimensiones_base} cm</p>}{product.dimensiones_altura && <p className="text-foreground">Altura: {product.dimensiones_altura} cm</p>}{product.dimensiones_fondo && <p className="text-foreground">Fondo: {product.dimensiones_fondo} cm</p>}</div></td>
                                <td className="p-3 text-center"><div className="text-sm">{product.peso_kg && <p className="text-foreground font-medium">{product.peso_kg} kg</p>}{product.peso_lb && <p className="text-muted-foreground">{product.peso_lb} lb</p>}</div></td>
                                <td className="p-3 text-center"><span className="text-foreground">{product.tiempo_fabricacion_dias ? `${product.tiempo_fabricacion_dias} días` : 'N/A'}</span></td>
                                <td className="p-3 text-center"><span className="text-foreground">{product.garantia_anos ? `${product.garantia_anos} año${product.garantia_anos > 1 ? 's' : ''}` : 'N/A'}</span></td>
                                <td className="p-3 text-center"><span className="text-sm font-mono text-muted-foreground">{product.clave_ventdepot || 'N/A'}</span></td>
                                <td className="p-3 text-right"><div><p className="text-xl font-bold text-primary">{product.precio ? `$${Number(product.precio).toLocaleString('es-MX')}` : 'N/A'}</p></div></td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}

                  {scrapedProducts.length === 0 && !scraping && (
                    <div className="bg-card rounded-lg border border-border p-12 text-center"><Icon name="Search" size={48} className="mx-auto text-muted-foreground mb-4" /><p className="text-muted-foreground">No hay resultados. Realiza una búsqueda para ver productos.</p></div>
                  )}
                </div>
              )}

              {activeTab === 'saved' && (
                <div className="space-y-6">
                  {/* Formulario para agregar producto manual */}
                  {showAddForm && (
                    <div className="bg-card rounded-lg border border-border p-6">
                      <div className="flex justify-between items-center mb-4">
                        <h2 className="text-xl font-semibold text-foreground">Agregar Producto Manual</h2>
                        <Button variant="ghost" size="icon" onClick={() => setShowAddForm(false)}><Icon name="X" size={18} /></Button>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-foreground mb-1">Nombre *</label>
                          <Input type="text" placeholder="Nombre del producto" value={newProduct.name} onChange={(e) => setNewProduct({ ...newProduct, name: e.target.value })} />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-foreground mb-1">Clave VentDepot *</label>
                          <Input type="text" placeholder="Ej: MXSPS-001" value={newProduct.clave_ventdepot} onChange={(e) => setNewProduct({ ...newProduct, clave_ventdepot: e.target.value })} />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-foreground mb-1">Precio</label>
                          <Input type="number" step="0.01" placeholder="0.00" value={newProduct.precio} onChange={(e) => setNewProduct({ ...newProduct, precio: e.target.value })} />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-foreground mb-1">Dimensión Base (cm)</label>
                          <Input type="text" placeholder="Ej: 100" value={newProduct.dimensiones_base} onChange={(e) => setNewProduct({ ...newProduct, dimensiones_base: e.target.value })} />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-foreground mb-1">Dimensión Altura (cm)</label>
                          <Input type="text" placeholder="Ej: 50" value={newProduct.dimensiones_altura} onChange={(e) => setNewProduct({ ...newProduct, dimensiones_altura: e.target.value })} />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-foreground mb-1">Dimensión Fondo (cm)</label>
                          <Input type="text" placeholder="Ej: 50" value={newProduct.dimensiones_fondo} onChange={(e) => setNewProduct({ ...newProduct, dimensiones_fondo: e.target.value })} />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-foreground mb-1">Peso (kg)</label>
                          <Input type="number" step="0.01" placeholder="0.00" value={newProduct.peso_kg} onChange={(e) => setNewProduct({ ...newProduct, peso_kg: e.target.value })} />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-foreground mb-1">Tiempo Fabricación (días)</label>
                          <Input type="number" placeholder="10" value={newProduct.tiempo_fabricacion_dias} onChange={(e) => setNewProduct({ ...newProduct, tiempo_fabricacion_dias: e.target.value })} />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-foreground mb-1">Garantía (años)</label>
                          <Input type="number" placeholder="1" value={newProduct.garantia_anos} onChange={(e) => setNewProduct({ ...newProduct, garantia_anos: e.target.value })} />
                        </div>
                      </div>
                      <div className="mt-4 flex justify-end gap-2">
                        <Button variant="outline" onClick={() => setShowAddForm(false)}>Cancelar</Button>
                        <Button onClick={handleSaveManualProduct} disabled={savingManual}>
                          {savingManual ? (<><Icon name="Loader2" size={16} className="mr-2 animate-spin" />Guardando...</>) : (<><Icon name="Save" size={16} className="mr-2" />Guardar Producto</>)}
                        </Button>
                      </div>
                    </div>
                  )}

                  <div className="bg-card rounded-lg border border-border p-6">
                    <div className="flex justify-between items-center mb-4">
                      <h2 className="text-xl font-semibold text-foreground">Productos Guardados ({savedProducts.length})</h2>
                      {!showAddForm && (
                        <Button onClick={() => setShowAddForm(true)}>
                          <Icon name="Plus" size={16} className="mr-2" />
                          Agregar Producto
                        </Button>
                      )}
                    </div>
                    {savedProducts.length > 0 ? (
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="border-b border-border bg-muted/50">
                              <th className="text-left p-3 font-semibold text-foreground whitespace-nowrap">Producto</th>
                              <th className="text-center p-3 font-semibold text-foreground whitespace-nowrap">Dimensiones</th>
                              <th className="text-center p-3 font-semibold text-foreground whitespace-nowrap">Peso</th>
                              <th className="text-center p-3 font-semibold text-foreground whitespace-nowrap">Tiempo Fab.</th>
                              <th className="text-center p-3 font-semibold text-foreground whitespace-nowrap">Garantía</th>
                              <th className="text-center p-3 font-semibold text-foreground whitespace-nowrap">Clave</th>
                              <th className="text-right p-3 font-semibold text-foreground whitespace-nowrap">Precio</th>
                              <th className="text-center p-3 font-semibold text-foreground whitespace-nowrap">Acciones</th>
                            </tr>
                          </thead>
                          <tbody>
                            {savedProducts.map((product) => (
                              <tr key={product.id} className="border-b border-border hover:bg-muted/30">
                                <td className="p-3"><div className="max-w-md"><p className="font-medium text-foreground">{product.name || 'N/A'}</p></div></td>
                                <td className="p-3 text-center text-xs"><div>{product.dimensiones_base ? (<span className="text-muted-foreground">{product.dimensiones_base}×{product.dimensiones_altura}×{product.dimensiones_fondo} cm</span>) : (<span className="text-muted-foreground">N/A</span>)}</div></td>
                                <td className="p-3 text-center text-sm">{product.peso_kg ? `${product.peso_kg} kg` : 'N/A'}</td>
                                <td className="p-3 text-center text-sm">{product.tiempo_fabricacion_dias ? `${product.tiempo_fabricacion_dias} días` : 'N/A'}</td>
                                <td className="p-3 text-center text-sm">{product.garantia_anos ? `${product.garantia_anos} año${product.garantia_anos > 1 ? 's' : ''}` : 'N/A'}</td>
                                <td className="p-3 text-center"><span className="text-xs font-mono text-muted-foreground">{product.clave_ventdepot || 'N/A'}</span></td>
                                <td className="p-3 text-right"><div><p className="font-bold text-primary">{product.precio ? `$${Number(product.precio).toLocaleString('es-MX')}` : 'N/A'}</p></div></td>
                                <td className="p-3 text-center"><Button variant="ghost" size="icon" title="Eliminar" onClick={() => openDeleteModal(product.id, product.name)} className="text-destructive hover:text-destructive"><Icon name="Trash2" size={16} /></Button></td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    ) : (
                      <div className="text-center py-12"><Icon name="Database" size={48} className="mx-auto text-muted-foreground mb-4" /><p className="text-muted-foreground">No hay productos guardados en la base de datos</p></div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
      {/* Modal de confirmación de eliminación */}
      {deleteModal.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="fixed inset-0 bg-black/50" onClick={closeDeleteModal}></div>
          <div className="relative bg-card rounded-lg shadow-xl max-w-md w-full mx-4 p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="flex-shrink-0 w-10 h-10 rounded-full bg-destructive/10 flex items-center justify-center">
                <Icon name="AlertTriangle" size={20} className="text-destructive" />
              </div>
              <h3 className="text-lg font-semibold text-foreground">Confirmar eliminacion</h3>
            </div>
            <p className="text-muted-foreground mb-6">
              Esta accion eliminara permanentemente el producto <strong className="text-foreground">{deleteModal.productName}</strong>. Esta accion no se puede deshacer.
            </p>
            <div className="flex justify-end gap-3">
              <Button variant="outline" onClick={closeDeleteModal}>
                Cancelar
              </Button>
              <Button variant="destructive" onClick={confirmDeleteProduct}>
                Eliminar
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PriceManagement;
