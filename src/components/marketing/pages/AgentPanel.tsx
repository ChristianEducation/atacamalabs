import { ButtonLink } from "../ui/Button";
import { agentCta, agentWidgetReady } from "@/lib/marketing/public-config";

/**
 * H5 del Home (spec V3.0 §6/§7.5) — el gran momento de prueba real. Mientras
 * no exista el embed del agente de Lety, se muestra un estado honesto: no se
 * simula un chat ni se fabrica un widget, solo se explica cómo conversar con
 * el equipo mientras tanto. Cuando `agentWidgetReady()` pase a true, este es
 * el único lugar que hay que cambiar por el panel/modal real.
 */
export function AgentPanel() {
  const cta = agentCta();
  if (agentWidgetReady()) return null;
  return (
    <div className="mk-agent-panel">
      <p className="mk-h5" style={{ margin: 0 }}>
        Muy pronto vas a poder escribirle aquí mismo.
      </p>
      <p>Mientras tanto, agenda una conversación breve y te mostramos por dónde empezar.</p>
      <ButtonLink href={cta.href} arrow>
        {cta.label}
      </ButtonLink>
    </div>
  );
}
