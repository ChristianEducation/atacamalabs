"use client";

import { useEffect, useState, type CSSProperties, type ReactNode } from "react";
import { Check, Code2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { AGENTS_STAGE_SCENES } from "@/content/marketing/agents";

/**
 * Mini escenas de las cuatro etapas de la inducción (AGENTES_SPEC_V1 §5.1).
 * Coreografía de «Del lenguaje natural a la Automatización»: escritura a 30 ms
 * por letra con etiqueta al final, filas que entran por el costado cada 500 ms,
 * pastillas con resorte cada 250 ms y estados que suben cada 400 ms. Cada una
 * se reproduce una vez, cuando el trabajador llega a su estación. Las clases
 * `mk-cp-*` son las de esas escenas (custom.css). Ejemplos ilustrativos.
 */

export type StagePhase = "static" | "armed" | "play";

const t = (ms: number): CSSProperties => ({ ["--t" as string]: ms });

const LOGO = (id: string) => ({ ["--glyph" as string]: `url(/visual/integrations/${id}.svg)` }) as CSSProperties;

const TOOL_ICONS: Record<string, ReactNode> = {
  WhatsApp: <span className="mk-cp-glyph" style={LOGO("whatsapp")} aria-hidden />,
  Calendar: <span className="mk-cp-glyph" style={LOGO("googlecalendar")} aria-hidden />,
  CRM: <span className="mk-cp-glyph" style={LOGO("hubspot")} aria-hidden />,
  Sheets: <span className="mk-cp-glyph" style={LOGO("googlesheets")} aria-hidden />,
  API: <Code2 size={13} strokeWidth={1.9} aria-hidden />,
};

function ContextScene({ phase }: { phase: StagePhase }) {
  const scene = AGENTS_STAGE_SCENES.context;
  const [typed, setTyped] = useState("");
  const [tag, setTag] = useState(false);

  useEffect(() => {
    if (phase !== "play") return;
    let i = 0;
    let tagTimer: number | undefined;
    const interval = window.setInterval(() => {
      if (i < scene.text.length) {
        i += 1;
        setTyped(scene.text.slice(0, i));
      } else {
        window.clearInterval(interval);
        tagTimer = window.setTimeout(() => setTag(true), 300);
      }
    }, 28);
    return () => {
      window.clearInterval(interval);
      if (tagTimer) window.clearTimeout(tagTimer);
    };
  }, [phase, scene.text]);

  const text = phase === "static" ? scene.text : typed;
  const tagOn = phase === "static" || tag;
  return (
    <>
      <p className="mk-cp-label">{scene.label}</p>
      <div className="mk-cp-typebox">
        <p>
          {text}
          {phase !== "static" ? <span className="mk-cursor" /> : null}
        </p>
      </div>
      <p className={cn("mk-cp-tag", tagOn && "is-on")}>
        <Check size={12} strokeWidth={2.6} aria-hidden /> {scene.tag}
      </p>
    </>
  );
}

function WorkScene() {
  const scene = AGENTS_STAGE_SCENES.work;
  return (
    <>
      <p className="mk-cp-label">{scene.label}</p>
      {scene.items.map((item, i) => (
        <div key={item.name} className="mk-cp-it mk-cp-it--x mk-cp-row" style={t(300 + i * 500)}>
          <span className="mk-cp-badge">{item.badge}</span>
          <span className="mk-cp-row__name">{item.name}</span>
          <span className="mk-cp-row__meta">{item.meta}</span>
        </div>
      ))}
      <div className="mk-cp-it mk-cp-it--x mk-cp-row is-done" style={t(300 + scene.items.length * 500)}>
        <span className="mk-cp-badge is-done">
          <Check size={13} strokeWidth={2.8} aria-hidden />
        </span>
        <span className="mk-cp-row__name">{scene.done.name}</span>
        <span className="mk-cp-row__meta">{scene.done.meta}</span>
      </div>
    </>
  );
}

function ToolsScene() {
  const scene = AGENTS_STAGE_SCENES.tools;
  return (
    <div className="mk-ao-scene__center">
      <div className="mk-cp-pills">
        {scene.pills.map((pill, i) => (
          <span key={pill} className="mk-cp-it mk-cp-it--pop mk-cp-pill" style={t(200 + i * 250)}>
            {TOOL_ICONS[pill]}
            {pill}
          </span>
        ))}
      </div>
      <span className="mk-cp-it mk-cp-it--pop mk-cp-pill is-done" style={t(200 + scene.pills.length * 250)}>
        <Check size={13} strokeWidth={2.6} aria-hidden />
        {scene.done}
      </span>
    </div>
  );
}

function LiveScene() {
  const scene = AGENTS_STAGE_SCENES.live;
  return (
    <>
      <p className="mk-cp-label">{scene.label}</p>
      {scene.rows.map((row, i) => (
        <div key={row} className="mk-cp-it mk-cp-it--y mk-cp-row" style={t(300 + i * 400)}>
          <span className="mk-cp-dot" />
          <span className="mk-cp-row__name">{row}</span>
          <span className="mk-cp-row__meta is-live">OK</span>
        </div>
      ))}
      <p className="mk-cp-it mk-cp-it--y mk-cp-final" style={t(300 + scene.rows.length * 400)}>
        <Check size={14} strokeWidth={2.6} aria-hidden /> {scene.done}
      </p>
    </>
  );
}

const SCENE_NAMES = ["context", "work", "tools", "live"] as const;

/** Mini escena de la etapa `index` (0–3). Se remonta con `key` para repetirla. */
export function StageDemo({ index, phase }: { index: number; phase: StagePhase }) {
  return (
    <div className={cn("mk-cp-demo mk-ao-demo", `mk-ao-demo--${SCENE_NAMES[index]}`)} data-phase={phase}>
      {index === 0 ? <ContextScene phase={phase} /> : null}
      {index === 1 ? <WorkScene /> : null}
      {index === 2 ? <ToolsScene /> : null}
      {index === 3 ? <LiveScene /> : null}
    </div>
  );
}
