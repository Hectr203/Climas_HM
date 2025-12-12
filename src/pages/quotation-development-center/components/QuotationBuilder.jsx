import React, { useState, useEffect } from 'react';
import useQuotation from '../../../hooks/useQuotation';
import usePagosProgramados from '../../../hooks/usePagosProgramados';
import Icon from '../../../components/AppIcon';
import Button from '../../../components/ui/Button';
import Input from '../../../components/ui/Input';
import { useNotification } from '../../../context/NotificationContext';

const QuotationBuilder = ({ cotizacion, onUpdate, onAddRevision }) => {
  const { crearConstructor, getConstructorByCotizacionId } = useQuotation();
  const { 
    crearPagosProgramados, 
    obtenerPagosProgramadosPorId,
    obtenerPagosPorCotizacion,
    actualizarPagosProgramados,
    loading: pagosProgramadosLoading 
  } = usePagosProgramados();
  const notification = useNotification();
  const [constructorId, setConstructorId] = useState(null);
  const [existingPaymentPlan, setExistingPaymentPlan] = useState(null);
  const [isEditingPayments, setIsEditingPayments] = useState(false);
  const [paymentErrors, setPaymentErrors] = useState({});
          const [formData, setFormData] = useState({
            scope: cotizacion?.quotationData?.scope || '',
            assumptions: cotizacion?.quotationData?.assumptions || [],
            timeline: cotizacion?.quotationData?.timeline || '',
            conditions: cotizacion?.quotationData?.conditions || '',
            warranty: cotizacion?.quotationData?.warranty || '',
            totalAmount: cotizacion?.quotationData?.totalAmount || 0,
            validity: cotizacion?.quotationData?.validity || '30 días',
            discountPercentage: cotizacion?.quotationData?.discountPercentage || 0
          });
          const [loading, setLoading] = useState(false);
          const [error, setError] = useState('');
          // Cargar datos del constructor existente si hay
          useEffect(() => {
            async function fetchConstructor() {
              // Limpiar el formulario al cambiar de cotización
              setFormData({
                scope: '',
                assumptions: [],
                timeline: '',
                conditions: '',
                warranty: '',
                totalAmount: 0,
                validity: '30 días',
                discountPercentage: 0
              });
              if (!cotizacion?.id) return;
              setLoading(true);
              setError('');
              try {
                const existing = await getConstructorByCotizacionId(cotizacion.id);
                // Solo mostramos en consola si existe
                if (existing) {
                  // console.log eliminado
                  setConstructorId(existing.id); // Guardar ID del constructor
                  setFormData({
                    scope: existing.alcance || '',
                    assumptions: existing.supuestos || [],
                    timeline: existing.tiempo_ejecucion || '',
                    conditions: existing.condiciones_pago || '',
                    warranty: existing.garantia || '',
                    totalAmount: existing.monto_total || 0,
                    validity: existing.vigencia || '30 días',
                    discountPercentage: existing.porcentaje_descuento || 0
                  });
                  
                  // Verificar si existe un plan de pagos programados
                  checkExistingPaymentPlan(existing.id);
                } else {
                  setFormData({
                    scope: cotizacion?.quotationData?.scope || '',
                    assumptions: cotizacion?.quotationData?.assumptions || [],
                    timeline: cotizacion?.quotationData?.timeline || '',
                    conditions: cotizacion?.quotationData?.conditions || '',
                    warranty: cotizacion?.quotationData?.warranty || '',
                    totalAmount: cotizacion?.quotationData?.totalAmount || 0,
                    validity: cotizacion?.quotationData?.validity || '30 días',
                    discountPercentage: cotizacion?.quotationData?.discountPercentage || 0
                  });
                }
              } catch (err) {
                // Solo mostrar error si NO es 404 (constructor no existe aún es normal)
                if (err?.response?.status !== 404 && err?.message !== 'Request failed with status code 404') {
                  console.error('Error al cargar constructor:', err);
                  setError('Error al cargar constructor');
                }
                // Si es 404, usar datos por defecto de cotizacion
                setFormData({
                  scope: cotizacion?.quotationData?.scope || '',
                  assumptions: cotizacion?.quotationData?.assumptions || [],
                  timeline: cotizacion?.quotationData?.timeline || '',
                  conditions: cotizacion?.quotationData?.conditions || '',
                  warranty: cotizacion?.quotationData?.warranty || '',
                  totalAmount: cotizacion?.quotationData?.totalAmount || 0,
                  validity: cotizacion?.quotationData?.validity || '30 días',
                  discountPercentage: cotizacion?.quotationData?.discountPercentage || 0
                });
              } finally {
                setLoading(false);
              }
            }
            fetchConstructor();
          }, [cotizacion?.id]);

          const [newAssumption, setNewAssumption] = useState('');
          const [hasChanges, setHasChanges] = useState(false);
          const [showDiscountModal, setShowDiscountModal] = useState(false);
          const [tempDiscountPercentage, setTempDiscountPercentage] = useState(0);
          const [showPaymentModal, setShowPaymentModal] = useState(false);
          const [paymentConfig, setPaymentConfig] = useState({
            startDate: '',
            intervalDays: 30,
            numberOfPayments: 5
          });

          const handleInputChange = (field, value) => {
            setFormData(prev => ({ ...prev, [field]: value }));
            setHasChanges(true);
          };

          const addAssumption = () => {
            if (!newAssumption?.trim()) return;
            const newAssumptions = [...(formData?.assumptions || []), newAssumption];
            setFormData(prev => ({ ...prev, assumptions: newAssumptions }));
            setNewAssumption('');
            setHasChanges(true);
          };

          const removeAssumption = (index) => {
            const newAssumptions = formData?.assumptions?.filter((_, i) => i !== index);
            setFormData(prev => ({ ...prev, assumptions: newAssumptions }));
            setHasChanges(true);
          };

          // Funciones para manejar descuento
          const calculateDiscountedTotal = () => {
            const baseAmount = formData?.totalAmount || 0;
            const discount = (baseAmount * (formData?.discountPercentage || 0)) / 100;
            return baseAmount - discount;
          };

          const calculateDiscountAmount = () => {
            const baseAmount = formData?.totalAmount || 0;
            return (baseAmount * (formData?.discountPercentage || 0)) / 100;
          };

          const handleDiscountModal = () => {
            setTempDiscountPercentage(formData?.discountPercentage || 0);
            setShowDiscountModal(true);
          };

          const applyDiscount = () => {
            if (tempDiscountPercentage >= 0 && tempDiscountPercentage <= 100) {
              handleInputChange('discountPercentage', tempDiscountPercentage);
              setShowDiscountModal(false);
            }
          };

          const removeDiscount = () => {
            handleInputChange('discountPercentage', 0);
            setShowDiscountModal(false);
          };

          // Verificar si existe un plan de pagos programados
          const checkExistingPaymentPlan = async (constructorIdParam) => {
            if (!constructorIdParam || !cotizacion?.id) return;
            
            try {
              const existingPlan = await obtenerPagosPorCotizacion(cotizacion.id);
              
              if (existingPlan) {
                // Si el backend devuelve un objeto directamente (cuando hay solo uno)
                if (existingPlan.id) {
                  setExistingPaymentPlan(existingPlan);
                }
                // Si el backend devuelve un array
                else if (Array.isArray(existingPlan) && existingPlan.length > 0) {
                  setExistingPaymentPlan(existingPlan[0]);
                }
                // Si no hay pagos programados
                else {
                  setExistingPaymentPlan(null);
                }
              } else {
                setExistingPaymentPlan(null);
              }
            } catch (error) {
              console.error('Error al verificar plan de pagos existente:', error);
              setExistingPaymentPlan(null);
            }
          };

          // Funciones para manejar pagos programados
          const handlePaymentModal = async () => {
            setShowPaymentModal(true);
            
            // Intentar cargar plan de pagos existente
            if (constructorId) {
              try {
                // Buscar plan existente por cotización
                const existingPlan = await obtenerPagosPorCotizacion(cotizacion?.id);
                
                let plan = null;
                
                // Manejar diferentes formatos de respuesta del backend
                if (existingPlan) {
                  if (existingPlan.id) {
                    // El backend devolvió un objeto directamente
                    plan = existingPlan;
                  } else if (Array.isArray(existingPlan) && existingPlan.length > 0) {
                    // El backend devolvió un array
                    plan = existingPlan[0];
                  }
                }
                
                if (plan) {
                  setExistingPaymentPlan(plan);
                  setIsEditingPayments(true);
                  
                  // Cargar datos en el formulario
                  setPaymentConfig({
                    startDate: plan.fechaInicioPagos ? new Date(plan.fechaInicioPagos).toISOString().split('T')[0] : '',
                    intervalDays: plan.intervaloDias || 30,
                    numberOfPayments: plan.numeroPagos || 5
                  });
                } else {
                  // No hay plan existente, modo creación
                  setExistingPaymentPlan(null);
                  setIsEditingPayments(false);
                  // Resetear formulario a valores por defecto
                  setPaymentConfig({
                    startDate: '',
                    intervalDays: 30,
                    numberOfPayments: 5
                  });
                }
              } catch (error) {
                console.error('Error al cargar plan existente:', error);
                setExistingPaymentPlan(null);
                setIsEditingPayments(false);
              }
            }
          };

          const calculatePaymentSchedule = () => {
            const payments = [];
            const totalAmount = calculateDiscountedTotal();
            const paymentAmount = totalAmount / paymentConfig.numberOfPayments;
            
            for (let i = 0; i < paymentConfig.numberOfPayments; i++) {
              const paymentDate = new Date(paymentConfig.startDate);
              paymentDate.setDate(paymentDate.getDate() + (i * paymentConfig.intervalDays));
              
              payments.push({
                paymentNumber: i + 1,
                date: paymentDate.toLocaleDateString('es-MX'),
                amount: paymentAmount
              });
            }
            
            return payments;
          };

          const savePaymentConfiguration = async () => {
            try {
              // Validar formulario
              if (!validatePaymentConfig()) {
                return;
              }
              
              // Validar que tenemos todos los datos necesarios
              if (!constructorId || !cotizacion?.id) {
                notification?.showError('Faltan datos necesarios para guardar la configuración');
                return;
              }

              // Preparar datos según el formato del backend
              const pagosProgramadosData = {
                idCotizacion: cotizacion.id,
                idConstructor: constructorId,
                fechaInicioPagos: paymentConfig.startDate,
                intervaloDias: paymentConfig.intervalDays,
                numeroPagos: paymentConfig.numberOfPayments,
                montoTotal: calculateDiscountedTotal()
              };

              if (isEditingPayments && existingPaymentPlan) {
                // Actualizar plan existente usando el ID de la cotización
                await actualizarPagosProgramados(cotizacion.id, pagosProgramadosData);
              } else {
                // Crear nuevo plan
                await crearPagosProgramados(pagosProgramadosData);
              }
              
              // Cerrar modal si todo salió bien
              closePaymentModal();
              
            } catch (error) {
              console.error('Error al guardar configuración de pagos:', error);
              // El error ya se muestra a través del hook usePagosProgramados
            }
          };

          // Función para validar el modal de pagos
          const validatePaymentConfig = () => {
            const errors = {};
            
            if (!paymentConfig.startDate) {
              errors.startDate = 'La fecha de inicio es requerida';
            } else {
              const selectedDate = new Date(paymentConfig.startDate);
              const today = new Date();
              today.setHours(0, 0, 0, 0);
              if (selectedDate < today) {
                errors.startDate = 'La fecha debe ser hoy o posterior';
              }
            }
            
            if (!paymentConfig.intervalDays || paymentConfig.intervalDays < 1) {
              errors.intervalDays = 'El intervalo debe ser mayor a 0 días';
            } else if (paymentConfig.intervalDays > 365) {
              errors.intervalDays = 'El intervalo no puede ser mayor a 365 días';
            }
            
            if (!paymentConfig.numberOfPayments || paymentConfig.numberOfPayments < 1) {
              errors.numberOfPayments = 'Debe tener al menos 1 pago';
            } else if (paymentConfig.numberOfPayments > 12) {
              errors.numberOfPayments = 'No puede tener más de 12 pagos';
            }
            
            setPaymentErrors(errors);
            return Object.keys(errors).length === 0;
          };

          // Función para cerrar modal y limpiar estados
          const closePaymentModal = () => {
            setShowPaymentModal(false);
            setExistingPaymentPlan(null);
            setIsEditingPayments(false);
            setPaymentErrors({});
            // Resetear formulario
            setPaymentConfig({
              startDate: '',
              intervalDays: 30,
              numberOfPayments: 5
            });
          };

  const handleSave = async () => {
    // Validar campos requeridos
    const requiredFields = {
      'Alcance': formData?.scope,
      'Condiciones de pago': formData?.conditions,
      'Garantía': formData?.warranty,
      'Tiempo de ejecución': formData?.timeline,
      'Vigencia': formData?.validity
    };
    
    const missingFields = Object.entries(requiredFields)
      .filter(([name, value]) => !value || value.toString().trim() === '')
      .map(([name]) => name);
    
    if (missingFields.length > 0) {
      notification?.showError(`Faltan campos por rellenar: ${missingFields.join(', ')}`);
      return;
    }
    
    onUpdate?.({ quotationData: formData });
    const payload = {
      Constructor: {
        cotizacionId: cotizacion?.id,
        Folio: cotizacion?.folio || cotizacion?.id,
        alcance: formData?.scope,
        condiciones_pago: formData?.conditions,
        supuestos: formData?.assumptions,
        garantia: formData?.warranty,
        monto_total: formData?.totalAmount,
        tiempo_ejecucion: formData?.timeline,
        vigencia: formData?.validity,
        porcentaje_descuento: formData?.discountPercentage
      }
    };
    try {
      await crearConstructor(payload);
      notification.showSuccess('Constructor guardado exitosamente');
    } catch (err) {
      // Solo mostrar error genérico si no es por campos faltantes
      console.error('Error al guardar:', err);
      notification.showError('Error al guardar el constructor');
    }
    setHasChanges(false);
  };

          const handleCreateRevision = () => {
            const revision = {
              changes: "Actualización de alcance y condiciones",
              author: cotizacion?.assignedTo || "Usuario Actual"
            };
            onAddRevision?.(revision);
            setHasChanges(false);
          };

          const handleSaveConstructor = async () => {
            // Validar campos requeridos
            const requiredFields = {
              'Alcance': formData?.scope,
              'Condiciones de pago': formData?.conditions,
              'Garantía': formData?.warranty,
              'Tiempo de ejecución': formData?.timeline,
              'Vigencia': formData?.validity
            };
            
            const missingFields = Object.entries(requiredFields)
              .filter(([name, value]) => !value || value.toString().trim() === '')
              .map(([name]) => name);
            
            if (missingFields.length > 0) {
              notification?.showError(`Faltan campos por rellenar: ${missingFields.join(', ')}`);
              return;
            }
            
            const payload = {
              Constructor: {
                cotizacionId: cotizacion?.id,
                Folio: cotizacion?.id,
                alcance: formData?.scope,
                condiciones_pago: formData?.conditions,
                supuestos: formData?.assumptions,
                garantia: formData?.warranty,
                monto_total: formData?.totalAmount,
                tiempo_ejecucion: formData?.timeline,
                vigencia: formData?.validity,
                porcentaje_descuento: formData?.discountPercentage
              }
            };
            try {
              const res = await crearConstructor(payload);
              // console.log eliminado
              notification?.showSuccess('Constructor guardado exitosamente');
            } catch (err) {
              notification?.showError('Error al guardar el constructor');
            }
          };

          return (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xl font-semibold">{cotizacion?.projectName}</h3>
                  <p className="text-muted-foreground">{cotizacion?.clientName} - {cotizacion?.folio}</p>
                </div>
                <div className="flex items-center space-x-2">
                  {hasChanges && (
                    <span className="text-xs text-amber-600 bg-amber-50 px-2 py-1 rounded">
                      Cambios sin guardar
                    </span>
                  )}
                  {/* Botón gris superior para guardar */}
                  <button
                    className="text-muted-foreground flex items-center space-x-1"
                    style={{ background: 'none', border: 'none', cursor: hasChanges ? 'pointer' : 'not-allowed', fontSize: '16px', padding: 0 }}
                    onClick={hasChanges ? handleSave : undefined}
                    disabled={!hasChanges}
                  >
                    <Icon name="Save" size={20} />
                    <span>Guardar</span>
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Left Column */}
                <div className="space-y-4">
                  {/* Scope Definition */}
                  <div>
                    <label className="text-sm font-medium mb-2 block">Definición de Alcance</label>
                    <textarea
                      value={formData?.scope}
                      onChange={(e) => handleInputChange('scope', e?.target?.value)}
                      placeholder="Descripción detallada del alcance del proyecto..."
                      rows={4}
                      className="w-full px-3 py-2 text-sm border border-border rounded-md bg-background resize-none"
                    />
                  </div>

                  {/* Assumptions */}
                  <div>
                    <label className="text-sm font-medium mb-2 block">Supuestos del Proyecto</label>
                    <div className="space-y-2">
                      {formData?.assumptions?.map((assumption, index) => (
                        <div key={index} className="flex items-start space-x-2 p-2 bg-muted/30 rounded">
                          <Icon name="Check" size={14} className="text-green-600 mt-0.5" />
                          <span className="flex-1 text-sm">{assumption}</span>
                          <button
                            onClick={() => removeAssumption(index)}
                            className="text-red-600 hover:text-red-800"
                          >
                            <Icon name="X" size={14} />
                          </button>
                        </div>
                      ))}
                      <div className="flex space-x-2">
                        <Input
                          value={newAssumption}
                          onChange={(e) => setNewAssumption(e?.target?.value)}
                          placeholder="Agregar supuesto..."
                          className="flex-1"
                          onKeyPress={(e) => e?.key === 'Enter' && addAssumption()}
                        />
                        <Button
                          size="sm"
                          onClick={addAssumption}
                          iconName="Plus"
                          disabled={!newAssumption?.trim()}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Timeline and Validity */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium mb-2 block">Tiempo de Ejecución</label>
                      <Input
                        value={formData?.timeline}
                        onChange={(e) => handleInputChange('timeline', e?.target?.value)}
                        placeholder="ej: 16 semanas"
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium mb-2 block">Vigencia</label>
                      <Input
                        value={formData?.validity}
                        onChange={(e) => handleInputChange('validity', e?.target?.value)}
                        placeholder="30 días"
                      />
                    </div>
                  </div>

                  {/* Quick Actions - Positioned after Timeline and Validity */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Plantillas Rápidas</label>
                    <div className="grid grid-cols-2 gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleInputChange('conditions', '50% anticipo, 50% contra entrega')}
                        className="text-xs"
                      >
                        Pago 50/50
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleInputChange('warranty', '24 meses equipos, 12 meses instalación')}
                        className="text-xs"
                      >
                        Garantía Estándar
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleInputChange('validity', '45 días')}
                        className="text-xs"
                      >
                        Vigencia 45 días
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => addAssumption('Acceso libre durante horario laboral')}
                        className="text-xs"
                      >
                        Acceso Estándar
                      </Button>
                    </div>
                  </div>
                </div>

                {/* Right Column */}
                <div className="space-y-4">
                  {/* Payment Conditions */}
                  <div>
                    <label className="text-sm font-medium mb-2 block">Condiciones de Pago</label>
                    <textarea
                      value={formData?.conditions}
                      onChange={(e) => handleInputChange('conditions', e?.target?.value)}
                      placeholder="ej: 50% anticipo, 25% avance 50%, 25% finalización"
                      rows={3}
                      className="w-full px-3 py-2 text-sm border border-border rounded-md bg-background resize-none"
                    />
                  </div>

                  {/* Warranty */}
                  <div>
                    <label className="text-sm font-medium mb-2 block">Garantía</label>
                    <Input
                      value={formData?.warranty}
                      onChange={(e) => handleInputChange('warranty', e?.target?.value)}
                      placeholder="ej: 24 meses en equipos, 12 meses en instalación"
                    />
                  </div>

                  {/* Total Amount */}
                  <div>
                    <label className="text-sm font-medium mb-2 block">Monto Total (MXN)</label>
                    <Input
                      type="number"
                      value={formData?.totalAmount}
                      onChange={(e) => handleInputChange('totalAmount', parseFloat(e?.target?.value) || 0)}
                      placeholder="0.00"
                    />
                    {formData?.totalAmount > 0 && (
                      <div className="text-sm mt-1 space-y-1">
                        <p className="text-muted-foreground">
                          ${formData?.totalAmount?.toLocaleString('es-MX')} MXN
                        </p>
                        {formData?.discountPercentage > 0 && (
                          <>
                            <p className="text-orange-600">
                              Descuento ({formData?.discountPercentage}%): -${calculateDiscountAmount()?.toLocaleString('es-MX')} MXN
                            </p>
                            <p className="text-green-600 font-medium">
                              Total final: ${calculateDiscountedTotal()?.toLocaleString('es-MX')} MXN
                            </p>
                          </>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Discount Section */}
                  <div>
                    <label className="text-sm font-medium mb-2 block">Descuento</label>
                    <div className="flex items-center space-x-2">
                      <Button
                        variant={formData?.discountPercentage > 0 ? "default" : "outline"}
                        size="sm"
                        onClick={handleDiscountModal}
                        iconName={formData?.discountPercentage > 0 ? "Edit" : "Percent"}
                        iconPosition="left"
                        className={formData?.discountPercentage > 0 
                          ? "bg-orange-500 hover:bg-orange-600 text-white shadow-md border-orange-600" 
                          : "border-blue-500 text-blue-600 hover:bg-blue-50 hover:text-blue-700"}
                      >
                        {formData?.discountPercentage > 0 ? `${formData?.discountPercentage}% Aplicado` : 'Aplicar Descuento'}
                      </Button>
                      {formData?.discountPercentage > 0 && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={removeDiscount}
                          iconName="X"
                          className="text-red-600 hover:text-red-800"
                        >
                          Quitar
                        </Button>
                      )}
                    </div>
                  </div>

                  {/* Payment Configuration Section */}
                  <div>
                    <label className="text-sm font-medium mb-2 block">Pagos Programados</label>
                    <div className="flex items-center space-x-2">
                      <Button
                        variant={existingPaymentPlan ? "default" : "outline"}
                        size="sm"
                        onClick={handlePaymentModal}
                        iconName={existingPaymentPlan ? "Edit" : "Calendar"}
                        iconPosition="left"
                        className={existingPaymentPlan 
                          ? "bg-green-500 hover:bg-green-600 text-white shadow-md border-green-600" 
                          : "border-green-500 text-green-600 hover:bg-green-50 hover:text-green-700"}
                      >
                        {existingPaymentPlan ? 'Editar Pagos Programados' : 'Configurar Pagos Programados'}
                      </Button>
                      {hasChanges && (
                        <span className="text-xs text-amber-600 bg-amber-50 px-2 py-1 rounded">
                          Cambios sin guardar
                        </span>
                      )}
                    </div>
                  </div>


                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-between pt-6 border-t border-border">
                <div className="flex items-center space-x-2">
                  <Icon name="Info" size={16} className="text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">
                     Última actualización: {cotizacion?.lastModified}
                  </span>
                </div>
                <div className="flex space-x-2">
                  {/* Botón comentado: Crear Revisión (se dejó comentado para posible uso futuro)
                  <Button
                    variant="outline"
                    onClick={handleCreateRevision}
                    iconName="GitBranch"
                    iconPosition="left"
                  >
                    Crear Revisión
                  </Button>
                  */}

                  {/* Botón comentado: Enviar a Revisión (se dejó comentado para posible uso futuro)
                  <Button
                    // console.log eliminado
                    iconName="Users"
                    iconPosition="left"
                  >
                    Enviar a Revisión
                  </Button>
                  */}
                  {/* Eliminar el botón azul de Guardar aquí */}
                </div>
              </div>

              {/* Modal de Descuento */}
              {showDiscountModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                  <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
                    <h3 className="text-lg font-semibold mb-4">Aplicar Descuento</h3>
                    
                    <div className="space-y-4">
                      <div>
                        <label className="text-sm font-medium mb-2 block">Porcentaje de Descuento (%)</label>
                        <Input
                          type="number"
                          value={tempDiscountPercentage}
                          onChange={(e) => setTempDiscountPercentage(Math.min(100, Math.max(0, parseFloat(e.target.value) || 0)))}
                          placeholder="0"
                          min="0"
                          max="100"
                          step="0.1"
                        />
                      </div>
                      
                      {formData?.totalAmount > 0 && tempDiscountPercentage > 0 && (
                        <div className="bg-gray-50 p-3 rounded space-y-1 text-sm">
                          <div className="flex justify-between">
                            <span>Subtotal:</span>
                            <span>${formData?.totalAmount?.toLocaleString('es-MX')}</span>
                          </div>
                          <div className="flex justify-between text-orange-600">
                            <span>Descuento ({tempDiscountPercentage}%):</span>
                            <span>-${((formData?.totalAmount * tempDiscountPercentage) / 100)?.toLocaleString('es-MX')}</span>
                          </div>
                          <div className="flex justify-between font-medium text-green-600 border-t pt-1">
                            <span>Total:</span>
                            <span>${(formData?.totalAmount - (formData?.totalAmount * tempDiscountPercentage) / 100)?.toLocaleString('es-MX')}</span>
                          </div>
                        </div>
                      )}
                    </div>
                    
                    <div className="flex justify-end space-x-2 mt-6">
                      <Button
                        variant="outline"
                        onClick={() => setShowDiscountModal(false)}
                      >
                        Cancelar
                      </Button>
                      <Button
                        onClick={applyDiscount}
                        disabled={tempDiscountPercentage < 0 || tempDiscountPercentage > 100}
                      >
                        Aplicar
                      </Button>
                    </div>
                  </div>
                </div>
              )}

              {/* Modal de Pagos Programados */}
              {showPaymentModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                  <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-lg font-semibold">
                        {isEditingPayments ? 'Editar Pagos Programados' : 'Configurar Pagos Programados'}
                      </h3>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={closePaymentModal}
                        iconName="X"
                        className="text-gray-400 hover:text-gray-600"
                      />
                    </div>
                    
                    <div className="space-y-4">
                      <div>
                        <label className="text-sm font-medium mb-2 block">Fecha de Inicio de Pagos *</label>
                        <Input
                          type="date"
                          value={paymentConfig.startDate}
                          onChange={(e) => {
                            setPaymentConfig(prev => ({ ...prev, startDate: e.target.value }));
                            if (paymentErrors.startDate) {
                              setPaymentErrors(prev => ({ ...prev, startDate: undefined }));
                            }
                          }}
                          className={paymentErrors.startDate ? 'border-red-500' : ''}
                        />
                        {paymentErrors.startDate && (
                          <p className="text-red-500 text-xs mt-1">{paymentErrors.startDate}</p>
                        )}
                      </div>
                      
                      <div>
                        <label className="text-sm font-medium mb-2 block">Intervalo entre Pagos (días) *</label>
                        <Input
                          type="number"
                          value={paymentConfig.intervalDays}
                          onChange={(e) => {
                            const value = e.target.value === '' ? '' : parseInt(e.target.value) || 1;
                            setPaymentConfig(prev => ({ ...prev, intervalDays: value }));
                            if (paymentErrors.intervalDays) {
                              setPaymentErrors(prev => ({ ...prev, intervalDays: undefined }));
                            }
                          }}
                          min="1"
                          max="365"
                          placeholder="30"
                          className={paymentErrors.intervalDays ? 'border-red-500' : ''}
                        />
                        {paymentErrors.intervalDays && (
                          <p className="text-red-500 text-xs mt-1">{paymentErrors.intervalDays}</p>
                        )}
                      </div>
                      
                      <div>
                        <label className="text-sm font-medium mb-2 block">Número de Pagos *</label>
                        <Input
                          type="number"
                          value={paymentConfig.numberOfPayments}
                          onChange={(e) => {
                            const value = e.target.value === '' ? '' : parseInt(e.target.value) || 1;
                            setPaymentConfig(prev => ({ ...prev, numberOfPayments: value }));
                            if (paymentErrors.numberOfPayments) {
                              setPaymentErrors(prev => ({ ...prev, numberOfPayments: undefined }));
                            }
                          }}
                          min="1"
                          max="12"
                          placeholder="5"
                          className={paymentErrors.numberOfPayments ? 'border-red-500' : ''}
                        />
                        {paymentErrors.numberOfPayments && (
                          <p className="text-red-500 text-xs mt-1">{paymentErrors.numberOfPayments}</p>
                        )}
                      </div>
                      
                      {paymentConfig.startDate && paymentConfig.numberOfPayments > 0 && (
                        <div className="mt-4">
                          <label className="text-sm font-medium mb-2 block">Vista Previa de Pagos</label>
                          <div className="bg-gray-50 rounded-lg p-3 max-h-48 overflow-y-auto">
                            <div className="space-y-2">
                              <div className="flex justify-between items-center text-xs font-medium text-gray-600 border-b pb-2">
                                <span>Pago #</span>
                                <span>Fecha de Vencimiento</span>
                                <span>Monto</span>
                              </div>
                              {calculatePaymentSchedule().map((payment, index) => (
                                <div key={index} className="flex justify-between items-center text-sm">
                                  <span>Pago {payment.paymentNumber}</span>
                                  <span>{payment.date}</span>
                                  <span>${payment.amount?.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} MXN</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                    
                    <div className="flex justify-end space-x-2 mt-6">
                      <Button
                        variant="outline"
                        onClick={closePaymentModal}
                      >
                        Cancelar
                      </Button>
                      <Button
                        onClick={savePaymentConfiguration}
                        disabled={Object.keys(paymentErrors).length > 0 || !paymentConfig.startDate || !paymentConfig.intervalDays || !paymentConfig.numberOfPayments || pagosProgramadosLoading}
                        className="bg-blue-600 hover:bg-blue-700 text-white"
                        iconName={pagosProgramadosLoading ? "Loader2" : undefined}
                        iconPosition="left"
                      >
                        {pagosProgramadosLoading ? 'Guardando...' : isEditingPayments ? 'Actualizar Configuración' : 'Guardar Configuración'}
                      </Button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        };

        export default QuotationBuilder;