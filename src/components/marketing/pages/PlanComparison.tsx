"use client";

import { useId, useState } from "react";
import { Button } from "../ui/Button";
import { PRICE_PENDING_COPY, renderPrice, type Plan } from "@/content/marketing/pricing";

/**
 * E32 PlanComparison — tabla semántica con seis filas R2. Desktop: 4 columnas.
 * Móvil: selector nativo de plan → tabla atributo/valor de ese plan; «Ver todos»
 * habilita el scroll horizontal local. Valor pendiente = «A definir en propuesta».
 */
export function PlanComparison<Id extends string>({ plans }: { plans: readonly Plan<Id>[] }) {
  const uid = useId();
  const [selected, setSelected] = useState<string>(plans[0].id);
  const all = selected === "all";
  const rows = plans[0].features.map((f) => f.label);

  return (
    <div className="mk-cmp-wrap">
      <div className="mk-cmp-controls">
        <label htmlFor={`${uid}-plan`}>Plan</label>
        <select id={`${uid}-plan`} className="mk-select" value={selected} onChange={(e) => setSelected(e.target.value)}>
          {plans.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
          <option value="all">Ver todos</option>
        </select>
        {all ? (
          <Button variant="tertiary" size="sm" onClick={() => setSelected(plans[0].id)}>
            Volver a un plan
          </Button>
        ) : null}
      </div>

      <div
        className="mk-cmp"
        data-selected={all ? "all" : selected}
        role={all ? "region" : undefined}
        aria-label={all ? "Comparación completa de planes (desplazable horizontalmente)" : undefined}
        tabIndex={all ? 0 : undefined}
      >
        <table className="mk-cmp__table">
          <caption className="mk-sr-only">Comparación de planes de agentes</caption>
          <thead>
            <tr>
              <th scope="col">Atributo</th>
              {plans.map((p) => (
                <th key={p.id} scope="col" data-plan={p.id}>
                  {p.name}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            <tr>
              <th scope="row">Precio</th>
              {plans.map((p) => (
                <td key={p.id} data-plan={p.id}>
                  {renderPrice(p.price).headline}
                </td>
              ))}
            </tr>
            {rows.map((label, i) => (
              <tr key={label}>
                <th scope="row">{label}</th>
                {plans.map((p) => {
                  const f = p.features[i];
                  return (
                    <td key={p.id} data-plan={p.id}>
                      {f.confirmed && f.value ? f.value : PRICE_PENDING_COPY.value}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
