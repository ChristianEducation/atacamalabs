/**
 * Visual del hero de /paginas-web (V3.3 §14): composición de navegador
 * abstracta — chrome, bloques de layout y profundidad de scroll, sin
 * capturas ni contenido real. Puramente decorativo.
 */
export function WebBrowserAbstract() {
  return (
    <div className="mk-web-abstract" aria-hidden="true">
      <div className="mk-web-abstract__chrome">
        <span />
        <span />
        <span />
      </div>
      <div className="mk-web-abstract__body">
        <div className="mk-web-abstract__block mk-web-abstract__block--wide" />
        <div className="mk-web-abstract__row">
          <div className="mk-web-abstract__block" />
          <div className="mk-web-abstract__block" />
          <div className="mk-web-abstract__block" />
        </div>
        <div className="mk-web-abstract__block mk-web-abstract__block--tall" />
      </div>
      <div className="mk-web-abstract__depth mk-web-abstract__depth--2" />
      <div className="mk-web-abstract__depth mk-web-abstract__depth--3" />
    </div>
  );
}
