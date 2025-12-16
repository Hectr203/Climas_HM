import React, { useEffect, useMemo, useState } from "react";
import Icon from "../../../components/AppIcon";
import Button from "../../../components/ui/Button";
import useSupplier from "../../../hooks/useSuppliers";
import { useNotifications } from "context/NotificationContext";

/* === Config === */
const PAGE_SIZE_OPTIONS = [5, 10, 20, 50];

/* === Helpers === */
const safeUUID = () => {
  if (typeof crypto !== "undefined" && crypto.randomUUID) return crypto.randomUUID();
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
};

const asText = (v, fallback = "—") => {
  const s = v == null ? "" : String(v).trim();
  return s ? s : fallback;
};

const normalizePhone = (v) => (v || "").toString().replace(/[^\d+]/g, "");

const norm = (s) =>
  (s ?? "")
    .toString()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();

const OCCUPATION_OPTIONS = [
  { key: "Proveedor", label: "Proveedor" },
  { key: "Representante", label: "Representante" },
  { key: "Ventas", label: "Ventas" },
  { key: "Administración", label: "Administración" },
  { key: "Compras", label: "Compras" },
  { key: "Otro", label: "Otro" },
];

const occupationKeyFromAny = (raw) => {
  if (!raw) return null;
  const v = norm(raw);
  const hit = OCCUPATION_OPTIONS.find((o) => norm(o.key) === v || norm(o.label) === v);
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

/* Normalizador Proveedor */
const mapSupplierDocStrict = (doc) => {
  const id = doc?.id ?? doc?._id ?? safeUUID();
  return {
    id,
    nombre: doc?.nombre ?? "",
    empresa: doc?.empresa ?? "",
    tel: doc?.numero ?? doc?.tel ?? "",
    correo: doc?.correo ?? "",
    ocupacion: doc?.ocupacion ?? "",
    raw: doc,
  };
};

const SuppliersTable = ({ suppliers, onSupplierSelect }) => {
  const { showConfirm, showSuccess, showError } = useNotifications();
  const { getSuppliers, deleteSupplier, loading } = useSupplier();

  // ✅ ÚNICA fuente de verdad para lo renderizado
  const [docs, setDocs] = useState([]);
  const [errorMsg, setErrorMsg] = useState("");

  const [sortConfig] = useState({ key: "empresa", direction: "asc" });
  const [selectedSuppliers, setSelectedSuppliers] = useState([]);
  const [expandedRows, setExpandedRows] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(PAGE_SIZE_OPTIONS[0]);

  // ✅ Si vienen por props, sincroniza a docs
  useEffect(() => {
    if (Array.isArray(suppliers)) {
      setDocs(suppliers);
      setErrorMsg("");
      setCurrentPage(1);
    }
  }, [suppliers]);

  // ✅ Si NO vienen por props, cargar del backend
  useEffect(() => {
    let mounted = true;
    (async () => {
      if (Array.isArray(suppliers)) return;
      try {
        const res = await getSuppliers();
        if (!mounted) return;

        const data = Array.isArray(res) ? res : Array.isArray(res?.data) ? res.data : [];
        setDocs(data);
        setErrorMsg("");
        setCurrentPage(1);
      } catch {
        if (mounted) setErrorMsg("No se pudieron cargar los proveedores.");
      }
    })();

    return () => {
      mounted = false;
    };
  }, [suppliers, getSuppliers]);

  const suppliersNorm = useMemo(() => docs.map(mapSupplierDocStrict), [docs]);

  const sortedSuppliers = useMemo(() => {
    const list = [...suppliersNorm];
    const { key, direction } = sortConfig;
    return list.sort((a, b) => {
      const av = (a[key] ?? "").toString().toLowerCase();
      const bv = (b[key] ?? "").toString().toLowerCase();
      if (av < bv) return direction === "asc" ? -1 : 1;
      if (av > bv) return direction === "asc" ? 1 : -1;
      return 0;
    });
  }, [suppliersNorm, sortConfig]);

  const totalItems = sortedSuppliers.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const safePage = Math.min(currentPage, totalPages);

  const pageItems = sortedSuppliers.slice(
    (safePage - 1) * pageSize,
    safePage * pageSize
  );

  // ✅ Mantener la página válida cuando cambia totalPages
  useEffect(() => {
    if (currentPage > totalPages) setCurrentPage(totalPages);
  }, [totalPages, currentPage]);

  const removeFromDocsById = (supplierId) => {
    setDocs((prev) =>
      (Array.isArray(prev) ? prev : []).filter((x) => (x?.id ?? x?._id) !== supplierId)
    );

    setSelectedSuppliers((prev) => prev.filter((id) => id !== supplierId));
    setExpandedRows((prev) => prev.filter((id) => id !== supplierId));
  };

  const handleDelete = (supplier) => {
    showConfirm(`¿Eliminar proveedor "${supplier.empresa}"?`, {
      onConfirm: async () => {
        const snapshot = docs; // rollback sencillo
        // ✅ Optimista: quita de UI al instante
        removeFromDocsById(supplier.id);

        try {
          await deleteSupplier(supplier.id);
          showSuccess("Proveedor eliminado");
        } catch {
          // ✅ Si falla, regresamos el estado anterior
          setDocs(snapshot);
          showError("No se pudo eliminar el proveedor");
        }
      },
    });
  };

  return (
    <div className="bg-card border border-border rounded-lg overflow-visible">
      {loading && (
        <div className="p-4 border-b border-border text-sm text-muted-foreground">
          Cargando proveedores…
        </div>
      )}

      {!!errorMsg && (
        <div className="p-4 border-b border-border text-sm text-red-600">
          {errorMsg}
        </div>
      )}

      {/* Desktop */}
      <div className="hidden lg:block overflow-x-auto">
        <table className="w-full">
          <thead className="bg-muted/50">
            <tr>
              <th className="w-12 p-4"></th>
              <th className="text-left p-4 font-medium">Empresa</th>
              <th className="text-left p-4 font-medium">Nombre</th>
              <th className="text-left p-4 font-medium">Tel</th>
              <th className="text-left p-4 font-medium">Correo</th>
              <th className="text-left p-4 font-medium">Ocupación</th>
              <th className="w-24 p-4 font-medium">Acciones</th>
            </tr>
          </thead>

          <tbody>
            {pageItems.map((supplier) => {
              const occKey = occupationKeyFromAny(supplier.ocupacion);

              return (
                <tr
                  key={supplier.id}
                  className="border-b border-border hover:bg-muted/30"
                >
                  <td className="p-4"></td>

                  <td className="p-4">
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                        <Icon name="Building2" size={20} className="text-primary" />
                      </div>
                      <div className="min-w-0">
                        <div className="font-medium text-foreground">
                          {asText(supplier.empresa, "Sin empresa")}
                        </div>
                      </div>
                    </div>
                  </td>

                  <td className="p-4">{asText(supplier.nombre)}</td>
                  <td className="p-4 font-mono">{asText(normalizePhone(supplier.tel))}</td>
                  <td className="p-4 truncate max-w-[260px]">{asText(supplier.correo)}</td>

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
                    <div className="flex items-center space-x-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => onSupplierSelect?.(supplier.raw)}
                        title="Editar proveedor"
                      >
                        <Icon name="Edit" size={16} />
                      </Button>

                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDelete(supplier)}
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
                <td colSpan={7} className="p-8 text-center text-muted-foreground">
                  No hay proveedores para mostrar.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default SuppliersTable;
