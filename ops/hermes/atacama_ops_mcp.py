#!/usr/bin/env python3
"""Atacama OS · herramientas de Hermes (servidor MCP por stdio).

Hermes opera Atacama OS SOLO a través de esto. Cada herramienta hace un POST al workflow n8n «20 Hermes Operator», que:
  - aplica la política de permisos (nivel 1 directo · nivel 2 orden explícita · nivel 3 confirmación y hoy NO ejecuta),
  - llama al Prospect Gateway (workflow 19) o lee GHL de forma acotada,
  - deja auditoría («Christian vía Hermes», herramienta, entidad, resultado, request_id).
Hermes NO tiene el token de GHL. Aquí solo existe la clave de ingesta de n8n (ATACAMA_INGEST_KEY en /opt/data/.env), que nunca se imprime.
Esta versión NO envía mensajes: send_email / send_whatsapp / publish_content / delete_record devuelven la solicitud de confirmación.
"""
import json
import os
import re
import urllib.error
import urllib.parse
import urllib.request
import uuid

try:  # mcp >= 2.0
    from mcp.server.mcpserver import MCPServer as _Server
except ImportError:  # mcp 1.x
    from mcp.server.fastmcp import FastMCP as _Server

ENV_PATH = os.environ.get("ATACAMA_OPS_ENV", "/opt/data/.env")
ALLOWED_DIRS = ("/opt/data/", "/tmp/")
MAX_FILE_BYTES = 1_500_000

mcp = _Server("atacama-os")
_ISSUED = set()


def _env():
    vals = {}
    try:
        with open(ENV_PATH, "r", encoding="utf-8") as f:
            for line in f:
                line = line.strip()
                if not line or line.startswith("#") or "=" not in line:
                    continue
                k, v = line.split("=", 1)
                vals[k.strip()] = v.strip().strip('"').strip("'")
    except OSError:
        pass
    for k in ("ATACAMA_INGEST_KEY", "ATACAMA_INGEST_URL", "ATACAMA_OPERATOR_URL"):
        if os.environ.get(k):
            vals[k] = os.environ[k]
    return vals


def _operator_url(e):
    if e.get("ATACAMA_OPERATOR_URL"):
        return e["ATACAMA_OPERATOR_URL"]
    p = urllib.parse.urlparse(e.get("ATACAMA_INGEST_URL", ""))
    if not p.scheme or not p.netloc:
        return ""
    return f"{p.scheme}://{p.netloc}/webhook/atacama-hermes-operator"


def _call(tool, params, order_text="", confirmation_code="", request_id=""):
    e = _env()
    url, key = _operator_url(e), e.get("ATACAMA_INGEST_KEY", "")
    if not url or not key:
        return json.dumps({"ok": False, "error": "config", "message": "Falta ATACAMA_INGEST_URL / ATACAMA_INGEST_KEY en el entorno de Hermes."}, ensure_ascii=False)
    # Solo se acepta un request_id que este servidor emitió (reintento de la MISMA acción tras un error); cualquier otro valor inventado por el modelo se ignora.
    rid = request_id.strip() if request_id.strip() in _ISSUED else "hm-" + uuid.uuid4().hex[:18]
    _ISSUED.add(rid)
    if len(_ISSUED) > 500:
        _ISSUED.clear()
        _ISSUED.add(rid)
    body = {"tool": tool, "request_id": rid, "params": {k: v for k, v in params.items() if v not in (None, "", [], {})}}
    if order_text:
        body["order_text"] = order_text
    if confirmation_code:
        body["confirmation_code"] = confirmation_code
    req = urllib.request.Request(url, data=json.dumps(body).encode("utf-8"), method="POST",
                                 headers={"Content-Type": "application/json", "X-Atacama-Key": key, "User-Agent": "hermes-atacama-ops/1.0"})
    try:
        with urllib.request.urlopen(req, timeout=170) as r:
            raw = r.read().decode("utf-8", "replace")
    except urllib.error.HTTPError as ex:
        return json.dumps({"ok": False, "error": f"http_{ex.code}", "message": "Atacama OS rechazó la solicitud (HTTP %d)." % ex.code, "request_id": rid}, ensure_ascii=False)
    except Exception as ex:  # red caída, timeout…
        return json.dumps({"ok": False, "error": "red", "message": "No pude contactar a Atacama OS: %s" % type(ex).__name__, "request_id": rid}, ensure_ascii=False)
    try:
        resp = json.loads(raw)
    except ValueError:
        return json.dumps({"ok": False, "error": "respuesta_invalida", "message": raw[:300], "request_id": rid}, ensure_ascii=False)
    return json.dumps(resp, ensure_ascii=False)


