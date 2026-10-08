"""Atacama OS · utilidades compartidas del lado Hermes (servidor MCP y jobs de cron).
Solo habla con n8n (webhook `atacama-ops`) usando la clave de ingesta que ya vive en /opt/data/.env; nunca imprime secretos."""
import json
import os
import shutil
import urllib.error
import urllib.parse
import urllib.request

ENV_PATH = os.environ.get("ATACAMA_OPS_ENV", "/opt/data/.env")
JOBS_PATH = "/opt/data/cron/jobs.json"
GATEWAY_STATE = "/opt/data/gateway_state.json"
STATE_DIR = "/opt/data/state"


def load_env():
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
    for k in ("ATACAMA_INGEST_KEY", "ATACAMA_INGEST_URL", "ATACAMA_PANEL_URL"):
        if os.environ.get(k):
            vals[k] = os.environ[k]
    return vals


def ops_url(env=None):
    e = env or load_env()
    p = urllib.parse.urlparse(e.get("ATACAMA_INGEST_URL", ""))
    if not p.scheme or not p.netloc:
        return ""
    return f"{p.scheme}://{p.netloc}/webhook/atacama-ops"


def post_ops(body, timeout=90):
    """POST al workflow 25 Atacama Ops. Lanza excepción si n8n no responde (el llamador decide qué decir)."""
    e = load_env()
    url, key = ops_url(e), e.get("ATACAMA_INGEST_KEY", "")
    if not url or not key:
        raise RuntimeError("falta ATACAMA_INGEST_URL / ATACAMA_INGEST_KEY en /opt/data/.env")
    req = urllib.request.Request(url, data=json.dumps(body).encode("utf-8"), method="POST",
                                 headers={"Content-Type": "application/json", "X-Atacama-Key": key, "User-Agent": "hermes-atacama-ops/2.0"})
    with urllib.request.urlopen(req, timeout=timeout) as r:
        return json.loads(r.read().decode("utf-8", "replace"))


def hermes_state():
    """Estado de Hermes que n8n no puede ver: jobs de cron, gateway de Telegram y disco."""
    st = {"gateway_ok": None, "disk_pct": None, "jobs": []}
    try:
        with open(JOBS_PATH, "r", encoding="utf-8") as f:
            d = json.load(f)
        jobs = d.get("jobs", d) if isinstance(d, dict) else d
        for j in jobs:
            nm = str(j.get("name", ""))
            if j.get("state") == "completed" or not any(w in nm.lower() for w in ("atacama", "radar")):
                continue
            sch = j.get("schedule") or {}
            st["jobs"].append({"id": j.get("id"), "name": nm, "state": j.get("state"), "enabled": j.get("enabled"), "last_status": j.get("last_status"),
                               "last_run_at": j.get("last_run_at"), "next_run_at": j.get("next_run_at"), "failure_streak": j.get("failure_streak") or 0,
                               "schedule": sch.get("expr") if isinstance(sch, dict) else str(sch)})
    except Exception:
        st["jobs"] = None  # no se pudo leer: n8n lo tratará como «no informado»
    try:
        with open(GATEWAY_STATE, "r", encoding="utf-8") as f:
            g = json.load(f)
        tg = (g.get("platforms") or {}).get("telegram") or {}
        st["gateway_ok"] = bool(g.get("gateway_state") == "running" and tg.get("state") == "connected")
    except Exception:
        pass
    try:
        u = shutil.disk_usage("/opt/data")
        st["disk_pct"] = round(u.used * 100 / u.total)
    except Exception:
        pass
    return st


def linkedin_url(env=None):
    e = env or load_env()
    p = urllib.parse.urlparse(e.get("ATACAMA_INGEST_URL", ""))
    if not p.scheme or not p.netloc:
        return ""
    return f"{p.scheme}://{p.netloc}/webhook/atacama-linkedin"


def post_linkedin(body, timeout=90):
    """POST al workflow 26 LinkedIn Engine (Waalaxy como ejecutor). Lanza excepción si n8n no responde."""
    e = load_env()
    url, key = linkedin_url(e), e.get("ATACAMA_INGEST_KEY", "")
    if not url or not key:
        raise RuntimeError("falta ATACAMA_INGEST_URL / ATACAMA_INGEST_KEY en /opt/data/.env")
    req = urllib.request.Request(url, data=json.dumps(body).encode("utf-8"), method="POST",
                                 headers={"Content-Type": "application/json", "X-Atacama-Key": key, "User-Agent": "hermes-atacama-linkedin/1.0"})
    with urllib.request.urlopen(req, timeout=timeout) as r:
        return json.loads(r.read().decode("utf-8", "replace"))


def _webhook_url(path, env=None):
    e = env or load_env()
    p = urllib.parse.urlparse(e.get("ATACAMA_INGEST_URL", ""))
    if not p.scheme or not p.netloc:
        return ""
    return f"{p.scheme}://{p.netloc}/webhook/{path}"


def post_webhook(path, body, timeout=90, ua="hermes-atacama/1.0"):
    """POST con la clave de ingesta a un webhook de n8n (Ola A: content-growth · content-intake · content-signals). Lanza excepción si n8n no responde."""
    e = load_env()
    url, key = _webhook_url(path, e), e.get("ATACAMA_INGEST_KEY", "")
    if not url or not key:
        raise RuntimeError("falta ATACAMA_INGEST_URL / ATACAMA_INGEST_KEY en /opt/data/.env")
    req = urllib.request.Request(url, data=json.dumps(body).encode("utf-8"), method="POST",
                                 headers={"Content-Type": "application/json", "X-Atacama-Key": key, "User-Agent": ua})
    try:
        with urllib.request.urlopen(req, timeout=timeout) as r:
            return json.loads(r.read().decode("utf-8", "replace"))
    except urllib.error.HTTPError as ex:  # 4xx/5xx con cuerpo JSON útil (p. ej. el intake responde 400 con los errores de validación)
        try:
            return json.loads(ex.read().decode("utf-8", "replace"))
        except Exception:
            raise


def get_webhook(path, timeout=60, ua="hermes-atacama/1.0"):
    """GET con la clave de ingesta (p. ej. atacama-content-learnings)."""
    e = load_env()
    url, key = _webhook_url(path, e), e.get("ATACAMA_INGEST_KEY", "")
    if not url or not key:
        raise RuntimeError("falta ATACAMA_INGEST_URL / ATACAMA_INGEST_KEY en /opt/data/.env")
    req = urllib.request.Request(url, method="GET", headers={"X-Atacama-Key": key, "User-Agent": ua})
    with urllib.request.urlopen(req, timeout=timeout) as r:
        return json.loads(r.read().decode("utf-8", "replace"))
