import Link from "next/link";
import type { Status } from "@/lib/ops/types";
import { Freshness } from "./Client";

/** Bloques de presentación compartidos por las vistas de /ops (servidor). */
export function Pill({ status, children }: { status: Status; children: React.ReactNode }) {
  return <span className={`ops-pill ops-pill-${status}`}>{children}</span>;
}

export function Stat({ n, label, tone, href }: { n: number | string; label: string; tone?: "hi"; href?: string }) {
  const inner = (<><strong>{n}</strong><span>{label}</span></>);
  const cls = tone === "hi" ? "ops-stat ops-stat-hi" : "ops-stat";
  return href ? <Link href={href} scroll={false} className={`${cls} ops-stat-link`}>{inner}</Link> : <div className={cls}>{inner}</div>;
}

export function Section({ id, title, aside, children }: { id: string; title: string; aside?: React.ReactNode; children: React.ReactNode }) {
  return (
    <section className="ops-card" aria-labelledby={id}>
      <header className="ops-card-h">
        <h2 id={id}>{title}</h2>
        {aside}
      </header>
      {children}
    </section>
  );
}

export function Empty({ children }: { children: React.ReactNode }) {
  return <p className="ops-empty">{children}</p>;
}

export function Head({ title, sub, fetchedAt, stale }: { title: string; sub?: string; fetchedAt: number; stale: boolean }) {
  return (
    <div className="ops-top">
      <div>
        <p className="ops-eyebrow">Atacama OS</p>
        <h1>{title}</h1>
        {sub ? <p className="ops-sub">{sub}</p> : null}
      </div>
      <div className="ops-top-r"><Freshness fetchedAt={fetchedAt} stale={stale} /></div>
    </div>
  );
}
