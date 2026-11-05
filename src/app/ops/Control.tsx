"use client";

import { useState } from "react";
import Link from "next/link";
import { useToast } from "./Shell";
import { useRunner } from "./Approvals";
import { fmtCl } from "./Parts";
import type { Prep, PrepRow } from "@/lib/ops/types";

/** Control Center (9-oct): de Investigado a «contacto preparado». Nada se envía desde aquí salvo lo que el flujo real ya envía con tu aprobación. */

function Tile({ n, label, tone, href, sub }: { n: number | string; label: string; tone?: "hi" | "bad"; href?: string; sub?: string }) {
  const cls = `ops-stat${tone === "hi" ? " ops-stat-hi" : ""}${tone === "bad" ? " ops-stat-bad" : ""}${href ? " ops-stat-link" : ""}`;
  const inner = (<><strong>{n}</strong><span>{label}</span>{sub ? <span className="ops-foot">{sub}</span> : null}</>);
  return href ? <Link href={href} scroll={false} className={cls}>{inner}</Link> : <div className={cls}>{inner}</div>;
}

function useCopy() {
  const toast = useToast();
  return async (text: string, what: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast(true, `${what} copiada.`);
    } catch {
      toast(false, "No pude copiar. Mantén presionado el texto para copiarlo a mano.");
    }
  };
}

/* ------------------------------------------------------------ Envío automático */
function Autosend({ a, pendingDirect }: { a: Prep["autosend"]; pendingDirect: number }) {
  const { pending, run } = useRunner();
  const [confirm, setConfirm] = useState(false);
  const flip = async (enabled: boolean) => {
    const r = await run({ action: "autosend_set", enabled });
    if (r?.ok) await run({ action: "autosend_sweep" });
    setConfirm(false);
  };
  return (
    <section className="ops-card" aria-labelledby="ctl-auto">
      <header className="ops-card-h">
        <h2 id="ctl-auto">Envío automático</h2>
        <span className={`ops-pill ops-pill-${a.enabled ? "atencion" : "ok"}`} data-testid="autosend-state">{a.enabled ? "ON" : "OFF"}</span>
      </header>
      <p className="ops-foot">
        {a.enabled
          ? `ON: los borradores con score ≥ ${a.min_score}, correo directo publicado (no info@/contacto@), que no sean B/C y sin respuesta del prospecto se aprueban solos y salen con el tope diario y la ventana lun–vie de siempre. Los genéricos siguen en Aprobaciones.`
          : "OFF: todos los correos quedan en Aprobaciones y salen solo cuando tú los apruebas. Al encenderlo, solo salen solos los que cumplen las reglas seguras."}
        {a.updated_at ? ` Último cambio: ${fmtCl(a.updated_at)}.` : ""}
      </p>
      {!a.enabled && pendingDirect > 0 ? <p className="ops-foot">Si lo enciendes ahora, {pendingDirect} borrador(es) podrían salir solos si cumplen las reglas.</p> : null}
      {confirm ? (
        <div className="ops-reject">
          <p className="ops-foot"><strong>¿Encender el envío automático?</strong> Los correos elegibles se aprobarán y enviarán sin pasar por ti. Puedes apagarlo cuando quieras: lo que no haya salido vuelve a borrador.</p>
          <div className="ops-btns">
            <button type="button" className="ops-btn ops-btn-primary" disabled={pending} onClick={() => flip(true)}>{pending ? "Aplicando…" : "Sí, encender"}</button>
            <button type="button" className="ops-btn" disabled={pending} onClick={() => setConfirm(false)}>Cancelar</button>
          </div>
        </div>
      ) : (
        <div className="ops-btns">
          {a.enabled
            ? <button type="button" className="ops-btn ops-btn-danger" disabled={pending} onClick={() => flip(false)}>{pending ? "Apagando…" : "Apagar envío automático"}</button>
            : <button type="button" className="ops-btn" disabled={pending} onClick={() => setConfirm(true)}>Encender envío automático…</button>}
        </div>
      )}
    </section>
  );
}

/* ------------------------------------------------------------ LinkedIn por enviar */
const LI_STEP: Record<string, string> = { ready: "Por enviar", invite_sent: "Invitación enviada", connected: "Conectados", message_sent: "Mensaje enviado" };