def _read_file(path):
    """Lee un archivo SOLO dentro de /opt/data o /tmp (≤1,5 MB). Devuelve (contenido, tipo) o lanza ValueError."""
    real = os.path.realpath(path)
    if not any(real.startswith(d) for d in ALLOWED_DIRS):
        raise ValueError("Solo puedo leer archivos dentro de /opt/data o /tmp.")
    if not os.path.isfile(real):
        raise ValueError("No existe el archivo: %s" % path)
    if os.path.getsize(real) > MAX_FILE_BYTES:
        raise ValueError("El archivo supera 1,5 MB: divídelo.")
    with open(real, "r", encoding="utf-8", errors="replace") as f:
        content = f.read()
    ext = real.rsplit(".", 1)[-1].lower() if "." in real else ""
    return content, {"html": "html", "htm": "html", "csv": "csv", "json": "json", "md": "text", "txt": "text"}.get(ext, "")


def _input_params(file_path, text, urls, source_name):
    p = {"source_name": source_name}
    if file_path:
        try:
            p["file_content"], p["file_type"] = _read_file(file_path)
        except ValueError as ex:
            return None, json.dumps({"ok": False, "error": "archivo", "message": str(ex)}, ensure_ascii=False)
        if not p.get("source_name"):
            p["source_name"] = os.path.basename(file_path)
    if text:
        p["text"] = text
    if urls:
        p["urls"] = urls
    return p, None


@mcp.tool()
def analyze_prospects(file_path: str = "", text: str = "", urls: list[str] = [], source_name: str = "", request_id: str = "") -> str:
    """Analiza prospectos (SOLO LECTURA: no escribe nada en GHL ni Supabase) desde un archivo HTML/CSV/JSON/texto (file_path dentro de /opt/data o /tmp), texto pegado o URLs. Deja un análisis NUMERADO que luego se puede importar ('mete las buenas', 'mete la 27')."""
    p, err = _input_params(file_path, text, urls, source_name)
    return err or _call("analyze_prospects", p, request_id=request_id)


@mcp.tool()
def import_prospects(from_analysis: str = "", numbers: list[int] = [], select: str = "", file_path: str = "", text: str = "", urls: list[str] = [], source_name: str = "", request_id: str = "") -> str:
    """Mete prospectos a Atacama OS (Supabase + GHL etapa Investigado) pasando por el Prospect Gateway: solo entran los que cumplen el criterio (score ≥60 con canal, señal e hipótesis, sin duplicado). Usa from_analysis='last' para importar del último análisis (select='eligible' = las buenas, 'all' = todas, o numbers=[3,5]); o pasa file_path/text/urls para importar directo. Máximo 25 por llamada. NO envía mensajes."""
    if from_analysis or numbers or select:
        p = {"from_analysis": from_analysis or "last", "numbers": numbers, "select": select, "source_name": source_name}
    else:
        p, err = _input_params(file_path, text, urls, source_name)
        if err:
            return err
    return _call("import_prospects", p, request_id=request_id)


@mcp.tool()
def get_analysis(request_id: str = "") -> str:
    """Muestra el último análisis numerado (empresa, score, banda, decisión)."""
    return _call("get_analysis", {}, request_id=request_id)


@mcp.tool()
def get_prospect(target: str, request_id: str = "") -> str:
    """Ficha de un prospecto. target = número del último análisis ('27'), nombre, dominio o correo."""
    return _call("get_prospect", {"target": target}, request_id=request_id)


@mcp.tool()
def list_prospects(status: str = "", band: str = "", min_score: int = 0, source: str = "", limit: int = 20, request_id: str = "") -> str:
    """Lista prospectos guardados (status: accepted|in_ghl|contacted|archived|discarded; band: alta|valida|pendiente|archivo)."""
    return _call("list_prospects", {"status": status, "band": band, "min_score": min_score or None, "source": source, "limit": limit}, request_id=request_id)


@mcp.tool()
def list_pending_prospects(scope: str = "ghl", limit: int = 25, request_id: str = "") -> str:
    """Prospectos pendientes de contactar: scope='ghl' (en Investigado), 'supabase' (aceptados aún sin GHL) o 'both'."""
    return _call("list_pending_prospects", {"scope": scope, "limit": limit}, request_id=request_id)


@mcp.tool()
def prepare_outreach(target: str, request_id: str = "") -> str:
    """Prepara borradores de email y WhatsApp para un prospecto (NO los envía). target = número, nombre, dominio o correo."""
    return _call("prepare_outreach", {"target": target}, request_id=request_id)


@mcp.tool()
def log_manual_contact(target: str, channel: str, note: str = "", outcome: str = "", follow_up_days: int = 0, request_id: str = "") -> str:
    """Registra un contacto que Christian hizo FUERA de Atacama OS (channel: Instagram | WhatsApp | teléfono | email | otro). Mueve la oportunidad a Contactado y deja nota (+ tarea de seguimiento). Atacama OS no envía nada."""
    return _call("log_manual_contact", {"target": target, "channel": channel, "note": note, "outcome": outcome, "follow_up_days": follow_up_days or None}, request_id=request_id)


@mcp.tool()
def add_note(target: str, note: str, request_id: str = "") -> str:
    """Agrega una nota al contacto del prospecto en GHL."""
    return _call("add_note", {"target": target, "note": note}, request_id=request_id)


