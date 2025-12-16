import React, { useEffect, useMemo, useState } from "react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

import SuppliersFilters, { applySupplierFilters } from "./components/SuppliersFilters";
import SuppliersTable from "./components/SuppliersTable";

import useSupplier from "../../hooks/useSuppliers";
import { useNotifications } from "context/NotificationContext";

/* =========================
   Export PDF estilo imagen
========================= */

const toStr = (v) => (v == null ? "" : String(v));

const getPhoneMultiline = (s) => {
  const raw =
    s?.numero ??
    s?.tel ??
    s?.telefono ??
    s?.phone ??
    s?.phones ??
    s?.numeros ??
    "";

  if (Array.isArray(raw)) return raw.filter(Boolean).map(toStr).join("\n");

  const text = toStr(raw).trim();

  const parts = text
    .split(/[\n,;/|]+/g)
    .map((x) => x.trim())
    .filter(Boolean);

  if (parts.length <= 1) {
    const alt = text
      .split(/\s{2,}/g)
      .map((x) => x.trim())
      .filter(Boolean);
    if (alt.length > 1) return alt.join("\n");
  }

  return (parts.length ? parts : [text]).filter(Boolean).join("\n");
};

const exportSuppliersToPDF = (suppliers) => {
  const rows = (Array.isArray(suppliers) ? suppliers : []).map((s, idx) => {
    const nombre = toStr(s?.nombre ?? s?.name ?? "").trim();
    const empresa = toStr(s?.empresa ?? s?.company ?? "").trim();
    const numero = getPhoneMultiline(s);
    const correo = toStr(s?.correo ?? s?.email ?? "").trim();
    const ocup = toStr(s?.ocupacion ?? s?.role ?? s?.occupation ?? "").trim();

    return [String(idx + 1), nombre, empresa, numero, correo, ocup];
  });

  const doc = new jsPDF({
    orientation: "portrait",
    unit: "pt",
    format: "letter", // si quieres A4: "a4"
  });

  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.text("PROVEEDORES", 40, 32);

  autoTable(doc, {
    startY: 50,
    head: [["", "NOMBRE", "EMPRESA", "NÚMERO", "CORREO", "OCUPACIÓN"]],
    body: rows,

    theme: "grid",
    styles: {
      font: "helvetica",
      fontSize: 9,
      cellPadding: 6,
      valign: "middle",
      lineColor: [0, 0, 0],
      lineWidth: 0.8,
      textColor: [0, 0, 0],
    },
    headStyles: {
      fillColor: [255, 255, 255],
      textColor: [0, 0, 0],
      fontStyle: "bold",
      halign: "center",
      lineWidth: 1,
    },
    columnStyles: {
      0: { cellWidth: 26, halign: "center" }, // #
      1: { cellWidth: 160 }, // NOMBRE
      2: { cellWidth: 90, halign: "center" }, // EMPRESA
      3: { cellWidth: 95, halign: "center" }, // NÚMERO
      4: { cellWidth: 115 }, // CORREO
      5: { cellWidth: 120 }, // OCUPACIÓN
    },

    // correo azul + subrayado (estilo link del ejemplo)
    didParseCell: function (data) {
      if (data.section === "body" && data.column.index === 4) {
        const email = (data.cell.raw ?? "").toString().trim();
        if (email) data.cell.styles.textColor = [0, 0, 255];
      }
    },
    didDrawCell: function (data) {
      if (data.section === "body" && data.column.index === 4) {
        const txt = data.cell.text?.join(" ") ?? "";
        if (!txt) return;
        const x = data.cell.textPos.x;
        const y = data.cell.textPos.y + 2;
        const w = doc.getTextWidth(txt);
        doc.setDrawColor(0, 0, 255);
        doc.setLineWidth(0.5);
        doc.line(x, y, x + w, y);
      }
    },

    margin: { left: 30, right: 30 },
    rowPageBreak: "avoid",
    pageBreak: "auto",
  });

  doc.save("proveedores.pdf");
};

/* =========================
   Página Padre
========================= */

const SuppliersPage = () => {
  const { showError, showSuccess } = useNotifications();
  const { getSuppliers, loading } = useSupplier();

  const [suppliers, setSuppliers] = useState([]);
  const [filters, setFilters] = useState({
    search: "",
    ocupacion: "",
    hasEmail: "",
  });

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const res = await getSuppliers();
        const data = Array.isArray(res) ? res : Array.isArray(res?.data) ? res.data : [];
        if (mounted) setSuppliers(data);
      } catch (e) {
        if (mounted) showError?.("No se pudieron cargar los proveedores");
      }
    })();
    return () => (mounted = false);
  }, [getSuppliers, showError]);

  const filteredSuppliers = useMemo(() => {
    return applySupplierFilters(suppliers, filters);
  }, [suppliers, filters]);

  const handleExport = () => {
    try {
      exportSuppliersToPDF(filteredSuppliers);
      showSuccess?.("PDF generado");
    } catch (e) {
      showError?.("No se pudo exportar a PDF");
    }
  };

  return (
    <div className="p-6">
      <SuppliersFilters
        onFiltersChange={setFilters}
        totalSuppliers={suppliers.length}
        filteredSuppliers={filteredSuppliers.length}
        onExport={handleExport}
      />

      {/* IMPORTANTE: la tabla recibe LOS FILTRADOS */}
      <SuppliersTable suppliers={filteredSuppliers} />

      {loading && (
        <div className="mt-4 text-sm text-muted-foreground">Cargando…</div>
      )}
    </div>
  );
};

export default SuppliersPage;
