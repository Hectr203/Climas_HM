import React, { useEffect, useMemo, useRef, useState } from 'react';
import Icon from '../../../components/AppIcon';
import Button from '../../../components/ui/Button';
import useAbono from '../../../hooks/useAbono';
import useAbonoDocumentos from '../../../hooks/useAbonoDocumentos';

const allowedMime = [
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
];
const MAX_FILE_MB = 50;

const EditDocumentModal = ({
  isOpen,
  documento,
  onClose,
  onDocumentUpdated,
}) => {
  const { updateDocumento, loading: loadingUpdate } = useAbonoDocumentos();
  const [file, setFile] = useState(null);
  const [descripcion, setDescripcion] = useState('');
  const [filePreview, setFilePreview] = useState(null);
  const [warningMsg, setWarningMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const fileInputRef = useRef(null);
  const objectUrlRef = useRef(null);

  useEffect(() => {
    if (documento) {
      setDescripcion(documento.descripcion || '');
    }
  }, [documento]);

  useEffect(() => {
    if (objectUrlRef.current) {
      URL.revokeObjectURL(objectUrlRef.current);
      objectUrlRef.current = null;
    }
    if (!file) {
      setFilePreview(null);
      return;
    }
    const url = URL.createObjectURL(file);
    objectUrlRef.current = url;
    setFilePreview(url);
  }, [file]);

  useEffect(() => {
    if (!isOpen) {
      setFile(null);
      setFilePreview(null);
      setWarningMsg('');
      setErrorMsg('');
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleFileChange = (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    setWarningMsg('');
    setErrorMsg('');
    if (!allowedMime.includes(f.type)) {
      setWarningMsg(
        'Tipo de archivo no permitido. Usa PDF, imágenes o documentos Office.'
      );
      return;
    }
    if (f.size / (1024 * 1024) > MAX_FILE_MB) {
      setWarningMsg(`Archivo demasiado grande. Máximo ${MAX_FILE_MB} MB.`);
      return;
    }
    setFile(f);
  };

  const handleUpdate = async () => {
    const documentoId = documento?.idDocumento ?? documento?.id ?? documento?._id ?? documento?.documentoId ?? documento?.documento_id;
    if (!documentoId) return;
    setWarningMsg('');
    setErrorMsg('');
    if (!file && descripcion === (documento.descripcion || '')) {
      setWarningMsg('Debes seleccionar un nuevo archivo o modificar la descripción.');
      return;
    }

    try {
      await updateDocumento({
        id: documentoId,
        file,
        descripcion,
      });
      onDocumentUpdated();
      onClose();
    } catch (err) {
      setErrorMsg(err.userMessage || 'No se pudo actualizar el documento.');
    }
  };

  const renderPreview = () => {
    const previewUrl = filePreview || documento?.urlDescarga || documento?.url || documento?.link || documento?.archivoUrl;
    if (!previewUrl) {
      return (
        <div className="text-sm text-muted-foreground">
          No hay vista previa disponible.
        </div>
      );
    }
    const isPdf = (file?.type || documento?.contentType)?.includes('pdf');

    if (isPdf) {
      return (
        <iframe
          title="Preview"
          src={previewUrl}
          className="w-full h-64 border rounded"
        />
      );
    }
    return (
      <img
        src={previewUrl}
        alt="Preview"
        className="w-full h-64 object-contain border rounded"
      />
    );
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-card border rounded-lg shadow-xl w-full max-w-2xl mx-4">
        <div className="p-4 border-b flex justify-between items-center">
          <h3 className="text-lg font-semibold">Editar Comprobante</h3>
          <button onClick={onClose}>
            <Icon name="X" />
          </button>
        </div>
        <div className="p-4 space-y-4 max-h-[70vh] overflow-y-auto">
          {warningMsg && (
            <div className="text-yellow-700 bg-yellow-100 p-2 rounded">
              {warningMsg}
            </div>
          )}
          {errorMsg && (
            <div className="text-red-700 bg-red-100 p-2 rounded">{errorMsg}</div>
          )}
          <div className="flex flex-col gap-2">
            <label className="text-sm font-medium">Archivo</label>
            <Button
              variant="outline"
              onClick={() => fileInputRef.current?.click()}
            >
              <Icon name="UploadCloud" className="mr-2" />
              Seleccionar nuevo archivo
            </Button>
            <input
              type="file"
              ref={fileInputRef}
              className="sr-only"
              onChange={handleFileChange}
              accept={allowedMime.join(',')}
            />
            {file && (
              <div className="text-sm text-muted-foreground">
                Archivo seleccionado: {file.name}
              </div>
            )}
          </div>
          <div className="flex flex-col gap-2">
            <label className="text-sm font-medium">Descripción</label>
            <textarea
              value={descripcion}
              onChange={(e) => setDescripcion(e.target.value)}
              className="border rounded p-2 w-full bg-background"
              rows="3"
              placeholder="Descripción del comprobante"
            />
          </div>
          <div>
            <div className="text-sm font-medium mb-2">Vista Previa</div>
            {renderPreview()}
          </div>
        </div>
        <div className="p-4 border-t flex justify-end gap-2">
          <Button variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button
            onClick={handleUpdate}
            loading={loadingUpdate}
            iconName="Save"
          >
            Guardar Cambios
          </Button>
        </div>
      </div>
    </div>
  );
};

const formatCurrency = (amount) => {
  if (amount == null || isNaN(amount)) return '$0.00';
  return new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(Number(amount) || 0);
};

const ComprobantesModal = ({ isOpen, project, onClose }) => {
  const { getAbonosByProyecto, getAbonosSinComprobante } = useAbono();
  const { listarDocumentos, subirDocumento, obtenerDocumentoUrl, descargarDocumento } = useAbonoDocumentos();

  const [activeTab, setActiveTab] = useState('upload');
  const [abonosPendientes, setAbonosPendientes] = useState([]);
  const [abonosProyecto, setAbonosProyecto] = useState([]);
  const [file, setFile] = useState(null);
  const [descripcion, setDescripcion] = useState('');
  const [filePreview, setFilePreview] = useState(null);
  const [abonoSeleccionado, setAbonoSeleccionado] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadingList, setLoadingList] = useState(false);
  const [comprobantes, setComprobantes] = useState([]);
  const [warningMsg, setWarningMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [documentoToEdit, setDocumentoToEdit] = useState(null);

  const objectUrlRef = useRef(null);
  const fileInputRef = useRef(null);

  const projectId = useMemo(() => project?.id ?? project?._id ?? project?.rawId, [project]);

  const filtrarAbonosPendientes = (lista = []) => {
    const arr = Array.isArray(lista) ? lista : [];
    return arr.filter((abono) => {
      const sameProject = !projectId || String(abono?.idProyecto ?? abono?.proyectoId ?? abono?.projectId) === String(projectId);
      const sinComprobante = abono?.comprobanteGenerado === false;
      return sameProject && sinComprobante;
    });
  };

  const loadComprobantes = async () => {
    if (!projectId) return;
    try {
      const items = await listarDocumentos({ idProyecto: projectId });
      setComprobantes(Array.isArray(items) ? items : []);
    } catch (err) {
      console.error('Error cargando comprobantes', err);
      setErrorMsg('No se pudieron cargar los comprobantes.');
    }
  };

  useEffect(() => {
    if (!isOpen) {
      setFile(null);
      setFilePreview(null);
      setAbonoSeleccionado('');
      setActiveTab('upload');
      setComprobantes([]);
      setAbonosPendientes([]);
      setAbonosProyecto([]);
      setWarningMsg('');
      setErrorMsg('');
      setDescripcion('');
      return;
    }
    const loadData = async () => {
      if (!projectId) return;
      setLoadingList(true);
      setErrorMsg('');
      try {
        const [resPendientes, itemsDocs, resAbonosProyecto] = await Promise.all([
          getAbonosSinComprobante(projectId),
          listarDocumentos({ idProyecto: projectId }),
          getAbonosByProyecto(projectId),
        ]);
        const pendientesOrigen = Array.isArray(resPendientes?.items)
          ? resPendientes.items
          : (Array.isArray(resPendientes?.data?.abonos) ? resPendientes.data.abonos : []);
        setAbonosPendientes(filtrarAbonosPendientes(pendientesOrigen));
        const listaAbonos = Array.isArray(resAbonosProyecto?.items)
          ? resAbonosProyecto.items
          : (Array.isArray(resAbonosProyecto) ? resAbonosProyecto : Array.isArray(resAbonosProyecto?.data) ? resAbonosProyecto.data : []);
        setAbonosProyecto(listaAbonos);
        setComprobantes(Array.isArray(itemsDocs) ? itemsDocs : []);
      } catch (err) {
        console.error('Error cargando datos para comprobantes', err);
        setErrorMsg('No se pudieron cargar los datos de comprobantes.');
      } finally {
        setLoadingList(false);
      }
    };

    loadData();
  }, [isOpen, projectId, getAbonosByProyecto, getAbonosSinComprobante, listarDocumentos]);

  useEffect(() => {
    if (objectUrlRef.current) {
      URL.revokeObjectURL(objectUrlRef.current);
      objectUrlRef.current = null;
    }
    if (!file) {
      setFilePreview(null);
      return;
    }
    const url = URL.createObjectURL(file);
    objectUrlRef.current = url;
    setFilePreview(url);
  }, [file]);

  if (!isOpen) return null;

  const handleFileChange = (e) => {
    const f = e?.target?.files?.[0];
    if (!f) return;
    setWarningMsg('');
    setErrorMsg('');
    if (!allowedMime.includes(f.type)) {
      setWarningMsg('Tipo de archivo no permitido. Usa PDF, imágenes (JPG/PNG/GIF/WEBP) o documentos Office.');
      return;
    }
    const sizeMB = f.size / (1024 * 1024);
    if (sizeMB > MAX_FILE_MB) {
      setWarningMsg(`Archivo demasiado grande. Máximo ${MAX_FILE_MB} MB.`);
      return;
    }
    setFile(f);
  };

  const handleUpload = async () => {
    setWarningMsg('');
    setErrorMsg('');
    if (!abonoSeleccionado) {
      setWarningMsg('Selecciona el abono al que se asociará el comprobante.');
      return;
    }
    if (!file) {
      setWarningMsg('Selecciona un archivo de comprobante.');
      return;
    }
    const existente = comprobantes.find((c) => {
      const abonoId = c?.idAbono ?? c?.abonoId ?? c?.abono_id;
      return abonoId && String(abonoId) === String(abonoSeleccionado);
    });
    if (existente) {
      const confirmar = window.confirm('Este abono ya tiene un comprobante. ¿Deseas reemplazarlo?');
      if (!confirmar) return;
    }
    setLoading(true);
    try {
      await subirDocumento({ idAbono: abonoSeleccionado, file, descripcion });
      setFile(null);
      setFilePreview(null);
      setDescripcion('');
      setWarningMsg('');
      setErrorMsg('');
      await loadComprobantes();
      const resPendientes = await getAbonosSinComprobante(projectId);
      const pendientesOrigen = Array.isArray(resPendientes?.items)
        ? resPendientes.items
        : (Array.isArray(resPendientes?.data?.abonos) ? resPendientes.data.abonos : []);
      setAbonosPendientes(filtrarAbonosPendientes(pendientesOrigen));
      setAbonoSeleccionado('');
      setActiveTab('list');
    } catch (err) {
      console.error('Error al subir comprobante', err);
      setErrorMsg(err?.userMessage || 'No se pudo subir el comprobante.');
    } finally {
      setLoading(false);
    }
  };

  const renderPreview = () => {
    if (!filePreview || !file) {
      return (
        <div className="text-sm text-muted-foreground">
          Selecciona un archivo para ver la vista previa.
        </div>
      );
    }
    if (file.type === 'application/pdf') {
      return (
        <iframe
          title="Preview comprobante"
          src={filePreview}
          className="w-full h-64 border border-border rounded"
        />
      );
    }
    return (
      <img
        src={filePreview}
        alt="Preview comprobante"
        className="w-full h-64 object-contain border border-border rounded"
      />
    );
  };

  const abrirDocumento = async (documentoId, fallbackUrl) => {
    if (!documentoId && fallbackUrl) {
      window.open(fallbackUrl, '_blank', 'noopener,noreferrer');
      return;
    }
    const url = await obtenerDocumentoUrl(documentoId);
    if (!url) {
      setErrorMsg('No se pudo abrir el documento.');
      return;
    }
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  const descargarDocumentoHandler = async (documentoId, fallbackUrl) => {
    if (!documentoId && fallbackUrl) {
      window.open(fallbackUrl, '_blank', 'noopener,noreferrer');
      return;
    }
    const url = await descargarDocumento(documentoId);
    if (!url) {
      setErrorMsg('No se pudo descargar el documento.');
      return;
    }
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  const handleEditClick = (documento) => {
    setDocumentoToEdit(documento);
    setIsEditModalOpen(true);
  };

  const handleDocumentUpdated = () => {
    loadComprobantes();
  };

  const renderList = () => {
    if (loadingList) {
      return (
        <div className="flex items-center justify-center py-6 text-sm text-muted-foreground">
          Cargando comprobantes...
        </div>
      );
    }
    if (!comprobantes.length) {
      return (
        <div className="text-sm text-muted-foreground py-6 text-center">
          Aún no hay comprobantes cargados para los abonos de este proyecto.
        </div>
      );
    }
    return (
      <div className="space-y-3">
        {comprobantes.map((item) => {
          const abonoId = item?.idAbono ?? item?.abonoId ?? item?.abono_id;
          const documentoId = item?.idDocumento ?? item?.id ?? item?._id ?? item?.documentoId ?? item?.documento_id;
          const urlLista = item?.urlDescarga ?? item?.url ?? item?.link ?? item?.archivoUrl;
          const abono = abonosProyecto.find((a) => (a?.id === abonoId || a?._id === abonoId));
          const monto = Number(abono?.montoAbono ?? abono?.monto ?? abono?.monto_abono ?? 0);
          const tieneArchivo = Boolean(documentoId || urlLista);

          return (
            <div
              key={item?.id ?? item?._id ?? abonoId}
              className="border border-border rounded-lg p-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3"
            >
              <div>
                <div className="text-sm font-medium text-foreground">
                  Abono {abono?.numeroAbono ? `#${abono.numeroAbono}` : abonoId}
                </div>
                <div className="text-xs text-muted-foreground">
                  {abono ? formatCurrency(monto) : '—'}
                  {abono?.fecha && (
                    <span className="ml-2">
                      {new Date(abono.fecha).toLocaleDateString('es-MX')}
                    </span>
                  )}
                </div>
                {item.descripcion && <p className="text-xs mt-1">{item.descripcion}</p>}
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  iconName="Eye"
                  disabled={!tieneArchivo}
                  onClick={() => tieneArchivo && abrirDocumento(documentoId, urlLista)}
                >
                  Ver
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  iconName="Download"
                  disabled={!tieneArchivo}
                  onClick={() => tieneArchivo && descargarDocumentoHandler(documentoId, urlLista)}
                >
                  Descargar
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  iconName="Edit"
                  disabled={!tieneArchivo}
                  onClick={() => tieneArchivo && handleEditClick(item)}
                >
                  Editar
                </Button>
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center">
        <div className="absolute inset-0 bg-black/40" onClick={onClose} />
        <div className="relative bg-card border border-border rounded-lg shadow-2xl w-full max-w-4xl mx-4 max-h-[90vh] flex flex-col">
          <div className="p-4 border-b border-border flex items-center justify-between bg-card">
            <div className="flex items-center gap-2">
              <Icon name="FileText" size={18} />
              <div>
                <h3 className="text-lg font-semibold text-foreground">
                  Gestión de comprobantes
                </h3>
                <p className="text-xs text-muted-foreground">
                  Proyecto: {project?.name ?? project?.nombreProyecto ?? '—'}
                </p>
              </div>
            </div>
            <button
              className="text-muted-foreground hover:text-foreground"
              onClick={onClose}
              title="Cerrar"
            >
              <Icon name="X" size={18} />
            </button>
          </div>

          <div className="px-4 pt-4">
            {warningMsg && (
              <div className="mb-3 flex items-start gap-2 rounded-lg border border-yellow-200 bg-yellow-50 px-3 py-2 text-sm text-yellow-800">
                <Icon name="AlertTriangle" size={16} className="mt-[2px]" />
                <span>{warningMsg}</span>
              </div>
            )}
            {errorMsg && (
              <div className="mb-3 flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                <Icon name="AlertCircle" size={16} className="mt-[2px]" />
                <span>{errorMsg}</span>
              </div>
            )}
            <div className="flex border-b border-border gap-2">
              <button
                className={`px-4 py-2 text-sm font-medium rounded-t-lg transition-colors ${activeTab === 'upload'
                    ? 'text-primary border-b-2 border-primary bg-muted/40'
                    : 'text-muted-foreground hover:text-foreground'
                  }`}
                onClick={() => setActiveTab('upload')}
              >
                Subir comprobante
              </button>
              <button
                className={`px-4 py-2 text-sm font-medium rounded-t-lg transition-colors ${activeTab === 'list'
                    ? 'text-primary border-b-2 border-primary bg-muted/40'
                    : 'text-muted-foreground hover:text-foreground'
                  }`}
                onClick={() => setActiveTab('list')}
              >
                Comprobantes cargados
              </button>
            </div>
          </div>

          <div className="p-4 overflow-y-auto flex-1">
            {activeTab === 'upload' && (
              <div className="space-y-4">
                <div className="flex flex-col gap-2">
                  <label className="text-sm font-medium text-foreground">
                    Abono a asociar
                  </label>
                  <select
                    className="border border-border rounded px-3 py-2 bg-background text-foreground text-sm"
                    value={abonoSeleccionado}
                    onChange={(e) => setAbonoSeleccionado(e.target.value)}
                    disabled={loadingList || !abonosPendientes.length}
                  >
                    <option value="">
                      {loadingList ? 'Cargando abonos...' : 'Selecciona un abono'}
                    </option>
                    {abonosPendientes.map((abono) => {
                      const id = abono?.id ?? abono?._id;
                      const monto = Number(abono?.montoAbono ?? abono?.monto ?? abono?.monto_abono ?? 0);
                      const folio = abono?.folio ?? abono?.referencia ?? id;
                      const numero = abono?.numeroAbono ?? abono?.numero_abono;
                      return (
                        <option key={id} value={id}>
                          {numero ? `#${numero}` : 'Abono'} - {folio} - {formatCurrency(monto)}
                        </option>
                      );
                    })}
                  </select>
                  {!loadingList && !abonosPendientes.length && (
                    <p className="text-xs text-muted-foreground">
                      No hay abonos pendientes de comprobante para este proyecto.
                    </p>
                  )}
                </div>

                <div className="flex flex-col gap-2">
                  <label className="text-sm font-medium text-foreground">
                    Archivo comprobante
                  </label>

                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      iconName="UploadCloud"
                      iconPosition="left"
                      onClick={() => fileInputRef.current?.click()}
                      className="sm:w-auto w-full justify-center"
                    >
                      Seleccionar archivo
                    </Button>
                    <div className="flex-1 text-xs sm:text-sm text-muted-foreground truncate border border-dashed border-border rounded px-3 py-2 bg-muted/20">
                      {file
                        ? (
                          <span className="text-foreground">
                            {file.name}{' '}
                            <span className="text-xs text-muted-foreground">
                              ({(file.size / 1024).toFixed(1)} KB)
                            </span>
                          </span>
                        )
                        : 'Ningún archivo seleccionado'}
                    </div>
                  </div>

                  <input
                    ref={fileInputRef}
                    type="file"
                    accept={allowedMime.join(',')}
                    onChange={handleFileChange}
                    className="sr-only"
                  />

                  <p className="text-xs text-muted-foreground">
                    Formatos permitidos: PDF, imágenes (JPG/PNG/GIF/WEBP) y documentos Office. Límite {MAX_FILE_MB} MB.
                  </p>
                </div>

                <div className="flex flex-col gap-2">
                  <label className="text-sm font-medium">Descripción</label>
                  <textarea
                    value={descripcion}
                    onChange={(e) => setDescripcion(e.target.value)}
                    className="border rounded p-2 w-full bg-background"
                    rows="3"
                    placeholder="Descripción del comprobante (opcional)"
                  />
                </div>

                <div>
                  <div className="text-sm font-medium text-foreground mb-2">
                    Vista previa
                  </div>
                  <div className="border border-border rounded-lg bg-muted/30 p-3">
                    {renderPreview()}
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'list' && renderList()}
          </div>

          <div className="p-4 border-t border-border flex items-center justify-end gap-2">
            <Button variant="outline" onClick={onClose}>
              Cerrar
            </Button>
            {activeTab === 'upload' && (
              <Button onClick={handleUpload} loading={loading} iconName="Upload" iconPosition="left">
                Subir comprobante
              </Button>
            )}
          </div>
        </div>
      </div>
      <EditDocumentModal
        isOpen={isEditModalOpen}
        documento={documentoToEdit}
        onClose={() => setIsEditModalOpen(false)}
        onDocumentUpdated={handleDocumentUpdated}
      />
    </>
  );
};

export default ComprobantesModal;
export { EditDocumentModal };

