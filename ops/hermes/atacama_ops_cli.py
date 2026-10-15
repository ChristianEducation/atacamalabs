#!/usr/bin/env python3
"""Atacama OS · jobs de Hermes sin IA (cron --no-agent) y compuertas previas de los radares.

  atacama_ops_cli.py daily  [--force]   Resumen diario por Telegram (08:30 Chile; el cron dispara 11:30/11:45/12:30/12:45 UTC y aquí se decide).
  atacama_ops_cli.py alerts             Cada 15 min: imprime SOLO alertas nuevas (vacío = silencio). Deduplicado en n8n.
  atacama_ops_cli.py gate radar|content|rss|competitors|pieces   Compuerta previa de los jobs con IA (la salida se inyecta en el prompt del agente; si dice skip, el agente termina).

stdout se entrega tal cual a Telegram en los jobs --no-agent. Nunca imprime claves."""
import datetime
import json
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
    "prep": ("prep_gate", None),
    "content": ("content_gate", {"action": "content_radar_report"}),
    "rss": ("rss_gate", {"action": "job_report", "kind": "content_rss"}),
    "competitors": ("competitor_gate", {"action": "job_report", "kind": "competitor_intel"}),
    "pieces": ("pieces_gate", {"action": "job_report", "kind": "content_pieces"}),
    "igweek": ("igweek_gate", {"action": "job_report", "kind": "ig_week"}),
    "storyday": ("storyday_gate", {"action": "job_report", "kind": "story_day"}),
    "ideas": ("ideas_gate", {"action": "job_report", "kind": "ideas_week"}),
    "learning": ("learning_context", {"action": "job_report", "kind": "learning"}),
}


def gate(kind):
    action, rep = GATES[kind]
    try:
        r = post_ops({"action": action, "hermes": hermes_state()}, timeout=60)
    except Exception as ex:
        print("COMPUERTA: mode=skip — no pude consultar Atacama OS (%s); no se investiga esta vez." % type(ex).__name__)
        return
    mode, reason = r.get("mode", "skip"), r.get("reason", "")
    if mode == "skip" and rep:
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
        elif kind == "prep":
            extra = " count=%s max_items=%s" % (r.get("count"), r.get("max_items"))
        elif kind in ("content", "rss"):
            extra = " max_signals=%s" % r.get("max_signals")
        elif kind == "pieces":
            extra = " max_pieces=%s week=%s/%s runway_days=%s" % (r.get("max_pieces"), r.get("week_coverage"), r.get("week_target"), r.get("runway_days")) + (" URGENTE=%s" % r.get("urgent_signal") if r.get("urgent_signal") else "")
        if kind in ("content", "pieces", "rss"):
            extra += " pieces_allowed=%s pending_review=%s/%s" % (str(r.get("pieces_allowed", True)).lower(), r.get("pending_review"), r.get("max_pending_in_review"))
    print("COMPUERTA DEL %s (calculada por Atacama OS antes de esta corrida): mode=%s%s — %s" % (kind.upper(), mode, extra, reason))
    if kind == "ideas" and mode != "skip":
        print("SEMANA_A_PROPONER: %s · topes por red %s (máx. %s, puntaje mínimo %s) · ya propuestas esa semana: %s · cambios pedidos: %s · «Mi idea» sin ficha: %s" % (r.get("week_start"), json.dumps(r.get("caps"), ensure_ascii=False), r.get("max_total"), r.get("min_score"), r.get("already"), len(r.get("changes") or []), len(r.get("mine") or [])))
        print("Usa la herramienta ideas_context para ver fuentes verificadas, recursos, competencia, lo reciente que no se repite y los pedidos de cambio.")
    if kind == "storyday" and mode != "skip":
        print("FECHA_PROPUESTA: %s (hora de Chile; desfase UTC ese día: %s → schedule_suggestion = %sTHH:MM:00%s)" % (r.get("date"), r.get("utc_offset"), r.get("date"), r.get("utc_offset")))
        feed = r.get("feed_today") or []
        print("FEED_DEL_DIA: %s" % ("; ".join("%s %s «%s» (%s)" % (x.get("at"), x.get("format"), x.get("hook"), x.get("status")) for x in feed) or "ninguna publicación de feed ese día"))
        print("HISTORIAS_YA_PROGRAMADAS_ESE_DIA: %s" % ("; ".join("%s «%s»" % (x.get("at"), x.get("hook")) for x in (r.get("stories_already") or [])) or "ninguna"))
        print("HISTORIAS_ULTIMAS_48H: %s" % ("; ".join(r.get("recent_stories_48h") or []) or "ninguna"))
        print("FEED_ULTIMAS_48H: %s" % ("; ".join(r.get("recent_feed_48h") or []) or "ninguno"))
        print("MAXIMO_HISTORIAS_NUEVAS: %s (0 es una respuesta válida)" % r.get("max_stories"))
    if kind == "igweek" and mode != "skip":
        w = r.get("window") or {}
        print("SEMANA_OBJETIVO: %s a %s (lunes a domingo, hora de Chile)" % (w.get("start"), w.get("end")))
        print("FEED_FALTANTE (solo carruseles e imágenes): total=%s mezcla=%s" % (r.get("feed_missing"), json.dumps(r.get("feed_missing_by_format") or {}, ensure_ascii=False)))
        print("HUECOS_RESERVADOS_PARA_REELS_DE_CHRISTIAN (no produzcas reels): %s" % r.get("reels_for_christian"))
        print("FEED_DIAS_ABIERTOS (un feed por día, 15:00): %s" % ", ".join(r.get("feed_open_days") or []))
        print("MOTION_RECIENTE (no repetir el mismo lenguaje seguido): %s" % ", ".join(r.get("recent_motion_languages") or ["ninguno"]))


def main():
    a = sys.argv[1:] or ["daily"]
    if a[0] == "daily":
        daily("--force" in a)
    elif a[0] == "alerts":
        alerts()
    elif a[0] == "gate" and len(a) > 1 and a[1] in GATES:
        gate(a[1])
    else:
        print("uso: atacama_ops_cli.py daily [--force] | alerts | gate radar|prep|content|rss|competitors|pieces|igweek|storyday|ideas")


if __name__ == "__main__":
    main()
