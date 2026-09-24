"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  Check,
  ClipboardCheck,
  Code2,
  Database,
  FileInput,
  Mail,
  Server,
  UserCheck,
  Wallet,
  type LucideIcon,
} from "lucide-react";
import type { CSSProperties, ReactNode } from "react";
import { cn } from "@/lib/utils";
import { SectionHeading } from "../ui/Blocks";
import { useReducedMotion } from "../motion/reduced-motion";
import {
  CUSTOM_PROCESS_HEADING,
  CUSTOM_SCENE_CONNECT,
  CUSTOM_SCENE_CONTEXT,
  CUSTOM_SCENE_LIVE,
  CUSTOM_SCENE_TYPING,
} from "@/content/marketing/custom-page";

type Phase = "static" | "armed" | "play";
type NodeState = "ghost" | "detected" | "data" | "linked" | "active";

const MOMENTS = [CUSTOM_SCENE_TYPING, CUSTOM_SCENE_CONTEXT, CUSTOM_SCENE_CONNECT, CUSTOM_SCENE_LIVE] as const;
/** Cuánto se queda cada momento antes de pasar al siguiente (incluye la coreografía + una pausa de lectura). */
const HOLD = [5400, 3900, 3400, 3900] as const;
const FLOW: readonly { label: string; icon: LucideIcon }[] = [
  { label: "Solicitud", icon: FileInput },
  { label: "Presupuesto", icon: Wallet },
  { label: "Aprobación", icon: UserCheck },
  { label: "Orden", icon: ClipboardCheck },
];
const STATE_LABEL: Record<NodeState, string> = {
  ghost: "por detectar",
  detected: "detectado",
  data: "con datos",
  linked: "conectado",
  active: "activo",
};

const t = (ms: number): CSSProperties => ({ ["--t" as string]: ms });

const PILL_ICONS: Record<string, ReactNode> = {
  Correo: <Mail size={13} strokeWidth={1.9} aria-hidden />,
  Planillas: (
    <span className="mk-cp-glyph" style={{ ["--glyph" as string]: "url(/visual/integrations/googlesheets.svg)" }} aria-hidden />
  ),
  ERP: <Server size={13} strokeWidth={1.9} aria-hidden />,
  "API interna": <Code2 size={13} strokeWidth={1.9} aria-hidden />,
  "Base de datos": <Database size={13} strokeWidth={1.9} aria-hidden />,
};

/**
 * «Muéstranos cómo trabajas hoy» — SPEC_A_MEDIDA §5, reinterpretado como UNA
 * pieza que crece en cuatro momentos (entender → datos y reglas → conectar →
 * operar) en vez de cuatro cajas sueltas. El mismo proceso queda visible arriba
 * y sus nodos cambian de estado en cada momento; abajo entra la coreografía
 * exacta de la escena correspondiente de la referencia (escritura a 30 ms,
 * items con translateX cada 500 ms, pills con resorte cada 250 ms, filas que
 * suben cada 400 ms). Avanza sola una vez al entrar en pantalla y también se
 * puede recorrer con los pasos; con reduced-motion se muestra el estado final.
 */
