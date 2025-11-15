import React, { useEffect, useMemo, useState } from 'react';
import Icon from '../../../components/AppIcon';
import Button from '../../../components/ui/Button';
import useOperacAlt from '../../../hooks/useOperacAlt';

        const WorkflowBoard = ({ workOrders = [], onStatusChange, onOrderSelect }) => {
          const { oportunities, getOportunities } = useOperacAlt();

          const columns = [
            { id: 'material-reception', title: 'Recepción Material', icon: 'Package', color: 'bg-blue-500' },
            { id: 'safety-checklist', title: 'Lista Seguridad', icon: 'Shield', color: 'bg-orange-500' },
            { id: 'manufacturing', title: 'Fabricación', icon: 'Wrench', color: 'bg-purple-500' },
            { id: 'quality-control', title: 'Control Calidad', icon: 'CheckCircle', color: 'bg-green-500' },
            { id: 'ready-shipment', title: 'Listo Envío', icon: 'Truck', color: 'bg-teal-500' }
          ];

          // helper to build a stable string key for an order
          const getOrderKey = (orderOrId) => {
            try {
              if (!orderOrId) return '';
              if (typeof orderOrId === 'string' || typeof orderOrId === 'number') return String(orderOrId);
              // order object
              const o = orderOrId;
              return String(o.id || o.ordenTrabajo || o.folio || (o.raw && (o.raw.id || o.raw.folio)) || '').trim();
            } catch (e) {
              return '';
            }
          };

          // (debug panel removed) — normalization and rendering remain

          // fetch when no external prop provided
          // NOTE: avoid including `getOportunities` in deps because the hook returns a new
          // function identity each render which would cause this effect to run repeatedly.
          useEffect(() => {
            if (!workOrders || !workOrders.length) getOportunities();
            // Intentionally only depend on workOrders length to prevent cycling
          }, [workOrders?.length]);

          const sourceOrders = useMemo(() => (workOrders?.length ? workOrders : oportunities || []), [workOrders, oportunities]);


          // normalize incoming order shapes (keep original object under `raw`)
          function normalizeOrder(o) {
            if (!o) return null;
            const ordenTrabajo = o.ordenTrabajo || o.id || o.order || o.folio;
            const proyectoNombre = o.proyectoNombre || o.projectRef || o.nombreProyecto || o.projectName;
            const cliente = o.cliente || o.client || o.clientName || (o.clienteNombre ? { nombre: o.clienteNombre } : null);
            const clientLabel = cliente?.nombre || cliente?.empresa || cliente || o.clientName || '';

            let tecnicos = [];
            if (Array.isArray(o.tecnicoAsignado)) tecnicos = o.tecnicoAsignado.map(t => ({ nombre: t.nombre || t.name || t }));
            else if (o.tecnicoAsignado && typeof o.tecnicoAsignado === 'object') tecnicos = [{ nombre: o.tecnicoAsignado.nombre || o.tecnicoAsignado.name }];
            else if (o.tecnicoAsignado) tecnicos = [{ nombre: o.tecnicoAsignado }];
            else if (Array.isArray(o.assignedTechnicians)) tecnicos = o.assignedTechnicians.map(t => ({ nombre: t.name || t.nombre }));
            // also accept 'tecnicos' as an alias from backend
            else if (Array.isArray(o.tecnicos)) tecnicos = o.tecnicos.map(t => ({ nombre: t.nombre || t.name || t }));

            let prioridad = o.prioridad || o.priority || o.priorityLabel || '';
            // infer priority from other fields when backend misuses 'estado' for priority
            try {
              const maybeEstado = (o.estado || o.estado?.toString?.() || o.status || '').toString().toLowerCase();
              if (!prioridad && maybeEstado) {
                const priMap = ['alta','high','urgent','urgente','crítica','critica','media','baja','low'];
                if (priMap.includes(maybeEstado)) prioridad = (o.estado || maybeEstado);
              }
            } catch (e) {
              // ignore
            }
            const prioridadLabel = o.prioridad || o.priorityLabel || o.priority || prioridad || '';
            const fechaLimite = o.fechaLimite || o.estimatedCompletion || o.fecha || o.fechaEstimada || '';
            // normalize various progress fields and parse strings like "15%"
            const _rawProg = o.estadoProgreso ?? o.estado_progreso ?? o.progressPercentage ?? o.progressPercent ?? o.estado_progress ?? o.progress ?? o.progreso;
            let estadoProgreso = 0;
            try {
              if (_rawProg == null) estadoProgreso = 0;
              else if (typeof _rawProg === 'string') {
                const n = parseInt(String(_rawProg).replace('%', '').trim(), 10);
                estadoProgreso = Number.isFinite(n) ? n : 0;
              } else {
                estadoProgreso = Math.round(Number(_rawProg) || 0);
              }
            } catch (e) { estadoProgreso = 0; }

            const statusRaw = (o.status || o.estado || '').toString();
            const estadoMap = (val) => {
              if (!val) return '';
              const v = String(val).toLowerCase().trim();
              // map common Spanish and English states to column ids
              if (['material-reception','recepcion material','recepción material','recepción_material','recepción'].includes(v)) return 'material-reception';
              if (['safety-checklist','lista seguridad','seguridad','safety','checklist seguridad'].includes(v)) return 'safety-checklist';
              if (['manufacturing','fabricación','fabricacion','en progreso','progreso','producción','produccion','produccion'].includes(v)) return 'manufacturing';
              if (['quality-control','control calidad','calidad','qc','quality'].includes(v)) return 'quality-control';
              if (['ready-shipment','listo envío','listo envio','envío','envio','enviado','completada','completado','listo'].includes(v)) return 'ready-shipment';
              if (['pendiente','pendiente por revisar','new','nuevo'].includes(v)) return 'material-reception';
              if (['en pausa','pausa','pausado'].includes(v)) return 'manufacturing';
              // fallback: if value already matches expected ids
              if (['material-reception','safety-checklist','manufacturing','quality-control','ready-shipment'].includes(v)) return v;
              return val;
            };

            const status = estadoMap(statusRaw);

            // expose original estado value for transparency
            const estado = o.estado || o.status || '';

            return {
              raw: o,
              ordenTrabajo,
              proyectoNombre,
              cliente: cliente || null,
              clientLabel,
              tecnicos,
              prioridad,
              prioridadLabel,
              estadoProgreso,
              fechaLimite,
              status,
              estado,
              tecnicoAsignado: o.tecnicoAsignado || (tecnicos.length ? tecnicos.map(t => ({ nombre: t.nombre })) : null),
              notasAdicionales: o.notasAdicionales || o.notes || o.descripcion || '',
              tipo: o.tipo || o.type || '',
              id: o.id || ordenTrabajo,
              assignedTechnicians: o.assignedTechnicians || tecnicos.map(t => ({ name: t.nombre })),
              projectRef: o.projectRef || proyectoNombre,
              materials: o.materiales || o.materials || null,
              progress: o.progress || o.progreso || 0,
              estimatedCompletion: o.estimatedCompletion || fechaLimite,
              priorityValue: prioridad,
            };
          }

          // precompute normalized orders for rendering and for the debug panel
          const normalizedOrders = useMemo(() => sourceOrders.map(normalizeOrder).filter(Boolean), [sourceOrders]);

          // (debugging/logs removed) keep normalizedOrders for UI rendering

          const getPriorityColor = (priority) => {
            const colors = { low: 'border-gray-300', medium: 'border-yellow-400', high: 'border-orange-500', urgent: 'border-red-500' };
            return colors[priority] || 'border-gray-300';
          };

          const getProgressColor = (progress) => {
            if (progress < 30) return 'bg-red-500';
            if (progress < 70) return 'bg-yellow-500';
            return 'bg-green-500';
          };

          // persist some UI-only states in session so reloads keep positions and completed flags
          const [localProgress, setLocalProgress] = useState(() => {
            try { return JSON.parse(localStorage.getItem('wb_local_progress') || '{}'); } catch (e) { return {}; }
          });
          const [localHidden, setLocalHidden] = useState(() => {
            try { return JSON.parse(localStorage.getItem('wb_local_hidden') || '{}'); } catch (e) { return {}; }
          });
          const [localCompleted, setLocalCompleted] = useState(() => {
            try { return JSON.parse(localStorage.getItem('wb_local_completed') || '{}'); } catch (e) { return {}; }
          });
          const [localStatusOverrides, setLocalStatusOverrides] = useState(() => {
            try { return JSON.parse(localStorage.getItem('wb_status_overrides') || '{}'); } catch (e) { return {}; }
          });

          // keep localStorage in sync when these states change
          useEffect(() => {
            try { localStorage.setItem('wb_status_overrides', JSON.stringify(localStatusOverrides || {})); } catch (e) { }
          }, [localStatusOverrides]);
          useEffect(() => {
            try { localStorage.setItem('wb_local_completed', JSON.stringify(localCompleted || {})); } catch (e) { }
          }, [localCompleted]);
          useEffect(() => {
            try { localStorage.setItem('wb_local_hidden', JSON.stringify(localHidden || {})); } catch (e) { }
          }, [localHidden]);
          useEffect(() => {
            try { localStorage.setItem('wb_local_progress', JSON.stringify(localProgress || {})); } catch (e) { }
          }, [localProgress]);

          // Initialize overrides on load: ensure each known order has a default override of
          // 'material-reception' but DO NOT clobber existing overrides. This prevents
          // resetting user moves when normalizedOrders updates (e.g. after parent updates).
          useEffect(() => {
            setLocalStatusOverrides((prev) => {
              try {
                const next = { ...(prev || {}) };
                normalizedOrders.forEach((o) => {
                  const k = getOrderKey(o);
                  if (!k) return;
                  if (!next[k]) next[k] = 'material-reception';
                });
                return next;
              } catch (e) {
                return prev || {};
              }
            });
          }, [normalizedOrders]);

          // Limpiar localStorage cuando el servidor tiene valores más recientes
          useEffect(() => {
            setLocalProgress((prev) => {
              try {
                const next = { ...prev };
                let hasChanges = false;
                normalizedOrders.forEach((o) => {
                  const k = getOrderKey(o);
                  if (!k) return;
                  // Si el servidor tiene un progreso definido, eliminar el valor local
                  const serverProgress = o?.estadoProgreso ?? o?.progress;
                  if (serverProgress !== undefined && serverProgress !== null && next[k] !== undefined) {
                    delete next[k];
                    hasChanges = true;
                  }
                });
                return hasChanges ? next : prev;
              } catch (e) {
                return prev || {};
              }
            });
          }, [normalizedOrders]);

          const handleMoveOrder = (order, newStatus) => {
            const orderKey = getOrderKey(order);
            if (!orderKey) return; // don't proceed without a stable key
            // compute progress based on column index (0..n-1). final column => 100%
            const nextIndex = columns.findIndex(c => c.id === newStatus);
            const newProgress = nextIndex >= 0 ? Math.round((nextIndex / (columns.length - 1)) * 100) : null;
            const payload = {};
            // Important: don't auto-mark 100% when moving into 'ready-shipment' via Siguiente.
            // The user requested that only the explicit 'Listo' button marks 100% and completed.
            if (newProgress !== null && newStatus !== 'ready-shipment') {
              payload.estadoProgreso = newProgress;
              // Solo actualizar localStorage si el servidor NO tiene ya un valor
              const serverProgress = order?.estadoProgreso ?? order?.progress;
              if (serverProgress === undefined || serverProgress === null) {
                setLocalProgress(prev => ({ ...prev, [orderKey]: newProgress }));
              }
            }
            if (newProgress === 100 && newStatus !== 'ready-shipment') payload.completed = true;
            // persist local status override so UI keeps the card in the new column across reloads
            setLocalStatusOverrides(prev => {
              const next = { ...(prev || {}) };
              next[orderKey] = newStatus;
              return next;
            });
            onStatusChange?.(orderKey, newStatus, payload);
          };

          return (
            <div className="bg-card border rounded-lg">
              {/* Title */}
              <div className="p-4 border-b">
                <div className="flex items-center space-x-3">
                  <Icon name="Workflow" className="text-primary" size={20} />
                  <h3 className="text-lg font-semibold">Flujo Operativo Taller</h3>
                  <div className="ml-auto" />
                </div>
              </div>

              <div className="overflow-x-auto p-4">
                <div className="flex space-x-4">
                  {columns.map((column) => {
                    // filter normalized orders by (possibly overridden) column status
                    const orders = normalizedOrders.filter((o) => {
                      const k = getOrderKey(o);
                      // Prefer authoritative status from the parent (o.status) when present.
                      // localStatusOverrides are only a fallback so parent-initiated reverts are respected.
                      const hasParentStatus = o && o.status !== undefined && o.status !== null && String(o.status) !== '';
                      const s = hasParentStatus ? o.status : ((k && localStatusOverrides[k]) || o?.status);
                      return s === column.id;
                    });

                    // orders per column are rendered below

                    // sort by priority (critical/urgent, high/alta, medium/media, low/baja)
                    const priorityRank = (p) => {
                      const v = String(p || '').toLowerCase();
                      if (['crítica','critica','urgent','urgente'].includes(v)) return 1;
                      if (['alta','high'].includes(v)) return 2;
                      if (['media','medium'].includes(v)) return 3;
                      if (['baja','low'].includes(v)) return 4;
                      return 99;
                    };
                    orders.sort((a, b) => priorityRank(a.prioridad || a.priorityValue) - priorityRank(b.prioridad || b.priorityValue));

                    // compute visible orders (exclude hidden) so header counts match rendered cards
                    const visibleOrders = orders.filter((o) => {
                      const k = getOrderKey(o);
                      return !(k && (localHidden[k] || o?.hidden));
                    });

                    return (
                      <div key={column.id} className="bg-muted/30 rounded-lg p-3 flex flex-col flex-shrink-0 w-72 md:w-80 lg:w-96 h-[60vh]">
                        {/* Fixed header area for each column to align starts */}
                          <div className="flex items-center space-x-2 mb-3 h-16 flex-shrink-0">
                          <div className={`w-3 h-3 rounded-full ${column.color}`} />
                          <Icon name={column.icon} size={16} className="text-foreground" />
                          <span className="font-medium text-sm truncate">{column.title}</span>
                          <span className="text-xs text-muted-foreground bg-muted px-2 py-1 rounded-full ml-auto">{visibleOrders.length}</span>
                        </div>
                        {/* compact IDs info removed */}

                        <div className="space-y-3 overflow-y-auto flex-1 pr-1 no-scrollbar">
                          {visibleOrders.length === 0 && (
                            <div className="text-center text-muted-foreground py-6">
                              <Icon name={column.icon} size={28} className="mx-auto mb-2 opacity-50" />
                              <div className="text-sm">Sin órdenes</div>
                            </div>
                          )}
                          {visibleOrders.map((order, __idx) => {
                            const stableKey = getOrderKey(order) || (order?.id || order?.ordenTrabajo || `order-${__idx}`);
                            // ensure we build a unique react key per rendered item (append index)
                            const reactKey = `${stableKey}-${__idx}`;
                            const isHidden = stableKey && (localHidden[stableKey] || order?.hidden);
                            if (isHidden) return null;
                            // Siempre priorizar valores del servidor sobre localStorage
                            const parentProgress = (order?.estadoProgreso !== undefined && order?.estadoProgreso !== null)
                              ? Number(order.estadoProgreso)
                              : (order?.progress !== undefined && order?.progress !== null) ? Number(order.progress) : null;

                            const localProg = (stableKey && localProgress && (localProgress[stableKey] !== undefined && localProgress[stableKey] !== null))
                              ? Number(localProgress[stableKey])
                              : null;

                            let rawProgress = 0;
                            // SIEMPRE preferir parentProgress (servidor) sobre localStorage
                            if (parentProgress !== null && !Number.isNaN(parentProgress)) {
                              rawProgress = Math.round(parentProgress);
                              // Limpiar localStorage si hay un valor del servidor más reciente
                              if (stableKey && localProg !== null && localProg !== parentProgress) {
                                setLocalProgress(prev => {
                                  const next = { ...prev };
                                  delete next[stableKey];
                                  return next;
                                });
                              }
                            } else if (localProg !== null && !Number.isNaN(localProg)) {
                              rawProgress = Math.round(localProg);
                            } else {
                              rawProgress = Math.round(Number(order?.progreso ?? 0) || 0);
                            }

                            // Siempre preferir el progreso del servidor sobre flags locales
                            let computedProgress = rawProgress;
                            if (parentProgress !== null && !Number.isNaN(parentProgress)) {
                              computedProgress = Math.min(100, Math.max(0, Math.round(parentProgress)));
                            } else if (stableKey && localCompleted && localCompleted[stableKey]) {
                              computedProgress = 100;
                            } else {
                              computedProgress = Math.min(100, Math.max(0, Math.round(rawProgress)));
                            }
                            const priorityKey = (p) => {
                              const v = String(p || '').toLowerCase();
                              if (['crítica','critica','urgent','urgente'].includes(v)) return 'urgent';
                              if (['alta','high'].includes(v)) return 'high';
                              if (['media','medium'].includes(v)) return 'medium';
                              if (['baja','low'].includes(v)) return 'low';
                              return v;
                            };

                            return (
                <div
                  key={reactKey}
                                className={`bg-background border-2 ${getPriorityColor(priorityKey(order?.prioridad || order?.priorityValue))} rounded-lg p-4 cursor-pointer hover:shadow-md transition-all duration-200 overflow-hidden h-80 md:h-96 flex flex-col justify-between`}
                                onClick={() => {
                                  // prefer sending a normalized, stable object to the parent so
                                  // the Controls panel can render consistent fields regardless of source
                                  const selected = {
                                    id: order?.id || order?.ordenTrabajo,
                                    ordenTrabajo: order?.ordenTrabajo || order?.id,
                                    // Cliente (múltiples aliases)
                                    clientName: order?.clientLabel || order?.clientName || order?.cliente?.nombre || (order?.raw && (order.raw.clientName || '')),
                                    clientLabel: order?.clientLabel || order?.clientName || order?.cliente?.nombre || '',
                                    cliente: order?.cliente || (order?.raw && (order.raw.cliente || null)) || null,
                                    // Prioridad (exponer varios nombres que el Controls usa como fallback)
                                    prioridad: order?.prioridad || order?.priorityValue || '',
                                    prioridadLabel: order?.prioridadLabel || order?.priorityLabel || order?.prioridad || '',
                                    priorityValue: order?.priorityValue || order?.prioridad || '',
                                    // Progreso (exponer en dos nombres)
                                    progress: order?.progress || order?.progreso || order?.estadoProgreso || 0,
                                    progreso: order?.progreso || order?.progress || order?.estadoProgreso || 0,
                                    // Proyecto
                                    projectRef: order?.projectRef || order?.proyectoNombre || '',
                                    proyectoNombre: order?.proyectoNombre || order?.projectRef || '',
                                    // Técnicos: pasar como assignedTechnicians y también como tecnicoAsignado / tecnicos
                                    assignedTechnicians: (Array.isArray(order?.assignedTechnicians) ? order.assignedTechnicians : (order?.assignedTechnicians ? [order.assignedTechnicians] : (Array.isArray(order?.tecnicoAsignado) ? order.tecnicoAsignado.map(t => ({ name: t?.nombre || t?.name || t })) : (order?.tecnicoAsignado ? [{ name: order.tecnicoAsignado.nombre || order.tecnicoAsignado.name || order.tecnicoAsignado }] : [])))) || [],
                                    tecnicoAsignado: (Array.isArray(order?.tecnicoAsignado) ? order.tecnicoAsignado : (order?.tecnicoAsignado ? [order.tecnicoAsignado] : (Array.isArray(order?.assignedTechnicians) ? order.assignedTechnicians.map(t => ({ nombre: t?.name || t?.nombre || t })) : (order?.tecnicos || [])))) || [],
                                    tecnicos: (Array.isArray(order?.tecnicos) ? order.tecnicos : (order?.tecnicos ? [order.tecnicos] : (Array.isArray(order?.tecnicoAsignado) ? order.tecnicoAsignado.map(t => ({ nombre: t?.nombre || t?.name || t })) : (Array.isArray(order?.assignedTechnicians) ? order.assignedTechnicians.map(t => ({ nombre: t?.name || t?.nombre || t })) : [])))) || [],
                                    raw: order?.raw || order,
                                  };
                                  onOrderSelect?.(selected);
                                }}
                                // cuando Debug está activado, forzamos estilos visibles para confirmar existencia en DOM
                                // no debug styles
                              >
                                <div className="flex items-start justify-between mb-2">
                                  <div className="min-w-0">
                                  <div className="font-medium text-sm truncate">{order?.ordenTrabajo || order?.id}</div>
                                  <div className="text-xs text-muted-foreground truncate max-w-[16rem]">{order?.proyectoNombre}</div>
                                </div>

                                  <div className={`px-2 py-1 rounded-full text-xs font-medium max-w-[8rem] overflow-hidden truncate ${
                                    priorityKey(order?.prioridad || order?.priorityValue) === 'urgent'
                                      ? 'bg-red-100 text-red-700'
                                      : priorityKey(order?.prioridad || order?.priorityValue) === 'high'
                                      ? 'bg-orange-100 text-orange-700'
                                      : priorityKey(order?.prioridad || order?.priorityValue) === 'medium'
                                      ? 'bg-yellow-100 text-yellow-700'
                                      : 'bg-gray-100 text-gray-700'
                                  }`}>
                                    <span className="truncate">{order?.prioridadLabel || order?.prioridad || order?.priorityValue}</span>
                                  </div>
                                  {( (stableKey && localCompleted && localCompleted[stableKey]) || computedProgress >= 100 || order?.status === 'ready-shipment') && (
                                    <div className="ml-2 px-2 py-0.5 rounded-full bg-green-100 text-green-700 text-xs font-medium">Completado</div>
                                  )}
                                </div>

                                <div className="mb-3">
                                  <div className="font-medium text-sm text-foreground truncate max-w-[16rem]">{order?.cliente?.nombre || order?.clientLabel}</div>
                                </div>

                                <div className="mb-3">
                                  <div className="text-xs text-muted-foreground mb-1">Técnicos:</div>
                                    {(() => {
                                      const rawTech = order?.tecnicoAsignado || order?.tecnicos || [];
                                      const techList = Array.isArray(rawTech) ? rawTech : (rawTech ? [rawTech] : []);
                                      return techList.slice(0, 2).map((tech, idx) => (
                                        <div key={idx} className="text-xs truncate">
                                          <span className="truncate block max-w-[12rem]">{tech?.nombre || tech?.name || tech}</span>
                                        </div>
                                      ));
                                    })()}
                                    {((order?.tecnicoAsignado || order?.tecnicos) || []).length > 2 && (
                                      <div className="text-xs text-muted-foreground">+{((order?.tecnicoAsignado || order?.tecnicos) || []).length - 2} más</div>
                                    )}
                                </div>

                                  <div className="mb-3">
                                  {(() => {
                                    const reception = order?.recepcionMateriales || order?.raw?.recepcionMateriales || { materials: [] };
                                    const materials = order?.materials;
                                    
                                    // Calcular totales desde recepcionMateriales si existen
                                    const totalReceived = reception?.materials?.reduce((sum, m) => sum + (Number(m.received) || 0), 0) || reception?.cantidadRecibida || reception?.received || materials?.received || 0;
                                    const totalRequired = reception?.materials?.reduce((sum, m) => sum + (Number(m.required) || 0), 0) || materials?.total || 0;
                                    const totalPending = Math.max(0, totalRequired - totalReceived);
                                    
                                    return (
                                      <>
                                        <div className="flex items-center justify-between text-xs mb-1">
                                          <span className="text-muted-foreground">Materiales:</span>
                                          <div className="flex items-center gap-1">
                                            <span className="text-green-600 font-semibold">{totalReceived}</span>
                                            <span className="text-muted-foreground">/</span>
                                            <span className="font-semibold">{totalRequired}</span>
                                            {totalPending > 0 && (
                                              <>
                                                <span className="text-muted-foreground mx-1">•</span>
                                                <span className="text-orange-600 font-medium">{totalPending} faltantes</span>
                                              </>
                                            )}
                                          </div>
                                        </div>
                                        <div className="w-full bg-gray-200 rounded-full h-1">
                                          <div
                                            className={`h-1 rounded-full ${
                                              totalPending === 0 ? 'bg-green-500' : totalReceived > 0 ? 'bg-yellow-500' : 'bg-red-500'
                                            }`}
                                            style={{ width: `${totalRequired > 0 ? (totalReceived / totalRequired * 100) : 0}%` }}
                                          />
                                        </div>
                                        {order?.materials?.issues?.length > 0 && (
                                          <div className="text-xs text-red-600 mt-1">{order?.materials?.issues?.length} problema(s)</div>
                                        )}
                                      </>
                                    );
                                  })()}
                                </div>

                                <div className="mb-3">
                                  <div className="flex items-center justify-between text-xs mb-1">
                                    <span className="text-muted-foreground">Progreso:</span>
                                    <span className="font-medium">{computedProgress}%</span>
                                  </div>
                                  <div className="w-full bg-gray-200 rounded-full h-2">
                                    <div className={`h-2 rounded-full ${getProgressColor(computedProgress)}`} style={{ width: `${computedProgress}%` }} />
                                  </div>
                                </div>

                                <div className="flex items-center space-x-1 text-xs text-muted-foreground mb-3">
                                  <Icon name="Calendar" size={12} />
                                  <span>Est: {order?.fechaLimite}</span>
                                </div>

                                <div className="flex items-center space-x-2 text-xs">
                                  {order?.safetyChecklistCompleted && (
                                    <div className="flex items-center space-x-1 text-green-600">
                                      <Icon name="Shield" size={12} />
                                      <span>Seguro</span>
                                    </div>
                                  )}
                                  {order?.qualityControlStatus === 'approved' && (
                                    <div className="flex items-center space-x-1 text-green-600">
                                      <Icon name="CheckCircle" size={12} />
                                      <span>QC OK</span>
                                    </div>
                                  )}
                                  {order?.changeOrders?.length > 0 && (
                                    <div className="flex items-center space-x-1 text-orange-600">
                                      <Icon name="Edit" size={12} />
                                      <span>{order?.changeOrders?.length}</span>
                                    </div>
                                  )}
                                </div>

                                <div className="mt-3 pt-3 border-t border-muted">
                                  <div className="flex space-x-1">
                                    {column.id !== 'ready-shipment' ? (
                                      <Button
                                        size="xs"
                                        variant="outline"
                                        onClick={(e) => {
                                          e?.stopPropagation();
                                          const nextStatuses = {
                                            'material-reception': 'safety-checklist',
                                            'safety-checklist': 'manufacturing',
                                            'manufacturing': 'quality-control',
                                            'quality-control': 'ready-shipment'
                                          };
                                          handleMoveOrder(order, nextStatuses[column.id]);
                                        }}
                                        className="flex-1"
                                      >
                                        Siguiente
                                      </Button>
                                    ) : (
                                      (() => {
                                        const orderKey = stableKey;
                                        const isCompleted = !!(
                                          (orderKey && localCompleted && localCompleted[orderKey]) ||
                                          (order?.estadoProgreso >= 100) ||
                                          (order?.progress >= 100) ||
                                          (order?.progreso >= 100)
                                        );

                                        if (!isCompleted) {
                                          // show only the Listo button until the order is marked completed
                                          return (
                                            <Button
                                              size="xs"
                                              variant="outline"
                                              onClick={(e) => {
                                                e?.stopPropagation();
                                                if (!orderKey) return;
                                                // optimistic mark completed
                                                setLocalProgress(prev => ({ ...prev, [orderKey]: 100 }));
                                                setLocalCompleted(prev => ({ ...prev, [orderKey]: true }));
                                                // persist status override as final
                                                setLocalStatusOverrides(prev => {
                                                  const next = { ...(prev || {}) };
                                                  next[orderKey] = 'ready-shipment';
                                                  return next;
                                                });
                                                    // mark completed locally and notify parent
                                                    onStatusChange?.(orderKey, 'ready-shipment', { estadoProgreso: 100, completed: true });
                                              }}
                                              className="flex-1"
                                            >
                                              Listo
                                            </Button>
                                          );
                                        }

                                        // once completed, replace with Finalizar button
                                        return (
                                          <Button
                                            size="xs"
                                            variant="ghost"
                                            onClick={(e) => {
                                              e?.stopPropagation();
                                              if (!orderKey) return;
                                              // DEBUG: log Finalizar payload to console to trace parent matching
                                              setLocalHidden(prev => ({ ...prev, [orderKey]: true }));
                                              onStatusChange?.(orderKey, 'ready-shipment', { hidden: true });
                                            }}
                                          >
                                            Finalizar
                                          </Button>
                                        );
                                      })()
                                    )}
                                    <Button
                                      size="xs"
                                      variant="outline"
                                      onClick={(e) => {
                                        e?.stopPropagation();
                                        // Handle photo evidence
                                      }}
                                      iconName="Camera"
                                    />
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          );
        };

        export default WorkflowBoard;