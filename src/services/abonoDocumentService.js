import httpService from './httpService';

/**
 * Servicio para gestionar documentos (comprobantes) de abonos.
 * Endpoints basados en la colección de referencia:
 *  - POST   /abonos/documentos/subir           (form-data: idAbono, archivo)
 *  - GET    /abonos/documentos/listar          (query: idProyecto?, idAbono?)
 *  - GET    /abonos/documentos/:documentoId    (query: expiresIn?)
 *  - DELETE /abonos/documentos/eliminar/:id
 *  - PUT    /documentos-abonos/editar/:id      (form-data: file, descripcion)
 */
const abonoDocumentService = {
  async subirDocumento({ idAbono, file, descripcion }) {
    if (!idAbono || !file) {
      throw new Error('Faltan datos para subir el documento (idAbono/file).');
    }
    const formData = new FormData();
    formData.append('idAbono', idAbono);
    formData.append('file', file);
    if (descripcion) {
      formData.append('descripcion', descripcion);
    }

    return await httpService.post('/abonos/documentos/subir', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },

  async updateDocumento({ id, file, descripcion }) {
    if (!id || (!file && typeof descripcion !== 'string')) {
      throw new Error(
        'Faltan datos para actualizar el documento (id y file/descripcion).'
      );
    }
    const formData = new FormData();
    if (file) {
      formData.append('file', file);
    }
    if (typeof descripcion === 'string') {
      formData.append('descripcion', descripcion);
    }

    return await httpService.put(`/documentos-abonos/editar/${id}`, formData, {
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
      responseType: 'blob',
    });
  },

  async eliminarDocumento(documentoId) {
    if (!documentoId) throw new Error('Falta documentoId');
    return await httpService.delete(`/abonos/documentos/eliminar/${documentoId}`);
  },
};

export default abonoDocumentService;
