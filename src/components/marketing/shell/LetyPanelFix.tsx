"use client";

import { useEffect } from "react";

/*
 * El widget de Lety deja su iframe de chat montado aunque esté cerrado, solo
 * con opacity:0 + pointer-events:none. En iOS (WebKit) un iframe así igual se
 * queda con el gesto de scroll: los carruseles horizontales que quedan debajo
 * (casi toda la pantalla) no reciben el swipe. visibility:hidden lo saca de
 * verdad del hit-testing mientras está cerrado; el retraso deja terminar el
 * fundido de cierre.
 */
const CSS = `.lety-panel:not(.open){visibility:hidden;transition:opacity .18s,transform .18s,visibility 0s .18s}`;
const MARK = "data-atacama-fix";

export function LetyPanelFix() {
  useEffect(() => {
    let tries = 0;
    const timer = window.setInterval(() => {
      const root = document.querySelector("[data-lety-widget]")?.shadowRoot;
      if (root?.querySelector(".lety-panel")) {
        if (!root.querySelector(`style[${MARK}]`)) {
          const style = document.createElement("style");
          style.setAttribute(MARK, "");
          style.textContent = CSS;
          root.appendChild(style);
        }
        window.clearInterval(timer);
      } else if (++tries > 60) {
        window.clearInterval(timer);
      }
    }, 300);
    return () => window.clearInterval(timer);
  }, []);

  return null;
}
