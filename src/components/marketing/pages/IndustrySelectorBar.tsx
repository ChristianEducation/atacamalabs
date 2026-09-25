"use client";

import { useEffect, useRef, useState } from "react";
import { track } from "@/lib/analytics";
import { INDUSTRY_LIST, OTHER_INDUSTRY } from "@/content/marketing/industries";

const ITEMS = [
  ...INDUSTRY_LIST.map((industry) => ({ slug: industry.slug as string, label: industry.shortLabel })),
  { slug: OTHER_INDUSTRY.slug as string, label: OTHER_INDUSTRY.shortLabel },
];

/**
 * Selector de /rubros (RUBROS_Y_FOOTER_SPEC_V1 §7): anclas a cada rubro, pegado
 * bajo el header al salir del hero. Marca el rubro activo mientras se recorre la
 * página (IntersectionObserver) sin tocar la URL: el hash solo cambia cuando la
 * persona hace clic (enlace normal).
 */
export function IndustrySelectorBar() {
  const [active, setActive] = useState("");
  const listRef = useRef<HTMLUListElement>(null);

  useEffect(() => {
    if (typeof IntersectionObserver === "undefined") return;
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) setActive(entry.target.id);
        }
      },
      { rootMargin: "-35% 0px -55% 0px" },
    );
    for (const item of ITEMS) {
      const node = document.getElementById(item.slug);
      if (node) observer.observe(node);
    }
    return () => observer.disconnect();
  }, []);

  /* El chip activo se centra dentro de la barra (solo horizontal: no mueve la página). */
  useEffect(() => {
    const list = listRef.current;
    const chip = list?.querySelector<HTMLElement>('[aria-current="true"]');
    if (!list || !chip) return;
    const target = chip.offsetLeft - (list.clientWidth - chip.offsetWidth) / 2;
    list.scrollTo({ left: Math.max(0, target), behavior: "smooth" });
  }, [active]);

  return (
    <div className="mk-rb-nav">
      <div className="mk-container">
        <nav aria-label="Rubros">
          <ul ref={listRef} className="mk-sel-tabs mk-rb-nav__tabs">
            {ITEMS.map((item) => (
              <li key={item.slug}>
                <a
                  href={`#${item.slug}`}
                  className="mk-sel-tab"
                  aria-current={active === item.slug ? "true" : undefined}
                  onClick={() => {
                    setActive(item.slug);
                    track({
                      name: "industry_open",
                      props: { industryId: item.slug, originSection: "rubros-selector" },
                    });
                  }}
                >
                  {item.label}
                </a>
              </li>
            ))}
          </ul>
        </nav>
      </div>
    </div>
  );
}
