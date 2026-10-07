/** Forma de los datos de /ops. La calcula n8n «25 Atacama Ops» (acción `panel`); aquí solo se tipan y se dibujan. */
export type Status = "ok" | "atencion" | "fallo";

export type AttentionGroup = {
  key: string;
  tone: "act" | "warn";
  title: string;
  count: number;
  items: string[];
  more: number;
};

export type Prospect = {
  company: string;
  short: string;
  score: number | null;
  band: string | null;
  industry: string | null;
  city: string | null;
  domain: string | null;
  angle: string | null;
  quote: string | null;
  source: string | null;
  days: number;
  is_new: boolean;
};

export type PieceRow = {
  id: string;
  title: string;
  channel: string;
  status: string;
  hook: string | null;
  format: string | null;
  category: string | null;
  score: number | null;
  at: string;
  at_label: string | null;
  metrics?: { window: string; likes: number | null; comments: number | null; shares: number | null; partial: boolean }[];
};

export type Signal = { title: string; type: string | null; angle: string | null; at: string; ago: string };

export type Panel = {
  generated_at: string;
  date_label: string;
  tz: string;
  attention: AttentionGroup[];
  attention_total: number;
  prospecting: {
    backlog: number;
    backlog_alta: number;
    new_since_run: number;
    new_since_run_alta: number;
    contacted: number;
    overdue_review_tasks: number;
    last_run: { at: string; label: string; imported: number; minutes: number; ago: string } | null;
    latest: Prospect[];
  };
  content: {
    signals_count: number;
    signals: Signal[];
    in_review: PieceRow[];
    scheduled: PieceRow[];
    published: PieceRow[];
    failed: string[];
    metrics_ready: number;
  };
  system: {
    overall: Status;
    components: { name: string; status: Status; reason: string }[];
    outreach_mode: string;
    approved_pending: number;
    drafts: number;
    errors24h: { name: string; count: number }[];
    hermes_known: boolean;
  };
  missing: string[];
};

export type PanelResult =
  | { ok: true; panel: Panel; stale: boolean; fetchedAt: number }
  | { ok: false; reason: "not_configured" | "unreachable" | "bad_response" };
