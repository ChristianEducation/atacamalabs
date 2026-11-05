import Image from "next/image";
import aster from "@/content/aster.json";
import { AmbientVideo, DemoVideo, StickyCta, WhatsAppIcon } from "./AsterClient";
import "./aster.css";

const CTA_LABEL = "Prueba un agente";
const CTA_TALK = "Hablemos de tu operación";

/** wa.me SIN texto precargado. Solo se publica si el número es válido (E.164 sin "+"). */
function whatsappHref(e164: string | null): string | null {
  if (!e164 || !/^\d{8,15}$/.test(e164)) return null;
  return `https://wa.me/${e164}`;
}

const benefits = [
  {
    n: "01",
    title: "Menos tiempo reportando",
    text: "Audios y registros naturales que el agente transforma en información estructurada. Nadie vuelve a pasar notas a un formulario.",
  },
  {
    n: "02",
    title: "Pendientes que no se pierden",
    text: "Responsables, tareas, plazos y seguimiento hasta su cierre, sin planillas ni correos de por medio.",
  },
  {
    n: "03",
    title: "Información conectada",
    text: "Cruza reportes, historial de equipos y datos operacionales para detectar señales de alerta a tiempo.",
  },
];

const signals = [
  { title: "Un equipo que se repite", text: "La misma bomba aparece en varios reportes del mes. El agente la cruza con su historial de mantenimiento y avisa." },
  { title: "Un pendiente sin dueño", text: "Un hallazgo sigue abierto, sin responsable ni fecha. El agente lo asigna, da seguimiento y recuerda hasta cerrarlo." },
  { title: "Una inspección que vence", text: "Cruza plazos, órdenes de trabajo y turnos para avisar antes de que algo venza." },
  { title: "Una advertencia que no llegó a nadie", text: "Algo dicho en terreno que no se convirtió en acción. El agente lo detecta y lo lleva a quien corresponde." },
];

const systems = [
  { name: "ERP", text: "Órdenes de trabajo, compras e inventario." },
  { name: "Mantenimiento (CMMS / EAM)", text: "Avisos, historial de equipos y planes." },
  { name: "Seguridad y prevención", text: "Reportes, hallazgos y acciones correctivas." },
  { name: "Sistemas internos", text: "Planillas, bases de datos y herramientas propias." },
  { name: "Correo y agenda", text: "Avisos, recordatorios y coordinación." },
  { name: "Mensajería", text: "WhatsApp y los canales que tu equipo ya usa." },
];

function Check() {
  return (
    <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M5 12.5l4.2 4.2L19 7" />
    </svg>
  );
}

function Cta({ href, id, block }: { href: string | null; id?: string; block?: boolean }) {
  return href ? (
    <a id={id} className={`mk-btn mk-btn--primary${block ? " mk-btn--block" : ""}`} href={href} target="_blank" rel="noopener noreferrer">
      <WhatsAppIcon />
      {CTA_LABEL}
    </a>
  ) : (
    <span className="mk-btn mk-btn--primary ast-btn-off" aria-disabled="true">
      {CTA_LABEL}
    </span>
  );
}

