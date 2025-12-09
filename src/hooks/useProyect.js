// hooks/useProyecto.js
import { useState, useCallback, useRef } from "react";
import proyectoService from "../services/proyectoService";

const extractList = (resp) => {
  if (Array.isArray(resp)) return resp;
  if (resp?.success && Array.isArray(resp?.data)) return resp.data;
  if (Array.isArray(resp?.data?.items)) return resp.data.items;
  if (Array.isArray(resp?.result)) return resp.result;
  return [];
};

const unwrap = (resp) =>
  resp && typeof resp === "object" && "data" in resp ? resp.data : resp;

const useProyecto = () => {
  const [proyectos, setProyectos] = useState([]);

  // ⬇️ Estados separados
  const [loadingList, setLoadingList] = useState(false);
  const [loadingSave, setLoadingSave] = useState(false);
  const [loadingDelete, setLoadingDelete] = useState(false);
  const [loadingCurrency, setLoadingCurrency] = useState(false);

  const [error, setError] = useState(null);

  const fetchedOnceRef = useRef(false);
  const proyectosLenRef = useRef(0); // para evitar dependencia del estado en callbacks

  // Mantener sincronizado el len en un ref
  proyectosLenRef.current = proyectos.length;

  // ========= PROYECTOS (tu backend) =========
  const getProyectos = useCallback(async ({ force = false, signal } = {}) => {
    if (!force && fetchedOnceRef.current && proyectosLenRef.current > 0) {
      return proyectos;
    }

    setLoadingList(true);
    setError(null);
    try {
      const resp = await proyectoService.getProyectos({ signal });
      const list = extractList(resp);
      setProyectos(list);
      fetchedOnceRef.current = true;
      return list;
    } catch (err) {
      if (err?.name !== "AbortError") {
        console.error("Error en useProyecto.getProyectos:", err);
        setError(err);
      }
      throw err;
    } finally {
      setLoadingList(false);
    }
  }, []); // ⬅️ sin dependencia de `proyectos`

  const getProyectoById = useCallback(async (id, { signal } = {}) => {
    setError(null);
    try {
      const resp = await proyectoService.getProyectoById(id, { signal });
      return unwrap(resp);
    } catch (err) {
      if (err?.name !== "AbortError") {
        console.error("Error en useProyecto.getProyectoById:", err);
        setError(err);
      }
      throw err;
    }
  }, []);

  const createProyecto = useCallback(
    async (payload, { signal, refresh = false } = {}) => {
      setLoadingSave(true);
      setError(null);
      try {
        const resp = await proyectoService.createProyecto(payload, { signal });
        const created = unwrap(resp);
        if (created) {
          setProyectos((prev) => [...prev, created]);
          proyectosLenRef.current += 1;
        }
        if (refresh) {
          // invalida cache y recarga lista desde backend
          fetchedOnceRef.current = false;
          await getProyectos({ force: true, signal });
        }
        return created;
      } catch (err) {
        if (err?.name !== "AbortError") {
          console.error("Error en useProyecto.createProyecto:", err);
          setError(err);
        }
        throw err;
      } finally {
        setLoadingSave(false);
      }
    },
    [getProyectos]
  );

  const updateProyecto = useCallback(
    async (id, payload, { signal, refresh = false } = {}) => {
      setLoadingSave(true);
      setError(null);
      try {
        // Incluir totales con/sin IVA si vinieron del modal
        const nextPayload = { ...payload };
        if (payload.totalPresupuestoSinIva != null || payload.totalPresupuestoConIva != null || payload.porcentajeIva != null) {
          nextPayload.totalPresupuestoSinIva = Number(payload.totalPresupuestoSinIva);
          nextPayload.totalPresupuestoConIva = Number(payload.totalPresupuestoConIva);
          nextPayload.porcentajeIva = Number(payload.porcentajeIva);
        }

        const resp = await proyectoService.updateProyecto(id, nextPayload, {
          signal,
        });
        const updated = unwrap(resp);

        setProyectos((prev) =>
          prev.map((p) =>
            String(p.id ?? p._id) === String(id) ? { ...p, ...updated } : p
          )
        );

        if (refresh) {
          fetchedOnceRef.current = false;
          await getProyectos({ force: true, signal });
        }
        return updated;
      } catch (err) {
        if (err?.name !== "AbortError") {
          console.error("Error en useProyecto.updateProyecto:", err);
          setError(err);
        }
        throw err;
      } finally {
        setLoadingSave(false);
      }
    },
    [getProyectos]
  );

  const deleteProyecto = useCallback(
    async (id, { signal, refresh = false } = {}) => {
      setLoadingDelete(true);
      setError(null);
      try {
        const resp = await proyectoService.deleteProyecto(id, { signal });
        setProyectos((prev) =>
          prev.filter((p) => String(p.id ?? p._id) !== String(id))
        );
        proyectosLenRef.current = Math.max(0, proyectosLenRef.current - 1);

        if (refresh) {
          fetchedOnceRef.current = false;
          await getProyectos({ force: true, signal });
        }

        return unwrap(resp) ?? true;
      } catch (err) {
        if (err?.name !== "AbortError") {
          console.error("Error en useProyecto.deleteProyecto:", err);
          setError(err);
        }
        throw err;
      } finally {
        setLoadingDelete(false);
      }
    },
    [getProyectos]
  );

  // ========= STATS CACHED (dashboard rápido) =========
  // GET /proyectos/stats/get
  const getCachedStats = useCallback(async ({ signal } = {}) => {
    setLoading(true);
    setError(null);
    try {
      const resp = await proyectoService.getCachedStats({ signal });
      // aquí NO tocamos proyectos, esto es data de métricas.
      // Puede venir como { data: {...} } o directo {...}
      return unwrap(resp);
    } catch (err) {
      console.error("Error en useProyecto.getCachedStats:", err);
      setError(err);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  // ========= (currencyapi.com) =========
  const getCurrencyRates = useCallback(
    async ({ base = "USD", currencies = [] } = {}, { signal } = {}) => {
      setLoadingCurrency(true);
      setError(null);
      try {
        const resp = await proyectoService.getCurrencyRates(
          { base, currencies },
          { signal }
        );
        return resp; // JSON completo
      } catch (err) {
        if (err?.name !== "AbortError") {
          console.error("Error en useProyecto.getCurrencyRates:", err);
          setError(err);
        }
        throw err;
      } finally {
        setLoadingCurrency(false);
      }
    },
    []
  );

  /**
   * Devuelve { MXN: 18.2, EUR: 0.92, ... }
   */
  const getCurrencyRatesMap = useCallback(
    async ({ base = "USD", currencies = [] } = {}, { signal } = {}) => {
      setLoadingCurrency(true);
      setError(null);
      try {
        const map = await proyectoService.getCurrencyRatesMap(
          { base, currencies },
          { signal }
        );
        return map;
      } catch (err) {
        if (err?.name !== "AbortError") {
          console.error("Error en useProyecto.getCurrencyRatesMap:", err);
          setError(err);
        }
        throw err;
      } finally {
        setLoadingCurrency(false);
      }
    },
    []
  );

  return {
    proyectos,
    // estados de carga granulares
    loadingList,
    loadingSave,
    loadingDelete,
    loadingCurrency,
    // compat: puedes exponer un `loading` general si quieres
    loading: loadingList || loadingSave || loadingDelete || loadingCurrency,

    error,

    // acciones backend propio
    getProyectos,
    getProyectoById,
    createProyecto,
    updateProyecto,
    deleteProyecto,

    // dashboard / KPIs cacheados
    getCachedStats,

    // acciones API externa (currencyapi)
    getCurrencyRates,
    getCurrencyRatesMap,
  };
};

export default useProyecto;