export function CustomProcess() {
  const reduced = useReducedMotion();
  const stageRef = useRef<HTMLDivElement>(null);
  const [phase, setPhase] = useState<Phase>("static");
  const [step, setStep] = useState(3);
  const [run, setRun] = useState(0);
  const [auto, setAuto] = useState(true);
  const [typed, setTyped] = useState("");
  const [tag, setTag] = useState(false);
  const played = useRef(false);

  useEffect(() => {
    if (reduced) return;
    const node = stageRef.current;
    if (!node || typeof IntersectionObserver === "undefined") return;
    const frame = requestAnimationFrame(() => {
      if (played.current) return;
      setPhase("armed");
      setStep(0);
    });
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          played.current = true;
          setPhase("play");
          observer.disconnect();
        }
      },
      { threshold: 0.3 },
    );
    observer.observe(node);
    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
    };
  }, [reduced]);

  useEffect(() => {
    if (phase !== "play" || !auto || step >= MOMENTS.length - 1) return;
    const id = window.setTimeout(() => setStep((s) => s + 1), HOLD[step]);
    return () => window.clearTimeout(id);
  }, [phase, auto, step]);

  useEffect(() => {
    if (phase !== "play" || step !== 0) return;
    const full = CUSTOM_SCENE_TYPING.text;
    let i = 0;
    let tagTimer: number | undefined;
    const interval = window.setInterval(() => {
      if (i < full.length) {
        i += 1;
        setTyped(full.slice(0, i));
      } else {
        window.clearInterval(interval);
        tagTimer = window.setTimeout(() => setTag(true), 400);
      }
    }, 30);
    return () => {
      window.clearInterval(interval);
      if (tagTimer) window.clearTimeout(tagTimer);
    };
  }, [phase, step, run]);

  const goTo = useCallback((index: number) => {
    setAuto(false);
    setStep(index);
    setRun((r) => r + 1);
    setTyped("");
    setTag(false);
  }, []);

  const isStatic = phase === "static";
  const text = isStatic ? CUSTOM_SCENE_TYPING.text : typed;
  const tagOn = isStatic || tag;
  const nodeState: NodeState = isStatic
    ? "active"
    : step === 0
      ? tagOn
        ? "detected"
        : "ghost"
      : step === 1
        ? "data"
        : step === 2
          ? "linked"
          : "active";
  const scenePhase: Phase = phase === "armed" ? "armed" : phase === "static" ? "static" : "play";

  return (
    <section id="como-trabajas" className="mk-section mk-t-mist" aria-labelledby="custom-process-title">
      <div className="mk-container">
        <SectionHeading
          id="custom-process-title"
          center
          eyebrow={CUSTOM_PROCESS_HEADING.eyebrow}
          title={CUSTOM_PROCESS_HEADING.title}
          lead={CUSTOM_PROCESS_HEADING.lead}
        />

        <div className="mk-pc" ref={stageRef}>
          <ol className="mk-pc__steps">
            {MOMENTS.map((m, i) => (
              <li key={m.number}>
                <button
                  type="button"
                  className={cn("mk-pc__step", i === step && "is-current", i < step && "is-past")}
                  aria-current={i === step ? "step" : undefined}
                  onClick={() => goTo(i)}
                >
                  <span className="mk-pc__num">{m.number}</span>
                  <span className="mk-pc__txt">
                    <strong>{m.title}</strong>
                    <span>{m.body}</span>
                  </span>
                </button>
              </li>
            ))}
          </ol>

          <div className="mk-pc__stage">
            <div className="mk-pc__flow">
              {FLOW.map((node, i) => {
                const Icon = node.icon;
                return (
                  <div key={node.label} className="mk-pc__flow-item">
                    <span className={cn("mk-pc__node", `is-${nodeState}`)}>
                      <span className="mk-pc__tile">
                        <Icon size={18} strokeWidth={1.7} aria-hidden />
                      </span>
                      <span className="mk-pc__label">{node.label}</span>
                      <span className="mk-pc__state">{STATE_LABEL[nodeState]}</span>
                    </span>
                    {i < FLOW.length - 1 ? <span className={cn("mk-pc__link", `is-${nodeState}`)} aria-hidden /> : null}
                  </div>
                );
              })}
            </div>

            <div className="mk-cp-demo mk-pc__scene" data-phase={scenePhase} key={`${step}-${run}`}>
              {step === 0 ? (
                <>
                  <p className="mk-cp-label">{CUSTOM_SCENE_TYPING.label}</p>
                  <div className="mk-cp-typebox">
                    <p>
                      {text}
                      <span className="mk-cursor" />
                    </p>
                  </div>
                  <p className={cn("mk-cp-tag", tagOn && "is-on")}>
                    <Check size={12} strokeWidth={2.6} aria-hidden /> {CUSTOM_SCENE_TYPING.tag}
                  </p>
                </>
              ) : null}

              {step === 1 ? (
                <>
                  <p className="mk-cp-label">{CUSTOM_SCENE_CONTEXT.label}</p>
                  {CUSTOM_SCENE_CONTEXT.items.map((item, i) => (
                    <div key={item.name} className="mk-cp-it mk-cp-it--x mk-cp-row" style={t(300 + i * 500)}>
                      <span className="mk-cp-badge">{item.badge}</span>
                      <span className="mk-cp-row__name">{item.name}</span>
                      <span className="mk-cp-row__meta">{item.meta}</span>
                    </div>
                  ))}
                  <div
                    className="mk-cp-it mk-cp-it--x mk-cp-row is-done"
                    style={t(300 + CUSTOM_SCENE_CONTEXT.items.length * 500)}
                  >
                    <span className="mk-cp-badge is-done">
                      <Check size={13} strokeWidth={2.8} aria-hidden />
                    </span>
                    <span className="mk-cp-row__name">{CUSTOM_SCENE_CONTEXT.done.name}</span>
                    <span className="mk-cp-row__meta">{CUSTOM_SCENE_CONTEXT.done.meta}</span>
                  </div>
                </>
              ) : null}

              {step === 2 ? (
                <div className="mk-pc__center">
                  <div className="mk-cp-pills">
                    {CUSTOM_SCENE_CONNECT.pills.map((pill, i) => (
                      <span key={pill} className="mk-cp-it mk-cp-it--pop mk-cp-pill" style={t(200 + i * 250)}>
                        {PILL_ICONS[pill]}
                        {pill}
                      </span>
                    ))}
                  </div>
                  <span
                    className="mk-cp-it mk-cp-it--pop mk-cp-pill is-done"
                    style={t(200 + CUSTOM_SCENE_CONNECT.pills.length * 250)}
                  >
                    <Check size={13} strokeWidth={2.6} aria-hidden />
                    {CUSTOM_SCENE_CONNECT.done}
                  </span>
                </div>
              ) : null}

              {step === 3 ? (
                <>
                  <p className="mk-cp-label">{CUSTOM_SCENE_LIVE.label}</p>
                  {CUSTOM_SCENE_LIVE.rows.map((row, i) => (
                    <div key={row} className="mk-cp-it mk-cp-it--y mk-cp-row" style={t(300 + i * 400)}>
                      <span className="mk-cp-dot" />
                      <span className="mk-cp-row__name">{row}</span>
                      <span className="mk-cp-row__meta is-live">ACTIVO</span>
                    </div>
                  ))}
                  <p className="mk-cp-it mk-cp-it--y mk-cp-final" style={t(300 + CUSTOM_SCENE_LIVE.rows.length * 400)}>
                    <Check size={14} strokeWidth={2.6} aria-hidden /> {CUSTOM_SCENE_LIVE.done} ✓
                  </p>
                </>
              ) : null}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
