#!/usr/bin/env python3
"""Atacama OS · Radar estratégico — monitor de producción (spec RADAR §8). SIN IA, solo librería estándar.

  strategic_prod_monitor.py                 Cron (cuando Christian lo autorice): compuerta → targets confirmados → 1 GET por servicio → registra el chequeo en n8n 25.
  strategic_prod_monitor.py --dry-run       Igual, pero NO registra nada (modo sombra).
  strategic_prod_monitor.py --probe URL     Prueba UNA dirección a mano (la «prueba no destructiva» de la activación): no habla con n8n ni guarda nada.

Reglas (spec §8): solo https:443, host público (DNS resuelto sin rangos privados/reservados/loopback/link-local), 1 GET con timeout de 8 s, cuerpo acotado y descartado,
redirecciones revalidadas con la misma política (máx. 3). 2xx = `healthy` A NIVEL HTTP (no prueba base de datos ni pagos); 3xx sin seguir y 4xx = `degraded`;
5xx, DNS y timeout = `down`; configuración o permisos = `unknown`. La alerta (dos caídas seguidas) NO la crea este script: la evalúa n8n.
Por defecto no imprime nada (silencio): ningún aviso a Telegram sin aprobación. Nunca imprime ni guarda claves ni cuerpos de respuesta."""
import argparse
import datetime
import http.client
import ipaddress
import json
import os
import re
import socket
import ssl
import sys
import time
import urllib.parse

_HERE = os.path.dirname(os.path.abspath(__file__))
for _p in (_HERE, os.path.dirname(_HERE), "/opt/data/atacama-ops"):
    if _p not in sys.path:
        sys.path.insert(0, _p)

TIMEOUT_S = 8
MAX_BODY = 64 * 1024
MAX_HOPS = 3
MAX_TARGETS = 20
BUDGET_S = 240  # tope de tiempo de una corrida: el cron es cada 15 min


class Blocked(Exception):
    """La dirección no cumple la política de seguridad: no se hace ninguna conexión."""

    def __init__(self, code):
        super().__init__(code)
        self.code = code


# ---------------------------------------------------------------------------- política de direcciones
def ip_is_public(ip_str):
    try:
        ip = ipaddress.ip_address(ip_str)
    except ValueError:
        return False
    if getattr(ip, "ipv4_mapped", None):
        ip = ip.ipv4_mapped
    return bool(ip.is_global and not ip.is_multicast)


def host_name_ok(host):
    h = (host or "").lower().rstrip(".")
    if not h or h.startswith("[") or ":" in h:
        return False
    if h == "localhost" or h.endswith((".localhost", ".local", ".internal", ".lan", ".test")):
        return False
    if "." not in h:
        return False
    try:
        ipaddress.ip_address(h)
        return ip_is_public(h)  # literal de IP: debe ser pública
    except ValueError:
        pass
    if all(re.fullmatch(r"0x[0-9a-f]+|[0-9]+", label, re.I) for label in h.split(".")):  # formas numéricas raras de IPv4 (decimal, octal, hexadecimal)
        return False
    return True


def validate_url(url):
    """(host, path_con_query) de una URL aceptable, o lanza Blocked. Solo https, sin credenciales, puerto 443, host público."""
    raw = (url or "").strip()
    if not raw or len(raw) > 2000:
        raise Blocked("blocked_url")
    try:
        p = urllib.parse.urlsplit(raw)
        port = p.port
    except ValueError:
        raise Blocked("blocked_url")
    if p.scheme.lower() != "https" or p.username or p.password or (port not in (None, 443)):
        raise Blocked("blocked_url")
    host = (p.hostname or "").lower().rstrip(".")
    if not host_name_ok(host):
        raise Blocked("blocked_host")
    path = (p.path or "/") + (("?" + p.query) if p.query else "")
    return host, path


