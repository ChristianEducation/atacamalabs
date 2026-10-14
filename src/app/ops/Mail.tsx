import Link from "next/link";
import type { DnsCheck, MailBreakdown, MailView, Panel } from "@/lib/ops/types";
import type { V3Result } from "@/lib/ops/v3-data";
import { Empty, Head, Section, Stat } from "./Blocks";
import { fmtCl } from "./Parts";
import { PauseCard } from "./Pause";
import { MailControls, OutcomeButtons, QueueActions } from "./MailClient";

/**
 * Sección «Prospección y correo» (spec v3 §7). Vistas propias: Hoy · Cola · Enviados y respuestas · Seguimientos · Embudo · Salud.
 * Borradores, Radar, Falta contacto y LinkedIn reutilizan las vistas existentes (Aprobaciones, Prospección, Control, Outreach).
 * Nada de aquí envía: todo pasa por el motor de correo con su ventana, su tope y sus protecciones.
 */
export type MailTab = "correo" | "cola" | "respuestas" | "seguimientos" | "embudo" | "salud";

const KIND: Record<string, string> = { initial: "Primer correo", followup_1: "Seguimiento 1", followup_2: "Seguimiento 2", reply: "Respuesta" };
const day = (d: string) => new Date(d + "T12:00:00Z").toLocaleDateString("es-CL", { weekday: "short", day: "numeric", month: "short", timeZone: "UTC" });

function Unavailable() {
  return <Section id="ops-mail-na" title="Sin datos"><Empty>No pude leer los datos del correo (n8n no responde o aún no tiene esta vista). Reintenta en un minuto.</Empty></Section>;
}

function Breakdown({ title, rows, min }: { title: string; rows: MailBreakdown[]; min: number }) {
  return (
    <>
      <h4 className="ops-h4">{title}</h4>
      {rows.length ? (
        <ul className="ops-list ops-signals">
          {rows.slice(0, 12).map((r) => (
            <li key={r.key}><span className="ops-row-title">{r.key}</span><span className="ops-row-sub">{r.sent} enviados · {r.enough ? `${r.replied} respondieron (${r.rate_pct} %)` : `sin datos suficientes (mínimo ${min})`}</span></li>
          ))}
        </ul>
      ) : <Empty>Aún no hay envíos para desglosar.</Empty>}
    </>
  );
}