function LinkedinCard({ r }: { r: PrepRow }) {
  const { pending, run } = useRunner();
  const copy = useCopy();
  const li = r.li;
  const [text, setText] = useState("");
  const [asking, setAsking] = useState<null | "reply" | "message">(null);
  if (!li) return null;
  const st = li.status;
  const act = async (kind: string, t?: string) => {
    const res = await run({ action: "prep_li_sent", candidate_id: r.id, kind, text: t });
    if (res?.ok) { setAsking(null); setText(""); }
  };
  return (
    <article className="ops-ap" data-kind="linkedin-manual" data-state={st}>
      <details open={st === "ready"}>
        <summary className="ops-ap-sum">
          <span className="ops-row-main">
            <span className="ops-row-head"><span className="ops-tag ops-tag-li">LinkedIn</span><span className="ops-row-title">{r.company}</span></span>
            <span className="ops-row-sub ops-ellipsis">{[r.person, r.role, LI_STEP[st] ?? st].filter(Boolean).join(" · ")}</span>
          </span>
          {r.score != null ? <span className={`ops-score ops-score-${r.band ?? "neutral"}`}>{r.score}</span> : null}
        </summary>
        <div className="ops-ap-body">
          <dl className="ops-detail">
            <dt>Perfil</dt>
            <dd>{li.profile_url ? <a className="ops-link" href={li.profile_url} target="_blank" rel="noreferrer noopener">Abrir perfil en LinkedIn ↗</a> : "—"}</dd>
            <dt>Estado</dt>
            <dd>{LI_STEP[st] ?? st}{li.invite_sent_at ? ` · invitación ${fmtCl(li.invite_sent_at)}` : ""}{li.message_sent_at ? ` · mensaje ${fmtCl(li.message_sent_at)}` : ""}{li.follow_up_at ? ` · seguimiento ${fmtCl(li.follow_up_at)}` : ""}</dd>
          </dl>
          {li.invitation ? (<><h4 className="ops-h4">Invitación</h4><p className="ops-copy">{li.invitation}</p></>) : null}
          {li.message ? (<><h4 className="ops-h4">Mensaje (para después de conectar)</h4><p className="ops-copy">{li.message}</p></>) : null}
          <div className="ops-btns">
            {li.invitation ? <button type="button" className="ops-btn" onClick={() => copy(li.invitation as string, "Invitación")}>Copiar invitación</button> : null}
            {li.message ? <button type="button" className="ops-btn" onClick={() => copy(li.message as string, "Mensaje")}>Copiar mensaje</button> : null}
          </div>
          <p className="ops-foot">Lo envías tú en LinkedIn. Cuando lo hagas, márcalo aquí: queda registrado en GHL (Contactado), con fecha, canal, texto y seguimiento a +3 días hábiles.</p>
          <div className="ops-btns">
            {st === "ready" ? <button type="button" className="ops-btn ops-btn-primary" disabled={pending} onClick={() => act("invitation")}>{pending ? "Registrando…" : "Envié la invitación"}</button> : null}
            {st === "ready" || st === "invite_sent" ? <button type="button" className="ops-btn" disabled={pending} onClick={() => act("connected")}>Aceptó la conexión</button> : null}
            {st === "ready" || st === "invite_sent" || st === "connected" ? <button type="button" className="ops-btn" disabled={pending} onClick={() => act("message")}>Envié el mensaje</button> : null}
            {st !== "ready" ? <button type="button" className="ops-btn" disabled={pending} onClick={() => setAsking(asking === "reply" ? null : "reply")}>Respondió…</button> : null}
            {st !== "ready" ? <button type="button" className="ops-btn ops-btn-danger" disabled={pending} onClick={() => act("closed")}>Cerrar sin respuesta</button> : null}
          </div>
          {asking === "reply" ? (
            <div className="ops-reject">
              <label className="ops-lab" htmlFor={`rp-${r.id}`}>¿Qué respondió?</label>
              <textarea id={`rp-${r.id}`} className="ops-textarea" rows={3} value={text} maxLength={1000} onChange={(e) => setText(e.target.value)} />
              <div className="ops-btns">
                <button type="button" className="ops-btn ops-btn-primary" disabled={pending || text.trim().length < 2} onClick={() => act("reply", text.trim())}>Registrar respuesta</button>
                <button type="button" className="ops-btn" onClick={() => setAsking(null)}>Cancelar</button>
              </div>
            </div>
          ) : null}
        </div>
      </details>
    </article>
  );
}

