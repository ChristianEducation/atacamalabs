#!/usr/bin/env python3
"""Atacama OS · jobs de Hermes sin IA (cron --no-agent) y compuertas previas de los radares.

  atacama_ops_cli.py daily  [--force]   Resumen diario por Telegram (08:30 Chile; el cron dispara 11:30/11:45/12:30/12:45 UTC y aquí se decide).
  atacama_ops_cli.py alerts             Cada 15 min: imprime SOLO alertas nuevas (vacío = silencio). Deduplicado en n8n.
  atacama_ops_cli.py gate radar|content Compuerta previa de los radares (la salida se inyecta en el prompt del agente; si dice skip, el agente termina).

stdout se entrega tal cual a Telegram en los jobs --no-agent. Nunca imprime claves."""
import datetime
import os
import sys
from zoneinfo import ZoneInfo

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from atacama_common import STATE_DIR, hermes_state, post_ops  # noqa: E402

TZ = ZoneInfo("America/Santiago")


def _read(path, default=""):
    try:
        with open(path, "r", encoding="utf-8") as f:
            return f.read().strip()
    except OSError:
        return default


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
        text = r.get("text") or ""
        if not text:
            raise RuntimeError("respuesta vacía")
    except Exception as ex:  # n8n caído, clave inválida, etc.
        print("ATACAMA DAILY · no pude consultar Atacama OS (%s). Revisa n8n y el servidor; el resumen se reintenta en unos minutos." % type(ex).__name__)
        return
    print(text)
    if not force:
        _write(last, today)


def alerts():
    fail_path = os.path.join(STATE_DIR, "atacama-alerts.fails")
    deep = datetime.datetime.now(datetime.timezone.utc).minute < 15  # el chequeo profundo de Gmail corre ~1 vez por hora
    try:
        r = post_ops({"action": "alerts_poll", "hermes": hermes_state(), "deep_gmail": deep})
    except Exception as ex:
        n = int(_read(fail_path, "0") or 0) + 1
        _write(fail_path, n)
        if n == 3:  # una sola vez: tres consultas seguidas (≈45 min) sin respuesta
            print("ATACAMA OS · alerta: n8n no responde hace ~45 min (%s). Las alertas y el Daily pueden no estar funcionando." % type(ex).__name__)
        return
    _write(fail_path, 0)
    text = r.get("text") or ""
    if not text:
        return  # silencio
    print(text)
    keys = r.get("notify_keys") or []
    if keys:
        try:
            post_ops({"action": "alerts_ack", "keys": keys})
        except Exception:
            pass  # si falla el ack se reintenta en la próxima consulta (alertas nunca confirmadas)


def gate(kind):
    action = "radar_gate" if kind == "radar" else "content_gate"
    rep = "radar_report" if kind == "radar" else "content_radar_report"
    try:
        r = post_ops({"action": action, "hermes": hermes_state()}, timeout=60)
    except Exception as ex:
        print("COMPUERTA: mode=skip — no pude consultar Atacama OS (%s); no se investiga esta vez." % type(ex).__name__)
        return
    mode, reason = r.get("mode", "skip"), r.get("reason", "")
    if mode == "skip":
        try:
            post_ops({"action": rep, "report": {"status": "skipped", "mode": "skip", "reason": reason}})
        except Exception:
            pass
    extra = " max_imports=%s" % r.get("max_imports") if kind == "radar" and mode != "skip" else (" max_signals=%s" % r.get("max_signals") if mode != "skip" else "")
    print("COMPUERTA DEL %s (calculada por Atacama OS antes de esta corrida): mode=%s%s — %s" % (kind.upper(), mode, extra, reason))


def main():
    a = sys.argv[1:] or ["daily"]
    if a[0] == "daily":
        daily("--force" in a)
    elif a[0] == "alerts":
        alerts()
    elif a[0] == "gate" and len(a) > 1 and a[1] in ("radar", "content"):
        gate(a[1])
    else:
        print("uso: atacama_ops_cli.py daily [--force] | alerts | gate radar|content")


if __name__ == "__main__":
    main()
