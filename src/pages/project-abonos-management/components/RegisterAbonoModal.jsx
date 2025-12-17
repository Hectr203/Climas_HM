import React, { useEffect, useMemo, useState } from 'react';
import Icon from '../../../components/AppIcon';
import Button from '../../../components/ui/Button';
import useAbono from '../../../hooks/useAbono';
import useProyecto from '../../../hooks/useProyect';
import useAbonoDocumentos from '../../../hooks/useAbonoDocumentos';
import ComprobanteUploader from './ComprobanteUploader';

// Formatear monto en moneda MXN
const formatearMoneda = (cantidad) => {
  if (cantidad == null || isNaN(cantidad)) return '—';
  return new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(Number(cantidad) || 0);
};

// Limitar un valor dentro de un rango
const limitarRango = (valor, minimo, maximo) => Math.min(Math.max(valor, minimo), maximo);

// Convierte fecha a formato dd/mm/yyyy para mostrar en UI
const formatearFechaParaApi = (fechaLocalStr) => {
  if (!fechaLocalStr) return '';
  const d = new Date(fechaLocalStr);
  const rellenar = (n) => String(n).padStart(2, '0');
  return `${rellenar(d.getDate())}/${rellenar(d.getMonth() + 1)}/${d.getFullYear()}`;
};

// Convierte fecha del input (YYYY-MM-DD) a formato ISO UTC
const formatearFechaISOUTC = (fechaLocalStr) => {
  if (!fechaLocalStr) return '';
  // La fecha viene en formato YYYY-MM-DD del input type="date"
  // Crear un objeto Date en UTC a medianoche
  const fecha = new Date(fechaLocalStr + 'T00:00:00.000Z');
  // Devolver en formato ISO UTC
  return fecha.toISOString();
};

// Formatea un número con separadores de miles
const formatearNumeroConSeparadores = (valor) => {
  if (!valor && valor !== 0) return '';
  // Remover cualquier formato previo y obtener solo números y punto decimal
  const numeroLimpio = String(valor).replace(/[^\d.]/g, '');
  if (!numeroLimpio) return '';

  // Separar parte entera y decimal
  const partes = numeroLimpio.split('.');
  const parteEntera = partes[0] || '0';
  const parteDecimal = partes[1] ? `.${partes[1]}` : '';

  // Formatear parte entera con separadores de miles
  const formateado = parteEntera.replace(/\B(?=(\d{3})+(?!\d))/g, ',');

  return formateado + parteDecimal;
};

// Limpia el formato y devuelve el valor numérico
const limpiarNumeroFormateado = (valor) => {
  if (!valor) return '';
  // Remover comas y espacios, mantener solo números y punto decimal
  return String(valor).replace(/[^\d.]/g, '');
};

