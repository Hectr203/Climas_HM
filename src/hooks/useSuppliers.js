import { useState } from "react";
import SupplierService from "../services/supplierService";

const useSupplier = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const createSupplier = async (data) => {
    setLoading(true);
    setError(null);
    try {
      return await SupplierService.createSupplier(data);
    } catch (err) {
      setError(err);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const getSuppliers = async () => {
    setLoading(true);
    setError(null);
    try {
      return await SupplierService.getSuppliers();
    } catch (err) {
      setError(err);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const getSupplierById = async (id) => {
    setLoading(true);
    setError(null);
    try {
      return await SupplierService.getSupplierById(id);
    } catch (err) {
      setError(err);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const updateSupplier = async (id, data) => {
    setLoading(true);
    setError(null);
    try {
      return await SupplierService.updateSupplier(id, data);
    } catch (err) {
      setError(err);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const deleteSupplier = async (id) => {
    setLoading(true);
    setError(null);
    try {
      return await SupplierService.deleteSupplier(id);
    } catch (err) {
      setError(err);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  return {
    createSupplier,
    getSuppliers,
    getSupplierById,
    updateSupplier,
    deleteSupplier,
    loading,
    error,
  };
};

export default useSupplier;
