/**
 * Atacama OS · Estándar de correos comerciales V2 (aprobado por Christian el 3-nov-2026) — plantillas de respaldo por rubro.
 * Fuente de verdad del estilo: brand/outreach/ATACAMA-LABS-ESTILO-CORREOS.md (la guía V2 con la precisión de las tres viñetas) y PLAYBOOK-CORREOS-OUTBOUND.md v2.0.
 *
 * Estructura: asunto específico · «Estimado/a …:» · «Junto con saludar, espero que se encuentre muy bien.» · presentación breve ·
 * «En el sector X, por ejemplo, podemos ayudar a:» + TRES viñetas «Beneficio: solución concreta» · enfoque · invitación cordial a una breve conversación · «Quedo atento…».
 * La firma («Saludos cordiales,» + bloque corporativo) la agrega el sistema al enviar: el cuerpo termina en «Quedo atento a sus comentarios.».
 *
 * Funciones AUTOCONTENIDAS (sin imports ni constantes de módulo): se incrustan con Function.prototype.toString en los workflows n8n 18, 19 y 21.
 * Son solo una base honesta para cuando Hermes no entrega borrador: contact-prep las reescribe con la investigación real de cada prospecto.
 */

/** Kit de contenido según el rubro. hint = texto libre (rubro, vertical, categoría, nombre de la empresa). */
export function emailKitV2(hint, company) {
  const norm = String(hint == null ? '' : hint).normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
  const co = String(company || 'su empresa');
  const kits = {
    seguros: {
      key: 'seguros', sector: 'corretaje de seguros', subject: 'Seguimiento de cotizaciones y renovaciones en ' + co,
      bullets: [
        'Evitar oportunidades de venta perdidas: atendiendo y dando seguimiento a potenciales clientes.',
        'Reducir cotizaciones sin respuesta: automatizando el seguimiento comercial.',
        'Disminuir tareas administrativas: conectando WhatsApp, correo y CRM.',
      ],
    },
    hoteles: {
      key: 'hoteles', sector: 'hotelería y alojamiento', subject: 'Atención y seguimiento de consultas en ' + co,
      bullets: [
        'Evitar consultas de reserva sin respuesta: atendiendo preguntas sobre habitaciones, servicios y disponibilidad según los datos conectados.',
        'Reducir reservas que no se concretan: organizando las solicitudes y haciendo seguimiento a quienes consultaron.',
        'Disminuir la coordinación manual: conectando los canales de atención con el sistema de reservas o la operación interna, cuando existan integraciones viables.',
      ],
    },
    restaurantes: {
      key: 'restaurantes', sector: 'gastronomía', subject: 'Coordinación de pedidos y consultas en ' + co,
      bullets: [
        'Evitar consultas sin respuesta: atendiendo preguntas sobre carta, horarios y pedidos desde los canales digitales.',
        'Reducir errores en los pedidos: coordinando su estado entre el cliente y la operación.',
        'Disminuir tareas manuales: conectando canales de venta, pedidos y sistemas internos cuando sea técnicamente posible.',
      ],
    },
    casinos_colegios: {
      key: 'casinos_colegios', sector: 'alimentación escolar', subject: 'Coordinación de pedidos y pagos en ' + co,
      bullets: [
        'Evitar pagos y comprobantes sin cuadrar: reuniendo pedidos y pagos en una plataforma, con agentes que ayudan a revisarlos y a dar seguimiento a los pendientes.',
        'Reducir consultas repetidas de las familias: atendiendo por WhatsApp dudas sobre pedidos, menús y pagos.',
        'Disminuir el trabajo manual del equipo: con agentes que apoyan por dentro, preparando avisos, reportes y seguimiento de incidencias.',
      ],
    },
    casinos_empresas: {
      key: 'casinos_empresas', sector: 'alimentación para empresas', subject: 'Coordinación de pedidos por turno en ' + co,
      bullets: [
        'Evitar errores en pedidos y raciones: registrando las solicitudes de cada turno en un solo lugar.',
        'Reducir mensajes y llamadas repetidas: atendiendo por WhatsApp consultas y cambios de los usuarios.',
        'Disminuir el trabajo en planillas: conectando pedidos, producción y reportes con los sistemas que ya usan.',
      ],
    },
    salud: {
      key: 'salud', sector: 'salud y atención de pacientes', subject: 'Atención y seguimiento de consultas en ' + co,
      bullets: [
        'Reducir horas perdidas por inasistencias: recordando citas y facilitando su confirmación o reagendamiento.',
        'Evitar consultas sin respuesta: orientando sobre servicios y pasos para solicitar una hora, también fuera del horario de atención.',
        'Disminuir tareas administrativas: coordinando las comunicaciones con agendas y sistemas autorizados, resguardando la privacidad de los pacientes.',
      ],
    },
    corredoras: {
      key: 'corredoras', sector: 'corretaje de propiedades', subject: 'Postulaciones de arriendo en ' + co,
      bullets: [
        'Evitar postulaciones que se pierden entre mensajes: recibiendo cada postulación, pidiendo los antecedentes que faltan y dejando ordenadas las que cumplen los requisitos de cada propietario.',
        'Reducir el vaivén de consultas: respondiendo preguntas frecuentes sobre las propiedades y haciendo seguimiento a quienes aún no completan su postulación.',
        'Disminuir tareas administrativas: conectando WhatsApp, correo y planillas o CRM para que la información quede en un solo lugar.',
      ],
    },
    generico: {
      key: 'generico', sector: '', subject: 'Una idea para mejorar los procesos de ' + co,
      bullets: [
        'Evitar solicitudes que se pierden: recibiendo, ordenando y dando seguimiento a cada consulta.',
        'Reducir el trabajo repetitivo: automatizando respuestas y tareas que hoy ocupan al equipo.',
        'Disminuir tareas administrativas: conectando WhatsApp, correo y las herramientas que ya usan.',
      ],
    },
  };
  let key = 'generico';
  if (/seguro|aseguradora/.test(norm)) key = 'seguros';
  else if (/hotel|alojamiento|hostal|hostel|cabana|turismo|resort/.test(norm)) key = 'hoteles';
  else if (/restaurant|cafeteria|gastronom|comida|pasteleria|panaderia/.test(norm)) key = 'restaurantes';
  else if (/colegio|escolar|apoderad|casino.*(colegio|escuela)|alimentacion.*(colegio|escuela)/.test(norm)) key = 'casinos_colegios';
  else if (/casino|alimentacion|catering|servicio de alimentos|servicios de alimentos/.test(norm)) key = 'casinos_empresas';
  else if (/clinic|dental|odonto|veterin|salud|medic|kinesi|psicolog|laboratorio|paciente/.test(norm)) key = 'salud';
  else if (/corredor|propiedad|inmobiliar|arriendo|corretaje/.test(norm)) key = 'corredoras';
  return kits[key];
}

