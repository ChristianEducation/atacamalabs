import Link from "next/link";
import type { ResultsData } from "@/lib/ops/types";
import type { V3Result } from "@/lib/ops/v3-data";
import { Empty, Head, Pill, Section, Stat } from "./Blocks";
import { fmtCl } from "./Parts";
import { DecideProposal } from "./ResultsClient";

/**
 * Atacama OS v3 · Fase 8 (spec §8.2–8.3): Resultados → Contenido → ventas · Aprendizaje · Iteraciones.
 * Solo cifras reales (Supabase); la atribución es parcial y se declara. Aprobar una propuesta NO la aplica.
 */
const TARGET: Record<string, string> = { playbook: "Playbook de correo", evaluador: "Evaluador de correos", ranking: "Ranking de ideas", receta: "Recetas de carruseles" };
const TYPE: Record<string, string> = { email_edit: "ediciones de correo", idea_discard: "ideas descartadas", piece_feedback: "cambios pedidos a piezas", piece_ok: "piezas sin cambios" };

function Unavailable() {
  return <Section id="ops-na" title="Sin datos"><Empty>No pude leer los resultados (n8n no responde o aún no tiene esta vista). Reintenta en un minuto.</Empty></Section>;
}

export async function SalesView({ rP, fetchedAt, stale }: { rP: Promise<V3Result<ResultsData>>; fetchedAt: number; stale: boolean }) {
  const r = await rP;
  const head = <Head title="Contenido → ventas" sub="Qué piezas y recursos trajeron contactos y reuniones" fetchedAt={r.ok ? Date.parse(r.value.results.generated_at) || fetchedAt : fetchedAt} stale={stale} />;
  if (!r.ok) return <>{head}<Unavailable /></>;
  const v = r.value.results;
  const tot = v.pieces.reduce((s, p) => ({ c: s.c + p.contacts_dm + p.contacts_web, m: s.m + p.meetings }), { c: 0, m: 0 });
  return (
    <>
      {head}
      <p className="ops-foot ops-warn" data-testid="partial-note">{v.note}</p>
      <Section id="ops-res-sum" title={`Resumen del lunes (semana del ${v.summary.week})`}>
        {v.summary.lines.length ? <ul className="ops-list ops-signals" data-testid="monday-summary">{v.summary.lines.map((l) => <li key={l.piece_id}><span className="ops-row-title">{l.text}</span></li>)}</ul> : <Empty>{v.summary.empty_text}</Empty>}
      </Section>
      <Section id="ops-res-tot" title={`Últimos ${v.days} días`}>
        <div className="ops-stats"><Stat n={v.pieces.length} label="piezas" /><Stat n={tot.c} label="contactos" tone={tot.c ? "hi" : undefined} /><Stat n={tot.m} label="reuniones" /></div>
      </Section>
      <Section id="ops-res-pieces" title="Por pieza">
        {v.pieces.length ? (
          <ul className="ops-list" data-testid="sales-pieces">
            {v.pieces.map((p) => (
              <li key={p.id} className="ops-mrow">
                <span className="ops-row-title"><Link href={`/ops?view=taller&pieza=${p.id}`}>{p.topic}</Link></span>
                <span className="ops-row-sub">{[p.channel, p.format, fmtCl(p.at), p.keyword ? `palabra «${p.keyword}»` : null, p.resource ? `recurso ${p.resource.name}` : null].filter(Boolean).join(" · ")}</span>
                <span className="ops-row-sub">{p.contacts_dm} por mensaje · {p.contacts_web} por la web · {p.meetings} reuniones{p.metrics ? ` · ${p.metrics.likes ?? "—"} me gusta, ${p.metrics.comments ?? "—"} comentarios (${p.metrics.window})` : ""}</span>
              </li>
            ))}
          </ul>
        ) : <Empty>Sin piezas publicadas o programadas en este período.</Empty>}
      </Section>
      <Section id="ops-res-resources" title="Por recurso">
        {v.resources.length ? (
          <ul className="ops-list">
            {v.resources.map((x) => <li key={x.slug} className="ops-mrow"><span className="ops-row-title">{x.name}</span><span className="ops-row-sub">{x.web_leads} formularios desde el recurso · {x.meetings} reuniones · {x.contacts_dm} por mensaje · {x.pieces} piezas</span></li>)}
          </ul>
        ) : <Empty>Sin recursos activos.</Empty>}
        {v.unknown_web ? <p className="ops-foot">{v.unknown_web} formulario(s) vinieron de páginas de recurso que no están en la lista.</p> : null}
        <p className="ops-foot">Oportunidades y clientes ganados se ven en GHL.</p>
      </Section>
    </>
  );
}

