import React, { useEffect, useMemo, useState } from "react";
import Button from "../../../components/ui/Button";
import Icon from "../../../components/AppIcon";
import Input from "../../../components/ui/Input";
import Select from "../../../components/ui/Select";
import useSupplier from "../../../hooks/useSuppliers";
import { useErrorHandler, useNotifications } from "context/NotificationContext";

/* =========================
   Ocupaciones fijas (NO se pierden)
========================= */
const FIXED_OCCUPATIONS = [
  "Mantenimiento de HVAC/R",
  "Refrigerantes",
  "Aislamiento",
  "Rejillas",
  "Difusores",
  "Multimarcas",
  "Filtros",
  "Tubería de cobre para instalaciones",
  "Minisplit",
  "Sistemas hidrónicos para HVAC y plomería",
  "Torres de enfriamiento",
  "Servicio Integral de Aire Acondicionado e Instalaciones Electromecánicas",
  "Louvers",
  "Equipos de AC Minisplit",
  "Accesorios",
  "Herramientas",
  "Gas",
];

/* =========================
   LocalStorage (ocupaciones dinámicas)
========================= */
const OCCUPATIONS_LS_KEY = "suppliers_custom_ocupaciones_v1";

const cleanText = (v) =>
  String(v ?? "")
    .replace(/\s+/g, " ")
    .trim();

const readCustomOccupations = () => {
  try {
    const raw = localStorage.getItem(OCCUPATIONS_LS_KEY);
    const arr = raw ? JSON.parse(raw) : [];
    if (!Array.isArray(arr)) return [];
    return arr.map(cleanText).filter(Boolean);
  } catch {
    return [];
  }
};

const buildOptions = (fixedList, customList) => {
  const map = new Map();
  [...fixedList, ...customList].forEach((x) => {
    const v = cleanText(x);
    if (!v) return;
    const key = v.toLowerCase(); // dedupe
    if (!map.has(key)) map.set(key, v);
  });

  return Array.from(map.values()).map((x) => ({ value: x, label: x }));
};

/* =========================
   Helpers
========================= */
const normalizePhone = (v) => (v || "").toString().replace(/[^\d+]/g, "");
const isValidEmail = (email) =>
  !email ? false : /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(email).trim());

const asStr = (v, fallback = "") => (v == null ? fallback : String(v));

/** ✅ FIX: incluye raw.numero para que el tel no se borre al abrir el modal */
const normalizeSupplier = (doc) => {
  const raw = doc || {};
  return {
    id: raw.id ?? raw._id ?? "",
    nombre: raw.nombre ?? raw.name ?? "",
    empresa: raw.empresa ?? raw.company ?? "",
    tel: raw.numero ?? raw.tel ?? raw.telefono ?? raw.phone ?? "",
    correo: raw.correo ?? raw.email ?? "",
    ocupacion: raw.ocupacion ?? raw.role ?? raw.occupation ?? "",
  };
};

