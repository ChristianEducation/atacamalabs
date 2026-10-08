import type { PiecePreview } from "@/lib/ops/types";

export const GHL_PLANNER_URL = "https://app.gohighlevel.com/v2/location/pxHuOsiz2i3lM6BtC9IM/marketing/social-planner";

export function fmtCl(iso: string | null | undefined): string {
  if (!iso) return "—";
  const t = Date.parse(iso);
  if (!Number.isFinite(t)) return "—";
  return new Date(t).toLocaleString("es-CL", { timeZone: "America/Santiago", weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", hour12: false });
}

function slideLines(s: PiecePreview["slides"][number]): string {
  return [s.body, ...s.items, ...s.compare, s.figure].filter(Boolean).join(" · ");
}

/** Vista previa de una pieza (copy, slides, fuentes). Sin estado: sirve en componentes de servidor y de cliente. */
const EDITORIAL_LABEL: Record<string, string> = { founder: "Founder", educational: "Educativo", opinion: "Opinión", case: "Caso", build_in_public: "Construcción en público", framework: "Framework", comparison: "Comparación", news_explainer: "Noticia explicada", resource: "Recurso", demo: "Demo", process: "Proceso", integration: "Integración", market_signal: "Señal de mercado", customer_problem: "Problema de cliente" };

export function Preview({ pv, foot }: { pv: PiecePreview; foot?: React.ReactNode }) {
  const copy = [pv.hook, pv.body, pv.cta, pv.hashtags.join(" ")].filter(Boolean).join("\n\n");
  return (
    <div className="ops-preview">
      {pv.media.length ? (
        <ul className="ops-slides" aria-label="Slides del carrusel">
          {pv.media.map((u, i) => (
            <li key={u}>
              <a href={u} target="_blank" rel="noreferrer noopener" aria-label={`Abrir slide ${i + 1} en grande`}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={u} alt={`Slide ${i + 1}: ${pv.slides[i]?.title ?? ""}`} loading="lazy" width={160} height={200} />
              </a>
            </li>
          ))}
        </ul>
      ) : pv.slides.length ? (
        <ol className="ops-slide-text">
          {pv.slides.map((s, i) => (<li key={i}><strong>{s.title}</strong>{slideLines(s) ? <span> — {slideLines(s)}</span> : null}</li>))}
        </ol>
      ) : null}
      {copy ? (<><h4>Texto del post</h4><p className="ops-copy">{copy}</p></>) : null}
      {pv.editorial ? (<><h4>Enfoque editorial</h4><p className="ops-why">{EDITORIAL_LABEL[pv.editorial.type] ?? pv.editorial.type}{pv.editorial.visual_need ? ` · visual: ${pv.editorial.visual_need === "none" ? "ninguno (funciona mejor solo con texto)" : pv.editorial.visual_need}` : ""}{pv.editorial.visual_why ? ` — ${pv.editorial.visual_why}` : ""}</p></>) : null}
      {pv.rationale ? (<><h4>Por qué se eligió</h4><p className="ops-why">{pv.rationale}</p></>) : null}
      {pv.sources.length ? (<><h4>Fuentes</h4><ul className="ops-src">{pv.sources.map((s) => (<li key={s.url}><a href={s.url} target="_blank" rel="noreferrer noopener">{s.title}</a></li>))}</ul></>) : null}
      {foot}
    </div>
  );
}
