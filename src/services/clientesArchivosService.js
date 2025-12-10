import httpService from "./httpService";

const clientesArchivosService = {
  async getDocumentosByCliente(idCliente) {
    return httpService.get(`/clientes/archivos/listar/${idCliente}`);
  },

  async uploadClienteArchivos(files, idCliente) {
    const form = new FormData();
    files.forEach(f => form.append("files", f));
    form.append("idCliente", idCliente);

    return httpService.post(`/clientes/archivos/subir`, form, {
      headers: { "Content-Type": undefined }
    }).then(r => r.data);
  },

  async deleteClienteArchivo(idArchivo) {
    return httpService.delete(`/clientes/archivos/${idArchivo}`);
  },

  async downloadBlob(id) {

    try {
      const urlDirect = `/clientes/archivos/descargar/${id}`;
      console.debug(`clientesArchivosService.downloadBlob: intentando fetch directo ${urlDirect}`);
      const res = await fetch(urlDirect);
      if (res && res.ok) {
        const contentType = res.headers.get('Content-Type') || '';
        const blob = await res.blob();
        console.debug('clientesArchivosService.downloadBlob: fetch directo ok, content-type=', contentType, 'size=', blob.size);
        return blob;
      }

      let txt = '';
      try {
        txt = await (res && res.text ? res.text() : Promise.resolve(''));
      } catch (e) {
        txt = `no se pudo leer body: ${e.message}`;
      }
      console.warn("clientesArchivosService.downloadBlob: fetch directo devolvió estado", res?.status, txt);
      throw new Error(`Fetch directo falló: status=${res?.status} body=${txt}`);
    } catch (err) {
      console.warn("clientesArchivosService.downloadBlob: fetch directo falló", err?.message || err);
    }

    try {
      const resp = await httpService.get(`/clientes/archivos/descargar/${id}`, {
        responseType: "blob",
      });
      return resp.data;
    } catch (err) {
      console.warn('clientesArchivosService.downloadBlob: httpService fallback falló', err);
      const orig = err?.originalError || err?.original || err;
      try {
        const data = orig?.response?.data;
        if (data && typeof data.text === 'function') {
          const text = await data.text();
          throw new Error(`httpService error: ${text}`);
        }
      } catch (readErr) {
      }
      throw err;
    }
  },
  
  async obtenerDocumento(id, { expiresIn = 60 } = {}) {
    return httpService.get(
      `/clientes/archivos/obtener/${id}?expiresIn=${expiresIn}`
    );
  },
 
async descargarDocumento(id) {
  const resp = await httpService.get(
    `/clientes/archivos/descargar/${id}`,
    { responseType: "blob" }
  );
  return resp.data;
},
  
  async descargarDirecto(id, { expiresIn = 60 } = {}) {
    return httpService.get(
      `/clientes/archivos/descargar/${id}?expiresIn=${expiresIn}`,
      { responseType: "blob" }
    ).then(r => r.data);
  }
};

export default clientesArchivosService;
