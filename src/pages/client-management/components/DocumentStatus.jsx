import React, { useEffect, useMemo, useState } from 'react';
import Icon from '../../../components/AppIcon';
import Button from '../../../components/ui/Button';
import useClientArchivo from '../../../hooks/useClientArchivo';
import clientesArchivosService from '../../../services/clientesArchivosService';
import { useNotification } from '../../../context/NotificationContext';

const DocumentStatus = ({ documents: propDocuments = [], clientId = null, onDocumentsChange, onViewDocument, onDownloadDocument }) => {
  const { documents: rawDocuments, loading, error, uploadFiles, refresh, downloadDocument, deleteDocument } = useClientArchivo(clientId);
  const { showSuccess, showError } = useNotification();
  const [downloadState, setDownloadState] = useState({ active: false, fileName: '', percent: 0, loaded: 0, total: 0, index: 0, totalFiles: 0 });
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [isComprobanteFlag, setIsComprobanteFlag] = useState(false);
  const [expirationDateInput, setExpirationDateInput] = useState('');
  const [pendingExistingDoc, setPendingExistingDoc] = useState(null);
  const [modalError, setModalError] = useState('');

  const getTodayISO = () => {
    const d = new Date();
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  };

  useEffect(() => {
    if (error) showError(error?.message || 'Error al obtener documentos');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [error]);

  // Normalizar la forma de los documentos para la UI
  const documents = useMemo(() => {
    const docs = Array.isArray(rawDocuments) ? rawDocuments : (Array.isArray(propDocuments) ? propDocuments : []);
    return docs.map(d => ({
      id: d.id || d.documentoId || d._id || d?.data?.id,
      name: d.nombreOriginal || d.nombreAsignado || d.name || d?.data?.nombreOriginal || 'Archivo',
      type: d.tipoDocumento || (d.mimeType && typeof d.mimeType === 'string' && d.mimeType.includes('pdf') ? 'Facturación' : 'Documento'),
      status: d.status || d.estado || 'Completo',
      uploadDate: d.createdAt || d.uploadDate || d?.data?.createdAt || new Date().toISOString(),
      expirationDate: d.expirationDate || d.fechaLimite || d.fecha_limite || d?.data?.expirationDate || d?.metadata?.fechaLimite || null,
      isComprobante: d.comprobante || d.isComprobante || d?.data?.comprobante || d?.metadata?.comprobante || false,
      notes: d.notes || d.nombreOriginal || '',
      url: d.urlBase || d.url || d?.data?.urlBase || null,
      containerName: d.containerName,
      blobName: d.blobName,
    }));
  }, [rawDocuments, propDocuments]);
  const getStatusColor = (status) => {
    switch (status) {
      case 'Completo':
        return 'bg-success text-success-foreground';
      case 'Pendiente':
        return 'bg-warning text-warning-foreground';
      case 'Vencido':
        return 'bg-error text-error-foreground';
      case 'En Revisión':
        return 'bg-primary text-primary-foreground';
      default:
        return 'bg-secondary text-secondary-foreground';
    }
  };

  const getDocumentIcon = (type) => {
    switch (type) {
      case 'RFC':
        return 'FileText';
      case 'Contrato':
        return 'FileCheck';
      case 'Garantía':
        return 'Shield';
      case 'Facturación':
        return 'Receipt';
      case 'Identificación':
        return 'CreditCard';
      default:
        return 'File';
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'No especificado';
    const date = new Date(dateString);
    return date?.toLocaleDateString('es-MX', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  const isExpiringSoon = (expirationDate) => {
    if (!expirationDate) return false;
    const today = new Date();
    const expiry = new Date(expirationDate);
    const diffTime = expiry - today;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays <= 30 && diffDays > 0;
  };

  const isExpired = (expirationDate) => {
    if (!expirationDate) return false;
    const today = new Date();
    const expiry = new Date(expirationDate);
    return expiry < today;
  };

  // Abre la modal para preguntar si es comprobante y la fecha límite
  const handleUploadClick = (existingDocument = null) => {
    if (!clientId) return showError('Seleccione un cliente antes de subir archivos');
    setPendingExistingDoc(existingDocument);
    setIsComprobanteFlag(false);
    setExpirationDateInput('');
    setShowUploadModal(true);
  };

  const pickFilesAndUpload = async (meta = {}, existingDocument = null) => {
    try {
      const files = await new Promise((resolve) => {
        const input = document.createElement('input');
        input.type = 'file';
        input.multiple = true;
        input.accept = '.jpg,.jpeg,.png,.gif,.webp,.pdf';
        input.onchange = () => resolve(input.files ? Array.from(input.files) : []);
        input.click();
      });
      if (!files || files.length === 0) return;
      const resp = await uploadFiles(files, meta);
      // después de subir, forzamos refrescar la lista desde el backend
      await refresh();
      showSuccess('Archivo(s) subidos correctamente');
      const uploaded = Array.isArray(resp) ? resp : [resp];
      const normalized = uploaded.map(d => ({
        id: d.id || d.documentoId || d._id || String(Date.now()),
        name: d.nombreOriginal || d.nombreAsignado || d.name || 'Archivo',
        type: d.tipoDocumento || (d.mimeType && typeof d.mimeType === 'string' && d.mimeType.includes('pdf') ? 'Facturación' : 'Documento'),
        status: meta && meta.comprobante ? 'Pendiente' : (d.status || d.estado || 'Completo'),
        uploadDate: d.createdAt || d.uploadDate || new Date().toISOString(),
        expirationDate: d.expirationDate || d.fechaLimite || (meta && meta.fechaLimite) || null,
        isComprobante: d?.metadata?.comprobante ?? (meta && meta.comprobante) ?? false,
        notes: d.notes || d.nombreOriginal || '',
        url: d.urlBase || d.url || null,
        containerName: d.containerName,
        blobName: d.blobName,
      }));
      if (onDocumentsChange) onDocumentsChange(normalized.concat(documents));
    } catch (error) {
      console.error('Error subiendo documento:', error);
      showError(error?.message || 'Error al subir archivo');
    }
  };

  const handleUploadModalContinue = async () => {
    // preparar metadata
    if (isComprobanteFlag && !expirationDateInput) {
      setModalError('Debes indicar la fecha límite para comprobante');
      return;
    }
    setModalError('');
    const meta = {
  comprobante: Boolean(isComprobanteFlag),
  fechaLimite: isComprobanteFlag ? expirationDateInput : null
};
    setShowUploadModal(false);
    await pickFilesAndUpload(meta, pendingExistingDoc);
    setPendingExistingDoc(null);
  };

  const handleDownloadAll = async () => {
    if (!documents || documents.length === 0) return showError('No hay archivos para descargar');
    // Intentar descargar secuencialmente para evitar popups múltiples.
    const totalFiles = documents.length;
    setDownloadState({ active: true, fileName: 'Descargando archivos', percent: 0, loaded: 0, total: 0, index: 0, totalFiles });
    for (let i = 0; i < documents.length; i++) {
      const d = documents[i];
      try {
        if (downloadDocument) {
          setDownloadState(prev => ({ ...prev, fileName: d?.name || `archivo_${i + 1}`, percent: 0, index: i + 1 }));
          await downloadDocument(d, 60, (loaded, total) => {
            const percent = total ? Math.round((loaded / total) * 100) : Math.min(99, Math.round((loaded / (1024 * 1024)) * 10));
            setDownloadState(prev => ({ ...prev, loaded, total: total || prev.total, percent }));
          });
        } else if (d?.url) {
          const a = document.createElement('a');
          a.href = d.url;
          a.target = '_blank';
          a.rel = 'noopener noreferrer';
          document.body.appendChild(a);
          a.click();
          a.remove();
        } else if (d?.id) {
          const url = `/api/clientes/archivos/descargar/${encodeURIComponent(d.id)}`;
          const a = document.createElement('a');
          a.href = url;
          a.target = '_blank';
          a.rel = 'noopener noreferrer';
          document.body.appendChild(a);
          a.click();
          a.remove();
        }
      } catch (e) {
        console.error('Error descargando documento:', e);
      }
      // Pequeña pausa entre descargas para evitar saturar el navegador
      /* eslint-disable no-await-in-loop */
      await new Promise(res => setTimeout(res, 350));
      /* eslint-enable no-await-in-loop */
    }
    setTimeout(() => setDownloadState({ active: false, fileName: '', percent: 0, loaded: 0, total: 0, index: 0, totalFiles: 0 }), 500);
    showSuccess('Descargas iniciadas');
  };

  const handleDelete = async (doc) => {
    if (!doc?.id) return showError('Documento sin ID');
    try {
      await deleteDocument(doc.id);
    } catch (e) {
      console.error('handleDelete error:', e);
      showError(e?.message || 'No se pudo eliminar el documento');
    }
  };

  const handleView = (doc) => {
    if (onViewDocument) return onViewDocument(doc);
    try {
      if (doc?.url) window.open(doc.url, '_blank');
      else if (doc?.id) window.open(`/api/clientes/archivos/descargar/${encodeURIComponent(doc.id)}`, '_blank');
      else throw new Error('Documento sin URL o ID');
    } catch (err) {
      showError(err?.message || 'No se pudo abrir el documento');
    }
  };

  const handleDownload = async (doc) => {
  if (!doc?.id) return showError("Documento sin ID");

  try {
    setDownloadState({
      active: true,
      fileName: doc.name,
      percent: 0,
      loaded: 0,
      total: 0,
      index: 1,
      totalFiles: 1,
    });

    // ⬅️ AQUÍ USAMOS TU HOOK REAL
    await downloadDocument(doc, 60, (loaded, total) => {
      const percent = total
        ? Math.round((loaded / total) * 100)
        : Math.min(99, Math.round((loaded / (1024 * 1024)) * 10));

      setDownloadState((prev) => ({
        ...prev,
        loaded,
        total,
        percent,
      }));
    });

    showSuccess("Descarga completada");
  } catch (err) {
    console.error("Error descargando documento:", err);
    showError("No se pudo descargar el documento");
  } finally {
    setDownloadState({
      active: false,
      fileName: "",
      percent: 0,
      loaded: 0,
      total: 0,
      index: 0,
      totalFiles: 0
    });
  }
};


  return (
    <div className="bg-card border border-border rounded-lg p-6 card-shadow">
      {downloadState.active && (
        <div className="fixed inset-0 z-50 flex items-center justify-center pointer-events-none">
          <div className="bg-card border border-border rounded-lg p-4 shadow-lg pointer-events-auto" style={{minWidth: 320}}>
            <div className="text-sm font-medium mb-2">{downloadState.fileName}</div>
            <div className="w-72 h-3 bg-muted rounded overflow-hidden">
              <div style={{ width: `${downloadState.percent}%` }} className="h-full bg-primary transition-all" />
            </div>
            <div className="text-xs text-muted-foreground mt-2">{downloadState.index > 0 ? `${downloadState.index}/${downloadState.totalFiles}` : ''} {downloadState.percent ? `${downloadState.percent}%` : 'Preparando...'}</div>
          </div>
        </div>
      )}
      {showUploadModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-black/50" onClick={() => setShowUploadModal(false)} />
          <div className="relative bg-card border border-border rounded-lg p-6 shadow-lg w-full max-w-md">
            <h4 className="text-lg font-semibold mb-2">Subir Documento</h4>
            <p className="text-sm text-muted-foreground">Antes de subir, indica si es comprobante y la fecha límite (si aplica).</p>
            <div className="mt-4 space-y-3">
              <label className="flex items-center space-x-2">
                <input type="checkbox" className="rounded" checked={isComprobanteFlag} onChange={(e) => setIsComprobanteFlag(e.target.checked)} />
                <span className="text-sm">Es comprobante</span>
              </label>
              {isComprobanteFlag && (
                <div>
                  <label className="text-sm">Fecha límite</label>
                  <input
                    type="date"
                    className="mt-1 w-full bg-input border border-border rounded px-2 py-1"
                    value={expirationDateInput}
                    onChange={(e) => setExpirationDateInput(e.target.value)}
                  />
                </div>
              )}
            </div>
            <div className="mt-4 flex items-center justify-end space-x-2">
              <Button variant="ghost" size="sm" onClick={() => setShowUploadModal(false)}>Cancelar</Button>
              <Button variant="default" size="sm" onClick={handleUploadModalContinue}>Seleccionar archivos</Button>
            </div>
          </div>
        </div>
      )}

      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold text-foreground">Estado de Documentos</h3>
        <div className="flex items-center space-x-2">
          <Button
            variant="default"
            size="sm"
            onClick={() => handleUploadClick(null)}
            iconName="Upload"
            iconPosition="left"
          >
            Subir Documento
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleDownloadAll}
            iconName="Download"
            iconPosition="left"
          >
            Descargar Todos
          </Button>
        </div>
      </div>
  <div className="space-y-4 max-h-[400px] overflow-y-auto overflow-x-hidden">
        {documents?.length === 0 ? (
          <div className="text-center py-8">
            <Icon name="FileX" size={48} className="text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">No hay documentos registrados</p>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleUploadClick(null)}
              className="mt-4"
              iconName="Upload"
              iconPosition="left"
            >
              Subir Primer Documento
            </Button>
          </div>
        ) : (
          documents?.map((doc) => (
            <div key={doc?.id} className="flex items-center justify-between p-4 border border-border rounded-lg hover:bg-muted transition-smooth">
              <div className="flex items-center space-x-4">
                <div className="w-10 h-10 bg-muted rounded-lg flex items-center justify-center">
                  <Icon name={getDocumentIcon(doc?.type)} size={20} className="text-muted-foreground" />
                </div>
                
                <div className="min-w-0 flex-1">
                  <div className="flex items-center space-x-2 mb-1">
                    <h4 className="text-sm font-medium text-foreground">{doc?.name}</h4>
                    <span className={`px-2 py-1 text-xs rounded-full ${getStatusColor(doc?.status)}`}>
                      {doc?.status}
                    </span>
                    {doc?.isComprobante && (
                      <span className="px-2 py-1 text-xs bg-muted text-muted-foreground rounded-full">
                        Comprobante
                      </span>
                    )}
                    {isExpiringSoon(doc?.expirationDate) && (
                      <span className="px-2 py-1 text-xs bg-warning text-warning-foreground rounded-full">
                        Por Vencer
                      </span>
                    )}
                    {isExpired(doc?.expirationDate) && (
                      <span className="px-2 py-1 text-xs bg-error text-error-foreground rounded-full">
                        Vencido
                      </span>
                    )}
                  </div>
                  
                  <div className="flex items-center space-x-4 text-xs text-muted-foreground">
                    <span>Tipo: {doc?.type}</span>
                    <span>Subido: {formatDate(doc?.uploadDate)}</span>
                    {doc?.expirationDate && (
                      <span>Vence: {formatDate(doc?.expirationDate)}</span>
                    )}
                  </div>
                  
                  {doc?.notes && (
                    <p className="text-xs text-muted-foreground mt-1 line-clamp-1">
                      {doc?.notes}
                    </p>
                  )}
                </div>
              </div>
              
              <div className="flex items-center space-x-2">
                <Button
  variant="ghost"
  size="sm"
  onClick={() => handleDownload(doc)}
>
  <Icon name="Download" size={16} />
</Button>

                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleDelete(doc)}
                  title="Eliminar documento"
                >
                  <Icon name="Trash" size={16} />
                </Button>
              </div>
            </div>
          ))
        )}
      </div>
      {/* Document Summary */}
      <div className="mt-6 pt-6 border-t border-border">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="text-center">
            <div className="text-lg font-semibold text-success">
              {documents?.filter(d => d?.status === 'Completo')?.length}
            </div>
            <div className="text-xs text-muted-foreground">Completos</div>
          </div>
          <div className="text-center">
            <div className="text-lg font-semibold text-warning">
              {documents?.filter(d => d?.status === 'Pendiente')?.length}
            </div>
            <div className="text-xs text-muted-foreground">Pendientes</div>
          </div>
          <div className="text-center">
            <div className="text-lg font-semibold text-error">
              {documents?.filter(d => isExpired(d?.expirationDate))?.length}
            </div>
            <div className="text-xs text-muted-foreground">Vencidos</div>
          </div>
          <div className="text-center">
            <div className="text-lg font-semibold text-primary">
              {documents?.filter(d => isExpiringSoon(d?.expirationDate))?.length}
            </div>
            <div className="text-xs text-muted-foreground">Por Vencer</div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DocumentStatus;