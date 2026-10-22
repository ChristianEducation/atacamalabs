/**
 * Atacama OS · foco comercial por rubro (octubre 2026) — núcleo puro.
 * Los 3 flancos: corredoras de propiedades, clínicas/consultas de salud y casinos/alimentación (colegios y empresas).
 * Secuencia de 4 correos (días hábiles 0 / 4 / 9 / 18): el 1.º lo redacta Hermes con el Playbook; el 2.º (followup_1) habla del dolor del rubro,
 * el 3.º (followup_2) entrega un valor práctico y el 4.º (followup_3) cierra el hilo sin presión. Nada se envía solo: Christian aprueba desde /ops.
 *
 * Las funciones se incrustan en n8n con Function.prototype.toString: sin imports, sin constantes de módulo, sin helpers no exportados.
 * Los textos no prometen demos, ejemplos, propuestas, precios ni reuniones (Playbook v1.0 §13) y no afirman nada sobre la empresa:
 * hablan de lo que «suele ocurrir» en ese tipo de operación.
 */

export function ftNorm(s) { return String(s == null ? '' : s).normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase(); }

/** Rubro del prospecto: corredoras | clinicas | casinos_colegios | casinos_empresas | null. Respeta canonical.vertical si Hermes lo marcó. */
export function verticalOf(cand) {
  const c = (cand && cand.canonical) || {};
  const explicit = ftNorm(c.vertical || (cand && cand.vertical) || '');
  if (['corredoras', 'clinicas', 'casinos_colegios', 'casinos_empresas'].includes(explicit)) return explicit;
  const ind = ftNorm((c.industry || (cand && cand.industry) || '')).trim();
  if (['corredoras', 'clinicas', 'casinos_colegios', 'casinos_empresas'].includes(ind)) return ind; // el Gateway guarda vertical→industry
  const t = ftNorm([cand && cand.company_name, c.industry, cand && cand.industry, cand && cand.domain, c.website].join(' '));
  const food = /\b(casino|casinos|cafeteria|cafeterias|comedor|comedores|concesion|concesionaria|concesionario|alimentacion|almuerzo|almuerzos|colaciones|catering|banqueteria|servicios de alimentacion)\b/.test(t);
  const school = /\b(colegio|colegios|escolar|escolares|liceo|escuela|jardin infantil|alumnos|apoderados|sostenedor)\b/.test(t);
  if (food && school) return 'casinos_colegios';
  if (food) return 'casinos_empresas';
  if (/\b(corredor de propiedades|corredora de propiedades|corredores de propiedades|corredoras de propiedades|inmobiliaria|inmobiliarias|propiedades|propiedad|corretaje|bienes raices|arriendo de (casas|departamentos|propiedades|oficinas|inmuebles)|administracion de arriendos)\b/.test(t)) return 'corredoras';
  if (/\b(clinica|clinicas|dental|dentista|dentistas|odontolog\w*|veterinari\w*|kinesiolog\w*|psicolog\w*|fonoaudiolog\w*|nutricionista|centro medico|centro de salud|medic[oa]s?|podolog\w*|oftalmolog\w*|pediatr\w*|laboratorio clinico)\b/.test(t)) return 'clinicas';
  return null;
}

