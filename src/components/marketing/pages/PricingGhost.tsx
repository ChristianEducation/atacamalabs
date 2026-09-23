/**
 * Visual del hero de /precios (V3.3 §15): 2–3 "ghost cards" muy sutiles,
 * líneas y shapes abstractos. Sin números ni precios — nada que pueda
 * leerse como una tarifa real.
 */
export function PricingGhost() {
  return (
    <div className="mk-pricing-ghost" aria-hidden="true">
      <div className="mk-pricing-ghost__card mk-pricing-ghost__card--a" />
      <div className="mk-pricing-ghost__card mk-pricing-ghost__card--b" />
      <div className="mk-pricing-ghost__card mk-pricing-ghost__card--c" />
      <span className="mk-pricing-ghost__line mk-pricing-ghost__line--v" />
      <span className="mk-pricing-ghost__line mk-pricing-ghost__line--h" />
    </div>
  );
}
