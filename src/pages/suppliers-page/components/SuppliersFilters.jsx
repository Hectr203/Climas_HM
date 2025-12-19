import React, { useEffect, useMemo, useState } from "react";
import { Search, X, ChevronUp, ChevronDown, Download } from "lucide-react";

import Button from "../../../components/ui/Button";
import Input from "../../../components/ui/Input";
import Select from "../../../components/ui/Select";

/* =========================
   Helpers
========================= */
const norm = (s) =>
  (s ?? "")
    .toString()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();

/** ✅ Named export que tu index importa */
export const applySupplierFilters = (suppliers, filters) => {
  const list = Array.isArray(suppliers) ? suppliers : [];
  const f = filters || {};
  const q = norm(f.search);
  const oc = norm(f.ocupacion);

  return list.filter((s) => {
    const nombre = norm(s?.nombre ?? s?.name ?? s?.contacto ?? "");
    const empresa = norm(s?.empresa ?? s?.company ?? "");
    const tel = norm(s?.numero ?? s?.tel ?? s?.telefono ?? s?.phone ?? "");
    const correo = norm(s?.correo ?? s?.email ?? "");

    // ✅ ocupa más fallbacks por si viene con otro nombre
    const ocupacion = norm(
      s?.ocupacion ??
        s?.role ??
        s?.puesto ??
        s?.rol ??
        s?.occupation ??
        ""
    );

    const matchSearch =
      !q ||
      nombre.includes(q) ||
      empresa.includes(q) ||
      tel.includes(q) ||
      correo.includes(q);

    const matchOcupacion = !oc || ocupacion === oc || ocupacion.includes(oc);

    return matchSearch && matchOcupacion;
  });
};

/* =========================
   UI
========================= */

const SuppliersFilters = ({
  onFiltersChange,
  totalSuppliers = 0,
  filteredSuppliers = 0,
  onExport,
}) => {
  const [filters, setFilters] = useState({
    search: "",
    ocupacion: "",
  });

  const [isExpanded, setIsExpanded] = useState(false);

  // ✅ evita “rebotes” raros: avisa al padre SOLO cuando cambia filters
  useEffect(() => {
    onFiltersChange?.(filters);
  }, [filters, onFiltersChange]);

  const ocupacionOptions = useMemo(
    () => [
      { value: "", label: "Todas las Ocupaciones" },

      { value: "Mantenimiento de HVAC/R", label: "Mantenimiento de HVAC/R" },
      { value: "Refrigerantes", label: "Refrigerantes" },
      { value: "Aislamiento", label: "Aislamiento" },
      { value: "Rejillas", label: "Rejillas" },
      { value: "Difusores", label: "Difusores" },
      { value: "Multimarcas", label: "Multimarcas" },
      { value: "Filtros", label: "Filtros" },
      {
        value: "Tubería de cobre para instalaciones",
        label: "Tubería de cobre para instalaciones",
      },
      { value: "Minisplit", label: "Minisplit" },
      {
        value: "Sistemas hidrónicos para HVAC y plomería",
        label: "Sistemas hidrónicos para HVAC y plomería",
      },
      { value: "Torres de enfriamiento", label: "Torres de enfriamiento" },
      {
        value:
          "Servicio Integral de Aire Acondicionado e Instalaciones Electromecánicas",
        label:
          "Servicio Integral de Aire Acondicionado e Instalaciones Electromecánicas",
      },
      { value: "Louvers", label: "Louvers" },
      { value: "Equipos de AC Minisplit", label: "Equipos de AC Minisplit" },
      { value: "Accesorios", label: "Accesorios" },
      { value: "Herramientas", label: "Herramientas" },
      { value: "Gas", label: "Gas" },
    ],
    []
  );

  const update = (key, value) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  };

  const clear = () => {
    setFilters({ search: "", ocupacion: "" });
  };

  const hasActiveFilters = Object.values(filters).some(Boolean);

  return (
    <div className="bg-card border border-border rounded-lg p-6 mb-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-4">
          <h3 className="text-lg font-semibold text-foreground">
            Filtros de Proveedores
          </h3>
          <span className="text-sm text-muted-foreground">
            Mostrando {filteredSuppliers} de {totalSuppliers}
          </span>
        </div>

        <div className="flex items-center space-x-2">
          {hasActiveFilters && (
            <Button
              variant="outline"
              size="sm"
              onClick={clear}
              iconName="X"
              iconPosition="left"
            >
              Limpiar
            </Button>
          )}

          <button
            type="button"
            onClick={() => setIsExpanded((v) => !v)}
            className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
          >
            {isExpanded ? "Menos Filtros" : "Más Filtros"}
            {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </button>
        </div>
      </div>

      {/* Search */}
      <div className="relative mb-4">
        <Input
          type="search"
          placeholder="Buscar por nombre, empresa, tel o correo…"
          value={filters.search}
          onChange={(e) => update("search", e.target.value)}
          className="pl-10"
        />
        <Search
          size={16}
          className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
        />
      </div>

      {/* Filters row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
        <Select
          label="Ocupación"
          options={ocupacionOptions}
          value={filters.ocupacion}
          onChange={(v) => update("ocupacion", v)}
        />

        {/* si luego agregas más filtros, los pones dentro de isExpanded */}
        {isExpanded ? (
          <div className="md:col-span-1" />
        ) : (
          <div className="md:col-span-1" />
        )}

        <Button
          variant="outline"
          className="w-full"
          disabled={!filteredSuppliers}
          onClick={onExport}
          iconName="Download"
          iconPosition="left"
        >
          Exportar
        </Button>
      </div>

      {/* Pills */}
      {hasActiveFilters && (
        <div className="flex gap-2 mt-4 pt-4 border-t border-border flex-wrap">
          {filters.search && (
            <span className="bg-primary/10 text-primary px-2 py-1 rounded text-sm">
              Búsqueda: {filters.search}
            </span>
          )}
          {filters.ocupacion && (
            <span className="bg-primary/10 text-primary px-2 py-1 rounded text-sm">
              Ocupación: {filters.ocupacion}
            </span>
          )}
        </div>
      )}
    </div>
  );
};

export default SuppliersFilters;
