import React, { useState, useEffect } from 'react';
import Button from '../../../components/ui/Button';
import Input from '../../../components/ui/Input';
import Icon from '../../../components/AppIcon';
import { cn } from '../../../utils/cn';
import { useNotification } from '../../../context/NotificationContext';

const UserFormModal = ({ user, onClose, onSave }) => {
  // Estado inicial completamente vacío
  const initialFormState = {
    nombre: '',
    email: '',
    password: '',
    rol: '',
    contacto: '',
    direccion: '',
    imagen: ''
  };

  const [formData, setFormData] = useState(initialFormState);
  const [errors, setErrors] = useState({});
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    // Solo precargar datos si estamos editando un usuario existente
    if (user) {
      setFormData({
        nombre: user.nombre || '',
        email: user.email || '',
        password: '', // Nunca precargar contraseña
        rol: user.rol || '',
        contacto: user.contacto || '',
        direccion: user.direccion || '',
        imagen: user.imagen || ''
      });
    } else {
      // Asegurar que el formulario esté completamente vacío para creación
      setFormData(initialFormState);
      setErrors({});
      setShowPassword(false);
    }
  }, [user]);

  const validateForm = () => {
    const newErrors = {};
    
    // Validar nombre
    if (!formData.nombre.trim()) {
      newErrors.nombre = 'El nombre es requerido';
    } else if (formData.nombre.trim().length < 3) {
      newErrors.nombre = 'El nombre debe tener al menos 3 caracteres';
    }
    
    // Validar email
    if (!formData.email.trim()) {
      newErrors.email = 'El correo es requerido';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Correo electrónico inválido';
    }
    
    // Validar contraseña
    if (!user && !formData.password.trim()) {
      newErrors.password = 'La contraseña es requerida';
    } else if (formData.password && formData.password.length < 6) {
      newErrors.password = 'La contraseña debe tener al menos 6 caracteres';
    }
    
    // Validar rol
    if (!formData.rol.trim()) {
      newErrors.rol = 'El rol es requerido';
    }
    
    // Validar contacto (si se proporciona)
    if (formData.contacto.trim()) {
      const contactoSinEspacios = formData.contacto.replace(/\s/g, '');
      if (!/^\d{10}$/.test(contactoSinEspacios)) {
        newErrors.contacto = 'El contacto debe tener 10 dígitos';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      addNotification('Por favor, corrija los errores en el formulario', 'error');
      return;
    }

    setIsSubmitting(true);
    
    try {
      await onSave(formData);
      addNotification(
        user ? 'Usuario actualizado exitosamente' : 'Usuario creado exitosamente',
        'success'
      );
    } catch (error) {
      addNotification(
        error.message || 'Error al guardar el usuario',
        'error'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    
    // Validación específica para contacto (solo números, máximo 10 dígitos)
    if (name === 'contacto') {
      const numericValue = value.replace(/\D/g, '');
      if (numericValue.length <= 10) {
        setFormData(prev => ({
          ...prev,
          [name]: numericValue
        }));
      }
    } else {
      setFormData(prev => ({
        ...prev,
        [name]: value
      }));
    }
    
    // Limpiar error del campo cuando el usuario empieza a escribir
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-card rounded-lg w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-xl">
        {/* Header */}
        <div className="sticky top-0 bg-card border-b border-border px-6 py-4 flex items-center justify-between z-10">
          <h2 className="text-xl font-semibold text-foreground">
            {user ? 'Editar Usuario' : 'Crear Nuevo Usuario'}
          </h2>
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            aria-label="Cerrar modal"
          >
            <Icon name="X" className="w-5 h-5" />
          </Button>
        </div>
        
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <Input
                label="Nombre"
                name="nombre"
                value={formData.nombre}
                onChange={handleChange}
                error={errors.nombre}
                required
                placeholder="Ingrese el nombre completo"
              />
            </div>

            <div>
              <Input
                label="Correo Electrónico"
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                error={errors.email}
                required
                placeholder="correo@ejemplo.com"
              />
            </div>

            <div className="relative">
              <Input
                label="Contraseña"
                type={showPassword ? "text" : "password"}
                name="password"
                value={formData.password}
                onChange={handleChange}
                error={errors.password}
                required={!user}
                placeholder={user ? "Dejar vacío para mantener contraseña actual" : "Ingrese una contraseña segura"}
              />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="absolute right-2 top-8"
                onClick={() => setShowPassword(!showPassword)}
                aria-label={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
              >
                <Icon
                  name={showPassword ? "EyeOff" : "Eye"}
                  className="w-4 h-4"
                />
              </Button>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium leading-none text-foreground">
                Rol <span className="text-destructive ml-1">*</span>
              </label>
              <select
                name="rol"
                value={formData.rol}
                onChange={handleChange}
                required
                className={cn(
                  "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
                  errors.rol && "border-destructive focus-visible:ring-destructive"
                )}
              >
                <option value="">Seleccionar rol</option>
                <option value="admin">Admin - Acceso Total</option>
                <option value="administracion">Administración - Negocio, Personal y Abonos</option>
                <option value="proyectos">Proyectos - Cotizaciones y Proyectos</option>
                <option value="ventas">Ventas - Oportunidades y Cotizaciones</option>
                <option value="taller">Taller - Operaciones, Operaciones de Taller e Inventario</option>
              </select>
              {errors.rol && (
                <p className="text-sm text-destructive">{errors.rol}</p>
              )}
            </div>

            <div>
              <Input
                label="Contacto"
                name="contacto"
                value={formData.contacto}
                onChange={handleChange}
                error={errors.contacto}
                placeholder="Teléfono de contacto (10 dígitos)"
                maxLength={10}
              />
              {formData.contacto && (
                <p className="text-xs text-muted-foreground mt-1">
                  {formData.contacto.length}/10 dígitos
                </p>
              )}
            </div>

            <div className="md:col-span-2">
              <Input
                label="Dirección"
                name="direccion"
                value={formData.direccion}
                onChange={handleChange}
                placeholder="Dirección completa"
              />
            </div>

            <div className="md:col-span-2">
              <Input
                label="URL de Imagen"
                name="imagen"
                value={formData.imagen}
                onChange={handleChange}
                placeholder="https://ejemplo.com/imagen.jpg"
              />
              {formData.imagen && (
                <div className="mt-2">
                  <img 
                    src={formData.imagen} 
                    alt="Preview" 
                    className="w-16 h-16 rounded-full object-cover border-2 border-border"
                    onError={(e) => {
                      e.target.style.display = 'none';
                    }}
                  />
                </div>
              )}
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-border">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={isSubmitting}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              variant="default"
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <>
                  <Icon name="Loader2" className="w-4 h-4 mr-2 animate-spin" />
                  Guardando...
                </>
              ) : (
                user ? 'Guardar Cambios' : 'Crear Usuario'
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default UserFormModal;