"""Ejecuta de verdad las 3 herramientas MCP del Radar estratégico con `mcp` y n8n SIMULADOS (sin red, sin instalar nada)."""
import json
import os
import re
import sys
import types
import unittest

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)

# `mcp` falso: @mcp.tool() devuelve la función tal cual.
_srv = types.ModuleType("mcp.server.fastmcp")


class _Fake:
    def __init__(self, name):
        self.name = name

    def tool(self, *a, **k):
        return lambda fn: fn

    def run(self):
        raise AssertionError("no debe arrancar el servidor en las pruebas")


_srv.FastMCP = _Fake
for name in ("mcp", "mcp.server"):
    sys.modules.setdefault(name, types.ModuleType(name))
sys.modules["mcp.server.fastmcp"] = _srv

CALLS = []
REPLY = {}


def fake_post_ops(body, timeout=90):
    CALLS.append(body)
    r = REPLY.get(body["action"])
    if isinstance(r, Exception):
        raise r
    return r if r is not None else {"ok": True}


_common = types.ModuleType("atacama_common")
_common.post_ops = fake_post_ops
sys.modules["atacama_common"] = _common

import atacama_ops_mcp as T  # noqa: E402
import strategic_lib as L  # noqa: E402

ITEM = {"title": "Agenda clínica abierta", "organization": "Acme", "canonical_url": "https://github.com/Acme/Agenda/?utm_source=x#readme", "summary": "Gestiona citas.", "business_case": "Reduce llamadas.", "next_action": "Revisar licencia", "scoring": {"license": 25}, "evidence": []}


