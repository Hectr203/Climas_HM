import React, { useState, useEffect } from 'react';
import useCommunication from '../../../hooks/useCommunication';
import { useAuth } from '../../../hooks/useAuth';
        import Icon from '../../../components/AppIcon';
        import Button from '../../../components/ui/Button';
        

        const CommunicationPanel = ({ opportunity, onAddCommunication }) => {
          const { createCommunication, getComunicacionesByOportunidad, loading, error, success } = useCommunication();
          const { user } = useAuth();
          const [newCommunication, setNewCommunication] = useState({
            type: 'whatsapp',
            content: '',
            urgency: 'normal',
            hasAttachments: false
          });

          const [showHistory, setShowHistory] = useState(false);
          const [localHistory, setLocalHistory] = useState([]);

          // Cargar comunicaciones de la oportunidad al montar el componente
          useEffect(() => {
            if (opportunity?.id) {
              loadCommunications();
            }
          }, [opportunity?.id]);

          const loadCommunications = async () => {
            const response = await getComunicacionesByOportunidad(opportunity.id);
            if (response?.data?.comunicaciones) {
              const formattedComms = response.data.comunicaciones.map(comm => ({
                id: comm.id,
                type: comm.tipoComunicacion,
                date: new Date(parseInt(comm.id)).toLocaleDateString('es-MX'),
                content: comm.mensaje,
                urgency: comm.nivelUrgencia,
                createdBy: comm.creadoPor,
              }));
              setLocalHistory(formattedComms);
            }
          };

          const handleInputChange = (field, value) => {
            setNewCommunication(prev => ({ ...prev, [field]: value }));
          };

          const handleAddCommunication = async () => {
            if (!newCommunication?.content?.trim()) return;

            // Mapea los datos al formato del backend
            const commData = {
              tipoComunicacion: newCommunication?.type || 'whatsapp',
              nivelUrgencia: newCommunication?.urgency || 'normal',
              asunto: `Comunicación desde Oportunidad`,
              mensaje: newCommunication?.content,
              idCliente: opportunity?.clientId || opportunity?.clienteId,
              idOportunidad: opportunity?.id,
              creadoPor: user?.rol ? `${user.rol} (${user.email})` : user?.email || 'Usuario',
            };

            const result = await createCommunication(commData);
            if (!result) return;
            
            // Recargar las comunicaciones desde el backend
            await loadCommunications();
            
            setNewCommunication({ type: 'whatsapp', content: '', urgency: 'normal', hasAttachments: false });
          };

          const getUrgencyColor = (urgency) => {
            switch (urgency) {
              case 'urgente': return 'text-red-600 bg-red-50';
              case 'alta': return 'text-orange-600 bg-orange-50';
              case 'normal': return 'text-blue-600 bg-blue-50';
              default: return 'text-gray-600 bg-gray-50';
            }
          };

          return (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Icon name="MessageSquare" size={16} className="text-primary" />
                  <h4 className="font-medium">Comunicación con Cliente</h4>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowHistory(!showHistory)}
                  iconName={showHistory ? 'ChevronUp' : 'ChevronDown'}
                >
                  Historial
                </Button>
              </div>

              {/* Communication History */}
              {showHistory && (
                <div className="max-h-48 overflow-y-auto space-y-2 bg-muted/30 rounded-lg p-3">
                  {localHistory.map((comm) => (
                    <div key={comm?.id} className="flex items-start space-x-2 text-sm">
                      <Icon 
                        name={comm?.type === 'whatsapp' ? 'MessageCircle' : comm?.type === 'email' ? 'Mail' : 'Phone'} 
                        size={14} 
                        className="text-muted-foreground mt-0.5" 
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center space-x-2">
                          <span className="text-xs text-muted-foreground">{comm?.date}</span>
                          <span className={`px-2 py-1 text-xs rounded ${getUrgencyColor(comm?.urgency)}`}>
                            {comm?.urgency === 'urgente' ? 'Urgente' : comm?.urgency === 'alta' ? 'Alta' : 'Normal'}
                          </span>
                        </div>
                        <p className="text-foreground mt-1">{comm?.content}</p>
                      </div>
                    </div>
                  ))}
                  {localHistory.length === 0 && (
                    <p className="text-sm text-muted-foreground text-center py-4">Sin comunicaciones registradas</p>
                  )}
                </div>
              )}

              {/* New Communication */}
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-sm font-medium mb-1 block">Canal</label>
                    <select
                      value={newCommunication?.type}
                      onChange={(e) => handleInputChange('type', e?.target?.value)}
                      className="w-full px-3 py-2 text-sm border border-border rounded-md bg-background"
                    >
                      <option value="facebook">Facebook</option>
                      <option value="instagram">Instagram</option>
                      <option value="whatsapp">WhatsApp</option>
                      <option value="email">Email</option>
                      <option value="llamada">Llamada</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-sm font-medium mb-1 block">Urgencia</label>
                    <select
                      value={newCommunication?.urgency}
                      onChange={(e) => handleInputChange('urgency', e?.target?.value)}
                      className="w-full px-3 py-2 text-sm border border-border rounded-md bg-background"
                    >
                      <option value="normal">Normal</option>
                      <option value="alta">Alta</option>
                      <option value="urgente">Urgente</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="text-sm font-medium mb-1 block">Mensaje</label>
                  <textarea
                    value={newCommunication?.content}
                    onChange={(e) => handleInputChange('content', e?.target?.value)}
                    placeholder="Escribir comunicación con el cliente..."
                    rows={3}
                    className="w-full px-3 py-2 text-sm border border-border rounded-md bg-background resize-none"
                  />
                </div>

                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="attachments"
                    checked={newCommunication?.hasAttachments}
                    onChange={(e) => handleInputChange('hasAttachments', e?.target?.checked)}
                    className="rounded border-border"
                  />
                  <label htmlFor="attachments" className="text-sm">Incluye anexos</label>
                </div>

                <Button
                  onClick={handleAddCommunication}
                  disabled={!newCommunication?.content?.trim() || loading}
                  className="w-full"
                  iconName="Send"
                  iconPosition="left"
                >
                  {loading ? 'Enviando...' : 'Enviar Comunicación'}
                </Button>
                {error && <div className="text-xs text-destructive mt-2">Error al enviar comunicación</div>}
                {success && <div className="text-xs text-green-600 mt-2">Comunicación enviada correctamente</div>}
              </div>

              {/* Quick Actions */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Acciones Rápidas</label>
                <div className="grid grid-cols-2 gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleInputChange('content', 'Solicitar aclaraciones técnicas mínimas')}
                    className="text-xs"
                  >
                    Solicitar Aclaraciones
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleInputChange('content', 'Confirmar costo extra por escrito')}
                    className="text-xs"
                  >
                    Confirmar Costos Extra
                  </Button>
                </div>
              </div>
            </div>
          );
        };

        export default CommunicationPanel;