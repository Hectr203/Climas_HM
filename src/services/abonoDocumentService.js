import httpService from './httpService';

/**
 * Servicio para gestionar documentos (comprobantes) de abonos.
 * Endpoints basados en la colección de referencia:
 *  - POST   /abonos/documentos/subir           (form-data: idAbono, archivo)
 *  - GET    /abonos/documentos/listar          (query: idProyecto?, idAbono?)
 *  - GET    /abonos/documentos/:documentoId    (query: expiresIn?)
 *  - DELETE /abonos/documentos/eliminar/:id
 */
const abonoDocumentService = {
  async subirDocumento({ idAbono, archivo }) {
    if (!idAbono || !archivo) {
      throw new Error('Faltan datos para subir el documento (idAbono/archivo).');
    }
    const formData = new FormData();
    formData.append('idAbono', idAbono);
    formData.append('archivo', archivo);

    return await httpService.post('/abonos/documentos/subir', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },

  async listarDocumentos({ idProyecto, idAbono } = {}) {
    return await httpService.get('/abonos/documentos/listar', {
      params: { idProyecto, idAbono },
    });
  },

  async obtenerDocumento(documentoId, { expiresIn = 60 } = {}) {
    if (!documentoId) throw new Error('Falta documentoId');
    return await httpService.get(`/abonos/documentos/${documentoId}`, {
      params: { expiresIn },
    });
  },

  async descargarDocumento(documentoId, { expiresIn = 60 } = {}) {
    if (!documentoId) throw new Error('Falta documentoId');
    return await httpService.get(`/abonos/documentos/descargar/${documentoId}`, {
      params: { expiresIn },
    });
  },

  async eliminarDocumento(documentoId) {
    if (!documentoId) throw new Error('Falta documentoId');
    return await httpService.delete(`/abonos/documentos/eliminar/${documentoId}`);
  },
};

export default abonoDocumentService;
