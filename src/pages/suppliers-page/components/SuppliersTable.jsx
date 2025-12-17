import React, { useEffect, useMemo, useState } from "react";
import Icon from "../../../components/AppIcon";
import Button from "../../../components/ui/Button";
import { useNotifications } from "context/NotificationContext"; // ✅ AGREGADO

const PAGE_SIZE_OPTIONS = [5, 10, 20, 50];

const asText = (v, fallback = "—") => {
  const s = v == null ? "" : String(v).trim();
  return s ? s : fallback;
};

const norm = (s) =>
  (s ?? "")
    .toString()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();

const normalizePhone = (v) => (v || "").toString().replace(/[^\d+]/g, "");

const OCCUPATION_OPTIONS = [
  { key: "Proveedor", label: "Proveedor" },
  { key: "Representante", label: "Representante" },
  { key: "Ventas", label: "Ventas" },
  { key: "Administración", label: "Administración" },
  { key: "Compras", label: "Compras" },
  { key: "Otro", label: "Otro" },
];

const occupationKeyFromAny = (raw) => {
  if (!raw) return "";
  const v = norm(raw);
  const hit = OCCUPATION_OPTIONS.find(
    (o) => norm(o.key) === v || norm(o.label) === v
  );
  return hit?.key || String(raw);
};

const getOccupationPill = (key) => {
  const v = norm(key);
  const map = {
    proveedor: "bg-blue-100 text-blue-800",
    representante: "bg-purple-100 text-purple-800",
    ventas: "bg-green-100 text-green-800",
    administracion: "bg-yellow-100 text-yellow-800",
    "administración": "bg-yellow-100 text-yellow-800",
    compras: "bg-amber-100 text-amber-800",
    otro: "bg-gray-100 text-gray-800",
  };
  return map[v] || "bg-gray-100 text-gray-800";
};

const mapSupplier = (doc) => {
  const raw = doc || {};
  return {
    id: raw.id ?? raw._id ?? "",
    nombre: raw.nombre ?? raw.name ?? "",
    empresa: raw.empresa ?? raw.company ?? "",
    tel: raw.numero ?? raw.tel ?? raw.telefono ?? raw.phone ?? "",
    correo: raw.correo ?? raw.email ?? "",
    ocupacion: raw.ocupacion ?? raw.role ?? raw.occupation ?? "",
    raw,
  };
};

const SuppliersTable = ({
  suppliers = [],
  loading = false,
  errorMsg = "",
  onEdit,
  onDelete,
}) => {
  const { showConfirm } = useNotifications(); // ✅ AGREGADO

  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(PAGE_SIZE_OPTIONS[0]);

  // ✅ si cambia la lista, reinicia paginación (evita “loops visuales”)
  useEffect(() => {
    setCurrentPage(1);
  }, [suppliers?.length]);

  const rows = useMemo(() => {
    const list = Array.isArray(suppliers) ? suppliers : [];
    return list.map(mapSupplier);
  }, [suppliers]);

  const totalItems = rows.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const safePage = Math.min(currentPage, totalPages);

  const pageItems = useMemo(() => {
    const start = (safePage - 1) * pageSize;
    return rows.slice(start, start + pageSize);
  }, [rows, safePage, pageSize]);

  // ✅ Confirmación de eliminación usando tu NotificationContext.showConfirm
  const handleConfirmDelete = (supplier) => {
    const empresa = asText(supplier?.empresa, "Sin empresa");
    const nombre = asText(supplier?.nombre, "—");
    const tel = normalizePhone(supplier?.tel);
    const correo = asText(supplier?.correo, "—");

    const msg =
      `¿Seguro que deseas eliminar este proveedor?\n\n` +
      `Empresa: ${empresa}\n` +
      `Nombre: ${nombre}\n` +
      `Tel: ${tel || "—"}\n` +
      `Correo: ${correo}\n\n` +
      `Esta acción no se puede deshacer.`;

    showConfirm(msg, {
      onConfirm: () => {
        // delega al padre (tu flujo actual)
        onDelete?.(supplier.raw);
      },
      onCancel: () => {},
    });
  };

  return (
    <div className="bg-card border border-border rounded-lg overflow-hidden">
      {loading && (
        <div className="p-4 border-b border-border text-sm text-muted-foreground">
          Cargando proveedores…
        </div>
      )}

      {!!errorMsg && (
        <div className="p-4 border-b border-border text-sm text-destructive">
          {errorMsg}
        </div>
      )}

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-muted/50">
            <tr>
              <th className="text-left p-4 font-medium">Empresa</th>
              <th className="text-left p-4 font-medium">Nombre</th>
              <th className="text-left p-4 font-medium">Tel</th>
              <th className="text-left p-4 font-medium">Correo</th>
              <th className="text-left p-4 font-medium">Ocupación</th>
              <th className="w-28 p-4 font-medium text-right">Acciones</th>
            </tr>
          </thead>

          <tbody>
            {pageItems.map((supplier) => {
              const occKey = occupationKeyFromAny(supplier.ocupacion);

              return (
                <tr
                  key={supplier.id || supplier.correo || supplier.tel}
                  className="border-b border-border hover:bg-muted/30"
                >
                  <td className="p-4">
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                        <Icon name="Building2" size={20} className="text-primary" />
                      </div>
                      <div className="min-w-0">
                        <div className="font-medium text-foreground truncate">
                          {asText(supplier.empresa, "Sin empresa")}
                        </div>
                      </div>
                    </div>
                  </td>

                  <td className="p-4">{asText(supplier.nombre)}</td>
                  <td className="p-4 font-mono">{asText(normalizePhone(supplier.tel))}</td>
                  <td className="p-4 max-w-[280px] truncate">{asText(supplier.correo)}</td>

                  <td className="p-4">
                    <span
                      className={`px-2 py-1 rounded-full text-xs font-medium ${getOccupationPill(
                        occKey
                      )}`}
                    >
                      {asText(occKey)}
                    </span>
                  </td>

                  <td className="p-4">
                    <div className="flex items-center justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => onEdit?.(supplier.raw)}
                        title="Editar proveedor"
                      >
                        <Icon name="Edit" size={16} />
                      </Button>

                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleConfirmDelete(supplier)} // ✅ CAMBIADO
                        title="Eliminar proveedor"
                      >
                        <Icon name="Trash2" size={16} />
                      </Button>
                    </div>
                  </td>
                </tr>
              );
            })}

            {pageItems.length === 0 && (
              <tr>
                <td colSpan={6} className="p-8 text-center text-muted-foreground">
                  No hay proveedores para mostrar.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Footer paginación */}
      <div className="flex items-center justify-between p-4 text-sm">
        <div className="text-muted-foreground">{totalItems} proveedor(es)</div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="text-muted-foreground">Por página:</span>
            <select
              value={pageSize}
              onChange={(e) => setPageSize(Number(e.target.value))}
              className="h-9 rounded-md border border-input bg-background px-2"
            >
              {PAGE_SIZE_OPTIONS.map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
          </div>

          <button
            type="button"
            className="text-muted-foreground hover:text-foreground disabled:opacity-50"
            onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
            disabled={safePage <= 1}
          >
            Anterior
          </button>

          <span className="text-muted-foreground">
            {safePage} / {totalPages}
          </span>

          <button
            type="button"
            className="text-muted-foreground hover:text-foreground disabled:opacity-50"
            onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
            disabled={safePage >= totalPages}
          >
            Siguiente
          </button>
        </div>
      </div>
    </div>
  );
};

export default SuppliersTable;
