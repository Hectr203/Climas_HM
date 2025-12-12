import { useState, useCallback } from "react";
import { useNotifications } from "../context/NotificationContext";
import personService from "../services/personService";
import empleadoImagenService from "../services/empleadoImagenService";
import empleadoDocumentoService from "../services/empleadoDocumentoService";

const usePerson = () => {
  const { showOperationSuccess, showHttpError } = useNotifications();
  const [persons, setPersons] = useState([]);
  const [departmentPersons, setDepartmentPersons] = useState([]);
  const getPersonsByDepartment = async (department) => {
    setLoading(true);
    setError(null);
    try {
      const response = await personService.getPersonsByDepartment(department);
      if (response.success && Array.isArray(response.data)) {
        setDepartmentPersons(response.data);
        return response.data; // Retornar los datos para uso directo
      } else {
        setDepartmentPersons([]);
        return [];
      }
    } catch (err) {
      setError(err);
      console.error("Error en getPersonsByDepartment:", err);
      return []; // Retornar array vacío en caso de error
    } finally {
      setLoading(false);
    }
  };
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const getPersons = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await personService.getPersons();
      if (response.success && Array.isArray(response.data)) {
        setPersons(response.data);
      } else {
        setPersons([]);
      }
    } catch (err) {
      console.error("Error en usePerson.getPersons:", err);
      setError(err);
      // No mostrar notificación, solo actualizar el estado de error
    } finally {
      setLoading(false);
    }
  };

  const createPerson = async (payload) => {
    setLoading(true);
    setError(null);
    try {
      const response = await personService.createPerson(payload);
      if (response.success) {
        setPersons((prev) => [...prev, response.data]);
        showOperationSuccess("Empleado guardado exitosamente");
        return response.data;
      }
    } catch (err) {
      console.error("Error en usePerson.createPerson:", err);
      setError(err);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // 🔹 FUNCIÓN PARA OBTENER EMPLEADO POR ID LÓGICO
  const getPersonById = useCallback(async (id) => {
    if (!id) return null;
    setLoading(true);
    setError(null);
    try {
      const response = await personService.getPersonById(id);
      if (response.success && response.data) {
        return response.data;
      }
      return null;
    } catch (err) {
      console.error("Error en usePerson.getPersonById:", err);
      setError(err);
      showHttpError("Error al obtener empleado");
      return null;
    } finally {
      setLoading(false);
    }
  }, [showHttpError]);

  // 🔹 FUNCIÓN PARA ACTUALIZAR EMPLEADO EXISTENTE POR ID LÓGICO
  const updatePersonById = async (id, payload) => {
    setLoading(true);
    setError(null);
    try {
      const response = await personService.updatePersonById(id, payload);
      if (response.success) {
        setPersons((prev) =>
          prev.map((p) => {
            const pId = p.id || p._id;
            return pId === id ? { ...p, ...response.data } : p;
          })
        );
        showOperationSuccess("Empleado actualizado exitosamente");
        return response.data;
      }
    } catch (err) {
      console.error("Error en usePerson.updatePersonById:", err);
      setError(err);
      showHttpError("Error al actualizar empleado");
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // 🔹 FUNCIÓN PARA OBTENER EMPLEADOS SIN USUARIO ASIGNADO
  const getPersonsWithoutUser = async () => {
    setLoading(true);
    setError(null);
    try {
      // Intentar primero el endpoint específico
      try {
        const response = await personService.getPersonsWithoutUser();
        if (response.success && Array.isArray(response.data)) {
          return response.data;
        } else if (Array.isArray(response)) {
          return response;
        }
      } catch (endpointError) {
        // Si el endpoint no existe (404), usar fallback
        if (endpointError.response?.status === 404) {
          console.warn('⚠️ Endpoint /empleados/sin-usuario no existe, usando todos los empleados');
          // Obtener todos los empleados como fallback
          const allResponse = await personService.getPersons();
          if (allResponse.success && Array.isArray(allResponse.data)) {
            return allResponse.data;
          }
        } else {
          throw endpointError;
        }
      }
      return [];
    } catch (err) {
      console.error("Error en usePerson.getPersonsWithoutUser:", err);
      setError(err);
      return [];
    } finally {
      setLoading(false);
    }
  };

  // 🔹 FUNCIONES PARA IMÁGENES DE EMPLEADOS
  const uploadEmployeeImage = async (file, empleadoId, descripcion) => {
    setLoading(true);
    setError(null);
    try {
      const response = await empleadoImagenService.subirImagen(file, {
        empleadoId,
        descripcion
      });
      if (response.success) {
        showOperationSuccess("Imagen subida exitosamente");
        return response.data;
      }
    } catch (err) {
      console.error("Error en usePerson.uploadEmployeeImage:", err);
      setError(err);
      showHttpError("Error al subir imagen");
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const getEmployeeImageUrl = async (empleadoId, expiresInMinutes = 60) => {
    try {
      const response = await empleadoImagenService.obtenerImagenUrl(empleadoId, expiresInMinutes);
      if (response.success && response.data) {
        return response.data;
      }
      return null;
    } catch (err) {
      const status = err?.status || err?.response?.status;
      // Solo mostrar error si no es 404 o 500 (sin imagen o endpoint no disponible)
      if (status !== 404 && status !== 500) {
        console.error("Error en usePerson.getEmployeeImageUrl:", err);
      }
      return null;
    }
  };

  const deleteEmployeeImage = async (empleadoId) => {
    setLoading(true);
    setError(null);
    try {
      const response = await empleadoImagenService.eliminarImagen(empleadoId);
      if (response.success) {
        showOperationSuccess("Imagen eliminada exitosamente");
        return true;
      }
    } catch (err) {
      console.error("Error en usePerson.deleteEmployeeImage:", err);
      setError(err);
      showHttpError("Error al eliminar imagen");
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // 🔹 FUNCIONES PARA DOCUMENTOS DE EMPLEADOS
  const uploadEmployeeDocument = async (file, empleadoId, tipoDocumento, descripcion) => {
    setLoading(true);
    setError(null);
    try {
      const response = await empleadoDocumentoService.subirDocumento(file, {
        empleadoId,
        tipoDocumento,
        descripcion
      });
      if (response.success) {
        showOperationSuccess("Documento subido exitosamente");
        return response.data;
      }
    } catch (err) {
      console.error("Error en usePerson.uploadEmployeeDocument:", err);
      setError(err);
      showHttpError("Error al subir documento");
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const listEmployeeDocuments = async (empleadoId, tipoDocumento = null) => {
    setLoading(true);
    setError(null);
    try {
      const response = await empleadoDocumentoService.listarDocumentos(empleadoId, tipoDocumento);
      if (response.success && response.data) {
        return response.data;
      }
      return { documentos: [], count: 0 };
    } catch (err) {
      const status = err?.status || err?.response?.status;
      // Solo mostrar error si no es 404 o 500 (endpoints no disponibles)
      if (status !== 404 && status !== 500) {
        console.error("Error en usePerson.listEmployeeDocuments:", err);
        setError(err);
      }
      // Silencioso para 404 y 500
      return { documentos: [], count: 0 };
    } finally {
      setLoading(false);
    }
  };

  const downloadEmployeeDocument = async (documentoId, expiresInMinutes = 60) => {
    try {
      const response = await empleadoDocumentoService.descargarDocumento(documentoId, expiresInMinutes);
      if (response.success && response.data) {
        return response.data;
      }
      return null;
    } catch (err) {
      console.error("Error en usePerson.downloadEmployeeDocument:", err);
      showHttpError("Error al descargar documento");
      return null;
    }
  };

  const deleteEmployeeDocument = async (documentoId) => {
    setLoading(true);
    setError(null);
    try {
      const response = await empleadoDocumentoService.eliminarDocumento(documentoId);
      if (response.success) {
        showOperationSuccess("Documento eliminado exitosamente");
        return true;
      }
    } catch (err) {
      console.error("Error en usePerson.deleteEmployeeDocument:", err);
      setError(err);
      showHttpError("Error al eliminar documento");
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const verifyEmployeeImagesBatch = async (empleadoIds) => {
    try {
      const result = await empleadoImagenService.verificarImagenesBatch(empleadoIds);
      return result;
    } catch (err) {
      console.error("Error en usePerson.verifyEmployeeImagesBatch:", err);
      return { conImagen: [], sinImagen: empleadoIds };
    }
  };

  return {
    persons,
    departmentPersons,
    loading,
    error,
    getPersons,
    getPersonsByDepartment,
    getPersonById,
    createPerson,
    updatePersonById,
    getPersonsWithoutUser,
    // Funciones de imágenes
    uploadEmployeeImage,
    getEmployeeImageUrl,
    deleteEmployeeImage,
    verifyEmployeeImagesBatch,
    // Funciones de documentos
    uploadEmployeeDocument,
    listEmployeeDocuments,
    downloadEmployeeDocument,
    deleteEmployeeDocument,
  };
};

export default usePerson;
