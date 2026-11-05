import Image from "next/image";
import aster from "@/content/aster.json";
import { AsterVideo, StickyCta, WhatsAppIcon } from "./AsterClient";
import "./aster.css";

const CTA_LABEL = "Pruébalo tú mismo: envía un audio";

/** wa.me SIN texto precargado. Solo se publica si el número es válido (E.164 sin "+"). */
function whatsappHref(e164: string | null): string | null {
  if (!e164 || !/^\d{8,15}$/.test(e164)) return null;
  return `https://wa.me/${e164}`;
}

const steps = [
  {
    n: "1",
    title: "Cuéntalo en un audio",
    text: "Una inspección, una falla, el cierre de un turno. Habla como se lo contarías a un colega.",
  },
  {
    n: "2",
    title: "El agente entiende y ordena",
    text: "Elige el documento correcto y te pregunta solo lo esencial. Nada de formularios.",
  },
  {
    n: "3",
    title: "Recibes el informe",
    text: "Un PDF profesional llega a tu correo y queda respaldado. Del terreno a la acción, en minutos.",
  },
];

type Icon = "doc" | "shield" | "wrench" | "box" | "truck" | "plant" | "people" | "chart";

const processes: { icon: Icon; title: string; text: string }[] = [
  { icon: "doc", title: "Partes de turno", text: "Del relato del jefe de turno al parte ordenado, con los pendientes ya listos para el turno siguiente." },
  { icon: "wrench", title: "Mantenimiento", text: "Avisos y solicitudes de trabajo desde un audio o una foto, con seguimiento hasta el cierre." },
  { icon: "shield", title: "Seguridad y prevención", text: "Observaciones preventivas registradas al instante, y pendientes que nadie se olvida de verificar." },
  { icon: "plant", title: "Planta y equipos", text: "Consulta manuales, historial de fallas y alarmas en lenguaje natural, desde el celular." },
  { icon: "box", title: "Bodega y abastecimiento", text: "Stock, solicitudes de materiales y cotizaciones preparadas sin pasar horas en planillas." },
  { icon: "truck", title: "Logística y transporte", text: "Novedades de despacho y traslado, con aviso automático a quien debe enterarse." },
  { icon: "people", title: "Proveedores y contratos", text: "Respuestas a consultas, documentación al día y seguimiento de cada compromiso." },
  { icon: "chart", title: "Gerencia", text: "Un resumen claro de lo que pasó en faena, cada día, directo a tu WhatsApp o correo." },
];

const trends = [
  "Mantenimiento predictivo",
  "Visión artificial para seguridad",
  "Gemelos digitales",
  "Copilotos técnicos",
  "Flotas autónomas",
  "Informes que se escriben solos",
];

function Cta({ href, id }: { href: string | null; id?: string }) {
  return href ? (
    <a id={id} className="ast-btn" href={href} target="_blank" rel="noopener noreferrer">
      <WhatsAppIcon />
      {CTA_LABEL}
    </a>
  ) : (
    <span className="ast-btn ast-btn-off" aria-disabled="true">
      {CTA_LABEL}
    </span>
  );
}

function Ico({ name }: { name: Icon }) {
  const common = {
    width: 26,
    height: 26,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.6,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    "aria-hidden": true,
  };
  switch (name) {
    case "doc":
      return (<svg {...common}><path d="M7 3h7l4 4v14H7z" /><path d="M14 3v4h4M10 12h5M10 16h5" /></svg>);
    case "shield":
      return (<svg {...common}><path d="M12 3l7 3v5c0 5-3 8-7 10-4-2-7-5-7-10V6z" /><path d="M9 12l2 2 4-4" /></svg>);
    case "wrench":
      return (<svg {...common}><path d="M14.5 6.5a4 4 0 0 0-5 5L3.5 17.5a2 2 0 0 0 3 3l6-6a4 4 0 0 0 5-5l-2.5 2.5-2.5-.5-.5-2.5z" /></svg>);
    case "box":
      return (<svg {...common}><path d="M3 7l9-4 9 4v10l-9 4-9-4z" /><path d="M3 7l9 4 9-4M12 11v10" /></svg>);
    case "truck":
      return (<svg {...common}><path d="M2 6h11v9H2zM13 9h4l3 3v3h-7z" /><circle cx="6.5" cy="17.5" r="1.8" /><circle cx="16.5" cy="17.5" r="1.8" /></svg>);
    case "plant":
      return (<svg {...common}><path d="M3 21V10l5 3v-3l5 3V6h4v15z" /><path d="M7 17h2M12 17h2" /></svg>);
    case "people":
      return (<svg {...common}><circle cx="9" cy="8" r="3" /><path d="M3 20c0-3.3 2.7-6 6-6s6 2.7 6 6" /><path d="M16 5a3 3 0 0 1 0 6M18 14c2 .7 3 2.5 3 6" /></svg>);
    case "chart":
      return (<svg {...common}><path d="M4 20V4M4 20h16" /><path d="M8 16v-4M12 16V8M16 16v-6" /></svg>);
  }
}

