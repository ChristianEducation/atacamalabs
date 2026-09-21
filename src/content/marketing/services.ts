/** Copy de /comercial (V), /cobranza (W) y /administrativo-financiero (Y). Datos, no JSX. */

export const COMMERCIAL = {
  meta: "Un agente comercial que atiende, califica, agenda, hace seguimiento y trabaja con tus sistemas.",
  moreTitle: "Comercial es el punto de partida, no el límite.",
  morePills: [
    "Consultar stock y precios",
    "Generar cotización o documento",
    "Enviar correo o WhatsApp",
    "Consultar ERP",
    "Crear tarea",
    "Actualizar estado",
    "Derivar a una persona",
  ],
  moreNote: "Según integración y permisos.",
  blocks: [
    { title: "Atiende y califica", body: "Entiende lo que busca la persona y reúne el contexto para tu equipo." },
    { title: "Agenda cuando corresponde", body: "Consulta disponibilidad y confirma una hora de ejemplo." },
    { title: "Hace seguimiento y actualiza CRM", body: "Registra la oportunidad y programa el siguiente paso." },
  ],
  flow: [
    { title: "Mensaje", input: "«Buscamos una forma de dar seguimiento a las consultas de clientes.»", result: "Consulta recibida" },
    { title: "Entiende necesidad", input: "Consulta recibida", result: "Necesidad: ordenar el seguimiento de consultas" },
    { title: "Consulta datos", input: "Contexto del proceso", result: "Datos de la empresa reunidos para el equipo" },
    { title: "Propone siguiente paso", input: "Necesidad + datos", result: "Registrar la oportunidad con ese contexto" },
    { title: "Agenda / Registra", input: "Oportunidad + horario de ejemplo", result: "OPP-DEMO-1042 registrada · Reserva de ejemplo RES-DEMO-1042" },
    { title: "Seguimiento", input: "OPP-DEMO-1042", result: "TASK-DEMO-1042 · Revisar propuesta (Equipo comercial)" },
  ],
  integrations: ["CRM", "Calendarios", "Mensajería", "Ecommerce / ERP", "Bases de datos", "APIs / MCP"],
  faq: [
    {
      question: "¿Por qué canales puede atender?",
      answer:
        "Depende de los canales que utilice tu empresa y de cómo se puedan conectar. Lo revisamos antes de definir el alcance.",
    },
    {
      question: "¿Puede conectarse a mi CRM?",
      answer:
        "Evaluamos si existe un conector disponible o una API adecuada y qué acciones permite tu cuenta. La integración concreta se confirma en el alcance.",
    },
    {
      question: "¿Cómo agenda reuniones?",
      answer:
        "Consulta la disponibilidad de tu calendario, cuando esté conectado, y deja la reserva registrada. Las reglas de confirmación las definimos contigo.",
    },
    {
      question: "¿Puedo intervenir en una conversación?",
      answer:
        "Diseñamos el proceso para incluir intervención humana. La forma de hacerlo se comprueba con la plataforma y los canales que utilice tu empresa.",
    },
    {
      question: "¿Qué otras integraciones puede tener?",
      answer:
        "Las que podamos integrar de forma segura mediante conector, MCP, API o webhook y para las que existan permisos adecuados.",
    },
    {
      question: "¿Cuánto demora implementarlo?",
      answer:
        "Las configuraciones estándar pueden implementarse en 24–48 horas cuando están disponibles los accesos y no requieren desarrollo especial. Integraciones o lógica personalizada se estiman según alcance.",
    },
  ],
} as const;

