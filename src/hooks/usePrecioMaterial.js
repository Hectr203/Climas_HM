// hooks/usePrecioMaterial.js
import { useState, useCallback, useRef } from 'react';
import precioMaterialService from '../services/precioMaterialService';

const unwrap = (resp) => (resp && typeof resp === 'object' && 'data' in resp ? resp.data : resp);

const usePrecioMaterial = () => {
  const [preciosMaterial, setPreciosMaterial] = useState([]);
  const [loadingList, setLoadingList] = useState(false);
  const [loadingSave, setLoadingSave] = useState(false);
  const [loadingDelete, setLoadingDelete] = useState(false);
  const [error, setError] = useState(null);
  
  const fetchedOnceRef = useRef(false);
  const preciosMaterialLenRef = useRef(0);

  // ====================== OBTENER LISTA ======================
  const getPreciosMaterial = useCallback(
    async ({ force = false, params = {}, signal } = {}) => {
      if (!force && fetchedOnceRef.current) {
        return preciosMaterial;
      }

      setLoadingList(true);
      setError(null);
      try {
        const resp = await precioMaterialService.getPreciosMaterial(params, { signal });
        const list = unwrap(resp) ?? [];
        
        setPreciosMaterial(Array.isArray(list) ? list : []);
        preciosMaterialLenRef.current = Array.isArray(list) ? list.length : 0;
        fetchedOnceRef.current = true;

        return list;
      } catch (err) {
        if (err?.name !== 'AbortError') {
          console.error('Error en usePrecioMaterial.getPreciosMaterial:', err);
          setError(err);
        }
        throw err;
      } finally {
        setLoadingList(false);
      }
    },
    [preciosMaterial]
  );

  // ====================== OBTENER POR ID ======================
  const getPrecioMaterialById = useCallback(
    async (id, { signal } = {}) => {
      setLoadingList(true);
      setError(null);
      try {
        const resp = await precioMaterialService.getPrecioMaterialById(id, { signal });
        return unwrap(resp);
      } catch (err) {
        if (err?.name !== 'AbortError') {
          console.error('Error en usePrecioMaterial.getPrecioMaterialById:', err);
          setError(err);
        }
        throw err;
      } finally {
        setLoadingList(false);
      }
    },
    []
  );

  // ====================== CREAR ======================
  const createPrecioMaterial = useCallback(
    async (payload, { signal, refresh = false, params = {} } = {}) => {
      setLoadingSave(true);
      setError(null);
      try {
        const resp = await precioMaterialService.createPrecioMaterial(payload, { signal });
        const created = unwrap(resp);

        if (created) {
          setPreciosMaterial((prev) => [created, ...prev]);
          preciosMaterialLenRef.current += 1;
        }

        if (refresh) {
          fetchedOnceRef.current = false;
          await getPreciosMaterial({ force: true, params, signal });
        }

        return created;
      } catch (err) {
        if (err?.name !== 'AbortError') {
          console.error('Error en usePrecioMaterial.createPrecioMaterial:', err);
          setError(err);
        }
        throw err;
      } finally {
        setLoadingSave(false);
      }
    },
    [getPreciosMaterial]
  );

  // ====================== ACTUALIZAR ======================
  const updatePrecioMaterial = useCallback(
    async (id, payload, { signal, refresh = false, params = {} } = {}) => {
      setLoadingSave(true);
      setError(null);
      try {
        const resp = await precioMaterialService.updatePrecioMaterial(id, payload, { signal });
        const updated = unwrap(resp);

        if (updated) {
          setPreciosMaterial((prev) =>
            prev.map((p) => (String(p.id ?? p._id) === String(id) ? updated : p))
          );
        }

        if (refresh) {
          fetchedOnceRef.current = false;
          await getPreciosMaterial({ force: true, params, signal });
        }

        return updated;
      } catch (err) {
        if (err?.name !== 'AbortError') {
          console.error('Error en usePrecioMaterial.updatePrecioMaterial:', err);
          setError(err);
        }
        throw err;
      } finally {
        setLoadingSave(false);
      }
    },
    [getPreciosMaterial]
  );

  // ====================== ELIMINAR ======================
  const deletePrecioMaterial = useCallback(
    async (id, { signal, refresh = false, params = {} } = {}) => {
      setLoadingDelete(true);
      setError(null);
      try {
        const resp = await precioMaterialService.deletePrecioMaterial(id, { signal });

        setPreciosMaterial((prev) =>
          prev.filter((p) => String(p.id ?? p._id) !== String(id))
        );

        preciosMaterialLenRef.current = Math.max(0, preciosMaterialLenRef.current - 1);

        if (refresh) {
          fetchedOnceRef.current = false;
          await getPreciosMaterial({ force: true, params, signal });
        }

        return unwrap(resp) ?? true;
      } catch (err) {
        if (err?.name !== 'AbortError') {
          console.error('Error en usePrecioMaterial.deletePrecioMaterial:', err);
          setError(err);
        }
        throw err;
      } finally {
        setLoadingDelete(false);
      }
    },
    [getPreciosMaterial]
  );

  // ====================== WEB SCRAPING ======================
  const scrapePrices = useCallback(
    async (searchQuery, { signal } = {}) => {
      setLoadingSave(true);
      setError(null);
      try {
        const resp = await precioMaterialService.scrapePrices(searchQuery, { signal });
        return unwrap(resp) ?? [];
      } catch (err) {
        if (err?.name !== 'AbortError') {
          console.error('Error en usePrecioMaterial.scrapePrices:', err);
          setError(err);
        }
        throw err;
      } finally {
        setLoadingSave(false);
      }
    },
    []
  );

  return {
    preciosMaterial,
    loadingList,
    loadingSave,
    loadingDelete,
    loading: loadingList || loadingSave || loadingDelete,
    error,

    getPreciosMaterial,
    getPrecioMaterialById,
    createPrecioMaterial,
    updatePrecioMaterial,
    deletePrecioMaterial,
    scrapePrices,
    // batch upsert desde frontend
    batchUpsertPrecios: useCallback(async (list, { signal, refresh = true, params = {} } = {}) => {
      setLoadingSave(true);
      setError(null);
      try {
        const resp = await precioMaterialService.batchUpsertPrecios(list);
        if (refresh) {
          fetchedOnceRef.current = false;
          await getPreciosMaterial({ force: true, params, signal });
        }
        return resp;
      } catch (err) {
        console.error('Error en usePrecioMaterial.batchUpsertPrecios:', err);
        setError(err);
        throw err;
      } finally {
        setLoadingSave(false);
      }
    }, [getPreciosMaterial]),
    upsertPrecioByClave: useCallback(async (payload, { signal, refresh = true, params = {} } = {}) => {
      setLoadingSave(true);
      setError(null);
      try {
        const resp = await precioMaterialService.createPrecioMaterial(payload);
        if (refresh) {
          fetchedOnceRef.current = false;
          await getPreciosMaterial({ force: true, params, signal });
        }
        return resp;
      } catch (err) {
        console.error('Error en usePrecioMaterial.upsertPrecioByClave:', err);
        setError(err);
        throw err;
      } finally {
        setLoadingSave(false);
      }
    }, [getPreciosMaterial]),
  };
};

export default usePrecioMaterial;
