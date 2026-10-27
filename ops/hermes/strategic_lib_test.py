"""Pruebas de strategic_lib.py: equivalencia EXACTA con el motor de Node (fixtures compartidos), horarios en hora de Chile y revisión de la carga del agente. Sin red."""
import datetime
import json
import os
import sys
import unittest
from zoneinfo import ZoneInfo

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
import strategic_lib as L  # noqa: E402

with open(os.path.join(HERE, "strategic-fixtures.json"), encoding="utf-8") as fh:
    FIX = json.load(fh)


class FixtureTests(unittest.TestCase):
    def test_hay_suficientes_casos_de_ambos_lados(self):
        self.assertGreaterEqual(len(FIX["cases"]), 50)
        self.assertGreaterEqual(len([c for c in FIX["cases"] if c["canonical"]]), 20)
        self.assertGreaterEqual(len([c for c in FIX["cases"] if not c["canonical"]]), 20)

    def test_url_canonica_identica_a_node(self):
        malos = []
        for c in FIX["cases"]:
            got = L.canonical_url(c["input"])
            if got != c["canonical"]:
                malos.append((c["input"], c["canonical"], got))
        self.assertEqual(malos, [], "Python y Node deben converger en la misma URL canónica")

    def test_huella_identica_a_node_para_los_tres_tipos_y_evento_con_fecha(self):
        for c in FIX["cases"]:
            if not c["canonical"]:
                continue
            fp = c["fingerprints"]
            self.assertEqual(L.fingerprint("product", c["canonical"]), fp["product"], c["input"])
            self.assertEqual(L.fingerprint("partner", c["canonical"]), fp["partner"], c["input"])
            self.assertEqual(L.fingerprint("event", c["canonical"]), fp["event"], c["input"])
            self.assertEqual(L.fingerprint("event", c["canonical"], FIX["event_date"]), fp["event_dated"], c["input"])
            self.assertEqual(L.fingerprint("events", c["canonical"]), fp["event"], "acepta el plural de la petición")

    def test_ejemplos_del_spec(self):
        a = L.canonical_url("https://github.com/Acme/Repo/?utm_source=a#readme")
        self.assertEqual(a, L.canonical_url("https://github.com/Acme/Repo"))
        self.assertNotEqual(L.canonical_url("https://organizador.cl/evento?id=2026"), L.canonical_url("https://organizador.cl/evento?id=2027"))
        self.assertNotEqual(L.fingerprint("product", a), L.fingerprint("partner", a))
        self.assertNotEqual(L.fingerprint("event", a), L.fingerprint("event", a, "2026-11-18"))
        self.assertEqual(L.fingerprint("event", a, "fecha desconocida"), L.fingerprint("event", a), "sin fecha real no se agrega sufijo")
        self.assertEqual(len(L.fingerprint("product", a)), 64)

    def test_huella_rechaza_entradas_invalidas(self):
        self.assertIsNone(L.fingerprint("otro", "https://example.org/"))
        self.assertIsNone(L.fingerprint("product", None))
        self.assertIsNone(L.canonical_url(None))
        self.assertIsNone(L.canonical_url(12345))


class ScheduleTests(unittest.TestCase):
    def utc(self, y, mo, d, h, mi=0):
        return datetime.datetime(y, mo, d, h, mi, tzinfo=datetime.timezone.utc)

    def test_horario_de_verano_y_de_invierno_usan_cada_uno_su_disparo(self):
        # 3-nov-2026 martes (verano, UTC-3): 07:00 local = 10:00 UTC. 2-jun-2026 martes (invierno, UTC-4): 07:00 local = 11:00 UTC.
        self.assertEqual(self.utc(2026, 11, 3, 10).astimezone(ZoneInfo("America/Santiago")).utcoffset(), datetime.timedelta(hours=-3))
        self.assertEqual(self.utc(2026, 6, 2, 11).astimezone(ZoneInfo("America/Santiago")).utcoffset(), datetime.timedelta(hours=-4))
        self.assertTrue(L.in_slot("products", self.utc(2026, 11, 3, 10, 0)))
        self.assertFalse(L.in_slot("products", self.utc(2026, 11, 3, 11, 0)), "el otro disparo UTC (08:00 local) se descarta")
        self.assertTrue(L.in_slot("products", self.utc(2026, 6, 2, 11, 0)))
        self.assertFalse(L.in_slot("products", self.utc(2026, 6, 2, 10, 0)), "06:00 local en invierno se descarta")

    def test_dias_y_horas_de_cada_job(self):
        # 2026-11-02 lunes · 03 martes · 05 jueves · 06 viernes (verano, UTC-3)
        casos = [("products", (3, 6), 10, 0), ("partners", (2, 5), 10, 15), ("events", (2,), 10, 30)]
        for kind, dias, h, mi in casos:
            for d in range(2, 9):
                esperado = d in dias
                self.assertEqual(L.in_slot(kind, self.utc(2026, 11, d, h, mi)), esperado, f"{kind} día {d}")
        self.assertFalse(L.in_slot("products", self.utc(2026, 11, 3, 9, 59)))
        self.assertTrue(L.in_slot("products", self.utc(2026, 11, 3, 10, 19)))
        self.assertFalse(L.in_slot("products", self.utc(2026, 11, 3, 10, 20)))

    def test_el_cron_cubre_ambos_horarios_utc(self):
        for kind, expr in L.CRON_UTC.items():
            minute, hours, _, _, days = expr.split()
            self.assertEqual(hours, "10,11")
            self.assertEqual(int(minute), (L.SLOTS[kind][1]) % 60)
            self.assertEqual(sorted((d - 1) % 7 for d in map(int, days.split(","))), sorted(L.SLOTS[kind][0]), kind)

    def test_kind_desconocido_nunca_corre(self):
        self.assertFalse(L.in_slot("production", self.utc(2026, 11, 3, 10)))
        self.assertFalse(L.in_slot("x", self.utc(2026, 11, 3, 10)))