class RadarToolTests(unittest.TestCase):
    def setUp(self):
        CALLS.clear()
        REPLY.clear()

    def test_status_consulta_compuerta_y_ultima_corrida(self):
        REPLY["strategic_gate"] = {"ok": True, "mode": "skip", "reason": "flag_off", "max_items": 0, "extra": "no sale"}
        REPLY["strategic_view"] = {"ok": True, "strategic": {"enabled": False, "runs": [{"status": "ok", "finished_at": "2026-11-02T10:00:00Z", "accepted_count": 3, "duplicate_count": 1, "failed_count": 0, "error_code": None, "id": "no-sale"}]}}
        r = json.loads(T.strategic_radar_status("products"))
        self.assertEqual((r["mode"], r["reason"], r["max_items"], r["enabled"]), ("skip", "flag_off", 0, False))
        self.assertEqual(r["last_run"]["accepted_count"], 3)
        self.assertNotIn("extra", r)
        self.assertEqual([c["action"] for c in CALLS], ["strategic_gate", "strategic_view"])
        self.assertEqual(CALLS[0]["params"], {"kind": "products"})

    def test_status_rechaza_kind_invalido_sin_llamar(self):
        for k in ("oro", "", "product", "events; drop"):
            self.assertEqual(json.loads(T.strategic_radar_status(k))["error"], "kind_invalido")
        self.assertEqual(CALLS, [])

    def test_status_tolera_n8n_caido_sin_filtrar_nada(self):
        REPLY["strategic_gate"] = RuntimeError("boom con clave SECRETA-123")
        r = T.strategic_radar_status("events")
        self.assertEqual(json.loads(r)["error"], "red")
        self.assertNotIn("SECRETA", r)

    def test_submit_agrega_huella_base_ignora_la_de_la_ia_y_genera_run_id(self):
        REPLY["strategic_ingest"] = {"ok": True, "text": "x", "kind": "products", "run_id": "r", "accepted": 1, "duplicates": 0, "rejected": [], "secreto": "no sale"}
        r = json.loads(T.strategic_radar_submit("products", json.dumps({"items": [{**ITEM, "fingerprint": "a" * 64}]})))
        self.assertEqual((r["ok"], r["accepted"]), (True, 1))
        self.assertNotIn("secreto", r)
        body = CALLS[0]
        self.assertEqual(body["action"], "strategic_ingest")
        p = body["params"]
        self.assertRegex(p["run_id"], r"^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$")
        self.assertEqual(p["items"][0]["fingerprint"], L.fingerprint("product", "https://github.com/Acme/Agenda"))
        self.assertEqual((p["kind"], p["test"], p["trigger"]), ("products", False, "cron"))
        self.assertRegex(p["started_at"], r"^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.000Z$")
        self.assertNotIn("dry_run", body)

    def test_submit_test_y_dry_run_se_pasan_al_servidor(self):
        T.strategic_radar_submit("events", json.dumps({"items": [ITEM]}), test=True, dry_run=True)
        self.assertTrue(CALLS[0]["params"]["test"])
        self.assertTrue(CALLS[0]["dry_run"])

    def test_cada_envio_usa_un_run_id_nuevo(self):
        for _ in range(3):
            T.strategic_radar_submit("partners", json.dumps({"items": [ITEM]}))
        ids = {c["params"]["run_id"] for c in CALLS}
        self.assertEqual(len(ids), 3)

    def test_submit_rechaza_cargas_invalidas_sin_llamar_a_n8n(self):
        malos = [("oro", json.dumps({"items": [ITEM]})), ("products", ""), ("products", "{no json"), ("products", json.dumps({"items": []})), ("products", json.dumps({"items": [ITEM] * 13})), ("products", json.dumps({"items": [dict(ITEM, summary="x" * 90000)]})), ("production", json.dumps({"items": [ITEM]}))]
        for kind, payload in malos:
            r = json.loads(T.strategic_radar_submit(kind, payload))
            self.assertFalse(r["ok"], kind)
        self.assertEqual(CALLS, [])

    def test_submit_devuelve_los_rechazos_del_servidor_por_indice(self):
        REPLY["strategic_ingest"] = {"ok": True, "accepted": 0, "duplicates": 0, "rejected": [{"index": 0, "reason": "evidence_missing"}], "run_status": "failed"}
        r = json.loads(T.strategic_radar_submit("products", json.dumps({"items": [ITEM]})))
        self.assertEqual(r["rejected"], [{"index": 0, "reason": "evidence_missing"}])

    def test_submit_con_servidor_que_rechaza_la_peticion(self):
        REPLY["strategic_ingest"] = {"ok": False, "error": "flag_off", "text": "La investigación de products está apagada."}
        r = json.loads(T.strategic_radar_submit("products", json.dumps({"items": [ITEM]})))
        self.assertEqual((r["ok"], r["error"]), (False, "flag_off"))

    def test_read_resume_sin_urls_internas_ni_claves(self):
        REPLY["strategic_view"] = {"ok": True, "strategic": {"enabled": True, "source_state": "ok", "summary": {"total": 1}, "items": [{"logical_name": "A", "status": "confirmed", "http_state": "healthy", "last_checked_at": "x", "health_url": "https://interna.example.org/h", "repo_full_name": "o/r", "notes": "privado"}]}}
        r = T.strategic_radar_read("production")
        self.assertNotIn("interna.example.org", r)
        self.assertNotIn("privado", r)
        self.assertEqual(json.loads(r)["items"][0], {"logical_name": "A", "status": "confirmed", "http_state": "healthy", "last_checked_at": "x"})
        REPLY["strategic_view"] = {"ok": True, "strategic": {"enabled": False, "items": [{"title": "T", "canonical_url": "https://x.org/", "status": "new", "score": 80, "confidence": "low", "evidence": [{"claim": "no sale"}], "summary": "no sale"}]}}
        o = json.loads(T.strategic_radar_read("products"))["items"][0]
        self.assertEqual(set(o), {"title", "canonical_url", "status", "score", "confidence", "last_checked_at", "deadline_at", "event_start_at"})
        self.assertEqual(json.loads(T.strategic_radar_read("otra"))["error"], "tab_invalido")

    def test_read_acota_el_tamano(self):
        REPLY["strategic_view"] = {"ok": True, "strategic": {"items": [{"title": "t" * 400, "canonical_url": "https://x.org/" + "a" * 400} for _ in range(200)]}}
        self.assertLessEqual(len(T.strategic_radar_read("events")), 20000)

    def test_ninguna_herramienta_nueva_habla_con_otra_accion(self):
        REPLY["strategic_gate"] = {"ok": True, "mode": "run", "max_items": 5}
        T.strategic_radar_status("events")
        T.strategic_radar_submit("events", json.dumps({"items": [ITEM]}))
        T.strategic_radar_read("events")
        self.assertTrue({c["action"] for c in CALLS} <= {"strategic_gate", "strategic_view", "strategic_ingest"})
        self.assertFalse(any(re.search(r"mail|ghl|send|publish|git|alert", c["action"]) for c in CALLS))


if __name__ == "__main__":
    unittest.main(verbosity=1)
