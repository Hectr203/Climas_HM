import React, { useEffect, useState } from "react";
import Button from "../../../components/ui/Button";
import Input from "../../../components/ui/Input";

const OCCUPATIONS_LS_KEY = "suppliers_custom_ocupaciones_v1";
const OCCUPATIONS_EVENT = "suppliers:ocupaciones_updated";

const cleanText = (v) =>
  String(v ?? "")
    .replace(/\s+/g, " ")
    .trim();

const readCustomOccupations = () => {
  try {
    const raw = localStorage.getItem(OCCUPATIONS_LS_KEY);
    const arr = raw ? JSON.parse(raw) : [];
    return Array.isArray(arr) ? arr.map(cleanText).filter(Boolean) : [];
  } catch {
    return [];
  }
};

const saveCustomOccupation = (name) => {
  const value = cleanText(name);
  if (!value) return { ok: false, reason: "empty" };

  const prev = readCustomOccupations();
  const exists = prev.some((x) => x.toLowerCase() === value.toLowerCase());
  if (exists) return { ok: false, reason: "exists" };

  const next = [...prev, value];
  localStorage.setItem(OCCUPATIONS_LS_KEY, JSON.stringify(next));

  // ✅ refresca la MISMA pestaña (Create/Edit/Filtros)
  window.dispatchEvent(new Event(OCCUPATIONS_EVENT));

  return { ok: true, value };
};

const CreateOccupationModal = ({ isOpen = false, onClose, onCreated }) => {
  const [value, setValue] = useState("");

  useEffect(() => {
    if (isOpen) setValue("");
  }, [isOpen]);

  if (!isOpen) return null;

  const handleCreate = () => {
    const res = saveCustomOccupation(value);
    if (res.ok) {
      onCreated?.(res.value);
      onClose?.();
    }
    // Si quieres mostrar warning cuando exista, dímelo y lo meto con tu NotificationContext.
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-1050 p-4">
      <div className="bg-card border border-border rounded-lg w-full max-w-md">
        <div className="p-6 border-b border-border">
          <h2 className="text-lg font-semibold">Agregar Ocupación</h2>
        </div>

        <div className="p-6">
          <Input
            placeholder="Ej: LIMPIEZA DE DUCTERIA"
            value={value}
            onChange={(e) => setValue(e?.target?.value)}
          />
        </div>

        <div className="p-6 border-t border-border flex justify-end gap-2">
          <Button variant="outline" type="button" onClick={onClose}>
            Cancelar
          </Button>

          <Button
            type="button"
            onClick={handleCreate}
            disabled={!cleanText(value)}
            iconName="Plus"
            iconPosition="left"
          >
            Agregar
          </Button>
        </div>
      </div>
    </div>
  );
};

export default CreateOccupationModal;
