// services/documentosClienteService.js

const documentosClienteService = {

  API_BASE: (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_API_BASE)
    ? import.meta.env.VITE_API_BASE
    : '',

  _listCache: new Map(),

  async _tryJsonResponse(resp) {
    const text = await resp.text();
    try { return text ? JSON.parse(text) : null; } catch (e) { return text; }
  },

  async uploadClienteArchivo(file, idCliente) {
    if (!idCliente) throw new Error('idCliente es requerido');
    if (!file) throw new Error('file es requerido');
    const form = new FormData();
    // forzar string por si es number
    form.append('idCliente', String(idCliente));
    // file puede ser un File/Blob; el tercer argumento es el nombre opcional
    form.append('file', file, file.name || `archivo_${Date.now()}`);

    const headers = {};
    const token = typeof localStorage !== 'undefined' ? localStorage.getItem('authToken') : null;
    if (token) headers['Authorization'] = `Bearer ${token}`;
    // indicar que aceptamos JSON
    headers['Accept'] = 'application/json';

    let resp;
    try {
      resp = await fetch(`${this.API_BASE}/api/clientes/archivos/subir`, {
        method: 'POST',
        body: form,
        // No establecer Content-Type: dejar que fetch lo añada con boundary
        headers,
        credentials: 'same-origin'
      });
    } catch (networkErr) {
      throw new Error(networkErr?.message || 'Error de red al subir archivo');
    }

    const data = await this._tryJsonResponse(resp);
    if (!resp.ok) {
      const msg = (data && (data.message || data?.error || JSON.stringify(data))) || `Error ${resp.status}`;
      throw new Error(msg);
    }

    const doc = data?.data || data || null;

    try {
      if (doc && idCliente && typeof localStorage !== 'undefined') {
        const key = `client_files_${idCliente}`;
        const existing = JSON.parse(localStorage.getItem(key) || '[]');
        const byId = new Map((existing || []).map(d => [String(d.id), d]));
        byId.set(String(doc.id || doc.documentoId || doc._id || Date.now()), doc);
        localStorage.setItem(key, JSON.stringify(Array.from(byId.values())));
      }
    } catch (e) { /* ignore */ }

    return doc;
  },

  async uploadClienteArchivos(files = [], idCliente) {
    if (!idCliente) throw new Error('idCliente es requerido');
    if (!files || files.length === 0) throw new Error('No se recibieron archivos');

    const results = [];
    // Subida secuencial. Si quieres paralela, usar Promise.all con cuidado de límites.
    for (const f of Array.from(files)) {
      try {
        const r = await this.uploadClienteArchivo(f, idCliente);
        results.push(r);
      } catch (err) {
        // si falla una subida, recogemos el error y seguimos para no perder archivos
        results.push({ error: err?.message || String(err) });
      }
    }

    try { this._listCache.delete(idCliente); } catch (e) { /* ignore */ }

    return results.length === 1 ? results[0] : results;
  },

  async getDocumentosByCliente(idCliente, { force = false } = {}) {
    if (!idCliente) throw new Error('idCliente es requerido');
    if (!force && this._listCache.has(idCliente)) return this._listCache.get(idCliente);

    const headers = { 'Accept': 'application/json' };
    const token = typeof localStorage !== 'undefined' ? localStorage.getItem('authToken') : null;
    if (token) headers['Authorization'] = `Bearer ${token}`;

    // Intentar endpoint REST con path first (/listar/{idCliente}) — coincide con la función Azure
    const listUrl = `${this.API_BASE}/api/clientes/archivos/listar/${encodeURIComponent(idCliente)}`;
    try {
      const resp = await fetch(listUrl, { credentials: 'same-origin', headers });
      const data = await this._tryJsonResponse(resp);
      if (resp.ok) {
        const docs = data?.data || data || [];
        const out = Array.isArray(docs) ? docs : [];
        this._listCache.set(idCliente, out);
        return out;
      }
      // eslint-disable-next-line no-console
      console.warn('getDocumentosByCliente: listar endpoint no OK', resp.status, data);
    } catch (e) { /* ignore */ }

    // Fallback: intentar endpoint con query param (compatibilidad)
    const url = `${this.API_BASE}/api/clientes/archivos?idCliente=${encodeURIComponent(idCliente)}`;
    try {
      const resp = await fetch(url, { credentials: 'same-origin', headers });
      const data = await this._tryJsonResponse(resp);
      if (resp.ok) {
        const docs = data?.data || data || [];
        const out = Array.isArray(docs) ? docs : [];
        this._listCache.set(idCliente, out);
        return out;
      }
      // eslint-disable-next-line no-console
      console.warn('getDocumentosByCliente: query endpoint no OK', resp.status, data);
    } catch (e) { /* ignore */ }

    try {
      if (typeof localStorage !== 'undefined') {
        const key = `client_files_${idCliente}`;
        const cached = JSON.parse(localStorage.getItem(key) || '[]');
        const out = Array.isArray(cached) ? cached : [];
        this._listCache.set(idCliente, out);
        return out;
      }
    } catch (e) { /* ignore */ }

    this._listCache.set(idCliente, []);
    return [];
  },

  async deleteClienteArchivo(documentoId, idCliente) {
    if (!documentoId) throw new Error('documentoId es requerido');

    const headers = { 'Accept': 'application/json' };
    const token = typeof localStorage !== 'undefined' ? localStorage.getItem('authToken') : null;
    if (token) headers['Authorization'] = `Bearer ${token}`;

    try {
      const resp = await fetch(`${this.API_BASE}/api/clientes/archivos/${encodeURIComponent(documentoId)}`, {
        method: 'DELETE',
        headers,
        credentials: 'same-origin'
      });

      const data = await this._tryJsonResponse(resp);
      if (!resp.ok) {
        const msg = (data && (data.message || data?.error || JSON.stringify(data))) || `Error ${resp.status}`;
        return { ok: false, status: resp.status, message: msg, data };
      }

      // Actualizar cachés locales: localStorage y _listCache
      try {
        if (idCliente && typeof localStorage !== 'undefined') {
          const key = `client_files_${idCliente}`;
          const existing = JSON.parse(localStorage.getItem(key) || '[]');
          const out = Array.isArray(existing) ? existing.filter(d => String(d.id) !== String(documentoId) && String(d.documentoId) !== String(documentoId)) : [];
          localStorage.setItem(key, JSON.stringify(out));
          try { this._listCache.delete(idCliente); } catch (e) { /* ignore */ }
        } else if (typeof localStorage !== 'undefined') {
          // Si no se pasó idCliente, intentar limpiar de todas las claves client_files_*
          try {
            for (const k in localStorage) {
              if (Object.prototype.hasOwnProperty.call(localStorage, k) && typeof k === 'string' && k.indexOf('client_files_') === 0) {
                try {
                  const arr = JSON.parse(localStorage.getItem(k) || '[]');
                  const filtered = Array.isArray(arr) ? arr.filter(d => String(d.id) !== String(documentoId) && String(d.documentoId) !== String(documentoId)) : arr;
                  localStorage.setItem(k, JSON.stringify(filtered));
                } catch (e) { /* ignore per-key parse errors */ }
              }
            }
          } catch (e) { /* ignore */ }
          try {
            for (const [cacheKey, arr] of this._listCache.entries()) {
              if (Array.isArray(arr)) {
                this._listCache.set(cacheKey, arr.filter(d => String(d.id) !== String(documentoId) && String(d.documentoId) !== String(documentoId)));
              }
            }
          } catch (e) { /* ignore */ }
        }
      } catch (e) { /* ignore cache update errors */ }

      return { ok: true, status: resp.status, data: data?.data || data };
    } catch (err) {
      return { ok: false, status: 0, message: err?.message || String(err) };
    }
  },
};

export default documentosClienteService;