/* ------------------------------------------------------------ Buscar contacto */
function FindCard({ r }: { r: PrepRow }) {
  const { pending, run } = useRunner();
  const copy = useCopy();
  const [email, setEmail] = useState("");
  const [linkedin, setLinkedin] = useState("");
  const d = r.find?.draft ?? null;
  return (
    <article className="ops-ap" data-kind="find-contact">
      <details>
        <summary className="ops-ap-sum">
          <span className="ops-row-main">
            <span className="ops-row-head"><span className="ops-tag">Buscar contacto</span><span className="ops-row-title">{r.company}</span></span>
            <span className="ops-row-sub ops-ellipsis">{[r.person, r.role, r.reason].filter(Boolean).join(" · ")}</span>
          </span>
          {r.score != null ? <span className={`ops-score ops-score-${r.band ?? "neutral"}`}>{r.score}</span> : null}
        </summary>
        <div className="ops-ap-body">
          {d ? (<><h4 className="ops-h4">Mensaje ya redactado</h4>{d.subject ? <p className="ops-copy ops-copy-s">{d.subject}</p> : null}<p className="ops-copy">{d.body}</p>
            <div className="ops-btns"><button type="button" className="ops-btn" onClick={() => copy(d.body, "Mensaje")}>Copiar mensaje</button></div></>) : <p className="ops-foot">Todavía no hay mensaje redactado.</p>}
          <p className="ops-foot">Busca el correo o el LinkedIn de la persona y pégalo aquí: el mensaje queda listo en Aprobaciones (no se envía).</p>
          <label className="ops-lab" htmlFor={`em-${r.id}`}>Correo</label>
          <input id={`em-${r.id}`} className="ops-input" type="email" value={email} maxLength={200} placeholder="nombre@empresa.cl" onChange={(e) => setEmail(e.target.value)} />
          <label className="ops-lab" htmlFor={`lk-${r.id}`}>o enlace de LinkedIn</label>
          <input id={`lk-${r.id}`} className="ops-input" value={linkedin} maxLength={300} placeholder="https://www.linkedin.com/in/…" onChange={(e) => setLinkedin(e.target.value)} />
          <div className="ops-btns">
            <button type="button" className="ops-btn ops-btn-primary" disabled={pending || (!email.trim() && !linkedin.trim())} onClick={async () => { const x = await run({ action: "prep_contact", candidate_id: r.id, email: email.trim(), linkedin: linkedin.trim() }); if (x?.ok) { setEmail(""); setLinkedin(""); } }}>{pending ? "Guardando…" : "Guardar contacto"}</button>
          </div>
        </div>
      </details>
    </article>
  );
}

/* ------------------------------------------------------------ En espera */
function HoldRow({ r }: { r: PrepRow }) {
  const { pending, run } = useRunner();
  return (
    <li className="ops-row ops-hold-row" data-kind="hold">
      <span className="ops-row-main">
        <span className="ops-row-head"><span className="ops-row-title">{r.company}</span><span className="ops-tag">{r.state === "no_contactar" ? "No contactar" : "En espera"}</span>{r.priority ? <span className="ops-tag">{r.priority}</span> : null}</span>
        <span className="ops-row-sub">{r.reason || "Sin razón registrada"}</span>
      </span>
      <button type="button" className="ops-btn" disabled={pending} onClick={() => run({ action: "prep_release", candidate_id: r.id })}>{pending ? "…" : "Liberar"}</button>
    </li>
  );
}

function SimpleRow({ r, extra }: { r: PrepRow; extra?: string }) {
  return (
    <li className="ops-row">
      <span className="ops-row-main">
        <span className="ops-row-head"><span className="ops-row-title">{r.company}</span>{r.priority ? <span className="ops-tag">{r.priority}</span> : null}</span>
        <span className="ops-row-sub ops-ellipsis">{[r.person, r.email ? `${r.email}${r.email_kind === "generic" ? " (genérico)" : ""}` : r.linkedin ? "LinkedIn" : "sin contacto", extra].filter(Boolean).join(" · ")}</span>
      </span>
      {r.score != null ? <span className={`ops-score ops-score-${r.band ?? "neutral"}`}>{r.score}</span> : null}
    </li>
  );
}