@mcp.tool()
def move_opportunity(target: str, stage: str, note: str = "", request_id: str = "") -> str:
    """Mueve la oportunidad a otra etapa: Nuevo, Investigado, Contactado, Respondió, Diagnóstico, Propuesta o Seguimiento. Solo con orden explícita de Christian."""
    return _call("move_opportunity", {"target": target, "stage": stage, "note": note}, request_id=request_id)


@mcp.tool()
def create_followup(target: str, due_date: str = "", days: int = 0, title: str = "", note: str = "", request_id: str = "") -> str:
    """Crea una tarea de seguimiento. due_date en formato AAAA-MM-DD (calcula la fecha real, p.ej. 'el viernes') o days = días hábiles desde hoy."""
    return _call("create_followup", {"target": target, "due_at": due_date, "days": days or None, "title": title, "note": note}, request_id=request_id)


@mcp.tool()
def get_open_opportunities(stage: str = "", limit: int = 30, request_id: str = "") -> str:
    """Oportunidades abiertas en GHL, opcionalmente de una etapa (p.ej. 'Investigado')."""
    return _call("get_open_opportunities", {"stage": stage, "limit": limit}, request_id=request_id)


@mcp.tool()
def get_tasks(limit: int = 30, request_id: str = "") -> str:
    """Tareas pendientes en GHL."""
    return _call("get_tasks", {"limit": limit}, request_id=request_id)


@mcp.tool()
def force_import_prospect(target: str, reason: str, christian_order: str, request_id: str = "") -> str:
    """NIVEL 2 — FORCE_IMPORT: mete un prospecto a GHL aunque su score sea bajo. SOLO si Christian lo ordenó explícitamente en este mensaje (p.ej. 'mete la empresa 27 aunque tenga score bajo'). christian_order = sus palabras EXACTAS; reason = motivo (queda registrado). Nunca inventes la orden."""
    return _call("force_import_prospect", {"target": target, "reason": reason}, order_text=christian_order, request_id=request_id)


@mcp.tool()
def discard_prospect(target: str, reason: str, christian_order: str, request_id: str = "") -> str:
    """NIVEL 2 — Descarta un prospecto. SOLO con orden explícita de Christian (christian_order = sus palabras exactas); reason = motivo."""
    return _call("discard_prospect", {"target": target, "reason": reason}, order_text=christian_order, request_id=request_id)


@mcp.tool()
def save_draft(target: str, subject: str = "", body: str = "", to_email: str = "", kind: str = "initial", override_to: bool = False, auto: bool = False, evidence: list[str] = [], insight: str = "", friction: str = "", angle: str = "", cta_reason: str = "", reason: str = "", request_id: str = "") -> str:
    """Crea o edita el borrador de CORREO de un prospecto GUARDADO en Atacama OS (NO lo envía). kind: initial | followup_1 | followup_2 | reply (reply requiere body). Editar un correo ya aprobado anula la aprobación. El destinatario debe ser un correo publicado por la empresa.
    COLD EMAIL v2 (léelo antes de redactar): investigación profunda por detrás, correo simple por delante; el primer correo busca una RESPUESTA, no una reunión. Piensa en cadena: evidencia → insight → fricción probable → ángulo → mensaje → CTA. Una sola idea, 50–100 palabras, suena a persona, asunto corto y específico del proceso (ej. «reservas por WhatsApp», NO «Una idea para X»), apertura distinta cada vez (observación, pregunta, contraste; evita repetir «Vi que…» y «Mi hipótesis…»), CTA de baja fricción («¿te mando un ejemplo?», «¿esto lo ve alguien de operaciones?»), sin explicar Atacama más de una oración, sin cifras ni resultados que no puedas respaldar. Los seguimientos deben AGREGAR algo (ejemplo, dato, versión más simple, pregunta distinta), nunca «solo retomo».
    Si el borrador lo generas TÚ de forma automática (radar, lote), pasa auto=true y evidence (1–3 hechos verificados del prospecto, uno por elemento) más insight/friction/angle/cta_reason (una línea cada uno): el sistema lo evalúa (score 0–100 contra los demás borradores) y si queda bajo 70 NO lo guarda y te devuelve los avisos: reescríbelo y vuelve a llamar. Si Christian te pidió el texto explícitamente, no uses auto. reason = por qué se reescribe (queda en el historial de versiones del mismo borrador)."""
    return _call("save_draft", {"target": target, "subject": subject, "body": body, "to_email": to_email, "kind": kind, "override_to": override_to or None, "auto": auto or None, "evidence": evidence or None, "insight": insight or None, "friction": friction or None, "angle": angle or None, "cta_reason": cta_reason or None, "reason": reason or None}, request_id=request_id)


@mcp.tool()
def lint_draft(target: str, kind: str = "initial", subject: str = "", body: str = "", request_id: str = "") -> str:
    """Explica el score de calidad (0–100) de un correo en frío de un prospecto: avisos con su peso, premios, parecido con otros borradores y enviados, estructura y tipo de CTA. Sin subject/body evalúa el borrador guardado; con ellos evalúa un texto propuesto SIN guardarlo. Solo lectura. Úsalo para «muéstrame por qué este correo tiene score bajo» o para revisar un texto antes de guardarlo."""
    return _call("lint_draft", {"target": target, "kind": kind, "subject": subject or None, "body": body or None}, request_id=request_id)


