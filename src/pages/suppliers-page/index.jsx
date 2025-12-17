import React, { useEffect, useMemo, useState } from "react";
import jsPDF from "jspdf";
import "jspdf-autotable";

import SuppliersFilters, { applySupplierFilters } from "./components/SuppliersFilters";
import SuppliersTable from "./components/SuppliersTable";

import CreateSuppliersModal from "./components/CreateSuppliersModal";
import EditSuppliersModal from "./components/EditSuppliersModal";

import useSupplier from "../../hooks/useSuppliers";
import { useNotifications } from "context/NotificationContext";

import Sidebar from "../../components/ui/Sidebar";
import Header from "../../components/ui/Header";
import Breadcrumb from "../../components/ui/Breadcrumb";

/* =========================
   PDF helpers (diseño reporte)
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
  const raw =
    s?.numero ??
    s?.tel ??
    s?.telefono ??
    s?.phone ??
    "";

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

  // ===== Resumen =====
  let y = 70;
  const pageW = doc.internal.pageSize.getWidth();

  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  doc.text("Resumen General", pageW / 2, y, { align: "center" });

  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.text(
    `Total de Proveedores: ${list.length}`,
    pageW / 2,
    y + 20,
    { align: "center" }
  );

  // ===== Tabla =====
  const rows = list.map((s, idx) => [
    idx + 1,
    safe(s?.nombre ?? s?.name),
    safe(s?.empresa ?? s?.company),
    getPhoneMultiline(s),
    safe(s?.correo ?? s?.email),
    safe(s?.ocupacion ?? s?.role),
  ]);

  doc.autoTable({
    startY: y + 45,
    head: [["#", "NOMBRE", "EMPRESA", "NÚMERO", "CORREO", "OCUPACIÓN"]],
    body: rows,
    theme: "grid",
    margin: { left: 30, right: 30 },

    styles: {
      font: "helvetica",
      fontSize: 9,
      cellPadding: 5,
      valign: "middle",
      overflow: "linebreak",
      lineColor: [0, 0, 0],
      lineWidth: 0.6,
      textColor: [50, 50, 50],
    },

    headStyles: {
      fillColor: [10, 74, 138],
      textColor: 255,
      fontStyle: "bold",
      halign: "center",
    },

    alternateRowStyles: {
      fillColor: [245, 245, 245],
    },

    columnStyles: {
      0: { cellWidth: 30, halign: "center" },
      1: { cellWidth: 140 },
      2: { cellWidth: 90 },
      3: { cellWidth: 90 },
      4: { cellWidth: 120 },
      5: { cellWidth: 110 },
    },
  });

  doc.save(`PROVEEDORES_${new Date().toISOString().split("T")[0]}.pdf`);
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

  useEffect(() => {
    (async () => {
      try {
        const res = await getSuppliers();
        const data = Array.isArray(res) ? res : res?.data ?? [];
        setSuppliers(data);
      } catch {
        showError?.("No se pudieron cargar los proveedores");
      }
    })();
  }, [getSuppliers, showError]);

  const filteredSuppliers = useMemo(
    () => applySupplierFilters(suppliers, filters),
    [suppliers, filters]
  );

  const handleExport = () => {
    try {
      exportSuppliersToPDF(filteredSuppliers);
      showSuccess?.("PDF generado");
    } catch {
      showError?.("No se pudo exportar a PDF");
    }
  };

  const getId = (s) => s?.id ?? s?._id ?? s?.Id;

  const handleDelete = (supplier) => {
    const id = getId(supplier);
    if (!id) return showWarning?.("ID no válido");

    showConfirm?.(`¿Eliminar proveedor "${supplier?.empresa}"?`, {
      onConfirm: async () => {
        setSuppliers((prev) => prev.filter((x) => getId(x) !== id));
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
    <div className="min-h-screen bg-background flex w-full overflow-x-hidden">
      <Sidebar
        isCollapsed={sidebarCollapsed}
        onToggle={() => setSidebarCollapsed((s) => !s)}
      />

      <div
        className={`flex-1 transition-all duration-300 ${
          sidebarCollapsed ? "lg:ml-16" : "lg:ml-60"
        }`}
      >
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

            <button
              onClick={() => setOpenCreate(true)}
              className="h-10 px-4 rounded-md bg-primary text-primary-foreground"
            >
              + Crear Proveedor
            </button>
          </div>

          <SuppliersFilters
            onFiltersChange={setFilters}
            totalSuppliers={suppliers.length}
            filteredSuppliers={filteredSuppliers.length}
            onExport={handleExport}
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
          setSuppliers((p) =>
            p.map((x) => (getId(x) === getId(s) ? s : x))
          )
        }
      />
    </div>
  );
};

export default SuppliersPage;
