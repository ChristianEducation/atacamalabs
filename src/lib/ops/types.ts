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

export type IgCalendar = {
  window: { start: string; end: string }; enabled: boolean; preparing: number;
  feed: { target: number; coverage: number; missing: number; pending_review: number };
  stories: { coverage: number; missing: number; pending_review: number };
  days: { key: string; label: string; today: boolean; open_stories: string[]; open_feed: boolean;
    feed: { id: string; at: string; format: string; title: string; status: string; status_key: string }[];
    stories: { id: string; at: string; template: string | null; title: string; status: string; status_key: string }[] }[];
};

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

/** Atacama OS v3 · Fase 1: bandeja «Hoy» y pausa general (n8n 25 → panel.v3). */
export type InboxItem = { kind: string; prio: number; count: number; title: string; from: string; age: string; tone: "fresh" | "warn" | "old"; href: string; examples: string[] };
export type PauseState = { paused: boolean; reason: string | null; since: string | null; by: string | null; resume_at: string | null };
/** Fase 4: Ideas de la semana (n8n 25 ideas_list). */
export type IdeaDeadline = { state: "alcanza" | "justo" | "no_alcanza"; label: string; left: number; need: number; closing: string };
export type IdeaCard = { id: string; week_start: string; channel: string; channel_label: string; format: string; title: string; hook: string | null; objective: string | null; effort: string | null; primary_metric: string | null;
  score: number | null; status: string; origin: string; ficha_complete: boolean; deadline: IdeaDeadline | null; change_request: string | null; decision_reason: string | null; lane: "vps" | "pc"; piece_id: string | null;
  ficha: { audience_insight: string | null; core_message: string | null; structure: { title?: string | null; text?: string }[]; cta: string | null; production: { tools?: string[]; how?: string; material?: string | null; lane?: string }; resource_id: string | null; keyword: string | null; cost_note: string | null; risks: string | null; why: string | null; evidence: { type: string; id: string; note: string | null; url: string | null }[]; competitor_ref: string | null; angle: string | null } };
export type IdeasWeek = { week_start: string; is_next: boolean; counts: { proposed: number; changed: number; approved: number; discarded: number }; discarded_weak: number; weak: { title: string; channel: string | null; reasons: string[] }[]; batch_at: string | null;
  channels: { channel: string; label: string; ideas: IdeaCard[]; folded: IdeaCard[] }[] };
export type IdeasView = { generated_at: string; next_week: string; weeks: IdeasWeek[] };
/** Fase 2: Taller (n8n 25 taller_list; URLs firmadas de 1 h). */
export type TallerVersion = { id: string; version_no: number; kind: string; caption: string | null; created_by: string; created_at: string; cost_credits: number; notes: string | null;
  qa: { score: number | null; problems: string[]; images: string[] } | null; assets: { url: string | null; video: boolean; label: string | null }[] };
export type TallerPiece = { id: string; title: string; channel: string; channel_label: string; format: string; lane: "vps" | "pc"; status: string; status_label: string; week_start: string | null; needs_by: string | null;
  current_version: number | null; credits: number; thumb: string | null; scheduled_at: string | null; ghl_post_id: string | null; proposed_slot: string | null; keyword: string | null; resource_id: string | null;
  idea: { id: string; hook: string | null; objective: string | null; primary_metric: string | null; why: string | null; evidence: { type: string; id: string; note: string | null; url: string | null }[]; structure: { title?: string | null; text?: string }[] } | null;
  versions: TallerVersion[]; feedback: { id: string; scope: string; text: string; status: string; created_at: string; version_id: string | null }[]; overdue: boolean };