@mcp.tool()
def get_draft(target: str, request_id: str = "") -> str:
    """Correos pendientes (borrador/aprobado), historial y respuestas de un prospecto, con el cuerpo completo de lo pendiente."""
    return _call("get_draft", {"target": target}, request_id=request_id)


@mcp.tool()
def approve_outreach(target: str, kind: str = "", confirmation_code: str = "", christian_order: str = "", request_id: str = "") -> str:
    """NIVEL 3 — Aprueba el ENVÍO de un borrador. PASO 1: llama sin código → devuelve el correo EXACTO (destinatario, asunto, cuerpo) y un confirmation_code: muéstraselo a Christian completo y espera su confirmación. PASO 2 (solo si Christian confirma en su mensaje): vuelve a llamar con confirmation_code y christian_order = sus palabras exactas. Queda aprobado y el sistema lo envía solo en la próxima ventana (lun-vie 09:00-17:30) si el envío está activado; tú NUNCA envías. Si editas el correo después, hay que repetir los dos pasos."""
    return _call("approve_outreach", {"target": target, "kind": kind}, order_text=christian_order, confirmation_code=confirmation_code, request_id=request_id)


@mcp.tool()
def cancel_outreach(target: str, kind: str = "", request_id: str = "") -> str:
    """Cancela un correo pendiente (borrador o aprobado) antes de que salga."""
    return _call("cancel_outreach", {"target": target, "kind": kind}, request_id=request_id)


@mcp.tool()
def get_followups(filter: str = "due", request_id: str = "") -> str:
    """Seguimiento comercial de los prospectos con primer correo enviado: fechas del +3 y +7 días hábiles, estado (active / done / stopped:motivo), si respondió y el estado de cada borrador de seguimiento. filter=due (por defecto) muestra solo lo que tiene algo pendiente; filter=all muestra todos. Los seguimientos nunca se envían solos: son borradores que Christian aprueba con approve_outreach(kind=followup_1|followup_2)."""
    return _call("get_followups", {"filter": filter}, request_id=request_id)


@mcp.tool()
def list_outreach(filter: str = "", limit: int = 20, request_id: str = "") -> str:
    """Lista correos de salida. filter: drafts | approved | sent | failed (vacío = todos)."""
    return _call("list_outreach", {"filter": filter, "limit": limit}, request_id=request_id)


@mcp.tool()
def get_replies(target: str = "", limit: int = 10, request_id: str = "") -> str:
    """Respuestas recibidas por correo (todas, o de un prospecto) con clasificación: reply | decline | unsubscribe | bounce | auto_reply, y el texto. Resúmelas para Christian y, si corresponde, propón una respuesta con save_draft(kind='reply'); nunca respondas sin su aprobación."""
    return _call("get_replies", {"target": target, "limit": limit}, request_id=request_id)


@mcp.tool()
def do_not_contact(target: str, reason: str, christian_order: str, request_id: str = "") -> str:
    """NIVEL 2 — NO CONTACTAR: descarta al prospecto, suprime todos sus correos y cancela lo pendiente. SOLO con orden explícita de Christian (christian_order = sus palabras exactas); reason = motivo."""
    return _call("do_not_contact", {"target": target, "reason": reason}, order_text=christian_order, request_id=request_id)


def _ops(action, deep=False):
    """Consulta de SOLO LECTURA al workflow 25 Atacama Ops (GHL + Supabase + n8n + Hermes). No escribe ni envía nada."""
    try:
        from atacama_common import hermes_state, post_ops
        body = {"action": action, "hermes": hermes_state()}
        if deep:
            body["deep"] = True
        r = post_ops(body, timeout=120)
    except Exception as ex:
        return json.dumps({"ok": False, "error": "red", "message": "No pude consultar Atacama OS: %s" % type(ex).__name__}, ensure_ascii=False)
    keep = {k: r.get(k) for k in ("ok", "text", "overall", "count", "missing", "action_count", "review_count", "components", "errors24h", "mode", "reason") if k in r}
    return json.dumps(keep, ensure_ascii=False)


@mcp.tool()
def get_daily(deep: bool = False) -> str:
    """El resumen diario completo de Atacama OS (el mismo que llega a las 08:30): NECESITA TU ACCIÓN / PARA REVISAR / TODO BIEN, con comercial, prospección, contenido y sistema, leído de GHL, Supabase y n8n. Resume lo importante; no inventes nada que no esté en `text`."""
    return _ops("daily", deep)


@mcp.tool()
def get_today() -> str:
    """«¿Qué tengo que hacer hoy?»: lo urgente + tareas que vencen hoy + seguimientos y publicaciones de hoy."""
    return _ops("today")


@mcp.tool()
def get_urgent() -> str:
    """«Dame solo lo urgente»: únicamente lo que necesita acción de Christian ahora (o dice que no hay nada)."""
    return _ops("urgent")