class SubmitTests(unittest.TestCase):
    ITEM = {"title": "Repo", "canonical_url": "https://github.com/Acme/Repo/?utm_source=a", "organization": "Acme"}

    def test_agrega_la_huella_base_y_descarta_la_que_ponga_la_ia(self):
        items, err = L.check_submit("products", json.dumps({"items": [{**self.ITEM, "fingerprint": "a" * 64}]}))
        self.assertIsNone(err)
        self.assertEqual(items[0]["fingerprint"], L.fingerprint("product", "https://github.com/Acme/Repo"))
        self.assertNotEqual(items[0]["fingerprint"], "a" * 64)

    def test_acepta_lista_directa_y_url_invalida_queda_sin_huella(self):
        items, err = L.check_submit("events", json.dumps([{**self.ITEM, "canonical_url": "http://x.org/"}]))
        self.assertIsNone(err)
        self.assertNotIn("fingerprint", items[0])

    def test_rechaza_cargas_invalidas(self):
        malos = [("oro", json.dumps({"items": [self.ITEM]})), ("products", ""), ("products", "no es json"), ("products", json.dumps({"items": []})), ("products", json.dumps({"items": "x"})),
                 ("products", json.dumps({"items": [self.ITEM] * 13})), ("products", json.dumps({"items": ["texto"]})), ("products", json.dumps({"items": [dict(self.ITEM, summary="x" * 90000)]})), ("products", None)]
        for kind, payload in malos:
            items, err = L.check_submit(kind, payload)
            self.assertIsNone(items)
            self.assertTrue(err)
        items, err = L.check_submit("products", json.dumps({"items": [self.ITEM] * 12}))
        self.assertIsNone(err)
        self.assertEqual(len(items), 12)


class GateTests(unittest.TestCase):
    IN = datetime.datetime(2026, 11, 3, 10, 5, tzinfo=datetime.timezone.utc)  # martes 07:05 hora de Chile (verano)
    OUT = datetime.datetime(2026, 11, 3, 11, 5, tzinfo=datetime.timezone.utc)  # martes 08:05 hora de Chile: el otro disparo UTC

    def test_run_dentro_de_horario_trae_fecha_tope_y_regla_de_no_repetir(self):
        t = L.gate_text("products", self.IN, {"ok": True, "mode": "run", "max_items": 12, "reason": "ok"})
        self.assertIn("mode=run max_items=12", t)
        self.assertIn("FECHA_DE_HOY: 2026-11-03", t)
        self.assertIn('strategic_radar_read("products")', t)
        self.assertNotIn("VENTANA_DE_EVENTOS", t)

    def test_eventos_agregan_la_ventana_de_90_dias(self):
        lun = datetime.datetime(2026, 11, 2, 10, 35, tzinfo=datetime.timezone.utc)  # lunes 07:35
        t = L.gate_text("events", lun, {"ok": True, "mode": "run", "max_items": 5, "reason": "ok"})
        self.assertIn("VENTANA_DE_EVENTOS: desde hoy hasta 2027-01-31", t)

    def test_fuera_de_horario_es_skip_sin_consultar_y_force_lo_permite(self):
        self.assertIn("mode=skip — fuera del horario", L.gate_text("products", self.OUT, {"ok": True, "mode": "run", "max_items": 12}))
        self.assertIn("mode=run", L.gate_text("products", self.OUT, {"ok": True, "mode": "run", "max_items": 12}, force=True))

    def test_cualquier_duda_es_skip(self):
        for reply in (None, "x", {}, {"ok": False}, {"ok": True}, {"ok": True, "mode": "quizas"}):
            self.assertIn("mode=skip", L.gate_text("products", self.IN, reply), repr(reply))
        self.assertIn("mode=skip", L.gate_text("production", self.IN, {"ok": True, "mode": "run"}))
        self.assertIn("mode=skip — flag_off", L.gate_text("products", self.IN, {"ok": True, "mode": "skip", "reason": "flag_off"}))

    def test_el_tope_nunca_pasa_de_12(self):
        self.assertIn("max_items=12", L.gate_text("products", self.IN, {"ok": True, "mode": "run", "max_items": 500}))
        self.assertIn("max_items=3", L.gate_text("products", self.IN, {"ok": True, "mode": "run", "max_items": 3}))

    def test_cli_no_consulta_n8n_fuera_de_horario_ni_filtra_errores(self):
        import io
        calls = []
        out = io.StringIO()
        L.cli_gate(["products"], post=lambda b: calls.append(b) or {"ok": True, "mode": "run", "max_items": 5}, now=self.OUT, out=out)
        self.assertEqual(calls, [])
        self.assertIn("mode=skip", out.getvalue())
        out = io.StringIO()
        L.cli_gate(["products", "--force"], post=lambda b: calls.append(b) or {"ok": True, "mode": "run", "max_items": 5}, now=self.OUT, out=out)
        self.assertEqual(calls[0], {"action": "strategic_gate", "params": {"kind": "products"}})
        self.assertIn("mode=run", out.getvalue())
        out = io.StringIO()

        def boom(b):
            raise RuntimeError("clave SECRETA-999")
        L.cli_gate(["products"], post=boom, now=self.IN, out=out)
        self.assertIn("mode=skip", out.getvalue())
        self.assertNotIn("SECRETA", out.getvalue())
        out = io.StringIO()
        L.cli_gate(["oro"], post=boom, now=self.IN, out=out)
        self.assertIn("categoría desconocida", out.getvalue())


if __name__ == "__main__":
    unittest.main(verbosity=1)
