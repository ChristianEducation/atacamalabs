"""Atacama OS · Radar estratégico — utilidades puras del lado Hermes (solo librería estándar, sin red).

- URL canónica y huella: MISMA lógica que `srCanonicalUrl` / `srFingerprint` de scripts/ops/strategic-radar-core.mjs (spec RADAR §17.3).
  Se prueban contra `strategic-fixtures.json`, generado por el motor de Node (la fuente de verdad). Si cambia una, cambia la otra.
- Horarios de los jobs con IA en hora de Chile (America/Santiago): el cron dispara en los dos horarios UTC posibles (con y sin horario de verano)
  y la compuerta decide por la hora LOCAL, igual que el Daily (atacama_ops_cli.py). Nada de «UTC-3» fijo.
- Revisión de la carga que el agente quiere enviar (tamaño, cantidad, forma).
La IA nunca escribe la huella: la calcula este código."""
import datetime
import hashlib
import json
import re
from urllib.parse import unquote, urlsplit
from zoneinfo import ZoneInfo

TZ = ZoneInfo("America/Santiago")
MAX_PAYLOAD_BYTES = 80 * 1024
MAX_ITEMS = 12
KINDS = ("products", "partners", "events")
DB_KIND = {"products": "product", "partners": "partner", "events": "event"}


# ---------------------------------------------------------------------------- URL canónica
def _encode(s, unsafe):
    out = []
    for ch in s:
        o = ord(ch)
        if o <= 0x20 or o >= 0x7F or ch in unsafe:
            out.extend("%%%02X" % b for b in ch.encode("utf-8"))
        else:
            out.append(ch)
    return "".join(out)


_PATH_UNSAFE = set('"#<>?`{}')
_QUERY_UNSAFE = set("\"#<>'")


def _remove_dot_segments(path):
    out = []
    for seg in path.split("/")[1:]:
        if seg == "..":
            if out:
                out.pop()
        elif seg != ".":
            out.append(seg)
    if path.split("/")[-1] in (".", ".."):
        out.append("")
    return "/" + "/".join(out)


def is_private_host(host):
    """Equivale a srIsPrivateHost del motor de Node: loopback, privado, link-local, IPv6 literal, nombres internos o sin punto."""
    h = (host or "").lower().rstrip(".")
    if not h or h.startswith("[") or ":" in h:
        return True
    if h == "localhost" or h.endswith((".localhost", ".local", ".internal", ".lan", ".test")):
        return True
    if "." not in h:
        return True
    m = re.fullmatch(r"(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})", h)
    if m:
        a, b, c, d = (int(x) for x in m.groups())
        if max(a, b, c, d) > 255:
            return True
        return a == 10 or a == 127 or a == 0 or a >= 224 or (a == 169 and b == 254) or (a == 172 and 16 <= b <= 31) or (a == 192 and b == 168) or (a == 100 and 64 <= b <= 127)
    if all(re.fullmatch(r"0x[0-9a-f]+|[0-9]+", label, re.I) for label in h.split(".")):
        return True  # formas numéricas raras (decimal/octal/hex): más estricto que Node, que las normaliza; ninguna fixture depende de ello
    return False


def canonical_url(raw):
    """URL canónica (§17.3) o None. Solo https, sin credenciales, puerto 443, host público; sin fragmento ni parámetros de tracking; parámetros ordenados."""
    s = (raw or "").strip() if isinstance(raw, str) else ""
    s = s.replace("\t", "").replace("\n", "").replace("\r", "")
    if not s or len(s) > 2000:
        return None
    try:
        p = urlsplit(s)
        port = p.port
    except ValueError:
        return None
    if p.scheme.lower() != "https" or not p.netloc:
        return None
    if p.username or p.password or port not in (None, 443):
        return None
    host = (p.hostname or "").lower().rstrip(".")
    try:
        host = host.encode("idna").decode("ascii")
    except UnicodeError:
        return None
    if is_private_host(host):
        return None
    path = _remove_dot_segments(_encode(p.path or "/", _PATH_UNSAFE)) or "/"
    if len(path) > 1 and path.endswith("/"):
        path = path[:-1]
    query = _encode(p.query, _QUERY_UNSAFE)

    def key_of(pair):
        k = pair.split("=")[0].replace("+", " ")
        try:
            return unquote(k, errors="strict").strip()
        except UnicodeDecodeError:
            return k.strip()

    pairs = [x for x in query.split("&") if x and not re.fullmatch(r"(utm_.*|fbclid|gclid|igshid)", key_of(x), re.I)]

    def sort_key(pair):
        parts = pair.split("=")
        return (parts[0], parts[1] if len(parts) > 1 else "")

    pairs.sort(key=sort_key)
    return "https://" + host + path + (("?" + "&".join(pairs)) if pairs else "")


def fingerprint(kind, canonical, event_date=None):
    """sha256(kind_db + "\\n" + url_canónica [+ "\\n" + YYYY-MM-DD solo en eventos con fecha real]). kind = product|partner|event (o plural)."""
    k = DB_KIND.get(kind, kind)
    if k not in ("product", "partner", "event") or not canonical:
        return None
    text = k + "\n" + canonical
    if k == "event" and isinstance(event_date, str) and re.fullmatch(r"\d{4}-\d{2}-\d{2}", event_date):
        text += "\n" + event_date
    return hashlib.sha256(text.encode("utf-8")).hexdigest()


