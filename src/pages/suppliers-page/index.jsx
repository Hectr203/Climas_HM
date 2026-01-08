import React, { useEffect, useMemo, useState } from "react";
import jsPDF from "jspdf";
import "jspdf-autotable";

import SuppliersFilters, { applySupplierFilters } from "./components/SuppliersFilters";
import SuppliersTable from "./components/SuppliersTable";

import CreateSuppliersModal from "./components/CreateSuppliersModal";
import EditSuppliersModal from "./components/EditSuppliersModal";
import CreateOccupationModal from "./components/CreateOccupationModal";

import useSupplier from "../../hooks/useSuppliers";
import { useNotifications } from "context/NotificationContext";

import Sidebar from "../../components/ui/Sidebar";
import Header from "../../components/ui/Header";
import Breadcrumb from "../../components/ui/Breadcrumb";

/* =========================
   Ocupaciones (fijas + localStorage)
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

const writeCustomOccupations = (arr) => {
  try {
    localStorage.setItem(OCCUPATIONS_LS_KEY, JSON.stringify(arr));
  } catch {}
};

const dedupeList = (arr) => {
  const map = new Map();
  (arr || []).forEach((x) => {
    const v = cleanText(x);
    if (!v) return;
    const key = v.toLowerCase();
    if (!map.has(key)) map.set(key, v);
  });
  return Array.from(map.values());
};

/* =========================
   PDF helpers
========================= */

const safe = (v, fallback = "—") => {
  const s = v == null ? "" : String(v);
  return s.trim() ? s : fallback;
};

const formatDateMX = (d = new Date()) =>
  new Date(d).toLocaleDateString("es-MX", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });

const getPhoneMultiline = (s) => {
  const raw = s?.numero ?? s?.tel ?? s?.telefono ?? s?.phone ?? "";
  if (Array.isArray(raw)) return raw.join("\n");
  return safe(raw, "");
};

const drawHeader = (doc, title) => {
  const pageW = doc.internal.pageSize.getWidth();

  doc.setFillColor(10, 74, 138);
  doc.rect(0, 0, pageW, 44, "F");

  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(18);
  doc.text(title, pageW / 2, 28, { align: "center" });

  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.text(`Generado el ${formatDateMX()}`, pageW - 40, 28, { align: "right" });

  doc.setTextColor(51, 51, 51);
};

const exportSuppliersToPDF = (suppliers) => {
  const list = Array.isArray(suppliers) ? suppliers : [];

  const doc = new jsPDF({
    orientation: "portrait",
    unit: "pt",
    format: "letter",
  });

  drawHeader(doc, "REPORTE DE PROVEEDORES");

  const rows = list.map((s, idx) => [
    idx + 1,
    safe(s?.nombre ?? s?.name),
    safe(s?.empresa ?? s?.company),
    getPhoneMultiline(s),
    safe(s?.correo ?? s?.email),
    safe(s?.ocupacion ?? s?.role),
  ]);

  doc.autoTable({
    startY: 90,
    head: [["#", "NOMBRE", "EMPRESA", "NÚMERO", "CORREO", "OCUPACIÓN"]],
    body: rows,
    theme: "grid",
    margin: { left: 30, right: 30 },
    styles: {
      fontSize: 9,
      cellPadding: 5,
      overflow: "linebreak",
    },
    headStyles: {
      fillColor: [10, 74, 138],
      textColor: 255,
      halign: "center",
    },
    alternateRowStyles: {
      fillColor: [245, 245, 245],
    },
  });

  doc.save(`PROVEEDORES_${new Date().toISOString().split("T")[0]}.pdf`);
};

