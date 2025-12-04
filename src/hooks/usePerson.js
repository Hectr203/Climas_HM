import { useState, useCallback } from "react";
import { useNotifications } from "../context/NotificationContext";
import personService from "../services/personService";

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
      } else {
        setDepartmentPersons([]);
      }
    } catch (err) {
      setError(err);
      // No mostrar notificación, solo actualizar el estado de error
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
  };
};

export default usePerson;