export type TallerView = { generated_at: string; labels: Record<string, string>; counts: Record<string, number>; pieces: TallerPiece[]; carousel_direct: boolean };
/** Fase 6: sección «Prospección y correo» (n8n 25 mail_view, solo lectura). */
export type MailQueueRow = { id: string; candidate_id: string; company: string; kind: string; to: string | null; subject: string | null; status: string; approved_at: string | null; scheduled_for: string | null; position: number; eta: string };
export type MailBreakdown = { key: string; sent: number; replied: number; rate_pct: number | null; enough: boolean };
export type MailView = {
  generated_at: string;
  hoy: { mode: string; paused: boolean; cap: number; sent_today: number; window: { start: string; end: string }; in_window: boolean; next_send: string; followup_days: number[]; autosend: { enabled: boolean; min_score: number };
    legal_footer: string | null; funnel_min_sample: number; drafts: number; approved: number; will_today: number; will_next: number; updated_by: string | null; updated_at: string | null };
  cola: MailQueueRow[];
  respuestas: { replies: { id: string; candidate_id: string; company: string; from: string | null; subject: string; snippet: string; cls: string; cls_label: string; at: string; reply_draft: boolean }[];
    sent: { id: string; candidate_id: string; company: string; kind: string; to: string | null; subject: string | null; sent_at: string; answer: string | null }[] };
  seguimientos: { drafts: { id: string; candidate_id: string; company: string; kind: string; label: string; status: string; subject: string | null }[]; upcoming: { candidate_id: string; company: string; n: number; label: string; due: string; overdue: boolean }[] };
  embudo: { stages: { stage: string; count: number }[]; min_sample: number; by_industry: MailBreakdown[]; by_angle: MailBreakdown[] };
  salud: { sent7: number; bounces7: number; unsubs7: number; complaints7: number; rate_pct: number; level: "ok" | "high" | "critical"; alert: string | null; suggestion: { from: number; to: number | null; text: string };
    suppression_total: number; suppression: { email: string; reason: string | null; at: string | null }[]; pace: { day: string; sent: number; cap: number }[]; last_sent_at: string | null };
};
/** Fase 7: historial, alertas abiertas, Mi semana, costos, biblioteca. */
export type HistoryLine = { at: string; day: string; time: string; actor: string; section: string; count: number; text: string; who: string[]; href: string | null };
export type OpenAlert = { key: string; severity: string; title: string; detail: string; since: string; last: string; panel_only: boolean };
export type HistoryData = { history: { generated_at: string; lines: HistoryLine[]; actors: string[]; sections: string[]; days: string[]; retention_days: number }; alerts_open: OpenAlert[] };
export type WeekTask = { id: string; label: string; done: boolean; detail: string; href: string | null; light?: string; meetings?: { at: string; day: string; who: string }[] };
export type WeekData = {
  week: { generated_at: string; week: string; friday: string; ritual: Record<string, string[]>; days: { key: string; label: string; date: string; today: boolean; tasks: WeekTask[] }[]; progress: { done: number; total: number };
    meetings_today: { at: string; day: string; who: string }[]; close: { scheduled: number; total: number; light: string } };
  costs: { higgs: { balance: number | null; spent_week: number; cap: number; reserve: number; week: string | null; at: string | null } | null; pieces: { id: string; topic: string; credits: number; status: string | null }[]; total_pieces: number; note: string };
};
export type LibraryIndex = { font: string; palette: { name: string; hex: string }[]; brand: { name: string; url: string; kind: string }[]; mascot: { name: string; path: string }[]; recipes: { slug: string; title: string; path: string; receta: string; prompts: { name: string; text: string }[] }[] };
/** Fase 8: contenido → ventas, aprendizaje e iteraciones. */
export type ResultsPiece = { id: string; topic: string; channel: string | null; format: string | null; at: string; keyword: string | null; resource: { slug: string; name: string } | null; contacts_dm: number; contacts_web: number; meetings: number; metrics: { likes: number | null; comments: number | null; shares: number | null; window: string } | null };
export type ResultsData = {
  results: { generated_at: string; days: number; pieces: ResultsPiece[]; resources: { slug: string; name: string; web_leads: number; meetings: number; contacts_dm: number; pieces: number }[]; unknown_web: number;
    summary: { week: string; lines: { piece_id: string; contacts: number; meetings: number; text: string }[]; empty_text: string | null };
    iterations: { id: string; topic: string; format: string | null; status: string | null; versions: number; feedback: number; credits: number; days: number; first_try: boolean }[]; note: string };
  learning: { min_sample: number; total_events: number; by_type: Record<string, number>; sufficient: number; patterns: { id: string; target: string; label: string; n: number; sufficient: boolean }[];
    proposals: { id: string; target: string; proposal: string; sample_size: number; status: string; decided_at: string | null; created_at: string; pattern: string | null; citations: number }[] };
  learning_enabled: boolean;
};
export type DnsCheck = { domain: string; checked_at: string; spf: boolean | null; dkim: boolean | null; dmarc: boolean | null; detail: string[] };
export type PanelV3 = { pause: PauseState; nav_v2: boolean; inbox: { items: InboxItem[]; total: number } };

export type Panel = {
  /** Opcional: un n8n anterior no lo trae (se usa la navegación nueva sin bandeja). */
  v3?: PanelV3;
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
    ig?: IgCalendar;
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
  cold?: ColdQuality | null; previous?: PreviousVersion | null; edited_by_christian_at?: string | null;
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

export type OpsActionName = "email_save" | "email_approve" | "email_reject" | "email_reopen" | "linkedin_approve" | "linkedin_reject" | "content_approve" | "content_reject" | "autosend_set" | "autosend_sweep" | "prep_li_sent" | "prep_hold" | "prep_release" | "prep_contact" | "pause_set" | "idea_decide" | "idea_mine" | "taller_feedback" | "taller_approve" | "taller_schedule" | "taller_discard" | "taller_duplicate" | "taller_caption" | "mail_config_set" | "mail_outcome" | "week_ritual_set" | "piece_contact" | "learning_decide";
export type OpsActionInput = { contact_name?: string; handle?: string; keyword?: string; proposal_id?: string; ritual?: Record<string, string[]>; paste?: boolean; daily_cap?: number; window_start?: string; window_end?: string; followup_days?: number[]; funnel_min_sample?: number; outcome?: "reunion" | "perdido"; action: OpsActionName; request_id: string; message_id?: string; candidate_id?: string; piece_id?: string; subject?: string; body?: string; expected_hash?: string; reason?: string; enabled?: boolean; min_score?: number; kind?: string; text?: string; email?: string; linkedin?: string; paused?: boolean; resume_at?: string; idea_id?: string; decision?: string; chips?: string[]; title?: string; channel?: string; format?: string; week_start?: string; scope?: string; schedule_at?: string; caption?: string };
export type OpsActionState = { ok: boolean; message: string; status?: string; hash?: string | null; needsGhl?: boolean; replayed?: boolean; ghlPostId?: string | null };