export default function AsterPage() {
  const href = whatsappHref(aster.whatsappE164);
  const showStagingWarning = !href && process.env.VERCEL_ENV !== "production";

  return (
    <div className="ast-root">
      <header className="ast-top">
        <Image src="/aster/logo-white.png" alt="Atacama Labs" width={900} height={85} priority className="ast-logo" />
        <span className="ast-pill">Demostración</span>
      </header>

      <main id="contenido">
        {/* HERO */}
        <section className="ast-hero" aria-labelledby="ast-h1">
          <div className="ast-hero-copy">
            <p className="ast-eyebrow">Agentes de IA para minería e industria</p>
            <h1 id="ast-h1">
              De lo que ocurre en terreno a <em>una acción real</em>
            </h1>
            <p className="ast-lead">
              Nuestros agentes escuchan, organizan información y ejecutan tareas conectadas a tus herramientas.
            </p>
            <div className="ast-cta-desktop">
              <Cta href={href} />
              <p className="ast-micro">Se abre WhatsApp · sin registro · sin texto que escribir</p>
            </div>
          </div>

          <div className="ast-hero-media">
            <AsterVideo
              video={aster.video}
              poster={aster.poster}
              captions={aster.captions}
              captionsLang={aster.captionsLang}
            />
          </div>

          <div className="ast-cta-mobile">
            <Cta href={href} id="ast-cta-main" />
            <p className="ast-micro">Se abre WhatsApp · sin registro · sin texto que escribir</p>
          </div>
        </section>

        {showStagingWarning ? (
          <p className="ast-staging" role="status">
            Aviso de staging: falta un número de WhatsApp válido en <code>src/content/aster.json</code>. El botón no se publica sin él.
          </p>
        ) : null}

        {/* CÓMO FUNCIONA */}
        <section className="ast-section" aria-labelledby="ast-how">
          <div className="ast-wrap ast-how">
            <div>
              <p className="ast-eyebrow">Cómo funciona</p>
              <h2 id="ast-how">Un audio. Un documento. Una acción real.</h2>
              <ol className="ast-steps">
                {steps.map((s) => (
                  <li key={s.n}>
                    <span className="ast-step-n" aria-hidden="true">{s.n}</span>
                    <div>
                      <h3>{s.title}</h3>
                      <p>{s.text}</p>
                    </div>
                  </li>
                ))}
              </ol>
            </div>
            <div className="ast-how-img">
              <Image
                src="/aster/worker.jpg"
                alt="Ilustración 3D de un trabajador de planta con casco que dicta un audio a su celular mientras aparecen documentos digitales"
                width={720}
                height={1290}
                sizes="(max-width: 900px) 80vw, 360px"
              />
            </div>
          </div>
        </section>

        {/* LO QUE SE PUEDE HACER */}
        <section className="ast-section ast-section-alt" aria-labelledby="ast-more">
          <div className="ast-wrap">
            <p className="ast-eyebrow">Lo que viene después</p>
            <h2 id="ast-more">Hoy es un informe. Mañana, toda tu operación.</h2>
            <p className="ast-lead ast-lead-sm">
              La demostración es solo el primer paso. El mismo agente puede trabajar en cada proceso de tu faena, planta o empresa
              proveedora, conectado a tus sistemas, tus procedimientos y tu forma de trabajar.
            </p>
            <ul className="ast-grid">
              {processes.map((p) => (
                <li key={p.title} className="ast-card">
                  <span className="ast-ico"><Ico name={p.icon} /></span>
                  <h3>{p.title}</h3>
                  <p>{p.text}</p>
                </li>
              ))}
            </ul>

            <div className="ast-trends">
              <p>Donde la industria ya está explorando agentes e IA</p>
              <ul>
                {trends.map((t) => (<li key={t}>{t}</li>))}
              </ul>
            </div>
          </div>
        </section>

        {/* CIERRE */}
        <section className="ast-section ast-final" aria-labelledby="ast-final">
          <div className="ast-wrap ast-final-box">
            <h2 id="ast-final">Cuéntale algo al agente. Toma un minuto.</h2>
            <p className="ast-lead ast-lead-sm">
              Habla como a un colega: una inspección, una falla, el cierre de un turno. Usa un caso ficticio, sin datos reservados.
            </p>
            <Cta href={href} />
            <p className="ast-micro">Recibirás un borrador de informe por correo. Es una demostración, no un documento oficial.</p>
          </div>
        </section>
      </main>

      <footer className="ast-foot">
        <Image src="/aster/logo-white.png" alt="Atacama Labs" width={900} height={85} className="ast-logo ast-logo-sm" />
        <p>Tecnología para el trabajo real · Antofagasta, Chile</p>
        <a href={aster.mainSiteUrl} rel="noopener">atacamalabs.cl</a>
      </footer>

      <StickyCta href={href} label={CTA_LABEL} />
    </div>
  );
}
