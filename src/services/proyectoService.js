// services/proyectoService.js
import httpService from "./httpService";

const ROUTES = {
  LIST: "/proyectos/todos",
  GET_BY_ID: (id) => `/proyectos/obtener/${id}`,
  CREATE: "/proyectos/crear",
  UPDATE: (id) => `/proyectos/actualizar/${id}`,
  DELETE: (id) => `/proyectos/eliminar/${id}`,

  // ya no usamos GET_STATS viejo que daba 404
  // GET_STATS: "/proyectos/stats/get",
};

// ⚠️ NUEVO: este endpoint vive en otro host/puerto (7071)
const EXTERNAL_ROUTES = {
  STATS:
    ((typeof import.meta !== "undefined" && import.meta.env && import.meta.env.VITE_API_URL)
      ? import.meta.env.VITE_API_URL
      : (typeof process !== "undefined" && process.env && process.env.VITE_API_URL)
        ? process.env.VITE_API_URL
        : "") + "/proyectos/estadisticas",
};

const EXTERNALS = {
  CURRENCY_LATEST: "https://api.currencyapi.com/v3/latest",
};

function sanitizeCreatePayload(payload = {}) {
  const out = { ...payload };

  if (out?.presupuesto?._metaEquipos?.capturadoEn) {
    out.presupuesto._metaEquipos.capturadoEn =
      String(out.presupuesto._metaEquipos.capturadoEn)
        .trim()
        .toUpperCase();
  }

  if (out?.presupuesto && "total" in out.presupuesto) {
    const { total, ...rest } = out.presupuesto;
    out.presupuesto = rest;
  }

  return out;
}

function getCurrencyApiKey() {
  const env =
    (typeof import.meta !== "undefined" && import.meta.env) ||
    (typeof process !== "undefined" && process.env) ||
    {};

  return (
    env.VITE_CURRENCY_API_KEY ||
    env.REACT_APP_CURRENCY_API_KEY ||
    "fca_live_8tZwnMuA2xq5ExRpYPkQeZiVHGS2wXbFWnc1U7y3"
  );
}

const proyectoService = {
  async getProyectos(config = {}) {
    const data = await httpService.get(ROUTES.LIST, config);
    return data;
  },

  async getProyectoById(id, config = {}) {
    const data = await httpService.get(ROUTES.GET_BY_ID(id), config);
    return data;
  },

  async createProyecto(payload, config = {}) {
    const body = sanitizeCreatePayload(payload);
    const data = await httpService.post(ROUTES.CREATE, body, config);
    return data;
  },

  async updateProyecto(id, payload, config = {}) {
    const data = await httpService.put(ROUTES.UPDATE(id), payload, config);
    return data;
  },

  async deleteProyecto(id, config = {}) {
    const data = await httpService.delete(ROUTES.DELETE(id), config);
    return data;
  },

  // 🔥 NUEVO: pide las estadísticas ya calculadas al backend de puerto 7071
  async getEstadisticas(config = {}) {
    try {
      const data = await httpService.get(EXTERNAL_ROUTES.STATS, {
        // como es URL absoluta, httpService debe respetarla sin baseURL
        timeout: 10000,
        ...config,
      });
      return data;
    } catch (err) {
      console.warn(
        "[proyectoService.getEstadisticas] no pude obtener stats:",
        {
          status: err?.status,
          data: err?.data,
          message: err?.userMessage || err?.message,
        }
      );
      return null; // fallback
    }
  },

  async getCurrencyRates({ base = "USD", currencies = [] } = {}, config = {}) {
    const params = new URLSearchParams({
      apikey: getCurrencyApiKey(),
      base_currency: base,
    });
    if (Array.isArray(currencies) && currencies.length) {
      params.set("currencies", currencies.join(","));
    }

    const url = `${EXTERNALS.CURRENCY_LATEST}?${params.toString()}`;

    const data = await httpService.get(url, {
      timeout: 15000,
      ...config,
    });

    return data;
  },
};

export default proyectoService;
