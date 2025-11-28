import React, { useEffect, useRef } from 'react';
import Icon from '../../../components/AppIcon';
import Button from '../../../components/ui/Button';

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

/**
 * Componente reutilizable para subir comprobantes de pago
 * @param {Object} props
 * @param {File|null} props.file - Archivo seleccionado
 * @param {Function} props.onFileChange - Callback cuando cambia el archivo
 * @param {string} props.descripcion - Descripción del comprobante
 * @param {Function} props.onDescripcionChange - Callback cuando cambia la descripción
 * @param {boolean} props.disabled - Si está deshabilitado
 * @param {boolean} props.showPreview - Si muestra vista previa
 * @param {Object|null} props.existingDocument - Documento existente (para mostrar en preview)
 * @param {string} props.warningMsg - Mensaje de advertencia
 * @param {Function} props.onWarningChange - Callback para cambiar mensaje de advertencia
 */
const ComprobanteUploader = ({
    file,
    onFileChange,
    descripcion,
    onDescripcionChange,
    disabled = false,
    showPreview = true,
    existingDocument = null,
    warningMsg = '',
    onWarningChange,
}) => {
    const fileInputRef = useRef(null);
    const objectUrlRef = useRef(null);
    const [filePreview, setFilePreview] = React.useState(null);

    useEffect(() => {
        // Limpiar URL anterior
        if (objectUrlRef.current) {
            URL.revokeObjectURL(objectUrlRef.current);
            objectUrlRef.current = null;
        }

        if (!file) {
            setFilePreview(null);
            return;
        }

        // Crear nueva URL para preview
        const url = URL.createObjectURL(file);
        objectUrlRef.current = url;
        setFilePreview(url);

        // Cleanup al desmontar
        return () => {
            if (objectUrlRef.current) {
                URL.revokeObjectURL(objectUrlRef.current);
            }
        };
    }, [file]);

    const handleFileChange = (e) => {
        const f = e.target.files?.[0];
        if (!f) return;

        // Limpiar advertencia
        if (onWarningChange) {
            onWarningChange('');
        }

        // Validar tipo de archivo
        if (!allowedMime.includes(f.type)) {
            if (onWarningChange) {
                onWarningChange(
                    'Tipo de archivo no permitido. Usa PDF, imágenes o documentos Office.'
                );
            }
            return;
        }

        // Validar tamaño
        if (f.size / (1024 * 1024) > MAX_FILE_MB) {
            if (onWarningChange) {
                onWarningChange(`Archivo demasiado grande. Máximo ${MAX_FILE_MB} MB.`);
            }
            return;
        }

        onFileChange(f);
    };

    const renderPreview = () => {
        const previewUrl = filePreview || existingDocument?.urlDescarga || existingDocument?.url || existingDocument?.link || existingDocument?.archivoUrl;

        if (!previewUrl) {
            return (
                <div className="text-sm text-muted-foreground text-center py-8">
                    Selecciona un archivo para ver la vista previa.
                </div>
            );
        }

        const isPdf = (file?.type || existingDocument?.contentType)?.includes('pdf');

        if (isPdf) {
            return (
                <iframe
                    title="Preview comprobante"
                    src={previewUrl}
                    className="w-full h-64 border border-border rounded"
                />
            );
        }

        return (
            <img
                src={previewUrl}
                alt="Preview comprobante"
                className="w-full h-64 object-contain border border-border rounded"
            />
        );
    };

    return (
        <div className="space-y-4">
            {/* Selector de archivo */}
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
                        disabled={disabled}
                        className="sm:w-auto w-full justify-center"
                    >
                        Seleccionar archivo
                    </Button>
                    <div className="flex-1 text-xs sm:text-sm text-muted-foreground truncate border border-dashed border-border rounded px-3 py-2 bg-muted/20">
                        {file ? (
                            <span className="text-foreground">
                                {file.name}{' '}
                                <span className="text-xs text-muted-foreground">
                                    ({(file.size / 1024).toFixed(1)} KB)
                                </span>
                            </span>
                        ) : existingDocument ? (
                            <span className="text-foreground">
                                Documento actual: {existingDocument.nombreArchivo || existingDocument.filename || 'archivo'}
                            </span>
                        ) : (
                            'Ningún archivo seleccionado'
                        )}
                    </div>
                </div>

                <input
                    ref={fileInputRef}
                    type="file"
                    accept={allowedMime.join(',')}
                    onChange={handleFileChange}
                    className="sr-only"
                    disabled={disabled}
                />

                <p className="text-xs text-muted-foreground">
                    Formatos permitidos: PDF, imágenes (JPG/PNG/GIF/WEBP) y documentos Office. Límite {MAX_FILE_MB} MB.
                </p>
            </div>

            {/* Mensaje de advertencia */}
            {warningMsg && (
                <div className="flex items-start gap-2 rounded-lg border border-yellow-200 bg-yellow-50 px-3 py-2 text-sm text-yellow-800">
                    <Icon name="AlertTriangle" size={16} className="mt-[2px]" />
                    <span>{warningMsg}</span>
                </div>
            )}

            {/* Campo de descripción */}
            <div className="flex flex-col gap-2">
                <label className="text-sm font-medium text-foreground">
                    Descripción (opcional)
                </label>
                <textarea
                    value={descripcion}
                    onChange={(e) => onDescripcionChange(e.target.value)}
                    className="border border-input rounded p-2 w-full bg-background text-sm"
                    rows="3"
                    placeholder="Descripción del comprobante"
                    disabled={disabled}
                />
            </div>

            {/* Vista previa */}
            {showPreview && (
                <div>
                    <div className="text-sm font-medium text-foreground mb-2">
                        Vista previa
                    </div>
                    <div className="border border-border rounded-lg bg-muted/30 p-3">
                        {renderPreview()}
                    </div>
                </div>
            )}
        </div>
    );
};

export default ComprobanteUploader;