/* =========================
   Modal Ver Ocupaciones
========================= */
const ViewOccupationsModal = ({ isOpen = false, onClose }) => {
  const [custom, setCustom] = useState([]);

  useEffect(() => {
    if (!isOpen) return;
    setCustom(readCustomOccupations());

    const onStorage = (e) => {
      if (e.key === OCCUPATIONS_LS_KEY) setCustom(readCustomOccupations());
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, [isOpen]);

  const all = useMemo(() => {
    const fixed = FIXED_OCCUPATIONS.map((x) => ({ name: x, fixed: true }));
    const dyn = dedupeList(custom).map((x) => ({ name: x, fixed: false }));
    // evita duplicar si alguien guardó una fija dentro de custom
    const fixedKeys = new Set(FIXED_OCCUPATIONS.map((x) => x.toLowerCase()));
    const dynFiltered = dyn.filter((x) => !fixedKeys.has(x.name.toLowerCase()));
    return [...fixed, ...dynFiltered];
  }, [custom]);

  const removeDynamic = (name) => {
    const key = String(name || "").toLowerCase().trim();
    const next = (readCustomOccupations() || []).filter(
      (x) => String(x).toLowerCase().trim() !== key
    );
    writeCustomOccupations(next);
    setCustom(next);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-1050 p-4">
      <div className="bg-card border border-border rounded-lg w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-border flex items-center justify-between">
          <h2 className="text-lg font-semibold">Ocupaciones</h2>
          <button
            className="h-9 px-3 rounded-md border border-border"
            onClick={onClose}
          >
            Cerrar
          </button>
        </div>

        <div className="p-6">
          {all.length === 0 ? (
            <div className="text-sm text-muted-foreground">
              No hay ocupaciones registradas.
            </div>
          ) : (
            <div className="space-y-2">
              {all.map((o) => (
                <div
                  key={`${o.fixed ? "fixed" : "dyn"}:${o.name}`}
                  className="flex items-center justify-between border border-border rounded-md px-3 py-2"
                >
                  <div className="text-sm">
                    {o.name}{" "}
                    {o.fixed ? (
                      <span className="text-xs text-muted-foreground">
                        (fija)
                      </span>
                    ) : (
                      <span className="text-xs text-muted-foreground">
                        (agregada)
                      </span>
                    )}
                  </div>

                  {!o.fixed && (
                    <button
                      className="h-8 px-3 rounded-md text-xs border border-border hover:bg-muted/60"
                      onClick={() => removeDynamic(o.name)}
                      title="Eliminar ocupación"
                    >
                      Eliminar
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="p-6 border-t border-border text-xs text-muted-foreground">
          * Las ocupaciones “fijas” no se eliminan desde aquí.
        </div>
      </div>
    </div>
  );
};

/* =========================
   Página Proveedores
========================= */

const SuppliersPage = () => {
  const { showError, showSuccess, showWarning, showConfirm } = useNotifications();
  const { getSuppliers, deleteSupplier, loading } = useSupplier();

  const [suppliers, setSuppliers] = useState([]);
  const [filters, setFilters] = useState({ search: "", ocupacion: "" });

  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [headerMenuOpen, setHeaderMenuOpen] = useState(false);

  const [openCreate, setOpenCreate] = useState(false);
  const [openEdit, setOpenEdit] = useState(false);
  const [selectedSupplier, setSelectedSupplier] = useState(null);

  const [openAddOccupation, setOpenAddOccupation] = useState(false);
  const [openViewOccupations, setOpenViewOccupations] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const res = await getSuppliers();
        setSuppliers(Array.isArray(res) ? res : res?.data ?? []);
      } catch {
        showError?.("No se pudieron cargar los proveedores");
      }
    })();
  }, [getSuppliers, showError]);

  const filteredSuppliers = useMemo(
    () => applySupplierFilters(suppliers, filters),
    [suppliers, filters]
  );

  const getId = (s) => s?.id ?? s?._id ?? s?.Id;

  const handleDelete = (supplier) => {
    const id = getId(supplier);
    if (!id) return showWarning?.("ID no válido");

    showConfirm?.(`¿Eliminar proveedor "${supplier?.empresa}"?`, {
      onConfirm: async () => {
        setSuppliers((p) => p.filter((x) => getId(x) !== id));
        try {
          await deleteSupplier(id);
          showSuccess?.("Proveedor eliminado");
        } catch {
          showError?.("No se pudo eliminar");
        }
      },
    });
  };

  return (
    <div className="min-h-screen bg-background flex">
      <Sidebar
        isCollapsed={sidebarCollapsed}
        onToggle={() => setSidebarCollapsed((s) => !s)}
      />

      <div className={`flex-1 ${sidebarCollapsed ? "lg:ml-16" : "lg:ml-60"}`}>
        <Header
          onMenuToggle={() => setHeaderMenuOpen((s) => !s)}
          isMenuOpen={headerMenuOpen}
        />

        <div className="container mx-auto px-4 py-8">
          <Breadcrumb />

          <div className="flex justify-between items-center mb-6">
            <div>
              <h1 className="text-3xl font-bold">Proveedores</h1>
              <p className="text-muted-foreground">
                Administre su lista de proveedores
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setOpenAddOccupation(true)}
                className="
                  h-8 px-3 rounded-md
                  text-xs font-medium
                  bg-muted text-foreground
                  border border-border
                  hover:bg-muted/70
                  opacity-90
                "
              >
                + Agregar Ocupación
              </button>

              {/* ✅ NUEVO BOTÓN EN MEDIO */}
              <button
                onClick={() => setOpenViewOccupations(true)}
                className="
                  h-8 px-3 rounded-md
                  text-xs font-medium
                  bg-muted text-foreground
                  border border-border
                  hover:bg-muted/70
                  opacity-90
                "
              >
                Ver Ocupaciones
              </button>

              <button
                onClick={() => setOpenCreate(true)}
                className="h-10 px-4 rounded-md bg-primary text-primary-foreground"
              >
                + Crear Proveedor
              </button>
            </div>
          </div>

          <SuppliersFilters
            onFiltersChange={setFilters}
            totalSuppliers={suppliers.length}
            filteredSuppliers={filteredSuppliers.length}
            onExport={() => exportSuppliersToPDF(filteredSuppliers)}
          />

          <SuppliersTable
            suppliers={filteredSuppliers}
            loading={loading}
            onEdit={(s) => {
              setSelectedSupplier(s);
              setOpenEdit(true);
            }}
            onDelete={handleDelete}
          />
        </div>
      </div>

      <CreateSuppliersModal
        isOpen={openCreate}
        onClose={() => setOpenCreate(false)}
        onSubmit={(s) => setSuppliers((p) => [s, ...p])}
      />

      <EditSuppliersModal
        isOpen={openEdit}
        supplier={selectedSupplier}
        onClose={() => setOpenEdit(false)}
        onSubmit={(s) =>
          setSuppliers((p) => p.map((x) => (getId(x) === getId(s) ? s : x)))
        }
      />

      <CreateOccupationModal
        isOpen={openAddOccupation}
        onClose={() => setOpenAddOccupation(false)}
        onCreated={(name) => showSuccess?.(`Ocupación agregada: ${name}`)}
      />

      {/* ✅ MODAL VER OCUPACIONES */}
      <ViewOccupationsModal
        isOpen={openViewOccupations}
        onClose={() => setOpenViewOccupations(false)}
      />
    </div>
  );
};

export default SuppliersPage;