const ModalRegistroAbono = ({ isOpen, onClose, project, currentPaid = 0, onSave }) => {
  const presupuestoProyecto = Number(project?.totalPresupuesto) || 0;
  const saldoInicial = Math.max(presupuestoProyecto - Number(currentPaid || 0), 0);

  // Hook de abonos
  const { createAbono, getAbonosByProyecto, loading } = useAbono();

  // Hook de documentos
  const { subirDocumento } = useAbonoDocumentos();

  // Hook para obtener información del proyecto
  const { getProyectoById } = useProyecto();

  // Campos requeridos
  const [idProyecto, setIdProyecto] = useState('');
  const [fechaLocal, setFechaLocal] = useState('');
  const [montoSinIva, setMontoSinIva] = useState('');
  const [montoSinIvaFormateado, setMontoSinIvaFormateado] = useState('');
  const [montoConIva, setMontoConIva] = useState('');
  const [montoConIvaFormateado, setMontoConIvaFormateado] = useState('');
  const [porcentajeIva, setPorcentajeIva] = useState(16); // porcentaje de IVA editable
  const [metodoPago, setMetodoPago] = useState('Transferencia');
  const [descripcion, setDescripcion] = useState('');
  const [descripcionMetodo, setDescripcionMetodo] = useState('');
  const [referenciaPago, setReferenciaPago] = useState('');
  const [notas, setNotas] = useState('');

  // Estados para comprobante
  const [subirComprobante, setSubirComprobante] = useState(false);
  const [comprobanteFile, setComprobanteFile] = useState(null);
  const [comprobanteDescripcion, setComprobanteDescripcion] = useState('');
  const [comprobanteWarning, setComprobanteWarning] = useState('');

  // Información del proyecto obtenida de la API
  const [infoProyecto, setInfoProyecto] = useState({ id: '', nombre: '', totalPresupuesto: 0, clienteId: '' });
  const [totalAbonado, setTotalAbonado] = useState(0);

  // Variables auxiliares
  const [saldo, setSaldo] = useState(saldoInicial);
  const [error, setError] = useState('');

  useEffect(() => {
    if (isOpen) {
      const id = project?.id || project?._id || project?.idProyecto || '';

      // Establecer el ID del proyecto
      setIdProyecto(id);

      // Obtener información del proyecto de la API si tenemos un ID
      if (id) {
        getProyectoById(id)
          .then((respuesta) => {
            const proyectoData = respuesta?.data || respuesta;
            if (proyectoData) {
              const presupuestoTotal = proyectoData.totalPresupuesto || 0;
              const totalAbonadoData = proyectoData.resumenFinanciero?.totalAbonado || 0;

              setInfoProyecto({
                id: proyectoData.id || proyectoData._id || id,
                nombre: proyectoData.nombre || proyectoData.name || 'Sin nombre',
                totalPresupuesto: Number(presupuestoTotal),
                clienteId: proyectoData.cliente?.id || proyectoData.clienteId || proyectoData.cliente_id || ''
              });

              // Intentar usar el resumen del backend si existe
              setTotalAbonado(totalAbonadoData);

              // Actualizar saldo basado en presupuesto obtenido de la API
              const nuevoSaldo = Math.max(presupuestoTotal - totalAbonadoData, 0);
              setSaldo(nuevoSaldo);
            } else {
              // Fallback si no se obtienen datos
              setInfoProyecto({
                id,
                nombre: project?.name || project?.nombreProyecto || 'Sin nombre',
                totalPresupuesto: presupuestoProyecto,
                clienteId: ''
              });
            }
          })
          .catch((err) => {
            console.warn('Error al obtener proyecto:', err);
            // Usar datos del prop como fallback
            setInfoProyecto({
              id,
              nombre: project?.name || project?.nombreProyecto || 'Sin nombre',
              totalPresupuesto: presupuestoProyecto,
              clienteId: ''
            });
          });

        // Además, cargar abonos del proyecto y sumar con IVA para "Total pagado"
        (async () => {
          try {
            const result = await getAbonosByProyecto(id);
            const items = result?.items || result || [];
            const totalConIva = Array.isArray(items)
              ? items.reduce((sum, a) => {
                const montoCon = Number(
                  a?.montoAbonoConIva ?? a?.montoAbono ?? a?.monto ?? a?.monto_abono ?? 0
                );
                return sum + (isNaN(montoCon) ? 0 : montoCon);
              }, 0)
              : 0;
            setTotalAbonado(totalConIva);
            const importeTotal = Number((infoProyecto?.totalPresupuesto ?? presupuestoProyecto) || 0);
            setSaldo(Math.max(importeTotal - totalConIva, 0));
          } catch (e) {
            console.warn('No se pudo cargar abonos para calcular Total pagado:', e);
          }
        })();
      } else {
        setInfoProyecto({ id: '', nombre: 'Sin nombre', totalPresupuesto: 0, clienteId: '' });
      }

      // Fecha actual por defecto
      const hoy = new Date();
      const yyyy = hoy.getFullYear();
      const mm = String(hoy.getMonth() + 1).padStart(2, '0');
      const dd = String(hoy.getDate()).padStart(2, '0');
      setFechaLocal(`${yyyy}-${mm}-${dd}`);

      setMontoSinIva('0');
      setMontoSinIvaFormateado('0');
      setMontoConIva('0');
      setMontoConIvaFormateado('0');
      setMetodoPago('Transferencia');
      setPorcentajeIva(16);
      setDescripcion('');
      setDescripcionMetodo('');
      setReferenciaPago('');
      setNotas('');
      setSubirComprobante(false);
      setComprobanteFile(null);
      setComprobanteDescripcion('');
      setComprobanteWarning('');

      setSaldo(Math.max(presupuestoProyecto - Number(currentPaid || 0), 0));
      setError('');
    }
  }, [isOpen, project, presupuestoProyecto, currentPaid, getProyectoById, getAbonosByProyecto]);

  // Vista previa del total pagado
  const totalPagadoPrevio = useMemo(() => {
    const m = Number(montoConIva) || 0;
    return Number(totalAbonado || 0) + (m > 0 ? m : 0);
  }, [montoConIva, totalAbonado]);

  // Progreso del pago
  const progreso = useMemo(() => {
    if (!(infoProyecto?.totalPresupuesto > 0)) return 0;
    const p = (Number(totalPagadoPrevio) / infoProyecto.totalPresupuesto) * 100;
    return Math.round(limitarRango(p, 0, 100));
  }, [totalPagadoPrevio, infoProyecto?.totalPresupuesto]);

  const manejarCambioMonto = (valor, tipo) => {
    // Limpiar el valor ingresado (remover comas y caracteres no numéricos excepto punto decimal)
    const valorLimpio = limpiarNumeroFormateado(valor);

    // Si el campo está vacío, usar "0"
    let valorFinal = valorLimpio === '' ? '0' : valorLimpio;

    // Si el valor actual es "0" y el usuario está escribiendo algo nuevo
    const valorActual = tipo === 'sinIva' ? montoSinIva : montoConIva;
    if (valorActual === '0' && valorLimpio !== '' && valorLimpio !== '0') {
      // Si el usuario escribe un punto decimal, permitir "0."
      if (valorLimpio === '.' || valorLimpio === '0.') {
        valorFinal = '0.';
      }
      // Si el usuario escribe un dígito, reemplazar el "0" con ese dígito
      // Ejemplo: "0" + "1" = "1", "0" + "12" = "12"
      else if (/^\d+\.?\d*$/.test(valorLimpio)) {
        // Si empieza con "0" seguido de dígitos (no decimal), quitar el "0" inicial
        // Ejemplo: "05" -> "5", "012" -> "12"
        if (valorLimpio.match(/^0+[1-9]/)) {
          valorFinal = valorLimpio.replace(/^0+/, '');
        } else {
          valorFinal = valorLimpio;
        }
      }
    }

    // Permitir solo un punto decimal: si hay múltiples, mantener solo el primero
    const partes = valorFinal.split('.');
    if (partes.length > 2) {
      valorFinal = partes[0] + '.' + partes.slice(1).join('');
    }

    // Actualizar el valor numérico limpio para cálculos
    if (tipo === 'sinIva') {
      setMontoSinIva(valorFinal);
      setMontoSinIvaFormateado(formatearNumeroConSeparadores(valorFinal));
      // Calcular y rellenar con IVA automáticamente
      const numSinIva = Number(valorFinal);
      const rate = Number(porcentajeIva);
      if (!isNaN(numSinIva) && rate >= 0) {
        const multiplicador = 1 + (rate / 100);
        const calculadoConIva = Math.round((numSinIva * multiplicador) * 100) / 100;
        setMontoConIva(String(calculadoConIva));
        setMontoConIvaFormateado(formatearNumeroConSeparadores(calculadoConIva));
      }
    } else {
      setMontoConIva(valorFinal);
      setMontoConIvaFormateado(formatearNumeroConSeparadores(valorFinal));
      // Sincronizar sin IVA si está vacío o cero
      const numConIva = Number(valorFinal);
      const rate = Number(porcentajeIva);
      if (!isNaN(numConIva) && rate >= 0) {
        const divisor = 1 + (rate / 100);
        const calculadoSinIva = divisor > 0 ? Math.round((numConIva / divisor) * 100) / 100 : numConIva;
        if (!(Number(montoSinIva) > 0)) {
          setMontoSinIva(String(calculadoSinIva));
          setMontoSinIvaFormateado(formatearNumeroConSeparadores(calculadoSinIva));
        }
      }
    }

    // Calcular saldo si el valor es numérico válido
    const num = Number(valorFinal);
    if (!isNaN(num)) {
      const totalPagadoAcumulado = Number(totalAbonado || 0) + Math.max(Number(montoConIva || 0), 0);
      const importeTotal = Number(infoProyecto.totalPresupuesto || 0);
      const nuevoSaldo = Math.max(importeTotal - totalPagadoAcumulado, 0);
      setSaldo(nuevoSaldo);

      // Limpiar error si el monto es válido
      if (totalPagadoAcumulado <= importeTotal) {
        setError('');
      }
    }
  };

  const manejarEnvio = async (e) => {
    e.preventDefault();
    setError('');
    const IVA_RATE = Number(porcentajeIva) / 100;
    const montoConIvaNum = Number(montoConIva);
    let montoSinIvaNum = Number(montoSinIva);
    // Derivar sin IVA si viene vacío/0 pero con IVA sí viene
    if (!(montoSinIvaNum > 0) && (montoConIvaNum > 0)) {
      const calculado = montoConIvaNum / (1 + IVA_RATE);
      montoSinIvaNum = Math.round(calculado * 100) / 100;
      setMontoSinIva(String(montoSinIvaNum));
      setMontoSinIvaFormateado(formatearNumeroConSeparadores(montoSinIvaNum));
    }

    if (!idProyecto?.trim()) {
      setError('El ID del proyecto es obligatorio.');
      return;
    }
    if (!fechaLocal) {
      setError('La fecha del abono es obligatoria.');
      return;
    }
    if (!(montoConIvaNum > 0)) {
      setError('El monto de abono con IVA debe ser mayor a 0.');
      return;
    }
    if (!(montoSinIvaNum > 0)) {
      setError('El monto de abono sin IVA debe ser mayor a 0.');
      return;
    }
    if (!descripcion?.trim()) {
      setError('La descripción es obligatoria.');
      return;
    }
    if (metodoPago === 'Otro' && !descripcionMetodo?.trim()) {
      setError('La descripción del método de pago es obligatoria cuando se selecciona "Otro".');
      return;
    }
    if (['Transferencia', 'Tarjeta', 'Cheque'].includes(metodoPago) && !referenciaPago?.trim()) {
      setError('La referencia de pago es obligatoria para este método de pago.');
      return;
    }
    if (!['Efectivo', 'Transferencia', 'Tarjeta', 'Cheque', 'Otro'].includes(metodoPago)) {
      setError('Método de pago no válido.');
      return;
    }
    // Validar que el total pagado acumulado no exceda el importe total del proyecto
    const totalPagadoAcumulado = Number(totalAbonado || 0) + montoConIvaNum;
    const importeTotal = Number(infoProyecto.totalPresupuesto || 0);

    if (totalPagadoAcumulado > importeTotal) {
      const excedente = totalPagadoAcumulado - importeTotal;
      setError(
        `No se puede registrar el abono. El total pagado acumulado (${formatearMoneda(totalPagadoAcumulado)}) excede el importe total del proyecto (${formatearMoneda(importeTotal)}). Excedente: ${formatearMoneda(excedente)}.`
      );
      return;
    }

    const datos = {
      idProyecto: idProyecto.trim(),
      montoAbonoSinIva: Number(montoSinIvaNum),
      montoAbonoConIva: Number(montoConIvaNum),
      fecha: formatearFechaISOUTC(fechaLocal),
      metodoPago,
      descripcion: descripcion.trim(),
      descripcionMetodo: metodoPago === 'Otro' ? descripcionMetodo.trim() : undefined,
      referenciaPago: ['Transferencia', 'Tarjeta', 'Cheque'].includes(metodoPago) ? referenciaPago.trim() : undefined,
      notas: notas?.trim() || undefined
    };

    try {
      const respuesta = await createAbono(datos);
      const creado = respuesta?.data || respuesta;

      if (creado) {
        // Si hay comprobante, intentar subirlo
        if (subirComprobante && comprobanteFile) {
          const abonoId = creado?.id ?? creado?._id;
          if (abonoId) {
            try {
              await subirDocumento({
                idAbono: abonoId,
                file: comprobanteFile,
                descripcion: comprobanteDescripcion
              });
            } catch (errDoc) {
              console.warn('Error al subir comprobante:', errDoc);
              // No bloquear el cierre si falla la subida del comprobante
            }
          }
        }

        onSave?.(creado);
        onClose?.();
      }
    } catch (err) {
      if (err.response?.status === 409) {
        setError('Ya existe un abono con estos datos.');
      } else if (err.response?.status === 400) {
        setError(err.response?.data?.message || 'Datos inválidos. Por favor revise los campos.');
      } else {
        setError('Error al guardar el abono. Por favor intente nuevamente.');
      }
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative bg-card border border-border rounded-lg shadow-xl w-1/3 mx-4 flex flex-col h-5/6">
        {/* Encabezado */}
        <div className="p-4 border-b border-border flex items-center justify-between bg-card sticky top-0 z-10">
          <div className="flex items-center space-x-2">
            <Icon name="CreditCard" size={18} />
            <h3 className="text-lg font-semibold text-foreground">Apartado de Abonos</h3>
          </div>
          <button
            className="text-muted-foreground hover:text-foreground disabled:opacity-50"
            onClick={onClose}
            title="Cerrar"
            disabled={loading}
          >
            <Icon name="X" size={18} />
          </button>
        </div>

        {/* Contenido */}
        <div className="overflow-y-auto flex-1">
          <form onSubmit={manejarEnvio} className="p-4 space-y-6">
            {/* Resumen */}
            <div className="bg-muted/40 rounded p-3 grid grid-cols-1 md:grid-cols-3 gap-2 text-sm">
              <div>
                <span className="text-muted-foreground">Proyecto</span>
                <span className="text-foreground font-medium block">
                  {infoProyecto?.nombre || '—'}
                </span>
              </div>
              <div>
                <span className="text-muted-foreground">Presupuesto Total</span>
                <span className="text-foreground font-medium block">{formatearMoneda(infoProyecto?.totalPresupuesto || presupuestoProyecto)}</span>
              </div>
              <div>
                <span className="text-muted-foreground">Total pagado</span>
                <span className="text-foreground font-medium block">{formatearMoneda(totalAbonado)}</span>
              </div>
            </div>

            {/* Progreso */}
            <div>
              <div className="flex justify-between text-xs text-muted-foreground mb-1">
                <span>Progreso de pago</span>
                <span>{isNaN(progreso) ? 0 : progreso}%</span>
              </div>
              <div className="w-full bg-muted rounded-full h-2">
                <div className="h-2 rounded-full bg-primary" style={{ width: `${isNaN(progreso) ? 0 : progreso}%` }} />
              </div>
            </div>

            {/* Campos principales */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Fecha */}
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">Fecha del abono</label>
                <input
                  type="date"
                  value={fechaLocal}
                  onChange={(e) => setFechaLocal(e.target.value)}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  required
                  disabled={loading}
                />
                <p className="text-[11px] text-muted-foreground mt-1">
                  Formato: {fechaLocal ? formatearFechaParaApi(fechaLocal) : '—'}
                </p>
              </div>

              {/* Monto sin IVA */}
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">Monto de abono sin IVA</label>
                <input
                  type="text"
                  inputMode="decimal"
                  placeholder="0.00"
                  value={montoSinIvaFormateado}
                  onChange={(e) => manejarCambioMonto(e.target.value, 'sinIva')}
                  className={`flex h-10 w-full rounded-md border px-3 py-2 text-sm bg-background ${Number(montoConIva) > 0 && (Number(totalAbonado || 0) + Number(montoConIva || 0)) > Number(infoProyecto.totalPresupuesto || 0)
                    ? 'border-red-500 focus:border-red-500 focus:ring-red-500'
                    : 'border-input'
                    }`}
                  required
                  disabled={loading}
                />
              </div>

              {/* Monto con IVA */}
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">Monto de abono con IVA</label>
                <input
                  type="text"
                  inputMode="decimal"
                  placeholder="0.00"
                  value={montoConIvaFormateado}
                  className={`flex h-10 w-full rounded-md border px-3 py-2 text-sm bg-background ${Number(montoConIva) > 0 && (Number(totalAbonado || 0) + Number(montoConIva || 0)) > Number(infoProyecto.totalPresupuesto || 0)
                    ? 'border-red-500 focus:border-red-500 focus:ring-red-500'
                    : 'border-input'
                    }`}
                  required
                  disabled={true}
                  readOnly
                />
                {Number(montoConIva) > 0 && (Number(totalAbonado || 0) + Number(montoConIva || 0)) > Number(infoProyecto.totalPresupuesto || 0) && (
                  <p className="text-xs text-red-600 mt-1">
                    ⚠️ El monto (con IVA) excede el límite disponible. Saldo disponible: {formatearMoneda(saldo)}
                  </p>
                )}
              </div>

              {/* Porcentaje IVA */}
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">Porcentaje de IVA</label>
                <input
                  type="number"
                  min={0}
                  max={100}
                  step={0.01}
                  value={porcentajeIva}
                  onChange={(e) => {
                    const v = Number(e.target.value);
                    const nuevo = isNaN(v) ? 16 : Math.max(0, Math.min(100, v));
                    setPorcentajeIva(nuevo);
                    // Recalcular con IVA en tiempo real cuando cambie el porcentaje
                    const numSinIva = Number(montoSinIva);
                    if (!isNaN(numSinIva) && numSinIva > 0) {
                      const multiplicador = 1 + (nuevo / 100);
                      const calculadoConIva = Math.round((numSinIva * multiplicador) * 100) / 100;
                      setMontoConIva(String(calculadoConIva));
                      setMontoConIvaFormateado(formatearNumeroConSeparadores(calculadoConIva));
                    }
                  }}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  disabled={loading}
                />
                <p className="text-[11px] text-muted-foreground mt-1">Se usará para calcular el monto sin IVA.</p>
              </div>

              {/* Saldo */}
              <div>
                <label className="block text-sm font-medium text-muted-foreground mb-2">Saldo restante</label>
                <div className="flex h-10 items-center px-3 py-2 text-sm font-medium text-foreground bg-muted/30 rounded-md border border-input/50">
                  {formatearMoneda(saldo)}
                </div>
              </div>

              {/* Método de pago */}
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">Método de pago</label>
                <select
                  value={metodoPago}
                  onChange={(e) => {
                    setMetodoPago(e.target.value);
                    if (e.target.value !== 'Otro') setDescripcionMetodo('');
                    if (!['Transferencia', 'Tarjeta', 'Cheque'].includes(e.target.value)) setReferenciaPago('');
                  }}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  disabled={loading}
                >
                  <option value="Efectivo">Efectivo</option>
                  <option value="Transferencia">Transferencia</option>
                  <option value="Tarjeta">Tarjeta</option>
                  <option value="Cheque">Cheque</option>
                  <option value="Otro">Otro</option>
                </select>
              </div>

              {/* Referencia de pago (si es Transferencia, Tarjeta o Cheque) */}
              {['Transferencia', 'Tarjeta', 'Cheque'].includes(metodoPago) && (
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-foreground mb-2">
                    Referencia de pago <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={referenciaPago}
                    onChange={(e) => setReferenciaPago(e.target.value)}
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    placeholder={
                      metodoPago === 'Transferencia'
                        ? 'Número de transferencia o CLABE'
                        : metodoPago === 'Tarjeta'
                          ? 'Últimos 4 dígitos o número de autorización'
                          : 'Número de cheque'
                    }
                    required
                    disabled={loading}
                  />
                </div>
              )}

              {/* Descripción método (si es Otro) */}
              {metodoPago === 'Otro' && (
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-foreground mb-2">
                    Descripción del método de pago
                  </label>
                  <input
                    type="text"
                    value={descripcionMetodo}
                    onChange={(e) => setDescripcionMetodo(e.target.value)}
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    placeholder="Especifique el método de pago"
                    required
                    disabled={loading}
                  />
                </div>
              )}

              {/* Descripción */}
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-foreground mb-2">Descripción</label>
                <textarea
                  rows={2}
                  value={descripcion}
                  onChange={(e) => setDescripcion(e.target.value)}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  placeholder="Pago inicial del proyecto"
                  disabled={loading}
                />
              </div>

              {/* Notas */}
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-foreground mb-2">Notas</label>
                <textarea
                  rows={2}
                  value={notas}
                  onChange={(e) => setNotas(e.target.value)}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  placeholder="Pago realizado por el cliente"
                  disabled={loading}
                />
              </div>
            </div>

            {/* Comprobante de pago */}
            <div className="md:col-span-2 border-t border-border pt-4">
              <div className="flex items-center gap-2 mb-3">
                <input
                  type="checkbox"
                  id="subirComprobante"
                  checked={subirComprobante}
                  onChange={(e) => setSubirComprobante(e.target.checked)}
                  className="h-4 w-4 rounded border-input"
                  disabled={loading}
                />
                <label htmlFor="subirComprobante" className="text-sm font-medium text-foreground cursor-pointer">
                  Subir comprobante de pago
                </label>
              </div>

              {subirComprobante && (
                <ComprobanteUploader
                  file={comprobanteFile}
                  onFileChange={setComprobanteFile}
                  descripcion={comprobanteDescripcion}
                  onDescripcionChange={setComprobanteDescripcion}
                  disabled={loading}
                  showPreview={true}
                  warningMsg={comprobanteWarning}
                  onWarningChange={setComprobanteWarning}
                />
              )}
            </div>

            {error && <div className="text-sm text-red-600">{error}</div>}

            <div className="flex items-center justify-end gap-2 pt-2">
              <Button variant="outline" onClick={onClose} disabled={loading}>Cancelar</Button>
              <Button type="submit" iconName="Check" iconPosition="left" disabled={loading}>
                {loading ? 'Guardando…' : 'Guardar'}
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default ModalRegistroAbono;
