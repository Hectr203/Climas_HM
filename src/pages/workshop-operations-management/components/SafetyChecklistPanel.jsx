import React, { useState, useEffect } from 'react';
        import Icon from '../../../components/AppIcon';
        import Button from '../../../components/ui/Button';
        import { Checkbox } from '../../../components/ui/Checkbox';

  const SafetyChecklistPanel = ({ workOrders, onSafetyComplete, selectedOrder: propSelectedOrder, onLocalMissingChange }) => {
          const [selectedOrder, setSelectedOrder] = useState(null);
          const [checklist, setChecklist] = useState({});
          const [missingPPE, setMissingPPE] = useState({});
          const [customMissing, setCustomMissing] = useState('');
          const [persistedState, setPersistedState] = useState(null);

          // localStorage key helper
          const storageKeyFor = (orderKey) => `wb_safety_check_${orderKey}`;

          const loadLocalState = (orderKey) => {
            try {
              if (!orderKey) return null;
              const raw = localStorage.getItem(storageKeyFor(orderKey));
              if (!raw) return null;
              return JSON.parse(raw);
            } catch (e) {
              return null;
            }
          };

          const saveLocalState = (orderKey, state) => {
            try {
              if (!orderKey) return;
              localStorage.setItem(storageKeyFor(orderKey), JSON.stringify(state || {}));
            } catch (e) {
            }
          };

          const safetyItems = [
            {
              id: 'ppe',
              title: 'Equipo de Protección Personal (EPP)',
              items: [
                'Casco de Seguridad',
                'Gafas de Protección',
                'Guantes de Trabajo',
                'Calzado de Seguridad',
                'Arnés de Seguridad',
                'Respirador N95',
                'Chaleco Reflectivo'
              ]
            },
            {
              id: 'tools',
              title: 'Herramientas y Equipos',
              items: [
                'Herramientas en buen estado',
                'Equipos calibrados',
                'Extensiones eléctricas revisadas',
                'Escaleras/andamios seguros',
                'Equipos de soldadura verificados'
              ]
            },
            {
              id: 'procedures',
              title: 'Procedimientos',
              items: [
                'Planos técnicos disponibles',
                'Instrucciones de trabajo claras',
                'Procedimientos de emergencia',
                'Contactos de emergencia visibles',
                'Permisos de trabajo actualizados'
              ]
            }
          ];

            // Mapping labels for missing-list inference (reusable)
            const PPE_LABEL_MAP = {
              cascoSeguridad: ['casco de seguridad','casco','casco seguridad'],
              gafasProteccion: ['gafas de protección','gafas de proteccion','gafas'],
              guantesTrabajo: ['guantes de trabajo','guantes'],
              calzadoSeguridad: ['calzado de seguridad','calzado'],
              arnesSeguridad: ['arnés de seguridad','arnes de seguridad','arnes','arnés'],
              respiradorN95: ['respirador n95','respirador','n95'],
              chalecoReflectivo: ['chaleco reflectivo','chaleco'],
              requiereEstudiosMedicosActualizados: ['estudios medicos actualizados','estudios médicos actualizados','estudios']
            };

            // Helper: read PPE boolean fields from order (accepts multiple shapes)
            const getPPEValue = (order, field) => {
              if (!order) return false;
              // 1) direct boolean fields (top-level)
              if (order[field] !== undefined) return !!order[field];
              // 2) nested safety object
              if (order.safetyChecklist && order.safetyChecklist[field] !== undefined) return !!order.safetyChecklist[field];
              // 3) raw payload
              if (order.raw && order.raw[field] !== undefined) return !!order.raw[field];

              // 4) try alternate key forms (snake_case)
              const snake = field.replace(/([A-Z])/g, '_$1').toLowerCase();
              if (order[snake] !== undefined) return !!order[snake];
              if (order.raw && order.raw[snake] !== undefined) return !!order.raw[snake];

              // 5) if the order stores a list of missing items (safetyChecklistMissing), derive boolean
              const missingList = Array.isArray(order.safetyChecklistMissing)
                ? order.safetyChecklistMissing
                : (Array.isArray(order.raw && order.raw.safetyChecklistMissing) ? order.raw.safetyChecklistMissing : null);
              if (Array.isArray(missingList)) {
                const possibles = PPE_LABEL_MAP[field] || [field];
                const lowerMissing = missingList.map(m => String(m || '').toLowerCase());
                // if any possible label appears in missingList, then the item is missing => return false
                for (const p of possibles) {
                  if (lowerMissing.some(mm => mm.includes(p))) return false;
                }
                // not listed as missing -> assume present
                return true;
              }
              return false;
            };

            const getRecordedMissing = (order) => {
              if (!order) return [];
              if (Array.isArray(order.safetyChecklistMissing)) return order.safetyChecklistMissing;
              if (order.raw && Array.isArray(order.raw.safetyChecklistMissing)) return order.raw.safetyChecklistMissing;
              return [];
            };

            const PPE_FIELDS = [
              ['cascoSeguridad','Casco'],
              ['gafasProteccion','Gafas'],
              ['guantesTrabajo','Guantes'],
              ['calzadoSeguridad','Calzado'],
              ['arnesSeguridad','Arnés'],
              ['respiradorN95','Respirador'],
              ['chalecoReflectivo','Chaleco'],
              ['requiereEstudiosMedicosActualizados','Estudios']
            ];

          const handleOrderSelect = (order) => {
            setSelectedOrder(order);
            // Initialize checklist with false values
            const initialChecklist = {};
            
            safetyItems?.forEach(section => {
              section?.items?.forEach((item, index) => {
                const key = `${section?.id}-${index}`;
                initialChecklist[key] = false;
                
              });
            });
            // Merge with any persisted state for this order so marks are not lost
            const orderKey = order?.id || order?.ordenTrabajo || order?.folio || '';
            const saved = loadLocalState(orderKey) || {};
            const mergedChecklist = { ...initialChecklist, ...(saved.checklist || {}) };
            const mergedMissing = { ...(saved.missingPPE || {}) };
            setChecklist(mergedChecklist);
            setMissingPPE(mergedMissing);
            setPersistedState(saved);
          };

          // If a selected order is provided by the parent (board selection), initialize the panel with it
          useEffect(() => {
            if (!propSelectedOrder) return;
            
            // Only select if it's actually a different order
            const incomingId = propSelectedOrder?.id || propSelectedOrder?.ordenTrabajo || propSelectedOrder?.folio || '';
            const currentId = selectedOrder?.id || selectedOrder?.ordenTrabajo || selectedOrder?.folio || '';
            
            if (incomingId && incomingId !== currentId) {
              handleOrderSelect(propSelectedOrder);
            }
          }, [propSelectedOrder?.id, propSelectedOrder?.ordenTrabajo, propSelectedOrder?.folio]);

          const handleChecklistChange = (itemKey, checked) => {
            setChecklist(prev => ({
              ...prev,
              [itemKey]: checked
            }));
          };

          // Mark all items in a section as verified (only affects applicable items)
          const handleMarkAllVerified = (sectionId) => {
            if (!selectedOrder) return;
            const checklistUpdates = {};
            const missingUpdates = {};
            const section = safetyItems.find(s => s.id === sectionId);
            section?.items?.forEach((it, idx) => {
              const key = `${sectionId}-${idx}`;
              let applies = true;
              if (sectionId === 'ppe') {
                const field = PPE_FIELDS[idx]?.[0];
                applies = !!getPPEValue(selectedOrder, field);
              }
              if (applies) {
                checklistUpdates[key] = true;
                missingUpdates[key] = false;
              }
            });
            setChecklist(prev => ({ ...prev, ...checklistUpdates }));
            setMissingPPE(prev => ({ ...prev, ...missingUpdates }));
          };

          const handleMissingToggle = (itemKey, checked) => {
            setMissingPPE(prev => ({ ...prev, [itemKey]: checked }));
            if (checked) {
              // Uncheck verification if marked missing
              setChecklist(prev => ({ ...prev, [itemKey]: false }));
            }
          };

          const handleAddCustomMissing = () => {
            if (!customMissing?.trim()) return;
            const key = `custom-${Date.now()}`;
            setMissingPPE(prev => ({ ...prev, [key]: true }));
            setChecklist(prev => ({ ...prev, [key]: false }));
            // store label alongside checklist for rendering
            setChecklist(prev => ({ ...prev, [key + '-label']: customMissing.trim() }));
            setCustomMissing('');
          };

          // Notify parent about local missing labels for the currently selected order
          // Use a ref to track the last notified value to prevent infinite loops
          const lastNotifiedRef = React.useRef({});
          
          useEffect(() => {
            try {
              if (!onLocalMissingChange) return;
              if (!selectedOrder) return;
              const orderKey = selectedOrder?.id || selectedOrder?.ordenTrabajo || selectedOrder?.folio || '';
              if (!orderKey) return;
              
              const localMissingLabels = Object.keys(missingPPE || {}).filter(k => !!missingPPE[k]).map(k => {
                if (k.startsWith('custom-')) return checklist?.[k + '-label'] || 'Otro';
                const parts = k.split('-');
                const sec = safetyItems.find(s => s.id === parts[0]);
                const idx = Number(parts[1]);
                return sec?.items?.[idx] || 'Otro';
              });
              
              const uniqueLabels = Array.from(new Set(localMissingLabels));
              const labelsKey = JSON.stringify(uniqueLabels);
              
              // Only notify if the value actually changed
              if (lastNotifiedRef.current[orderKey] !== labelsKey) {
                lastNotifiedRef.current[orderKey] = labelsKey;
                onLocalMissingChange(orderKey, uniqueLabels);
              }
            } catch (e) {
              // ignore
            }
          }, [missingPPE, selectedOrder, checklist]);

          const getCompletionPercentage = () => {
            // Only consider required items in the progress calculation.
            if (!selectedOrder) return 0;
            const requiredKeys = [];
            safetyItems?.forEach(section => {
              section?.items?.forEach((it, idx) => {
                const key = `${section?.id}-${idx}`;
                if (section?.id === 'ppe') {
                  const field = PPE_FIELDS[idx]?.[0];
                  if (getPPEValue(selectedOrder, field)) requiredKeys.push(key);
                } else {
                  requiredKeys.push(key);
                }
              });
            });
            const uniqueReq = Array.from(new Set(requiredKeys));
            if (uniqueReq.length === 0) return 0;
            const checkedItems = uniqueReq.filter(k => !!checklist?.[k]).length;
            const totalItems = uniqueReq.length;
            return totalItems > 0 ? Math.round((checkedItems / totalItems) * 100) : 0;
          };

          const isChecklistComplete = () => {
            if (!selectedOrder) return false;
            // Only required items must be checked
            const requiredKeys = [];
            safetyItems?.forEach(section => {
              section?.items?.forEach((it, idx) => {
                const key = `${section?.id}-${idx}`;
                if (section?.id === 'ppe') {
                  const field = PPE_FIELDS[idx]?.[0];
                  if (getPPEValue(selectedOrder, field)) requiredKeys.push(key);
                } else {
                  requiredKeys.push(key);
                }
              });
            });
            Object.keys(checklist || {}).forEach(k => { if (k.startsWith('custom-')) requiredKeys.push(k); });
            const uniqueReq = Array.from(new Set(requiredKeys));
            if (uniqueReq.length === 0) return false;
            // If the order already has recorded missing items, do not allow completion
            const recordedMissing = getRecordedMissing(selectedOrder) || [];
            if (recordedMissing.length > 0) return false;
            // Also prevent completion if there are local missing marks
            const localMissingKeys = Object.keys(missingPPE || {}).filter(k => !!missingPPE[k]);
            if (localMissingKeys.length > 0) return false;
            return uniqueReq.every(k => !!checklist?.[k]);
          };

          // Persist local changes to localStorage whenever they change
          useEffect(() => {
            if (!selectedOrder) return;
            const orderKey = selectedOrder?.id || selectedOrder?.ordenTrabajo || selectedOrder?.folio || '';
            if (!orderKey) return;
            
            const completed = isChecklistComplete();
            const toSave = {
              checklist: checklist || {},
              missingPPE: missingPPE || {},
              completed: completed,
              updatedAt: new Date().toISOString()
            };
            saveLocalState(orderKey, toSave);
            
            // Only update persistedState if completed status actually changed
            setPersistedState(prev => {
              if (prev?.completed !== completed) {
                return toSave;
              }
              return prev;
            });
          }, [checklist, missingPPE, selectedOrder]);

          const handleSubmitChecklist = () => {
            if (!selectedOrder) return;
            // Build missing list combining recorded (server) and local missing entries
            const recorded = getRecordedMissing(selectedOrder) || [];
            const localMissing = Object.keys(missingPPE || {}).filter(k => !!missingPPE[k]).map(k => {
              if (k.startsWith('custom-')) return checklist?.[k + '-label'] || 'Otro';
              const parts = k.split('-');
              const sec = safetyItems.find(s => s.id === parts[0]);
              const idx = Number(parts[1]);
              return sec?.items?.[idx] || 'Otro';
            });
            const missing = Array.from(new Set([...(recorded || []), ...localMissing]));

            const completedFlag = isChecklistComplete();
            const payload = {
              completed: completedFlag,
              missingPPE: missing
            };
            // Save completed state locally so it persists even after UI updates
            try {
              const orderKey = selectedOrder?.id || selectedOrder?.ordenTrabajo || selectedOrder?.folio || '';
              const saved = loadLocalState(orderKey) || {};
              const toSave = { ...saved, checklist: checklist || {}, missingPPE: missing || {}, completed: completedFlag, updatedAt: new Date().toISOString() };
              saveLocalState(orderKey, toSave);
              setPersistedState(toSave);
            } catch (e) {}

            onSafetyComplete?.(selectedOrder?.id, payload);
            // Close panel but keep persisted marks
            setSelectedOrder(null);
            setChecklist({});
            setMissingPPE({});
          };

          // Whether this order is logically completed (server or local)
          const isCompletedLocked = !!(selectedOrder?.safetyChecklistCompleted || persistedState?.completed);
          const primaryButtonLabel = isCompletedLocked ? 'Actualizar' : 'Completar Verificación';

          return (
            <div className="bg-card border rounded-lg p-6">
              <div className="flex items-center space-x-2 mb-6">
                <Icon name="Shield" className="text-orange-500" size={24} />
                <h2 className="text-xl font-bold">Lista de Verificación de Seguridad</h2>
              </div>
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Orders List */}
                <div>
                  <h3 className="font-medium mb-3">Órdenes Pendientes</h3>
                  <div className="space-y-2">
                    {workOrders?.map((order) => (
                      <div
                        key={order?.id}
                        onClick={() => handleOrderSelect(order)}
                        className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                          selectedOrder?.id === order?.id
                            ? 'border-primary bg-primary/10' :'border-muted hover:border-primary/50'
                        }`}
                      >
                        <div className="flex items-start justify-between">
                          <div>
                            <div className="font-medium">{order?.ordenTrabajo || order?.id}</div>
                            <div className="text-sm text-muted-foreground">{order?.clientName}</div>
                          </div>
                            <div className={`px-2 py-1 rounded-full text-xs ${
                              order?.safetyChecklistCompleted 
                                ? 'bg-green-100 text-green-700' :'bg-red-100 text-red-700'
                            }`}>
                              {order?.safetyChecklistCompleted ? 'Completo' : 'Pendiente'}
                            </div>
                        </div>
                          {/* PPE List: mostrar en forma de lista vertical */}
                          <div className="mt-3">
                            <div className="text-sm font-medium mb-2">EPP</div>
                            <ul className="space-y-1 text-sm">
                              {PPE_FIELDS.map(([field, label]) => ({ field, label }))
                                .filter(({ field }) => getPPEValue(order, field))
                                .map(({ field, label }) => (
                                  <li key={`${order?.ordenTrabajo || order?.id}-${field}`} className="flex items-center justify-between">
                                    <span className="truncate mr-4">{label}</span>
                                    <span className={`text-xs px-2 py-0.5 rounded-full bg-green-100 text-green-700`}>
                                      Requiere
                                    </span>
                                  </li>
                                ))}
                            </ul>
                          </div>
                      </div>
                    ))}
                  </div>

                  {workOrders?.length === 0 && (
                    <div className="text-center py-8 text-muted-foreground">
                      <Icon name="Shield" size={48} className="mx-auto mb-2 opacity-50" />
                      <div>No hay órdenes pendientes</div>
                    </div>
                  )}
                </div>

                {/* Safety Checklist */}
                <div className="lg:col-span-2">
                  {selectedOrder ? (
                    <div className="space-y-4">
                      {/* Order Info */}
                      <div className="bg-muted p-4 rounded-lg">
                        <h4 className="font-medium mb-2">Lista de Seguridad - {selectedOrder?.ordenTrabajo || selectedOrder?.id}</h4>
                        <div className="text-sm space-y-1">
                          <div><strong>Proyecto:</strong> {selectedOrder?.projectRef}</div>
                          <div><strong>Cliente:</strong> {selectedOrder?.clientName}</div>
                        </div>
                        
                        {/* Progress */}
                        <div className="mt-3">
                          <div className="flex items-center justify-between text-sm mb-1">
                            <span>Progreso de Verificación</span>
                            <span className="font-medium">{getCompletionPercentage()}%</span>
                          </div>
                          <div className="w-full bg-gray-200 rounded-full h-2">
                            <div 
                              className={`h-2 rounded-full transition-all duration-300 ${
                                getCompletionPercentage() === 100 ? 'bg-green-500' : 'bg-orange-500'
                              }`}
                              style={{ width: `${getCompletionPercentage()}%` }}
                            ></div>
                          </div>
                        </div>
                      </div>

                      {/* Checklist Sections */}
                      <div className="space-y-4 max-h-96 overflow-y-auto">
                        {safetyItems?.map((section) => (
                          <div key={section?.id} className="bg-muted/30 rounded-lg p-4">
                            <div className="flex items-center justify-between mb-3">
                                <h5 className="font-medium flex items-center space-x-2">
                                <button
                                  type="button"
                                  onClick={() => handleMarkAllVerified(section?.id)}
                                  className="inline-flex items-center p-1 rounded hover:bg-muted/20"
                                  title="Marcar verificadas"
                                  aria-label={`Marcar verificadas ${section?.id}`}
                                >
                                  <Icon name="CheckSquare" size={16} />
                                </button>
                                <span>{section?.title}</span>
                              </h5>
                              <div className="flex items-center space-x-2">
                                {/* compact icon-only action handled via the icon button */}
                              </div>
                            </div>
                            <div className="space-y-2">
                              {section?.items?.map((item, index) => {
                                const itemKey = `${section?.id}-${index}`;
                                // For PPE section, determine if this item is required for the selectedOrder
                                let requiredForSelected = true;
                                if (section?.id === 'ppe' && selectedOrder) {
                                  const field = PPE_FIELDS[index]?.[0];
                                  requiredForSelected = !!getPPEValue(selectedOrder, field);
                                }
                                const recordedMissing = getRecordedMissing(selectedOrder || {})?.map(m => String(m || '').toLowerCase()) || [];

                                return (
                                  <div key={itemKey} className="flex items-center justify-between space-x-3">
                                    <div className="flex items-center space-x-3">
                                      {(() => {
                                    
                                        const disabledForChecklist = (section?.id === 'ppe' && selectedOrder && !getPPEValue(selectedOrder, PPE_FIELDS[index]?.[0])) || recordedMissing.some(r => (String(item || '').toLowerCase().includes(r) || r.includes(String(item || '').toLowerCase()))) || !!missingPPE?.[itemKey];
                                        return (
                                          <Checkbox
                                            id={itemKey}
                                            checked={!!checklist?.[itemKey]}
                                            onChange={(e) => handleChecklistChange(itemKey, e?.target?.checked)}
                                            disabled={disabledForChecklist}
                                          />
                                        );
                                      })()}
                                      <label htmlFor={itemKey} className={`text-sm cursor-pointer ${!requiredForSelected ? 'opacity-50' : ''}`}>
                                        {item}
                                      </label>
                                    </div>
                                    <div className="flex items-center space-x-2">
                                          {requiredForSelected ? (
                                        <>
                                          <label className="text-xs text-muted-foreground mr-2">Falta</label>
                                          <input type="checkbox" className="accent-red-600" checked={!!missingPPE?.[itemKey]} onChange={(e) => handleMissingToggle(itemKey, e?.target?.checked)} />
                                        </>
                                      ) : (
                                        <span className="text-xs text-muted-foreground mr-2">No requiere</span>
                                      )}
                                    </div>
                                  </div>
                                );
                              })}
                              {/* Render any custom missing items added */}
                              {Object.keys(missingPPE || {}).filter(k => k.startsWith('custom-')).map((ck) => (
                                <div key={ck} className="flex items-center justify-between space-x-3">
                                  <div className="flex items-center space-x-3">
                                    <Checkbox id={ck} checked={!!checklist?.[ck]} onChange={(e) => handleChecklistChange(ck, e?.target?.checked)} />
                                    <label className="text-sm cursor-pointer">{checklist?.[ck + '-label'] || 'Otro'}</label>
                                  </div>
                                  <div className="flex items-center space-x-2">
                                    <label className="text-xs text-muted-foreground mr-2">Falta</label>
                                    <input type="checkbox" className="accent-red-600" checked={!!missingPPE?.[ck]} onChange={(e) => handleMissingToggle(ck, e?.target?.checked)} />
                                  </div>
                                </div>
                              ))}
                              <div className="flex items-center space-x-2 mt-2">
                                <input value={customMissing} onChange={(e) => setCustomMissing(e?.target?.value)} placeholder="Agregar..." className="flex-1 px-2 py-1 border rounded" />
                                <Button size="xs" onClick={handleAddCustomMissing}>Agregar</Button>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>

                      {(getRecordedMissing(selectedOrder) || []).length > 0 && (
                        <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                          <div className="flex items-start space-x-2">
                            <Icon name="AlertTriangle" size={16} className="text-red-600 mt-0.5" />
                            <div className="text-sm">
                              <div className="font-medium text-red-800">Faltantes registrados</div>
                              <div className="text-red-700">No es posible completar la verificación mientras existan ítems marcados como faltantes. Revise y resuelva los siguientes:</div>
                              <ul className="list-disc ml-5 mt-2 text-red-700">
                                {getRecordedMissing(selectedOrder).map((m, i) => (
                                  <li key={`missing-${i}`}>{m}</li>
                                ))}
                              </ul>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Actions */}
                      <div className="flex space-x-2 pt-4 border-t">
                        <Button
                          onClick={handleSubmitChecklist}
                          disabled={!isChecklistComplete()}
                          className="flex-1"
                          iconName="Shield"
                        >
                          {primaryButtonLabel}
                        </Button>
                        <Button
                          variant="outline"
                          onClick={() => setSelectedOrder(null)}
                        >
                          Cancelar
                        </Button>
                      </div>

                      {/* Completion Alert */}
                      {!isChecklistComplete() && (
                        <div className="bg-orange-50 border border-orange-200 rounded-lg p-3">
                          <div className="flex items-start space-x-2">
                            <Icon name="AlertTriangle" size={16} className="text-orange-600 mt-0.5" />
                            <div className="text-sm">
                              <div className="font-medium text-orange-800">Verificación Incompleta</div>
                              <div className="text-orange-700">
                                Complete todos los elementos antes de continuar con la fabricación
                              </div>
                            </div>
                          </div>
                        </div>
                      )}

                      {isChecklistComplete() && (
                        <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                          <div className="flex items-start space-x-2">
                            <Icon name="CheckCircle" size={16} className="text-green-600 mt-0.5" />
                            <div className="text-sm">
                              <div className="font-medium text-green-800">Verificación Completa</div>
                              <div className="text-green-700">
                                Todos los elementos de seguridad han sido verificados
                              </div>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="text-center py-8 text-muted-foreground">
                      <Icon name="MousePointer" size={48} className="mx-auto mb-2 opacity-50" />
                      <div>Seleccione una orden para completar la lista de seguridad</div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        };

        export default SafetyChecklistPanel;