/** Cuerpo (sin saludo ni firma) del seguimiento `kind` para un rubro. kind: followup_1 (dolor) | followup_2 (valor) | followup_3 (cierre). */
export function followupBody(kind, vertical) {
  const intro = 'Retomo mi correo anterior con un poco más de contexto.\n\n';
  const valor = 'Les dejo algo que sirve aunque no cambien nada de su operación.\n\n';
  const cierre = (que) => 'Cierro el hilo por acá para no insistir.\n\nSi en algún momento quieren ' + que + ', encantado de conversarlo. Y si este tema no corresponde a su equipo, agradezco que me indiquen con quién conviene hablar.';
  const T = {
    corredoras: {
      followup_1: intro + 'En una corredora, cada propiedad en arriendo recibe postulaciones por distintos lados (portales, WhatsApp, correo) y casi todas llegan incompletas. Alguien tiene que pedir los documentos que faltan, revisar que se cumplan los requisitos del propietario (renta, antigüedad laboral, aval) y recién ahí decidir a quién mostrarle. Ese trabajo se repite igual con cada postulante y suele consumir tiempo antes de llegar a la visita.\n\nArmamos agentes que reciben esas postulaciones, piden lo que falta, las comparan con los requisitos que defina cada corredora y dejan ordenadas las que cumplen, para que la decisión siga siendo de ustedes.\n\n¿Les haría sentido conversar sobre cómo ordenar esa etapa?',
      followup_2: valor + 'Las postulaciones que más tiempo consumen suelen ser las que llegan sin lo básico. Una lista corta para pedir todo de una vez evita varios mensajes de ida y vuelta: liquidaciones de sueldo recientes, contrato y antigüedad laboral, cédula de identidad vigente, informe comercial y los datos del aval o codeudor, si el propietario lo exige.\n\nOtra práctica que ayuda es dejar escritos los requisitos de cada propiedad antes de publicarla, de modo que quien postula sepa desde el inicio si cumple o no. Con eso se descartan solas varias consultas que hoy se revisan una a una.\n\n¿Cómo ordenan hoy la revisión de postulaciones: a mano, con una planilla u otra herramienta?',
      followup_3: cierre('ordenar la recepción y revisión de postulaciones, o cualquier otra tarea repetitiva de la corredora'),
    },
    clinicas: {
      followup_1: intro + 'En una consulta o clínica pequeña, buena parte del día se va en lo mismo: responder por WhatsApp quién atiende, qué horas hay y cuánto cuesta una primera consulta, y después confirmar cada cita para que el paciente no falte. Cuando alguien no avisa, esa hora queda vacía y es difícil recuperarla.\n\nArmamos agentes que atienden esas consultas por WhatsApp, agendan según la disponibilidad que ustedes definan, envían recordatorios y confirman la cita, dejando al equipo solo lo que necesita a una persona. Sin diagnósticos ni recomendaciones clínicas.\n\n¿Les haría sentido conversar sobre cómo reducir las inasistencias y el tiempo de coordinación?',
      followup_2: valor + 'Una cuenta simple para ver cuánto pesan las inasistencias: valor de una consulta × pacientes que faltan por semana × 4. Por ejemplo, si faltan 3 pacientes a la semana y la consulta vale $25.000, son $300.000 al mes en horas que no se ocuparon.\n\nLo que suele ayudar es confirmar la cita el día anterior y avisar de nuevo unas horas antes, con la opción de reagendar en el mismo mensaje. Así, quien no puede ir libera la hora a tiempo para que otro paciente la tome.\n\n¿Hoy cómo confirman las citas: lo hace alguien del equipo o ya usan algún sistema?',
      followup_3: cierre('aliviar la coordinación de citas o las consultas repetidas por WhatsApp'),
    },
    casinos_colegios: {
      followup_1: intro + 'En los casinos donde las familias pagan por transferencia, el trabajo de todos los días suele ser el mismo: llegan comprobantes por WhatsApp, alguien los revisa uno por uno, los cruza con la lista de pedidos y después persigue los pagos pendientes. Mientras más alumnos, más tiempo toma, y los cambios de último minuto y las anulaciones lo complican.\n\nTenemos una solución empaquetada para casinos: un panel donde quedan los pedidos y los pagos, un agente de WhatsApp que atiende a las familias según las reglas del casino y otro que apoya al equipo en consultas sobre la información.\n\n¿Les haría sentido conversar sobre cómo ordenar ese proceso?',
      followup_2: valor + 'Una forma de medir cuánto pesa hoy el cruce de pagos: comprobantes que reciben por día × minutos que toma revisar y anotar cada uno. Por ejemplo, 80 comprobantes al día × 2 minutos son más de 2 horas diarias solo en conciliar, sin contar los pagos pendientes.\n\nTres cosas ayudan incluso sin automatizar: fijar una hora de corte única para pedidos y cambios, pedir que cada comprobante indique nombre y curso del alumno, y llevar los pagos pendientes en una sola lista y no repartidos en varios chats.\n\n¿Cómo llevan hoy el cruce entre los pagos y los pedidos?',
      followup_3: cierre('ordenar los pedidos y pagos del casino'),
    },
    casinos_empresas: {
      followup_1: intro + 'En los servicios de alimentación para empresas, un trabajo constante es registrar el pedido de cada persona o turno, ya sea en planillas, formularios o mensajes, y después cuadrar las raciones entregadas con lo que se factura al cliente. Los cambios de turno, las anulaciones y las opciones de menú hacen que ese registro se rehaga seguido.\n\nTenemos una solución empaquetada para operaciones de alimentación: cada usuario registra su pedido, el equipo ve en un panel lo que debe producir cada día, y un agente de WhatsApp atiende consultas, cambios y anulaciones según las reglas del servicio.\n\n¿Les haría sentido conversar sobre cómo mejorar ese proceso?',
      followup_2: valor + 'Una forma simple de ver cuánto cuesta el registro manual: pedidos que consolidan por día × minutos que toma anotarlos, corregirlos y pasarlos a la planilla maestra. Por ejemplo, 150 pedidos al día × 1 minuto son 2,5 horas diarias, antes de contar correcciones.\n\nTres cosas ayudan aunque se mantenga Excel: fijar una hora de corte para pedidos y cambios, limitar las opciones de menú por día y llevar una sola planilla maestra y no una por turno. Si hoy cada turno entrega su pedido en un formato distinto, unificarlo en un solo formulario simple suele ser el primer paso más barato.\n\n¿Cómo registran hoy los pedidos de cada turno?',
      followup_3: cierre('mejorar el registro y la gestión de pedidos del servicio'),
    },
    generico: {
      followup_1: intro + 'En muchas empresas hay un trabajo previo que se repite todos los días: recibir solicitudes por distintos canales, pedir los datos que faltan, registrarlas y derivarlas a quien corresponde. Cuando eso depende de una sola persona, cualquier pico de trabajo lo retrasa, y los errores aparecen justo en ese traspaso: datos incompletos, mensajes que se pierden entre canales o respuestas que llegan tarde.\n\nArmamos agentes que se hacen cargo de esa primera parte, dejan cada solicitud registrada y completa, y la derivan al equipo cuando realmente necesita a una persona.\n\n¿Hay alguna parte de este proceso que hoy les esté quitando más tiempo?',
      followup_2: valor + 'Una forma simple de ver cuánto pesa ese trabajo: solicitudes que entran por día × minutos que toma la primera revisión. Por ejemplo, 40 solicitudes al día × 3 minutos son 2 horas diarias antes de empezar a resolver nada.\n\nTres cosas ayudan incluso sin automatizar: definir qué datos mínimos se piden siempre, usar un solo canal de registro y fijar quién responde cada tipo de solicitud. Si quieren medirlo antes de cambiar nada, lleven una semana una lista simple de cuántas solicitudes entran y cuánto toma cada una: con eso el costo real queda a la vista.\n\n¿Cómo ordenan hoy esa primera revisión?',
      followup_3: cierre('ordenar esa primera etapa de atención u otra tarea repetitiva'),
    },
  };
  const set = T[vertical] || T.generico;
  return set[kind] || set.followup_1;
}
