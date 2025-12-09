import React, { useEffect, useState } from 'react';
import Icon from '../../../components/AppIcon';
import Button from '../../../components/ui/Button';
import useAbono from '../../../hooks/useAbono';
import useAbonoDocumentos from '../../../hooks/useAbonoDocumentos';
import EditAbonoModal from './EditAbonoModal';
import { EditDocumentModal } from './ComprobantesModal';
import ComprobanteUploader from './ComprobanteUploader';

// Formatear monto en moneda MXN
const formatearMoneda = (cantidad) => {
  if (cantidad == null || isNaN(cantidad)) return '—';
  return new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(Number(cantidad) || 0);
};

// Formatear fecha
const formatearFecha = (fecha) => {
  if (!fecha) return '—';
  try {
    // Intentar parsear diferentes formatos de fecha
    let fechaObj;
    if (typeof fecha === 'string') {
      // Si viene en formato dd/mm/yyyy
      if (fecha.includes('/')) {
        const [dia, mes, año] = fecha.split('/');
        fechaObj = new Date(Number(año), Number(mes) - 1, Number(dia));
      } else {
        fechaObj = new Date(fecha);
      }
    } else {
      fechaObj = fecha;
    }

    if (isNaN(fechaObj.getTime())) return '—';
    return fechaObj.toLocaleDateString('es-MX', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  } catch {
    return '—';
  }
};

const ViewAbonosModal = ({ isOpen, onClose, project, onAbonoUpdated }) => {
  const { getAbonosByProyecto, loading } = useAbono();
  const { listarDocumentos, subirDocumento, obtenerDocumentoUrl, descargarDocumento } = useAbonoDocumentos();

  const [abonos, setAbonos] = useState([]);
  const [error, setError] = useState('');
  const [abonoAEditar, setAbonoAEditar] = useState(null);

  // Estados para gestión de comprobantes
  const [documentosPorAbono, setDocumentosPorAbono] = useState({}); // Map de abonoId -> documento
  const [loadingDocumentos, setLoadingDocumentos] = useState(false);
  const [documentoAEditar, setDocumentoAEditar] = useState(null);
  const [isEditDocModalOpen, setIsEditDocModalOpen] = useState(false);

  // Estados para agregar comprobante
  const [abonoParaComprobante, setAbonoParaComprobante] = useState(null);
  const [isAddComprobanteModalOpen, setIsAddComprobanteModalOpen] = useState(false);
  const [nuevoComprobanteFile, setNuevoComprobanteFile] = useState(null);
  const [nuevoComprobanteDesc, setNuevoComprobanteDesc] = useState('');
  const [comprobanteWarning, setComprobanteWarning] = useState('');
  const [loadingUpload, setLoadingUpload] = useState(false);

  useEffect(() => {
    const cargarAbonos = async () => {
      if (!isOpen || !project) {
        setAbonos([]);
        setError('');
        return;
      }

      const proyectoId = project?.id ?? project?._id ?? project?.rawId;
      if (!proyectoId) {
        setError('No se pudo identificar el proyecto');
        setAbonos([]);
        return;
      }

      setError('');

      try {
        const result = await getAbonosByProyecto(proyectoId);
        setAbonos(result?.items || []);
      } catch (err) {
        console.error('Error al cargar abonos:', err);
        setError('Error al cargar los abonos del proyecto');
        setAbonos([]);
      }
    };

    cargarAbonos();
  }, [isOpen, project, getAbonosByProyecto]);

  // Cargar documentos cuando se cargan los abonos
  useEffect(() => {
    const cargarDocumentos = async () => {
      if (abonos.length > 0 && project) {
        setLoadingDocumentos(true);
        try {
          const proyectoId = project?.id ?? project?._id ?? project?.rawId;
          if (proyectoId) {
            const docs = await listarDocumentos({ idProyecto: proyectoId });

            // Crear mapa de abonoId -> documento
            const mapaDocumentos = {};
            if (Array.isArray(docs)) {
              docs.forEach(doc => {
                const abonoId = doc?.idAbono ?? doc?.abonoId ?? doc?.abono_id;
                if (abonoId) {
                  mapaDocumentos[String(abonoId)] = doc;
                }
              });
            }
            setDocumentosPorAbono(mapaDocumentos);
          }
        } catch (err) {
          console.error('Error cargando documentos:', err);
        } finally {
          setLoadingDocumentos(false);
        }
      }
    };
    cargarDocumentos();
  }, [abonos, project, listarDocumentos]);

  const manejarEditarAbono = (abono) => {
    setAbonoAEditar(abono);
  };

  const manejarCerrarEdicion = () => {
    setAbonoAEditar(null);
  };

  const manejarAbonoActualizado = async (abonoActualizado) => {
    // Recargar la lista de abonos después de actualizar
    if (project) {
      const proyectoId = project?.id ?? project?._id ?? project?.rawId;
      if (proyectoId) {
        try {
          const result = await getAbonosByProyecto(proyectoId);
          setAbonos(result?.items || []);
        } catch (err) {
          console.error('Error al recargar abonos:', err);
        }
      }
    }
    setAbonoAEditar(null);

    // Notificar al componente padre que se actualizó un abono, pasando el proyecto y el abono actualizado
    if (typeof onAbonoUpdated === 'function') {
      onAbonoUpdated(project, abonoActualizado);
    }
  };

  // Funciones para gestión de comprobantes
  const abrirDocumento = async (documentoId, fallbackUrl) => {
    if (!documentoId && fallbackUrl) {
      window.open(fallbackUrl, '_blank', 'noopener,noreferrer');
      return;
    }
    try {
      const url = await obtenerDocumentoUrl(documentoId);
      if (url) {
        window.open(url, '_blank', 'noopener,noreferrer');
      }
    } catch (err) {
      console.error('Error al abrir documento:', err);
      setError('No se pudo abrir el documento.');
    }
  };

  const descargarDocumentoHandler = async (documentoId, fallbackUrl, nombreArchivo) => {
    if (!documentoId && fallbackUrl) {
      window.open(fallbackUrl, '_blank', 'noopener,noreferrer');
      return;
    }
    try {
      await descargarDocumento(documentoId, nombreArchivo || `documento-${documentoId}`);
    } catch (err) {
      console.error('Error al descargar documento:', err);
      setError('No se pudo descargar el documento.');
    }
  };

  const editarDocumento = (documento) => {
    setDocumentoAEditar(documento);
    setIsEditDocModalOpen(true);
  };

  const handleDocumentUpdated = async () => {
    // Recargar documentos
    if (project) {
      const proyectoId = project?.id ?? project?._id ?? project?.rawId;
      if (proyectoId) {
        try {
          const docs = await listarDocumentos({ idProyecto: proyectoId });
          const mapaDocumentos = {};
          if (Array.isArray(docs)) {
            docs.forEach(doc => {
              const abonoId = doc?.idAbono ?? doc?.abonoId ?? doc?.abono_id;
              if (abonoId) {
                mapaDocumentos[String(abonoId)] = doc;
              }
            });
          }
          setDocumentosPorAbono(mapaDocumentos);
        } catch (err) {
          console.error('Error recargando documentos:', err);
        }
      }
    }
  };

  const agregarComprobante = (abono) => {
    setAbonoParaComprobante(abono);
    setNuevoComprobanteFile(null);
    setNuevoComprobanteDesc('');
    setComprobanteWarning('');
    setIsAddComprobanteModalOpen(true);
  };

  const handleSubirComprobante = async () => {
    if (!nuevoComprobanteFile) {
      setComprobanteWarning('Debes seleccionar un archivo.');
      return;
    }
    if (!abonoParaComprobante) return;

    const abonoId = abonoParaComprobante?.id ?? abonoParaComprobante?._id;
    if (!abonoId) return;

    setLoadingUpload(true);
    try {
      await subirDocumento({
        idAbono: abonoId,
        file: nuevoComprobanteFile,
        descripcion: nuevoComprobanteDesc
      });

      // Recargar documentos
      await handleDocumentUpdated();

      // Cerrar modal
      setIsAddComprobanteModalOpen(false);
      setAbonoParaComprobante(null);
      setNuevoComprobanteFile(null);
      setNuevoComprobanteDesc('');
    } catch (err) {
      console.error('Error al subir comprobante:', err);
      setComprobanteWarning(err?.userMessage || 'No se pudo subir el comprobante.');
    } finally {
      setLoadingUpload(false);
    }
  };

  // Calcular totales
  const totalAbonado = abonos.reduce((sum, abono) => {
    const monto = Number(abono?.montoAbono ?? abono?.monto ?? abono?.monto_abono ?? 0);
    return sum + monto;
  }, 0);

  const presupuesto = Number(project?.budget ?? project?.presupuesto?.total ?? project?.totalPresupuesto ?? 0);
  const saldoRestante = Math.max(presupuesto - totalAbonado, 0);
  const porcentajePagado = presupuesto > 0 ? Math.round((totalAbonado / presupuesto) * 100) : 0;

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative bg-card border border-border rounded-lg shadow-xl w-full max-w-4xl mx-4 max-h-[90vh] flex flex-col">
        {/* Encabezado */}
        <div className="p-4 border-b border-border flex items-center justify-between bg-card sticky top-0 z-10">
          <div className="flex items-center space-x-2">
            <Icon name="Eye" size={18} />
            <h3 className="text-lg font-semibold text-foreground">
              Abonos del Proyecto: {project?.name ?? project?.nombreProyecto ?? '—'}
            </h3>
          </div>
          <button
            className="text-muted-foreground hover:text-foreground"
            onClick={onClose}
            title="Cerrar"
          >
            <Icon name="X" size={18} />
          </button>
        </div>

        {/* Resumen */}
        <div className="p-4 border-b border-border bg-muted/30">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-sm">
            <div>
              <span className="text-muted-foreground block text-xs">Presupuesto Total</span>
              <span className="text-foreground font-medium text-base">{formatearMoneda(presupuesto)}</span>
            </div>
            <div>
              <span className="text-muted-foreground block text-xs">Total Abonado</span>
              <span className="text-foreground font-medium text-base">{formatearMoneda(totalAbonado)}</span>
            </div>
            <div>
              <span className="text-muted-foreground block text-xs">Saldo Restante</span>
              <span className="text-foreground font-medium text-base">{formatearMoneda(saldoRestante)}</span>
            </div>
            <div>
              <span className="text-muted-foreground block text-xs">Progreso</span>
              <span className="text-foreground font-medium text-base">{porcentajePagado}%</span>
            </div>
          </div>
          {/* Barra de progreso */}
          <div className="mt-3">
            <div className="w-full bg-muted rounded-full h-2">
              <div
                className="h-2 rounded-full bg-primary transition-all"
                style={{ width: `${Math.min(porcentajePagado, 100)}%` }}
              />
            </div>
          </div>
        </div>

        {/* Contenido - Lista de abonos */}
        <div className="overflow-y-auto flex-1 p-4">
          {loading && (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              <span className="ml-3 text-muted-foreground">Cargando abonos...</span>
            </div>
          )}

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700 text-sm">
              {error}
            </div>
          )}

          {!loading && !error && abonos.length === 0 && (
            <div className="text-center py-12">
              <Icon name="CreditCard" size={48} className="text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">No hay abonos registrados para este proyecto</p>
            </div>
          )}

          {!loading && !error && abonos.length > 0 && (
            <div className="space-y-3">
              {/* Encabezado de tabla (solo desktop) */}
              <div className="hidden md:grid md:grid-cols-8 gap-4 pb-2 border-b border-border text-xs font-medium text-muted-foreground">
                <div>Folio/Ref.</div>
                <div>Fecha</div>
                <div>Monto</div>
                <div>Método de Pago</div>
                <div>Descripción</div>
                <div>N° Abono</div>
                <div>Comprobante</div>
                <div>Acciones</div>
              </div>

              {/* Lista de abonos */}
              {abonos.map((abono, index) => {
                const monto = Number(abono?.montoAbono ?? abono?.monto ?? abono?.monto_abono ?? 0);
                const fecha = abono?.fecha ?? abono?.fechaAbono ?? abono?.fecha_creacion ?? abono?.createdAt;
                const metodoPago = abono?.metodoPago ?? abono?.metodo_pago ?? abono?.metodo ?? '—';
                const descripcion = abono?.descripcion ?? abono?.descripcionAbono ?? '—';
                const folio = abono?.folio ?? abono?.referencia ?? '—';
                const numeroAbono = abono?.numeroAbono ?? null;
                const activo = abono?.activo ?? true;
                const estado = activo ? (abono?.estado ?? abono?.status ?? 'registrado') : 'inactivo';
                const notas = abono?.notas ?? abono?.observaciones ?? '';

                return (
                  <div
                    key={abono?.id ?? abono?._id ?? index}
                    className="border border-border rounded-lg p-4 hover:bg-muted/30 transition-colors"
                  >
                    {/* Vista Desktop */}
                    <div className="hidden md:grid md:grid-cols-8 gap-4 items-center">
                      <div className="text-sm text-foreground font-mono">{folio}</div>
                      <div className="text-sm text-foreground">{formatearFecha(fecha)}</div>
                      <div className="text-sm font-medium text-foreground">{formatearMoneda(monto)}</div>
                      <div className="text-sm text-foreground">{metodoPago}</div>
                      <div className="text-sm text-muted-foreground truncate" title={descripcion}>
                        {descripcion}
                      </div>
                      <div className="text-sm text-foreground text-center">
                        {numeroAbono != null ? `#${numeroAbono}` : '—'}
                      </div>

                      {/* Columna de Comprobante */}
                      <div className="flex items-center gap-1">
                        {(() => {
                          const abonoId = String(abono?.id ?? abono?._id ?? '');
                          const documento = documentosPorAbono[abonoId];
                          const documentoId = documento?.idDocumento ?? documento?.id ?? documento?._id;
                          const urlDoc = documento?.urlDescarga ?? documento?.url;

                          if (documento && (documentoId || urlDoc)) {
                            return (
                              <>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => abrirDocumento(documentoId, urlDoc)}
                                  title="Ver comprobante"
                                  className="h-7 w-7"
                                >
                                  <Icon name="Eye" size={14} />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => descargarDocumentoHandler(documentoId, urlDoc, documento?.nombre || documento?.nombreArchivo)}
                                  title="Descargar"
                                  className="h-7 w-7"
                                >
                                  <Icon name="Download" size={14} />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => editarDocumento(documento)}
                                  title="Editar comprobante"
                                  className="h-7 w-7"
                                >
                                  <Icon name="Edit" size={14} />
                                </Button>
                              </>
                            );
                          } else {
                            return (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => agregarComprobante(abono)}
                                className="text-xs h-7"
                              >
                                <Icon name="Plus" size={14} className="mr-1" />
                                Agregar
                              </Button>
                            );
                          }
                        })()}
                      </div>

                      <div className="flex items-center justify-center">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => manejarEditarAbono(abono)}
                          title="Editar abono"
                          aria-label="Editar abono"
                        >
                          <Icon name="Edit" size={16} />
                        </Button>
                      </div>
                    </div>

                    {/* Vista Móvil */}
                    <div className="md:hidden space-y-2">
                      <div className="flex items-center justify-between">
                        <div>
                          <span className="text-sm font-medium text-foreground">{formatearMoneda(monto)}</span>
                          {folio && folio !== '—' && (
                            <span className="ml-2 text-xs text-muted-foreground font-mono">({folio})</span>
                          )}
                        </div>
                        <div className="flex items-center space-x-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => manejarEditarAbono(abono)}
                            title="Editar abono"
                            aria-label="Editar abono"
                          >
                            <Icon name="Edit" size={16} />
                          </Button>
                          <span
                            className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${estado === 'aprobado' || (activo && estado === 'registrado')
                              ? 'bg-green-100 text-green-800'
                              : estado === 'rechazado' || estado === 'inactivo'
                                ? 'bg-red-100 text-red-800'
                                : 'bg-blue-100 text-blue-800'
                              }`}
                          >
                            {activo ? estado : 'inactivo'}
                          </span>
                        </div>
                      </div>

                      {/* Comprobante en móvil */}
                      <div className="mt-2">
                        {(() => {
                          const abonoId = String(abono?.id ?? abono?._id ?? '');
                          const documento = documentosPorAbono[abonoId];
                          const documentoId = documento?.idDocumento ?? documento?.id ?? documento?._id;
                          const urlDoc = documento?.urlDescarga ?? documento?.url;

                          if (documento && (documentoId || urlDoc)) {
                            return (
                              <div className="flex items-center gap-2">
                                <span className="text-xs text-muted-foreground">Comprobante:</span>
                                <div className="flex gap-1">
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => abrirDocumento(documentoId, urlDoc)}
                                    className="text-xs h-7"
                                  >
                                    <Icon name="Eye" size={12} className="mr-1" />
                                    Ver
                                  </Button>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => descargarDocumentoHandler(documentoId, urlDoc, documento?.nombre || documento?.nombreArchivo)}
                                    className="text-xs h-7"
                                  >
                                    <Icon name="Download" size={12} className="mr-1" />
                                    Descargar
                                  </Button>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => editarDocumento(documento)}
                                    className="text-xs h-7"
                                  >
                                    <Icon name="Edit" size={12} className="mr-1" />
                                    Editar
                                  </Button>
                                </div>
                              </div>
                            );
                          } else {
                            return (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => agregarComprobante(abono)}
                                className="text-xs"
                              >
                                <Icon name="Plus" size={12} className="mr-1" />
                                Agregar comprobante
                              </Button>
                            );
                          }
                        })()}
                      </div>

                      <div className="grid grid-cols-2 gap-2 text-xs">
                        <div>
                          <span className="text-muted-foreground">Fecha:</span>
                          <span className="ml-1 text-foreground">{formatearFecha(fecha)}</span>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Método:</span>
                          <span className="ml-1 text-foreground">{metodoPago}</span>
                        </div>
                        {numeroAbono != null && (
                          <div>
                            <span className="text-muted-foreground">N° Abono:</span>
                            <span className="ml-1 text-foreground">#{numeroAbono}</span>
                          </div>
                        )}
                        <div className="col-span-2">
                          <span className="text-muted-foreground">Descripción:</span>
                          <span className="ml-1 text-foreground">{descripcion}</span>
                        </div>
                        {notas && (
                          <div className="col-span-2">
                            <span className="text-muted-foreground">Notas:</span>
                            <span className="ml-1 text-foreground text-xs">{notas}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Pie */}
        <div className="p-4 border-t border-border flex items-center justify-end">
          <Button variant="outline" onClick={onClose}>
            Cerrar
          </Button>
        </div>
      </div>

      {/* Modal de edición de abono */}
      {abonoAEditar && (
        <EditAbonoModal
          isOpen={!!abonoAEditar}
          abono={abonoAEditar}
          project={project}
          onClose={manejarCerrarEdicion}
          onSave={manejarAbonoActualizado}
        />
      )}

      {/* Modal de edición de comprobante */}
      <EditDocumentModal
        isOpen={isEditDocModalOpen}
        documento={documentoAEditar}
        onClose={() => setIsEditDocModalOpen(false)}
        onDocumentUpdated={handleDocumentUpdated}
      />

      {/* Modal para agregar comprobante */}
      {isAddComprobanteModalOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center">
          <div className="absolute inset-0 bg-black/50" onClick={() => setIsAddComprobanteModalOpen(false)} />
          <div className="relative bg-card border rounded-lg shadow-xl w-full max-w-2xl mx-4">
            <div className="p-4 border-b flex justify-between items-center">
              <h3 className="text-lg font-semibold">Agregar Comprobante</h3>
              <button onClick={() => setIsAddComprobanteModalOpen(false)}>
                <Icon name="X" />
              </button>
            </div>
            <div className="p-4">
              <div className="mb-3 text-sm text-muted-foreground">
                Abono: {abonoParaComprobante?.folio ?? abonoParaComprobante?.referencia ?? '—'} - {formatearMoneda(Number(abonoParaComprobante?.montoAbono ?? abonoParaComprobante?.monto ?? 0))}
              </div>
              <ComprobanteUploader
                file={nuevoComprobanteFile}
                onFileChange={setNuevoComprobanteFile}
                descripcion={nuevoComprobanteDesc}
                onDescripcionChange={setNuevoComprobanteDesc}
                disabled={loadingUpload}
                showPreview={true}
                warningMsg={comprobanteWarning}
                onWarningChange={setComprobanteWarning}
              />
            </div>
            <div className="p-4 border-t flex justify-end gap-2">
              <Button variant="outline" onClick={() => setIsAddComprobanteModalOpen(false)} disabled={loadingUpload}>
                Cancelar
              </Button>
              <Button onClick={handleSubirComprobante} loading={loadingUpload} iconName="Upload">
                Subir Comprobante
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ViewAbonosModal;

