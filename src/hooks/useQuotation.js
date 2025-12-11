import { useState } from "react";
import quotationService from "../services/quotationService";

const useQuotation = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const createQuotation = async (data) => {
    setLoading(true);
    setError(null);
    try {
      const response = await quotationService.createQuotation(data);
      // console.log eliminado
      return response;
    } catch (err) {
      setError(err);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const getCotizaciones = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await quotationService.getCotizaciones();
      return response;
    } catch (err) {
      setError(err);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const getCotizacionById = async (id) => {
    setLoading(true);
    setError(null);
    try {
      const response = await quotationService.getCotizacionById(id);
      return response;
    } catch (err) {
      setError(err);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const editCotizacion = async (id, data) => {
    setLoading(true);
    setError(null);
    try {
      const response = await quotationService.editCotizacion(id, data);
      return response;
    } catch (err) {
      setError(err);
      throw err;
    } finally {
      setLoading(false);
    }
  };
  const crearConstructor = async (data) => {
    setLoading(true);
    setError(null);
    try {
      const response = await quotationService.crearConstructor(data);
      return response;
    } catch (err) {
      setError(err);
      throw err;
    } finally {
      setLoading(false);
    }
  };
  const getConstructorByCotizacionId = async (id) => {
    setLoading(true);
    setError(null);
    try {
      const response = await quotationService.getConstructorByCotizacionId(id);
      return response;
    } catch (err) {
      setError(err);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // Nueva función para crear/actualizar revisión
  const upsertRevision = async (revisionData) => {
    setLoading(true);
    setError(null);
    try {
      const response = await quotationService.upsertRevision(revisionData);
      return response;
    } catch (err) {
      setError(err);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // Nueva función para obtener revisión
  const getRevision = async ({ id, idCotizacion }) => {
    setLoading(true);
    setError(null);
    try {
      const response = await quotationService.getRevision({ id, idCotizacion });
      return response;
    } catch (err) {
      setError(err);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // Nueva función para actualizar materiales
  const updateMateriales = async (idCotizacion, materiales) => {
    setLoading(true);
    setError(null);
    try {
      const response = await quotationService.updateMateriales(
        idCotizacion,
        materiales
      );
      return response;
    } catch (err) {
      setError(err);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // Nueva función para actualizar materiales y evaluación de riesgos
  const updateMaterialesYRiesgos = async (idCotizacion, data) => {
    setLoading(true);
    setError(null);
    try {
      const response = await quotationService.updateMaterialesYRiesgos(
        idCotizacion,
        data
      );
      return response;
    } catch (err) {
      setError(err);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // Gestión de versiones
  const createVersion = async (idCotizacion, versionData) => {
    setLoading(true);
    setError(null);
    try {
      const response = await quotationService.createVersion(
        idCotizacion,
        versionData
      );
      return response;
    } catch (err) {
      setError(err);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const getQuotationVersions = async (idCotizacion) => {
    setLoading(true);
    setError(null);
    try {
      const response = await quotationService.getQuotationVersions(
        idCotizacion
      );
      return response;
    } catch (err) {
      setError(err);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const getVersionById = async (idCotizacion, versionId) => {
    setLoading(true);
    setError(null);
    try {
      const response = await quotationService.getVersionById(
        idCotizacion,
        versionId
      );
      return response;
    } catch (err) {
      setError(err);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const restoreVersion = async (idCotizacion, versionId) => {
    setLoading(true);
    setError(null);
    try {
      const response = await quotationService.restoreVersion(
        idCotizacion,
        versionId
      );
      return response;
    } catch (err) {
      setError(err);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // Funciones para manejo de estados de aprobación
  const updateEstadoAprobacion = async (
    id,
    estadoAprobacion,
    comentarios = "",
    modificadoPor = ""
  ) => {
    setLoading(true);
    setError(null);
    try {
      const response = await quotationService.updateEstadoAprobacion(
        id,
        estadoAprobacion,
        comentarios,
        modificadoPor
      );
      return response;
    } catch (err) {
      setError(err);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const getCotizacionesByEstado = async (estado, limite = 50, pagina = 1) => {
    setLoading(true);
    setError(null);
    try {
      const response = await quotationService.getCotizacionesByEstado(
        estado,
        limite,
        pagina
      );
      return response;
    } catch (err) {
      setError(err);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const getEstadisticasEstados = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await quotationService.getEstadisticasEstados();
      return response;
    } catch (err) {
      setError(err);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  return {
    createQuotation,
    getCotizaciones,
    getCotizacionById,
    editCotizacion,
    crearConstructor,
    getConstructorByCotizacionId,
    upsertRevision,
    getRevision,
    updateMateriales,
    updateMaterialesYRiesgos,
    // Métodos de versionado
    createVersion,
    getQuotationVersions,
    getVersionById,
    restoreVersion,
    // Métodos de aprobación
    updateEstadoAprobacion,
    getCotizacionesByEstado,
    getEstadisticasEstados,
    loading,
    error,
  };
};

export default useQuotation;
