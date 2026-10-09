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

export type PiecePreview = {
  hook: string | null;
  body: string | null;
  cta: string | null;
  hashtags: string[];
  slides: { layout: string | null; kicker: string | null; title: string; body: string | null; items: string[]; compare: string[]; figure: string | null }[];
  media: string[];
  sources: { title: string; url: string }[];
  rationale: string | null;
  format: string | null;
  proposed_at: string | null;
  proposed_label: string | null;
  ghl_post: boolean;
  cta_mode?: string | null;
  editorial?: { type: string; visual_need: string | null; visual_why: string | null } | null;
  resource?: { name: string; url: string } | null;
};

export type PieceRow = {
  preview?: PiecePreview | null;
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

export type LinkedinRow = { company: string; short: string; state: string | null; state_label: string | null; person: string | null; role: string | null; next_action: string | null; last_event_at: string | null; reply: string | null; score: number | null };

export type Weekly = {
  week_start: string; week_end: string; target: number; min: number; max: number;
  done: number; published: number; scheduled: number; in_review: number; coverage: number;
  state: "falta" | "ritmo" | "correcto" | "cubierta" | "exceso"; state_label: string;
  runway_days: number; runway_min: number; runway_max: number; runway_ok: boolean; covered: boolean;
};

/** Contacto preparado (9-oct): cada Investigado válido termina en una salida visible. */
export type PrepRow = {
  id: string; company: string; score: number | null; band: string | null; state: string; label: string; reason: string;
  person: string | null; role: string | null; email: string | null; email_kind: string | null; linkedin: string | null; priority: string | null; message_id: string | null; score_mail: number | null;
  li: { status: string; profile_url: string | null; invitation: string | null; message: string | null; prepared_at: string | null; invite_sent_at: string | null; message_sent_at: string | null; follow_up_at: string | null } | null;
  find: { draft: { subject: string; body: string } | null; at: string | null } | null;
};
export type Prep = {
  counts: Record<string, number>;
  lists: Record<string, PrepRow[]>;
  valid_unactioned: number; investigated: number; sent_today: number; replies_7d: number; followup_drafts: number; generated_at: string;
  autosend: { enabled: boolean; min_score: number; updated_at: string | null };
};

export type Panel = {
  prep?: Prep;
  outreach?: {
    email: { mode: string; sent_today: number; cap: number; drafts: number; approved_waiting: number };
    linkedin: { mode: string; imported_today: number; cap: number; ready: number; pending_approval: number; in_campaign: number; replied: number; errors: number };
  };
  approvals?: { emails: number; linkedin: number; content: number };
  linkedin: {
    mode: string;
    counts: Record<"pendiente" | "en_lista" | "en_campana" | "conexion" | "mensaje" | "followup" | "respondio" | "rechazo" | "error", number>;
    ready: number;
    rows: LinkedinRow[];
    note: string;
  };
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
    weekly?: Weekly;
    signals_count: number;
    signals: Signal[];
    in_review: PieceRow[];
    scheduled: PieceRow[];
    published: PieceRow[];
    failed: string[];
    metrics_ready: number;
    /** Ola A (8-oct-2026): campos opcionales para tolerar un payload anterior. */
    queue?: { pending: number; max: number; full: boolean };
    rss?: { enabled: boolean; feeds_total: number; feeds_ok: number; failing: { slug: string; error: string; failures: number }[]; new_items: number; last_checked_ago: string | null; last_run: { ago: string } | null };
    intel?: { enabled: boolean; report_ago: string | null; competitors: string[]; gaps: string[]; saturated: string[]; own_angles: string[]; last_run: { ago: string } | null };
    resources?: { active: number; rows: { slug: string; name: string; type: string; cta_mode: string; url: string; uses: number }[] };
    founder?: { pending_answer: number; answered_without_pieces: number; last: { status: string; question: string; ago: string } | null };
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

/** ---- Acciones desde /ops (workflow n8n «29 Ops Actions»; la clave de aprobación vive solo en el servidor) ---- */
export type EmailCard = {
  id: string; candidate_id: string; kind: string; company: string; contact_name: string | null; contact_role: string | null; to: string | null; subject: string | null; body: string | null;
  status: string; editable: boolean; can_reopen: boolean; can_approve: boolean; can_reject: boolean; hash: string | null;
  created_at: string; updated_at: string | null; approved_at: string | null; approved_by: string | null; scheduled_for: string | null; sent_at: string | null; error: string | null;
  score: number | null; band: string | null; reason: string | null; evidence: string | null; recommended_channel: string | null; suppressed: boolean; rejected_reason: string | null;
  cold?: ColdQuality | null; previous?: PreviousVersion | null;
};
export type ColdQuality = { score: number; level: string | null; warnings: string[]; rewards: string[]; similarity: { max: number; with: string | null } | null; cta_kind: string | null; words: number | null; evidence: string[]; insight: string | null; friction: string | null; angle: string | null; cta_reason: string | null; linted_at: string | null };
export type PreviousVersion = { subject: string; body: string; score: number | null; at: string | null; by: string | null; reason: string | null; versions: number };
export type LinkedinReady = { candidate_id: string; company: string; person: string | null; role: string | null; url: string | null; score: number | null; band: string | null; angle: string | null; fact: string | null; reason: string | null; list_id: string | null; campaign_id: string | null; source: string | null };
export type LinkedinSent = { candidate_id: string; company: string; person: string | null; role: string | null; url: string | null; approved_by: string | null; approved_at: string | null; imported_at: string | null; list_id: string | null; campaign_id: string | null; score: number | null; angle: string | null; state: string; state_label: string; last_event: string | null; last_event_at: string | null; import_code: string | null; campaign_code: string | null; mode_at_import: string | null };
export type Overview = {
  generated_at: string;
  email: { mode: string; paused: boolean; cap: number; sent_today: number; window: string; cards: EmailCard[] };
  linkedin: { mode: string; cap: number; imported_today: number; counts: Record<string, number>; ready: LinkedinReady[]; sent: LinkedinSent[] };
};
export type OverviewResult = { ok: true; overview: Overview } | { ok: false; reason: "not_configured" | "unreachable" | "bad_response" };

export type OpsActionName = "email_save" | "email_approve" | "email_reject" | "email_reopen" | "linkedin_approve" | "linkedin_reject" | "content_approve" | "content_reject" | "autosend_set" | "autosend_sweep" | "prep_li_sent" | "prep_hold" | "prep_release" | "prep_contact";
export type OpsActionInput = { action: OpsActionName; request_id: string; message_id?: string; candidate_id?: string; piece_id?: string; subject?: string; body?: string; expected_hash?: string; reason?: string; enabled?: boolean; min_score?: number; kind?: string; text?: string; email?: string; linkedin?: string };
export type OpsActionState = { ok: boolean; message: string; status?: string; hash?: string | null; needsGhl?: boolean; replayed?: boolean };