export const COLLECTIONS = {
  meta: "Agentes para organizar recordatorios, consultar estados y acompañar el seguimiento de cobranza según tus reglas.",
  cards: [
    {
      title: "Recordatorios por etapa",
      lead: "Define mensajes según el estado",
    },
    { title: "Estado de la cartera", lead: "Reúne pendientes y gestiones" },
    { title: "Excepciones con revisión", lead: "Entrega al equipo lo que requiere una decisión" },
  ],
  stages: ["Antes del vencimiento", "Día de vencimiento", "Vencida"],
  steps: [
    { title: "Consultar estado", body: "Revisa el estado de la factura en la fuente conectada." },
    { title: "Preparar gestión", body: "Define el mensaje o la acción según las reglas." },
    { title: "Registrar respuesta", body: "Deja constancia de lo que respondió la persona." },
    { title: "Actualizar seguimiento", body: "Refleja el nuevo estado y el próximo paso." },
  ],
  faq: [
    {
      question: "¿El agente confirma pagos?",
      answer: "Consulta o registra estados según la integración acordada; un recordatorio no acredita un pago.",
    },
    {
      question: "¿Puede negociar?",
      answer:
        "Las excepciones se derivan al equipo. Cualquier alternativa automática requiere reglas y alcance previamente aprobados.",
    },
    {
      question: "¿Se conecta a mi sistema?",
      answer: "Revisamos disponibilidad de datos, permisos y operación antes de confirmarlo.",
    },
    { question: "¿Esta demo envía mensajes?", answer: "No. Usa datos ficticios y acciones locales." },
  ],
} as const;

export const FINANCE = {
  meta: "Agentes conectados a información administrativa y financiera para consultar, cruzar datos, generar alertas y ejecutar tareas bajo reglas y permisos.",
  capabilities: [
    "Consultar compras, ventas y documentos tributarios cuando exista integración habilitada.",
    "Revisar movimientos y saldos bancarios autorizados.",
    "Cruzar facturas y movimientos para sugerir conciliaciones, sin afirmar certeza sin regla ni evidencia.",
    "Consultar estados de Previred u otras fuentes laborales cuando exista acceso.",
    "Preparar reportes, resúmenes y alertas.",
    "Generar o preparar documentos y registros para revisión.",
    "Actualizar CRM, ERP o base de datos.",
    "Disparar cobranza o tareas hacia otros procesos.",
  ],
  hub: ["SII", "Bancos", "Previred", "ERP", "CRM", "Bases de datos", "Documentos"],
  hubNote: "Según integración, permisos y alcance.",
  flow: [
    { title: "Pregunta / evento", input: "«¿Qué facturas siguen pendientes?»", result: "Consulta recibida" },
    { title: "Consulta fuentes", input: "Facturas y movimientos (simulado)", result: "Datos reunidos" },
    { title: "Cruza / reglas", input: "Facturas + movimientos", result: "Un movimiento con monto similar" },
    { title: "Presenta resultado", input: "Cruce", result: "FAC-DEMO-1042: requiere revisión" },
    { title: "Revisión si aplica", input: "Resultado", result: "Una persona confirma antes de continuar" },
    { title: "Actualiza / ejecuta", input: "Confirmación", result: "Enviada al flujo de Cobranza (ejemplo)" },
    { title: "Registra trazabilidad", input: "Acción ejecutada", result: "Seguimiento registrado con su historial" },
  ],
  principles: [
    { title: "Permisos mínimos", body: "El agente accede solo a lo que el proceso necesita." },
    { title: "Confirmación humana en acciones sensibles", body: "Preparar, confirmar y recién ejecutar." },
    { title: "Trazabilidad", body: "Cada paso deja un registro que tu equipo puede revisar." },
  ],
  faq: [
    {
      question: "¿Qué sistemas puede utilizar?",
      answer:
        "Los que podamos integrar de forma segura mediante conector, MCP, API o webhook y para los que existan permisos adecuados.",
    },
    {
      question: "¿Puede trabajar con SII, bancos o Previred?",
      answer: "Según integración, permisos y alcance. Lo revisamos para cada caso antes de confirmarlo.",
    },
    {
      question: "¿Puede preparar documentos?",
      answer: "Puede preparar documentos y registros para revisión de una persona.",
    },
    {
      question: "¿Cómo se cuida la seguridad?",
      answer:
        "Con permisos mínimos y trazabilidad. Las credenciales no se muestran ni se guardan en la interfaz pública.",
    },
    {
      question: "¿Qué requiere confirmación?",
      answer: "Las acciones sensibles pasan por Preparar, Confirmación humana y Ejecutar.",
    },
    {
      question: "¿Reemplaza a mi contador?",
      answer:
        "El agente ayuda con tareas operativas y datos; las decisiones y obligaciones profesionales siguen bajo las personas responsables.",
    },
  ],
} as const;
