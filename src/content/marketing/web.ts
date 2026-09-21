/** Copy de /paginas-web (I1–I7). */

import type { WebFormat } from "@/components/marketing/demos/WebDemo";

export const WEB_META =
  "Landing pages, sitios corporativos y ecommerce con diseño claro y recorridos pensados para tu negocio. Compara formatos, alcance y planes de Atacama Labs.";

export const WEB_FORMAT_COPY: Record<
  WebFormat,
  { label: string; headline: string; audience: string; scope: string; timing: string; demo: string }
> = {
  landing: {
    label: "Landing",
    headline: "Una oferta, un recorrido y una acción principal.",
    audience: "Para presentar un servicio o una campaña propia sin contratar Ads.",
    scope: "Presentación de la oferta, beneficios y contacto.",
    timing: "Plazo según contenido y alcance.",
    demo: "En la demo: ir a la sección de contacto y simular una confirmación local.",
  },
  corporativa: {
    label: "Corporativa",
    headline: "Toda tu empresa, con una navegación que se entiende.",
    audience: "Para explicar varias líneas y dar confianza.",
    scope: "Arquitectura de páginas, servicios y contacto.",
    timing: "Plazo según contenido y alcance.",
    demo: "En la demo: cambiar entre Inicio, Servicios y Contacto.",
  },
  ecommerce: {
    label: "Ecommerce",
    headline: "Del producto al pedido, sin perder claridad.",
    audience: "Para presentar catálogo y facilitar una compra.",
    scope: "Catálogo, carrito y flujo de compra; pagos y logística según integración.",
    timing: "Plazo según catálogo e integraciones.",
    demo: "En la demo: añadir, cambiar cantidad, quitar, ver resumen y simular un pedido.",
  },
};

export const WEB_BLOCKS = [
  { title: "Diseño responsive", body: "Navegación y contenido pensados para escritorio y móvil." },
  { title: "Estructura y SEO técnico", body: "Títulos, enlaces y metadatos coherentes con las páginas publicadas." },
  {
    title: "Formularios y contacto",
    body: "Un recorrido claro para recibir consultas y mostrar si llegaron correctamente.",
  },
  {
    title: "Medición",
    body: "Definimos qué acciones conviene medir; la herramienta y su configuración se acuerdan en el alcance.",
  },
  {
    title: "Dominio e infraestructura",
    body: "Revisamos la configuración necesaria para publicar. Compras, renovaciones y alojamiento se detallan por separado cuando corresponda.",
  },
  {
    title: "Integraciones",
    body: "Pagos, catálogo, agenda o agentes se incorporan según el producto y las conexiones confirmadas.",
  },
] as const;

export const WEB_STEPS = [
  { title: "Ordenamos la información", body: "Revisamos objetivo, páginas, materiales disponibles y funciones necesarias." },
  {
    title: "Diseñamos el recorrido",
    body: "Definimos jerarquía, navegación y cómo llega el visitante a la acción principal.",
  },
  { title: "Construimos y conectamos", body: "Implementamos las pantallas y las conexiones incluidas en el alcance." },
  {
    title: "Revisamos para publicar",
    body: "Comprobamos enlaces, formularios y presentación en dispositivos antes del lanzamiento autorizado.",
  },
] as const;

export const WEB_FAQ = [
  {
    question: "¿El dominio y el hosting están incluidos?",
    answer:
      "La propuesta lo indica expresamente. Si ya tienes dominio o alojamiento, revisamos si se pueden conservar y quién administra sus renovaciones.",
  },
  {
    question: "¿Cuánto demora?",
    answer:
      "El plazo depende del contenido, el número de páginas y las conexiones. Se acuerda antes de comenzar; no usamos una promesa única para todos los sitios.",
  },
  {
    question: "¿Podré cambiar el contenido?",
    answer:
      "Definimos qué necesitas editar y la forma de hacerlo. Un panel de administración se incluye solo si está contemplado en el alcance.",
  },
  {
    question: "¿Puedo recibir pagos?",
    answer:
      "En un ecommerce se evalúa la pasarela y su compatibilidad. Las cuentas, comisiones y condiciones del proveedor se revisan por separado.",
  },
  {
    question: "¿Se puede conectar con un agente?",
    answer:
      "Sí, podemos evaluar esa conexión como parte del proyecto. El servicio de agentes y su consumo no se dan por incluidos en el precio de la web.",
  },
  {
    question: "¿Qué recibo al finalizar?",
    answer:
      "Los entregables, accesos, propiedad o licencias aplicables y el soporte posterior quedan definidos en la propuesta. No se asume mantenimiento indefinido.",
  },
] as const;

export const WEB_FLOW = [
  { id: "web", label: "Web", detail: "Una persona visita la web y completa el formulario de contacto." },
  { id: "consulta", label: "Consulta", detail: "La consulta DEMO-W01 queda registrada con su contexto." },
  {
    id: "equipo",
    label: "Equipo",
    detail: "Ejemplo: DEMO-W01 llega al equipo para su revisión. No se llama a ningún CRM ni sistema real.",
  },
] as const;
