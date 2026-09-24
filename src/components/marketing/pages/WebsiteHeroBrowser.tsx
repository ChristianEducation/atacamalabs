import type { CSSProperties, ReactNode } from "react";
import { Compass, Layers, Lock, MessageCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { WEB_HERO_NOTE } from "@/content/marketing/web-page";

/**
 * Visual del hero de /paginas-web — «de plano a web terminada». El browser parte
 * como un plano técnico (líneas finas, cotas, cuadrícula) y cada bloque cobra
 * vida hasta quedar una web diseñada: mensaje de que no es una plantilla sino
 * una pieza a medida. Una sola pasada (~4 s); con reduced-motion se muestra la
 * web terminada. Decorativo (contenido ficticio), construido en HTML/CSS/SVG.
 */

/** Anillo de curva de nivel: contorno suave y orgánico, determinista. */
function ring(cx: number, cy: number, r: number, seed: number) {
  const n = 30;
  const pts: [number, number][] = [];
  for (let i = 0; i < n; i += 1) {
    const t = (i / n) * Math.PI * 2;
    const rr = r * (1 + 0.1 * Math.sin(2 * t + seed) + 0.07 * Math.sin(3 * t + seed * 1.7) + 0.04 * Math.sin(5 * t + seed * 0.6));
    pts.push([cx + rr * Math.cos(t) * 1.3, cy + rr * Math.sin(t) * 0.82]);
  }
  const f = (v: number) => v.toFixed(1);
  let d = `M${f(pts[0][0])} ${f(pts[0][1])}`;
  for (let i = 0; i < n; i += 1) {
    const p0 = pts[(i - 1 + n) % n];
    const p1 = pts[i];
    const p2 = pts[(i + 1) % n];
    const p3 = pts[(i + 2) % n];
    d += ` C${f(p1[0] + (p2[0] - p0[0]) / 6)} ${f(p1[1] + (p2[1] - p0[1]) / 6)}, ${f(p2[0] - (p3[0] - p1[0]) / 6)} ${f(p2[1] - (p3[1] - p1[1]) / 6)}, ${f(p2[0])} ${f(p2[1])}`;
  }
  return `${d}Z`;
}

const RINGS = [
  ...[12, 22, 32, 42, 52, 62].map((r, i) => ({ d: ring(78, 76, r, 0.5 + i * 0.12), i })),
  ...[7, 14, 21].map((r, i) => ({ d: ring(168, 34, r, 2.1 + i * 0.1), i: i + 6 })),
];

function Bp({
  label,
  t0,
  d,
  className,
  children,
}: {
  label: string;
  t0: number;
  d: number;
  className?: string;
  children: ReactNode;
}) {
  const style = { ["--t0" as string]: t0, ["--d" as string]: d, ["--bp" as string]: d - t0 + 0.6 } as CSSProperties;
  return (
    <div className={cn("mk-bp", className)} data-bp={label} style={style}>
      <div className="mk-bp__c">{children}</div>
    </div>
  );
}

export function WebsiteHeroBrowser() {
  return (
    <div className="mk-wb">
      <div className="mk-wb__window" aria-hidden="true">
        <div className="mk-wb__chrome">
          <span className="mk-wb__dots">
            <i />
            <i />
            <i />
          </span>
          <span className="mk-wb__url">
            <Lock size={11} />
            www.tuempresa.cl
          </span>
          <span className="mk-wb__live">
            <i /> En línea
          </span>
        </div>

        <div className="mk-wb__page">
          <Bp label="nav" t0={0.35} d={1.5} className="mk-wb__navbp">
            <div className="mk-wb__nav">
              <span className="mk-wb__brand">
                <i />
                <b>tuempresa</b>
              </span>
              <span className="mk-wb__links">
                <u>Servicios</u>
                <u>Proyectos</u>
                <u>Contacto</u>
              </span>
            </div>
          </Bp>

          <div className="mk-wb__main">
            <div className="mk-wb__text">
              <Bp label="h1" t0={0.55} d={1.8} className="mk-wb__h1bp">
                <p className="mk-wb__h1">
                  Lo que haces,
                  <br />
                  <em>bien presentado.</em>
                </p>
              </Bp>
              <Bp label="p" t0={0.7} d={2.05} className="mk-wb__pbp">
                <p className="mk-wb__p">Servicios, proyectos y contacto en un solo lugar.</p>
              </Bp>
              <Bp label="cta" t0={0.85} d={2.3} className="mk-wb__ctabp">
                <div className="mk-wb__cta">
                  <span>Conocer más</span>
                  <span>Ver proyectos</span>
                </div>
              </Bp>
            </div>

            <Bp label="media" t0={0.6} d={2.05} className="mk-wb__mediabp">
              <svg className="mk-wb__media" viewBox="0 0 200 150" preserveAspectRatio="xMidYMid slice">
                <defs>
                  <linearGradient id="mk-wb-sky" x1="0" y1="0" x2="1" y2="1">
                    <stop offset="0" stopColor="#fdfaf3" />
                    <stop offset="0.6" stopColor="#e3eeff" />
                    <stop offset="1" stopColor="#c9dcff" />
                  </linearGradient>
                </defs>
                <rect width="200" height="150" fill="url(#mk-wb-sky)" />
                {RINGS.map(({ d, i }) => (
                  <path
                    key={i}
                    d={d}
                    pathLength={1}
                    className="mk-wb__ring"
                    style={{ ["--r" as string]: 2.15 + i * 0.1 }}
                  />
                ))}
                <circle cx="78" cy="76" r="3.2" className="mk-wb__peak" />
              </svg>
            </Bp>
          </div>

          <div className="mk-wb__cards">
            {[
              { icon: Layers, label: "Servicios", t0: 1.0, d: 2.6 },
              { icon: Compass, label: "Proyectos", t0: 1.1, d: 2.8 },
              { icon: MessageCircle, label: "Contacto", t0: 1.2, d: 3.0 },
            ].map(({ icon: Icon, label, t0, d }) => (
              <Bp key={label} label="card" t0={t0} d={d}>
                <span className="mk-wb__card">
                  <span className="mk-wb__card-ic">
                    <Icon size={13} strokeWidth={1.9} />
                  </span>
                  <b>{label}</b>
                  <i />
                </span>
              </Bp>
            ))}
          </div>
        </div>
      </div>

      <div className="mk-wb__note">
        <strong>{WEB_HERO_NOTE.title}</strong>
        <p>{WEB_HERO_NOTE.body}</p>
      </div>
    </div>
  );
}
