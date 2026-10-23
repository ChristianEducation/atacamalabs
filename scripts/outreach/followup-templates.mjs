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
export function followupBody(kind, vertical, variant) {
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
  const v = Number(variant) || 0; // 0 = esta versión (A); 1 y 2 = variantes B y C (followupAlt)
  if (v > 0) { const alt = followupAlt(kind, vertical)[kind in set ? v - 1 : 0]; if (alt) return alt; }
  return set[kind] || set.followup_1;
}

/** Elige la variante (0, 1 o 2) de forma estable para un prospecto y un paso: así los textos no son idénticos entre prospectos y una nueva corrida repite la misma. */
export function ftPick(seed, n) {
  const s = String(seed == null ? '' : seed);
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619) >>> 0; }
  return h % (n > 0 ? n : 1);
}

/** Variantes B y C de cada paso y rubro (la A vive en followupBody). Mismo contenido y mismas reglas, distinta forma: escena, día a día, dato práctico, lista corta. */
export function followupAlt(kind, vertical) {
  const A = {
    corredoras: {
      followup_1: [
        `Les escribo de nuevo porque el tema del correo anterior se entiende mejor con un caso concreto.

Imaginen que se publica una propiedad en arriendo y en un par de días llegan varias postulaciones: unas por el portal, otras por WhatsApp, otras por correo, casi todas con papeles faltantes. Cada una exige tiempo: pedir lo que falta, ordenar los antecedentes y revisar que se cumplan los requisitos del propietario antes de decidir a quién mostrarle la propiedad.

En Atacama Labs armamos agentes que reciben esas postulaciones, solicitan lo pendiente y dejan ordenadas las que cumplen, para que la decisión final siga en manos de ustedes.

¿Cómo se organizan hoy cuando entran varias postulaciones a la vez?`,
        `Quiero contarles cómo se ve este trabajo en el día a día de una corredora.

Una postulación rara vez llega completa. Hay que escribirle al interesado, esperar los documentos, abrirlos uno por uno y compararlos con lo que pide cada propietario: renta, antigüedad laboral, aval. Cuando salen varias propiedades juntas, el tiempo para darle atención a cada postulante se vuelve el verdadero límite.

Lo que hacemos en Atacama Labs es poner un agente a cargo de esa primera revisión: recibe, pide lo que falta y entrega las postulaciones ordenadas y listas para que ustedes decidan.

¿Les haría sentido conversar sobre cómo liberar ese tiempo?`,
      ],
      followup_2: [
        `Un dato que puede serles útil, sin importar si trabajamos juntos.

Cuando una postulación llega incompleta, lo que más tiempo roba es la ida y vuelta para pedir cada documento por separado. Se evita enviando, desde el primer mensaje, la lista completa de lo que se necesita: liquidaciones recientes, contrato de trabajo, cédula vigente, informe comercial y datos del aval si corresponde.

Ayuda también publicar los requisitos junto con la propiedad, de modo que el postulante se autofiltre antes de escribir. Con esas dos cosas, la revisión parte de postulaciones más completas y más parejas, y el tiempo se dedica a las que realmente califican.

¿Hoy piden toda la documentación en el primer contacto o la van pidiendo de a poco?`,
        `Les comparto algo práctico que se puede aplicar desde hoy.

Antes de revisar una postulación a fondo, conviene que pase un filtro de tres puntos: documentos básicos completos, renta que alcanza el mínimo del propietario y antigüedad laboral suficiente. Las que no pasan se responden con un mensaje breve y amable, y las que sí pasan se revisan con calma.

Ese orden evita dedicar una hora a una postulación que no cumple el requisito más simple, y deja al equipo más tiempo para las que valen la pena.

¿Aplican hoy algún filtro así o revisan todas con el mismo detalle?`,
      ],
      followup_3: [
        `Dejo este hilo por acá para no insistir.

Si más adelante les hace sentido ordenar la recepción y revisión de postulaciones, con gusto lo conversamos. Y si el tema le corresponde a otra persona de la corredora, les agradezco indicarme con quién conviene hablar.`,
        `No quiero llenarles la bandeja, así que cierro el hilo acá.

Si en algún momento quieren aliviar la revisión de postulaciones, escríbanme cuando prefieran. Y si esto lo ve otra persona del equipo, me ayudaría saber a quién dirigirme.`,
      ],
    },
    clinicas: {
      followup_1: [
        `Les escribo de nuevo porque el tema del correo anterior se entiende mejor con un día de trabajo concreto.

Llegan mensajes por WhatsApp e Instagram preguntando si atienden hoy, cuánto cuesta la primera consulta o si hay hora esta semana. Mientras se responde eso, hay pacientes en sala y citas por confirmar. Lo que no se alcanza a contestar queda pendiente, y la hora de quien no avisa queda vacía.

En Atacama Labs armamos agentes que responden esas consultas, agendan según la disponibilidad que ustedes definan y confirman cada cita, derivando al equipo lo que necesita a una persona. Sin diagnósticos ni consejos clínicos.

¿Cuánto del día se les va hoy en responder y confirmar citas?`,
        `Quiero contarles cómo se ve esto en el día a día de una consulta.

Entre atender pacientes, responder el WhatsApp y confirmar las citas del día siguiente, el tiempo no alcanza para todo. Lo primero que se resiente suele ser la confirmación: un paciente que no avisa deja una hora vacía que ya no se puede ofrecer a otra persona.

En Atacama Labs armamos agentes que toman esa carga: responden dudas frecuentes, agendan, mandan recordatorios y avisan al equipo solo lo que requiere a una persona. Nada de diagnósticos ni recomendaciones clínicas.

¿Les haría sentido conversar sobre cómo reducir las inasistencias?`,
      ],
      followup_2: [
        `Un dato que puede serles útil, sin importar si trabajamos juntos.

Las inasistencias se miden fácil: pacientes que faltan por semana multiplicados por el valor de la consulta. Si faltan 4 pacientes y la consulta vale $20.000, son $80.000 a la semana en horas que no se ocuparon, unos $320.000 al mes.

Una forma simple de recuperar parte de eso es confirmar la cita con un mensaje el día anterior y dejar un botón o una frase para reagendar. Quien no puede asistir avisa a tiempo y la hora vuelve a estar disponible.

¿Cómo confirman hoy las citas del día siguiente?`,
        `Les comparto algo práctico que se puede aplicar desde hoy.

Una lista corta de espera ayuda más de lo que parece: cuando alguien cancela, se le ofrece esa hora a la siguiente persona anotada. Para que funcione, basta con registrar a los pacientes que aceptarían un cupo de último minuto y escribirles apenas se libere una hora.

Combinada con la confirmación del día anterior, reduce las horas perdidas sin cambiar la forma de atender. No exige herramientas nuevas: alcanza con una libreta compartida o una planilla y la disciplina de avisar cada vez que se libera un cupo.

¿Llevan hoy algún registro de pacientes dispuestos a tomar horas liberadas?`,
      ],
      followup_3: [
        `Dejo este hilo por acá para no insistir.

Si más adelante les hace sentido aliviar la coordinación de citas o las consultas repetidas por WhatsApp, con gusto lo conversamos. Y si esto le corresponde a otra persona del equipo, les agradezco indicarme con quién conviene hablar.`,
        `No quiero llenarles la bandeja, así que cierro el hilo acá.

Si en algún momento quieren ordenar la agenda y las confirmaciones, escríbanme cuando prefieran. Y si lo ve otra persona del equipo, me ayudaría saber a quién dirigirme.`,
      ],
    },
    casinos_colegios: {
      followup_1: [
        `Les escribo de nuevo porque el tema del correo anterior se entiende mejor con un día real de casino.

Llegan los comprobantes de transferencia por WhatsApp, uno tras otro. Alguien abre cada imagen, busca el nombre del alumno, lo cruza con el pedido y anota si quedó pagado. Al final del día, la lista de pendientes sigue repartida en varios chats, y los cambios de último minuto o las anulaciones obligan a rehacer parte del trabajo.

Tenemos una solución empaquetada para casinos: un panel con pedidos y pagos en un solo lugar, un agente de WhatsApp para las familias y otro que apoya al equipo con consultas sobre la información.

¿Cuánto tiempo toma hoy dejar al día los pagos de cada jornada?`,
        `Quiero contarles cómo se ve este trabajo desde adentro de un casino escolar.

Cuando las familias pagan por transferencia, cada pago es un pequeño trámite: recibir el comprobante, identificar al alumno, marcar el pedido y recordarle después a quienes quedaron pendientes. Con pocos alumnos se maneja; con cientos, se vuelve un trabajo propio.

En Atacama Labs tenemos una solución empaquetada: los pedidos y los pagos quedan en un panel, un agente atiende a las familias por WhatsApp según las reglas del casino y otro ayuda al equipo a consultar la información.

¿Les haría sentido conversar sobre cómo ordenar esa parte?`,
      ],
      followup_2: [
        `Un dato que puede serles útil, sin importar si trabajamos juntos.

Se puede medir cuánto cuesta cruzar pagos: cantidad de comprobantes por día multiplicada por los minutos que toma revisar cada uno. Por ejemplo, 120 comprobantes a 1,5 minutos son tres horas diarias de trabajo solo en conciliar.

Ayuda pedir que cada transferencia incluya el nombre y el curso del alumno en el mensaje, y fijar una hora de corte para pedidos y cambios. Con eso, el cruce se vuelve mucho más rápido incluso sin automatizar nada. Y si además se avisa a las familias cuál es la hora de corte, disminuyen los pedidos de último minuto.

¿Cómo piden hoy a las familias que identifiquen cada pago?`,
        `Les comparto algo práctico que se puede aplicar desde hoy.

Una sola lista de pagos pendientes, actualizada al cierre de cada día, evita que el seguimiento de cobros quede repartido entre chats y memoria. Basta con una planilla compartida con tres columnas: alumno, monto y fecha del último recordatorio.

Sumada a un recordatorio fijo a mitad de semana, ordena la cobranza sin agregar presión a las familias. Además, deja claro de un vistazo cuánto está pendiente y de quién, que es justo lo que más cuesta reconstruir al final de la semana.

¿Dónde llevan hoy la lista de pagos pendientes?`,
      ],
      followup_3: [
        `Dejo este hilo por acá para no insistir.

Si más adelante les hace sentido ordenar los pedidos y pagos del casino, con gusto lo conversamos. Y si esto le corresponde a otra persona, les agradezco indicarme con quién conviene hablar.`,
        `No quiero llenarles la bandeja, así que cierro el hilo acá.

Si en algún momento quieren aliviar el cruce de pagos y pedidos, escríbanme cuando prefieran. Y si lo ve otra persona del equipo, me ayudaría saber a quién dirigirme.`,
      ],
    },
    casinos_empresas: {
      followup_1: [
        `Les escribo de nuevo porque el tema del correo anterior se entiende mejor con un día de operación.

Cada turno entrega sus pedidos en un formato distinto: una planilla, un mensaje, un formulario. Alguien los junta, corrige duplicados, ajusta por cambios de última hora y recién ahí sabe cuántas raciones producir y cuántas se entregaron para el cierre con el cliente.

Tenemos una solución empaquetada para servicios de alimentación: cada usuario registra su pedido, el equipo ve en un panel lo que hay que producir y un agente de WhatsApp atiende consultas, cambios y anulaciones según las reglas del servicio.

¿Cómo consolidan hoy los pedidos de todos los turnos?`,
        `Quiero contarles cómo se ve este trabajo en una operación de alimentación para empresas.

El pedido de cada persona es pequeño, pero son muchos y llegan por distintos canales. Registrarlos, corregirlos y cuadrarlos con lo que finalmente se entrega consume horas que no se ven en el costo del servicio. Mientras más turnos y más cambios, más pesa ese trabajo invisible.

En Atacama Labs tenemos una solución empaquetada: el usuario registra su pedido, el equipo ve la producción del día en un panel y un agente de WhatsApp resuelve consultas, cambios y anulaciones.

¿Les haría sentido conversar sobre cómo mejorar ese registro?`,
      ],
      followup_2: [
        `Un dato que puede serles útil, sin importar si trabajamos juntos.

Para estimar el costo del registro manual, multipliquen los pedidos que consolidan al día por los minutos que toma anotar y corregir cada uno. Por ejemplo, 200 pedidos a un minuto son más de tres horas diarias.

Tres hábitos reducen ese tiempo incluso con Excel: una hora de corte para pedidos y cambios, un máximo de opciones de menú por día y una sola planilla maestra en vez de una por turno. Con ese orden, el cierre diario con el cliente se arma desde un único lugar y no desde varias versiones.

¿Cuántas planillas distintas manejan hoy para consolidar los pedidos?`,
        `Les comparto algo práctico que se puede aplicar desde hoy.

Definir un formato único de pedido, con los mismos campos para todos los turnos, elimina buena parte de las correcciones: nombre, turno, opción elegida y observaciones. Cuando todos entregan lo mismo, juntar la información toma minutos en vez de horas.

Si además se publica la hora límite para cambios, disminuyen los pedidos que llegan tarde y obligan a rehacer la producción. Son cambios pequeños, pero se notan: menos correcciones, menos llamadas de último minuto y un cierre del día más ordenado.

¿Usan hoy un formato único para todos los turnos?`,
      ],
      followup_3: [
        `Dejo este hilo por acá para no insistir.

Si más adelante les hace sentido mejorar el registro y la gestión de pedidos del servicio, con gusto lo conversamos. Y si esto le corresponde a otra persona, les agradezco indicarme con quién conviene hablar.`,
        `No quiero llenarles la bandeja, así que cierro el hilo acá.

Si en algún momento quieren ordenar el registro de pedidos, escríbanme cuando prefieran. Y si lo ve otra persona del equipo, me ayudaría saber a quién dirigirme.`,
      ],
    },
    generico: {
      followup_1: [
        `Les escribo de nuevo porque el tema del correo anterior se entiende mejor con un caso concreto.

Llega una solicitud por correo, otra por WhatsApp y otra por un formulario. Alguien las reúne, pide los datos que faltan, las registra y las deriva a quien corresponde. Cuando hay un pico de trabajo, esa primera etapa es la que se atrasa y la que más errores acumula.

Armamos agentes que se hacen cargo de esa primera parte: reúnen la información, dejan cada solicitud registrada y completa, y la derivan al equipo cuando necesita a una persona.

¿Qué parte de la atención inicial les toma hoy más tiempo?`,
        `Quiero contarles cómo se ve este trabajo en el día a día de una operación con muchas solicitudes.

Lo difícil rara vez es el trabajo de fondo; es la primera etapa: entender qué pide cada persona, completar lo que falta y dejar el caso listo para quien lo resuelve. Si esa etapa depende de una sola persona, cualquier pico la deja atrasada. Ordenarla bien significa que el equipo empieza cada día con los casos completos, en vez de dedicar horas a reunir datos que alguien ya tenía.

En Atacama Labs armamos agentes que toman esa primera etapa y entregan los casos ordenados al equipo.

¿Les haría sentido conversar sobre cómo aliviar esa parte?`,
      ],
      followup_2: [
        `Un dato que puede serles útil, sin importar si trabajamos juntos.

Para dimensionar la primera revisión, multipliquen las solicitudes que entran por día por los minutos que toma entender y registrar cada una. Por ejemplo, 30 solicitudes a cuatro minutos son dos horas diarias.

Dos cambios ayudan aunque no se automatice nada: fijar los datos mínimos que se piden siempre, y concentrar el registro en un solo canal para que nada quede repartido entre correos y chats. Con eso, medir el tiempo de la primera revisión se vuelve simple, y se ve rápido dónde conviene ordenar primero.

¿Cómo registran hoy las solicitudes que llegan por distintos canales?`,
        `Les comparto algo práctico que se puede aplicar desde hoy.

Una plantilla con los cinco datos que siempre se necesitan para empezar a resolver una solicitud acelera la primera respuesta: quién escribe, qué necesita, para cuándo, con qué antecedentes y cómo contactarlo. Se puede enviar como respuesta automática o pegarse en el primer mensaje.

Con eso, el equipo recibe casos completos y no pasa el día pidiendo datos por separado. Y si un mensaje llega sin esos datos, una respuesta corta que los pida todos de una vez evita varios intercambios y deja el caso listo para trabajar.

¿Piden hoy esos datos desde el primer mensaje?`,
      ],
      followup_3: [
        `Dejo este hilo por acá para no insistir.

Si más adelante les hace sentido ordenar esa primera etapa de atención u otra tarea repetitiva, con gusto lo conversamos. Y si esto le corresponde a otra persona, les agradezco indicarme con quién conviene hablar.`,
        `No quiero llenarles la bandeja, así que cierro el hilo acá.

Si en algún momento quieren aliviar la atención inicial, escríbanme cuando prefieran. Y si lo ve otra persona del equipo, me ayudaría saber a quién dirigirme.`,
      ],
    },
  };
  const set = A[vertical] || A.generico;
  return set[kind] || set.followup_1;
}