export async function MailSection({ tab, mP, dnsP, panel, fetchedAt, stale }: { tab: MailTab; mP: Promise<V3Result<MailView>>; dnsP: Promise<DnsCheck | null>; panel: Panel; fetchedAt: number; stale: boolean }) {
  const r = await mP;
  const m = r.ok ? r.value : null;
  const at = m ? Date.parse(m.generated_at) || fetchedAt : fetchedAt;

  if (tab === "correo") {
    const h = m?.hoy;
    return (
      <>
        <Head title="Prospección y correo" sub="Hoy: envíos, ventana, tope y pausa" fetchedAt={at} stale={stale} />
        {!h ? <Unavailable /> : (
          <>
            <Section id="ops-mh" title="Hoy" aside={<span className="ops-note">Gmail · {h.mode === "live" ? "en vivo" : h.mode}{h.paused ? " · EN PAUSA" : ""}</span>}>
              <div className="ops-stats">
                <Stat n={`${h.sent_today}/${h.cap}`} label="enviados hoy / tope" tone="hi" />
                <Stat n={h.drafts} label="borradores" href="/ops?view=aprobaciones&filter=correos" />
                <Stat n={h.approved} label="aprobados en cola" href="/ops?view=cola" />
                <Stat n={`${h.will_today} · ${h.will_next}`} label="saldrán hoy · próximo día" />
              </div>
              <p className="ops-foot">Ventana {h.window.start}–{h.window.end} (lun–vie, hora Chile) · {h.in_window ? "ahora dentro de la ventana" : "ahora fuera de la ventana"} · próximo envío: {h.next_send}.</p>
              <p className="ops-foot">Envío automático: <strong>{h.autosend.enabled ? `ON (score ≥ ${h.autosend.min_score})` : "OFF"}</strong> — se cambia en <Link href="/ops?view=control">Falta contacto</Link>.</p>
            </Section>
            <Section id="ops-mctl" title="Controles" aside={h.updated_by ? <span className="ops-note">último cambio: {h.updated_by}{h.updated_at ? ` · ${fmtCl(h.updated_at)}` : ""}</span> : undefined}>
              <MailControls hoy={h} />
            </Section>
            {panel.v3 ? <PauseCard pause={panel.v3.pause} scheduled={panel.content.scheduled} /> : null}
            <Section id="ops-mfoot" title="Pie legal (solo lectura)">
              {h.legal_footer ? <p className="ops-copy ops-copy-s">{h.legal_footer}</p> : <Empty>Sin pie legal configurado.</Empty>}
            </Section>
          </>
        )}
      </>
    );
  }

  if (tab === "cola") {
    return (
      <>
        <Head title="Cola de envío" sub="Lo aprobado, en orden de salida" fetchedAt={at} stale={stale} />
        {!m ? <Unavailable /> : (
          <Section id="ops-mq" title={`${m.cola.length} aprobados`} aside={<span className="ops-note">hoy saldrán {m.hoy.will_today} · próximo día {m.hoy.will_next}</span>}>
            {m.cola.length ? (
              <ul className="ops-list" data-testid="mail-queue">
                {m.cola.map((q) => (
                  <li key={q.id} className="ops-mrow">
                    <span className="ops-row-main">
                      <span className="ops-row-head"><span className="ops-tag">#{q.position}</span><span className="ops-row-title">{q.company}</span></span>
                      <span className="ops-row-sub">{KIND[q.kind] ?? q.kind} · {q.subject} · sale {q.eta}</span>
                    </span>
                    <QueueActions id={q.id} status={q.status} />
                  </li>
                ))}
              </ul>
            ) : <Empty>No hay correos aprobados esperando salida.</Empty>}
            <p className="ops-foot">«Volver a borrador» conserva el texto y anula la aprobación. «Cancelar» lo saca de la cola (no se envía).</p>
          </Section>
        )}
      </>
    );
  }

  if (tab === "respuestas") {
    return (
      <>
        <Head title="Enviados y respuestas" sub="Hilos con su clasificación" fetchedAt={at} stale={stale} />
        {!m ? <Unavailable /> : (
          <>
            <Section id="ops-mr" title={`Respuestas (${m.respuestas.replies.length})`}>
              {m.respuestas.replies.length ? (
                <ul className="ops-list" data-testid="mail-replies">
                  {m.respuestas.replies.map((x) => (
                    <li key={x.id} className="ops-mrow">
                      <span className="ops-row-main">
                        <span className="ops-row-head"><span className="ops-tag">{x.cls_label}</span><span className="ops-row-title">{x.company}</span></span>
                        <span className="ops-row-sub">{fmtCl(x.at)}{x.subject ? ` · ${x.subject}` : ""}</span>
                        {x.snippet ? <span className="ops-row-sub">«{x.snippet}»</span> : null}
                        {x.reply_draft ? <span className="ops-row-sub">Hay un borrador de respuesta: <Link href="/ops?view=aprobaciones&filter=correos">revisarlo</Link> (siempre con tu aprobación).</span> : null}
                      </span>
                      {x.cls === "reply" || x.cls === "decline" ? <OutcomeButtons candidateId={x.candidate_id} company={x.company} /> : null}
                    </li>
                  ))}
                </ul>
              ) : <Empty>Aún no hay respuestas.</Empty>}
              <p className="ops-foot">«Ganado» se marca directamente en GHL: eso crea al cliente.</p>
            </Section>
            <Section id="ops-ms" title={`Enviados (${m.respuestas.sent.length} recientes)`}>
              {m.respuestas.sent.length ? (
                <ul className="ops-list ops-signals">
                  {m.respuestas.sent.map((s) => <li key={s.id}><span className="ops-row-title">{s.company}</span><span className="ops-row-sub">{KIND[s.kind] ?? s.kind} · {fmtCl(s.sent_at)} · {s.answer ?? "sin respuesta"}</span></li>)}
                </ul>
              ) : <Empty>Aún no hay envíos.</Empty>}
            </Section>
          </>
        )}
      </>
    );
  }

  if (tab === "seguimientos") {
    return (
      <>
        <Head title="Seguimientos" sub="Los que vienen (+días hábiles). Nunca se envían solos." fetchedAt={at} stale={stale} />
        {!m ? <Unavailable /> : (
          <>
            <Section id="ops-mfd" title={`Borradores de seguimiento (${m.seguimientos.drafts.length})`}>
              {m.seguimientos.drafts.length ? (
                <ul className="ops-list ops-signals">
                  {m.seguimientos.drafts.map((d) => <li key={d.id}><span className="ops-row-title">{d.company} · {d.label}</span><span className="ops-row-sub">{d.status === "approved" ? "aprobado" : "borrador"} · {d.subject} · <Link href="/ops?view=aprobaciones&filter=correos">editar o aprobar</Link></span></li>)}
                </ul>
              ) : <Empty>No hay borradores de seguimiento.</Empty>}
            </Section>
            <Section id="ops-mfu" title={`Próximos (${m.seguimientos.upcoming.length})`} aside={<span className="ops-note">+{m.hoy.followup_days[0]} y +{m.hoy.followup_days[1]} días hábiles</span>}>
              {m.seguimientos.upcoming.length ? (
                <ul className="ops-list ops-signals">
                  {m.seguimientos.upcoming.map((u) => <li key={u.candidate_id + u.n}><span className="ops-row-title">{u.company} · {u.label}</span><span className="ops-row-sub">{u.overdue ? "corresponde desde el " : "corresponde el "}{day(u.due)}</span></li>)}
                </ul>
              ) : <Empty>Nada por venir: nadie espera seguimiento.</Empty>}
              <p className="ops-foot">El planificador prepara el borrador cuando corresponde; tú lo apruebas.</p>
            </Section>
          </>
        )}
      </>
    );
  }

  if (tab === "embudo") {
    return (
      <>
        <Head title="Embudo" sub="De investigado a cliente" fetchedAt={at} stale={stale} />
        {!m ? <Unavailable /> : (
          <Section id="ops-mfun" title="Embudo">
            <ol className="ops-funnel" data-testid="mail-funnel">
              {m.embudo.stages.map((s) => <li key={s.stage}><strong>{s.count}</strong><span>{s.stage}</span></li>)}
            </ol>
            <Breakdown title="Por rubro" rows={m.embudo.by_industry} min={m.embudo.min_sample} />
            <Breakdown title="Por ángulo" rows={m.embudo.by_angle} min={m.embudo.min_sample} />
            <p className="ops-foot">Las tasas solo aparecen con {m.embudo.min_sample} envíos o más por grupo (se cambia en «Hoy → Controles»).</p>
          </Section>
        )}
      </>
    );
  }

  // Salud
  const dns = await dnsP;
  const gmail = panel.system.components.find((c) => /gmail/i.test(c.name));
  return (
    <>
      <Head title="Salud del envío" sub="Rebotes, bajas, supresión, dominio y ritmo" fetchedAt={at} stale={stale} />
      {!m ? <Unavailable /> : (
        <>
          <Section id="ops-mhl" title="Últimos 7 días" aside={<span className={`ops-pill ops-pill-${m.salud.level === "critical" ? "fallo" : m.salud.level === "high" ? "atencion" : "ok"}`}>{m.salud.level === "critical" ? "Crítico" : m.salud.level === "high" ? "Atención" : "OK"}</span>}>
            <div className="ops-stats">
              <Stat n={m.salud.sent7} label="enviados" />
              <Stat n={`${m.salud.bounces7} (${m.salud.rate_pct} %)`} label="rebotes" tone={m.salud.level !== "ok" ? "hi" : undefined} />
              <Stat n={m.salud.unsubs7} label="bajas" />
              <Stat n={m.salud.complaints7} label="reclamos" />
            </div>
            {m.salud.alert ? <p className="ops-foot ops-err">{m.salud.alert}</p> : null}
            <p className="ops-foot" data-testid="warmup"><strong>Calentamiento:</strong> {m.salud.suggestion.text}</p>
          </Section>
          <Section id="ops-mpace" title="Ritmo real vs. tope">
            <ul className="ops-list ops-signals">
              {m.salud.pace.map((p) => <li key={p.day}><span className="ops-row-title">{day(p.day)}</span><span className="ops-row-sub">{p.sent} de {p.cap}</span></li>)}
            </ul>
            <p className="ops-foot">Último envío: {fmtCl(m.salud.last_sent_at)}.</p>
          </Section>
          <Section id="ops-mdns" title="Conexión y dominio">
            <ul className="ops-list ops-signals">
              <li><span className="ops-row-title">Gmail</span><span className="ops-row-sub">{gmail ? `${gmail.status === "ok" ? "conectado" : gmail.status} · ${gmail.reason}` : "sin dato en este momento (ver Sistema)"}</span></li>
              {dns ? dns.detail.map((d) => <li key={d}><span className="ops-row-sub">{d}</span></li>) : <li><span className="ops-row-sub">No pude consultar el DNS ahora; se reintenta solo.</span></li>}
            </ul>
            {dns ? <p className="ops-foot">{dns.domain}: SPF {dns.spf ? "OK" : "revisar"} · DKIM {dns.dkim ? "OK" : "revisar"} · DMARC {dns.dmarc ? "OK" : "revisar"} · verificado {fmtCl(dns.checked_at)} (se revisa a diario).</p> : null}
          </Section>
          <Section id="ops-msup" title={`Lista de supresión (${m.salud.suppression_total})`}>
            {m.salud.suppression.length ? (
              <details className="ops-more-box">
                <summary>Ver correos que nunca reciben mensajes</summary>
                <ul className="ops-list ops-signals">{m.salud.suppression.map((s) => <li key={s.email}><span className="ops-row-title ops-mono">{s.email}</span><span className="ops-row-sub">{s.reason ?? "—"}{s.at ? ` · ${fmtCl(s.at)}` : ""}</span></li>)}</ul>
              </details>
            ) : <Empty>La lista está vacía.</Empty>}
            <p className="ops-foot">Los rebotes definitivos y las bajas se agregan solos. Para agregar uno a mano, pídeselo a Hermes («suprime este correo»).</p>
          </Section>
        </>
      )}
    </>
  );
}
