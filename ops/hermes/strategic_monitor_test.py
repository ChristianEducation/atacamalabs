"""Pruebas del monitor de producción del Radar estratégico (F4). NINGUNA toca la red real: DNS, conexiones y n8n están simulados.
Se ejecutan con `node ops/hermes/strategic-monitor.test.mjs` (o directamente: python ops/hermes/strategic_monitor_test.py)."""
import io
import os
import socket
import ssl
import sys
import unittest

sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), "scripts"))
import strategic_prod_monitor as m  # noqa: E402

SECRET = "SENTINELA-CLAVE-NO-DEBE-SALIR-1234567890"
os.environ["ATACAMA_INGEST_KEY"] = SECRET


def resolver_for(mapping):
    def r(host, port, type=0):  # noqa: A002
        v = mapping.get(host)
        if v is None:
            raise socket.gaierror(-2, "Name or service not known")
        return [(socket.AF_INET, socket.SOCK_STREAM, 6, "", (ip, port)) for ip in v]
    return r


PUB = resolver_for({"app.example.org": ["93.184.216.34"], "other.example.org": ["93.184.216.35"], "mixed.example.org": ["93.184.216.34", "10.0.0.5"], "evil.example.org": ["127.0.0.1"], "meta.example.org": ["169.254.169.254"], "v6.example.org": ["::1"]})


class FakeFetcher:
    """Registra cada petición y responde según un guion {(host, path): (status, location, latency)} o una excepción."""

    def __init__(self, script):
        self.script, self.calls = script, []

    def __call__(self, host, ip, path):
        self.calls.append((host, ip, path))
        r = self.script.get((host, path), self.script.get(host))
        if isinstance(r, Exception):
            raise r
        return r


class PolicyTests(unittest.TestCase):
    def test_ips_publicas_y_no_publicas(self):
        for ok in ("8.8.8.8", "93.184.216.34", "2606:4700:4700::1111"):
            self.assertTrue(m.ip_is_public(ok), ok)
        for bad in ("10.0.0.1", "127.0.0.1", "169.254.169.254", "192.168.1.1", "172.16.0.1", "172.31.255.255", "100.64.0.1", "0.0.0.0", "::1", "fe80::1", "fc00::1", "::ffff:10.0.0.1", "::ffff:127.0.0.1", "224.0.0.1", "255.255.255.255", "no-es-ip"):
            self.assertFalse(m.ip_is_public(bad), bad)

    def test_validate_url_acepta_solo_https_publico(self):
        self.assertEqual(m.validate_url("https://app.example.org/health"), ("app.example.org", "/health"))
        self.assertEqual(m.validate_url("https://App.Example.org.:443/h?x=1"), ("app.example.org", "/h?x=1"))
        self.assertEqual(m.validate_url("https://app.example.org"), ("app.example.org", "/"))

    def test_validate_url_rechaza(self):
        casos = ["http://app.example.org/h", "ftp://app.example.org/h", "file:///etc/passwd", "data:text/html,hola", "javascript:alert(1)", "https://user:pass@app.example.org/", "https://app.example.org:8443/h",
                 "https://localhost/h", "https://x.localhost/h", "https://servidor.local/h", "https://db.internal/h", "https://intranet/h", "https://10.0.0.5/h", "https://127.0.0.1/h", "https://169.254.169.254/latest",
                 "https://[::1]/h", "https://2130706433/h", "https://0x7f.0.0.1/h", "https://0177.0.0.1/h", "https://017700000001/h", "https://127.1/h", "", "   ", "https://" + "a" * 2100 + ".org/"]
        for u in casos:
            with self.assertRaises(m.Blocked, msg=u):
                m.validate_url(u)

    def test_resolve_public_exige_que_todas_las_ips_sean_publicas(self):
        self.assertEqual(m.resolve_public("app.example.org", PUB), "93.184.216.34")
        for h, code in (("mixed.example.org", "blocked_ip"), ("evil.example.org", "blocked_ip"), ("meta.example.org", "blocked_ip"), ("v6.example.org", "blocked_ip"), ("no-existe.example.org", "dns")):
            with self.assertRaises(m.Blocked) as c:
                m.resolve_public(h, PUB)
            self.assertEqual(c.exception.code, code, h)


