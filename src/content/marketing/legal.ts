/**
 * Páginas legales — ATACAMA_LABS_PAGINAS_AUXILIARES_SPEC_V1 §1 y §3.
 * Los textos citados por el spec van tal cual. Sin razón social, RUT ni domicilio
 * (no se inventan; se agregan cuando existan los datos legales reales). Las
 * notas legales internas del spec (§2 y §4) NO se publican.
 */

export const LEGAL_CONTACT = "contacto@atacamalabs.cl";
export const LEGAL_UPDATED = "24 de septiembre de 2026";

export type LegalBlock =
  | { type: "p"; text: string }
  | { type: "lead"; text: string }
  | { type: "list"; items: readonly string[] }
  | { type: "contact" }
  | { type: "link"; before: string; label: string; href: string; after?: string };

export interface LegalSection {
  id: string;
  title: string;
  blocks: readonly LegalBlock[];
}

export interface LegalDoc {
  title: string;
  description: string;
  canonical: string;
  eyebrow: string;
  h1: string;
  intro: string;
  sections: readonly LegalSection[];
}

export const PRIVACY: LegalDoc = {
  title: "Política de Privacidad | Atacama Labs",
  description:
    "Cómo Atacama Labs trata los datos que le entregas: qué información puede recopilar, para qué la usa, con quién la comparte y cómo ejercer tus derechos.",
  canonical: "https://atacamalabs.cl/privacidad",
  eyebrow: "LEGAL",
  h1: "Política de Privacidad",
  intro:
    "En Atacama Labs usamos los datos que nos entregas para responder tus solicitudes, coordinar reuniones, implementar nuestros servicios y operar las soluciones que contratas. Esta política explica qué información podemos tratar y para qué la utilizamos.",
  sections: [
    {
      id: "responsable",
      title: "Responsable y contacto",
      blocks: [{ type: "p", text: "Marca: Atacama Labs." }, { type: "contact" }],
    },
    {
      id: "datos",
      title: "Datos que podemos recopilar",
      blocks: [
        { type: "p", text: "Según cómo interactúes con nosotros, podemos recopilar:" },
        {
          type: "list",
          items: [
            "nombre;",
            "empresa;",
            "correo electrónico;",
            "teléfono o WhatsApp;",
            "contenido enviado en formularios;",
            "respuestas del diagnóstico;",
            "mensajes enviados a nuestros agentes;",
            "información necesaria para coordinar una reunión;",
            "datos de uso técnico y de seguridad;",
            "información que autorices procesar cuando integramos tus herramientas.",
          ],
        },
        {
          type: "p",
          text: "No necesitamos ni te pedimos datos sensibles que no sean necesarios para tu solicitud. Te pedimos no enviarlos.",
        },
      ],
    },
    {
      id: "finalidades",
      title: "Para qué usamos los datos",
      blocks: [
        { type: "p", text: "Usamos los datos para:" },
        {
          type: "list",
          items: [
            "responder consultas;",
            "evaluar una solicitud comercial;",
            "coordinar reuniones;",
            "preparar propuestas;",
            "prestar y dar soporte a los servicios contratados;",
            "operar agentes, automatizaciones y sistemas;",
            "mantener la seguridad y la trazabilidad;",
            "cumplir obligaciones legales;",
            "medir y mejorar la experiencia, cuando se implemente analítica.",
          ],
        },
        {
          type: "p",
          text: "No usamos los datos que nos envías en un formulario para fines incompatibles con la solicitud original.",
        },
      ],
    },
    {
      id: "proveedores",
      title: "Proveedores tecnológicos",
      blocks: [
        { type: "p", text: "Podemos utilizar proveedores tecnológicos necesarios para:" },
        {
          type: "list",
          items: [
            "alojamiento e infraestructura;",
            "bases de datos;",
            "CRM;",
            "agenda y calendario;",
            "correo;",
            "mensajería;",
            "agentes de IA;",
            "modelos de IA;",
            "procesamiento de pagos;",
            "analítica.",
          ],
        },
        {
          type: "p",
          text: "Estos proveedores pueden tratar datos únicamente para prestar sus servicios y bajo sus propias condiciones de seguridad y privacidad.",
        },
      ],
    },
    {
      id: "transferencias",
      title: "Transferencias y procesamiento internacional",
      blocks: [
        {
          type: "p",
          text: "Algunos proveedores tecnológicos pueden procesar o alojar información fuera de Chile.",
        },
        {
          type: "p",
          text: "Utilizamos servicios razonablemente adecuados para la operación y la protección de la información.",
        },
      ],
    },
    {
      id: "conservacion",
      title: "Conservación",
      blocks: [
        { type: "p", text: "Conservamos los datos durante el tiempo necesario para:" },
        {
          type: "list",
          items: [
            "responder tu solicitud;",
            "mantener la relación comercial;",
            "prestar el servicio;",
            "cumplir obligaciones legales;",
            "resolver incidencias y mantener registros razonables.",
          ],
        },
      ],
    },
    {
      id: "derechos",
      title: "Tus derechos",
      blocks: [
        {
          type: "p",
          text: "Puedes solicitar información sobre tus datos personales y, cuando corresponda legalmente, pedir su rectificación, actualización, eliminación, bloqueo u oponerte a determinados tratamientos. Para ejercer estos derechos, escríbenos a contacto@atacamalabs.cl.",
        },
      ],
    },
    {
      id: "seguridad",
      title: "Seguridad",
      blocks: [
        {
          type: "p",
          text: "Aplicamos medidas técnicas y organizativas razonables para proteger la información frente a accesos, pérdida, alteración o divulgación no autorizada. Ningún sistema puede garantizar seguridad absoluta.",
        },
      ],
    },
    {
      id: "cookies",
      title: "Cookies y analítica",
      blocks: [
        {
          type: "p",
          text: "Podemos utilizar tecnologías estrictamente necesarias para el funcionamiento del sitio. Si incorporamos herramientas de analítica, publicidad o medición que requieran información adicional al usuario o consentimiento, actualizaremos esta política y la configuración correspondiente.",
        },
      ],
    },
    {
      id: "cambios",
      title: "Cambios",
      blocks: [
        {
          type: "p",
          text: "Podemos actualizar esta política cuando cambien nuestros servicios, proveedores o requisitos legales. La versión vigente se publicará en esta página indicando su fecha de actualización.",
        },
      ],
    },
  ],
};