# ---------------------------------------------------------------------------- horarios (hora de Chile, con y sin horario de verano)
# Python: lunes = 0. Productos mar y vie 07:00 · Alianzas lun y jue 07:15 · Eventos lun 07:30.
SLOTS = {"products": ((1, 4), 7 * 60), "partners": ((0, 3), 7 * 60 + 15), "events": ((0,), 7 * 60 + 30)}
CRON_UTC = {"products": "0 10,11 * * 2,5", "partners": "15 10,11 * * 1,4", "events": "30 10,11 * * 1"}  # cron estándar (domingo = 0): se dispara en los dos horarios UTC posibles


def in_slot(kind, now_utc, window_min=20):
    """True si la hora LOCAL de Chile cae en el horario del job (el otro disparo UTC del día queda fuera y se descarta)."""
    if kind not in SLOTS:
        return False
    days, minute = SLOTS[kind]
    local = now_utc.astimezone(TZ)
    m = local.hour * 60 + local.minute
    return local.weekday() in days and minute <= m < minute + window_min


# ---------------------------------------------------------------------------- carga que el agente quiere guardar
def check_submit(kind, payload_json):
    """(items, error). Revisa tamaño, forma y cantidad ANTES de hablar con n8n y agrega la huella base de cada ítem (la calcula este código)."""
    if kind not in KINDS:
        return None, "kind inválido: usa products | partners | events"
    if not isinstance(payload_json, str) or not payload_json.strip():
        return None, "payload_json vacío"
    if len(payload_json.encode("utf-8")) > MAX_PAYLOAD_BYTES:
        return None, "payload_json supera 80 KB"
    try:
        data = json.loads(payload_json)
    except ValueError:
        return None, "payload_json no es JSON válido"
    items = data.get("items") if isinstance(data, dict) else data
    if not isinstance(items, list) or not items:
        return None, "faltan items (lista no vacía)"
    if len(items) > MAX_ITEMS:
        return None, "máximo %d ítems por envío" % MAX_ITEMS
    out = []
    for it in items:
        if not isinstance(it, dict):
            return None, "cada ítem debe ser un objeto"
        it = dict(it)
        it.pop("fingerprint", None)  # la IA nunca aporta la huella
        c = canonical_url(it.get("canonical_url"))
        if c:
            it["fingerprint"] = fingerprint(kind, c)
        out.append(it)
    return out, None


# ---------------------------------------------------------------------------- compuerta previa de los jobs con IA (su texto se inyecta en el prompt)
def gate_text(kind, now_utc, reply, force=False):
    """Texto de la compuerta. skip por defecto ante cualquier duda: fuera de horario, n8n caído, respuesta rara o categoría desconocida."""
    head = "COMPUERTA DEL RADAR ESTRATÉGICO · %s (calculada por Atacama OS antes de esta corrida): " % kind
    if kind not in KINDS:
        return head + "mode=skip — categoría desconocida."
    local = now_utc.astimezone(TZ)
    if not force and not in_slot(kind, now_utc):
        return head + "mode=skip — fuera del horario de este job (ahora son las %s en Chile; el cron se dispara en los dos horarios UTC posibles y solo corre el correcto)." % local.strftime("%A %H:%M")
    if not isinstance(reply, dict) or reply.get("ok") is not True or reply.get("mode") not in ("run", "skip"):
        return head + "mode=skip — no pude consultar Atacama OS; no se investiga esta vez."
    mode, reason = reply["mode"], str(reply.get("reason") or "")[:200]
    if mode != "run":
        return head + "mode=skip — %s" % (reason or "sin motivo")
    mx = reply.get("max_items")
    mx = mx if isinstance(mx, int) and 1 <= mx <= MAX_ITEMS else MAX_ITEMS
    lines = [head + "mode=run max_items=%d — %s" % (mx, reason or "ok"),
             "FECHA_DE_HOY: %s (hora de Chile). Verifica cada dato contra la fuente de HOY; nada de lo que recuerdes cuenta como evidencia." % local.strftime("%Y-%m-%d")]
    if kind == "events":
        lines.append("VENTANA_DE_EVENTOS: desde hoy hasta %s (90 días)." % (local + datetime.timedelta(days=90)).strftime("%Y-%m-%d"))
    lines.append("Antes de enviar usa strategic_radar_read(\"%s\") para no repetir lo ya guardado." % kind)
    return "\n".join(lines)


def cli_gate(argv, post=None, now=None, out=None):
    """strategic_lib.py gate products|partners|events [--force]. Imprime la compuerta; nunca lanza ni imprime claves."""
    import sys
    out = out or sys.stdout
    args = [a for a in argv if not a.startswith("--")]
    force = "--force" in argv
    kind = args[0] if args else ""
    when = now or datetime.datetime.now(datetime.timezone.utc)
    reply = None
    if kind in KINDS and (force or in_slot(kind, when)):
        try:
            if post is None:
                sys.path.insert(0, "/opt/data/atacama-ops")
                from atacama_common import post_ops as post  # noqa: E402
            reply = post({"action": "strategic_gate", "params": {"kind": kind}})
        except Exception:  # noqa: BLE001
            reply = None
    out.write(gate_text(kind, when, reply, force) + "\n")
    return 0


if __name__ == "__main__":
    import sys
    sys.exit(cli_gate(sys.argv[2:]) if len(sys.argv) > 1 and sys.argv[1] == "gate" else 2)
