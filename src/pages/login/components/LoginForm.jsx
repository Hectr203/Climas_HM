import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getDefaultPath } from '../../../utils/auth';
import Icon from '../../../components/AppIcon';
import Button from '../../../components/ui/Button';
import Input from '../../../components/ui/Input';
import { Checkbox } from '../../../components/ui/Checkbox';

const LoginForm = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    rememberMe: false
  });
  const [errors, setErrors] = useState({});
  const [isLoading, setIsLoading] = useState(false);

  // El backend maneja credenciales y roles

  const validateForm = () => {
    const newErrors = {};

    if (!formData?.email) {
      newErrors.email = 'El correo electrónico es requerido';
    } else if (!/\S+@\S+\.\S+/?.test(formData?.email)) {
      newErrors.email = 'Formato de correo electrónico inválido';
    }

    if (!formData?.password) {
      newErrors.password = 'La contraseña es requerida';
    } else if (formData?.password?.length < 6) {
      newErrors.password = 'La contraseña debe tener al menos 6 caracteres';
    }

    setErrors(newErrors);
    return Object.keys(newErrors)?.length === 0;
  };

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e?.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));

    // Clear error when user starts typing
    if (errors?.[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
  };

  const handleSubmit = async (e) => {
    e?.preventDefault();
    
    if (!validateForm()) return;

    setIsLoading(true);
    try {
      const response = await fetch('/api/usuarios/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          email: formData.email,
          password: formData.password
        })
      });
      const data = await response.json();
      console.log('Login response status:', response.status);
      console.log('Login response body:', data);
      if (response.ok && data?.data?.token && data?.data?.usuario?.rol) {
        // Guardar token y expiración (24h)
  localStorage.setItem('authToken', data.data.token);
        localStorage.setItem('tokenExpiresAt', String(Date.now() + 24 * 60 * 60 * 1000));
        localStorage.setItem('userRole', data.data.usuario.rol);
        localStorage.setItem('userEmail', data.data.usuario.email);
        if (formData?.rememberMe) {
          localStorage.setItem('rememberMe', 'true');
        }
        // Mostrar el valor exacto del rol recibido
        console.log('Rol recibido:', data.data.usuario.rol);
        
        // Obtener la ruta por defecto según el rol del usuario
        const role = String(data.data.usuario.rol).toLowerCase();
        const redirect = getDefaultPath(role);
        
        console.log('Redirigiendo a:', redirect);
        navigate(redirect);
        window.location.reload();
      } else {
        setErrors({
          general: data?.message || 'Credenciales incorrectas. Por favor, verifique su correo y contraseña.'
        });
      }
    } catch (error) {
      setErrors({
        general: 'Error de conexión. Por favor, intente nuevamente.'
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="w-full max-w-md mx-auto">
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Email Input */}
        <Input
          label="Correo Electrónico"
          type="email"
          name="email"
          placeholder="usuario@aireflowpro.com"
          value={formData?.email}
          onChange={handleInputChange}
          error={errors?.email}
          required
          disabled={isLoading}
        />

        {/* Password Input */}
        <Input
          label="Contraseña"
          type="password"
          name="password"
          placeholder="Ingrese su contraseña"
          value={formData?.password}
          onChange={handleInputChange}
          error={errors?.password}
          required
          disabled={isLoading}
          autoComplete="current-password"
        />

        {/* Remember Me Checkbox */}
        <div className="flex items-center justify-between">
          <Checkbox
            label="Recordarme"
            name="rememberMe"
            checked={formData?.rememberMe}
            onChange={handleInputChange}
            disabled={isLoading}
          />
          
          <button
            type="button"
            className="text-sm text-primary hover:text-primary/80 transition-smooth"
            disabled={isLoading}
          >
            ¿Olvidó su contraseña?
          </button>
        </div>

        {/* General Error Message */}
        {errors?.general && (
          <div className="p-3 bg-error/10 border border-error/20 rounded-lg">
            <div className="flex items-center space-x-2">
              <Icon name="AlertCircle" size={16} className="text-error flex-shrink-0" />
              <p className="text-sm text-error">{errors?.general}</p>
            </div>
          </div>
        )}

        {/* Submit Button */}
        <Button
          type="submit"
          variant="default"
          fullWidth
          loading={isLoading}
          disabled={isLoading}
          iconName="LogIn"
          iconPosition="right"
        >
          {isLoading ? 'Iniciando Sesión...' : 'Iniciar Sesión'}
        </Button>
      </form>
    </div>
  );
};

export default LoginForm;