export const TERMS: LegalDoc = {
  title: "Términos de Uso | Atacama Labs",
  description:
    "Términos de uso del sitio web de Atacama Labs: uso permitido, información comercial, agentes, proyectos, servicios de terceros y responsabilidad.",
  canonical: "https://atacamalabs.cl/terminos",
  eyebrow: "LEGAL",
  h1: "Términos de Uso",
  intro:
    "Estos términos regulan el uso del sitio web de Atacama Labs. Las condiciones específicas de cada proyecto, implementación o suscripción se establecen en la propuesta, orden, contrato o confirmación comercial correspondiente.",
  sections: [
    {
      id: "uso",
      title: "Uso del sitio",
      blocks: [
        {
          type: "p",
          text: "Puedes navegar el sitio, utilizar los formularios y conversar con los agentes disponibles para conocer nuestros servicios y solicitar contacto.",
        },
        { type: "p", text: "No debes:" },
        {
          type: "list",
          items: [
            "intentar vulnerar el sitio;",
            "automatizar el abuso del servicio;",
            "enviar contenido ilícito;",
            "utilizar las interfaces públicas para afectar sistemas o a terceros.",
          ],
        },
      ],
    },
    {
      id: "informacion-comercial",
      title: "Información comercial",
      blocks: [
        {
          type: "p",
          text: "Los precios y alcances publicados tienen por objeto informar las condiciones comerciales base. Cuando un servicio requiera validar alcance, integraciones, volumen o desarrollos adicionales, Atacama informará esos elementos antes de la contratación.",
        },
        {
          type: "link",
          before: "Los precios vigentes se publican en ",
          label: "Precios",
          href: "/precios",
          after: ".",
        },
      ],
    },
    {
      id: "agentes",
      title: "Agentes",
      blocks: [
        {
          type: "p",
          text: "Los agentes pueden ejecutar tareas y conectarse con herramientas según la configuración, permisos e integraciones contratadas. Las capacidades específicas se confirman durante la implementación.",
        },
      ],
    },
    {
      id: "proyectos",
      title: "Proyectos A Medida y Páginas Web",
      blocks: [
        {
          type: "p",
          text: "Los entregables, plazos, integraciones, revisiones y costos de cada proyecto se definen en la propuesta aceptada por el cliente.",
        },
      ],
    },
    {
      id: "terceros",
      title: "Servicios de terceros",
      blocks: [
        {
          type: "p",
          text: "Algunas soluciones dependen de servicios externos, como canales de mensajería, APIs, pasarelas de pago, modelos de IA, dominios u otras plataformas. Sus costos, disponibilidad y condiciones pueden ser independientes de Atacama Labs cuando así se informe.",
        },
      ],
    },
    {
      id: "propiedad-intelectual",
      title: "Propiedad intelectual",
      blocks: [
        {
          type: "p",
          text: "El contenido, marca, diseño y materiales propios de Atacama Labs están protegidos por la legislación aplicable. Los derechos sobre entregables desarrollados para clientes se regirán por la propuesta o contrato correspondiente.",
        },
      ],
    },
    {
      id: "disponibilidad",
      title: "Disponibilidad",
      blocks: [
        {
          type: "p",
          text: "Trabajamos para mantener nuestros servicios disponibles y operativos, pero pueden existir interrupciones por mantenimiento, proveedores externos, conectividad, APIs o causas fuera de nuestro control.",
        },
      ],
    },
    {
      id: "responsabilidad",
      title: "Limitaciones y responsabilidad",
      blocks: [
        {
          type: "p",
          text: "Cada servicio se presta según el alcance acordado. Las responsabilidades específicas, niveles de servicio y condiciones de soporte se establecen en la contratación correspondiente y se aplican conforme a la legislación vigente.",
        },
      ],
    },
    {
      id: "privacidad",
      title: "Privacidad",
      blocks: [
        {
          type: "link",
          before: "Puedes revisar cómo tratamos tus datos en nuestra ",
          label: "Política de Privacidad",
          href: "/privacidad",
          after: ".",
        },
      ],
    },
    {
      id: "contacto",
      title: "Contacto",
      blocks: [{ type: "contact" }],
    },
  ],
};
