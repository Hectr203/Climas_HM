import React, { useState, useEffect, Fragment } from 'react';
import Icon from '../../../components/AppIcon';
import Button from '../../../components/ui/Button';
import Input from '../../../components/ui/Input';
import useQuotation from '../../../hooks/useQuotation';
import usePrecio from '../../../hooks/usePrecio';
import { useNotifications } from '../../../context/NotificationContext';

const CATEGORY_CONFIG = [
  { code: 1, name: 'EQUIPO' },
  { code: 2, name: 'MATERIALES' },
  { code: 3, name: 'MANO DE OBRA' },
  { code: 4, name: 'HERRAMIENTA' },
  { code: 5, name: 'FLETES Y GRUAS' },
];

const UNIT_OPTIONS = ['Pza', 'kg', 'Jgo', 'm', 'h', '%', 'ton', 'ml', 'l', 'caja'];

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

  /* ================== CARGAR MATERIALES / PRECIOS DESDE BACK ================== */
  useEffect(() => {
    async function fetchMateriales() {
      setMaterials([]);
      setRiskAssessment({
        overall: 'low',
        factors: [],
        extraCostsPrevention: true,
      });

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

        if (quotation?.materials) setMaterials(quotation.materials);
        if (quotation?.riskAssessment) setRiskAssessment(quotation.riskAssessment);
      } finally {
        setLoadingMaterials(false);
      }
    }

    fetchMateriales();
  }, [quotation?.id]);

  /* ================== HELPERS ================== */

  const computeImporte = (m) => {
    if (m?.importe != null && !Number.isNaN(Number(m.importe))) {
      return Number(m.importe);
    }
    return ((parseFloat(m?.quantity) || 0) * (parseFloat(m?.cost) || 0)) || 0;
  };

  const subtotalByCategory = (code) =>
    materials
      .filter((m) => m.categoryCode === code)
      .reduce((sum, m) => sum + computeImporte(m), 0);

  const totalCost = materials.reduce((sum, m) => sum + computeImporte(m), 0);

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
      // 1) Sincronizar todos los materiales con la tabla de precios
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

          if (!id) {
            return createPrecio(payload);
          }
          return updatePrecio(id, payload);
        }),
      );

      // 2) Adaptar materiales al formato que espera el endpoint de cotización
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

      // 3) Actualizar materiales y riesgos en la cotización
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

        <Button
          onClick={handleSave}
          iconName="Save"
          iconPosition="left"
          disabled={quotationLoading || preciosLoading}
        >
          Guardar Checklist
        </Button>
      </div>

      {/* TOTAL */}
      <div className="text-sm text-muted-foreground">
        Total estimado: <strong>${totalCost.toLocaleString('es-MX')}</strong>
      </div>

      {/* TABLA PRINCIPAL */}
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
                            ${computeImporte(m).toLocaleString('es-MX')}
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

                    {/* SUBTOTAL */}
                    <tr className="bg-muted/40 border-t border-border">
                      <td />
                      <td
                        colSpan={4}
                        className="px-4 py-2 text-right font-medium"
                      >
                        Subtotal {cat.name.toLowerCase()}:
                      </td>
                      <td className="font-semibold px-4 py-2">
                        ${subtotalByCategory(cat.code).toLocaleString('es-MX')}
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
                  {`$${(
                    (parseFloat(newMaterial.quantity) || 0) *
                    (parseFloat(newMaterial.cost) || 0)
                  ).toLocaleString('es-MX')}`}
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
    </div>
  );
};

export default ViewUnitPrices;
