import httpService from "./httpService";

const clientesArchivosService = {
  async getDocumentosByCliente(idCliente) {
    return httpService.get(`/clientes/archivos/listar/${idCliente}`);
  },

  async uploadClienteArchivos(files, idCliente, meta) {
    const form = new FormData();
    files.forEach(f => form.append("files", f));
    form.append("idCliente", idCliente);
    if (meta) {
      try {
        form.append('metadata', JSON.stringify(meta));
      } catch (e) {
        // ignore
      }
    }

    return httpService.post(`/clientes/archivos/subir`, form, {
      headers: { "Content-Type": undefined }
    }).then(r => r.data);
  },

  async deleteClienteArchivo(idArchivo) {
    return httpService.delete(`/clientes/archivos/${idArchivo}`);
  },

  async downloadBlob(id) {
  const url = `/clientes/archivos/descargar/${id}`;

  const res = await fetch(url, {
    method: "GET",
  });

  if (!res.ok) {
    const txt = await res.text().catch(() => "");
    throw new Error(`Error descargando archivo: ${txt}`);
  }

  const blob = await res.blob();

  // aquí mantenemos el MIME real siempre
  return new Blob([blob], {
    type: blob.type || "application/pdf"
  });
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