class ClassificationTests(unittest.TestCase):
    def chk(self, script, url="https://app.example.org/health"):
        f = FakeFetcher(script)
        return m.check_url(url, f, PUB), f

    def test_2xx_es_healthy_solo_http(self):
        for st in (200, 204, 299):
            r, f = self.chk({"app.example.org": (st, None, 120)})
            self.assertEqual((r["result"], r["http_status"], r["error_code"]), ("healthy", st, None))
            self.assertEqual(f.calls, [("app.example.org", "93.184.216.34", "/health")])  # conecta a la IP ya validada

    def test_4xx_es_degraded_y_5xx_es_down(self):
        for st, res in ((400, "degraded"), (401, "degraded"), (403, "degraded"), (404, "degraded"), (429, "degraded"), (500, "down"), (502, "down"), (503, "down"), (599, "down")):
            self.assertEqual(self.chk({"app.example.org": (st, None, 10)})[0]["result"], res, st)

    def test_1xx_u_otros_es_unknown(self):
        self.assertEqual(self.chk({"app.example.org": (101, None, 10)})[0]["result"], "unknown")

    def test_redireccion_valida_se_sigue_y_el_resultado_es_el_final(self):
        r, f = self.chk({("app.example.org", "/health"): (301, "https://other.example.org/ok", 30), ("other.example.org", "/ok"): (200, None, 70)})
        self.assertEqual((r["result"], r["http_status"], r["latency_ms"]), ("healthy", 200, 100))
        self.assertEqual([c[0] for c in f.calls], ["app.example.org", "other.example.org"])
        r, _ = self.chk({("app.example.org", "/health"): (302, "/login", 30), ("app.example.org", "/login"): (200, None, 40)})
        self.assertEqual(r["result"], "healthy")  # ruta relativa
        r, _ = self.chk({("app.example.org", "/health"): (301, "https://other.example.org/ok", 30), ("other.example.org", "/ok"): (503, None, 70)})
        self.assertEqual(r["result"], "down")

    def test_redireccion_a_red_interna_no_se_sigue(self):
        for loc in ("https://127.0.0.1/admin", "https://10.0.0.5/x", "https://169.254.169.254/latest/meta-data", "http://other.example.org/x", "https://evil.example.org/x", "https://localhost/x", "https://[::1]/x", "https://user:p@other.example.org/x"):
            r, f = self.chk({("app.example.org", "/health"): (302, loc, 30)})
            self.assertEqual((r["result"], r["error_code"]), ("degraded", "redirect_blocked"), loc)
            self.assertEqual(len(f.calls), 1, "no se conectó al destino bloqueado: " + loc)

    def test_bucle_y_redireccion_sin_destino(self):
        r, f = self.chk({"app.example.org": (302, "https://app.example.org/health", 5)})
        self.assertEqual((r["result"], r["error_code"]), ("degraded", "redirect_loop"))
        self.assertLessEqual(len(f.calls), m.MAX_HOPS + 1)
        r, _ = self.chk({"app.example.org": (302, None, 5)})
        self.assertEqual((r["result"], r["error_code"]), ("degraded", "redirect_no_location"))

    def test_errores_de_red_son_down_con_codigo_acotado(self):
        casos = ((socket.timeout("t"), "timeout"), (TimeoutError(), "timeout"), (ssl.SSLError("bad"), "tls"), (ssl.SSLCertVerificationError("cert"), "tls"), (ConnectionRefusedError(), "connection"), (ConnectionResetError(), "connection"), (OSError("x"), "connection"))
        for exc, code in casos:
            r, _ = self.chk({"app.example.org": exc})
            self.assertEqual((r["result"], r["http_status"], r["error_code"]), ("down", None, code), repr(exc))

    def test_dns_inexistente_es_down_y_dns_privado_es_unknown_sin_conectar(self):
        r = m.check_url("https://no-existe.example.org/h", FakeFetcher({}), PUB)
        self.assertEqual((r["result"], r["error_code"]), ("down", "dns"))
        for u, code in (("https://evil.example.org/h", "blocked_ip"), ("https://mixed.example.org/h", "blocked_ip"), ("http://app.example.org/h", "blocked_url"), ("https://10.0.0.5/h", "blocked_host"), ("https://localhost/h", "blocked_host")):
            f = FakeFetcher({"app.example.org": (200, None, 1)})
            r = m.check_url(u, f, PUB)
            self.assertEqual((r["result"], r["error_code"]), ("unknown", code), u)
            self.assertEqual(f.calls, [], "0 conexiones a destinos no permitidos: " + u)


