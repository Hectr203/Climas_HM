import React, { useState } from 'react';
import Icon from '../../../components/AppIcon';
import Button from '../../../components/ui/Button';

const AttachmentsModal = ({ isOpen, onClose, attachments = [], onUpload, communication }) => {
  const [selectedFiles, setSelectedFiles] = useState([]);

  if (!isOpen) return null;

  const handleFileChange = (e) => {
    const files = Array.from(e.target.files);
    setSelectedFiles(files);
  };

  const handleUpload = () => {
    if (selectedFiles.length === 0) return;
    if (onUpload) onUpload(selectedFiles, communication);
    setSelectedFiles([]);
    // don't auto-close — keep modal open to show uploaded files after parent refreshes
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="fixed inset-0 bg-black/50 transition-opacity" onClick={onClose} />
      <div className="relative bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-lg p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-foreground">Archivos de Comunicación</h3>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
            <Icon name="X" size={18} />
          </button>
        </div>

        <div className="mb-4">
          <label className="block text-sm text-muted-foreground mb-2">Subir archivos</label>
          <div className="flex items-center space-x-2">
            <input
              type="file"
              multiple
              onChange={handleFileChange}
              className="block w-full text-sm text-muted-foreground"
            />
            <Button variant="primary" size="sm" onClick={handleUpload} disabled={selectedFiles.length === 0}>
              Subir
            </Button>
          </div>
          {selectedFiles.length > 0 && (
            <ul className="mt-2 text-xs text-muted-foreground list-disc list-inside">
              {selectedFiles.map((f, i) => (
                <li key={i}>{f.name} ({Math.round(f.size/1024)} KB)</li>
              ))}
            </ul>
          )}
        </div>

        <div>
          <h4 className="text-sm font-medium text-foreground mb-2">Archivos existentes</h4>
          {attachments?.length === 0 ? (
            <p className="text-sm text-muted-foreground">No hay archivos adjuntos.</p>
          ) : (
            <ul className="space-y-2">
              {attachments.map((att) => (
                <li key={att.id} className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Icon name="FileText" size={16} className="text-muted-foreground" />
                    <span className="text-sm text-foreground truncate max-w-[380px]">{att.name}</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    {att.url ? (
                      <a href={att.url} target="_blank" rel="noreferrer" className="text-xs text-primary underline">Ver</a>
                    ) : (
                      <span className="text-xs text-muted-foreground">—</span>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
};

export default AttachmentsModal;