export async function LearningView({ rP, fetchedAt, stale }: { rP: Promise<V3Result<ResultsData>>; fetchedAt: number; stale: boolean }) {
  const r = await rP;
  const head = <Head title="Aprendizaje" sub="Lo que el sistema propone a partir de tus correcciones (tú decides)" fetchedAt={fetchedAt} stale={stale} />;
  if (!r.ok) return <>{head}<Unavailable /></>;
  const l = r.value.learning;
  const open = l.proposals.filter((p) => p.status === "proposed"), done = l.proposals.filter((p) => p.status !== "proposed");
  return (
    <>
      {head}
      <p className="ops-foot">Job semanal «Aprendizaje»: <strong>{r.value.learning_enabled ? "encendido" : "apagado"}</strong>. Solo propone; aprobar no cambia nada por sí solo (el cambio se hace con tu orden y queda en el historial).</p>
      <Section id="ops-ln-props" title="Propuestas por decidir">
        {open.length ? (
          <ul className="ops-list" data-testid="learning-open">
            {open.map((p) => (
              <li key={p.id} className="ops-mrow">
                <span className="ops-row-title">{TARGET[p.target] ?? p.target}{p.pattern ? ` · ${p.pattern}` : ""}</span>
                <span className="ops-row-sub">{p.proposal}</span>
                <span className="ops-row-sub">Muestra: {p.sample_size} ejemplos · {p.citations} citados · {fmtCl(p.created_at)}</span>
                <DecideProposal id={p.id} />
              </li>
            ))}
          </ul>
        ) : <Empty>No hay propuestas por decidir.</Empty>}
      </Section>
      <Section id="ops-ln-pat" title={`Patrones (muestra mínima ${l.min_sample})`}>
        <p className="ops-foot">{l.total_events} correcciones registradas: {Object.entries(l.by_type).map(([k, n]) => `${n} ${TYPE[k] ?? k}`).join(" · ") || "ninguna"}.</p>
        {l.patterns.length ? (
          <ul className="ops-list ops-signals" data-testid="learning-patterns">
            {l.patterns.map((p) => <li key={p.id}><span className="ops-row-title">{p.label}</span><span className="ops-row-sub">{p.n} ejemplos · {TARGET[p.target] ?? p.target} · {p.sufficient ? <Pill status="ok">muestra suficiente</Pill> : <Pill status="atencion">muestra insuficiente</Pill>}</span></li>)}
          </ul>
        ) : <Empty>Aún no hay patrones.</Empty>}
      </Section>
      {done.length ? (
        <Section id="ops-ln-done" title="Decididas">
          <ul className="ops-list ops-signals">{done.map((p) => <li key={p.id}><span className="ops-row-title">{p.status === "approved" ? "✓ Aprobada" : "✗ Rechazada"} · {TARGET[p.target] ?? p.target}</span><span className="ops-row-sub">{p.proposal}</span></li>)}</ul>
        </Section>
      ) : null}
    </>
  );
}

export async function IterationsView({ rP, fetchedAt, stale }: { rP: Promise<V3Result<ResultsData>>; fetchedAt: number; stale: boolean }) {
  const r = await rP;
  const head = <Head title="Iteraciones por pieza" sub="Cuántas versiones y cambios necesitó cada pieza" fetchedAt={fetchedAt} stale={stale} />;
  if (!r.ok) return <>{head}<Unavailable /></>;
  const it = r.value.results.iterations;
  const first = it.filter((x) => x.first_try).length;
  return (
    <>
      {head}
      <Section id="ops-it" title="Piezas del Taller (90 días)">
        {it.length ? (
          <>
            <div className="ops-stats"><Stat n={it.length} label="piezas" /><Stat n={first} label="al primer intento" /><Stat n={Math.round(it.reduce((s, x) => s + x.credits, 0) * 10) / 10} label="créditos" /></div>
            <ul className="ops-list" data-testid="iterations">
              {it.map((x) => <li key={x.id} className="ops-mrow"><span className="ops-row-title"><Link href={`/ops?view=taller&pieza=${x.id}`}>{x.topic}</Link></span><span className="ops-row-sub">{x.versions} versiones · {x.feedback} cambios pedidos · {x.credits} créditos · {x.days} días{x.first_try ? " · al primer intento" : ""}</span></li>)}
            </ul>
          </>
        ) : <Empty>Aún no hay piezas con versiones.</Empty>}
      </Section>
    </>
  );
}
