import { useState, useCallback, useRef } from 'react';
import { useNotifications } from '../context/NotificationContext';
import clientService from '../services/clientService';

const useClient = () => {
  const { showOperationSuccess, showHttpError } = useNotifications();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);
  const [clients, setClients] = useState([]);
  const loadingRef = useRef(false); // Ref para evitar llamadas concurrentes
  const hasLoadedRef = useRef(false); // Ref para rastrear si ya se cargaron los clientes
  const clientsRef = useRef([]); // Ref para acceder a los clientes sin dependencias

  const getClients = useCallback(async (force = false) => {
    // Si ya hay clientes cargados y no se fuerza, no hacer la petición
    if (!force && hasLoadedRef.current && !loadingRef.current) {
      return clientsRef.current;
    }

    // Si ya hay una petición en curso, no hacer otra
    if (loadingRef.current) {
      return clientsRef.current;
    }

    loadingRef.current = true;
    setLoading(true);
    setError(null);
    try {
      const response = await clientService.getClients();
      const rawList = Array.isArray(response) ? response : response?.data || [];

      // Normalizar para asegurar que todos tengan origenCliente
      const normalized = rawList.map(c => ({
        ...c,
        origenCliente: c.origenCliente || '',
      }));

      setClients(normalized);
      clientsRef.current = normalized;
      hasLoadedRef.current = true;
      return normalized;
    } catch (err) {
      setError(err);
      setClients([]);
      clientsRef.current = []; // Resetear el ref
      hasLoadedRef.current = false; // Resetear el flag en caso de error
      // No mostrar notificación, solo actualizar el estado de error
      return null;
    } finally {
      setLoading(false);
      loadingRef.current = false;
    }
  }, []); // Sin dependencias para que la función sea estable

  const createClient = useCallback(async (clientData) => {
    setLoading(true);
    setError(null);
    setSuccess(false);

    // Asegurar que siempre se envíe origenCliente aunque venga vacío
    const payload = {
      ...clientData,
      origenCliente: clientData?.origenCliente || '',
    };

    try {
      const response = await clientService.createClient(payload);
      setSuccess(true);
      if (response && response.success && response.data) {
        const created = {
          ...response.data,
          origenCliente: response.data.origenCliente || payload.origenCliente || '',
        };

        setClients(prevClients => {
          const newClients = [...prevClients, created];
          clientsRef.current = newClients; // Actualizar el ref
          return newClients;
        });
        showOperationSuccess('Cliente guardado exitosamente');
      }
      return response;
    } catch (err) {
      setError(err);
      setSuccess(false);
      showHttpError('Error al guardar cliente');
      return null;
    } finally {
      setLoading(false);
    }
  }, [showOperationSuccess, showHttpError]);

  const editClient = useCallback(async (id, clientData) => {
    setLoading(true);
    setError(null);
    setSuccess(false);

    // Asegurar que siempre se envíe origenCliente aunque venga vacío
    const payload = {
      ...clientData,
      origenCliente: clientData?.origenCliente || '',
    };

    try {
      const response = await clientService.updateClient(id, payload);
      setSuccess(true);

      if (response && response.success && response.data) {
        const updatedData = {
          ...response.data,
          origenCliente: response.data.origenCliente || payload.origenCliente || '',
        };

        setClients(prevClients => {
          const newClients = prevClients.map(c =>
            (c.id === id || c._id === id)
              ? { ...c, ...updatedData, id: c.id || c._id }
              : c
          );
          clientsRef.current = newClients; // Actualizar el ref
          return newClients;
        });
        showOperationSuccess('Cliente actualizado exitosamente');
      } else if (response && response.success) {
        const updatedData = {
          ...payload,
          origenCliente: payload.origenCliente || '',
        };

        setClients(prevClients => {
          const newClients = prevClients.map(c =>
            (c.id === id || c._id === id)
              ? { ...c, ...updatedData, id: c.id || c._id }
              : c
          );
          clientsRef.current = newClients; // Actualizar el ref
          return newClients;
        });
        showOperationSuccess('Cliente actualizado exitosamente');
      }
      return response;
    } catch (err) {
      setError(err);
      setSuccess(false);
      showHttpError('Error al actualizar cliente');
      return null;
    } finally {
      setLoading(false);
    }
  }, [showOperationSuccess, showHttpError]);

  return { clients, getClients, createClient, editClient, loading, error, success, setClients };
};

export default useClient;