const EditSuppliersModal = ({ isOpen = false, onClose, onSubmit, supplier }) => {
  const { getSupplierById, updateSupplier } = useSupplier();

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState({});
  const [serverSupplier, setServerSupplier] = useState(null);

  const { handleError, handleSuccess } = useErrorHandler();
  const { showWarning } = useNotifications();

  // ✅ NUEVO: ocupaciones dinámicas
  const [customOccupations, setCustomOccupations] = useState([]);

  useEffect(() => {
    if (!isOpen) return;

    setCustomOccupations(readCustomOccupations());

    const onStorage = (e) => {
      if (e.key === OCCUPATIONS_LS_KEY) {
        setCustomOccupations(readCustomOccupations());
      }
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, [isOpen]);

  const occupationOptions = useMemo(() => {
    return buildOptions(FIXED_OCCUPATIONS, customOccupations);
  }, [customOccupations]);

  /* ============= CARGA DEL SUPPLIER COMPLETO (si hay id) ============= */
  useEffect(() => {
    if (!isOpen || !supplier?.id) return;

    let mounted = true;
    (async () => {
      try {
        const resp = await getSupplierById(supplier.id);
        const doc = resp?.data ?? resp;
        if (mounted) setServerSupplier(doc || supplier);
      } catch (e) {
        handleError(e, "Error cargando proveedor");
        if (mounted) setServerSupplier(supplier || null);
      }
    })();

    return () => {
      mounted = false;
    };
  }, [isOpen, supplier?.id, supplier, getSupplierById, handleError]);

  const normalized = useMemo(() => {
    return normalizeSupplier(serverSupplier || supplier || {});
  }, [serverSupplier, supplier]);

  const [formData, setFormData] = useState(normalized);

  useEffect(() => {
    if (isOpen) {
      setFormData(normalized);
      setErrors({});
    } else {
      setServerSupplier(null);
      setErrors({});
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, normalized?.id]);

  const handle = (k, v) => {
    setFormData((s) => ({ ...s, [k]: v }));
    if (errors[k]) setErrors((e) => ({ ...e, [k]: undefined }));
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

  // ✅ FIX: mandar "numero" además de "tel" para que el backend actualice bien
  const buildPayloadForUpdate = () => {
    const telNormalizado = normalizePhone(formData.tel);

    return {
      nombre: formData.nombre?.trim() || "",
      empresa: formData.empresa?.trim() || "",
      tel: telNormalizado,
      numero: telNormalizado,
      correo: formData.correo?.trim() || "",
      ocupacion: formData.ocupacion || "",
    };
  };

  const handleSubmit = async (e) => {
    e?.preventDefault();

    if (!validate()) {
      showWarning("Revisa los campos requeridos del formulario.");
      return;
    }

    if (!formData?.id) {
      showWarning("No se encontró el ID del proveedor para editar.");
      return;
    }

    setIsSubmitting(true);
    try {
      const payload = buildPayloadForUpdate();
      const resp = await updateSupplier(formData.id, payload);

      const updated = {
        ...(resp?.data ?? resp ?? {}),
        id: formData.id,
        ...payload,
      };

      handleSuccess("update", "Proveedor");
      onSubmit && onSubmit(updated);
      onClose && onClose();
    } catch (err) {
      console.error("Error actualizando proveedor:", err);
      handleError(err, "Error actualizando proveedor");
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
              Editar Proveedor
            </h2>
            <p className="text-sm text-muted-foreground">
              Actualice la información permitida
            </p>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            disabled={isSubmitting}
          >
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
              label="ID (solo lectura)"
              value={asStr(formData?.id, "—")}
              onChange={() => {}}
              disabled
            />

            <Input
              label="Empresa"
              type="text"
              placeholder="Ej: Refrigeración del Norte"
              value={asStr(formData.empresa)}
              onChange={(e) => handle("empresa", e?.target?.value)}
              error={errors.empresa}
              required
            />

            <Input
              label="Nombre"
              type="text"
              placeholder="Ej: Juan Pérez"
              value={asStr(formData.nombre)}
              onChange={(e) => handle("nombre", e?.target?.value)}
              error={errors.nombre}
              required
            />

            <Input
              label="Tel"
              type="text"
              placeholder="Ej: 5512345678"
              value={asStr(formData.tel)}
              onChange={(e) => handle("tel", e?.target?.value)}
              error={errors.tel}
              required
              description="Solo números (se normaliza automáticamente)"
            />

            <Input
              label="Correo"
              type="email"
              placeholder="Ej: proveedor@correo.com"
              value={asStr(formData.correo)}
              onChange={(e) => handle("correo", e?.target?.value)}
              error={errors.correo}
              required
            />

            <div className="md:col-span-2">
              <Select
                label="Ocupación"
                options={occupationOptions}
                value={asStr(formData.ocupacion)}
                onChange={(value) => handle("ocupacion", value)}
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
              onClick={onClose}
              disabled={isSubmitting}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              loading={isSubmitting}
              iconName="Save"
              iconPosition="left"
            >
              {isSubmitting ? "Guardando..." : "Guardar Cambios"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EditSuppliersModal;