/**
 * Correo inicial V2 completo (sin firma). o = { company, firstName?, hint? }.
 * Con firstName saluda «Estimado/a Nombre:» (singular); sin nombre confiable, «Estimado equipo de Empresa:» (plural).
 */
export function emailDraftV2(o) {
  const x = o && typeof o === 'object' ? o : {};
  const company = String(x.company || 'su empresa').trim();
  const first = String(x.firstName || '').trim().split(/\s+/)[0];
  const kit = emailKitV2((x.hint || '') + ' ' + company, company);
  const plural = !first;
  const greet = first ? 'Estimado/a ' + first + ':' : 'Estimado equipo de ' + company + ':';
  const cordial = plural ? 'Junto con saludar, espero que se encuentren muy bien.' : 'Junto con saludar, espero que se encuentre muy bien.';
  const intro = (plural ? 'Les escribo' : 'Le escribo') + ' desde Atacama Labs, empresa especializada en agentes de inteligencia artificial, automatización e integración de sistemas. Ayudamos a simplificar tareas operativas y comerciales con soluciones que se conectan con las herramientas que ya usan.';
  const lead = kit.sector ? 'En el sector ' + kit.sector + ', por ejemplo, podemos ayudar a:' : 'En empresas como ' + company + ', por ejemplo, podemos ayudar a:';
  const approach = 'Primero entendemos cómo trabaja cada empresa y después elegimos la tecnología.';
  const close = (plural ? 'Me gustaría mostrarles' : 'Me gustaría mostrarle') + ' cómo alguna de estas soluciones podría aplicarse a ' + company + '. ' + (plural ? 'Si les resulta interesante, con gusto podemos coordinar una breve conversación.' : 'Si le resulta interesante, con gusto podemos coordinar una breve conversación.');
  const body = [greet, cordial, intro, lead, kit.bullets.map((b) => '- ' + b).join('\n'), approach, close, 'Quedo atento a sus comentarios.'].join('\n\n');
  return { subject: kit.subject, body, kit: kit.key };
}
