import React, { useEffect, useRef, useState } from 'react';
import Icon from '../../../components/AppIcon';
import Button from '../../../components/ui/Button';
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
  projectId,
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
    if (!documento?.id) return;
    setWarningMsg('');
    setErrorMsg('');
    if (!file && !descripcion) {
      setWarningMsg('Debes seleccionar un nuevo archivo o modificar la descripción.');
      return;
    }

    try {
      await updateDocumento({
        id: documento.id,
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
    if (!filePreview && !documento?.url) {
      return (
        <div className="text-sm text-muted-foreground">
          Selecciona un archivo para ver la vista previa.
        </div>
      );
    }
    const previewUrl = filePreview || documento?.url;
    const isPdf = (file?.type || documento?.contentType) === 'application/pdf';

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
    <div className="fixed inset-0 z-50 flex items-center justify-center">
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

export default EditDocumentModal;
