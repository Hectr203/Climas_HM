import React, { useState, useEffect, Fragment, useRef } from 'react';
import Icon from '../../../components/AppIcon';
import Button from '../../../components/ui/Button';
import Input from '../../../components/ui/Input';
import useQuotation from '../../../hooks/useQuotation';
import usePrecio from '../../../hooks/usePrecio';
import { useNotifications } from '../../../context/NotificationContext';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

const CATEGORY_CONFIG = [
  { code: 1, name: 'EQUIPO' },
  { code: 2, name: 'MATERIALES' },
  { code: 3, name: 'MANO DE OBRA' },
  { code: 4, name: 'HERRAMIENTA' },
  { code: 5, name: 'FLETES Y GRUAS' },
];

const UNIT_OPTIONS = ['Pza', 'kg', 'Jgo', 'm', 'h', '%', 'ton', 'ml', 'l', 'caja'];

const formatCurrency = (amount) => {
  if (amount === null || amount === undefined || Number.isNaN(Number(amount))) return '$0.00';
  return new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency: 'MXN',
  }).format(Number(amount));
};

const getCurrentDate = () => {
  const today = new Date();
  return today.toLocaleDateString('es-MX', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
};

const ViewUnitPrices = ({ quotation, onUpdate }) => {
  const {
    updateMaterialesYRiesgos,
    getCotizacionById,
    loading: quotationLoading,
  } = useQuotation();

  const {
    getPreciosByCotizacion,
    createPrecio,
    updatePrecio,
    deletePrecio,
    loading: preciosLoading,
  } = usePrecio();

  const { showSuccess, showError } = useNotifications();

  const [materials, setMaterials] = useState([]);
  const [riskAssessment, setRiskAssessment] = useState({
    overall: 'low',
    factors: [],
    extraCostsPrevention: true,
  });

  const [newMaterial, setNewMaterial] = useState({
    categoryCode: 2,
    unit: '',
    item: '',
    quantity: '',
    cost: 0,
    risk: 'low',
  });

  const [loadingMaterials, setLoadingMaterials] = useState(false);
  const [showUnitView, setShowUnitView] = useState(false);

  // Logo con fallback
  const [logoIndex, setLogoIndex] = useState(0);
  const [logoLoadError, setLogoLoadError] = useState(false);
  const logoCandidates = [
    '/assets/images/climas-hm-logo.png',
    '/assets/images/logodeclimas.jpg',
    '/assets/images/WhatsApp_Image_2025-09-24_at_8.13.50_PM-1759346787603.jpeg',
    '/assets/images/no_image.png',
  ];

  // Ref para PDF
  const previewRef = useRef(null);

  /* ================== CARGA ================== */
  useEffect(() => {
    async function fetchMateriales() {
      if (!quotation?.id) return;

      setLoadingMaterials(true);
      try {
        const [preciosList, cotizacionCompleta] = await Promise.all([
          getPreciosByCotizacion(quotation.id, { force: true }),
          getCotizacionById(quotation.id),
        ]);

        if (Array.isArray(preciosList) && preciosList.length > 0) {
          setMaterials(preciosList);
        } else if (cotizacionCompleta?.materiales) {
          setMaterials(cotizacionCompleta.materiales);
        } else if (quotation?.materials) {
          setMaterials(quotation.materials);
        }

        if (cotizacionCompleta?.riskAssessment) {
          setRiskAssessment(cotizacionCompleta.riskAssessment);
        } else if (quotation?.riskAssessment) {
          setRiskAssessment(quotation.riskAssessment);
        }
      } catch (error) {
        console.error('Error al cargar materiales:', error);
      } finally {
        setLoadingMaterials(false);
      }
    }

    fetchMateriales();
  }, [quotation?.id]);

  /* ================== HELPERS ================== */

  const computeImporte = (m) =>
    ((parseFloat(m?.quantity) || 0) * (parseFloat(m?.cost) || 0)) || 0;

  const subtotalByCategory = (code) =>
    materials
      .filter((m) => m.categoryCode === code)
      .reduce((sum, m) => sum + computeImporte(m), 0);

  const totalCost = materials.reduce((sum, m) => sum + computeImporte(m), 0);

  // Ordenar SOLO para la vista documento
  const materialsForDoc = [...materials].sort((a, b) => {
    const ca = a?.categoryCode ?? 0;
    const cb = b?.categoryCode ?? 0;
    return ca - cb;
  });

  // Datos de cliente / proyecto para el documento
  const clientName =
    quotation?.clientName ||
    quotation?.cliente?.nombre ||
    quotation?.cliente ||
    'Cliente no especificado';

  const clientRFC =
    quotation?.clientRFC ||
    quotation?.cliente?.rfc ||
    'No disponible';

  const clientAddress =
    quotation?.clientAddress ||
    quotation?.cliente?.direccion ||
    quotation?.direccionProyecto ||
    'Dirección no disponible';

  const clientContact =
    quotation?.clientContact ||
    quotation?.cliente?.contacto ||
    'No especificado';

  const clientPhone =
    quotation?.clientPhone ||
    quotation?.cliente?.telefono ||
    'No disponible';

  const clientEmail =
    quotation?.clientEmail ||
    quotation?.cliente?.email ||
    'No disponible';

  const projectName =
    quotation?.projectName ||
    quotation?.proyecto?.nombre ||
    'Proyecto sin nombre';

  const projectDescription =
    quotation?.projectDescription ||
    quotation?.proyecto?.descripcion ||
    quotation?.descripcionProyecto ||
    'Sin descripción disponible';

  const projectLocation =
    quotation?.projectLocation ||
    quotation?.ubicacionProyecto ||
    'Ubicación no especificada';

  const projectType =
    (quotation?.projectType || quotation?.tipoProyecto || 'No especificado').toUpperCase();

  /* ================== HANDLERS ================== */

  const handleMaterialChange = (index, field, value) => {
    setMaterials((prev) =>
      prev.map((m, i) => (i === index ? { ...m, [field]: value } : m)),
    );
  };

  const addMaterial = async () => {
    if (!newMaterial.item.trim()) return;
    if (!quotation?.id) {
      showError('No hay cotización asociada.');
      return;
    }

    const payload = {
      cotizacionId: quotation.id,
      categoryCode: newMaterial.categoryCode,
      unit: newMaterial.unit,
      item: newMaterial.item,
      quantity: newMaterial.quantity,
      cost: newMaterial.cost,
      risk: newMaterial.risk,
    };

    try {
      const created = await createPrecio(payload);
      setMaterials((prev) => [...prev, created ?? { id: Date.now(), ...payload }]);

      setNewMaterial({
        categoryCode: 2,
        unit: '',
        item: '',
        quantity: '',
        cost: 0,
        risk: 'low',
      });

      showSuccess('Material agregado');
    } catch (error) {
      console.error('Error al crear material:', error);
      showError('Error al agregar material');
    }
  };

  const removeMaterial = async (index) => {
    const currentMaterials = [...materials];
    const materialToRemove = currentMaterials[index];

    setMaterials(currentMaterials.filter((_, i) => i !== index));

    const id = materialToRemove?.id ?? materialToRemove?._id;
    if (!id) return;

    try {
      await deletePrecio(id);
      showSuccess('Precio Unitario eliminado');
    } catch (error) {
      console.error('Error al eliminar Precio Unitario:', error);
      showError('Error al eliminar Precio Unitario');
      setMaterials(currentMaterials);
    }
  };

  const handleSave = async () => {
    if (!quotation?.id) {
      showError('No hay cotización asociada.');
      return;
    }

    try {
      await Promise.all(
        materials.map((m) => {
          const id = m.id ?? m._id;
          const payload = {
            cotizacionId: quotation.id,
            categoryCode: m.categoryCode,
            unit: m.unit,
            item: m.item,
            quantity: m.quantity,
            cost: m.cost,
            risk: m.risk ?? 'low',
          };

          if (!id) return createPrecio(payload);
          return updatePrecio(id, payload);
        }),
      );

      const materialesParaCotizacion = materials.map((m) => ({
        ...m,
        quantity:
          m.quantity == null
            ? ''
            : typeof m.quantity === 'number'
            ? m.quantity.toString()
            : m.quantity,
        cost:
          m.cost == null
            ? 0
            : typeof m.cost === 'string'
            ? parseFloat(m.cost || '0')
            : m.cost,
      }));

      await updateMaterialesYRiesgos(quotation.id, {
        materiales: materialesParaCotizacion,
        riskAssessment,
      });

      showSuccess('Checklist guardado correctamente');

      onUpdate?.({
        materials,
        riskAssessment,
      });
    } catch (error) {
      console.error(error);
      showError('Error al guardar');
    }
  };

  const handleExportPDF = async () => {
    if (!previewRef.current) {
      showError('No se encontró el contenido para exportar');
      return;
    }

    try {
      const element = previewRef.current;

      const canvas = await html2canvas(element, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: '#ffffff',
      });

      const imgData = canvas.toDataURL('image/jpeg', 1.0);
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();

      const imgWidth = canvas.width;
      const imgHeight = canvas.height;

      let ratio = pdfWidth / imgWidth;
      let imgHeightScaled = imgHeight * ratio;

      if (imgHeightScaled > pdfHeight) {
        ratio = pdfHeight / imgHeight;
        imgHeightScaled = pdfHeight;
      }

      const imgX = (pdfWidth - imgWidth * ratio) / 2;
      const imgY = 0;

      pdf.addImage(imgData, 'JPEG', imgX, imgY, imgWidth * ratio, imgHeightScaled);
      pdf.save(`PreciosUnitarios-${quotation?.id || 'cotizacion'}.pdf`);
    } catch (error) {
      console.error('Error al generar PDF:', error);
      showError('Error al generar el PDF de precios unitarios');
    }
  };

  if (loadingMaterials || preciosLoading) {
    return (
      <div className="flex items-center justify-center h-60">
        <div className="text-center">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary mx-auto mb-4" />
          <p className="text-muted-foreground">Cargando...</p>
        </div>
      </div>
    );
  }

  /* ================== RENDER ================== */

  return (
    <div className="space-y-6">
      {/* HEADER */}
      <div className="flex items-center justify-between">
        <h3 className="text-xl font-semibold">Checklist de Precios Unitarios</h3>

        <div className="flex items-center gap-2">
          <Button
            iconName={showUnitView ? 'EyeOff' : 'Eye'}
            iconPosition="left"
            variant="secondary"
            onClick={() => setShowUnitView((prev) => !prev)}
          >
            {showUnitView ? 'Ocultar Vista Documento' : 'Vista Precio Unitario'}
          </Button>

          {showUnitView && (
            <Button
              iconName="Download"
              iconPosition="left"
              variant="outline"
              onClick={handleExportPDF}
            >
              Descargar PDF
            </Button>
          )}

          <Button
            onClick={handleSave}
            iconName="Save"
            iconPosition="left"
            disabled={quotationLoading || preciosLoading}
          >
            Guardar Checklist
          </Button>
        </div>
      </div>

      {/* TOTAL */}
      <div className="text-sm text-muted-foreground">
        Total estimado: <strong>{formatCurrency(totalCost)}</strong>
      </div>

      {/* TABLA PRINCIPAL (EDICIÓN) */}
      <div className="bg-card border rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-muted/50">
              <tr>
                <th className="px-4 py-3 w-16 text-left text-sm">Código</th>
                <th className="px-4 py-3 w-32 text-left text-sm">Unidad</th>
                <th className="px-4 py-3 text-left text-sm">Descripción</th>
                <th className="px-4 py-3 w-24 text-left text-sm">Cantidad</th>
                <th className="px-4 py-3 w-28 text-left text-sm">Costo</th>
                <th className="px-4 py-3 w-32 text-left text-sm">Importe</th>
                <th className="px-4 py-3 w-16 text-left text-sm">Acciones</th>
              </tr>
            </thead>

            <tbody>
              {CATEGORY_CONFIG.map((cat) => {
                const catMaterials = materials.filter(
                  (m) => m.categoryCode === cat.code,
                );

                return (
                  <Fragment key={cat.code}>
                    {/* Encabezado de categoría */}
                    <tr className="bg-sky-50 border-t border-border">
                      <td className="text-center font-semibold text-sky-700">
                        {cat.code}
                      </td>
                      <td
                        colSpan={6}
                        className="font-semibold text-sky-700 px-4 py-2"
                      >
                        {cat.name}
                      </td>
                    </tr>

                    {/* Materiales */}
                    {catMaterials.map((m) => {
                      const rowIndex = materials.indexOf(m);
                      return (
                        <tr
                          key={m.id ?? m._id ?? rowIndex}
                          className="border-t border-border"
                        >
                          <td />

                          {/* Unidad */}
                          <td className="px-4 py-2">
                            <select
                              value={m.unit ?? ''}
                              onChange={(e) =>
                                handleMaterialChange(
                                  rowIndex,
                                  'unit',
                                  e.target.value,
                                )
                              }
                              className="w-full px-2 py-1 border rounded text-sm"
                            >
                              <option value="">Seleccione…</option>
                              {UNIT_OPTIONS.map((u) => (
                                <option key={u} value={u}>
                                  {u}
                                </option>
                              ))}
                            </select>
                          </td>

                          {/* Descripción */}
                          <td className="px-4 py-2">
                            <Input
                              value={m.item ?? ''}
                              onChange={(e) =>
                                handleMaterialChange(
                                  rowIndex,
                                  'item',
                                  e.target.value,
                                )
                              }
                              size="sm"
                            />
                          </td>

                          {/* Cantidad */}
                          <td className="px-4 py-2">
                            <Input
                              value={m.quantity ?? ''}
                              onChange={(e) =>
                                handleMaterialChange(
                                  rowIndex,
                                  'quantity',
                                  e.target.value,
                                )
                              }
                              size="sm"
                              type="number"
                            />
                          </td>

                          {/* Costo */}
                          <td className="px-4 py-2">
                            <Input
                              value={m.cost ?? 0}
                              onChange={(e) =>
                                handleMaterialChange(
                                  rowIndex,
                                  'cost',
                                  parseFloat(e.target.value) || 0,
                                )
                              }
                              size="sm"
                              type="number"
                            />
                          </td>

                          {/* Importe */}
                          <td className="px-4 py-2 font-medium">
                            {formatCurrency(computeImporte(m))}
                          </td>

                          {/* Acciones */}
                          <td className="px-4 py-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              iconName="Trash2"
                              className="text-red-600"
                              onClick={() => removeMaterial(rowIndex)}
                            />
                          </td>
                        </tr>
                      );
                    })}

                    {/* SUBTOTAL (MISMO ESTILO QUE TENÍAS) */}
                    <tr className="bg-muted/40 border-t border-border">
                      <td />
                      <td
                        colSpan={4}
                        className="px-4 py-2 text-right font-medium"
                      >
                        Subtotal {cat.name.toLowerCase()}:
                      </td>
                      <td className="font-semibold px-4 py-2">
                        {formatCurrency(subtotalByCategory(cat.code))}
                      </td>
                      <td />
                    </tr>
                  </Fragment>
                );
              })}

              {/* NUEVO MATERIAL */}
              <tr className="border-t border-border bg-muted/20">
                {/* CÓDIGO */}
                <td className="px-4 py-3">
                  <select
                    value={newMaterial.categoryCode}
                    onChange={(e) =>
                      setNewMaterial((prev) => ({
                        ...prev,
                        categoryCode: Number(e.target.value),
                      }))
                    }
                    className="w-20 px-2 py-1 text-sm border rounded text-center"
                  >
                    {CATEGORY_CONFIG.map((c) => (
                      <option key={c.code} value={c.code}>
                        {c.code}
                      </option>
                    ))}
                  </select>
                </td>

                {/* UNIDAD */}
                <td className="px-4 py-3">
                  <select
                    value={newMaterial.unit}
                    onChange={(e) =>
                      setNewMaterial((prev) => ({
                        ...prev,
                        unit: e.target.value,
                      }))
                    }
                    className="w-full px-2 py-1 border rounded text-sm"
                  >
                    <option value="">Seleccione…</option>
                    {UNIT_OPTIONS.map((u) => (
                      <option key={u} value={u}>
                        {u}
                      </option>
                    ))}
                  </select>
                </td>

                {/* DESCRIPCIÓN */}
                <td className="px-4 py-3">
                  <Input
                    value={newMaterial.item}
                    onChange={(e) =>
                      setNewMaterial((prev) => ({
                        ...prev,
                        item: e.target.value,
                      }))
                    }
                    placeholder="Descripción"
                    size="sm"
                  />
                </td>

                {/* CANTIDAD */}
                <td className="px-4 py-3">
                  <Input
                    type="number"
                    value={newMaterial.quantity}
                    onChange={(e) =>
                      setNewMaterial((prev) => ({
                        ...prev,
                        quantity: e.target.value,
                      }))
                    }
                    placeholder="0.000"
                    size="sm"
                  />
                </td>

                {/* COSTO */}
                <td className="px-4 py-3">
                  <Input
                    type="number"
                    value={newMaterial.cost}
                    onChange={(e) =>
                      setNewMaterial((prev) => ({
                        ...prev,
                        cost: parseFloat(e.target.value) || 0,
                      }))
                    }
                    placeholder="0.00"
                    size="sm"
                  />
                </td>

                {/* IMPORTE */}
                <td className="px-4 py-3 font-medium">
                  {formatCurrency(
                    (parseFloat(newMaterial.quantity) || 0) *
                      (parseFloat(newMaterial.cost) || 0),
                  )}
                </td>

                {/* BOTÓN AGREGAR */}
                <td className="px-4 py-3">
                  <Button
                    size="sm"
                    iconName="Plus"
                    disabled={!newMaterial.item.trim() || !quotation?.id}
                    onClick={addMaterial}
                  >
                    Agregar
                  </Button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* ================== VISTA DOCUMENTO PRECIO UNITARIO ================== */}
      {showUnitView && (
        <div className="flex justify-center">
          <div
            ref={previewRef}
            className="bg-white border rounded-lg p-8 shadow-sm w-[794px] min-h-[1123px] flex flex-col"
          >
            {/* Encabezado empresa */}
            <div className="flex items-center justify-between pb-4 border-b">
              <div className="flex items-center space-x-4">
                {!logoLoadError ? (
                  <img
                    src={logoCandidates[logoIndex]}
                    alt="Climas H.M."
                    className="h-24 w-auto object-contain"
                    onError={() => {
                      if (logoIndex < logoCandidates.length - 1) {
                        setLogoIndex((i) => i + 1);
                      } else {
                        setLogoLoadError(true);
                      }
                    }}
                  />
                ) : (
                  <div className="h-20 w-20 bg-primary rounded flex items-center justify-center">
                    <Icon name="Wind" size={40} color="white" />
                  </div>
                )}
              </div>
              <div className="text-right text-xs text-slate-600">
                <p>RFC: AFP123456789</p>
                <p>Tel: +52 55 1234 5678</p>
                <p>info@aireflowpro.com</p>
              </div>
            </div>

            {/* Contenido principal */}
            <div className="flex-1 mt-6 space-y-8">
              {/* Cabecera de la cotización y cliente */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div>
                  <h2 className="text-lg font-semibold mb-3 tracking-wide">
                    COTIZACIÓN DE PRECIOS UNITARIOS
                  </h2>
                  <div className="space-y-1 text-sm text-slate-700">
                    <p>
                      <span className="font-medium">No. Cotización: </span>
                      {quotation?.folio || `COT-${quotation?.id || 'SIN-FOLIO'}`}
                    </p>
                    <p>
                      <span className="font-medium">Fecha: </span>
                      {getCurrentDate()}
                    </p>
                    <p>
                      <span className="font-medium">Vendedor: </span>
                      {quotation?.assignedTo || 'No asignado'}
                    </p>
                  </div>
                </div>

                <div>
                  <h3 className="text-sm font-semibold mb-2 tracking-wide">
                    CLIENTE
                  </h3>
                  <div className="text-sm text-slate-700 space-y-1">
                    <p className="font-semibold">{clientName}</p>
                    <p>
                      <span className="font-medium">RFC: </span>
                      {clientRFC}
                    </p>
                    <p>
                      <span className="font-medium">Dirección: </span>
                      {clientAddress}
                    </p>
                    <p>
                      <span className="font-medium">Contacto: </span>
                      {clientContact}
                    </p>
                    <p>
                      <span className="font-medium">Email: </span>
                      {clientEmail}
                    </p>
                    <p>
                      <span className="font-medium">Teléfono: </span>
                      {clientPhone}
                    </p>
                  </div>
                </div>
              </div>

              {/* INFORMACIÓN DEL PROYECTO (COMO EN TU CAPTURA) */}
              <div>
                <h3 className="text-sm font-semibold mb-3 text-blue-700 tracking-wide">
                  INFORMACIÓN DEL PROYECTO
                </h3>
                <div className="bg-slate-50 rounded-lg p-4 text-sm text-slate-800 space-y-1">
                  <p className="font-semibold">{projectName}</p>
                  <p>{projectDescription}</p>
                  <p>
                    <span className="font-bold">Ubicación: </span>
                    {projectLocation}
                  </p>
                  <p>
                    <span className="font-bold">Tipo de proyecto: </span>
                    {projectType}
                  </p>
                </div>
              </div>

              {/* PRECIOS UNITARIOS (TABLA COMPACTA, ORDENADA POR CÓDIGO) */}
              <div>
                <h3 className="text-sm font-semibold mb-3 text-blue-700 tracking-wide">
                  PRECIOS UNITARIOS
                </h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs border border-slate-300">
                    <thead className="bg-slate-100">
                      <tr>
                        <th className="px-2 py-2 text-left border border-slate-300">
                          Categoría
                        </th>
                        <th className="px-2 py-2 text-left border border-slate-300">
                          Descripción
                        </th>
                        <th className="px-2 py-2 text-center border border-slate-300">
                          Unidad
                        </th>
                        <th className="px-2 py-2 text-right border border-slate-300">
                          Cantidad
                        </th>
                        <th className="px-2 py-2 text-right border border-slate-300">
                          Precio Unit.
                        </th>
                        <th className="px-2 py-2 text-right border border-slate-300">
                          Importe
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {materialsForDoc.length === 0 && (
                        <tr>
                          <td
                            colSpan={6}
                            className="px-4 py-4 text-center text-slate-500"
                          >
                            No hay materiales capturados.
                          </td>
                        </tr>
                      )}

                      {materialsForDoc.map((m, index) => {
                        const qty = Number(m?.quantity) || 0;
                        const importe = computeImporte(m);
                        const unit =
                          qty > 0
                            ? importe / qty
                            : m?.cost != null
                            ? Number(m.cost) || 0
                            : importe;

                        const catName =
                          CATEGORY_CONFIG.find((c) => c.code === m.categoryCode)
                            ?.name || '-';

                        return (
                          <tr key={m.id ?? m._id ?? index}>
                            <td className="px-2 py-2 border border-slate-300">
                              {catName}
                            </td>
                            <td className="px-2 py-2 border border-slate-300">
                              {m?.item || '-'}
                            </td>
                            <td className="px-2 py-2 text-center border border-slate-300">
                              {m?.unit || '-'}
                            </td>
                            <td className="px-2 py-2 text-right border border-slate-300">
                              {qty || '-'}
                            </td>
                            <td className="px-2 py-2 text-right border border-slate-300">
                              {formatCurrency(unit)}
                            </td>
                            <td className="px-2 py-2 text-right border border-slate-300">
                              {formatCurrency(importe)}
                            </td>
                          </tr>
                        );
                      })}

                      {materialsForDoc.length > 0 && (
                        <tr className="bg-slate-100 font-semibold">
                          <td
                            colSpan={5}
                            className="px-2 py-2 text-right border border-slate-300"
                          >
                            TOTAL
                          </td>
                          <td className="px-2 py-2 text-right border border-slate-300">
                            {formatCurrency(totalCost)}
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            {/* Footer: condiciones + total grande */}
            <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-8 items-start">
              <div>
                <h3 className="text-sm font-semibold mb-3 text-blue-700 tracking-wide">
                  CONDICIONES COMERCIALES
                </h3>
                <div className="bg-slate-50 rounded-lg p-4 text-xs md:text-sm text-slate-800 space-y-1">
                  <p>• Precio sujeto a cambios sin previo aviso.</p>
                  <p>• Forma de pago: 50% anticipo, 50% contra entrega.</p>
                  <p>• Tiempo de entrega: según cronograma acordado.</p>
                </div>
              </div>

              <div className="flex flex-col items-end justify-center">
                <h3 className="text-sm font-semibold mb-2 text-blue-700 tracking-wide">
                  INVERSIÓN TOTAL
                </h3>
                <div className="text-3xl md:text-4xl font-bold text-blue-700">
                  {formatCurrency(totalCost)}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ViewUnitPrices;
