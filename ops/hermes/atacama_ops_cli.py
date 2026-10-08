#!/usr/bin/env python3
"""Atacama OS · jobs de Hermes sin IA (cron --no-agent) y compuertas previas de los radares.

  atacama_ops_cli.py daily  [--force]   Resumen diario por Telegram (08:30 Chile; el cron dispara 11:30/11:45/12:30/12:45 UTC y aquí se decide).
  atacama_ops_cli.py alerts             Cada 15 min: imprime SOLO alertas nuevas (vacío = silencio). Deduplicado en n8n.
  atacama_ops_cli.py gate radar|content|rss|competitors|pieces   Compuerta previa de los jobs con IA (la salida se inyecta en el prompt del agente; si dice skip, el agente termina).

stdout se entrega tal cual a Telegram en los jobs --no-agent. Nunca imprime claves."""
import datetime
import os
import sys
from zoneinfo import ZoneInfo

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from atacama_common import STATE_DIR, hermes_state, load_env, post_ops  # noqa: E402

TZ = ZoneInfo("America/Santiago")


def _read(path, default=""):
    try:
        with open(path, "r", encoding="utf-8") as f:
            return f.read().strip()
    except OSError:
        return default


def _link():
    """Línea final con el enlace al panel (/ops). Solo si ATACAMA_PANEL_URL está en /opt/data/.env; así no se manda un enlace muerto antes de publicar el panel."""
    url = load_env().get("ATACAMA_PANEL_URL", "").strip()
    return "\n\nVer Atacama OS → " + url if url.startswith("http") else ""


def _write(path, text):
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with open(path, "w", encoding="utf-8") as f:
        f.write(str(text))


def daily(force=False):
    now = datetime.datetime.now(TZ)
    today = now.strftime("%Y-%m-%d")
    mins = now.hour * 60 + now.minute
    last = os.path.join(STATE_DIR, "atacama-daily.last")
    if not force:
        if not (8 * 60 + 20 <= mins <= 9 * 60 + 15):
            return  # fuera de la ventana: el cron también corre en el horario de invierno/verano que no toca hoy
        if _read(last) == today:
            return  # ya se envió hoy (la segunda entrada de cron solo reintenta si la primera falló)
    try:
        r = post_ops({"action": "daily", "hermes": hermes_state(), "deep": True})
        text = r.get("brief") or r.get("text") or ""
        if not text:
            raise RuntimeError("respuesta vacía")
    except Exception:  # n8n caído, clave inválida, etc.
        print("ATACAMA DAILY · hoy no pude leer el estado de Atacama OS. Reintento en unos minutos; si sigue igual, revisa n8n.")
        return
    print(text + _link())
    if not force:
        _write(last, today)


def alerts():
    fail_path = os.path.join(STATE_DIR, "atacama-alerts.fails")
    deep = datetime.datetime.now(datetime.timezone.utc).minute < 15  # el chequeo profundo de Gmail corre ~1 vez por hora
    try:
        r = post_ops({"action": "alerts_poll", "hermes": hermes_state(), "deep_gmail": deep})
    except Exception:
        n = int(_read(fail_path, "0") or 0) + 1
        _write(fail_path, n)
        if n == 3:  # una sola vez: tres consultas seguidas (≈45 min) sin respuesta
            print("ATACAMA OS · alerta: n8n no responde hace ~45 min. Las alertas y el Daily pueden no estar funcionando.")
        return
    _write(fail_path, 0)
    text = r.get("text") or ""
    if not text:
        return  # silencio
    print(text + _link())
    keys = r.get("notify_keys") or []
    if keys:
        try:
            post_ops({"action": "alerts_ack", "keys": keys})
        except Exception:
            pass  # si falla el ack se reintenta en la próxima consulta (alertas nunca confirmadas)


GATES = {  # tipo → (acción de compuerta, cómo se registra una omisión)
    "radar": ("radar_gate", {"action": "radar_report"}),
    "content": ("content_gate", {"action": "content_radar_report"}),
    "rss": ("rss_gate", {"action": "job_report", "kind": "content_rss"}),
    "competitors": ("competitor_gate", {"action": "job_report", "kind": "competitor_intel"}),
    "pieces": ("pieces_gate", {"action": "job_report", "kind": "content_pieces"}),
}


def gate(kind):
    action, rep = GATES[kind]
    try:
        r = post_ops({"action": action, "hermes": hermes_state()}, timeout=60)
    except Exception as ex:
        print("COMPUERTA: mode=skip — no pude consultar Atacama OS (%s); no se investiga esta vez." % type(ex).__name__)
        return
    mode, reason = r.get("mode", "skip"), r.get("reason", "")
    if mode == "skip":
        try:
            body = {"status": "skipped", "mode": "skip", "reason": reason}
            if rep.get("kind"):
                body["kind"] = rep["kind"]
            post_ops({"action": rep["action"], "report": body})
        except Exception:
            pass
    extra = ""
    if mode != "skip":
        if kind == "radar":
            extra = " max_imports=%s" % r.get("max_imports")
        elif kind in ("content", "rss"):
            extra = " max_signals=%s" % r.get("max_signals")
        elif kind == "pieces":
            extra = " max_pieces=%s week=%s/%s runway_days=%s" % (r.get("max_pieces"), r.get("week_coverage"), r.get("week_target"), r.get("runway_days")) + (" URGENTE=%s" % r.get("urgent_signal") if r.get("urgent_signal") else "")
        if kind in ("content", "pieces", "rss"):
            extra += " pieces_allowed=%s pending_review=%s/%s" % (str(r.get("pieces_allowed", True)).lower(), r.get("pending_review"), r.get("max_pending_in_review"))
    print("COMPUERTA DEL %s (calculada por Atacama OS antes de esta corrida): mode=%s%s — %s" % (kind.upper(), mode, extra, reason))


def main():
    a = sys.argv[1:] or ["daily"]
    if a[0] == "daily":
        daily("--force" in a)
    elif a[0] == "alerts":
        alerts()
    elif a[0] == "gate" and len(a) > 1 and a[1] in GATES:
        gate(a[1])
    else:
        print("uso: atacama_ops_cli.py daily [--force] | alerts | gate radar|content|rss|competitors|pieces")


if __name__ == "__main__":
    main()