def resolve_public(host, resolver=socket.getaddrinfo):
    """IP pública a la que conectar. TODAS las direcciones resueltas deben ser públicas (si una sola es privada se rechaza: defensa contra DNS rebinding)."""
    try:
        infos = resolver(host, 443, type=socket.SOCK_STREAM)
    except socket.gaierror:
        raise Blocked("dns")
    ips = []
    for info in infos:
        ip = info[4][0]
        if ip not in ips:
            ips.append(ip)
    if not ips:
        raise Blocked("dns")
    if not all(ip_is_public(ip) for ip in ips):
        raise Blocked("blocked_ip")
    return ips[0]


# ---------------------------------------------------------------------------- una petición
class PinnedHTTPSConnection(http.client.HTTPSConnection):
    """Conecta a la IP YA validada (no vuelve a resolver el nombre) y verifica el certificado contra el nombre original."""

    def __init__(self, host, ip, timeout):
        super().__init__(host, 443, timeout=timeout, context=ssl.create_default_context())
        self._pinned_ip = ip

    def connect(self):
        sock = socket.create_connection((self._pinned_ip, 443), self.timeout)
        self.sock = self._context.wrap_socket(sock, server_hostname=self.host)


def fetch_once(host, ip, path, timeout=TIMEOUT_S, conn_cls=PinnedHTTPSConnection):
    """GET con un solo intento. Devuelve (status, location|None, latency_ms). Lee a lo sumo MAX_BODY bytes y los descarta."""
    t0 = time.monotonic()
    conn = conn_cls(host, ip, timeout)
    try:
        conn.request("GET", path, headers={"Host": host, "User-Agent": "atacama-os-monitor/1.0", "Accept": "*/*", "Connection": "close"})
        resp = conn.getresponse()
        latency = int((time.monotonic() - t0) * 1000)
        loc = resp.getheader("Location")
        resp.read(MAX_BODY)
        return resp.status, loc, latency
    finally:
        try:
            conn.close()
        except Exception:
            pass


def classify(status):
    if 200 <= status < 300:
        return "healthy"
    if 300 <= status < 500:
        return "degraded"
    if 500 <= status < 600:
        return "down"
    return "unknown"


def check_url(url, fetcher=fetch_once, resolver=socket.getaddrinfo):
    """Un chequeo completo. Devuelve {result, http_status, latency_ms, error_code}. Nunca lanza por problemas de red."""
    cur = url
    total = 0
    for hop in range(MAX_HOPS + 1):
        try:
            host, path = validate_url(cur)
            ip = resolve_public(host, resolver)
        except Blocked as b:
            if hop > 0:  # la redirección apunta a un lugar no permitido: el servicio responde, pero no se sigue
                return {"result": "degraded", "http_status": None, "latency_ms": total or None, "error_code": "redirect_blocked"}
            return {"result": "down" if b.code == "dns" else "unknown", "http_status": None, "latency_ms": None, "error_code": b.code}
        try:
            status, loc, latency = fetcher(host, ip, path)
        except (socket.timeout, TimeoutError):
            return {"result": "down", "http_status": None, "latency_ms": None, "error_code": "timeout"}
        except ssl.SSLError:
            return {"result": "down", "http_status": None, "latency_ms": None, "error_code": "tls"}
        except socket.gaierror:
            return {"result": "down", "http_status": None, "latency_ms": None, "error_code": "dns"}
        except (OSError, http.client.HTTPException):
            return {"result": "down", "http_status": None, "latency_ms": None, "error_code": "connection"}
        total += latency or 0
        if 300 <= status < 400 and loc and hop < MAX_HOPS:
            cur = urllib.parse.urljoin(cur, loc)
            continue
        if 300 <= status < 400:
            return {"result": "degraded", "http_status": status, "latency_ms": total, "error_code": "redirect_loop" if loc else "redirect_no_location"}
        return {"result": classify(status), "http_status": status, "latency_ms": total, "error_code": None}
    return {"result": "degraded", "http_status": None, "latency_ms": total, "error_code": "redirect_loop"}