/* ------------------------------------------------------------ Centro */
export function ControlCenter({ prep }: { prep: Prep }) {
  const c = prep.counts;
  const li = [...(prep.lists.linkedin_listo ?? []), ...(prep.lists.linkedin_en_curso ?? [])];
  const find = prep.lists.buscar_contacto ?? [];
  const hold = [...(prep.lists.en_espera ?? []), ...(prep.lists.no_contactar ?? [])];
  const open = prep.lists.sin_accion ?? [];
  const mail = [...(prep.lists.email_listo ?? []), ...(prep.lists.email_aprobado ?? [])];
  const directDrafts = (prep.lists.email_listo ?? []).filter((x) => x.email_kind === "direct" && (x.score_mail ?? 0) >= prep.autosend.min_score).length;
  return (
    <>
      <section className="ops-card" aria-labelledby="ctl-metrics">
        <header className="ops-card-h"><h2 id="ctl-metrics">Control comercial</h2><span className={`ops-pill ops-pill-${prep.valid_unactioned ? "fallo" : "ok"}`}>{prep.valid_unactioned ? "Hay Investigados sin acción" : "Todo con próxima acción"}</span></header>
        <div className="ops-stats ops-stats-6">
          <Tile n={prep.valid_unactioned} label="Investigados válidos SIN ACCIÓN" tone={prep.valid_unactioned ? "bad" : "hi"} sub="objetivo: 0" />
          <Tile n={c.email_listo + c.email_aprobado} label="Emails listos para aprobación" tone="hi" href="/ops?view=aprobaciones&filter=correos" sub={c.email_aprobado ? `${c.email_aprobado} ya aprobados` : undefined} />
          <Tile n={c.linkedin_listo} label="LinkedIn por enviar" tone={c.linkedin_listo ? "hi" : undefined} />
          <Tile n={c.waalaxy + c.linkedin_en_curso} label="LinkedIn / Waalaxy en curso" />
          <Tile n={c.buscar_contacto} label="Buscar contacto" tone={c.buscar_contacto ? "hi" : undefined} />
          <Tile n={c.en_espera + c.no_contactar} label="En espera / no contactar" />
          <Tile n={prep.sent_today} label="Enviados hoy" />
          <Tile n={prep.replies_7d} label="Respuestas (7 días)" tone={prep.replies_7d ? "hi" : undefined} href="/ops?view=outreach" />
          <Tile n={prep.followup_drafts} label="Follow-ups en borrador" href="/ops?view=aprobaciones&filter=correos" />
          <Tile n={prep.investigated} label="En Investigado (total)" />
        </div>
        <p className="ops-foot">Un Investigado válido sin acción es un prospecto que quedó estacionado: sin correo preparado, sin LinkedIn preparado, sin búsqueda de contacto asignada y sin motivo de espera. El job «contact-prep» los prepara 3 veces al día (lun–vie).</p>
      </section>

      <Autosend a={prep.autosend} pendingDirect={directDrafts} />

      <section className="ops-card" aria-labelledby="ctl-mail">
        <header className="ops-card-h"><h2 id="ctl-mail">Correos listos</h2><Link className="ops-note ops-a" href="/ops?view=aprobaciones&filter=correos" scroll={false}>Ir a Aprobaciones →</Link></header>
        {mail.length ? <ul className="ops-list">{mail.slice(0, 12).map((r) => <SimpleRow key={r.id} r={r} extra={`${r.state === "email_aprobado" ? "aprobado" : "borrador"}${r.score_mail != null ? ` · calidad ${r.score_mail}` : ""}`} />)}</ul> : <p className="ops-empty">No hay correos esperando.</p>}
        {mail.length > 12 ? <p className="ops-foot">y {mail.length - 12} más en Aprobaciones.</p> : null}
      </section>

      <section className="ops-card" aria-labelledby="ctl-li">
        <header className="ops-card-h"><h2 id="ctl-li">LinkedIn por enviar</h2><span className="ops-note">envío manual · sin Waalaxy</span></header>
        {li.length ? <div className="ops-ap-list">{li.map((r) => <LinkedinCard key={r.id} r={r} />)}</div> : <p className="ops-empty">No hay mensajes de LinkedIn pendientes ni en curso.</p>}
      </section>

      <section className="ops-card" aria-labelledby="ctl-find">
        <header className="ops-card-h"><h2 id="ctl-find">Buscar contacto</h2><span className="ops-note">solo falta pegar el correo o el LinkedIn</span></header>
        {find.length ? <div className="ops-ap-list">{find.map((r) => <FindCard key={r.id} r={r} />)}</div> : <p className="ops-empty">Ningún prospecto espera contacto.</p>}
      </section>

      <section className="ops-card" aria-labelledby="ctl-open">
        <header className="ops-card-h"><h2 id="ctl-open">Investigados sin acción</h2>{open.length ? <span className="ops-count">{open.length}</span> : null}</header>
        {open.length ? <ul className="ops-list">{open.map((r) => <SimpleRow key={r.id} r={r} extra="esperando la próxima corrida" />)}</ul> : <p className="ops-empty">Ninguno: todo Investigado válido tiene su próxima acción.</p>}
      </section>

      <section className="ops-card" aria-labelledby="ctl-hold">
        <header className="ops-card-h"><h2 id="ctl-hold">En espera / no contactar</h2><span className="ops-note">siempre con una razón comercial</span></header>
        {hold.length ? <ul className="ops-list">{hold.map((r) => <HoldRow key={r.id} r={r} />)}</ul> : <p className="ops-empty">Nadie en espera.</p>}
      </section>
    </>
  );
}
