import { HOME_TOOLS, type HomeTool } from "@/content/marketing/integrations";

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
 * Franja de integraciones del Home — HOME_SPEC_V1 §5. Dos filas de marquee en
 * sentidos opuestos, lentas, sin cards ni controles visibles. Cada fila lleva
 * marcas distintas (nunca la misma arriba y abajo). Reduce movimiento:
 * composición estática.
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