@mcp.tool()
def get_health(deep: bool = False) -> str:
    """«¿Está todo funcionando?»: OK / ATENCIÓN / FALLO por componente (Gateway, Hermes Operator, Outreach, Gmail Sender/Sync, Followup Planner, Prospect Radar, Content Radar, Content Engine, métricas, jobs) con el motivo, y las ejecuciones fallidas de 24 h. deep=true además prueba la conexión real a Gmail (solo lectura). También sirve para «¿falló algo hoy?»."""
    return _ops("health", deep)


@mcp.tool()
def get_stale_opportunities() -> str:
    """«¿Qué oportunidades llevan demasiado tiempo quietas?»: oportunidades por encima del umbral de su etapa y las que no tienen próximo paso (sin tarea abierta)."""
    return _ops("stale")


@mcp.tool()
def get_radar_new() -> str:
    """«¿Qué prospectos nuevos encontró el radar?»: candidatos del Prospect Radar de los últimos 7 días con score y banda, y datos de su última corrida."""
    return _ops("radar_new")


@mcp.tool()
def get_content_status() -> str:
    """«¿Qué publicaciones tengo pendientes?»: piezas pendientes de aprobación, programadas, publicadas (72 h), con problemas y señales candidatas sin pieza. Nunca publica ni aprueba."""
    return _ops("content_status")


@mcp.tool()
def get_content_performance() -> str:
    """«¿Cómo rindieron las últimas publicaciones? / ¿qué funcionó mejor? / ¿qué aprendimos?»: ranking por interacciones reales (me gusta + comentarios + compartidos que entrega GHL; NO hay impresiones por publicación) y aprendizajes del Content Engine; con n pequeño es tentativo y no se compara Instagram con LinkedIn."""
    return _ops("content_performance")


@mcp.tool()
def send_email(target: str, subject: str = "", body: str = "", confirmation_code: str = "", request_id: str = "") -> str:
    """Envío directo: DESHABILITADO siempre. Para enviar un correo usa save_draft y luego approve_outreach (confirmación de Christian con código); el sistema lo envía en la ventana permitida. No simules ni intentes otra vía."""
    return _call("send_email", {"target": target, "subject": subject, "body": body}, confirmation_code=confirmation_code, request_id=request_id)


@mcp.tool()
def send_whatsapp(target: str, text: str = "", confirmation_code: str = "", request_id: str = "") -> str:
    """NIVEL 3 — Enviar WhatsApp. Deshabilitado: devuelve confirmation_required / not_enabled."""
    return _call("send_whatsapp", {"target": target, "text": text}, confirmation_code=confirmation_code, request_id=request_id)


@mcp.tool()
def publish_content(piece: str, confirmation_code: str = "", request_id: str = "") -> str:
    """NIVEL 3 — Publicar contenido. Deshabilitado desde Hermes: devuelve confirmation_required / not_enabled (las publicaciones se aprueban en GHL)."""
    return _call("publish_content", {"piece": piece}, confirmation_code=confirmation_code, request_id=request_id)


@mcp.tool()
def delete_record(what: str, confirmation_code: str = "", request_id: str = "") -> str:
    """NIVEL 3 — Eliminar registros. Deshabilitado: devuelve confirmation_required / not_enabled."""
    return _call("delete_record", {"what": what}, confirmation_code=confirmation_code, request_id=request_id)


# ---------------------------------------------------------------- LinkedIn (Waalaxy como ejecutor) · Bloque 3
def _li(body):
    """Llama al workflow n8n 26 «LinkedIn Engine». Waalaxy solo recibe altas aprobadas; Atacama OS NO puede saber por API si una invitación se envió, se aceptó o hubo respuesta."""
    try:
        from atacama_common import post_linkedin
        r = post_linkedin(body, timeout=100)
    except Exception as ex:
        return json.dumps({"ok": False, "error": "red", "message": "No pude consultar el canal LinkedIn de Atacama OS: %s" % type(ex).__name__}, ensure_ascii=False)
    keep = {k: r.get(k) for k in ("ok", "status", "text", "message", "error", "company", "state", "state_label", "recommendation", "summary", "confirmation_code", "expires_at", "ready_for_linkedin", "email_ready", "needs_research", "in_linkedin", "counts", "mode", "config", "lists", "campaigns", "import_code", "campaign_code", "stop_followups", "next_action", "reply", "person", "role", "url", "options", "persist_error", "ghl_error") if k in r}
    return json.dumps(keep, ensure_ascii=False)


@mcp.tool()
def linkedin_ready() -> str:
    """«¿Quién está listo para LinkedIn?» / «¿a quién recomiendas contactar y por qué canal?»: separa los prospectos de Investigado en LinkedIn (persona con nombre, cargo y perfil verificable), correo e «investigar más» (con lo que falta), y lista los que ya están en LinkedIn. Solo lectura."""
    return _li({"action": "list"})


@mcp.tool()
def linkedin_status(target: str) -> str:
    """Estado de un prospecto en LinkedIn (persona, cargo, perfil, estado, próxima acción, respuesta) y el canal que se recomienda hoy. target = nombre, dominio, id o URL de LinkedIn. Solo lectura."""
    return _li({"action": "status", "target": target})


