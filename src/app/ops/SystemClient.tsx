"use client";

import { useState } from "react";
import { useRunner } from "./Approvals";

const DAYS: [string, string][] = [["lun", "Lunes"], ["mar", "Martes"], ["mie", "Miércoles"], ["jue", "Jueves"], ["vie", "Viernes"]];
const TASKS: Record<string, string> = { ideas: "Ideas de la semana", correos: "Borradores de correo", reuniones: "Reuniones", competencia: "Informe de competencia", revisar_piezas: "Revisar piezas", cierre: "Cierre de la semana" };

/** «Mi semana»: elige en qué día va cada tarea del ritual (spec §8.6). Se guarda con confirmación y queda en el historial. */
export function RitualEditor({ ritual }: { ritual: Record<string, string[]> }) {
  const { pending, run } = useRunner();
  const dayOf = (t: string) => DAYS.find(([k]) => (ritual[k] ?? []).includes(t))?.[0] ?? "";
  const [map, setMap] = useState<Record<string, string>>(() => Object.fromEntries(Object.keys(TASKS).map((t) => [t, dayOf(t)])));
  const changed = Object.keys(TASKS).some((t) => map[t] !== dayOf(t));
  const tooMany = DAYS.some(([k]) => Object.values(map).filter((d) => d === k).length > 4);
  const save = async () => {
    const r: Record<string, string[]> = Object.fromEntries(DAYS.map(([k]) => [k, Object.keys(TASKS).filter((t) => map[t] === k)]));
    await run({ action: "week_ritual_set", ritual: r });
  };
  return (
    <div className="ops-mail-ctl" data-testid="ritual-editor">
      {Object.entries(TASKS).map(([t, label]) => (
        <div key={t} className="ops-inline">
          <label className="ops-lab" htmlFor={`rt-${t}`}>{label}</label>
          <select id={`rt-${t}`} className="ops-input ops-input-s" value={map[t]} onChange={(e) => setMap({ ...map, [t]: e.target.value })}>
            <option value="">Ningún día</option>
            {DAYS.map(([k, l]) => <option key={k} value={k}>{l}</option>)}
          </select>
        </div>
      ))}
      {tooMany ? <p className="ops-foot ops-err">Máximo 4 tareas por día.</p> : null}
      <div className="ops-btns"><button type="button" className="ops-btn ops-btn-primary" disabled={pending || !changed || tooMany} onClick={save}>{pending ? "Guardando…" : "Guardar ritual"}</button></div>
    </div>
  );
}

/** Biblioteca → Recursos: copia el enlace oculto del recurso (para entregarlo por mensaje directo). */
export function CopyLink({ url }: { url: string }) {
  const [ok, setOk] = useState(false);
  return (
    <button type="button" className="ops-btn" onClick={async () => { try { await navigator.clipboard.writeText(url); setOk(true); setTimeout(() => setOk(false), 1500); } catch { setOk(false); } }}>
      {ok ? "¡Copiado!" : "Copiar enlace"}
    </button>
  );
}
