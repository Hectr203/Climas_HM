import React, { useState, useEffect, useRef } from 'react';
import Icon from '../../../components/AppIcon';
import Button from '../../../components/ui/Button';
import Input from '../../../components/ui/Input';
import useConsumoMateriales from '../../../hooks/useConsumoMateriales';
import { useNotifications } from '../../../context/NotificationContext';
import jsPDF from 'jspdf';
import 'jspdf-autotable';

const ConsumptionHistory = () => {
  const { showError, showSuccess } = useNotifications();
  const { historico, getHistoricoConsumo, loading } = useConsumoMateriales();
  
  const [fechaInicio, setFechaInicio] = useState(() => {
    const fecha = new Date();
    fecha.setDate(fecha.getDate() - 7); // Últimos 7 días por defecto
    return fecha.toISOString().split('T')[0];
  });
  
  const [fechaFin, setFechaFin] = useState(() => {
    return new Date().toISOString().split('T')[0];
  });

  const [mostrarFiltros, setMostrarFiltros] = useState(true);
  const [mostrarMenuExportar, setMostrarMenuExportar] = useState(false);
  const [exportando, setExportando] = useState(false);
  
  const menuExportarRef = useRef(null);

  // Cerrar menú al hacer clic fuera
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuExportarRef.current && !menuExportarRef.current.contains(event.target)) {
        setMostrarMenuExportar(false);
      }
    };

    if (mostrarMenuExportar) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [mostrarMenuExportar]);

  const handleBuscar = async () => {
    if (!fechaInicio || !fechaFin) {
      showError('Debe seleccionar fecha de inicio y fin');
      return;
    }

    if (new Date(fechaInicio) > new Date(fechaFin)) {
      showError('La fecha de inicio debe ser anterior a la fecha de fin');
      return;
    }

    try {
      await getHistoricoConsumo(fechaInicio, fechaFin);
    } catch (error) {
      console.error('Error al obtener histórico:', error);
      showError('Error al obtener el histórico de consumo');
    }
  };

  // Funciones de exportación
  const exportarAPDF = (datos, inicio, fin) => {
    const doc = new jsPDF({
      orientation: 'landscape',
      unit: 'pt',
      format: 'A4'
    });

    const pageWidth = doc.internal.pageSize.getWidth();

    // ENCABEZADO
    doc.setFillColor(10, 74, 138);
    doc.rect(0, 0, pageWidth, 40, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(18);
    doc.text('HISTÓRICO DE CONSUMO DE MATERIALES', pageWidth / 2, 25, { align: 'center' });

    // FECHA DE GENERACIÓN
    const fechaActual = new Date().toLocaleDateString('es-MX', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    });
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.text(`Generado el ${fechaActual}`, pageWidth - 120, 25);

    // Calcular estadísticas
    const materialesUnicos = new Set();
    let totalMaterialesConsumidos = 0;

    datos.forEach(registro => {
      if (registro.materiales && Array.isArray(registro.materiales)) {
        registro.materiales.forEach(m => {
          materialesUnicos.add(m.articuloId || m.articuloNombre);
          totalMaterialesConsumidos += parseFloat(m.cantidad) || 0;
        });
      } else {
        materialesUnicos.add(registro.articuloId || registro.articuloNombre);
        totalMaterialesConsumidos += parseFloat(registro.cantidad) || 0;
      }
    });

    // RESUMEN GENERAL
    let startY = 60;
    const gray = '#333333';
    doc.setTextColor(gray);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(13);
    doc.text('Resumen General', pageWidth / 2, startY, { align: 'center' });

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    startY += 20;
    const resumenTexto = `Total de Registros: ${datos.length}   |   Materiales Únicos: ${materialesUnicos.size}   |   Total Consumido: ${totalMaterialesConsumidos.toFixed(2)} unidades`;
    doc.text(resumenTexto, pageWidth / 2, startY, { align: 'center' });

    // Preparar datos para la tabla
    const datosMateriales = [];
    datos.forEach(registro => {
      const fecha = registro.fecha || registro.fechaRegistro?.split('T')[0] || 'Sin fecha';
      
      if (registro.materiales && Array.isArray(registro.materiales)) {
        registro.materiales.forEach(material => {
          // Filtrar nota automática "Consumo desde recepción"
          let notasLimpias = material.notas || '';
          if (notasLimpias.includes('Consumo desde recepción')) {
            notasLimpias = '';
          }
          
          datosMateriales.push([
            new Date(fecha).toLocaleDateString('es-MX'),
            material.articuloNombre || material.nombre || 'Sin nombre',
            material.ordenTrabajo || material.ordenTrabajoId || registro.ordenTrabajo || 'N/A',
            `${material.cantidad} ${material.unidad || 'pcs'}`,
            notasLimpias || '—'
          ]);
        });
      } else {
        // Filtrar nota automática "Consumo desde recepción"
        let notasLimpias = registro.notas || '';
        if (notasLimpias.includes('Consumo desde recepción')) {
          notasLimpias = '';
        }
        
        datosMateriales.push([
          new Date(fecha).toLocaleDateString('es-MX'),
          registro.articuloNombre || registro.nombre || 'Sin nombre',
          registro.ordenTrabajo || registro.ordenTrabajoId || 'N/A',
          `${registro.cantidad} ${registro.unidad || 'pcs'}`,
          notasLimpias || '—'
        ]);
      }
    });

    // TABLA
    const tableColumn = ['Fecha', 'Material', 'Orden de Trabajo', 'Cantidad', 'Notas'];

    doc.autoTable({
      startY: startY + 25,
      head: [tableColumn],
      body: datosMateriales,
      theme: 'grid',
      styles: { fontSize: 9, cellPadding: 5 },
      headStyles: {
        fillColor: [10, 74, 138],
        textColor: 255,
        halign: 'center',
        fontStyle: 'bold'
      },
      bodyStyles: { textColor: [50, 50, 50] },
      alternateRowStyles: { fillColor: [245, 245, 245] },
      margin: { left: 30, right: 30 }
    });

    // GUARDAR PDF
    doc.save(`HISTORICO_CONSUMO_${inicio}_${fin}.pdf`);
  };

  const handleExportarRangoPersonalizado = () => {
    if (!historico || historico.length === 0) {
      showError('No hay datos para exportar');
      return;
    }

    try {
      setExportando(true);
      exportarAPDF(historico, fechaInicio, fechaFin);
      showSuccess('PDF generado exitosamente');
      setMostrarMenuExportar(false);
    } catch (error) {
      console.error('Error al exportar PDF:', error);
      showError('Error al generar el PDF');
    } finally {
      setExportando(false);
    }
  };

  const handleExportarSemana = async () => {
    try {
      setExportando(true);
      const hoy = new Date();
      const haceSemana = new Date(hoy);
      haceSemana.setDate(hoy.getDate() - 7);
      
      const inicio = haceSemana.toISOString().split('T')[0];
      const fin = hoy.toISOString().split('T')[0];
      
      const datos = await getHistoricoConsumo(inicio, fin);
      if (datos && datos.length > 0) {
        exportarAPDF(datos, inicio, fin);
        showSuccess('PDF de la última semana generado exitosamente');
      } else {
        showError('No hay datos de consumo en la última semana');
      }
      setMostrarMenuExportar(false);
    } catch (error) {
      console.error('Error al exportar semana:', error);
      showError('Error al generar el PDF de la semana');
    } finally {
      setExportando(false);
    }
  };

  const handleExportarMes = async () => {
    try {
      setExportando(true);
      const hoy = new Date();
      const primerDia = new Date(hoy.getFullYear(), hoy.getMonth(), 1);
      
      const inicio = primerDia.toISOString().split('T')[0];
      const fin = hoy.toISOString().split('T')[0];
      
      const datos = await getHistoricoConsumo(inicio, fin);
      if (datos && datos.length > 0) {
        exportarAPDF(datos, inicio, fin);
        showSuccess('PDF del mes generado exitosamente');
      } else {
        showError('No hay datos de consumo en este mes');
      }
      setMostrarMenuExportar(false);
    } catch (error) {
      console.error('Error al exportar mes:', error);
      showError('Error al generar el PDF del mes');
    } finally {
      setExportando(false);
    }
  };

  const formatearFecha = (fechaStr) => {
    if (!fechaStr) return 'Sin fecha';
    const fecha = new Date(fechaStr);
    return fecha.toLocaleDateString('es-MX', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const formatearFechaHora = (fechaStr) => {
    if (!fechaStr) return 'Sin fecha';
    const fecha = new Date(fechaStr);
    return fecha.toLocaleDateString('es-MX', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Agrupar histórico por fecha
  const historicoAgrupado = React.useMemo(() => {
    if (!Array.isArray(historico)) return [];

    const grupos = {};
    historico.forEach(registro => {
      const fecha = registro.fecha || registro.fechaRegistro?.split('T')[0] || 'sin-fecha';
      if (!grupos[fecha]) {
        grupos[fecha] = {
          fecha,
          registros: []
        };
      }
      grupos[fecha].registros.push(registro);
    });

    // Ordenar por fecha descendente
    return Object.values(grupos).sort((a, b) => 
      new Date(b.fecha) - new Date(a.fecha)
    );
  }, [historico]);

  // Calcular estadísticas
  const estadisticas = React.useMemo(() => {
    if (!Array.isArray(historico)) {
      return {
        totalRegistros: 0,
        totalMateriales: 0,
        diasConConsumo: 0,
        materialesUnicos: new Set()
      };
    }

    const materialesUnicos = new Set();
    let totalMateriales = 0;

    historico.forEach(registro => {
      if (registro.materiales && Array.isArray(registro.materiales)) {
        registro.materiales.forEach(m => {
          materialesUnicos.add(m.articuloId || m.articuloNombre);
          totalMateriales += parseFloat(m.cantidad) || 0;
        });
      } else {
        // Si viene como objeto individual
        materialesUnicos.add(registro.articuloId || registro.articuloNombre);
        totalMateriales += parseFloat(registro.cantidad) || 0;
      }
    });

    return {
      totalRegistros: historico.length,
      totalMateriales,
      diasConConsumo: historicoAgrupado.length,
      materialesUnicos: materialesUnicos.size
    };
  }, [historico, historicoAgrupado]);

  return (
    <div className="bg-card rounded-lg border border-border p-4 md:p-6 card-shadow">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-4 md:mb-6 gap-4">
        <div className="flex items-center space-x-3 min-w-0">
          <div className="w-8 h-8 bg-purple-500 rounded-lg flex items-center justify-center flex-shrink-0">
            <Icon name="History" size={20} color="white" />
          </div>
          <div className="min-w-0">
            <h3 className="text-base md:text-lg font-semibold text-foreground">Histórico de Consumo</h3>
            <p className="text-xs md:text-sm text-muted-foreground">
              Consulta el consumo de materiales por rango de fechas
            </p>
          </div>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setMostrarFiltros(!mostrarFiltros)}
          iconName={mostrarFiltros ? "ChevronUp" : "ChevronDown"}
          className="text-xs md:text-sm"
        >
          {mostrarFiltros ? 'Ocultar' : 'Mostrar'} Filtros
        </Button>
      </div>

      {/* Filtros */}
      {mostrarFiltros && (
        <div className="bg-muted/50 rounded-lg p-3 md:p-4 mb-4 md:mb-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2 md:gap-4">
            <div>
              <label className="text-xs md:text-sm font-medium mb-2 block text-foreground">
                Fecha Inicio
              </label>
              <Input
                type="date"
                value={fechaInicio}
                onChange={(e) => setFechaInicio(e.target.value)}
                className="w-full text-sm"
              />
            </div>
            <div>
              <label className="text-xs md:text-sm font-medium mb-2 block text-foreground">
                Fecha Fin
              </label>
              <Input
                type="date"
                value={fechaFin}
                onChange={(e) => setFechaFin(e.target.value)}
                className="w-full text-sm"
              />
            </div>
            <div className="flex items-end gap-2">
              <Button
                onClick={handleBuscar}
                iconName="Search"
                iconPosition="left"
                disabled={loading}
                className="flex-1 text-xs md:text-sm"
              >
                {loading ? 'Buscando...' : 'Buscar'}
              </Button>
              
              {/* Botón de Exportar con menú */}
              <div className="relative" ref={menuExportarRef}>
                <Button
                  onClick={() => setMostrarMenuExportar(!mostrarMenuExportar)}
                  iconName="FileDown"
                  iconPosition="left"
                  disabled={loading || exportando || !historico || historico.length === 0}
                  variant="outline"
                  className="border-blue-600 text-blue-600 hover:bg-blue-50 hover:text-blue-700 text-xs md:text-sm"
                >
                  {exportando ? 'Exportando...' : 'Exportar'}
                </Button>
                
                {/* Menú desplegable de opciones */}
                {mostrarMenuExportar && (
                  <div className="absolute right-0 mt-2 w-56 bg-card border border-border rounded-lg shadow-lg z-50">
                    <div className="py-1">
                      <button
                        onClick={handleExportarRangoPersonalizado}
                        disabled={exportando}
                        className="w-full text-left px-4 py-2 text-sm hover:bg-accent flex items-center gap-2 text-foreground"
                      >
                        <Icon name="Calendar" className="h-4 w-4" />
                        <span>Rango personalizado</span>
                      </button>
                      <button
                        onClick={handleExportarSemana}
                        disabled={exportando}
                        className="w-full text-left px-4 py-2 text-sm hover:bg-accent flex items-center gap-2 text-foreground"
                      >
                        <Icon name="TrendingUp" className="h-4 w-4" />
                        <span>Última semana</span>
                      </button>
                      <button
                        onClick={handleExportarMes}
                        disabled={exportando}
                        className="w-full text-left px-4 py-2 text-sm hover:bg-accent flex items-center gap-2 text-foreground"
                      >
                        <Icon name="Package" className="h-4 w-4" />
                        <span>Este mes</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Estadísticas */}
      {estadisticas.totalRegistros > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 md:gap-4 mb-4 md:mb-6">
          <div className="bg-primary/10 rounded-lg p-2 md:p-3 border border-primary/20">
            <div className="text-xs md:text-sm text-muted-foreground">Total Registros</div>
            <div className="text-lg md:text-2xl font-bold text-primary">{estadisticas.totalRegistros}</div>
          </div>
          <div className="bg-blue-500/10 rounded-lg p-2 md:p-3 border border-blue-500/20">
            <div className="text-xs md:text-sm text-muted-foreground">Días con Consumo</div>
            <div className="text-lg md:text-2xl font-bold text-blue-600">{estadisticas.diasConConsumo}</div>
          </div>
          <div className="bg-green-500/10 rounded-lg p-2 md:p-3 border border-green-500/20">
            <div className="text-xs md:text-sm text-muted-foreground">Materiales Únicos</div>
            <div className="text-lg md:text-2xl font-bold text-green-600">{estadisticas.materialesUnicos}</div>
          </div>
          <div className="bg-orange-500/10 rounded-lg p-2 md:p-3 border border-orange-500/20">
            <div className="text-xs md:text-sm text-muted-foreground">Total Consumido</div>
            <div className="text-lg md:text-2xl font-bold text-orange-600">
              {estadisticas.totalMateriales.toFixed(2)}
            </div>
          </div>
        </div>
      )}

      {/* Histórico agrupado por fecha */}
      {loading && historico.length === 0 ? (
        <div className="flex items-center justify-center py-6 md:py-8">
          <div className="text-muted-foreground text-sm md:text-base">Cargando histórico...</div>
        </div>
      ) : historicoAgrupado.length === 0 ? (
        <div className="text-center py-6 md:py-8 text-muted-foreground">
          <Icon name="FileX" size={40} className="mx-auto mb-2 opacity-50" />
          <p className="text-sm md:text-base">No hay registros de consumo en el rango de fechas seleccionado</p>
          <p className="text-xs md:text-sm mt-2">Selecciona un rango de fechas y haz clic en "Buscar"</p>
        </div>
      ) : (
        <div className="space-y-3 md:space-y-4">
          {historicoAgrupado.map((grupo, grupoIndex) => (
            <div
              key={grupo.fecha}
              className="border border-border rounded-lg p-3 md:p-4 bg-muted/30"
            >
              <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-3 md:mb-4 pb-2 md:pb-3 border-b border-border gap-2">
                <div className="flex items-center space-x-2 min-w-0">
                  <Icon name="Calendar" size={18} className="text-primary flex-shrink-0" />
                  <div className="min-w-0">
                    <div className="font-semibold text-sm md:text-base text-foreground">
                      {formatearFecha(grupo.fecha)}
                    </div>
                    <div className="text-xs md:text-sm text-muted-foreground">
                      {grupo.registros.length} registro(s)
                    </div>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                {grupo.registros.map((registro, regIndex) => (
                  <div
                    key={registro.id || regIndex}
                    className="bg-card rounded border border-border/50 p-2 md:p-3"
                  >
                    <div className="flex items-center justify-between mb-2 gap-1">
                      <div className="text-xs md:text-sm text-muted-foreground truncate">
                        Registro #{regIndex + 1} • {formatearFechaHora(registro.fechaRegistro || registro.createdAt)}
                      </div>
                    </div>

                    {registro.materiales && Array.isArray(registro.materiales) ? (
                      <div className="space-y-1">
                        {registro.materiales.map((material, matIndex) => (
                          <div
                            key={matIndex}
                            className="flex flex-col md:flex-row md:items-center md:justify-between p-1 md:p-2 bg-muted/30 rounded gap-1"
                          >
                            <div className="flex-1 min-w-0">
                              <div className="font-medium text-xs md:text-sm text-foreground truncate">
                                {material.nombre || material.articuloNombre || 'Material sin nombre'}
                              </div>
                              <div className="text-xs text-muted-foreground truncate">
                                {material.codigo || material.articuloCodigo || 'Sin código'} • 
                                {material.cantidad} {material.unidad || 'pcs'}
                                {material.notas && ` • ${material.notas}`}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="flex flex-col md:flex-row md:items-center md:justify-between p-1 md:p-2 bg-muted/30 rounded gap-1">
                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-xs md:text-sm text-foreground truncate">
                            {registro.nombre || registro.articuloNombre || 'Material sin nombre'}
                          </div>
                          <div className="text-xs text-muted-foreground truncate">
                            {registro.codigo || registro.articuloCodigo || 'Sin código'} • 
                            {registro.cantidad} {registro.unidad || 'pcs'}
                            {registro.notas && ` • ${registro.notas}`}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default ConsumptionHistory;
