import React, { useState, useEffect } from 'react';
import Icon from '../../../components/AppIcon';
import Button from '../../../components/ui/Button';
import Input from '../../../components/ui/Input';
import requisiService from '../../../services/requisiService';
import useGastos from '../../../hooks/useGastos';
import useOperacAlt from '../../../hooks/useOperacAlt';

const MaterialReceptionPanel = ({ workOrders = [], onMaterialReception, selectedOrder: propSelectedOrder }) => {
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [receptionData, setReceptionData] = useState({ received: 0, notes: '', issues: [] });
  const [newIssue, setNewIssue] = useState('');
  const [approvedMaterials, setApprovedMaterials] = useState([]);
  const [approvedSource, setApprovedSource] = useState('');
  const [materialsReception, setMaterialsReception] = useState([]);
  const [orderMaterialsCache, setOrderMaterialsCache] = useState({});
  const { getGastos } = useGastos();
  const { updateWorkOrder } = useOperacAlt();

  // Persist approved materials per-order to localStorage (taller) so previews survive reloads
  const TALLER_PREFIX = 'wb_taller_approved_';
  const TALLER_RECEIVED_PREFIX = 'wb_taller_received_';
  const saveApprovedToTaller = (orderKey, materials, source) => {
    try {
      if (!orderKey) return;
      const payload = { materials, source, updatedAt: Date.now() };
      localStorage.setItem(`${TALLER_PREFIX}${orderKey}`, JSON.stringify(payload));
    } catch (e) { /* ignore storage errors */ }
  };

  const loadApprovedFromTaller = (orderKey) => {
    try {
      if (!orderKey) return null;
      const raw = localStorage.getItem(`${TALLER_PREFIX}${orderKey}`);
      if (!raw) return null;
      try {
        const parsed = JSON.parse(raw);
        return parsed;
      } catch (e) { return null; }
    } catch (e) { return null; }
  };

  const saveReceptionToTaller = (orderKey, receptionPayload) => {
    try {
      if (!orderKey) return;
      localStorage.setItem(`${TALLER_RECEIVED_PREFIX}${orderKey}`, JSON.stringify({ ...receptionPayload, updatedAt: Date.now() }));
    } catch (e) {}
  };

  const loadReceptionFromTaller = (orderKey) => {
    try {
      if (!orderKey) return null;
      const raw = localStorage.getItem(`${TALLER_RECEIVED_PREFIX}${orderKey}`);
      if (!raw) return null;
      return JSON.parse(raw);
    } catch (e) { return null; }
  };

  const normalizeMaterialsForCache = (materials) => {
    if (!Array.isArray(materials)) return [];
    if (materials.length === 0) return [];
    const first = materials[0];
    // If items are in the approved-flag heuristic shape (name/required/received), map to article-like shape
    if (first && (first.required !== undefined || first.received !== undefined) && !first.codigo && !first.descripcion) {
      return materials.map(it => ({
        codigo: it?.codigo || '',
        descripcion: it?.name || it?.nombre || it?.descripcion || 'Sin descripción',
        cantidad: Number(it?.required ?? 0),
        cantidadConUnidad: `${Number(it?.required ?? 0)}`,
        raw: it
      }));
    }
    // otherwise normalize/aggregate into canonical shape
    return normalizeAndAggregate(materials);
  };

  const initMaterialsReception = (materials, persisted = null) => {
    if (!Array.isArray(materials)) return [];
    return materials.map((m, idx) => {
      const key = (m.codigo || m.descripcion || m.descripcion || (`_${idx}`)).toString();
      const required = Number(m.cantidad ?? m.required ?? m.qty ?? 0) || 0;
      const persistedEntry = persisted && Array.isArray(persisted?.materials) ? persisted.materials.find(p => (p.codigo || p.descripcion) === (m.codigo || m.descripcion)) : null;
      const received = persistedEntry ? Number(persistedEntry.received || 0) : 0;
      return {
        key,
        codigo: m.codigo || null,
        descripcion: m.descripcion || m.nombre || m.name || '',
        required,
        received,
        missing: Math.max(0, required - received),
        raw: m.raw || m
      };
    });
  };

  const setCacheAndPersist = (orderKey, materials, source) => {
    if (!orderKey) return;
    const normalized = normalizeMaterialsForCache(materials);
    setOrderMaterialsCache(prev => ({ ...prev, [orderKey]: { materials: normalized, source } }));
    saveApprovedToTaller(orderKey, normalized, source);
  };

  // Utility to summarize materials for logging
  const summarizeMaterials = (materials) => {
    if (!Array.isArray(materials)) return [];
    return materials.map(m => ({ codigo: m?.codigo || m?.id || null, descripcion: m?.descripcion || m?.nombre || m?.name || null, cantidad: m?.cantidad ?? m?.required ?? m?.qty ?? null }));
  };



  // On workOrders change, preload any persisted taller materials so previews are instant
  useEffect(() => {
    if (!Array.isArray(workOrders) || workOrders.length === 0) return;
    const initial = {};
    for (const order of workOrders) {
      const orderKey = order?.ordenTrabajo || order?.id || order?.folio || '';
      if (!orderKey) continue;
      // if we already have cache, skip
      if (orderMaterialsCache[orderKey]) continue;
      const payload = loadApprovedFromTaller(orderKey);
      if (payload && Array.isArray(payload.materials)) {
        initial[orderKey] = { materials: payload.materials, source: payload.source || 'taller' };
      }
    }
    if (Object.keys(initial).length) {
      setOrderMaterialsCache(prev => ({ ...initial, ...prev }));
    }
  }, [workOrders]);

  const handleOrderSelect = (order) => {
    setSelectedOrder(order);
    setReceptionData({
      received: order?.materials?.received || 0,
      notes: '',
      issues: order?.materials?.issues || []
    });
    setApprovedSource('');
    // Always load materials for the selected order
    computeApprovedMaterialsFromOrder(order, true);
  };

  const handleForceSearch = async () => {
    // allow user to force a search by selectedOrder or by manual key
    const orderKey = selectedOrder ? (selectedOrder?.ordenTrabajo || selectedOrder?.id || selectedOrder?.folio || (selectedOrder?.raw && (selectedOrder.raw.id || selectedOrder.raw.numeroOrdenTrabajo))) : window.prompt('Introduce clave de orden (ej. OT-2025-13 o PO-...)');
    if (!orderKey) return;
    console.debug('[MaterialReceptionPanel] force search for key', orderKey);
    const fakeOrder = { ordenTrabajo: orderKey, id: orderKey, folio: orderKey, raw: { id: orderKey, numeroOrdenTrabajo: orderKey } };
    // run the same computation path
    await computeApprovedMaterialsFromOrder(fakeOrder);
    setApprovedSource(prev => prev ? `${prev}|force` : 'force');
  };

  // heuristics to identify approved items from various shapes
  const extractApprovedFromArray = (arr) => {
    if (!Array.isArray(arr)) return [];
    return arr
      .filter(item => {
        if (!item) return false;
        const s = String(item?.status || item?.estado || item?.approved || item?.aprobado || '').toLowerCase();
        if (s.includes('aprob')) return true;
        if (item?.approved === true) return true;
        if (item?.approvedAt || item?.approvedBy) return true;
        return false;
      })
      .map(it => ({
        name: it?.name || it?.nombre || it?.item || it?.producto || 'Material',
        required: Number(it?.required ?? it?.cantidad ?? it?.total ?? it?.qty ?? 0) || 0,
        received: Number(it?.received ?? it?.recibido ?? it?.have ?? 0) || 0,
        raw: it
      }));
  };

  const computeApprovedMaterialsFromOrder = async (order, updateCache = true) => {
    // Clean, easier-to-follow implementation with explicit try/catch blocks
    if (!order) {
      setApprovedMaterials([]);
      return [];
    }

    const orderKey = order?.ordenTrabajo || order?.id || order?.folio || order?.raw?.id || '';

    // Check cache first for performance
    if (orderKey && orderMaterialsCache[orderKey] && !updateCache) {
      const cached = orderMaterialsCache[orderKey];
      setApprovedMaterials(cached.materials);
      setApprovedSource(cached.source);
      const persisted = loadReceptionFromTaller(orderKey);
      setMaterialsReception(initMaterialsReception(cached.materials, persisted));
      return cached.materials;
    }

    // Gather local candidate arrays to detect any already-approved items
    const candidates = [];
    if (Array.isArray(order?.materials)) candidates.push(...order.materials);
    if (Array.isArray(order?.raw?.materiales)) candidates.push(...order.raw.materiales);
    if (Array.isArray(order?.raw?.materials)) candidates.push(...order.raw.materials);

    const approvedLocal = extractApprovedFromArray(candidates);
    if (approvedLocal.length) {
      const result = approvedLocal;
      setApprovedMaterials(result);
      setApprovedSource('local');
      // initialize reception entries (load persisted reception if any)
      const persisted = loadReceptionFromTaller(orderKey);
      setMaterialsReception(initMaterialsReception(result, persisted));
      if (updateCache && orderKey) setCacheAndPersist(orderKey, result, 'local');
      return result;
    }

    // If the order contains manually added materials (materialesManuales), map them to article shape and show
    if (Array.isArray(order?.materialesManuales) && order.materialesManuales.length) {
      console.debug('[MaterialReceptionPanel] using materialesManuales from order', order.materialesManuales.length);
      const manualMapped = order.materialesManuales.map(it => ({
        codigo: it?.id || it?.codigo || '',
        descripcion: it?.nombreMaterial || it?.descripcionEspecificaciones || it?.nombre || it?.descripcion || it?.item || 'Material manual',
        cantidadConUnidad: `${Number(it?.cantidad ?? 0)}${it?.unidad ? ` ${it.unidad}` : ''}`,
        cantidad: Number(it?.cantidad ?? 0),
        unidad: it?.unidad || '',
        raw: it
      }));
      const result = normalizeAndAggregate(manualMapped);
      setApprovedMaterials(result);
      setApprovedSource('local-manuales');
      const persisted = loadReceptionFromTaller(orderKey);
      setMaterialsReception(initMaterialsReception(result, persisted));
      if (updateCache && orderKey) setCacheAndPersist(orderKey, result, 'local-manuales');
      return result;
    }

    if (!orderKey) {
      console.debug('[MaterialReceptionPanel] no orderKey found for order', order);
      setApprovedMaterials([]);
      return [];
    }

    // Helpers
    const normalizeKey = (v) => String(v || '').toLowerCase().replace(/[^a-z0-9]/g, '');
    const onlyDigits = (v) => (String(v || '').match(/\d+/g) || []).join('');

    // 1) Try requisitions
    try {
      console.debug('[MaterialReceptionPanel] querying requisitions for', orderKey);
      const resp = await requisiService.getRequisitions({ numeroOrdenTrabajo: orderKey });
      console.debug('[MaterialReceptionPanel] requisitions response', resp?.data?.length ?? 0);

      if (resp?.success && Array.isArray(resp.data) && resp.data.length) {
        const nor = normalizeKey(orderKey);
        const nd = onlyDigits(orderKey);
        const matchedReqs = resp.data.filter(req => {
          try {
            const keys = [req?.numeroOrdenTrabajo, req?.ordenTrabajo, req?.folio, req?.id, req?.referencia].filter(Boolean).map(String);
            return keys.some(k => {
              const nk = normalizeKey(k);
              const kd = onlyDigits(k);
              if (nk && nor && (nk.includes(nor) || nor.includes(nk))) return true;
              if (kd && nd && kd === nd) return true;
              if (String(k).toLowerCase().includes(String(orderKey).toLowerCase()) || String(orderKey).toLowerCase().includes(String(k).toLowerCase())) return true;
              return false;
            });
          } catch (err) { return false; }
        });

        console.debug('[MaterialReceptionPanel] matched requisitions count', matchedReqs.length);
        if (matchedReqs.length) {
          const mats = [];
          matchedReqs.forEach(req => {
            const list = Array.isArray(req.materiales) ? req.materiales : (Array.isArray(req.items) ? req.items : []);
            list.forEach(it => mats.push(it));
          });

          console.debug('[MaterialReceptionPanel] matched requisitions materials count', mats.length);
          if (mats.length) {
            const first = mats[0];
            // If items already have article-like fields, normalize directly
            if (first && (first.codigo || first.descripcion || first.costoUnitario || first.cantidadConUnidad || first.nombre)) {
              const result = normalizeAndAggregate(mats);
              setApprovedMaterials(result);
              setApprovedSource('requisitions-articulos');
              const persisted = loadReceptionFromTaller(orderKey);
              setMaterialsReception(initMaterialsReception(result, persisted));
              if (updateCache && orderKey) setCacheAndPersist(orderKey, result, 'requisitions-articulos');
              return result;
            }

            // Map generic shapes to article shape
            const mapped = mats.map(it => ({
              codigo: it.id || it.codigo || '',
              descripcion: it.nombre || it.descripcion || it.nombreMaterial || it.producto || it.name || it.item || 'Material sin nombre',
              cantidadConUnidad: `${Number(it.cantidad ?? it.qty ?? it.required ?? 0)}${it.unidad ? ` ${it.unidad}` : ''}`,
              cantidad: Number(it.cantidad ?? it.qty ?? it.required ?? 0),
              unidad: it.unidad || it.unidadMedida || '',
              costoUnitario: it.costoUnitario || it.precioUnitario || it.unitPrice,
              subtotal: it.subtotal,
              raw: it
            }));

            if (mapped.length) {
              const result = normalizeAndAggregate(mapped);
              setApprovedMaterials(result);
              setApprovedSource('requisitions-materiales');
              const persisted = loadReceptionFromTaller(orderKey);
              setMaterialsReception(initMaterialsReception(result, persisted));
              if (updateCache && orderKey) setCacheAndPersist(orderKey, result, 'requisitions-materiales');
              return result;
            }
          }

          // As a last resort in requisitions, try approved-flag heuristic across matched requisitions
          const approvedFromReq = [];
          matchedReqs.forEach(req => {
            const list = Array.isArray(req.materiales) ? req.materiales : (Array.isArray(req.items) ? req.items : []);
            approvedFromReq.push(...extractApprovedFromArray(list));
          });
          if (approvedFromReq.length) {
            setApprovedMaterials(approvedFromReq);
            setApprovedSource('requisitions-heuristic');
            const persisted = loadReceptionFromTaller(orderKey);
            setMaterialsReception(initMaterialsReception(approvedFromReq, persisted));
            if (updateCache && orderKey) setCacheAndPersist(orderKey, approvedFromReq, 'requisitions-heuristic');
            return approvedFromReq;
          }
        }
      }
    } catch (e) {
      console.warn('[MaterialReceptionPanel] requisitions fetch failed', e?.message || e);
    }

    // 2) Fallback to gastos (purchase orders)
    try {
      console.debug('[MaterialReceptionPanel] querying gastos via getGastos for orderKey', orderKey);
      const gresp = await getGastos();
      const list = Array.isArray(gresp) ? gresp : (gresp?.items || gresp?.data || []);
      console.debug('[MaterialReceptionPanel] getGastos response length', Array.isArray(list) ? list.length : 0);

      if (Array.isArray(list) && list.length) {
        const nor = normalizeKey(orderKey);
        const nd = onlyDigits(orderKey);
        const matches = list.filter(po => {
          try {
            const keys = [po?.numeroOrdenTrabajo, po?.orderNumber, po?.numero, po?.folio, po?.id, po?.ordenTrabajo, po?.numeroOrdenCompra].filter(Boolean).map(String);
            return keys.some(k => {
              const nk = normalizeKey(k);
              const kd = onlyDigits(k);
              if (!nk && !kd) return false;
              if (nk && nor && (nk.includes(nor) || nor.includes(nk))) return true;
              if (kd && nd && kd === nd) return true;
              if (String(orderKey).toLowerCase().includes(String(k).toLowerCase()) || String(k).toLowerCase().includes(String(orderKey).toLowerCase())) return true;
              return false;
            });
          } catch (err) { return false; }
        });

        console.debug('[MaterialReceptionPanel] gastos matches count', matches.length);
        if (matches.length) {
          const articles = [];
          matches.forEach(m => {
            const items = Array.isArray(m.articulos) ? m.articulos : (Array.isArray(m.materiales) ? m.materiales : (Array.isArray(m.items) ? m.items : []));
            items.forEach(it => articles.push(it));
          });

          console.debug('[MaterialReceptionPanel] extracted articles count', articles.length);
          if (articles.length) {
            const res = normalizeAndAggregate(articles);
            setApprovedMaterials(res);
            setApprovedSource('gastos-articulos');
            const persisted = loadReceptionFromTaller(orderKey);
            setMaterialsReception(initMaterialsReception(res, persisted));
            if (updateCache && orderKey) setCacheAndPersist(orderKey, res, 'gastos-articulos');
            return res;
          }

          // try approved-flag heuristic in gastos
          const approvedFromGastos = [];
          matches.forEach(m => {
            const items = Array.isArray(m.materiales) ? m.materiales : (Array.isArray(m.items) ? m.items : []);
            approvedFromGastos.push(...extractApprovedFromArray(items));
          });
          if (approvedFromGastos.length) {
            setApprovedMaterials(approvedFromGastos);
            setApprovedSource('gastos-heuristic');
            const persisted = loadReceptionFromTaller(orderKey);
            setMaterialsReception(initMaterialsReception(approvedFromGastos, persisted));
            if (updateCache && orderKey) setCacheAndPersist(orderKey, approvedFromGastos, 'gastos-heuristic');
            return approvedFromGastos;
          }
        }
      }
    } catch (e) {
      console.warn('[MaterialReceptionPanel] getGastos fetch failed', e?.message || e);
    }

    // No materials found
    setApprovedMaterials([]);
    setApprovedSource('none');
    if (updateCache && orderKey) setCacheAndPersist(orderKey, [], 'none');
    return [];
  };

  // Load approved materials for all work orders on mount to show previews
  useEffect(() => {
    const loadMaterialsForAllOrders = async () => {
      for (const order of workOrders) {
        const orderKey = order?.ordenTrabajo || order?.id || order?.folio || '';
        if (orderKey && !orderMaterialsCache[orderKey]) {
          try {
            await computeApprovedMaterialsFromOrder(order, true);
          } catch (e) {
            console.warn('[MaterialReceptionPanel] Failed to load materials for order', orderKey, e);
          }
        }
      }
    };

    if (workOrders.length > 0) {
      loadMaterialsForAllOrders();
    }
  }, [workOrders, orderMaterialsCache]);

  // If a selected order is provided by the parent (from WorkflowBoard), load it into the panel
  useEffect(() => {
    const handleOrderChange = async () => {
      if (!propSelectedOrder) {
        // Clear materials when no order is selected
        setSelectedOrder(null);
        setApprovedMaterials([]);
        setApprovedSource('');
        return;
      }
      
      const incomingKey = propSelectedOrder?.id || propSelectedOrder?.ordenTrabajo || propSelectedOrder?.folio || '';
      if (!incomingKey) return;
      
      const currentKey = selectedOrder?.id || selectedOrder?.ordenTrabajo || selectedOrder?.folio || '';
      
      // Always process if keys are different or if no current order
      if (String(currentKey) !== String(incomingKey) || !selectedOrder) {
        // Clear current materials first
        setApprovedMaterials([]);
        setApprovedSource('');
        
        // Set the selected order
        setSelectedOrder(propSelectedOrder);
        
        // Load existing reception data from database (recepcionMateriales field) or localStorage
        // Los datos pueden estar en propSelectedOrder.recepcionMateriales O en propSelectedOrder.raw.recepcionMateriales
        const dbReception = propSelectedOrder?.recepcionMateriales || propSelectedOrder?.raw?.recepcionMateriales;
        const localReception = loadReceptionFromTaller(incomingKey);
        
        // Prefer database data over localStorage
        const existingReception = dbReception || localReception;
        
        if (existingReception) {
          // Soportar ambos formatos: nuevos nombres (cantidadRecibida) y antiguos (received)
          const receivedValue = existingReception?.cantidadRecibida ?? existingReception?.received ?? 0;
          const notesValue = existingReception?.notasAdicionales ?? existingReception?.notes ?? '';
          const issuesValue = existingReception?.problemasFaltantes ?? existingReception?.issues ?? [];
          
          setReceptionData({
            received: receivedValue,
            notes: notesValue,
            issues: Array.isArray(issuesValue) ? issuesValue : []
          });
          
          // Load existing materials reception data
          if (Array.isArray(existingReception?.materials) && existingReception.materials.length > 0) {
            setMaterialsReception(existingReception.materials);
          }
        } else {
          // No existing reception, use defaults
          setReceptionData({
            received: propSelectedOrder?.materials?.received || 0,
            notes: '',
            issues: propSelectedOrder?.materials?.issues || []
          });
        }
        
        // Force load fresh materials for this specific order ONLY if there's no saved reception data
        // If there's saved reception with materials, we already loaded them above
        if (!existingReception || !existingReception.materials || existingReception.materials.length === 0) {
          try {
            // Force cache/persist when loading a selected order so taller previews update automatically
            await computeApprovedMaterialsFromOrder(propSelectedOrder, true);
          } catch (e) {
            console.warn('[MaterialReceptionPanel] Failed to load materials for selected order', incomingKey, e);
          }
        }
      }
    };
    
    handleOrderChange();
  }, [propSelectedOrder?.id, propSelectedOrder?.ordenTrabajo, propSelectedOrder?.folio]);

  const handleAddIssue = () => {
    if (newIssue?.trim()) {
      setReceptionData(prev => ({ ...prev, issues: [...prev?.issues, newIssue?.trim()] }));
      setNewIssue('');
    }
  };

  const handleMaterialReceivedChange = (key, value) => {
    setMaterialsReception(prev => {
      const updated = prev.map(m => {
        if (m.key !== key) return m;
        const received = Number(isNaN(Number(value)) ? 0 : Number(value));
        return { ...m, received, missing: Math.max(0, (Number(m.required) || 0) - received) };
      });
      // persist draft reception for this order
      try {
        const orderKey = selectedOrder ? (selectedOrder?.ordenTrabajo || selectedOrder?.id || selectedOrder?.folio || '') : '';
        if (orderKey) saveReceptionToTaller(orderKey, { materials: updated, notes: receptionData?.notes, issues: receptionData?.issues });
      } catch (e) {}
      // also update total received in receptionData
      try {
        const totalReceived = updated.reduce((s, it) => s + (Number(it.received) || 0), 0);
        setReceptionData(prev => ({ ...prev, received: totalReceived }));
      } catch (e) {}
      return updated;
    });
  };

  const handleRemoveIssue = (index) => {
    setReceptionData(prev => ({ ...prev, issues: prev?.issues?.filter((_, i) => i !== index) }));
  };

  const handleSubmitReception = async () => {
    if (selectedOrder) {
      const orderKey = selectedOrder?.ordenTrabajo || selectedOrder?.id || selectedOrder?.folio || '';
      const orderId = selectedOrder?.id;
      
      // Calcular total de pendientes (missing) sumando todos los materiales
      const pendientes = materialsReception.reduce((sum, material) => {
        return sum + (material.missing || 0);
      }, 0);
      
      const status = receptionData?.received >= (selectedOrder?.materials?.total || 0) ? 'complete' : 'partial';
      
      // Build complete payload with all reception details
      const receptionPayload = {
        ...receptionData,
        status,
        materials: materialsReception,
        orderKey,
        pendientes,
        orderData: {
          ordenTrabajo: selectedOrder?.ordenTrabajo,
          cliente: selectedOrder?.cliente,
          proyecto: selectedOrder?.proyecto,
          total: selectedOrder?.materials?.total
        },
        registeredAt: Date.now(),
        updatedAt: Date.now()
      };
      
      // Save to taller localStorage (allows updates)
      try { 
        if (orderKey) {
          saveReceptionToTaller(orderKey, receptionPayload);
        }
      } catch(e) {
        console.error('[MaterialReceptionPanel] Error guardando recepción localStorage:', e);
      }
      
      // Save to database using useOperacAlt
      try {
        if (orderId) {
          const dbPayload = {
            recepcionMateriales: {
              // Guardar con ambos formatos para compatibilidad
              received: receptionData.received,
              cantidadRecibida: receptionData.received,
              notes: receptionData.notes,
              notasAdicionales: receptionData.notes,
              issues: receptionData.issues,
              problemasFaltantes: receptionData.issues,
              pendientes: pendientes,
              totalPendientes: pendientes,
              status,
              materials: materialsReception,
              updatedAt: new Date().toISOString()
            }
          };
          
          const result = await updateWorkOrder(orderId, dbPayload);
          
          if (result) {
            // Actualizar selectedOrder localmente con los datos guardados para que se muestren inmediatamente
            setSelectedOrder(prev => ({
              ...prev,
              recepcionMateriales: dbPayload.recepcionMateriales
            }));
          } else {
            console.error('[MaterialReceptionPanel] Error al guardar en BD');
          }
        }
      } catch(e) {
        console.error('[MaterialReceptionPanel] Error guardando recepción en BD:', e);
      }
      
      // Notify parent component with complete payload including recepcionMateriales
      onMaterialReception?.(selectedOrder?.id, {
        ...receptionPayload,
        recepcionMateriales: {
          received: receptionData.received,
          cantidadRecibida: receptionData.received,
          notes: receptionData.notes,
          notasAdicionales: receptionData.notes,
          issues: receptionData.issues,
          problemasFaltantes: receptionData.issues,
          pendientes: pendientes,
          totalPendientes: pendientes,
          status,
          materials: materialsReception,
          updatedAt: new Date().toISOString()
        }
      });
      
      // Clear form
      setSelectedOrder(null);
      setReceptionData({ received: 0, notes: '', issues: [] });
      setMaterialsReception([]);
    }
  };

  return (
    <div className="bg-card border rounded-lg p-6">
      <div className="flex items-center space-x-2 mb-6">
        <Icon name="Package" className="text-blue-500" size={24} />
        <h2 className="text-xl font-bold">Recepción de Materiales</h2>
        {process.env.NODE_ENV !== 'production' && (
          <div className="ml-3 inline-flex items-center space-x-2">
            <div className="inline-flex items-center px-2 py-0.5 rounded-full bg-gray-100 text-xs text-gray-700 border">
              <span className="font-medium mr-2">Aprobados:</span>
              <span className="font-semibold">{approvedMaterials?.length ?? 0}</span>
              <span className="text-[10px] ml-2 text-muted-foreground">{approvedSource || ''}</span>
            </div>
            <Button size="xs" variant="outline" onClick={handleForceSearch} iconName="Search">Buscar aprobados</Button>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Orders List */}
        <div>
          <h3 className="font-medium mb-3">Órdenes Pendientes</h3>
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {workOrders?.map((order) => {
              const orderKey = order?.ordenTrabajo || order?.id || order?.folio || '';
              const cachedMaterials = orderMaterialsCache[orderKey];
              const existingReception = loadReceptionFromTaller(orderKey);
              
              return (
                <div
                  key={order?.ordenTrabajo || order?.id}
                  onClick={() => handleOrderSelect(order)}
                  className={`p-3 border rounded-lg cursor-pointer transition-colors ${(selectedOrder?.ordenTrabajo || selectedOrder?.id) === (order?.ordenTrabajo || order?.id) ? 'border-primary bg-primary/10' : 'border-muted hover:border-primary/50'}`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <div className="font-medium">{order?.ordenTrabajo || order?.id}</div>
                        {existingReception && (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs bg-blue-100 text-blue-700 border border-blue-200">
                            📋 Recepción guardada
                          </span>
                        )}
                      </div>
                      <div className="text-sm text-muted-foreground">{order?.clientName}</div>
                      {/* Mostrar estadísticas de materiales */}
                      {(() => {
                        const reception = existingReception || { materials: [] };
                        const totalRequired = cachedMaterials?.materials?.reduce((sum, m) => sum + (Number(m.cantidad) || 0), 0) || order?.materials?.total || 0;
                        const totalReceived = reception?.materials?.reduce((sum, m) => sum + (Number(m.received) || 0), 0) || reception?.cantidadRecibida || reception?.received || order?.materials?.received || 0;
                        const totalPending = Math.max(0, totalRequired - totalReceived);
                        
                        return (
                          <div className="text-sm">
                            <div className="flex items-center gap-2">
                              <span className="font-medium">Materiales:</span>
                              <span className="text-green-600 font-semibold">{totalReceived}</span>
                              <span className="text-muted-foreground">/</span>
                              <span className="font-semibold">{totalRequired}</span>
                              {totalPending > 0 && (
                                <>
                                  <span className="text-muted-foreground">•</span>
                                  <span className="text-orange-600 font-medium flex items-center gap-1">
                                    <Icon name="AlertCircle" size={14} />
                                    {totalPending} faltantes
                                  </span>
                                </>
                              )}
                            </div>
                          </div>
                        );
                      })()}
                      
                      {/* Preview de materiales aprobados */}
                      {cachedMaterials && cachedMaterials.materials && cachedMaterials.materials.length > 0 && (
                        <div className="mt-2 text-xs text-green-700 bg-green-50 rounded px-2 py-1">
                          <div className="font-medium">✓ {cachedMaterials.materials.length} materiales aprobados</div>
                          <div className="truncate">
                            {cachedMaterials.materials.slice(0, 2).map(m => 
                              m.descripcion || m.nombre || m.codigo || 'Material'
                            ).join(', ')}
                            {cachedMaterials.materials.length > 2 && '...'}
                          </div>
                        </div>
                      )}
                    </div>

                    <div className={`px-2 py-1 rounded-full text-xs ${order?.materials?.status === 'complete' ? 'bg-green-100 text-green-700' : order?.materials?.status === 'partial' ? 'bg-yellow-100 text-yellow-700' : 'bg-red-100 text-red-700'}`}>
                      {order?.materials?.status === 'complete' ? 'Completo' : order?.materials?.status === 'partial' ? 'Parcial' : 'Pendiente'}
                    </div>
                  </div>

                  {order?.materials?.issues?.length > 0 && (
                    <div className="mt-2 text-xs text-red-600">{order?.materials?.issues?.length} problema(s) reportado(s)</div>
                  )}
                </div>
              );
            })}
          </div>

          {workOrders?.length === 0 && !selectedOrder && (
            <div className="text-center py-8 text-muted-foreground">
              <Icon name="Package" size={48} className="mx-auto mb-2 opacity-50" />
              <div>No hay órdenes pendientes de recepción</div>
            </div>
          )}
          
          {workOrders?.length === 0 && selectedOrder && (
            <div className="p-3 border rounded-lg bg-blue-50 border-blue-200">
              <div className="flex items-center space-x-2 mb-2">
                <Icon name="Info" size={16} className="text-blue-600" />
                <span className="text-sm font-medium text-blue-800">Orden Seleccionada</span>
              </div>
              <div className="text-sm text-blue-700">
                <div className="font-medium">{selectedOrder?.ordenTrabajo || selectedOrder?.id}</div>
                <div>{selectedOrder?.clientName || selectedOrder?.nombreProyecto}</div>
              </div>
              {(() => {
                const orderKey = selectedOrder?.ordenTrabajo || selectedOrder?.id || selectedOrder?.folio || '';
                const cachedMaterials = orderMaterialsCache[orderKey];
                return cachedMaterials && cachedMaterials.materials && cachedMaterials.materials.length > 0 && (
                  <div className="mt-2">
                    <div className="text-xs text-green-700 bg-green-50 rounded px-2 py-1 mb-2">
                      <div className="font-medium">✓ {cachedMaterials.materials.length} materiales aprobados</div>
                    </div>
                    
                    {/* Lista compacta de materiales */}
                    <div className="space-y-1 max-h-32 overflow-y-auto">
                      {cachedMaterials.materials.map((material, idx) => (
                        <div key={idx} className="text-xs bg-white border rounded px-2 py-1">
                          <div className="font-medium text-gray-800 truncate">
                            {material?.descripcion || material?.nombre || material?.producto || material?.name || 'Sin descripción'}
                            {!material?.codigo && <span className="ml-1 text-gray-500">(Manual)</span>}
                          </div>
                          <div className="text-gray-600">
                            <span>Descripción: {material?.descripcion || material?.nombre || '—'}</span>
                            <span className="ml-3">Cant: {material?.cantidadConUnidad || material?.cantidad || 0}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })()}
            </div>
          )}
        </div>

        {/* Reception Form */}
        <div>
          {selectedOrder ? (
            <div className="space-y-4">
              <div className="bg-muted p-4 rounded-lg">
                <h4 className="font-medium mb-2">Verificación Material - {selectedOrder?.ordenTrabajo || selectedOrder?.id}</h4>
                <div className="text-sm space-y-1">
                  <div><strong>Proyecto:</strong> {selectedOrder?.projectRef}</div>
                  <div><strong>Cliente:</strong> {selectedOrder?.clientName}</div>
                  <div><strong>Total requerido:</strong> {selectedOrder?.materials?.total} items</div>
                </div>
              </div>

              {/* Approved materials list (editable): show per-material required/received and allow editing received counts */}
              {materialsReception && materialsReception.length > 0 && (
                <div className="p-3 border rounded-lg bg-white">
                  <h5 className="font-medium mb-2">Materiales aprobados para recepción</h5>
                  <div className="text-sm space-y-3 max-h-64 overflow-y-auto">
                    {materialsReception.map((m, idx) => (
                      <div key={m.key || idx} className="flex items-start justify-between border-b pb-3 gap-4">
                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-sm break-words">
                            {m.descripcion || 'Sin descripción'}
                            {!m.codigo && <span className="ml-2 text-xs text-muted-foreground">(Agregado manualmente)</span>}
                          </div>
                          <div className="text-xs text-muted-foreground mt-1">
                            <span className="font-medium">Requerido:</span> {m.required} • <span className="font-medium">Pendiente:</span> {m.missing}
                          </div>
                        </div>

                        <div className="flex flex-col items-start space-y-2 flex-shrink-0">
                          <div className="text-xs text-muted-foreground whitespace-nowrap ml-0.5">Cantidad recibida</div>
                          <div className="flex items-center space-x-2">
                            <Input
                              type="number"
                              min="0"
                              value={m.received}
                              onChange={(e) => handleMaterialReceivedChange(m.key, e?.target?.value)}
                              className="w-20 text-center"
                            />
                            <Button size="xs" variant="outline" onClick={() => handleMaterialReceivedChange(m.key, m.required)}>Marcar completo</Button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Issues */}
              <div>
                <label className="block text-sm font-medium mb-2">Problemas/Faltantes</label>
                <div className="space-y-2">
                  <div className="flex space-x-2">
                    <Input value={newIssue} onChange={(e) => setNewIssue(e?.target?.value)} placeholder="Describir problema o faltante..." onKeyPress={(e) => e?.key === 'Enter' && handleAddIssue()} />
                    <Button onClick={handleAddIssue} size="sm" iconName="Plus">Agregar</Button>
                  </div>

                  {receptionData?.issues?.map((issue, index) => (
                    <div key={index} className="flex items-center justify-between bg-red-50 p-2 rounded border border-red-200">
                      <span className="text-sm text-red-800">{issue}</span>
                      <Button size="xs" variant="ghost" onClick={() => handleRemoveIssue(index)} iconName="X" className="text-red-600 hover:text-red-800" />
                    </div>
                  ))}
                </div>
              </div>

              {/* Notes */}
              <div>
                <label className="block text-sm font-medium mb-2">Notas Adicionales</label>
                <textarea value={receptionData?.notes} onChange={(e) => setReceptionData(prev => ({ ...prev, notes: e?.target?.value }))} className="w-full p-3 border rounded-lg resize-none" rows={3} placeholder="Observaciones, condiciones especiales, etc..." />
              </div>

              {/* Actions */}
              <div className="flex space-x-2 pt-4">
                <Button onClick={handleSubmitReception} className="flex-1" iconName="Check">
                  {loadReceptionFromTaller(selectedOrder?.ordenTrabajo || selectedOrder?.id || selectedOrder?.folio || '') ? 'Actualizar Recepción' : 'Registrar Recepción'}
                </Button>
                <Button variant="outline" onClick={() => setSelectedOrder(null)}>Cancelar</Button>
              </div>

              {/* Status Alert */}
              {receptionData?.received < (selectedOrder?.materials?.total || 0) && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                  <div className="flex items-start space-x-2">
                    <Icon name="AlertTriangle" size={16} className="text-yellow-600 mt-0.5" />
                    <div className="text-sm">
                      <div className="font-medium text-yellow-800">Material Incompleto</div>
                      <div className="text-yellow-700">Se reportarán faltantes a Proyectos y se esperará reposición</div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <Icon name="MousePointer" size={48} className="mx-auto mb-2 opacity-50" />
              <div>Seleccione una orden para verificar materiales</div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// Normalize articles to a canonical 'article' shape and aggregate duplicates by code/description
const normalizeAndAggregate = (arr) => {
  if (!Array.isArray(arr)) return [];

  const parseQuantity = (q) => {
    if (q == null) return 0;
    if (typeof q === 'number') return q;
    const s = String(q).replace(/,/g, '.');
    const m = s.match(/[-+]?[0-9]*\.?[0-9]+/);
    return m ? Number(m[0]) : 0;
  };

  const normalizeItem = (it) => {
    const codigo = it?.codigo || it?.id || '';
    // Priorizar nombre/descripción con más opciones de campos
    const descripcion = it?.descripcion || it?.nombre || it?.nombreMaterial || it?.producto || it?.name || it?.item || (codigo ? '' : 'Sin descripción');
    // try to extract numeric quantity from different fields
    const qty = parseQuantity(it?.cantidadConUnidad ?? it?.cantidad ?? it?.qty ?? it?.required ?? it?.cantidad_total ?? it?.cantidadTotal);
    // try to extract unit if present in cantidadConUnidad
    let unit = '';
    if (it?.unidad) unit = it.unidad;
    else if (it?.cantidadConUnidad) {
      const m = String(it.cantidadConUnidad).match(/[a-zA-Z%]+/);
      unit = m ? m[0] : '';
    }
    return {
      codigo,
      descripcion,
      cantidad: qty,
      unidad: unit,
      cantidadConUnidad: `${qty}${unit ? ` ${unit}` : ''}`,
      costoUnitario: it?.costoUnitario || it?.precioUnitario || it?.unitPrice,
      subtotal: it?.subtotal,
      raw: it
    };
  };

  const map = new Map();
  arr.forEach(it => {
    const n = normalizeItem(it);
    const key = (n.codigo || n.descripcion || '').toString().toLowerCase().trim();
    if (!map.has(key)) map.set(key, { ...n });
    else {
      const exist = map.get(key);
      exist.cantidad = (Number(exist.cantidad) || 0) + (Number(n.cantidad) || 0);
      exist.cantidadConUnidad = `${exist.cantidad}${exist.unidad ? ` ${exist.unidad}` : ''}`;
      // preserve costoUnitario/subtotal if present on one of them
      if (!exist.costoUnitario && n.costoUnitario) exist.costoUnitario = n.costoUnitario;
      if (!exist.subtotal && n.subtotal) exist.subtotal = n.subtotal;
    }
  });

  return Array.from(map.values());
};

export default MaterialReceptionPanel;