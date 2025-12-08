import axios from "axios";

/**
 * Cliente HTTP centralizado con interceptors para manejo automático de tokens
 * Funciona como middleware para todas las peticiones de la aplicación
 */
class HttpService {
  constructor() {
    // Usar el proxy de Vite — no poner localhost ni IP
    this.api = axios.create({
      baseURL: "/api",
      timeout: 30000,
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
    });

    this.setupInterceptors();
  }

  setupInterceptors() {
    // REQUEST
    this.api.interceptors.request.use(
      (config) => {
        const token = this.getToken();
        if (token) config.headers.Authorization = `Bearer ${token}`;
        return config;
      },
      (error) => Promise.reject(error)
    );

    // RESPONSE
    this.api.interceptors.response.use(
      (response) => response,
      (error) => {
        // Suprimir completamente 404 en comunicaciones (no es un error real)
        if (
          error.response?.status === 404 &&
          error.config?.url?.includes("/comunicaciones/cliente/")
        ) {
          // Retornar una respuesta exitosa vacía en lugar de error
          return { data: { data: { comunicaciones: [] } } };
        }

        // Suprimir completamente 404 en constructor de cotizaciones (no existe aún es normal)
        if (
          error.response?.status === 404 &&
          error.config?.url?.includes("/cotizaciones/constructor/obtener")
        ) {
          // Retornar null para indicar que no existe
          return { data: null };
        }

        // Suprimir completamente 404 y 500 en talleres (endpoint no implementado aún)
        if (
          (error.response?.status === 404 || error.response?.status === 500) &&
          error.config?.url?.includes("/talleres")
        ) {
          // Retornar array vacío
          return { data: { data: [] } };
        }

        // Suprimir completamente 404 y 500 en imágenes de taller (puede no tener imágenes o proyecto no existe)
        if (
          (error.response?.status === 404 || error.response?.status === 500) &&
          error.config?.url?.includes("/taller/") &&
          error.config?.url?.includes("/imagenes")
        ) {
          // Retornar array vacío
          return { data: { data: [] } };
        }

        if (error.response?.status === 401) this.handleUnauthorized();
        return Promise.reject(this.normalizeError(error));
      }
    );
  }

  getToken() {
    return localStorage.getItem("authToken");
  }

  setToken(token) {
    token
      ? localStorage.setItem("authToken", token)
      : localStorage.removeItem("authToken");
  }

  handleUnauthorized() {
    this.setToken(null);
    localStorage.removeItem("userRole");
    localStorage.removeItem("userEmail");
    if (window.location.pathname !== "/login") {
      window.location.href = "/login";
    }
  }

  normalizeError(error) {
    return {
      message: error.message || "Error desconocido",
      status: error.response?.status,
      data: error.response?.data,
      isNetworkError: !error.response,
      isServerError: error.response?.status >= 500,
      isClientError:
        error.response?.status >= 400 && error.response?.status < 500,
      originalError: error,
      userMessage:
        error.response?.data?.message || error.message || "Error desconocido",
    };
  }

  // Métodos HTTP
  async get(url, config = {}) {
    const res = await this.api.get(url, config);
    // Si es un blob, devolver el blob directamente
    if (config.responseType === 'blob') {
      return res.data;
    }
    return res.data;
  }

  async post(url, data = {}, config = {}) {
    const res = await this.api.post(url, data, config);
    return res.data;
  }

  async put(url, data = {}, config = {}) {
    const res = await this.api.put(url, data, config);
    return res.data;
  }

  async patch(url, data = {}, config = {}) {
    const res = await this.api.patch(url, data, config);
    return res.data;
  }

  async delete(url, config = {}) {
    const res = await this.api.delete(url, config);
    return res.data;
  }

  async healthCheck() {
    try {
      const response = await this.get("/health");
      return { healthy: true, ...response };
    } catch (error) {
      return { healthy: false, error: error.userMessage };
    }
  }
}

const httpService = new HttpService();
export default httpService;
