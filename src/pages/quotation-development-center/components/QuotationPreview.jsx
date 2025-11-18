import React, { useRef, useEffect, useState } from 'react';
import Icon from '../../../components/AppIcon';
import Button from '../../../components/ui/Button';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import useClient from '../../../hooks/useClient';
import useProyecto from '../../../hooks/useProyect';
import useQuotation from '../../../hooks/useQuotation';
import { useNotifications } from '../../../context/NotificationContext';

// Utilidades de formateo
const formatCurrency = (amount) => {
  if (amount === null || amount === undefined || Number.isNaN(Number(amount))) return '$0.00';
  return new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency: 'MXN'
  }).format(Number(amount));
};

const formatDate = (dateString) => {
  if (!dateString) return 'Fecha no disponible';
  const d = new Date(dateString);
  if (Number.isNaN(d.getTime())) return 'Fecha no disponible';
  return d.toLocaleDateString('es-MX', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
};

// Función para obtener la fecha actual
const getCurrentDate = () => {
  const today = new Date();
  return today.toLocaleDateString('es-MX', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
};

const QuotationPreview = ({ quotation = {} }) => {
  const quotationRef = useRef(null);
  const [clientData, setClientData] = useState(null);
  const [projectData, setProjectData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [cotizacionCompleta, setCotizacionCompleta] = useState(null);

  const { getClients } = useClient();
  const { getProyectos, getProyectoById } = useProyecto();
  const { getCotizacionById } = useQuotation();
  const { showError, showWarning } = useNotifications();
  const [proyectoData, setProyectoData] = useState(null);

  // Función defensiva para extraer id/nombre de arrays heterogéneos
  const safeFindIdAndName = (arr = [], idFields = ['id', 'id_cliente', 'id_proyecto'], nameFields = ['nombre', 'nombre_cliente', 'nombre_proyecto', 'empresa']) => {
    if (!Array.isArray(arr)) return { id: undefined, name: undefined };
    let id, name;
    for (const obj of arr) {
      if (!obj) continue;
      for (const f of idFields) {
        if (id === undefined && (obj[f] !== undefined && obj[f] !== null)) {
          id = obj[f];
          break;
        }
      }
      for (const f of nameFields) {
        if (!name && obj[f]) {
          name = obj[f];
          break;
        }
      }
      if (id !== undefined && name) break;
    }
    return { id, name };
  };

  // Debug ligero (opcional)
  useEffect(() => {
    let isMounted = true;
    
    const fetchCotizacion = async () => {
      if (!quotation?.id || cotizacionCompleta) return;
      
      try {
        const cotizacionDetallada = await getCotizacionById(quotation.id);
        if (isMounted) {
          console.log('Cotización obtenida completa:', cotizacionDetallada);
          // Extraer data de la respuesta si viene encapsulada
          const dataContent = cotizacionDetallada?.data || cotizacionDetallada;
          console.log('Data content:', dataContent);
          console.log('Fecha creación:', dataContent.fechaCreacion);
          console.log('Fecha actualización:', dataContent.fechaActualizacion);
          console.log('Ultima modificación:', dataContent.ultimaModificacion);
          
          // Preservar las fechas originales en formato ISO
          const cotizacionConFechas = {
            ...dataContent,
            fechaCreacion: dataContent.fechaCreacion,
            fechaActualizacion: dataContent.fechaActualizacion || dataContent.ultimaModificacion
          };
          console.log('Cotización con fechas:', cotizacionConFechas);
          setCotizacionCompleta(cotizacionConFechas);
        }
      } catch (error) {
        console.error('Error al obtener la cotización:', error);
        if (isMounted) {
          showError('Error al cargar los detalles de la cotización');
        }
      }
    };

    fetchCotizacion();
    return () => {
      isMounted = false;
    };
  }, [quotation?.id, getCotizacionById, showError]);

  // Efecto para obtener datos del proyecto cuando tengamos la cotización
  useEffect(() => {
    let isMounted = true;

    const fetchProyecto = async () => {
      console.log('Estado actual de cotizacionCompleta:', cotizacionCompleta);
      
      // Buscar el ID del proyecto en la estructura actualizada
      const proyectoId = cotizacionCompleta?.projectId || 
                        cotizacionCompleta?.informacion_basica?.proyecto?.[0]?.id_proyecto ||
                        cotizacionCompleta?.informacion_basica?.id_proyecto;

      if (!proyectoId) {
        console.log('No se encontró el ID del proyecto en la cotización');
        // Si tenemos el nombre del proyecto pero no el ID, intentamos buscarlo en la lista de proyectos
        if (cotizacionCompleta?.projectName) {
          try {
            const proyectos = await getProyectos();
            const proyecto = proyectos?.find(p => p.nombre === cotizacionCompleta.projectName);
            if (proyecto?.id) {
              console.log('Se encontró el proyecto por nombre:', proyecto);
              if (isMounted) {
                setProjectData({ data: proyecto });
              }
            }
          } catch (error) {
            console.error('Error al buscar proyecto por nombre:', error);
          }
        }
        return;
      }

      try {
        console.log('ID del proyecto encontrado:', proyectoId);
        const proyectoDetallado = await getProyectoById(proyectoId);
        console.log('Respuesta del servidor (proyecto):', proyectoDetallado);
        
        if (isMounted) {
          setProjectData(proyectoDetallado);
          console.log('ProjectData actualizado:', proyectoDetallado);
        }
      } catch (error) {
        console.error('Error al obtener el proyecto:', error);
        if (isMounted) {
          showWarning('No se pudieron cargar los detalles del proyecto');
        }
      }
    };

    if (cotizacionCompleta) {
      fetchProyecto();
    }
    
    return () => {
      isMounted = false;
    };
  }, [cotizacionCompleta, getProyectoById, getProyectos, showWarning]);

  useEffect(() => {
    let isMounted = true;

    const normalizeList = (resp) => {
      if (!resp) return [];
      if (Array.isArray(resp)) return resp;
      if (resp?.data?.data && Array.isArray(resp.data.data)) return resp.data.data;
      if (resp?.data && Array.isArray(resp.data)) return resp.data;
      return [];
    };

    const fetchData = async () => {
      if (!quotation?.id) {
        console.warn('QuotationPreview: no hay ID de cotización, usando datos mínimos');
      }

      try {
        setLoading(true);

        // Obtener proyectos y clientes en paralelo (si las funciones están disponibles)
        const [proyectosResp, clientsResp] = await Promise.allSettled([
          typeof getProyectos === 'function' ? getProyectos() : Promise.resolve([]),
          typeof getClients === 'function' ? getClients() : Promise.resolve([])
        ]);

        const proyectosList = proyectosResp.status === 'fulfilled' ? normalizeList(proyectosResp.value) : [];
        const clientsList = clientsResp.status === 'fulfilled' ? normalizeList(clientsResp.value) : [];

        // Intentar encontrar la cotización completa en proyectos (si corresponde)
        let cotizacionData = null;
        if (quotation?.id) {
          cotizacionData = proyectosList.find(p => String(p.id) === String(quotation.id)) || null;
          if (!cotizacionData) {
            // fallback: buscar por folio, o usar la prop quotation directamente
            cotizacionData = proyectosList.find(p => String(p.folio) === String(quotation.folio)) || null;
          }
        }

        if (!cotizacionData) {
          // No se encontró una cotización "completa" en proyectos -> usar la prop quotation (normalizar mínimamente)
          cotizacionData = {
            ...quotation,
            id: quotation.id || undefined,
            folio: quotation.folio || (quotation.id ? `COT-${new Date().getFullYear()}-${quotation.id}` : `COT-${Date.now()}`),
            informacion_basica: quotation.informacion_basica || quotation.informacion_cliente || {}
          };
        }

        // Extraer cliente/proyecto desde informacion_basica de forma defensiva
        const infoBasica = cotizacionData?.informacion_basica || {};
        const clienteArr = infoBasica?.cliente || infoBasica?.clientes || [];
        const proyectoArr = infoBasica?.proyecto || infoBasica?.proyectos || [];

        const { id: clientIdFromInfo, name: clientNameFromInfo } = safeFindIdAndName(clienteArr, ['id', 'id_cliente'], ['nombre', 'empresa', 'nombre_cliente']);
        const { id: projectIdFromInfo, name: projectNameFromInfo } = safeFindIdAndName(proyectoArr, ['id', 'id_proyecto'], ['nombre', 'nombre_proyecto']);

        // Preferir IDs directos en la prop quotation si existen
        const clientId = quotation.clientId || clientIdFromInfo || cotizacionData.clientId || undefined;
        const projectId = quotation.projectId || projectIdFromInfo || cotizacionData.projectId || undefined;

        // Enriquecer clientData y projectData desde los listados (si se encontraron)
        const foundClient = clientId ? clientsList.find(c => String(c.id) === String(clientId)) : null;
        const foundProject = projectId ? proyectosList.find(p => String(p.id) === String(projectId)) : null;

        // Contacto defensivo
        const contactoObj = quotation?.informacion_contacto?.[0]?.persona_contacto1?.[0] || {};

        if (isMounted) {
          setClientData({
            ...(foundClient || {}),
            id: clientId || (foundClient && foundClient.id),
            empresa: (foundClient && (foundClient.empresa || foundClient.nombre)) || clientNameFromInfo || 'Cliente no especificado',
            rfc: (foundClient && foundClient.rfc) || 'No disponible',
            contacto: contactoObj?.Persona_de_contacto_nombre || contactoObj?.nombre || (foundClient && (foundClient.contacto || foundClient.nombre_contacto)) || 'No especificado',
            email: contactoObj?.email || (foundClient && (foundClient.email || foundClient.contacto_email)) || 'No disponible',
            telefono: contactoObj?.telefono || (foundClient && (foundClient.telefono || foundClient.contacto_telefono)) || 'No disponible',
            ubicacion: (foundClient && foundClient.ubicacion) || {
              direccion: cotizacionData?.detalles_proyecto?.ubicacion_proyecto?.[0]?.direccion || '',
              ciudad: cotizacionData?.detalles_proyecto?.ubicacion_proyecto?.[0]?.municipio || '',
              estado: cotizacionData?.detalles_proyecto?.ubicacion_proyecto?.[0]?.estado || ''
            }
          });

          // Resolver cronograma defensivo
          const resolvedCronograma = (foundProject && foundProject.cronograma) || (cotizacionData?.detalles_proyecto && (() => {
            const tiempo = cotizacionData.detalles_proyecto.tiempo_ejecucion;
            if (typeof tiempo === 'string' && tiempo.includes(' a ')) {
              const [fechaInicio, fechaFin] = tiempo.split(' a ').map(s => s.trim());
              return { fechaInicio, fechaFin };
            }
            return {
              fechaInicio: cotizacionData.detalles_proyecto?.fecha_inicio,
              fechaFin: cotizacionData.detalles_proyecto?.fecha_fin_estimada
            };
          })()) || undefined;

          setProjectData({
            ...(foundProject || {}),
            id: projectId || (foundProject && foundProject.id),
            nombre: (foundProject && (foundProject.nombre || foundProject.titulo)) || projectNameFromInfo || cotizacionData?.detalles_proyecto?.nombre_proyecto || 'Proyecto sin nombre',
            descripcion: (foundProject && foundProject.descripcion) || cotizacionData?.detalles_proyecto?.descripcion_proyecto || 'Sin descripción disponible',
            ubicacion: (foundProject && foundProject.ubicacion) || cotizacionData?.detalles_proyecto?.ubicacion_proyecto?.[0]?.direccion || 'Ubicación no especificada',
            tipoProyecto: (foundProject && foundProject.tipoProyecto) || infoBasica?.tipo_proyecto || 'No especificado',
            prioridad: (foundProject && foundProject.prioridad) || infoBasica?.prioridad || 'Normal',
            cronograma: resolvedCronograma,
            totalPresupuesto: (foundProject && foundProject.totalPresupuesto) || cotizacionData?.detalles_proyecto?.presupuesto_estimado_mxn || cotizacionData?.totalAmount || 0
          });

          // Guardar cotización completa en estado para debug o usos posteriores
          setCotizacionCompleta({
            ...cotizacionData,
            clientId,
            projectId
          });
        }

        // Advertencias si faltan ids críticos
        if (!clientId || !projectId) {
          showWarning && showWarning('Faltan datos de cliente o proyecto en la cotización. Se usó la información disponible.');
        }
      } catch (err) {
        console.error('QuotationPreview - error al cargar datos:', err);
        showError && showError(err?.message || 'Error al cargar los datos de la cotización');
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    fetchData();

    return () => {
      isMounted = false;
    };
  }, [quotation, getProyectos, getClients, showError, showWarning]);

  // Resolver la ubicación que debe mostrarse: preferir la ubicación de la cotización
  const resolvedUbicacionObj = (cotizacionCompleta && (
    cotizacionCompleta.detalles_proyecto?.ubicacion_proyecto?.[0] ||
    cotizacionCompleta.location ||
    cotizacionCompleta.ubicacion
  )) || (projectData?.data?.ubicacion || projectData?.ubicacion);

  const formattedUbicacion = (() => {
    if (!resolvedUbicacionObj) return '';
    const direccion = resolvedUbicacionObj?.direccion || resolvedUbicacionObj?.direccion_proyecto || '';
    const municipio = resolvedUbicacionObj?.municipio || resolvedUbicacionObj?.ciudad || '';
    const estado = resolvedUbicacionObj?.estado || '';
    const parts = [direccion, municipio, estado].map(p => (p || '').toString().trim()).filter(Boolean);
    return parts.join(', ');
  })();

  const handleExportPDF = async () => {
    if (!quotationRef.current) return;
    try {
      const content = quotationRef.current;
      const canvas = await html2canvas(content, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: '#ffffff'
      });
      const imgData = canvas.toDataURL('image/jpeg', 1.0);
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();
      const imgWidth = canvas.width;
      const imgHeight = canvas.height;
      const ratio = Math.min(pdfWidth / imgWidth, pdfHeight / imgHeight);
      const imgX = (pdfWidth - imgWidth * ratio) / 2;
      const imgY = 0;
      pdf.addImage(imgData, 'JPEG', imgX, imgY, imgWidth * ratio, imgHeight * ratio);
      pdf.save(`Cotizacion-${quotation?.id || 'nueva'}.pdf`);
    } catch (error) {
      console.error('Error al generar PDF:', error);
      showError && showError('Error al generar PDF');
    }
  };

  const handlePrint = () => {
    try {
      // Crear estilos de impresión
      const printStyles = `
        @media print {
          * {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          
          body * {
            visibility: hidden;
          }
          
          .print-section, .print-section * {
            visibility: visible;
          }
          
          .print-section {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
          }
          
          @page {
            size: A4;
            margin: 15mm;
          }
          
          /* Ocultar botones */
          button {
            display: none !important;
          }
          
          /* Ocultar estado de la cotización */
          .space-y-6 > .bg-muted\\/30:last-child {
            display: none !important;
          }
        }
      `;
      
      const style = document.createElement('style');
      style.id = 'print-styles';
      style.textContent = printStyles;
      document.head.appendChild(style);
      
      // Añadir clase para impresión
      if (quotationRef.current) {
        quotationRef.current.classList.add('print-section');
      }
      
      // Dar tiempo para que se apliquen los estilos
      setTimeout(() => {
        window.print();
        
        // Limpiar después de imprimir
        setTimeout(() => {
          if (quotationRef.current) {
            quotationRef.current.classList.remove('print-section');
          }
          const styleElement = document.getElementById('print-styles');
          if (styleElement) {
            document.head.removeChild(styleElement);
          }
        }, 100);
      }, 100);
      
    } catch (error) {
      console.error('Error al imprimir:', error);
      showError && showError('Hubo un problema al imprimir el documento');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-xl font-semibold">Vista Previa de Cotización</h3>
        <div className="flex space-x-2">
          <Button variant="outline" onClick={handlePrint} iconName="Printer" iconPosition="left">
            Imprimir
          </Button>
          <Button onClick={handleExportPDF} iconName="Download" iconPosition="left">
            Exportar PDF
          </Button>
        </div>
      </div>

      <div ref={quotationRef} className="bg-white border rounded-lg p-8 shadow-sm print:shadow-none print:border-none relative">
        {loading && (
          <div className="absolute inset-0 bg-white/90 flex items-center justify-center z-10">
            <div className="flex flex-col items-center space-y-4">
              <div className="relative">
                <Icon name="Loader2" className="animate-spin" size={32} />
                <Icon name="Wind" className="absolute inset-0 m-auto opacity-30" size={16} />
              </div>
              <span className="text-sm text-muted-foreground font-medium">
                Cargando información de la cotización...
              </span>
            </div>
          </div>
        )}

        {/* Encabezado empresa */}
        <div className="flex items-center justify-between mb-8 pb-4 border-b">
          <div className="flex items-center space-x-4">
            <div className="w-12 h-12 bg-primary rounded-lg flex items-center justify-center">
              <Icon name="Wind" size={24} color="white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-foreground">AireFlow Pro</h1>
              <p className="text-muted-foreground">Sistemas HVAC Profesionales</p>
            </div>
          </div>
          <div className="text-right text-sm text-muted-foreground">
            <p>RFC: AFP123456789</p>
            <p>Tel: +52 55 1234 5678</p>
            <p>info@aireflowpro.com</p>
          </div>
        </div>

        {/* Cabecera de la cotización */}
        <div className="grid grid-cols-2 gap-8 mb-8">
          <div>
            <h2 className="text-xl font-semibold mb-4">COTIZACIÓN</h2>
            <div className="space-y-2 text-sm">
              <p><span className="font-medium">No. Cotización:</span> {quotation?.folio || cotizacionCompleta?.folio || 'No disponible'}</p>
              <p><span className="font-medium">Fecha:</span> {getCurrentDate()}</p>
              <p><span className="font-medium">Vendedor:</span> {quotation?.assignedTo || cotizacionCompleta?.assignedTo || 'No asignado'}</p>
            </div>
          </div>

          <div>
            <h3 className="font-semibold mb-2">CLIENTE</h3>
            <div className="text-sm space-y-1">
              <p className="font-medium">{clientData?.empresa || clientData?.nombre || 'Cliente no especificado'}</p>
              <p><span className="font-medium">RFC:</span> {clientData?.rfc || 'No disponible'}</p>
              <p><span className="font-medium">Dirección:</span> {clientData?.ubicacion ? `${clientData.ubicacion.direccion || ''}${clientData.ubicacion.ciudad ? ', ' + clientData.ubicacion.ciudad : ''}${clientData.ubicacion.estado ? ', ' + clientData.ubicacion.estado : ''}` : 'Dirección no disponible'}</p>
              <p><span className="font-medium">Contacto:</span> {clientData?.contacto || 'No especificado'}</p>
              <p><span className="font-medium">Email:</span> {clientData?.email || 'No disponible'}</p>
              <p><span className="font-medium">Teléfono:</span> {clientData?.telefono || 'No disponible'}</p>
            </div>
          </div>
        </div>

        {/* Información del proyecto */}
        <div className="mb-8">
          <h3 className="text-lg font-semibold mb-4 text-primary">INFORMACIÓN DEL PROYECTO</h3>
          <div className="bg-muted/30 rounded-lg p-4">
            <h4 className="font-medium mb-2">{projectData?.data?.nombre || projectData?.nombre || cotizacionCompleta?.projectName || 'Proyecto sin nombre'}</h4>
            <p className="text-sm text-foreground mb-3">{projectData?.data?.descripcion || projectData?.descripcion || cotizacionCompleta?.description || 'Sin descripción disponible'}</p>
            <div className="text-sm text-foreground space-y-2">
              <p><span className="font-bold">Ubicación:</span> { formattedUbicacion || 'Ubicación no especificada' }</p>
              <p><span className="font-bold">Tipo de proyecto:</span> {(projectData?.data?.tipoProyecto || projectData?.tipoProyecto || cotizacionCompleta?.projectType || 'NO ESPECIFICADO')?.toUpperCase()}</p>
              <p><span className="font-bold">Prioridad:</span> {(projectData?.data?.prioridad || projectData?.prioridad || cotizacionCompleta?.priority || 'Media')}</p>
            </div>
          </div>
        </div>

        {/* Alcance - Comentado temporalmente
        <div className="mb-8">
          <h3 className="text-lg font-semibold mb-4 text-primary">ALCANCE DE TRABAJO</h3>
          <div className="text-sm leading-relaxed">
            <p>{quotation?.quotationData?.scope || cotizacionCompleta?.quotationData?.scope || 'No hay alcance disponible'}</p>
          </div>
        </div>
        */}

        {/* Materiales y equipos */}
        {quotation?.materials && quotation?.materials?.length > 0 && (
          <div className="mb-8">
            <h3 className="text-lg font-semibold mb-4 text-primary">MATERIALES Y EQUIPOS</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-sm border border-border">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="px-4 py-2 text-left border border-border">Descripción</th>
                    <th className="px-4 py-2 text-left border border-border">Cantidad</th>
                    <th className="px-4 py-2 text-right border border-border">Precio Unit.</th>
                    <th className="px-4 py-2 text-right border border-border">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {quotation.materials.map((material, index) => {
                    const qty = Number(material?.quantity) || 0;
                    const cost = Number(material?.cost) || 0;
                    const unit = qty > 0 ? cost / qty : cost;
                    return (
                      <tr key={index}>
                        <td className="px-4 py-2 border border-border">{material?.item || '-'}</td>
                        <td className="px-4 py-2 border border-border">{qty || '-'}</td>
                        <td className="px-4 py-2 text-right border border-border">{formatCurrency(unit)}</td>
                        <td className="px-4 py-2 text-right border border-border">{formatCurrency(cost)}</td>
                      </tr>
                    );
                  })}
                  <tr className="bg-muted/30 font-semibold">
                    <td colSpan="3" className="px-4 py-2 text-right border border-border">SUBTOTAL:</td>
                    <td className="px-4 py-2 text-right border border-border">{formatCurrency(quotation.materials.reduce((sum, m) => sum + (Number(m?.cost) || 0), 0))}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Cronograma y condiciones */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
          <div>
            <h3 className="text-lg font-semibold mb-4 text-primary">CRONOGRAMA</h3>
            <div className="bg-muted/30 rounded-lg p-4 text-sm">
              <p><span className="font-medium">Tiempo de ejecución:</span> {projectData?.cronograma ? `${projectData.cronograma.fechaInicio || '-'} a ${projectData.cronograma.fechaFin || '-'}` : 'No especificado'}</p>
            </div>
          </div>
          <div>
            <h3 className="text-lg font-semibold mb-4 text-primary">CONDICIONES COMERCIALES</h3>
            <div className="bg-muted/30 rounded-lg p-4 text-sm">
              <p>• Precio sujeto a cambios sin previo aviso</p>
              <p>• Forma de pago: 50% anticipo, 50% contra entrega</p>
              <p>• Tiempo de entrega: según cronograma</p>
            </div>
          </div>
        </div>

        {/* Total */}
        <div className="bg-primary/10 rounded-lg p-6 mb-8">
          <div className="flex items-center justify-between">
            <div><h3 className="text-xl font-semibold text-primary">INVERSIÓN TOTAL</h3></div>
            <div className="text-right">
              <div className="text-3xl font-bold text-primary">{formatCurrency(
                (projectData?.data?.totalPresupuesto || projectData?.totalPresupuesto || cotizacionCompleta?.quotationData?.totalAmount || 0) +
                (quotation?.materials?.reduce((sum, m) => sum + (Number(m?.cost) || 0), 0) || 0)
              )}</div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="border-t pt-4 text-center text-sm text-muted-foreground">
          <p>Gracias por la confianza en AireFlow Pro</p>
          <p>Para cualquier consulta, contacte a: {quotation?.assignedTo || quotation?.asignado || '-'}</p>
          <p className="mt-2 font-medium">Esta cotización cumple con la normativa mexicana vigente</p>
        </div>
      </div>

      {/* Estado de la cotización */}
      <div className="bg-muted/30 rounded-lg p-4">
        <h4 className="font-medium mb-2">Estado de la Cotización</h4>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
          <div className="flex items-center space-x-2"><Icon name="Calendar" size={16} className="text-muted-foreground" /><span>Creada: {cotizacionCompleta?.createdDate || cotizacionCompleta?.fechaCreacion || quotation?.createdDate || 'Fecha no disponible'}</span></div>
          <div className="flex items-center space-x-2"><Icon name="Clock" size={16} className="text-muted-foreground" /><span>Modificada: {cotizacionCompleta?.lastModified || cotizacionCompleta?.fechaActualizacion || quotation?.lastModified || 'Fecha no disponible'}</span></div>
          <div className="flex items-center space-x-2"><Icon name="User" size={16} className="text-muted-foreground" /><span>Versión: {quotation?.revisions?.[quotation?.revisions?.length - 1]?.version || '1.0'}</span></div>
        </div>
      </div>
    </div>
  );
};

export default QuotationPreview;