# ---------------------------------------------------------------------------- corrida
def utc_now_iso():
    return datetime.datetime.now(datetime.timezone.utc).strftime("%Y-%m-%dT%H:%M:%S.000Z")


def run(argv=None, post=None, fetcher=fetch_once, resolver=socket.getaddrinfo, out=None, err=None, now=utc_now_iso, clock=time.monotonic):
    """Devuelve el código de salida. `post`, `fetcher` y `resolver` se inyectan en las pruebas: ninguna prueba toca la red real."""
    out = out or sys.stdout
    err = err or sys.stderr
    ap = argparse.ArgumentParser(add_help=True)
    ap.add_argument("--dry-run", action="store_true", help="no registra nada en n8n")
    ap.add_argument("--probe", metavar="URL", help="prueba una sola dirección a mano; no usa n8n")
    ap.add_argument("--verbose", action="store_true", help="imprime un resumen (por defecto el script no imprime nada)")
    args = ap.parse_args(argv)

    if args.probe:
        r = check_url(args.probe, fetcher, resolver)
        out.write(json.dumps({**r, "checked_at": now(), "note": "solo HTTP; no prueba base de datos ni pagos; no se guardó nada"}, ensure_ascii=False) + "\n")
        return 0

    if post is None:
        from atacama_common import post_ops  # noqa: E402  (solo habla con n8n 25; la clave viene de /opt/data/.env y nunca se imprime)
        post = post_ops
    try:
        gate = post({"action": "strategic_gate", "params": {"kind": "production"}})
    except Exception as e:  # noqa: BLE001
        err.write("strategic_prod_monitor: no pude consultar la compuerta: " + type(e).__name__ + "\n")
        return 1
    if not isinstance(gate, dict) or gate.get("ok") is not True or gate.get("mode") != "run":
        return 0  # skip = salida vacía

    try:
        tg = post({"action": "strategic_targets"})
    except Exception as e:  # noqa: BLE001
        err.write("strategic_prod_monitor: no pude leer los servicios: " + type(e).__name__ + "\n")
        return 1
    targets = tg.get("targets") if isinstance(tg, dict) and tg.get("ok") is True and isinstance(tg.get("targets"), list) else []
    started = clock()
    summary = []
    failed_posts = 0
    valid = [t for t in targets if isinstance(t, dict) and isinstance(t.get("id"), str) and isinstance(t.get("health_url"), str)]
    for t in valid[:MAX_TARGETS]:
        if clock() - started > BUDGET_S:
            break
        tid, url = t["id"], t["health_url"]
        r = check_url(url, fetcher, resolver)
        params = {"target_id": tid, "checked_at": now(), "result": r["result"], "http_status": r["http_status"], "latency_ms": r["latency_ms"], "error_code": r["error_code"], "test": False}
        summary.append((t.get("logical_name") or tid, r["result"], r["http_status"], r["error_code"]))
        if args.dry_run:
            continue
        try:
            resp = post({"action": "strategic_prod_check", "params": params})
            if not isinstance(resp, dict):
                failed_posts += 1
            elif resp.get("ok") is not True:  # n8n rechazó el registro por política (apagado, pausa, demasiado pronto…): se informa, no es un fallo del script
                err.write("strategic_prod_check rechazado: " + str(resp.get("error") or "sin_motivo")[:60] + "\n")
        except Exception:  # noqa: BLE001
            failed_posts += 1
    if args.verbose or args.dry_run:
        for name, res, st, code in summary:
            out.write(f"{name}: {res}" + (f" · HTTP {st}" if st else "") + (f" · {code}" if code else "") + ("  [modo sombra: no se registró]" if args.dry_run else "") + "\n")
    return 1 if failed_posts and not args.dry_run else 0


if __name__ == "__main__":
    sys.exit(run())
