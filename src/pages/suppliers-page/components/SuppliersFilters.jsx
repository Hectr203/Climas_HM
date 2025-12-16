import React, { useState } from "react";
import { Search, X, ChevronUp, ChevronDown, Download } from "lucide-react";

/* =========================
   UI básicos
========================= */

const Button = ({
  children,
  variant = "default",
  size = "default",
  onClick,
  iconName,
  iconPosition,
  className = "",
  disabled = false,
  type = "button",
  title,
}) => {
  const icons = {
    X,
    ChevronUp,
    ChevronDown,
    Download,
  };
  const Icon = icons[iconName] || null;

  const base =
    "inline-flex items-center justify-center font-medium rounded-md transition-colors";
  const variants = {
    default: "bg-primary text-primary-foreground hover:bg-primary/90",
    outline: "border border-input bg-background hover:bg-accent",
    ghost: "hover:bg-accent",
  };
  const sizes = {
    default: "h-10 px-4 py-2",
    sm: "h-9 px-3 text-sm",
  };

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      title={title}
      className={`${base} ${variants[variant]} ${sizes[size]} ${
        disabled ? "opacity-60 cursor-not-allowed" : ""
      } ${className}`}
    >
      {Icon && iconPosition === "left" && <Icon size={16} className="mr-2" />}
      {children}
      {Icon && iconPosition === "right" && <Icon size={16} className="ml-2" />}
    </button>
  );
};

const Input = ({ placeholder, value, onChange, className = "" }) => (
  <input
    type="search"
    placeholder={placeholder}
    value={value}
    onChange={onChange}
    className={`flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${className}`}
  />
);

const Select = ({ label, options, value, onChange }) => (
  <div>
    <label className="block text-sm font-medium mb-2">{label}</label>
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
    >
      {options.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  </div>
);

/* =========================
   SuppliersFilters
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

  const ocupacionOptions = [
    { value: "", label: "Todas las Ocupaciones" },
    { value: "Proveedor", label: "Proveedor" },
    { value: "Representante", label: "Representante" },
    { value: "Ventas", label: "Ventas" },
    { value: "Administración", label: "Administración" },
    { value: "Compras", label: "Compras" },
    { value: "Otro", label: "Otro" },
  ];

  const update = (key, value) => {
    const next = { ...filters, [key]: value };
    setFilters(next);
    onFiltersChange?.(next);
  };

  const clear = () => {
    const cleared = { search: "", ocupacion: "" };
    setFilters(cleared);
    onFiltersChange?.(cleared);
  };

  const hasActiveFilters = Object.values(filters).some(Boolean);

  return (
    <div className="bg-card border border-border rounded-lg p-6 mb-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-4">
          <h3 className="text-lg font-semibold">Filtros de Proveedores</h3>
          <span className="text-sm text-muted-foreground">
            Mostrando {filteredSuppliers} de {totalSuppliers}
          </span>
        </div>

        <div className="flex items-center space-x-2">
          {hasActiveFilters && (
            <Button
              variant="outline"
              size="sm"
              iconName="X"
              iconPosition="left"
              onClick={clear}
            >
              Limpiar Filtros
            </Button>
          )}

          <Button
            variant="ghost"
            size="sm"
            iconName={isExpanded ? "ChevronUp" : "ChevronDown"}
            iconPosition="right"
            onClick={() => setIsExpanded(!isExpanded)}
          >
            {isExpanded ? "Menos Filtros" : "Más Filtros"}
          </Button>
        </div>
      </div>

      {/* Search */}
      <div className="relative mb-4">
        <Input
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

      {/* Filters */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Select
          label="Ocupación"
          options={ocupacionOptions}
          value={filters.ocupacion}
          onChange={(v) => update("ocupacion", v)}
        />

        <div className="flex items-end">
          <Button
            variant="outline"
            iconName="Download"
            iconPosition="left"
            className="w-full"
            disabled={!filteredSuppliers}
            onClick={onExport}
          >
            Exportar
          </Button>
        </div>
      </div>

      {/* Pills */}
      {hasActiveFilters && (
        <div className="flex gap-2 mt-4 pt-4 border-t">
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