@mcp.tool()
def recommend_channel(target: str) -> str:
    """Calcula y guarda la recomendación de canal (email | linkedin | ninguno/investigar más) con el motivo y lo que falta. No contacta a nadie."""
    return _li({"action": "recommend", "target": target})


@mcp.tool()
def approve_linkedin(target: str, confirmation_code: str = "", christian_order: str = "") -> str:
    """NIVEL 3 — Aprueba el ALTA de un prospecto en Waalaxy (lista y, solo en modo live con campaña, la secuencia de LinkedIn). PASO 1: llama sin código → devuelve el alta EXACTA (persona, cargo, perfil, lista, campaña y si habría contacto) y un confirmation_code: muéstraselo completo a Christian y espera su confirmación. PASO 2: SOLO si Christian confirma en su mensaje, vuelve a llamar con confirmation_code y christian_order = sus palabras exactas. Nunca inventes la orden ni reutilices un código viejo. Si el modo de LinkedIn está apagado dilo: no se inserta nada. No se contacta por LinkedIn a quien ya tiene un correo aprobado/enviado."""
    return _li({"action": "approve", "target": target, "confirmation_code": confirmation_code, "order_text": christian_order, "by": "Christian vía Hermes"})


@mcp.tool()
def log_linkedin_event(target: str, event: str, note: str = "") -> str:
    """Registra lo que Christian VE en Waalaxy/LinkedIn (la API de Waalaxy no avisa): event = conexion_aceptada | mensaje_enviado | followup_enviado | respondio | rechazo | detener | nota. «respondio» exige note con lo que dijo la persona: mueve la oportunidad a Respondió y detiene los seguimientos. No envía nada."""
    return _li({"action": "event", "target": target, "event": event, "note": note})


@mcp.tool()
def linkedin_config() -> str:
    """Modo del canal LinkedIn (off | test | live), lista/campaña configuradas y tope diario. Solo lectura; cambiar el modo es decisión de Christian y no se hace desde Hermes."""
    return _li({"action": "config"})


@mcp.tool()
def waalaxy_lists() -> str:
    """Listas y campañas (pausadas o en curso) que existen hoy en Waalaxy, para elegir destino. Solo lectura."""
    return _li({"action": "lists"})

# ---------------------------------------------------------------- Ola A · Content: Founder Interview · RSS · Recursos · Inteligencia orgánica · cola
# Todo entra por los workflows 27 «Content Growth» y 12 «Content Intake» de n8n: nada se publica, nada se contacta y toda pieza termina «en revisión» en GHL.
def _grow(body, timeout=90):
    try:
        from atacama_common import post_webhook
        r = post_webhook("atacama-content-growth", body, timeout=timeout, ua="hermes-atacama-content/1.0")
    except Exception as ex:
        return json.dumps({"ok": False, "error": "red", "message": "No pude consultar Atacama OS (content-growth): %s" % type(ex).__name__}, ensure_ascii=False)
    return json.dumps(r, ensure_ascii=False)[:24000]


def _json_arg(text, path, label):
    """Acepta el JSON como texto o como archivo dentro de /opt/data o /tmp. Devuelve (objeto, error_json)."""
    try:
        if path:
            raw, _ = _read_file(path)
        else:
            raw = text
        if not raw or not str(raw).strip():
            return None, json.dumps({"ok": False, "error": "falta_" + label, "message": "Envía %s como JSON (texto) o como ruta a un archivo .json en /opt/data." % label}, ensure_ascii=False)
        return json.loads(raw), None
    except ValueError as ex:
        return None, json.dumps({"ok": False, "error": "json_invalido", "message": "No pude leer %s: %s" % (label, str(ex)[:160])}, ensure_ascii=False)


@mcp.tool()
def content_queue() -> str:
    """Estado de la cola de contenido: cuántas piezas esperan la revisión de Christian (de un tope de 6), si el sistema puede proponer piezas por su cuenta, señales candidatas, artículos RSS nuevos, entrevistas abiertas y carruseles esperando render. Solo lectura. Si la cola está llena, NO crees piezas de forma autónoma (el servidor igual las bloquea); una orden explícita de Christian sí puede saltarse el límite."""
    return _grow({"action": "queue_status"})


@mcp.tool()
def founder_interview(action: str, interview_id: str = "", answer: str = "", source: str = "text", question: str = "", context: str = "", topic: str = "", test: bool = False) -> str:
    """Founder Interview (contenido con la experiencia REAL de Christian). action = start | answer | cancel | status | add_question.
    start → elige una pregunta basada en un hecho real y abre la entrevista (devuelve question + context + interview_id): muéstrasela a Christian tal cual, con el contexto breve.
    answer → guarda la respuesta TEXTUAL de Christian (interview_id opcional: usa la última abierta). source = text | audio (si vino de un audio transcrito). Exige sustancia (≥ 120 caracteres): si es corta, pide más detalle; NUNCA completes tú lo que falta.
    cancel → cancela la entrevista abierta. status → últimas entrevistas. add_question → propone una pregunta nueva (question + context con el hecho real que la motiva; nada genérico).
    Después de answer: estructura 1–3 piezas (LinkedIn de Christian en primera persona, adaptación distinta para LinkedIn Atacama Labs, Instagram solo si aporta) y envíalas con submit_content_piece(origin="founder_interview", interview_id=...). Cada fuente real_work debe llevar evidence con citas LITERALES de la respuesta."""
    body = {"action": {"start": "founder_start", "answer": "founder_answer", "cancel": "founder_cancel", "status": "founder_status", "add_question": "founder_add_question"}.get(action, "")}
    if not body["action"]:
        return json.dumps({"ok": False, "error": "action_invalida", "message": "action = start | answer | cancel | status | add_question"}, ensure_ascii=False)
    for k, v in (("interview_id", interview_id), ("answer", answer), ("source", source), ("question", question), ("context", context), ("topic", topic)):
        if v:
            body[k] = v
    if test:
        body["test"] = True  # SOLO pruebas técnicas: la entrevista queda marcada is_test y no consume preguntas reales
    return _grow(body)


