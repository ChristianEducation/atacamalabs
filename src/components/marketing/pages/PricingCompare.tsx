"use client";

import { useId, useState } from "react";
import { Check, Minus } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Cell, CompareRow } from "@/content/marketing/pricing-page";

interface Compare {
  title: string;
  caption: string;
  columns: readonly string[];
  ids: readonly string[];
  rows: readonly CompareRow[];
  note: string;
}

function CellValue({ value }: { value: Cell }) {
  if (value === true) {
    return (
      <span className="mk-pp-yes">
        <Check size={16} strokeWidth={2.6} aria-hidden />
        <span className="mk-sr-only">Incluido</span>
      </span>
    );
  }
  if (value === false) {
    return (
      <span className="mk-pp-no">
        <Minus size={16} aria-hidden />
        <span className="mk-sr-only">No incluido</span>
      </span>
    );
  }
  return <>{value}</>;
}

/**
 * Tabla comparativa (PRECIOS_SPEC §5 y §9). En escritorio muestra los tres
 * planes lado a lado; en pantallas angostas un selector de píldoras deja ver un
 * plan a la vez como lista atributo → valor, sin scroll horizontal.
 */
export function PricingCompare({ data, featured = 1 }: { data: Compare; featured?: number }) {
  const uid = useId();
  const [selected, setSelected] = useState(featured);

  return (
    <div className="mk-pp-cmp">
      <h3 className="mk-pp-cmp__title">{data.title}</h3>
      <div className="mk-pp-cmp__pills" role="group" aria-label="Plan a comparar">
        {data.columns.map((column, index) => (
          <button
            key={column}
            type="button"
            className="mk-pp-cmp__pill"
            aria-pressed={selected === index}
            onClick={() => setSelected(index)}
          >
            {column}
          </button>
        ))}
      </div>
      <div className="mk-pp-cmp__wrap" data-selected={selected}>
        <table className="mk-pp-cmp__table" aria-describedby={`${uid}-note`}>
          <caption className="mk-sr-only">{data.caption}</caption>
          <thead>
            <tr>
              <th scope="col">Capacidad</th>
              {data.columns.map((column, index) => (
                <th key={column} scope="col" data-col={index} className={cn(index === featured && "is-featured")}>
                  {column}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.rows.map((row) => (
              <tr key={row.label} className={cn(row.price && "is-price")}>
                <th scope="row">{row.label}</th>
                {row.values.map((value, index) => (
                  <td key={data.ids[index]} data-col={index} className={cn(index === featured && "is-featured")}>
                    <CellValue value={value} />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p id={`${uid}-note`} className="mk-pp-cmp__note">
        {data.note}
      </p>
    </div>
  );
}
