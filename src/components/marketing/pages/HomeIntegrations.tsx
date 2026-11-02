import { HOME_TOOLS, type HomeTool } from "@/content/marketing/integrations";
import { AGENTS_ONBOARDING_HEADING, AGENTS_STAGES } from "@/content/marketing/agents";
import { ButtonLink } from "../ui/Button";
import { Reveal } from "../motion/Reveal";

function ToolItem({ tool, repeat }: { tool: HomeTool; repeat?: boolean }) {
  return (
    <li className={repeat ? "mk-home-tool is-repeat" : "mk-home-tool"}>
      <span className="mk-home-tool__glyph" style={{ ["--glyph" as string]: `url(${tool.logo})` }} aria-hidden />
      <span className="mk-home-tool__name">{tool.name}</span>
    </li>
  );
}

function Row({ tools, label, reverse }: { tools: readonly HomeTool[]; label: string; reverse?: boolean }) {
  const half = [...tools, ...tools];
  return (
    <div className="mk-home-tools__row">
      <div className={reverse ? "mk-home-tools__track is-reverse" : "mk-home-tools__track"}>
        <ul className="mk-home-tools__set" aria-label={label}>
          {half.map((tool, i) => (
            <ToolItem key={`${tool.id}-${i}`} tool={tool} repeat={i >= tools.length} />
          ))}
        </ul>
        <ul className="mk-home-tools__set is-dup" aria-hidden>
          {half.map((tool, i) => (
            <ToolItem key={`dup-${tool.id}-${i}`} tool={tool} repeat={i >= tools.length} />
          ))}
        </ul>
      </div>
    </div>
  );
}

/**
 * «Cómo trabajamos» dentro de la franja de integraciones: las mismas cuatro
 * etapas de /agentes (`AGENTS_STAGES`, fuente única de la terminología), en
 * versión compacta y con un enlace al detalle. No es una sección aparte: cuenta
 * cómo se conectan las herramientas que la franja acaba de mostrar.
 */
function HowWeWork() {
  return (
    <Reveal className="mk-container mk-home-how">
      <p className="mk-eyebrow">Cómo trabajamos</p>
      <h3 className="mk-home-how__title">{AGENTS_ONBOARDING_HEADING.title}</h3>
      <ol className="mk-home-how__steps">
        {AGENTS_STAGES.map((stage) => (
          <li key={stage.number} className="mk-home-how__step">
            <span className="mk-home-how__num" aria-hidden>
              {stage.number}
            </span>
            <h4>{stage.title}</h4>
            <p>{stage.body}</p>
          </li>
        ))}
      </ol>
      <p className="mk-home-how__close">
        Te acompañamos en la puesta en marcha. Tú defines las reglas y los permisos, y el agente deriva a una persona
        cuando hace falta.
      </p>
      <p className="mk-home-how__more">
        <ButtonLink href="/agentes#implementacion" variant="tertiary" arrow>
          Ver cómo es la implementación
        </ButtonLink>
      </p>
    </Reveal>
  );
}

/**
 * Franja de integraciones del Home — HOME_SPEC_V1 §5. Dos filas de marquee en
 * sentidos opuestos, lentas, sin cards ni controles visibles. Cada fila lleva
 * marcas distintas (nunca la misma arriba y abajo). Reduce movimiento:
 * composición estática. Debajo, «Cómo trabajamos» (MASTER_PLAN_CONVERSION §5).
 */
export function HomeIntegrations() {
  const first = HOME_TOOLS.filter((_, i) => i % 2 === 0);
  const second = HOME_TOOLS.filter((_, i) => i % 2 === 1);
  return (
    <section className="mk-home-tools mk-t-paper" aria-labelledby="tools-title">
      <div className="mk-container">
        <h2 id="tools-title" className="mk-home-tools__title">
          Se conecta con las herramientas que ya usas.
        </h2>
      </div>
      <div className="mk-home-tools__rows">
        <Row tools={first} label="Herramientas conectables, fila 1" />
        <Row tools={second} label="Herramientas conectables, fila 2" reverse />
      </div>
      <HowWeWork />
    </section>
  );
}

/**
 * Una sola fila del marquee del Home (mismas marcas, mismo movimiento lento),
 * sin título ni sección propia: se coloca bajo un titular que ya la explica.
 */
export function ToolsMarquee({ className }: { className?: string }) {
  return (
    <div className={`mk-home-tools--slim ${className ?? ""}`}>
      <div className="mk-home-tools__rows">
        <Row tools={HOME_TOOLS} label="Herramientas conectables" />
      </div>
    </div>
  );
}
