"use client";

import { useRef, useState, type KeyboardEvent } from "react";

export interface SelectorTab {
  id: string;
  label: string;
}

/**
 * E4 Tabs / CapabilitySelector.
 *  ≥1024: tablist (roving tabindex, activación manual: flechas mueven el foco,
 *         Enter/Espacio seleccionan — patrón W3C APG Tabs).
 *  768–1023: botones 2×3 con aria-pressed.
 *  <768: select nativo con label «Qué quieres resolver».
 * Solo una versión es navegable por breakpoint (las otras quedan display:none).
 */
export function CapabilitySelector({
  tabs,
  value,
  onChange,
  panelId,
  idPrefix,
  selectLabel = "Qué quieres resolver",
  ariaLabel,
}: {
  tabs: readonly SelectorTab[];
  value: string;
  onChange: (id: string) => void;
  panelId: string;
  idPrefix: string;
  selectLabel?: string;
  ariaLabel: string;
}) {
  const uid = idPrefix;
  const refs = useRef<(HTMLButtonElement | null)[]>([]);
  const [focusIndex, setFocusIndex] = useState<number | null>(null);
  const selectedIndex = Math.max(
    0,
    tabs.findIndex((t) => t.id === value),
  );
  const tabDomId = (id: string) => selectorTabId(uid, id);

  function onKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    const current = focusIndex ?? selectedIndex;
    let next = current;
    if (event.key === "ArrowRight") next = (current + 1) % tabs.length;
    else if (event.key === "ArrowLeft") next = (current - 1 + tabs.length) % tabs.length;
    else if (event.key === "Home") next = 0;
    else if (event.key === "End") next = tabs.length - 1;
    else return;
    event.preventDefault();
    setFocusIndex(next);
    refs.current[next]?.focus();
  }

  return (
    <div className="mk-selector">
      <div
        className="mk-selector__tablist"
        role="tablist"
        aria-label={ariaLabel}
        onKeyDown={onKeyDown}
      >
        {tabs.map((tab, i) => {
          const selected = tab.id === value;
          return (
            <button
              key={tab.id}
              ref={(el) => {
                refs.current[i] = el;
              }}
              id={tabDomId(tab.id)}
              role="tab"
              type="button"
              aria-selected={selected}
              aria-controls={panelId}
              tabIndex={(focusIndex ?? selectedIndex) === i ? 0 : -1}
              className="mk-selector__tab"
              data-selected={selected || undefined}
              onClick={() => {
                setFocusIndex(i);
                onChange(tab.id);
              }}
              onBlur={() => setFocusIndex(null)}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      <div className="mk-selector__pressed" role="group" aria-label={ariaLabel}>
        {tabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            aria-pressed={tab.id === value}
            className="mk-selector__pill"
            onClick={() => onChange(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="mk-selector__select">
        <label htmlFor={`${uid}-select`} className="mk-selector__select-label">
          {selectLabel}
        </label>
        <select
          id={`${uid}-select`}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          aria-controls={panelId}
          className="mk-select"
        >
          {tabs.map((tab) => (
            <option key={tab.id} value={tab.id}>
              {tab.label}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}

/** id de tab expuesto para `aria-labelledby` del panel (mismo useId no accesible desde fuera). */
export function selectorTabId(uid: string, id: string) {
  return `${uid}-tab-${id}`;
}
