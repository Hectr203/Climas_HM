// hooks/usePrecio.js
import { useState, useCallback, useRef } from "react";
import precioService from "../services/precioService"; // <-- corregido

const extractList = (resp) => {
  if (Array.isArray(resp)) return resp;
  if (resp?.success && Array.isArray(resp?.data)) return resp.data;
  if (Array.isArray(resp?.data?.items)) return resp.data.items;
  if (Array.isArray(resp?.result)) return resp.result;
  if (Array.isArray(resp?.data?.data)) return resp.data.data;
  return [];
};

const unwrap = (resp) =>
  resp && typeof resp === "object" && "data" in resp ? resp.data : resp;

const usePrecio = () => {
  const [precios, setPrecios] = useState([]);

  const [loadingList, setLoadingList] = useState(false);
  const [loadingSave, setLoadingSave] = useState(false);
  const [loadingDelete, setLoadingDelete] = useState(false);
  const [error, setError] = useState(null);

  const fetchedOnceRef = useRef(false);
  const preciosLenRef = useRef(0);

  preciosLenRef.current = precios.length;

  // ====================== OBTENER LISTA ======================
  const getPrecios = useCallback(
    async ({ force = false, params = {}, signal } = {}) => {
      if (!force && fetchedOnceRef.current && preciosLenRef.current > 0) {
        return precios;
      }

      setLoadingList(true);
      setError(null);
      try {
        const resp = await precioService.getPrecios(params, { signal });
        const list = extractList(resp);
        setPrecios(list);
        fetchedOnceRef.current = true;
        return list;
      } catch (err) {
        if (err?.name !== "AbortError") {
          console.error("Error en usePrecio.getPrecios:", err);
          setError(err);
        }
        throw err;
      } finally {
        setLoadingList(false);
      }
    },
    []
  );

  const getPreciosByCotizacion = useCallback(
    async (cotizacionId, { force = false, page, limit, signal } = {}) => {
      const params = { cotizacionId };
      if (page != null) params.page = page;
      if (limit != null) params.limit = limit;
      return getPrecios({ force, params, signal });
    },
    [getPrecios]
  );

  // ====================== OBTENER POR ID ======================
  const getPrecioById = useCallback(async (id, { signal } = {}) => {
    setError(null);
    try {
      const resp = await precioService.getPrecioById(id, { signal });
      return unwrap(resp);
    } catch (err) {
      if (err?.name !== "AbortError") {
        console.error("Error en usePrecio.getPrecioById:", err);
        setError(err);
      }
      throw err;
    }
  }, []);

  // ====================== CREAR ======================
  const createPrecio = useCallback(
    async (payload, { signal, refresh = false, params = {} } = {}) => {
      setLoadingSave(true);
      setError(null);
      try {
        const resp = await precioService.createPrecio(payload, { signal });
        const created = unwrap(resp);

        if (created) {
          setPrecios((prev) => [...prev, created]);
          preciosLenRef.current += 1;
        }

        if (refresh) {
          fetchedOnceRef.current = false;
          await getPrecios({ force: true, params, signal });
        }

        return created;
      } catch (err) {
        if (err?.name !== "AbortError") {
          console.error("Error en usePrecio.createPrecio:", err);
          setError(err);
        }
        throw err;
      } finally {
        setLoadingSave(false);
      }
    },
    [getPrecios]
  );

  // ====================== ACTUALIZAR ======================
  const updatePrecio = useCallback(
    async (id, payload, { signal, refresh = false, params = {} } = {}) => {
      setLoadingSave(true);
      setError(null);
      try {
        const resp = await precioService.updatePrecio(id, payload, { signal });
        const updated = unwrap(resp);

        setPrecios((prev) =>
          prev.map((p) =>
            String(p.id ?? p._id) === String(id) ? { ...p, ...updated } : p
          )
        );

        if (refresh) {
          fetchedOnceRef.current = false;
          await getPrecios({ force: true, params, signal });
        }

        return updated;
      } catch (err) {
        if (err?.name !== "AbortError") {
          console.error("Error en usePrecio.updatePrecio:", err);
          setError(err);
        }
        throw err;
      } finally {
        setLoadingSave(false);
      }
    },
    [getPrecios]
  );

  // ====================== ELIMINAR ======================
  const deletePrecio = useCallback(
    async (id, { signal, refresh = false, params = {} } = {}) => {
      setLoadingDelete(true);
      setError(null);
      try {
        const resp = await precioService.deletePrecio(id, { signal });

        setPrecios((prev) =>
          prev.filter((p) => String(p.id ?? p._id) !== String(id))
        );

        preciosLenRef.current = Math.max(0, preciosLenRef.current - 1);

        if (refresh) {
          fetchedOnceRef.current = false;
          await getPrecios({ force: true, params, signal });
        }

        return unwrap(resp) ?? true;
      } catch (err) {
        if (err?.name !== "AbortError") {
          console.error("Error en usePrecio.deletePrecio:", err);
          setError(err);
        }
        throw err;
      } finally {
        setLoadingDelete(false);
      }
    },
    [getPrecios]
  );

  return {
    precios,
    loadingList,
    loadingSave,
    loadingDelete,
    loading: loadingList || loadingSave || loadingDelete,
    error,

    getPrecios,
    getPreciosByCotizacion,
    getPrecioById,
    createPrecio,
    updatePrecio,
    deletePrecio,
  };
};

export default usePrecio;
