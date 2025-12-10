import React, { useEffect, useMemo, useState } from 'react';
import Icon from '../../../components/AppIcon';
import Button from '../../../components/ui/Button';
import useAbono from '../../../hooks/useAbono';
import useProyecto from '../../../hooks/useProyect';

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

// Convierte fecha ISO o string a formato compatible con input date
const deFechaALocalInput = (fecha) => {
  if (!fecha) return '';
  let fechaObj;
  if (typeof fecha === 'string') {
    // Si viene en formato ISO
    if (fecha.includes('T')) {
      fechaObj = new Date(fecha);
    } else if (fecha.includes('/')) {
      // Si viene en formato dd/mm/yyyy
      const [dia, mes, año] = fecha.split('/');
      fechaObj = new Date(Number(año), Number(mes) - 1, Number(dia));
    } else {
      fechaObj = new Date(fecha);
    }
  } else {
    fechaObj = fecha;
  }

  if (isNaN(fechaObj.getTime())) return '';
  const rellenar = (n) => String(n).padStart(2, '0');
  return `${fechaObj.getFullYear()}-${rellenar(fechaObj.getMonth() + 1)}-${rellenar(fechaObj.getDate())}`;
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

const EditAbonoModal = ({ isOpen, onClose, abono, project, onSave }) => {
  // Homologar con ViewAbonosModal: usar totalPresupuesto con fallback a budget
  const presupuestoProyecto = Number(project?.totalPresupuesto ?? project?.budget ?? 0);
  // Hook de abonos
  const { editAbono, getAbonosByProyecto, loading } = useAbono();

  // Hook para obtener información del proyecto
  const { getProyectoById } = useProyecto();

  // Campos del formulario
  const [idProyecto, setIdProyecto] = useState('');
  const [fechaLocal, setFechaLocal] = useState('');
  const [montoSinIva, setMontoSinIva] = useState('');
  const [montoSinIvaFmt, setMontoSinIvaFmt] = useState('');
  const [montoConIva, setMontoConIva] = useState('');
  const [montoConIvaFmt, setMontoConIvaFmt] = useState('');
  const [porcentajeIva, setPorcentajeIva] = useState(16);
  const [metodoPago, setMetodoPago] = useState('Transferencia');
  const [descripcion, setDescripcion] = useState('');
  const [descripcionMetodo, setDescripcionMetodo] = useState('');
  const [referenciaPago, setReferenciaPago] = useState('');
  const [notas, setNotas] = useState('');

  // Información del proyecto obtenida de la API
  const [infoProyecto, setInfoProyecto] = useState({ id: '', nombre: '', totalPresupuesto: abono?.totalPresupuesto ?? 0, clienteId: '' });
  const [totalAbonado, setTotalAbonado] = useState(0);
  const [montoOriginalConIva, setMontoOriginalConIva] = useState(0);

  // Variables auxiliares
  const [saldo, setSaldo] = useState(0);
  const [error, setError] = useState('');

  useEffect(() => {
    if (isOpen && abono) {
      try {
        console.log('[EditAbonoModal] Abono recibido:', JSON.stringify(abono, null, 2));
      } catch (e) {
        console.log('[EditAbonoModal] Abono recibido (no serializable):', abono);
      }
      const id = project?.id || project?._id || project?.idProyecto || abono?.idProyecto || '';

      // Establecer el ID del proyecto
      setIdProyecto(id);

      // Cargar datos del abono en el formulario
      const montoAbonoSinIva = Number(abono?.montoAbonoSinIva ?? abono?.montoSinIva ?? 0);
      const montoAbonoConIva = Number(abono?.montoAbonoConIva ?? abono?.montoAbono ?? abono?.monto ?? 0);
      const fechaAbono = abono?.fecha ?? abono?.createdAt ?? '';
      const metodoPagoAbono = abono?.metodoPago ?? 'Transferencia';
      const descripcionAbono = abono?.descripcion ?? '';
      const descripcionMetodoAbono = abono?.descripcionMetodo ?? '';
      const referenciaPagoAbono = abono?.referenciaPago ?? abono?.referencia ?? '';
      const notasAbono = abono?.notas ?? '';

      // Asegurar que el monto siempre tenga un valor (mínimo 0)
      const sinIvaFinal = montoAbonoSinIva > 0 ? montoAbonoSinIva : 0;
      const conIvaFinal = montoAbonoConIva > 0 ? montoAbonoConIva : 0;
      setMontoSinIva(sinIvaFinal.toString());
      setMontoSinIvaFmt(formatearNumeroConSeparadores(sinIvaFinal.toString()));
      setMontoConIva(conIvaFinal.toString());
      setMontoConIvaFmt(formatearNumeroConSeparadores(conIvaFinal.toString()));
      setMontoOriginalConIva(montoAbonoConIva);
      setFechaLocal(deFechaALocalInput(fechaAbono));
      setMetodoPago(metodoPagoAbono);
      setDescripcion(descripcionAbono);
      setDescripcionMetodo(descripcionMetodoAbono);
      setReferenciaPago(referenciaPagoAbono);
      setNotas(notasAbono);

      // Obtener información del proyecto de la API si tenemos un ID
      if (id) {
        getProyectoById(id)
          .then((respuesta) => {
            try {
              // console.log('[EditAbonoModal] Respuesta getProyectoById:', JSON.stringify(respuesta, null, 2));
            } catch (e) {
              // console.log('[EditAbonoModal] Respuesta getProyectoById (no serializable):', respuesta);
            }
            const proyectoData = respuesta?.data || respuesta;
            if (proyectoData) {
              const presupuestoTotal = proyectoData.presupuesto?.total || proyectoData.totalPresupuesto || 0;
              const totalAbonadoData = proyectoData.resumenFinanciero?.totalAbonado || 0;

              setInfoProyecto({
                id: proyectoData.id || proyectoData._id || id,
                nombre: proyectoData.nombre || proyectoData.name || 'Sin nombre',
                totalPresupuesto: Number(project?.budget || presupuestoTotal || 0),
                clienteId: proyectoData.cliente?.id || proyectoData.clienteId || proyectoData.cliente_id || ''
              });

              // Intentar establecer el total abonado desde la API (si está disponible)
              setTotalAbonado(totalAbonadoData);

              // Calcular saldo: presupuesto - (total abonado - monto original + nuevo monto)
              const nuevoSaldo = Math.max(project?.budget - (totalAbonadoData - (montoAbonoConIva + montoAbonoConIva)), 0);
              setSaldo(nuevoSaldo);
            } else {
              // Fallback si no se obtienen datos
              setInfoProyecto({
                id,
                nombre: project?.name || project?.nombreProyecto || 'Sin nombre',
                totalPresupuesto: Number(presupuestoProyecto || 0),
                clienteId: ''
              });
              setSaldo(Math.max(presupuestoProyecto - montoAbonoConIva, 0));
            }
          })
          .catch((err) => {
            console.warn('Error al obtener proyecto:', err);
            // Usar datos del prop como fallback
            setInfoProyecto({
              id,
              nombre: project?.name || project?.nombreProyecto || 'Sin nombre',
              totalPresupuesto: Number(presupuestoProyecto || 0),
              clienteId: ''
            });
            setSaldo(Math.max(presupuestoProyecto - montoAbonoConIva, 0));
          });

        // Además, cargar los abonos del proyecto para calcular el total pagado con IVA
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
            // Recalcular saldo con el total real de abonos
            const importeTotal = Number(infoProyecto.totalPresupuesto || presupuestoProyecto || 0);
            const diferencia = Number(montoConIva || 0) - Number(montoOriginalConIva || 0);
            const totalPagadoAcumulado = Number(totalConIva || 0) + diferencia;
            setSaldo(Math.max(importeTotal - totalPagadoAcumulado, 0));
          } catch (e) {
            console.warn('No se pudo cargar abonos para calcular Total pagado:', e);
          }
        })();
      } else {
        setInfoProyecto({ id: '', nombre: 'Sin nombre', totalPresupuesto: 0, clienteId: '' });
      }

      setError('');
    }
  }, [isOpen, abono, project, presupuestoProyecto, getProyectoById]);

  // Vista previa del total pagado (considerando el cambio de monto)
  const totalPagadoPrevio = useMemo(() => {
    const mCon = Number(montoConIva) || 0;
    const diferencia = mCon - montoOriginalConIva;
    return Number(totalAbonado || 0) + diferencia;
  }, [montoConIva, totalAbonado, montoOriginalConIva]);

  // Progreso del pago
  const progreso = useMemo(() => {
    if (!(infoProyecto?.totalPresupuesto > 0)) return 0;
    const p = (Number(totalPagadoPrevio) / Number(infoProyecto.totalPresupuesto || 0)) * 100;
    return Math.round(limitarRango(p, 0, 100));
  }, [totalPagadoPrevio, infoProyecto?.totalPresupuesto]);

  const manejarCambioMontoSinIva = (valor) => {
    // Limpiar el valor ingresado (remover comas y caracteres no numéricos excepto punto decimal)
    const valorLimpio = limpiarNumeroFormateado(valor);

    // Si el campo está vacío, usar "0"
    let valorFinal = valorLimpio === '' ? '0' : valorLimpio;

    // Si el valor actual es "0" y el usuario está escribiendo algo nuevo
    if (montoSinIva === '0' && valorLimpio !== '' && valorLimpio !== '0') {
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
    setMontoSinIva(valorFinal);
    setMontoSinIvaFmt(formatearNumeroConSeparadores(valorFinal));

    // Calcular con IVA a partir de sin IVA y porcentaje
    const sinNum = Number(valorFinal);
    const rate = Number(porcentajeIva);
    const mult = 1 + (isNaN(rate) ? 0 : rate / 100);
    const conCalc = !isNaN(sinNum) ? Math.round(sinNum * mult * 100) / 100 : 0;
    setMontoConIva(conCalc.toString());
    setMontoConIvaFmt(formatearNumeroConSeparadores(conCalc.toString()));

    // Calcular saldo si el valor es numérico válido
    const num = Number(conCalc);
    if (!isNaN(num)) {
      const diferencia = num - montoOriginalConIva;
      const totalPagadoAcumulado = Number(totalAbonado || 0) + diferencia;
      const importeTotal = Number(infoProyecto.totalPresupuesto || 0);
      const nuevoSaldo = Math.max(importeTotal - totalPagadoAcumulado, 0);
      setSaldo(nuevoSaldo);

      // Limpiar error si el monto es válido
      if (totalPagadoAcumulado <= importeTotal) {
        setError('');
      }
    }
  };

  const manejarCambioPorcentajeIva = (valor) => {
    const vNum = Number(valor);
    const clamped = limitarRango(isNaN(vNum) ? 16 : vNum, 0, 100);
    setPorcentajeIva(clamped);
    // Recalcular con IVA desde sin IVA
    const sinNum = Number(montoSinIva) || 0;
    const mult = 1 + clamped / 100;
    const conCalc = Math.round(sinNum * mult * 100) / 100;
    setMontoConIva(conCalc.toString());
    setMontoConIvaFmt(formatearNumeroConSeparadores(conCalc.toString()));

    // Actualizar saldo/progreso
    const diferencia = conCalc - montoOriginalConIva;
    const totalPagadoAcumulado = Number(totalAbonado || 0) + diferencia;
    const importeTotal = Number(infoProyecto.totalPresupuesto || 0);
    const nuevoSaldo = Math.max(importeTotal - totalPagadoAcumulado, 0);
    setSaldo(nuevoSaldo);
    setError('');
  };

  const manejarCambioMontoConIva = (valor) => {
    const valorLimpio = limpiarNumeroFormateado(valor);
    let valorFinal = valorLimpio === '' ? '0' : valorLimpio;
    const partes = valorFinal.split('.');
    if (partes.length > 2) {
      valorFinal = partes[0] + '.' + partes.slice(1).join('');
    }
    setMontoConIva(valorFinal);
    setMontoConIvaFmt(formatearNumeroConSeparadores(valorFinal));

    // Derivar sin IVA desde con IVA y porcentaje
    const conNum = Number(valorFinal) || 0;
    const rate = Number(porcentajeIva);
    const div = 1 + (isNaN(rate) ? 0 : rate / 100);
    const sinCalc = div ? Math.round((conNum / div) * 100) / 100 : 0;
    setMontoSinIva(sinCalc.toString());
    setMontoSinIvaFmt(formatearNumeroConSeparadores(sinCalc.toString()));

    // Actualizar saldo
    const diferencia = conNum - montoOriginalConIva;
    const totalPagadoAcumulado = Number(totalAbonado || 0) + diferencia;
    const importeTotal = Number(infoProyecto.totalPresupuesto || 0);
    const nuevoSaldo = Math.max(importeTotal - totalPagadoAcumulado, 0);
    setSaldo(nuevoSaldo);
    if (totalPagadoAcumulado <= importeTotal) setError('');
  };

  const manejarEnvio = async (e) => {
    e.preventDefault();
    setError('');
    const montoConNum = Number(montoConIva);
    const montoSinNum = Number(montoSinIva);

    if (!abono?.id && !abono?._id) {
      setError('El ID del abono es obligatorio.');
      return;
    }
    if (!idProyecto?.trim()) {
      setError('El ID del proyecto es obligatorio.');
      return;
    }
    if (!fechaLocal) {
      setError('La fecha del abono es obligatoria.');
      return;
    }
    if (!(montoConNum > 0)) {
      setError('El monto abonado debe ser mayor a 0.');
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
    const importeTotal = Number(infoProyecto.totalPresupuesto || 0);
    if (totalPagadoPrevio > importeTotal) {
      const excedente = totalPagadoPrevio - importeTotal;
      setError(
        `No se puede actualizar el abono. El total pagado acumulado (${formatearMoneda(totalPagadoPrevio)}) excede el importe total del proyecto (${formatearMoneda(importeTotal)}). Excedente: ${formatearMoneda(excedente)}.`
      );
      return;
    }

    const datos = {
      idProyecto: idProyecto.trim(),
      montoAbonoSinIva: Number(isNaN(montoSinNum) ? 0 : montoSinNum),
      montoAbonoConIva: Number(isNaN(montoConNum) ? 0 : montoConNum),
      porcentajeIva: Number(isNaN(Number(porcentajeIva)) ? 0 : Number(porcentajeIva)),
      // En caso de compatibilidad, se puede incluir montoAbono con el con IVA
      // montoAbono: Number(isNaN(montoConNum) ? 0 : montoConNum),
      fecha: formatearFechaISOUTC(fechaLocal),
      metodoPago,
      descripcion: descripcion.trim(),
      descripcionMetodo: metodoPago === 'Otro' ? descripcionMetodo.trim() : undefined,
      referenciaPago: ['Transferencia', 'Tarjeta', 'Cheque'].includes(metodoPago) ? referenciaPago.trim() : undefined,
      notas: notas?.trim() || undefined
    };

    try {
      const abonoId = abono?.id ?? abono?._id;
      const respuesta = await editAbono(abonoId, datos);
      const actualizado = respuesta?.data || respuesta;

      if (actualizado) {
        onSave?.(actualizado);
        onClose?.();
      }
    } catch (err) {
      if (err.response?.status === 409) {
        setError('Ya existe un abono con estos datos.');
      } else if (err.response?.status === 400) {
        setError(err.response?.data?.message || 'Datos inválidos. Por favor revise los campos.');
      } else {
        setError('Error al actualizar el abono. Por favor intente nuevamente.');
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
            <Icon name="Edit" size={18} />
            <h3 className="text-lg font-semibold text-foreground">Editar Abono</h3>
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
                <span className="text-foreground font-medium block">{formatearMoneda(presupuestoProyecto)}</span>
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

            {/* Información del abono (solo lectura) */}
            {(abono?.folio || abono?.referencia) && (
              <div className="bg-blue-50 border border-blue-200 rounded p-3 text-sm">
                <div className="text-blue-800 font-medium mb-1">Información del Abono</div>
                <div className="text-blue-700">
                  <span className="font-mono">{abono?.folio ?? abono?.referencia}</span>
                  {abono?.numeroAbono && <span className="ml-2">N° {abono.numeroAbono}</span>}
                </div>
              </div>
            )}

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

              {/* IVA y montos */}
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">Porcentaje de IVA (%)</label>
                <input
                  type="number"
                  min={0}
                  max={100}
                  step={0.01}
                  value={porcentajeIva}
                  onChange={(e) => manejarCambioPorcentajeIva(e.target.value)}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  disabled={loading}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-2">Monto sin IVA</label>
                <input
                  type="text"
                  inputMode="decimal"
                  placeholder="0.00"
                  value={montoSinIvaFmt}
                  onChange={(e) => manejarCambioMontoSinIva(e.target.value)}
                  className={`flex h-10 w-full rounded-md border px-3 py-2 text-sm bg-background ${Number(montoConIva) > 0 && totalPagadoPrevio > Number(infoProyecto.totalPresupuesto || 0)
                    ? 'border-red-500 focus:border-red-500 focus:ring-red-500'
                    : 'border-input'
                    }`}
                  required
                  disabled={loading}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-2">Monto con IVA</label>
                <input
                  type="text"
                  inputMode="decimal"
                  placeholder="0.00"
                  value={montoConIvaFmt}
                  className={`flex h-10 w-full rounded-md border px-3 py-2 text-sm bg-background ${Number(montoConIva) > 0 && totalPagadoPrevio > Number(infoProyecto.totalPresupuesto || 0)
                    ? 'border-red-500 focus:border-red-500 focus:ring-red-500'
                    : 'border-input'
                    }`}
                  required
                  disabled={true}
                  readOnly
                />
                {Number(montoConIva) > 0 && totalPagadoPrevio > Number(infoProyecto.totalPresupuesto || 0) && (
                  <p className="text-xs text-red-600 mt-1">
                    ⚠️ El monto excede el límite disponible. Saldo disponible: {formatearMoneda(saldo)}
                  </p>
                )}
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

            {error && <div className="text-sm text-red-600">{error}</div>}

            <div className="flex items-center justify-end gap-2 pt-2">
              <Button variant="outline" onClick={onClose} disabled={loading}>Cancelar</Button>
              <Button type="submit" iconName="Check" iconPosition="left" disabled={loading}>
                {loading ? 'Actualizando…' : 'Actualizar'}
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default EditAbonoModal;