class FetchTests(unittest.TestCase):
    def test_lee_a_lo_sumo_64kb_y_descarta_el_cuerpo(self):
        leidos = []

        class Resp:
            status = 200

            def getheader(self, n):
                return None

            def read(self, n=None):
                leidos.append(n)
                return b"x" * (n or 0)

        class Conn:
            def __init__(self, host, ip, timeout):
                self.args = (host, ip, timeout)

            def request(self, method, path, headers=None):
                assert method == "GET" and headers["Host"] == self.args[0] and "Authorization" not in headers and "Cookie" not in headers

            def getresponse(self):
                return Resp()

            def close(self):
                pass

        st, loc, lat = m.fetch_once("app.example.org", "93.184.216.34", "/h", 8, conn_cls=Conn)
        self.assertEqual((st, loc), (200, None))
        self.assertEqual(leidos, [m.MAX_BODY])
        self.assertEqual(m.MAX_BODY, 65536)
        self.assertEqual(m.TIMEOUT_S, 8)


class RunTests(unittest.TestCase):
    def setUp(self):
        self.posts, self.out, self.err = [], io.StringIO(), io.StringIO()

    def post_factory(self, gate, targets, check=None):
        def post(body):
            self.posts.append(body)
            a = body["action"]
            if a == "strategic_gate":
                return gate
            if a == "strategic_targets":
                return targets
            if a == "strategic_prod_check":
                return check if check is not None else {"ok": True, "recorded": True}
            raise AssertionError("acción inesperada: " + a)
        return post

    def go(self, argv, gate, targets, script=None, check=None):
        f = FakeFetcher(script or {})
        code = m.run(argv, post=self.post_factory(gate, targets, check), fetcher=f, resolver=PUB, out=self.out, err=self.err, now=lambda: "2026-11-02T15:00:00.000Z", clock=lambda: 0)
        return code, f

    def acciones(self):
        return [p["action"] for p in self.posts]

    def test_gate_skip_no_hace_nada_y_no_imprime(self):
        for gate in ({"ok": True, "mode": "skip", "reason": "flag_off"}, {"ok": False}, {"ok": True, "mode": "run-ish"}, "basura", None):
            self.posts.clear()
            code, f = self.go([], gate, {"ok": True, "targets": [{"id": "t1", "health_url": "https://app.example.org/h"}]}, {"app.example.org": (200, None, 1)})
            self.assertEqual(code, 0)
            self.assertEqual(self.acciones(), ["strategic_gate"], "no pide targets si la compuerta dice skip")
            self.assertEqual(f.calls, [])
        self.assertEqual(self.out.getvalue() + self.err.getvalue(), "")

    def test_corrida_normal_registra_un_chequeo_por_servicio_sin_urls_ni_silencio_roto(self):
        targets = {"ok": True, "targets": [{"id": "t1", "logical_name": "A", "health_url": "https://app.example.org/h"}, {"id": "t2", "logical_name": "B", "health_url": "https://other.example.org/h"}]}
        code, f = self.go([], {"ok": True, "mode": "run"}, targets, {"app.example.org": (200, None, 50), "other.example.org": (503, None, 90)})
        self.assertEqual(code, 0)
        self.assertEqual(self.acciones(), ["strategic_gate", "strategic_targets", "strategic_prod_check", "strategic_prod_check"])
        c1, c2 = self.posts[2]["params"], self.posts[3]["params"]
        self.assertEqual((c1["target_id"], c1["result"], c1["http_status"], c1["latency_ms"], c1["test"]), ("t1", "healthy", 200, 50, False))
        self.assertEqual((c2["target_id"], c2["result"], c2["http_status"]), ("t2", "down", 503))
        self.assertEqual(set(c1), {"target_id", "checked_at", "result", "http_status", "latency_ms", "error_code", "test"})  # sin URL, sin cuerpo, sin SHA
        self.assertEqual(self.out.getvalue(), "", "por defecto no imprime nada (nada a Telegram sin aprobación)")

    def test_modo_sombra_no_registra_nada(self):
        targets = {"ok": True, "targets": [{"id": "t1", "logical_name": "A", "health_url": "https://app.example.org/h"}]}
        code, _ = self.go(["--dry-run"], {"ok": True, "mode": "run"}, targets, {"app.example.org": (200, None, 50)})
        self.assertEqual(code, 0)
        self.assertNotIn("strategic_prod_check", self.acciones())
        self.assertIn("modo sombra", self.out.getvalue())

    def test_target_con_destino_privado_se_registra_unknown_sin_conectar(self):
        targets = {"ok": True, "targets": [{"id": "t1", "health_url": "https://evil.example.org/h"}, {"id": "t2", "health_url": "https://10.0.0.5/h"}, {"id": "t3", "health_url": "http://app.example.org/h"}]}
        code, f = self.go([], {"ok": True, "mode": "run"}, targets, {"app.example.org": (200, None, 1)})
        self.assertEqual(code, 0)
        self.assertEqual(f.calls, [])
        self.assertEqual([p["params"]["result"] for p in self.posts if p["action"] == "strategic_prod_check"], ["unknown"] * 3)

    def test_filas_mal_formadas_y_tope_de_servicios(self):
        targets = {"ok": True, "targets": [None, {"id": 5, "health_url": "https://app.example.org/h"}, {"id": "t1"}, {"health_url": "https://app.example.org/h"}] + [{"id": "x%d" % i, "health_url": "https://app.example.org/h"} for i in range(40)]}
        code, f = self.go([], {"ok": True, "mode": "run"}, targets, {"app.example.org": (200, None, 1)})
        self.assertEqual(code, 0)
        self.assertEqual(len(f.calls), m.MAX_TARGETS)

    def test_targets_vacios_o_con_error_no_hacen_nada(self):
        for tg in ({"ok": True, "targets": []}, {"ok": False}, {"ok": True, "targets": "x"}, None):
            self.posts.clear()
            code, f = self.go([], {"ok": True, "mode": "run"}, tg)
            self.assertEqual((code, f.calls), (0, []))

    def test_n8n_caido_devuelve_error_sin_filtrar_la_clave(self):
        def boom(body):
            raise RuntimeError("falló con " + SECRET)
        for fase in ("gate", "targets"):
            self.out, self.err = io.StringIO(), io.StringIO()
            n = {"c": 0}

            def post(body, fase=fase):
                n["c"] += 1
                if fase == "gate" or body["action"] == "strategic_targets":
                    boom(body)
                return {"ok": True, "mode": "run"}
            code = m.run([], post=post, fetcher=FakeFetcher({}), resolver=PUB, out=self.out, err=self.err)
            self.assertEqual(code, 1)
            self.assertNotIn(SECRET, self.out.getvalue() + self.err.getvalue())

    def test_registro_rechazado_por_politica_no_es_fallo_pero_error_de_red_si(self):
        targets = {"ok": True, "targets": [{"id": "t1", "health_url": "https://app.example.org/h"}]}
        code, _ = self.go([], {"ok": True, "mode": "run"}, targets, {"app.example.org": (200, None, 1)}, check={"ok": False, "error": "flag_off"})
        self.assertEqual(code, 0)
        self.assertIn("flag_off", self.err.getvalue())
        self.assertEqual(self.out.getvalue(), "")
        code, _ = self.go([], {"ok": True, "mode": "run"}, targets, {"app.example.org": (200, None, 1)}, check="no-es-dict")
        self.assertEqual(code, 1)

    def test_probe_prueba_una_direccion_sin_hablar_con_n8n(self):
        f = FakeFetcher({"app.example.org": (200, None, 33)})
        code = m.run(["--probe", "https://app.example.org/health"], post=lambda b: (_ for _ in ()).throw(AssertionError("no debe usar n8n")), fetcher=f, resolver=PUB, out=self.out, err=self.err, now=lambda: "2026-11-02T15:00:00.000Z")
        self.assertEqual(code, 0)
        self.assertIn('"result": "healthy"', self.out.getvalue())
        self.assertIn("no se guardó nada", self.out.getvalue())
        self.out = io.StringIO()
        m.run(["--probe", "https://127.0.0.1/"], fetcher=f, resolver=PUB, out=self.out, err=self.err)
        self.assertIn('"unknown"', self.out.getvalue())
        self.assertEqual(len(f.calls), 1)

    def test_el_modulo_no_trae_secretos_ni_dependencias_externas(self):
        with open(m.__file__, encoding="utf-8") as fh:
            src = fh.read()
        for imp in [l for l in src.splitlines() if l.startswith(("import ", "from "))]:
            mod = imp.split()[1].split(".")[0]
            self.assertIn(mod, {"argparse", "datetime", "http", "ipaddress", "json", "os", "re", "socket", "ssl", "sys", "time", "urllib"}, imp)
        self.assertNotRegex(src, r"(?i)(bearer |eyJ[A-Za-z0-9_-]{20}|sk-[A-Za-z0-9]{20}|pit-[0-9a-f]{8})")
        self.assertNotIn("print(", src)  # solo escribe en los flujos inyectados


if __name__ == "__main__":
    unittest.main(verbosity=1)