@mcp.tool()
def submit_content_piece(piece_path: str = "", piece_json: str = "", origin: str = "autonomous", interview_id: str = "", test: bool = False) -> str:
    """Envía UNA pieza de contenido al Content Intake (workflow 12): se valida, se puntúa y, si pasa (score ≥ 70), queda en GHL Social Planner como IN_REVIEW con una fecha PROPUESTA (noticia ≤ 24 h, normal ≤ 48 h, evergreen ≤ 72 h, hora de Chile; nunca +7 días). NADA se publica ni se programa: Christian aprueba en GHL.
    La pieza va como JSON (piece_json) o como ruta a un archivo .json en /opt/data (piece_path) con el esquema de /opt/data/content/examples. origin: 'autonomous' (cron/radar; se BLOQUEA si hay 6 o más piezas en revisión: no se guarda nada), 'explicit' (Christian lo pidió; pasa con advertencia) o 'founder_interview' (exige interview_id; las citas de las fuentes real_work deben aparecer literales en la respuesta de Christian).
    Campos opcionales de la pieza: resource_id (uuid de un recurso ACTIVO), cta_mode (none | resource_link | dm | diagnostic), cta_copy; en cta.text puedes usar {{resource_url}} (se reemplaza por la URL con atribución). Devuelve action = in_review | held | rejected (con errors) | blocked."""
    piece, err = _json_arg(piece_json, piece_path, "la pieza")
    if err:
        return err
    if origin not in ("autonomous", "explicit", "founder_interview"):
        return json.dumps({"ok": False, "error": "origin_invalido", "message": "origin = autonomous | explicit | founder_interview"}, ensure_ascii=False)
    body = {"piece": piece, "origin": origin}
    if interview_id:
        body["interview_id"] = interview_id
    if test:
        body["test"] = True
    try:
        from atacama_common import post_webhook
        r = post_webhook("atacama-content-intake", body, timeout=150, ua="hermes-atacama-content/1.0")
    except Exception as ex:
        return json.dumps({"ok": False, "error": "red", "message": "No pude enviar la pieza al Content Intake: %s" % type(ex).__name__}, ensure_ascii=False)
    return json.dumps(r, ensure_ascii=False)[:8000]


@mcp.tool()
def content_resources(action: str, query: str = "", resource_json: str = "", slug: str = "") -> str:
    """Biblioteca de recursos reutilizables (checklists, guías, plantillas en atacamalabs.cl/recursos/...). action = list | register | retire.
    list (query opcional) → ANTES de crear un recurso nuevo revisa si ya existe uno que resuelva el mismo problema y reutilízalo (resource_id en la pieza). register → resource_json con slug, name, type (guia|checklist|plantilla|diagnostico|prompt|documento|comparativa|caso|herramienta|pagina), topic, audience, problem (qué resuelve, ≥ 20 caracteres), cta_mode (resource_link | dm | diagnostic), cta_copy, url (https://atacamalabs.cl/recursos/<slug>), status (draft | active; active exige que la página responda 200). Un recurso nuevo queda en borrador hasta que exista su página: NO inventes recursos para tener un CTA. retire → slug."""
    if action == "list":
        return _grow({"action": "resources_list", **({"query": query} if query else {})})
    if action == "retire":
        return _grow({"action": "resource_retire", "slug": slug})
    if action == "register":
        res, err = _json_arg(resource_json, "", "el recurso")
        if err:
            return err
        return _grow({"action": "resource_register", "resource": res, "slug": res.get("slug", "")})
    return json.dumps({"ok": False, "error": "action_invalida", "message": "action = list | register | retire"}, ensure_ascii=False)


