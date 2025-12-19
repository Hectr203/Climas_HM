import { useCallback, useState } from "react";
import SupplierService from "../services/supplierService";

const useSupplier = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const withLoading = useCallback(async (fn) => {
    setLoading(true);
    setError(null);
    try {
      return await fn();
    } catch (err) {
      setError(err);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const createSupplier = useCallback(
    async (data) => withLoading(() => SupplierService.createSupplier(data)),
    [withLoading]
  );

  const getSuppliers = useCallback(
    async () => withLoading(() => SupplierService.getSuppliers()),
    [withLoading]
  );

  const getSupplierById = useCallback(
    async (id) => withLoading(() => SupplierService.getSupplierById(id)),
    [withLoading]
  );

  const updateSupplier = useCallback(
    async (id, data) =>
      withLoading(() => SupplierService.updateSupplier(id, data)),
    [withLoading]
  );

  const deleteSupplier = useCallback(
    async (id) => withLoading(() => SupplierService.deleteSupplier(id)),
    [withLoading]
  );

  /* =========================
     OCUPACIONES (NUEVO)
  ========================= */
  const createOccupation = useCallback(
    async (data) => withLoading(() => SupplierService.createOccupation(data)),
    [withLoading]
  );

  const getOccupations = useCallback(
    async () => withLoading(() => SupplierService.getOccupations()),
    [withLoading]
  );

  return {
    createSupplier,
    getSuppliers,
    getSupplierById,
    updateSupplier,
    deleteSupplier,

    // ✅ nuevo
    createOccupation,
    getOccupations,

    loading,
    error,
  };
};

export default useSupplier;
