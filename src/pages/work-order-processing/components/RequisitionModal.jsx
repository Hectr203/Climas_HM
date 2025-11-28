import React, { useState, useEffect } from "react";
import Icon from "../../../components/AppIcon";
import Button from "../../../components/ui/Button";
import Input from "../../../components/ui/Input";
import Select from "../../../components/ui/Select";
import useRequisi from "../../../hooks/useRequisi";
import useOperac from "../../../hooks/useOperac";
import useInventory from "../../../hooks/useInventory";
import useUnits from "../../../hooks/useUnits";
import unitService from "../../../services/unitService";

const RequisitionModal = ({ isOpen, onClose, requisition, onSave, isViewMode = false }) => {
  const { createRequisition, updateRequisition } = useRequisi();
  const { oportunities, getOportunities } = useOperac();
  const { articulos, getArticulos } = useInventory();
  const { units, getUnits, createUnit, getUnitOptions, loading: loadingUnits } = useUnits();

  const [formData, setFormData] = useState({
    requestNumber: "",
    orderNumber: "",
    projectName: "",
    requestedBy: "",
    requestDate: "",
    status: "Pendiente",
    priority: "Media",
    description: "",
    items: [],
    manualItems: [],
    justification: "",
    notes: "",
  });

  const [newItem, setNewItem] = useState({
    idArticulo: "",
    codigoArticulo: "",
    name: "",
    quantity: "",
    unit: "unidades",
    description: "",
    urgency: "Normal",
  });

  const [newManualItem, setNewManualItem] = useState({
    name: "",
    quantity: "",
    unit: "unidades",
    description: "",
    urgency: "Normal",
  });

  // Estados para manejar nuevas unidades
  const [showAddUnitModal, setShowAddUnitModal] = useState(false);
  const [newUnitName, setNewUnitName] = useState("");
  const [newUnitDescription, setNewUnitDescription] = useState("");
  const [customUnitInput, setCustomUnitInput] = useState("");
  const [selectedUnitType, setSelectedUnitType] = useState("standard"); // "standard" | "otros"
  
  // Contador para generar IDs únicos
  const itemIdCounter = React.useRef(0);

  useEffect(() => {
    if (requisition) {
      setFormData({
        requestNumber: requisition?.requestNumber || "",
        orderNumber: requisition?.orderNumber || "",
        projectName: requisition?.projectName || "",
        requestedBy: requisition?.requestedBy === "Usuario Actual" ? "" : requisition?.requestedBy || "",
        requestDate:
          requisition?.requestDate || new Date().toISOString().split("T")[0],
        status: requisition?.status || "Pendiente",
        priority: requisition?.priority || "Media",
        description: requisition?.description || "",
        items: requisition?.items || [],
        manualItems: requisition?.manualItems || [],
        justification: requisition?.justification || "",
        notes: requisition?.notes || "",
      });
    } else {
      const currentDate = new Date().toISOString().split("T")[0];
      setFormData({
        requestNumber: `REQ-${Date.now()}`,
        orderNumber: "",
        projectName: "",
        requestedBy: "",
        requestDate: currentDate,
        status: "Pendiente",
        priority: "Media",
        description: "",
        items: [],
        manualItems: [],
        justification: "",
        notes: "",
      });
    }
  }, [requisition, isOpen]);

  useEffect(() => {
    if (isOpen) {
      getOportunities();
      getArticulos();
      getUnits(); // Cargar unidades al abrir el modal
    }
  }, [isOpen]);

  // Obtener opciones de unidades dinámicamente
  const unitOptions = React.useMemo(() => {
    // Obtener unidades del hook (pueden estar vacías al inicio)
    const hookUnits = getUnitOptions();
    
    // Obtener unidades por defecto del servicio
    const defaultUnits = unitService.getDefaultUnits();
    
    // Combinar unidades por defecto con las del backend
    // Crear un mapa para evitar duplicados (por nombre en minúsculas)
    const unitsMap = new Map();
    
    // Primero agregar las por defecto
    defaultUnits.forEach(unit => {
      const key = unit.nombre.toLowerCase();
      if (!unitsMap.has(key)) {
        unitsMap.set(key, {
          value: unit.nombre.toLowerCase(),
          label: unit.nombre
        });
      }
    });
    
    // Luego agregar las del backend (sobrescriben las por defecto si hay duplicados)
    hookUnits.forEach(unit => {
      const key = unit.value.toLowerCase();
      unitsMap.set(key, unit);
    });
    
    // Convertir a array y ordenar
    const allUnits = Array.from(unitsMap.values())
      .sort((a, b) => a.label.localeCompare(b.label));
    
    // Agregar opción "Otros" al final
    return [
      ...allUnits,
      { value: "otros", label: "Otros" }
    ];
  }, [units]);

  const priorityOptions = [
    { value: "Crítica", label: "Crítica" },
    { value: "Alta", label: "Alta" },
    { value: "Media", label: "Media" },
    { value: "Baja", label: "Baja" },
  ];

  const statusOptions = [
    { value: "Pendiente", label: "Pendiente" },
    { value: "Aprobada", label: "Aprobada" },
    { value: "Rechazada", label: "Rechazada" },
    { value: "En Proceso", label: "En Proceso" },
    { value: "Completada", label: "Completada" },
  ];


  const urgencyOptions = [
    { value: "Urgente", label: "Urgente" },
    { value: "Normal", label: "Normal" },
    { value: "Baja", label: "Baja" },
  ];

  const handleInputChange = (field, value) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleNewItemChange = (field, value) => {
    setNewItem((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleNewManualItemChange = (field, value) => {
    setNewManualItem((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  // Manejar cambio de unidad - detectar si es "otros"
  const handleUnitChange = (value, itemType) => {
    if (value === "otros") {
      // Si selecciona "Otros", mostrar input para unidad personalizada
      setSelectedUnitType("otros");
      if (itemType === "inventory") {
        setNewItem(prev => ({ ...prev, unit: "", customUnit: true }));
      } else {
        setNewManualItem(prev => ({ ...prev, unit: "", customUnit: true }));
      }
    } else {
      setSelectedUnitType("standard");
      if (itemType === "inventory") {
        setNewItem(prev => ({ ...prev, unit: value, customUnit: false }));
      } else {
        setNewManualItem(prev => ({ ...prev, unit: value, customUnit: false }));
      }
    }
  };

  // Manejar creación de nueva unidad
  const handleCreateNewUnit = async () => {
    if (!newUnitName || !newUnitName.trim()) {
      return;
    }

    const result = await createUnit({
      nombre: newUnitName.trim(),
      descripcion: newUnitDescription.trim() || ""
    });

    if (result) {
      // Actualizar la unidad seleccionada en el item actual
      const unitValue = result.nombre.toLowerCase();
      if (newItem.customUnit) {
        setNewItem(prev => ({ ...prev, unit: unitValue, customUnit: false }));
        setSelectedUnitType("standard");
      } else if (newManualItem.customUnit) {
        setNewManualItem(prev => ({ ...prev, unit: unitValue, customUnit: false }));
        setSelectedUnitType("standard");
      }
      
      // Recargar unidades para actualizar la lista
      await getUnits();
      
      // Cerrar modal y limpiar
      setShowAddUnitModal(false);
      setNewUnitName("");
      setNewUnitDescription("");
    }
  };

  const handleAddItem = () => {
    if (newItem?.name && newItem?.quantity) {
      // Si tiene unidad personalizada, usar esa, sino usar la unidad seleccionada
      const finalUnit = newItem.customUnit ? newItem.unit : (newItem.unit || "unidades");
      
      itemIdCounter.current += 1;
      setFormData((prev) => ({
        ...prev,
        items: [...prev.items, { ...newItem, unit: finalUnit, id: `item-${itemIdCounter.current}-${Date.now()}` }],
      }));
      setNewItem({
        idArticulo: "",
        codigoArticulo: "",
        name: "",
        quantity: "",
        unit: "unidades",
        description: "",
        urgency: "Normal",
        customUnit: false,
      });
      setSelectedUnitType("standard");
    }
  };

  const handleAddManualItem = () => {
    if (newManualItem?.name && newManualItem?.quantity) {
      // Si tiene unidad personalizada, usar esa, sino usar la unidad seleccionada
      const finalUnit = newManualItem.customUnit ? newManualItem.unit : (newManualItem.unit || "unidades");
      
      itemIdCounter.current += 1;
      setFormData((prev) => ({
        ...prev,
        manualItems: [...prev.manualItems, { ...newManualItem, unit: finalUnit, id: `manual-${itemIdCounter.current}-${Date.now()}` }],
      }));
      setNewManualItem({
        name: "",
        quantity: "",
        unit: "unidades",
        description: "",
        urgency: "Normal",
        customUnit: false,
      });
      setSelectedUnitType("standard");
    }
  };

  const handleRemoveItem = (itemId, type) => {
    setFormData((prev) => ({
      ...prev,
      [type]: prev[type].filter((item) => item.id !== itemId),
    }));
  };

  const handleSave = async () => {
  try {
    // Formatear fecha a dd/MM/yyyy
    const fecha = new Date(formData.requestDate);
    const formattedDate = `${fecha.getDate().toString().padStart(2, "0")}/${(fecha.getMonth() + 1)
      .toString()
      .padStart(2, "0")}/${fecha.getFullYear()}`;

    // Construir materiales de inventario
    const materiales = formData.items.map((item) => ({
      id: item.idArticulo || undefined, // para que el backend lo identifique como referencia
      codigoArticulo: item.codigoArticulo || "",
      nombreMaterial: item.name || "",
      cantidad: Number(item.quantity) || 0,
      unidad:
        item.unit?.charAt(0).toUpperCase() + item.unit?.slice(1).toLowerCase() || "Unidades",
      urgencia: item.urgency || "Normal",
      descripcionEspecificaciones: item.description || "",
    }));

    // Construir materiales manuales
    const materialesManuales = formData.manualItems.map((item) => ({
      nombreMaterial: item.name || "",
      cantidad: Number(item.quantity) || 0,
      unidad:
        item.unit?.charAt(0).toUpperCase() + item.unit?.slice(1).toLowerCase() || "Unidades",
      urgencia: item.urgency || "Normal",
      descripcionEspecificaciones: item.description || "",
    }));

    // Payload final
    const payload = {
      numeroOrdenTrabajo: formData.orderNumber,
      nombreProyecto: formData.projectName,
      solicitadoPor: formData.requestedBy,
      fechaSolicitud: formattedDate,
      prioridad: formData.priority,
      estado: formData.status,
      descripcionSolicitud: formData.description,
      materiales, // <-- inventario
      materialesManuales, // <-- manuales
      justificacionSolicitud: formData.justification || "",
      notasAdicionales: formData.notes || "",
      proyectoNombre: formData.projectName,
    };

    // Enviar
    let response;
    if (requisition?.id) {
      response = await updateRequisition(requisition.id, payload);
    } else {
      response = await createRequisition(payload);
    }

    if (response) {
      onSave(response);
      onClose();
    }
  } catch (error) {
    console.error(" Error al guardar la requisición:", error);
  }
};



  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-1050 p-4">
      <div className="bg-card rounded-lg border border-border w-full max-w-4xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-border">
          <div>
            <h2 className="text-xl font-semibold text-foreground">
              {requisition?.id
                ? "Editar Requisición"
                : "Nueva Requisición de Materiales"}
            </h2>
            {formData?.requestNumber && (
              <p className="text-sm text-muted-foreground mt-1">
                {formData?.requestNumber}
              </p>
            )}
          </div>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <Icon name="X" size={20} />
          </Button>
        </div>

        <div className="p-6 space-y-6">
          {/* Información básica */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Select
  label="Número de Orden de Trabajo"
  options={
    oportunities?.map((op) => ({
      label: op.ordenTrabajo,
      value: op.ordenTrabajo,
    })) || []
  }
  value={formData?.orderNumber}
  onChange={(value) => {
    handleInputChange("orderNumber", value);

    // Buscar la oportunidad seleccionada
    const selected = oportunities.find((op) => op.ordenTrabajo === value);
    if (selected) {
      // Llenar automáticamente el nombre del proyecto
      handleInputChange("projectName", selected.proyectoNombre || "");
    }
  }}
  required
/>


            <Input
              label="Nombre del Proyecto"
              placeholder="Nombre del proyecto"
              value={formData?.projectName || ""}
              onChange={isViewMode ? () => {} : (e) => handleInputChange("projectName", e?.target?.value)}
              readOnly={isViewMode}
              className={isViewMode ? "bg-input text-foreground" : "bg-gray-100"}
            />

            <Input
  label="Solicitado por"
  placeholder="Usuario Actual"
  value={formData?.requestedBy}
  onChange={(e) => handleInputChange("requestedBy", e?.target?.value)}
  required
/>

            <Input
              label="Fecha de Solicitud"
              type="date"
              value={formData?.requestDate}
              onChange={(e) => handleInputChange("requestDate", e?.target?.value)}
              required
            />

            <Select
              label="Prioridad"
              options={priorityOptions}
              value={formData?.priority}
              onChange={(value) => handleInputChange("priority", value)}
              required
            />

            <Select
              label="Estado"
              options={statusOptions}
              value={formData?.status}
              onChange={(value) => handleInputChange("status", value)}
              required
            />
          </div>

          {/* Descripción */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              Descripción de la Solicitud
            </label>
            <textarea
              className="w-full px-3 py-2 border border-border rounded-md bg-input text-foreground"
              rows={3}
              placeholder="Describe el propósito de esta requisición..."
              value={formData?.description}
              onChange={(e) => handleInputChange("description", e?.target?.value)}
            />
          </div>

          {/* Material por Inventario */}
          {!isViewMode && (
            <div className="bg-muted/30 rounded-lg p-4">
              <h4 className="text-sm font-medium text-foreground mb-3">
                Agregar Material por Inventario
              </h4>

              <div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 mb-3">
                  <Select
                    label="Materiales"
                    options={
                      articulos?.map((art) => ({
                        label: art.nombre,
                        value: art.id,
                      })) || []
                    }
                    value={newItem?.idArticulo}
                    onChange={(value) => {
                      const selected = articulos.find((a) => a.id === value);
                      handleNewItemChange("idArticulo", value);
                      handleNewItemChange("codigoArticulo", selected?.codigoArticulo || "");
                      handleNewItemChange("name", selected?.nombre || "");
                      handleNewItemChange("unit", selected?.unidad || "unidades");
                    }}
                  />

                  <div className="grid grid-cols-2 gap-2">
                    <Input
                      label="Cantidad"
                      type="number"
                      placeholder="1"
                      value={newItem?.quantity}
                      onChange={(e) => {
                        const value = Number(e?.target?.value);
                        if (value > 0) handleNewItemChange("quantity", value);
                      }}
                    />

                    <div>
                      <Select
                        label="Unidad"
                        options={unitOptions}
                        value={newItem?.customUnit ? "otros" : (newItem?.unit || "unidades")}
                        onChange={(value) => handleUnitChange(value, "inventory")}
                      />
                      {newItem?.customUnit && (
                        <div className="mt-2 space-y-2">
                          <Input
                            label="Especificar unidad"
                            placeholder="Ej: Pallet, Bolsa, etc."
                            value={newItem?.unit || ""}
                            onChange={(e) => handleNewItemChange("unit", e.target.value)}
                          />
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              // Pre-llenar el nombre con el valor actual si existe
                              if (newItem?.unit) {
                                setNewUnitName(newItem.unit);
                              }
                              setShowAddUnitModal(true);
                            }}
                            iconName="Plus"
                            iconSize={14}
                            className="w-full"
                            disabled={!newItem?.unit || !newItem.unit.trim()}
                          >
                            Guardar como nueva unidad
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>

                  <Select
                    label="Urgencia"
                    options={urgencyOptions}
                    value={newItem?.urgency}
                    onChange={(value) => handleNewItemChange("urgency", value)}
                  />
                </div>
              </div>

            <Input
              label="Descripción/Especificaciones"
              placeholder="Especificaciones técnicas..."
              value={newItem?.description}
              onChange={(e) =>
                handleNewItemChange("description", e?.target?.value)
              }
            />

            <Button
              variant="outline"
              onClick={handleAddItem}
              iconName="Plus"
              iconSize={16}
              disabled={!newItem?.name || !newItem?.quantity}
              className="mt-3"
            >
              Agregar Material
            </Button>
          </div>
          )}

          {/* Material Manual */}
          <div className="bg-muted/30 rounded-lg p-4 mt-6">
            <h4 className="text-sm font-medium text-foreground mb-3">
              Agregar Material Manualmente
            </h4>

              <div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 mb-3">
                  <Input
                    label="Nombre del Material"
                    placeholder="Ej. Tornillos, Pintura, etc."
                    value={newManualItem?.name}
                    onChange={(e) =>
                      handleNewManualItemChange("name", e?.target?.value)
                    }
                  />

                  <div className="grid grid-cols-2 gap-2">
                    <Input
                      label="Cantidad"
                      type="number"
                      placeholder="1"
                      value={newManualItem?.quantity}
                      onChange={(e) => {
                        const value = Number(e?.target?.value);
                        if (value > 0) handleNewManualItemChange("quantity", value);
                      }}
                    />

                    <div>
                      <Select
                        label="Unidad"
                        options={unitOptions}
                        value={newManualItem?.customUnit ? "otros" : (newManualItem?.unit || "unidades")}
                        onChange={(value) => handleUnitChange(value, "manual")}
                      />
                      {newManualItem?.customUnit && (
                        <div className="mt-2 space-y-2">
                          <Input
                            label="Especificar unidad"
                            placeholder="Ej: Pallet, Bolsa, etc."
                            value={newManualItem?.unit || ""}
                            onChange={(e) => handleNewManualItemChange("unit", e.target.value)}
                          />
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              // Pre-llenar el nombre con el valor actual si existe
                              if (newManualItem?.unit) {
                                setNewUnitName(newManualItem.unit);
                              }
                              setShowAddUnitModal(true);
                            }}
                            iconName="Plus"
                            iconSize={14}
                            className="w-full"
                            disabled={!newManualItem?.unit || !newManualItem.unit.trim()}
                          >
                            Guardar como nueva unidad
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>

                  <Select
                    label="Urgencia"
                    options={urgencyOptions}
                    value={newManualItem?.urgency}
                    onChange={(value) =>
                      handleNewManualItemChange("urgency", value)
                    }
                  />
                </div>

              <div className="grid grid-cols-2 gap-2">
                <Input
  label="Cantidad"
  type="number"
  placeholder="1"
  value={newManualItem?.quantity}
  onChange={(e) => {
    const value = Number(e?.target?.value);
    if (value > 0) handleNewManualItemChange("quantity", value);
  }}
/>
                <Select
                  label="Unidad"
                  options={unitOptions}
                  value={newManualItem?.unit}
                  onChange={(value) =>
                    handleNewManualItemChange("unit", value)
                  }
                />
              </div>

              <Select
                label="Urgencia"
                options={urgencyOptions}
                value={newManualItem?.urgency}
                onChange={(value) =>
                  handleNewManualItemChange("urgency", value)
                }
              />
            </div>

            <Input
              label="Descripción/Especificaciones"
              placeholder="Detalles o especificaciones..."
              value={newManualItem?.description}
              onChange={(e) =>
                handleNewManualItemChange("description", e?.target?.value)
              }
            />

            <Button
              variant="outline"
              onClick={handleAddManualItem}
              iconName="Plus"
              iconSize={16}
              disabled={!newManualItem?.name || !newManualItem?.quantity}
              className="mt-3"
            >
              Agregar Material
            </Button>
          </div>

          {/* Lista de materiales */}
          {(formData.items.length > 0 || formData.manualItems.length > 0) && (
            <div>
              <h4 className="text-sm font-medium text-foreground mb-3">
                Materiales Solicitados
              </h4>
              <div className="space-y-2">
                {[...formData.items, ...formData.manualItems].map((item) => (
                  <div
                    key={item.id}
                    className="border border-border rounded-lg p-3"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-2 mb-1">
                          <h5 className="text-sm font-medium text-foreground">
                            {item?.nombreMaterial || item?.name}
                          </h5>
                          <span
                            className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                              item?.urgency === "Urgente"
                                ? "bg-red-100 text-red-800"
                                : item?.urgency === "Normal"
                                ? "bg-blue-100 text-blue-800"
                                : "bg-gray-100 text-gray-800"
                            }`}
                          >
                            {item?.urgency}
                          </span>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          Cantidad: {item?.quantity} {item?.unit}
                        </p>
                        {item?.description && (
                          <p className="text-xs text-muted-foreground mt-1">
                            {item?.description}
                          </p>
                        )}
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() =>
                          handleRemoveItem(
                            item.id,
                            formData.items.some((i) => i.id === item.id)
                              ? "items"
                              : "manualItems"
                          )
                        }
                        iconName="Trash2"
                        iconSize={14}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Justificación */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              Justificación de la Solicitud
            </label>
            <textarea
              className="w-full px-3 py-2 border border-border rounded-md bg-input text-foreground"
              rows={3}
              placeholder="Justifica por qué son necesarios estos materiales..."
              value={formData?.justification}
              onChange={(e) =>
                handleInputChange("justification", e?.target?.value)
              }
            />
          </div>

          {/* Notas */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              Notas Adicionales
            </label>
            <textarea
              className="w-full px-3 py-2 border border-border rounded-md bg-input text-foreground"
              rows={2}
              placeholder="Notas adicionales..."
              value={formData?.notes}
              onChange={(e) => handleInputChange("notes", e?.target?.value)}
            />
          </div>
        </div>

        <div className="flex items-center justify-end space-x-3 p-6 border-t border-border">
          <Button variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button
  type="button"
  onClick={handleSave}
  className="bg-blue-600 hover:bg-blue-700 text-white"
  disabled={!formData?.projectName}
>
  {requisition?.id ? "Guardar Cambios" : "Crear Requisición"}
</Button>

        </div>
      </div>

      {/* Modal para agregar nueva unidad */}
      {showAddUnitModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-1060 p-4">
          <div className="bg-card rounded-lg border border-border w-full max-w-md">
            <div className="flex items-center justify-between p-6 border-b border-border">
              <h3 className="text-lg font-semibold text-foreground">
                Agregar Nueva Unidad de Medida
              </h3>
              <Button variant="ghost" size="icon" onClick={() => {
                setShowAddUnitModal(false);
                setNewUnitName("");
                setNewUnitDescription("");
              }}>
                <Icon name="X" size={20} />
              </Button>
            </div>

            <div className="p-6 space-y-4">
              <Input
                label="Nombre de la Unidad"
                placeholder="Ej: Pallet, Bolsa, Galón, etc."
                value={newUnitName}
                onChange={(e) => setNewUnitName(e.target.value)}
                required
              />

              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Descripción (Opcional)
                </label>
                <textarea
                  className="w-full px-3 py-2 border border-border rounded-md bg-input text-foreground"
                  rows={2}
                  placeholder="Descripción de la unidad..."
                  value={newUnitDescription}
                  onChange={(e) => setNewUnitDescription(e.target.value)}
                />
              </div>

              <div className="flex items-center justify-end space-x-3 pt-4">
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowAddUnitModal(false);
                    setNewUnitName("");
                    setNewUnitDescription("");
                  }}
                >
                  Cancelar
                </Button>
                <Button
                  onClick={handleCreateNewUnit}
                  disabled={!newUnitName || !newUnitName.trim() || loadingUnits}
                  className="bg-blue-600 hover:bg-blue-700 text-white"
                >
                  {loadingUnits ? "Guardando..." : "Guardar Unidad"}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default RequisitionModal;