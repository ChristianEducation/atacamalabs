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
def send_email(target: str, subject: str = "", body: str = "", confirmation_code: str = "", request_id: str = "") -> str:
    """NIVEL 3 — Enviar email. NO se ejecuta sin confirmación explícita de Christian y hoy el envío está DESHABILITADO. Devuelve confirmation_required: muéstrale a Christian exactamente qué se enviaría y a quién, y espera su confirmación. No simules ni intentes otra vía."""
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


if __name__ == "__main__":
    mcp.run()
