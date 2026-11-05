import Image from "next/image";
import aster from "@/content/aster.json";
import { AmbientVideo, DemoVideo, StickyCta, WhatsAppIcon } from "./AsterClient";
import "./aster.css";

const CTA_LABEL = "Probar con un audio";

/** wa.me SIN texto precargado. Solo se publica si el número es válido (E.164 sin "+"). */
function whatsappHref(e164: string | null): string | null {
  if (!e164 || !/^\d{8,15}$/.test(e164)) return null;
  return `https://wa.me/${e164}`;
}

const steps = [
  { n: "01", title: "Cuéntalo en un audio", text: "Una inspección, una falla, el cierre de un turno. Habla como se lo contarías a un colega." },
  { n: "02", title: "El agente entiende y organiza", text: "Identifica el tipo de documento, ordena hechos, observaciones, acciones y pendientes, y pregunta solo lo esencial." },
  { n: "03", title: "Recibes el documento", text: "Un PDF con la identidad de Atacama Labs, entregado como enlace por WhatsApp. Lo no informado queda como «No informado»." },
];

const today = ["WhatsApp: recibe tu audio y responde", "Plantilla corporativa guardada en Google Drive", "Generación del PDF y entrega del enlace"];
const possible = ["ERP: crear o consultar órdenes y compras", "CRM: registrar contactos y oportunidades", "Mantenimiento: abrir y dar seguimiento a avisos", "Correo y agenda: enviar y coordinar", "Bodega e inventario: stock y solicitudes", "Flujos de aprobación y alertas a quien corresponde"];

