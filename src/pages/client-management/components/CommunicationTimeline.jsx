import React, { useState } from 'react';
import Icon from '../../../components/AppIcon';
import Button from '../../../components/ui/Button';
import AttachmentsModal from './AttachmentsModal';

const CommunicationTimeline = ({ communications, onAddCommunication, onViewDetails, onUploadAttachments }) => {
  const [isAttachmentsOpen, setIsAttachmentsOpen] = useState(false);
  const [selectedComm, setSelectedComm] = useState(null);
  const getTypeIcon = (type) => {
    switch (type) {
      case 'email':
        return 'Mail';
      case 'phone':
        return 'Phone';
      case 'meeting':
        return 'Users';
      case 'document':
        return 'FileText';
      case 'contract':
        return 'FileCheck';
      default:
        return 'MessageCircle';
    }
  };

  const getTypeColor = (type) => {
    switch (type) {
      case 'email':
        return 'bg-blue-100 text-blue-600';
      case 'phone':
        return 'bg-green-100 text-green-600';
      case 'meeting':
        return 'bg-purple-100 text-purple-600';
      case 'document':
        return 'bg-orange-100 text-orange-600';
      case 'contract':
        return 'bg-red-100 text-red-600';
      default:
        return 'bg-gray-100 text-gray-600';
    }
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date?.toLocaleDateString('es-MX', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <>
      <div className="bg-card border border-border rounded-lg p-6 card-shadow" style={{minWidth: '370px', maxWidth: '440px'}}>
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold text-foreground">Historial de Comunicación</h3>
        <Button
          variant="default"
          size="sm"
          onClick={onAddCommunication}
          iconName="Plus"
          iconPosition="left"
        >
          Nueva Comunicación
        </Button>
      </div>
      <div className="space-y-4 max-h-[350px] overflow-y-auto overflow-x-hidden">
        {communications?.length === 0 ? (
          <div className="text-center py-8">
            <Icon name="MessageCircle" size={48} className="text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">No hay comunicaciones registradas</p>
            <Button
              variant="outline"
              size="sm"
              onClick={onAddCommunication}
              className="mt-4"
              iconName="Plus"
              iconPosition="left"
            >
              Agregar Primera Comunicación
            </Button>
          </div>
        ) : (
          communications?.map((comm, index) => (
            <div key={comm?.id} className="relative">
              {index < communications?.length - 1 && (
                <div className="absolute left-6 top-12 bottom-0 w-px bg-border"></div>
              )}
              
              <div className="flex items-start space-x-4">
                <div className={`w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0 ${getTypeColor(comm?.type)}`}>
                  <Icon name={getTypeIcon(comm?.type)} size={20} />
                </div>
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center space-x-2">
                      <h4 className="text-sm font-medium text-foreground">{comm?.subject}</h4>
                      <span className="px-2 py-1 text-xs bg-muted text-muted-foreground rounded-full">
                        {comm?.type}
                      </span>
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {formatDate(comm?.date)}
                    </span>
                  </div>
                  
                  <p className="text-sm text-muted-foreground mb-2 line-clamp-2">
                    {comm?.description}
                  </p>
                  
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <Icon name="User" size={14} className="text-muted-foreground" />
                      <span className="text-xs text-muted-foreground">{comm?.contactPerson}</span>
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      {comm?.hasAttachments && (
                        <Icon name="Paperclip" size={14} className="text-muted-foreground" />
                      )}
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => { setSelectedComm(comm); setIsAttachmentsOpen(true); }}
                        className="text-xs"
                      >
                        Archivos
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
      </div>

      <AttachmentsModal
        isOpen={isAttachmentsOpen}
        onClose={() => { setIsAttachmentsOpen(false); setSelectedComm(null); }}
        attachments={selectedComm?.attachments || selectedComm?.files || []}
        onUpload={onUploadAttachments}
        communication={selectedComm}
      />
    </>
  );
};

export default CommunicationTimeline;