export default function AsterPage() {
  const href = whatsappHref(aster.whatsappE164);
  const showStagingWarning = !href && process.env.VERCEL_ENV !== "production";
  const talkHref = `${aster.mainSiteUrl}/diagnostico`;

  return (
    <div className="ast-root">
      <a href="#contenido" className="mk-skip">
        Saltar al contenido
      </a>
      <header className="ast-header">
        <div className="ast-wrap ast-header__row">
          <a href={aster.mainSiteUrl} aria-label="Atacama Labs, ir al sitio principal" className="ast-header__logo">
            <Image src="/brand/logo-horizontal.svg" alt="Atacama Labs" width={190} height={18} priority />
          </a>
          <span className="ast-header__tag">Agentes de IA</span>
        </div>
      </header>

      <main id="contenido" tabIndex={-1}>
        {/* 1 · HERO */}
        <section className="ast-hero" aria-labelledby="ast-h1">
          <div className="ast-wrap ast-hero__grid">
            <div className="ast-hero__copy">
              <p className="mk-eyebrow ast-eyebrow">Agentes de IA para empresas mineras e industriales</p>
              <h1 id="ast-h1" className="ast-h1">
                Lo que ocurre en terreno <em>no debería quedarse en un informe.</em>
              </h1>
              <p className="ast-lead">
                Creamos agentes de IA que convierten reportes y observaciones en información útil para dar seguimiento a tareas, conectar sistemas y detectar pendientes. Menos trabajo administrativo. Más tiempo para operar.
              </p>
              <div className="ast-hero__cta">
                <Cta href={href} id="ast-cta-main" />
                <a className="mk-btn mk-btn--secondary" href={talkHref}>
                  {CTA_TALK}
                </a>
              </div>
              <p className="ast-micro">Se abre WhatsApp · sin registro</p>
              {showStagingWarning ? (
                <p className="ast-staging" role="status">
                  Aviso de staging: falta un número de WhatsApp válido en <code>src/content/aster.json</code>. El botón no se publica sin él.
                </p>
              ) : null}
            </div>
            <div className="ast-hero__media">
              <AmbientVideo src={aster.loop} poster={aster.loopPoster} label="Panorámica del desierto al amanecer, con una planta industrial a lo lejos" />
              <div className="ast-loop__tags" aria-hidden="true">
                <span>Reporte</span>
                <i />
                <span>Seguimiento</span>
                <i />
                <span className="ast-loop__tag--on">Alerta</span>
              </div>
            </div>
          </div>
        </section>

        {/* 2 · BENEFICIOS */}
        <section className="ast-section" aria-labelledby="ast-how">
          <div className="ast-wrap">
            <p className="mk-eyebrow ast-eyebrow">Qué cambia en tu operación</p>
            <h2 id="ast-how" className="ast-h2">
              Menos administración. <em>Más tiempo para lo importante.</em>
            </h2>
            <p className="ast-p ast-p--lead">
              Un agente de IA se encarga de registrar, ordenar, cruzar y dar seguimiento. Tu equipo se enfoca en operar.
            </p>
            <ol className="ast-steps">
              {benefits.map((b) => (
                <li key={b.n} className="ast-step">
                  <span className="ast-step__n" aria-hidden="true">{b.n}</span>
                  <h3>{b.title}</h3>
                  <p>{b.text}</p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        {/* 3 · VIDEO */}
        <section className="ast-section ast-section--dark" aria-labelledby="ast-video-h">
          <div className="ast-wrap ast-video">
            <div className="ast-video__copy">
              <p className="mk-eyebrow ast-eyebrow ast-eyebrow--dark">45 segundos</p>
              <h2 id="ast-video-h" className="ast-h2">
                Un turno cualquiera, <em>con un agente de por medio.</em>
              </h2>
              <p className="ast-p ast-p--dark">
                Una observación, una falla, un pendiente: pasa todos los días. Mira cómo un agente lo registra, lo organiza y, conectado a tus sistemas, da seguimiento y detecta alertas.
              </p>
              <p className="ast-note">Escenas recreadas con herramientas de IA; no corresponden a una instalación específica.</p>
            </div>
            <DemoVideo src={aster.video} poster={aster.videoPoster} />
          </div>
        </section>

        {/* 4 · SEÑALES */}
        <section className="ast-section" aria-labelledby="ast-sig-h">
          <div className="ast-wrap">
            <p className="mk-eyebrow ast-eyebrow">Con tus sistemas conectados</p>
            <h2 id="ast-sig-h" className="ast-h2">
              Lo que hoy nadie tiene tiempo de <em>cruzar y vigilar.</em>
            </h2>
            <p className="ast-p ast-p--lead">
              Cuando el agente conoce tus reportes, tus equipos y tus plazos, puede dar seguimiento y avisar a tiempo. Algunos ejemplos:
            </p>
            <ul className="ast-signals">
              {signals.map((s) => (
                <li key={s.title} className="ast-sig">
                  <h3>{s.title}</h3>
                  <p>{s.text}</p>
                </li>
              ))}
            </ul>
            <p className="ast-note ast-note--light">Ejemplos de lo que construimos al integrar agentes con los sistemas y procesos de cada operación.</p>
          </div>
        </section>

        {/* 5 · INTEGRACIONES */}
        <section className="ast-section ast-section--paper" aria-labelledby="ast-int">
          <div className="ast-wrap">
            <p className="mk-eyebrow ast-eyebrow">Se conecta a lo que ya usas</p>
            <h2 id="ast-int" className="ast-h2">
              Un agente que trabaja <em>dentro de tus sistemas.</em>
            </h2>
            <p className="ast-p ast-p--lead">
              No reemplazamos lo que ya funciona. Conectamos el agente a tus herramientas para que lea, registre y dé seguimiento donde tu equipo ya trabaja.
            </p>
            <ul className="ast-systems">
              {systems.map((s) => (
                <li key={s.name} className="ast-system">
                  <h3>{s.name}</h3>
                  <p>{s.text}</p>
                </li>
              ))}
            </ul>
            <p className="ast-note ast-note--light">Cada integración se diseña con tu equipo, según tus sistemas y procesos.</p>
          </div>
        </section>

        {/* 6 · PRUEBA (única mención de la demostración) */}
        <section className="ast-section" aria-labelledby="ast-doc">
          <div className="ast-wrap ast-doc">
            <div className="ast-doc__img">
              <Image src={aster.pdfImage} alt="Informe técnico de terreno de Atacama Labs generado por el agente, con el logotipo oficial, datos del equipo, observaciones y pendientes" width={900} height={1273} sizes="(max-width: 860px) 88vw, 460px" />
            </div>
            <div className="ast-doc__copy">
              <p className="mk-eyebrow ast-eyebrow">Ya funciona hoy</p>
              <h2 id="ast-doc" className="ast-h2">
                Pruébalo: <em>envía un audio y recibe un documento.</em>
              </h2>
              <p className="ast-p">
                Es una tarea real. El agente escucha tu audio, ordena la información y te entrega un informe por WhatsApp. El seguimiento, el cruce de datos y las alertas se construyen al conectarlo con los sistemas de tu operación.
              </p>
              <ul className="ast-list">
                <li><Check />Escucha un audio, sin formularios.</li>
                <li><Check />Ordena hechos, acciones y pendientes; lo no informado queda como «No informado».</li>
                <li><Check />Entrega un documento con identidad corporativa, listo para compartir.</li>
              </ul>
              <div className="ast-doc__actions">
                <Cta href={href} />
                <a className="mk-btn mk-btn--secondary" href={aster.pdfFile} target="_blank" rel="noopener noreferrer">
                  Ver el PDF de ejemplo
                </a>
              </div>
              <p className="ast-note ast-note--light">Usa un caso ficticio, sin datos reservados. El documento de ejemplo tiene datos ficticios.</p>
            </div>
          </div>
        </section>

        {/* 7 · CTA FINAL */}
        <section className="ast-section ast-section--dark ast-final" aria-labelledby="ast-final-h">
          <div className="ast-wrap ast-final__box">
            <h2 id="ast-final-h" className="ast-h2 ast-h2--center">
              Cuéntanos tu operación. <em>Construimos el agente.</em>
            </h2>
            <p className="ast-p ast-p--dark ast-p--center">
              Hoy conversamos con empresas mineras e industriales, pero desarrollamos agentes que trabajan en cualquier operación: entendemos tus procesos, los conectamos a tus sistemas y los ponemos a trabajar.
            </p>
            <div className="ast-final__actions">
              <a className="mk-btn mk-btn--white mk-btn--block" href={talkHref}>
                {CTA_TALK}
              </a>
              <Cta href={href} block />
            </div>
          </div>
        </section>
      </main>

      <footer className="ast-footer">
        <div className="ast-wrap ast-footer__row">
          <Image src="/brand/logo-horizontal-fondo-oscuro.svg" alt="Atacama Labs" width={170} height={16} />
          <p>Tecnología para el trabajo real · Antofagasta, Chile</p>
          <a href={aster.mainSiteUrl}>atacamalabs.cl</a>
        </div>
      </footer>

      <StickyCta href={href} label={CTA_LABEL} />
    </div>
  );
}