function Check() {
  return (
    <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M5 12.5l4.2 4.2L19 7" />
    </svg>
  );
}
function Dashed() {
  return <span className="ast-dashmark" aria-hidden="true" />;
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
          <span className="ast-header__tag">Demostración</span>
        </div>
      </header>

      <main id="contenido" tabIndex={-1}>
        {/* 1 · HERO */}
        <section className="ast-hero" aria-labelledby="ast-h1">
          <div className="ast-wrap ast-hero__grid">
            <div className="ast-hero__copy">
              <p className="mk-eyebrow ast-eyebrow">Agentes de IA para minería e industria</p>
              <h1 id="ast-h1" className="ast-h1">
                De lo que ocurre en terreno a <em>una acción real.</em>
              </h1>
              <p className="ast-lead">
                <strong>Un audio. Un documento. Una acción real.</strong> Nuestros agentes escuchan, organizan la información y ejecutan tareas conectadas a tus herramientas.
              </p>
              <div className="ast-hero__cta">
                <Cta href={href} id="ast-cta-main" />
                <p className="ast-micro">Se abre WhatsApp · sin registro · sin texto que escribir</p>
              </div>
              {showStagingWarning ? (
                <p className="ast-staging" role="status">
                  Aviso de staging: falta un número de WhatsApp válido en <code>src/content/aster.json</code>. El botón no se publica sin él.
                </p>
              ) : null}
            </div>
            <div className="ast-hero__media">
              <AmbientVideo src={aster.loop} poster={aster.loopPoster} label="Panorámica del desierto al amanecer, con una planta industrial a lo lejos" />
            </div>
          </div>
        </section>

        {/* 2 · VIDEO */}
        <section className="ast-section ast-section--dark" aria-labelledby="ast-video-h">
          <div className="ast-wrap ast-video">
            <div className="ast-video__copy">
              <p className="mk-eyebrow ast-eyebrow ast-eyebrow--dark">43 segundos</p>
              <h2 id="ast-video-h" className="ast-h2">
                Del terreno al documento, <em>sin pasar por el escritorio.</em>
              </h2>
              <p className="ast-p ast-p--dark">
                Una persona describe lo que vio. El agente lo entiende, lo ordena y entrega el informe. Esto es exactamente lo que podrás probar desde tu teléfono.
              </p>
              <p className="ast-note">Escenas recreadas con herramientas de IA; no corresponden a una instalación específica.</p>
            </div>
            <DemoVideo src={aster.video} poster={aster.videoPoster} />
          </div>
        </section>

        {/* 3 · CÓMO FUNCIONA */}
        <section className="ast-section" aria-labelledby="ast-how">
          <div className="ast-wrap">
            <p className="mk-eyebrow ast-eyebrow">Cómo funciona</p>
            <h2 id="ast-how" className="ast-h2">
              Tres pasos, <em>un minuto.</em>
            </h2>
            <ol className="ast-steps">
              {steps.map((s) => (
                <li key={s.n} className="ast-step">
                  <span className="ast-step__n" aria-hidden="true">{s.n}</span>
                  <h3>{s.title}</h3>
                  <p>{s.text}</p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        {/* 4 · DOCUMENTO REAL */}
        <section className="ast-section ast-section--paper" aria-labelledby="ast-doc">
          <div className="ast-wrap ast-doc">
            <div className="ast-doc__img">
              <Image src={aster.pdfImage} alt="Informe técnico de terreno de Atacama Labs generado por el agente, con el logotipo oficial, datos del equipo, observaciones y pendientes" width={900} height={1273} sizes="(max-width: 860px) 88vw, 460px" />
            </div>
            <div className="ast-doc__copy">
              <p className="mk-eyebrow ast-eyebrow">Nuestro documento corporativo</p>
              <h2 id="ast-doc" className="ast-h2">
                No es una nota suelta: <em>es un documento de verdad.</em>
              </h2>
              <ul className="ast-list">
                <li><Check />Identidad de Atacama Labs en cada hoja, lista para compartir.</li>
                <li><Check />Hechos, observaciones, acciones y pendientes, bien separados.</li>
                <li><Check />No inventa: lo que no dijiste queda como «No informado».</li>
              </ul>
              <a className="mk-btn mk-btn--secondary" href={aster.pdfFile} target="_blank" rel="noopener noreferrer">
                Ver el PDF de ejemplo
              </a>
              <p className="ast-note ast-note--light">Documento de demostración con datos ficticios.</p>
            </div>
          </div>
        </section>

        {/* 5 · INTEGRACIONES */}
        <section className="ast-section" aria-labelledby="ast-int">
          <div className="ast-wrap">
            <p className="mk-eyebrow ast-eyebrow">Más allá de un informe</p>
            <h2 id="ast-int" className="ast-h2">
              La demostración es un caso. <em>Tu operación puede ser otro.</em>
            </h2>
            <p className="ast-p ast-p--lead">
              Atacama Labs conecta agentes a tus herramientas, datos y procedimientos. Esto es lo que ejecuta hoy esta demostración y lo que sería posible construir para tu empresa.
            </p>
            <div className="ast-int">
              <div className="ast-int__col ast-int__col--now">
                <h3>Hoy, en esta demostración</h3>
                <ul>
                  {today.map((t) => (
                    <li key={t}><Check />{t}</li>
                  ))}
                </ul>
                <p className="ast-note ast-note--light">Esto ocurre de verdad cuando envías tu audio.</p>
              </div>
              <div className="ast-int__col ast-int__col--next">
                <h3>Posible en tu empresa</h3>
                <ul>
                  {possible.map((t) => (
                    <li key={t}><Dashed />{t}</li>
                  ))}
                </ul>
                <p className="ast-note ast-note--light">No están conectadas en esta demostración: se diseñan con cada cliente.</p>
              </div>
            </div>
          </div>
        </section>

        {/* 6 · CTA FINAL */}
        <section className="ast-section ast-section--dark ast-final" aria-labelledby="ast-final-h">
          <div className="ast-wrap ast-final__box">
            <h2 id="ast-final-h" className="ast-h2 ast-h2--center">
              Cuéntale algo al agente. <em>Toma un minuto.</em>
            </h2>
            <p className="ast-p ast-p--dark ast-p--center">Habla como a un colega: una inspección, una falla, el cierre de un turno. Usa un caso ficticio, sin datos reservados.</p>
            <div className="ast-final__actions">
              <Cta href={href} block />
              <a className="mk-btn mk-btn--white" href={`${aster.mainSiteUrl}/diagnostico`}>
                Conversemos sobre tu operación
              </a>
            </div>
            <p className="ast-micro ast-micro--dark">Recibirás un borrador de informe. Es una demostración, no un documento oficial.</p>
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
