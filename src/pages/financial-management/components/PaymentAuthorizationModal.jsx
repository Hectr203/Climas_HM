import React, { useState } from 'react';
import Icon from '../../../components/AppIcon';
import Button from '../../../components/ui/Button';
import Input from '../../../components/ui/Input';
import Select from '../../../components/ui/Select';
import { useNotifications } from 'context/NotificationContext';

const PaymentAuthorizationModal = ({ isOpen, onClose, expense, onAuthorize, onDelete }) => {
  const {
    showHttpError,
    showOperationSuccess,
    showConfirm,
  } = useNotifications();

  const [authData, setAuthData] = useState({
    authorizationLevel: '',
    approverComments: '',
    paymentMethod: '',
    scheduledDate: '',
    priority: 'normal',
    requiresAdditionalApproval: false
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const authorizationLevels = [
    { value: 'supervisor', label: 'Supervisor de Departamento' },
    { value: 'manager', label: 'Gerente de Área' },
    { value: 'director', label: 'Director Financiero' },
    { value: 'executive', label: 'Dirección Ejecutiva' }
  ];

  const paymentMethods = [
    { value: 'transfer', label: 'Transferencia Bancaria' },
    { value: 'check', label: 'Cheque' },
    { value: 'cash', label: 'Efectivo' },
    { value: 'card', label: 'Tarjeta Corporativa' }
  ];

  const priorityOptions = [
    { value: 'low', label: 'Baja' },
    { value: 'normal', label: 'Normal' },
    { value: 'high', label: 'Alta' },
    { value: 'urgent', label: 'Urgente' }
  ];

  const handleInputChange = (field, value) => {
    setAuthData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSubmit = async (e) => {
    e?.preventDefault();
    if (!expense) return;

    setIsSubmitting(true);

    try {
      await onAuthorize?.({
        id: expense?.id,
        status: 'approved', // inglés, como tu API
        ...authData,
        amount: parseFloat(expense?.amount?.replace(/[^0-9.-]+/g, '')) || 0
      });

      // Notificación de éxito
      showOperationSuccess('update', 'Pago');

      onClose?.();
    } catch (error) {
      console.error('Error authorizing payment:', error);
      // Notificación de error HTTP
      showHttpError(error, 'Error al autorizar el pago');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = () => {
    if (!expense?.id) return;

    // Usamos tu notificación de confirmación en lugar de window.confirm
    showConfirm(
      `¿Deseas eliminar este pago "${expense?.description || ''}"?`,
      {
        onConfirm: async () => {
          setIsDeleting(true);
          try {
            await onDelete?.(expense.id);
            showOperationSuccess('delete', 'Pago');
            onClose?.();
          } catch (err) {
            console.error('Error eliminando pago:', err);
            showHttpError(err, 'Error al eliminar el pago');
          } finally {
            setIsDeleting(false);
          }
        },
        onCancel: () => {
          // Si quieres hacer algo extra al cancelar, lo agregas aquí
        }
      }
    );
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency: 'MXN'
    })?.format(amount);
  };

  const getRequiredAuthLevel = (amount) => {
    const numAmount = parseFloat(amount?.replace(/[^0-9.-]+/g, ''));
    if (numAmount > 100000) return 'executive';
    if (numAmount > 50000) return 'director';
    if (numAmount > 10000) return 'manager';
    return 'supervisor';
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-1050 p-4">
      <div className="bg-card rounded-lg shadow-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-border">
          <div>
            <h2 className="text-xl font-semibold text-foreground">Autorización de Pago</h2>
            <p className="text-sm text-muted-foreground">Revisar y autorizar el gasto seleccionado</p>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            disabled={isSubmitting || isDeleting}
          >
            <Icon name="X" size={20} />
          </Button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Expense Details */}
          <div className="bg-muted rounded-lg p-4 space-y-3">
            <h3 className="font-medium text-foreground">Detalles del Gasto</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-muted-foreground">Descripción:</span>
                <p className="text-foreground font-medium">{expense?.description}</p>
              </div>
              <div>
                <span className="text-muted-foreground">Monto:</span>
                <p className="text-foreground font-bold text-lg">{expense?.amount}</p>
              </div>
              <div>
                <span className="text-muted-foreground">Categoría:</span>
                <p className="text-foreground">{expense?.category}</p>
              </div>
              <div>
                <span className="text-muted-foreground">Proyecto:</span>
                <p className="text-foreground">{expense?.project}</p>
              </div>
              <div>
                <span className="text-muted-foreground">Fecha:</span>
                <p className="text-foreground">{expense?.date}</p>
              </div>
              <div>
                <span className="text-muted-foreground">Solicitante:</span>
                <p className="text-foreground">{expense?.requestedBy || 'Juan Pérez'}</p>
              </div>
            </div>
          </div>

          {/* Payment Details */}
          <div className="space-y-4">
            <div className="flex items-center space-x-2">
              <Icon name="CreditCard" size={16} className="text-primary" />
              <h3 className="font-medium text-foreground">Detalles de Pago</h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Select
                label="Método de Pago"
                options={paymentMethods}
                value={authData?.paymentMethod}
                onChange={(value) => handleInputChange('paymentMethod', value)}
                required
              />

              <Input
                type="date"
                label="Fecha Programada"
                value={authData?.scheduledDate}
                onChange={(e) => handleInputChange('scheduledDate', e?.target?.value)}
                required
              />
            </div>

            <Select
              label="Prioridad"
              options={priorityOptions}
              value={authData?.priority}
              onChange={(value) => handleInputChange('priority', value)}
            />
          </div>

          {/* Comments */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">
              Comentarios del Aprobador
            </label>
            <textarea
              className="w-full px-3 py-2 border border-border rounded-md bg-input text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent resize-none"
              rows={4}
              placeholder="Agregue comentarios sobre la autorización..."
              value={authData?.approverComments}
              onChange={(e) => handleInputChange('approverComments', e?.target?.value)}
            />
          </div>

          {/* Additional Approval */}
          <div className="flex items-center space-x-3">
            <input
              type="checkbox"
              id="additionalApproval"
              checked={authData?.requiresAdditionalApproval}
              onChange={(e) => handleInputChange('requiresAdditionalApproval', e?.target?.checked)}
              className="w-4 h-4 text-primary bg-input border-border rounded focus:ring-ring"
            />
            <label htmlFor="additionalApproval" className="text-sm text-foreground">
              Requiere aprobación adicional de nivel superior
            </label>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-between pt-6 border-t border-border">
            {/* Botón eliminar */}
            <Button
              type="button"
              variant="destructive"
              iconName="Trash2"
              iconPosition="left"
              onClick={handleDelete}
              disabled={isSubmitting || isDeleting}
            >
              {isDeleting ? 'Eliminando…' : 'Eliminar pago'}
            </Button>

            <div className="flex items-center space-x-3">
              <Button
                type="button"
                variant="outline"
                onClick={onClose}
                disabled={isSubmitting || isDeleting}
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                variant="success"
                loading={isSubmitting}
                disabled={isDeleting}
                iconName="Check"
                iconPosition="left"
              >
                Autorizar Pago
              </Button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};

export default PaymentAuthorizationModal;
