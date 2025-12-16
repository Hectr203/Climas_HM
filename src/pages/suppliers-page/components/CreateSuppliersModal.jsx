import React, { useState } from "react";
import Button from "../../../components/ui/Button";
import Icon from "../../../components/AppIcon";
import Input from "../../../components/ui/Input";
import Select from "../../../components/ui/Select";
import useSupplier from "../../../hooks/useSuppliers";
import { useErrorHandler, useNotifications } from "context/NotificationContext";

const occupationOptions = [
  { value: "Proveedor", label: "Proveedor" },
  { value: "Representante", label: "Representante" },
  { value: "Ventas", label: "Ventas" },
  { value: "Administración", label: "Administración" },
  { value: "Compras", label: "Compras" },
  { value: "Otro", label: "Otro" },
];

const normalizePhone = (v) => (v || "").toString().replace(/[^\d+]/g, "");
const isValidEmail = (email) =>
  !email ? false : /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(email).trim());

const CreateSuppliersModal = ({ isOpen = false, onClose, onSubmit }) => {
  const { createSupplier } = useSupplier();

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState({});

  const { handleError, handleSuccess } = useErrorHandler();
  const { showWarning } = useNotifications();

  const [formData, setFormData] = useState({
    nombre: "",
    empresa: "",
    tel: "",
    correo: "",
    ocupacion: "",
  });

  const handleInputChange = (key, value) => {
    setFormData((s) => ({ ...s, [key]: value }));
    if (errors[key]) setErrors((e) => ({ ...e, [key]: undefined }));
  };

  const validate = () => {
    const e = {};
    if (!formData.nombre?.trim()) e.nombre = "Requerido";
    if (!formData.empresa?.trim()) e.empresa = "Requerido";
    if (!formData.tel?.trim()) e.tel = "Requerido";
    if (!formData.correo?.trim()) e.correo = "Requerido";
    else if (!isValidEmail(formData.correo)) e.correo = "Correo inválido";
    if (!formData.ocupacion) e.ocupacion = "Requerido";

    setErrors(e);
    return Object.keys(e).length === 0;
  };

  // ✅ FIX: mandar "numero" (lo que espera el backend) y conservar "tel" por compatibilidad
  const buildPayloadForBackend = () => {
    const telNormalizado = normalizePhone(formData.tel);

    return {
      nombre: formData.nombre?.trim() || "",
      empresa: formData.empresa?.trim() || "",
      tel: telNormalizado,          // 👈 lo dejas tal cual (por si lo usas en UI/normalizadores)
      numero: telNormalizado,       // 👈 lo agregas para el backend (proveedoresService.create usa "numero")
      correo: formData.correo?.trim() || "",
      ocupacion: formData.ocupacion || "",
    };
  };

  const resetForm = () => {
    setFormData({
      nombre: "",
      empresa: "",
      tel: "",
      correo: "",
      ocupacion: "",
    });
    setErrors({});
  };

  const handleSubmit = async (e) => {
    e?.preventDefault();

    if (!validate()) {
      showWarning("Revisa los campos requeridos del formulario.");
      return;
    }

    setIsSubmitting(true);
    try {
      const payload = buildPayloadForBackend();
      const resp = await createSupplier(payload);

      handleSuccess("create", "Proveedor");

      // devuelve al padre el doc creado si viene en resp
      const created = resp?.data ?? resp ?? payload;

      onSubmit && onSubmit(created);
      resetForm();
      onClose && onClose();
    } catch (err) {
      console.error("Error creando proveedor:", err);
      handleError(err, "Error creando proveedor");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-1050 p-4">
      <div className="bg-card border border-border rounded-lg w-full max-w-3xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-border">
          <div>
            <h2 className="text-xl font-semibold text-foreground">
              Crear Nuevo Proveedor
            </h2>
            <p className="text-sm text-muted-foreground">
              Complete la información del proveedor
            </p>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose} disabled={isSubmitting}>
            <Icon name="X" size={20} />
          </Button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="md:col-span-2">
              <h3 className="text-lg font-medium text-foreground mb-4">
                Información del Proveedor
              </h3>
            </div>

            <Input
              label="Nombre"
              type="text"
              placeholder="Ej: Juan Pérez"
              value={formData.nombre}
              onChange={(e) => handleInputChange("nombre", e?.target?.value)}
              error={errors.nombre}
              required
            />

            <Input
              label="Empresa"
              type="text"
              placeholder="Ej: Refrigeración del Norte"
              value={formData.empresa}
              onChange={(e) => handleInputChange("empresa", e?.target?.value)}
              error={errors.empresa}
              required
            />

            <Input
              label="Tel"
              type="text"
              placeholder="Ej: 5512345678"
              value={formData.tel}
              onChange={(e) => handleInputChange("tel", e?.target?.value)}
              error={errors.tel}
              required
              description="Solo números (se normaliza automáticamente)"
            />

            <Input
              label="Correo"
              type="email"
              placeholder="Ej: proveedor@correo.com"
              value={formData.correo}
              onChange={(e) => handleInputChange("correo", e?.target?.value)}
              error={errors.correo}
              required
            />

            <div className="md:col-span-2">
              <Select
                label="Ocupación"
                options={occupationOptions}
                value={formData.ocupacion}
                onChange={(value) => handleInputChange("ocupacion", value)}
                error={errors.ocupacion}
                required
                searchable
              />
            </div>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-end space-x-4 mt-8 pt-6 border-t border-border">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                resetForm();
                onClose && onClose();
              }}
              disabled={isSubmitting}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              loading={isSubmitting}
              iconName="Plus"
              iconPosition="left"
            >
              {isSubmitting ? "Creando..." : "Crear Proveedor"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreateSuppliersModal;
