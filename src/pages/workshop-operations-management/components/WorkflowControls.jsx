import React from 'react';
import Icon from '../../../components/AppIcon';
import Button from '../../../components/ui/Button';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import requisiService from '../../../services/requisiService';
import useGastos from '../../../hooks/useGastos';

        

  const WorkflowControls = ({ selectedOrder, currentShift, totalOrders, workOrdersIds = [], workOrders = [], onForceRemove, onRevertStatus, localMissingByOrder = {} }) => {
          const isWorkingHours = currentShift === 'morning';
    const { getGastos } = useGastos();
          const selectedMissingPPE = Array.isArray(selectedOrder?.safetyChecklistMissing)
            ? selectedOrder.safetyChecklistMissing
            : (Array.isArray(selectedOrder?.raw?.safetyChecklistMissing) ? selectedOrder.raw.safetyChecklistMissing : []);
          const resolvePriority = () => {
            if (!selectedOrder) return '';
            // direct values
            const direct = selectedOrder?.prioridadLabel || selectedOrder?.prioridad || selectedOrder?.priorityValue || selectedOrder?.raw?.prioridad || selectedOrder?.raw?.priority || '';
            if (direct) return direct;

            // try matching related records in provided workOrders prop
            try {
              const candidates = [];
              // possible keys on selectedOrder/raw: id, ordenTrabajo, trabajoId
              if (selectedOrder?.id) candidates.push(String(selectedOrder.id));
              if (selectedOrder?.ordenTrabajo) candidates.push(String(selectedOrder.ordenTrabajo));
              if (selectedOrder?.raw?.trabajoId) candidates.push(String(selectedOrder.raw.trabajoId));
              if (selectedOrder?.raw?.id) candidates.push(String(selectedOrder.raw.id));

              for (const w of (workOrders || [])) {
                if (!w) continue;
                const keys = [w?.id, w?.ordenTrabajo, w?.trabajoId, (w?.raw && w.raw?.trabajoId), (w?.raw && w.raw?.id)].filter(Boolean).map(String);
                if (keys.some(k => candidates.includes(k))) {
                  const p = w?.prioridad || w?.prioridadLabel || w?.priority || w?.priorityLabel || (w?.raw && (w.raw.prioridad || w.raw.priority)) || '';
                  if (p) return p;
                }
              }
            } catch (e) {
              // ignore
            }

            // last resort: use estado if it looks like a priority
            try {
              const estado = (selectedOrder?.raw?.estado || selectedOrder?.raw?.status || selectedOrder?.estado || selectedOrder?.status || '').toString();
              if (estado) {
                const low = estado.toLowerCase();
                if (['alta','high','urgent','urgente','crítica','critica','media','baja','low'].some(s => low.includes(s))) return selectedOrder?.raw?.estado || estado;
              }
            } catch (e) {}

            return '';
          };

          // helpers moved into component scope to avoid returning objects into JSX
          const formatProgress = (p) => {
            if (p === null || p === undefined || p === '') return '0%';
            // Normalize into a numeric value removing non-numeric characters except dot and minus
            const normalizeToNumber = (val) => {
              if (typeof val === 'number') return val;
              if (typeof val !== 'string') return NaN;
              const s = val.trim();
              // if contains percent sign, strip it but keep decimal
              const cleaned = s.replace(/[^0-9.+-]/g, '');
              const n = Number(cleaned);
              return Number.isFinite(n) ? n : NaN;
            };

            const num = normalizeToNumber(p);
            if (Number.isNaN(num)) return String(p);

            let percent = num;
            // If it's clearly a fraction (0 < num <= 1) treat as fraction
            if (percent > 0 && percent <= 1) {
              percent = percent * 100;
            } else if (percent > 100) {
              // If it's an unexpectedly large number (e.g. 1500) try dividing by 100 (common scale issues)
              const maybe = percent / 100;
              if (maybe > 0 && maybe <= 100) percent = maybe;
              // otherwise leave as-is (will be rounded)
            }
            if (percent < 0) percent = 0;
            if (percent > 100) percent = 100;

            return `${Math.round(percent)}%`;
          };

          const formatDate = (v) => {
            if (!v && v !== 0) return '';
            try {
              // If value is a plain YYYY-MM-DD string, construct a local Date to avoid timezone shifts
              if (typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v)) {
                const [y, m, d] = v.split('-').map(Number);
                const dt = new Date(y, m - 1, d); // local date
                return dt.toLocaleDateString(undefined, { day: '2-digit', month: 'short', year: 'numeric' });
              }
              const d = (v instanceof Date) ? v : new Date(v);
              if (Number.isNaN(d.getTime())) return String(v);
              return d.toLocaleDateString(undefined, { day: '2-digit', month: 'short', year: 'numeric' });
            } catch (e) {
              return String(v);
            }
          };

          // Generate a PDF report for the selected order.
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
// --------------------------------------------
// GENERATE PDF - DISEÑO BONITO + DATOS COMPLETOS
// --------------------------------------------
const generateReport = async () => {
  if (!selectedOrder) return;

  // --------------------------------------------
  // CARGAR MATERIALES DESDE MATERIAL RECEPTION PANEL
  // --------------------------------------------
  let receptionMaterials = [];

  try {
    const resp = await inventoryService.getReceptionMaterials(selectedOrder?.ordenTrabajo);
    if (resp?.success && Array.isArray(resp.data)) {
      receptionMaterials = resp.data;
      console.log("Materiales recepción cargados:", receptionMaterials);
    }
  } catch (err) {
    console.error("Error cargando materiales recepción", err);
  }

  // --------------------------------------------
  // PROGRESO (DELTA) - SIN CAMBIOS
  // --------------------------------------------
  const normalizeKey = (v) => String(v || '').toLowerCase().replace(/[^a-z0-9]/g, '');
  const onlyDigits = (v) => (String(v || '').match(/\d+/g) || []).join('');

  const computeDailyProgressDelta = () => {
    try {
      const raw = selectedOrder?.raw || {};
      const todayKey = (d) => `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
      const today = todayKey(new Date());

      const candidates = raw.progressHistory || raw.progress_logs ||
                         raw.updates || raw.progressUpdates ||
                         raw.progreso_historial || raw.history ||
                         raw.progress_log || null;

      if (Array.isArray(candidates) && candidates.length) {
        const entries = candidates.map(e => {
          if (typeof e === 'number') return { date: today, value: Number(e) };
          if (typeof e === 'string') {
            const m = e.match(/(\d{4}-\d{2}-\d{2}).*?([0-9+.\-%]+)/);
            if (m) return { date: m[1], value: Number(String(m[2]).replace('%','')) };
            return { date: today, value: Number(e.replace(/[^0-9.+-]/g,'')) };
          }
          return { date: (e.date || e.fecha || e.d) || today, value: Number(e.value ?? e.progreso ?? e.progress ?? e.porcentaje ?? 0) };
        });

        const todays = entries.filter(en => String(en.date).startsWith(today));
        if (todays.length >= 2) return Math.round((todays.at(-1).value - todays[0].value) * 100) / 100;
        if (todays.length === 1) {
          const before = entries.filter(en => !String(en.date).startsWith(today)).sort((a,b)=> new Date(a.date)-new Date(b.date)).pop();
          if (before) return Math.round((todays[0].value - before.value) * 100) / 100;
          return Math.round((todays[0].value) * 100) / 100;
        }
      }
      const cur = Number(selectedOrder?.progress ?? selectedOrder?.progreso ?? 0);
      const prev = Number(selectedOrder?.raw?.previousProgress ?? selectedOrder?.previousProgress ?? 0);
      if (!Number.isNaN(cur) && !Number.isNaN(prev)) return Math.round((cur - prev) * 100) / 100;
      return null;
    } catch { return null; }
  };

  // --------------------------------------------
  // MATERIALES - AHORA USARÁ RECEPCIÓN
  // --------------------------------------------
  const buildMaterials = () => {
    // 1️⃣ Si existen materiales de recepción, usar esos
    if (Array.isArray(receptionMaterials) && receptionMaterials.length > 0) {
      return receptionMaterials.map(m => {
        const required = Number(m.requerido ?? m.cantidad ?? m.required ?? 0);
        const received = Number(m.recibido ?? m.entregado ?? m.received ?? 0);

        return {
          name: m.material || m.nombre || "Material",
          required,
          received,
          missing: Math.max(0, required - received)
        };
      });
    }

    // 2️⃣ Fallback a selectedOrder.materials (si no hubiera recepción)
    const raw = selectedOrder?.materials || [];
    return raw.map(it => ({
      name: it.name || it.nombre || "Material",
      required: Number(it.required ?? it.cantidad ?? 0),
      received: Number(it.received ?? it.recibido ?? 0),
      missing: Math.max(0, (it.required ?? 0) - (it.received ?? 0))
    }));
  };

  // --------------------------------------------
  // PDF
  // --------------------------------------------
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const margin = 40;

  // ENCABEZADO
  doc.setFillColor(10, 74, 138);
  doc.rect(0, 0, 595.28, 40, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(18);
  doc.text("REPORTE DE ORDEN", 595.28 / 2, 25, { align: "center" });

  doc.setTextColor("#333");

  // TÍTULO
  const title = `Orden: ${selectedOrder?.ordenTrabajo || selectedOrder?.id || ""}`;
  doc.setFontSize(14);
  doc.text(title, margin, 70);

  doc.setFontSize(10);
  doc.text(`Generado: ${new Date().toLocaleString()}`, margin, 88);

  // --------------------------------------------
  // TABLA INFO
  // --------------------------------------------
  const rows = [];
  rows.push(["Orden Trabajo", String(selectedOrder?.ordenTrabajo || selectedOrder?.id || "")]);
  rows.push(["Cliente", String(selectedOrder?.clientName || selectedOrder?.cliente?.nombre || "")]);

  const progress = Number(selectedOrder?.progress ?? selectedOrder?.progreso ?? 0);
  const delta = computeDailyProgressDelta();

  rows.push(["Progreso", `${progress}%`]);
  if (delta !== null) rows.push(["Avance del día", `${delta >= 0 ? "+" : ""}${delta}%`]);

  rows.push(["Prioridad", selectedOrder?.prioridad || ""]);
  rows.push(["Fecha Límite", selectedOrder?.fechaLimite || "-"]);

  const techs =
    (Array.isArray(selectedOrder?.tecnicos)
      ? selectedOrder.tecnicos
      : selectedOrder?.tecnicoAsignado
      ? [selectedOrder.tecnicoAsignado]
      : []
    )
      .map(t => t?.nombre || t?.name || "")
      .join(", ");

  rows.push(["Técnicos", techs]);
  rows.push(["Flujo Actual", selectedOrder?.estado || selectedOrder?.status || ""]);

  if (selectedOrder?.safetyChecklistCompleted) {
    rows.push(["Check Seguridad", "Completado"]);
  }

  doc.autoTable({
    startY: 110,
    head: [["Campo", "Valor"]],
    body: rows,
    theme: "grid",
    styles: { fontSize: 10 },
    headStyles: { fillColor: [10, 74, 138], textColor: 255 }
  });

  // --------------------------------------------
  // TABLA MATERIALES (RECEPCIÓN REAL)
  // --------------------------------------------
  let cursorY = doc.lastAutoTable.finalY + 20;
  const materials = buildMaterials();

  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.text("Materiales Recepcionados", margin, cursorY);

  doc.autoTable({
    startY: cursorY + 10,
    head: [["Material", "Requerido", "Recibido", "Faltante"]],
    body: materials.map(m => [m.name, m.required, m.received, m.missing]),
    theme: "grid",
    styles: { fontSize: 9 },
    headStyles: { fillColor: [10, 74, 138], textColor: 255 }
  });

  // --------------------------------------------
  // GUARDAR PDF
  // --------------------------------------------
  doc.save(`Reporte_Orden_${selectedOrder?.ordenTrabajo || selectedOrder?.id || ""}.pdf`);
};



          return (
            <div className="bg-card border rounded-lg p-4">
              <h3 className="font-medium mb-4 flex items-center space-x-2">
                <Icon name="Settings" size={20} />
                <span>Controles Operativos</span>
              </h3>

              {/* Shift Status */}
              <div className="mb-4 p-3 bg-muted rounded-lg">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-medium">Estado del Turno</div>
                    <div className="text-sm text-muted-foreground">8:00 - 18:00</div>
                  </div>
                  <div className={`px-3 py-1 rounded-full text-sm font-medium ${
                    isWorkingHours 
                      ? 'bg-green-100 text-green-700' :'bg-red-100 text-red-700'
                  }`}>
                    {isWorkingHours ? 'Activo' : 'Inactivo'}
                  </div>
                </div>
              </div>

              {/* Order Summary */}
              <div className="mb-4">
                <div className="text-sm text-muted-foreground mb-2">Resumen Órdenes</div>
                <div className="text-2xl font-bold">{totalOrders}</div>
                <div className="text-sm text-muted-foreground">Órdenes activas</div>
              </div>

              

              {/* Selected Order Info */}
              {selectedOrder && (
                <div className="mb-4 p-3 bg-primary/10 rounded-lg border border-primary/20 overflow-hidden">
                  <div className="font-medium mb-2 text-center">Orden Seleccionada</div>
                  <div className="text-sm grid grid-cols-2 gap-3">
                    {/* helpers defined in component scope: formatProgress, formatDate */}
                    <div className="truncate">
                      <strong className="block">Orden Trabajo</strong>
                      <span className="block mt-1 font-medium">{selectedOrder?.ordenTrabajo || selectedOrder?.id}</span>
                    </div>

                    <div className="truncate">
                      <strong className="block">Progreso</strong>
                      <span className="block mt-1">
                        {(() => {
                          // Collect possible progress sources (many aliases)
                          const candidates = [
                            selectedOrder?.progress,
                            selectedOrder?.progreso,
                            selectedOrder?.raw?.progreso,
                            selectedOrder?.raw?.estadoProgreso,
                            selectedOrder?.raw?.progress,
                            selectedOrder?.raw?.estado,
                            selectedOrder?.raw?.porcentaje,
                            selectedOrder?.porcentaje,
                          ].filter(v => v !== undefined && v !== null);

                          // normalize helper (reuse logic similar to formatProgress but return numeric percent)
                          const normalizeNumericPercent = (val) => {
                            if (val === null || val === undefined || val === '') return NaN;
                            const s = (typeof val === 'string') ? val.trim() : String(val);
                            // strip non numeric except dot and minus
                            const cleaned = s.replace(/[^0-9.+-]/g, '');
                            const n = Number(cleaned);
                            if (Number.isNaN(n)) return NaN;
                            let num = n;
                            if (num > 0 && num <= 1) num = num * 100;
                            else if (num > 100) {
                              const maybe = num / 100;
                              if (maybe > 0 && maybe <= 100) num = maybe;
                            }
                            if (num < 0) num = 0;
                            if (num > 100) num = 100;
                            return num;
                          };

                          let best = NaN;
                          for (const c of candidates) {
                            const n = normalizeNumericPercent(c);
                            if (Number.isNaN(n)) continue;
                            // prefer values that look like whole percentages (>=1)
                            if (n >= 1 && (Number.isNaN(best) || n > best)) {
                              best = n; // pick the largest clear percentage
                            } else if (Number.isNaN(best)) {
                              best = n;
                            }
                          }

                          // fallback to any available raw if none normalized
                          const fallback = candidates.length ? candidates[0] : null;

                          if (!Number.isNaN(best)) return formatProgress(best);
                          if (fallback !== null && fallback !== undefined) return formatProgress(fallback);
                          return '0%';
                        })()}
                      </span>
                    </div>

                    <div className="col-span-2">
                      <strong className="block">Cliente</strong>
                      <span className="block mt-1 break-words">{selectedOrder?.clientName || selectedOrder?.clientLabel || (selectedOrder?.cliente && (selectedOrder.cliente.nombre || selectedOrder.cliente)) || ''}</span>
                    </div>

                    <div className="col-span-2">
                      <strong className="block">Proyecto</strong>
                      <span className="block mt-1 break-words">
                        {(
                          selectedOrder?.projectRef ||
                          selectedOrder?.proyectoNombre ||
                          selectedOrder?.raw?.proyecto ||
                          selectedOrder?.raw?.projectName ||
                          selectedOrder?.raw?.project ||
                          selectedOrder?.project?.name ||
                          selectedOrder?.project?.nombre ||
                          ''
                        )}
                      </span>
                    </div>

                    <div className="truncate">
                      <strong className="block">Prioridad</strong>
                      <span className="block mt-1">{(resolvePriority()) || selectedOrder?.raw?.prioridad || selectedOrder?.raw?.estado || selectedOrder?.estado || ''}</span>
                    </div>

                    <div className="truncate">
                      <strong className="block">Fecha límite</strong>
                      <span className="block mt-1">
                        {(() => {
                          const rawDate = selectedOrder?.fechaLimite || selectedOrder?.estimatedCompletion || selectedOrder?.proyectoFecha || selectedOrder?.raw?.fechaLimite || selectedOrder?.raw?.fecha || selectedOrder?.raw?.estimatedCompletion || selectedOrder?.raw?.fechaEstimada || '';
                          try {
                            return formatDate(rawDate);
                          } catch (e) {
                            return rawDate || '';
                          }
                        })()}
                      </span>
                    </div>

                    {/* Materiales - recibidos y faltantes */}
                    <div className="col-span-2 mt-1">
                      <strong className="block mb-1">Materiales</strong>
                      {(() => {
                        const reception = selectedOrder?.recepcionMateriales || selectedOrder?.raw?.recepcionMateriales || { materials: [] };
                        const materials = selectedOrder?.materials;
                        
                        // Calcular totales desde recepcionMateriales si existen
                        const totalReceived = reception?.materials?.reduce((sum, m) => sum + (Number(m.received) || 0), 0) || reception?.cantidadRecibida || reception?.received || materials?.received || 0;
                        const totalRequired = reception?.materials?.reduce((sum, m) => sum + (Number(m.required) || 0), 0) || materials?.total || 0;
                        const totalPending = Math.max(0, totalRequired - totalReceived);
                        
                        return (
                          <div className="flex items-center gap-2 text-sm">
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
                        );
                      })()}
                    </div>

                    {/* Técnicos ocupa toda la fila en caso de necesitar más espacio */}
                    {(() => {
                      const fromSelected = (selectedOrder?.assignedTechnicians || selectedOrder?.tecnicoAsignado || selectedOrder?.tecnicos || []);
                      let techArray = Array.isArray(fromSelected) ? fromSelected : (fromSelected ? [fromSelected] : []);
                      if (!techArray.length && selectedOrder?.raw) {
                        const rawTech = selectedOrder.raw.tecnicoAsignado || selectedOrder.raw.tecnicos || selectedOrder.raw.assignedTechnicians || null;
                        if (rawTech) techArray = Array.isArray(rawTech) ? rawTech : [rawTech];
                      }
                      if (!techArray.length) return null;
                      const names = techArray.map(t => (t?.name || t?.nombre || (typeof t === 'string' ? t : ''))).filter(Boolean);
                      if (!names.length) return null;
                      return (
                        <div className="truncate col-span-2 mt-1">
                          <strong className="block">Técnicos</strong>
                          <span className="block mt-1">{names.join(', ')}</span>
                        </div>
                      );
                    })()}
                  </div>
                </div>
              )}

              {/* Quick Actions */}
              <div className="space-y-2">
                {selectedOrder && (
                  <Button
                    size="sm"
                    variant="outline"
                    className="w-full"
                    iconName="RefreshCw"
                    onClick={() => onRevertStatus?.(selectedOrder)}
                  >
                    Regresar progreso
                  </Button>
                )}
                <Button
                  size="sm"
                  variant="outline"
                  className="w-full"
                  iconName="FileText"
                  onClick={async () => {
                    try {
                      await generateReport();
                    } catch (e) {
                      // fallback: no-op
                    }
                  }}
                >
                  Generar Reporte
                </Button>
                
                
              </div>

              {/* Working Hours Reminder */}
              {!isWorkingHours && (
                <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <div className="flex items-start space-x-2">
                    <Icon name="AlertTriangle" size={16} className="text-yellow-600 mt-0.5" />
                    <div className="text-sm">
                      <div className="font-medium text-yellow-800">Fuera de Horario</div>
                      <div className="text-yellow-700">
                        Turno de trabajo: 8:00 - 18:00
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        };

        export default WorkflowControls;