@mcp.tool()
def rss_items(action: str, limit: int = 12, item_ids: list[str] = [], status: str = "", note: str = "", signal_source_id: str = "") -> str:
    """Artículos de los feeds RSS/Atom configurados (ingeridos por n8n cada hora, deduplicados). action = pending | mark | status.
    pending → los más relevantes sin revisar (título, URL, resumen, fuente, fecha, relevancia) + si la cola permite crear piezas. mark → marca como signal (abriste una señal) o ignored (no sirve) para que no vuelvan; item_ids = ids de pending. status → salud de cada feed.
    Un artículo solo vale como señal si lo abres, copias una CITA literal de la página y la envías con content_signals(submit)."""
    if action == "pending":
        return _grow({"action": "rss_pending", "limit": limit})
    if action == "mark":
        return _grow({"action": "rss_mark", "item_ids": item_ids, "status": status, "note": note, **({"signal_source_id": signal_source_id} if signal_source_id else {})})
    if action == "status":
        return _grow({"action": "rss_status"})
    return json.dumps({"ok": False, "error": "action_invalida", "message": "action = pending | mark | status"}, ensure_ascii=False)


@mcp.tool()
def competitor_intel(action: str, report_path: str = "", report_json: str = "", signals_submitted: int = 0) -> str:
    """Inteligencia ORGÁNICA de competencia (fuentes públicas; NO es Ads Radar; nunca copiar). action = list | latest | save.
    list → competidores/referentes configurados (urls públicas) y el último reporte. latest → el último reporte (huecos, temas saturados, ángulos propios). save → guarda el reporte de esta corrida (report_json o report_path) con: run_id único, competitors[{slug, pages_read[urls que SÍ abriste], recent_topics, formats, hooks, offers, resources, repeated_messages}], saturated_topics, gaps, own_angles[{angle, why, channel_suggestion}]. Exige páginas leídas de cada competidor y al menos un hueco o ángulo propio con su porqué."""
    if action == "list":
        return _grow({"action": "competitors_list"})
    if action == "latest":
        return _grow({"action": "intel_latest"})
    if action == "save":
        rep, err = _json_arg(report_json, report_path, "el reporte")
        if err:
            return err
        return _grow({"action": "competitor_report", "report": rep, "signals_submitted": signals_submitted})
    return json.dumps({"ok": False, "error": "action_invalida", "message": "action = list | latest | save"}, ensure_ascii=False)


@mcp.tool()
def content_signals(action: str, signals_path: str = "", signals_json: str = "") -> str:
    """Señales de contenido. action = candidates | submit | learnings.
    candidates → señales candidatas YA verificadas (título, URL, resumen, cita literal, ángulo, canal sugerido), lo que ya está cubierto (no repetir) y si la cola permite piezas. submit → envía señales nuevas al gate (workflow 13: abre la URL y comprueba que la cita exista); signals_json/signals_path = {"icp_pack_id":"0ba54785-bff0-4a2d-a397-64e697d34e38","batch_id":"...","signals":[...]} con el mismo formato del Content Radar. learnings → ganchos a no repetir y aprendizajes por canal."""
    if action == "candidates":
        return _grow({"action": "signals_candidates"})
    if action == "submit":
        sig, err = _json_arg(signals_json, signals_path, "las señales")
        if err:
            return err
        try:
            from atacama_common import post_webhook
            r = post_webhook("atacama-content-signals", sig, timeout=170, ua="hermes-atacama-content/1.0")
        except Exception as ex:
            return json.dumps({"ok": False, "error": "red", "message": "No pude enviar las señales: %s" % type(ex).__name__}, ensure_ascii=False)
        return json.dumps(r, ensure_ascii=False)[:12000]
    if action == "learnings":
        try:
            from atacama_common import get_webhook
            return json.dumps(get_webhook("atacama-content-learnings", ua="hermes-atacama-content/1.0"), ensure_ascii=False)[:12000]
        except Exception as ex:
            return json.dumps({"ok": False, "error": "red", "message": "No pude leer los aprendizajes: %s" % type(ex).__name__}, ensure_ascii=False)
    return json.dumps({"ok": False, "error": "action_invalida", "message": "action = candidates | submit | learnings"}, ensure_ascii=False)


@mcp.tool()
def report_content_job(kind: str, status: str = "ok", mode: str = "run", reason: str = "", minutes: int = 0, items_reviewed: int = 0, signals: int = 0, created: int = 0, blocked: int = 0, held: int = 0, competitors: int = 0, searches: int = 0, pages_opened: int = 0, est_cost_usd: float = 0.0) -> str:
    """Registra la corrida de un job de contenido (para /ops y los avisos). kind = content_rss | competitor_intel | content_pieces. Hazlo SIEMPRE al terminar (también si no hubo nada) con cifras reales; si fallaste, status='error' y reason corto. Solo registra: no avisa por sí mismo."""
    try:
        from atacama_common import post_ops
        r = post_ops({"action": "job_report", "report": {"kind": kind, "status": status, "mode": mode, "reason": reason[:300], "minutes": minutes, "items_reviewed": items_reviewed, "signals": signals, "created": created, "blocked": blocked, "held": held, "competitors": competitors, "searches": searches, "pages_opened": pages_opened, "est_cost_usd": est_cost_usd}}, timeout=60)
    except Exception as ex:
        return json.dumps({"ok": False, "error": "red", "message": "No pude registrar la corrida: %s" % type(ex).__name__}, ensure_ascii=False)
    return json.dumps({k: r.get(k) for k in ("ok", "text", "recorded", "error")}, ensure_ascii=False)


if __name__ == "__main__":
    mcp.run()

