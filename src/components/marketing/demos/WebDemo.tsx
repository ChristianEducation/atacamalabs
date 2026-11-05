"use client";

import { useEffect, useId, useState } from "react";
import { Check, Minus, Monitor, Plus, ShoppingCart, Smartphone, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "../ui/Button";
import { CapabilitySelector } from "../ui/CapabilitySelector";
import { DemoFrame } from "./DemoFrame";
import { formatCLP } from "./records";
import { controlsOf } from "./ScenarioDemos";
import { useDemoClock } from "../motion/useDemoClock";
import { WEB_PRODUCTS, type Product } from "@/content/marketing/fixtures";

export type WebFormat = "landing" | "corporativa" | "ecommerce";

export const WEB_FORMATS: readonly { id: WebFormat; label: string; address: string }[] = [
  { id: "landing", label: "Landing", address: "servicio-demo.example" },
  { id: "corporativa", label: "Corporativa", address: "empresa-demo.example" },
  { id: "ecommerce", label: "Ecommerce", address: "tienda-demo.example" },
];

/* ------------------------------ Ilustraciones CSS/SVG ---------------------- */

function ProductArt({ id }: { id: string }) {
  return (
    <svg viewBox="0 0 120 88" className="mk-product__art" aria-hidden focusable="false">
      {id === "KIT-DEMO-01" ? (
        <>
          <rect x="14" y="30" width="92" height="44" rx="8" />
          <rect x="26" y="16" width="34" height="14" rx="4" />
          <rect x="66" y="20" width="28" height="10" rx="4" />
          <line x1="26" y1="52" x2="94" y2="52" />
        </>
      ) : (
        <>
          <rect x="30" y="10" width="60" height="68" rx="6" />
          <line x1="42" y1="10" x2="42" y2="78" />
          <line x1="52" y1="30" x2="80" y2="30" />
          <line x1="52" y1="42" x2="80" y2="42" />
          <line x1="52" y1="54" x2="70" y2="54" />
        </>
      )}
    </svg>
  );
}

/* ---------------------------------- Landing ------------------------------- */

function LandingSite({ sent, onSend }: { sent: boolean; onSend: () => void }) {
  const [showContact, setShowContact] = useState(sent);
  return (
    <div className="mk-site">
      <header className="mk-site__nav">
        <strong>Servicio Demo Norte</strong>
      </header>
      <section className="mk-site__hero">
        <h3 className="mk-site__h">Una operación más clara para tu equipo.</h3>
        <ul className="mk-site__benefits">
          <li>Información ordenada</li>
          <li>Un responsable</li>
          <li>Siguiente paso visible</li>
        </ul>
        <button type="button" className="mk-site__cta" onClick={() => setShowContact(true)}>
          Ver cómo empezar
        </button>
      </section>
      {showContact ? (
        <section className="mk-site__block" aria-label="Contacto de ejemplo">
          <p className="mk-site__label">Empresa Demo Norte</p>
          {sent ? (
            <p className="mk-note mk-note--ok" role="status">
              <Check size={16} aria-hidden /> Solicitud de ejemplo creada
            </p>
          ) : (
            <button type="button" className="mk-site__cta" onClick={onSend}>
              Simular solicitud
            </button>
          )}
        </section>
      ) : null}
    </div>
  );
}

/* -------------------------------- Corporativa ----------------------------- */

type CorpPage = "inicio" | "servicios" | "contacto";

function CorporateSite({
  page,
  onPage,
  sent,
  onSend,
}: {
  page: CorpPage;
  onPage: (p: CorpPage) => void;
  sent: boolean;
  onSend: () => void;
}) {
  const pages: [CorpPage, string][] = [
    ["inicio", "Inicio"],
    ["servicios", "Servicios"],
    ["contacto", "Contacto"],
  ];
  return (
    <div className="mk-site">
      <header className="mk-site__nav">
        <strong>Empresa Demo Norte</strong>
        <nav aria-label="Navegación del sitio de ejemplo">
          {pages.map(([id, label]) => (
            <button key={id} type="button" aria-current={page === id ? "page" : undefined} onClick={() => onPage(id)}>
              {label}
            </button>
          ))}
        </nav>
      </header>
      {page === "inicio" ? (
        <section className="mk-site__hero">
          <h3 className="mk-site__h">Servicios para una operación coordinada.</h3>
          <button type="button" className="mk-site__cta" onClick={() => onPage("servicios")}>
            Ver servicios
          </button>
        </section>
      ) : null}
      {page === "servicios" ? (
        <section className="mk-site__block">
          <ul className="mk-site__services">
            <li>Coordinación</li>
            <li>Soporte operativo</li>
            <li>Información</li>
          </ul>
        </section>
      ) : null}
      {page === "contacto" ? (
        <section className="mk-site__block" aria-label="Contacto de ejemplo">
          <p className="mk-site__label">Ficha ficticia · Empresa Demo Norte</p>
          {sent ? (
            <p className="mk-note mk-note--ok" role="status">
              <Check size={16} aria-hidden /> Consulta de ejemplo creada
            </p>
          ) : (
            <button type="button" className="mk-site__cta" onClick={onSend}>
              Simular consulta
            </button>
          )}
        </section>
      ) : null}
    </div>
  );
}

/* -------------------------------- Ecommerce ------------------------------- */

export interface EcomState {
  cart: Record<string, number>;
  stage: "catalog" | "cart" | "summary" | "done";
  processing: boolean;
}

export const ECOM_INITIAL: EcomState = { cart: {}, stage: "catalog", processing: false };

function EcommerceSite({ state, setState }: { state: EcomState; setState: (s: EcomState) => void }) {
  const items = WEB_PRODUCTS.filter((p) => (state.cart[p.id] ?? 0) > 0);
  const count = items.reduce((sum, p) => sum + (state.cart[p.id] ?? 0), 0);
  const subtotal = items.reduce((sum, p) => sum + p.priceCLP * (state.cart[p.id] ?? 0), 0);

  useEffect(() => {
    if (!state.processing) return;
    const timer = window.setTimeout(() => setState({ ...state, processing: false, stage: "done" }), 700);
    return () => window.clearTimeout(timer);
  }, [state, setState]);

  function setQty(product: Product, qty: number) {
    const next = { ...state.cart };
    const clamped = Math.max(0, Math.min(9, qty));
    if (clamped === 0) delete next[product.id];
    else next[product.id] = clamped;
    setState({ ...state, cart: next });
  }

  return (
    <div className="mk-site mk-site--shop">
      <header className="mk-site__nav">
        <strong>Tienda Demo Norte</strong>
        <button type="button" className="mk-site__cartbtn" onClick={() => setState({ ...state, stage: "cart" })}>
          <ShoppingCart size={16} aria-hidden /> Carrito ({count})
        </button>
      </header>

      {state.stage === "catalog" ? (
        <section className="mk-site__block" aria-label="Catálogo de ejemplo">
          <ul className="mk-products">
            {WEB_PRODUCTS.map((product) => (
              <li key={product.id} className="mk-product">
                <ProductArt id={product.id} />
                <p className="mk-product__name">{product.name}</p>
                <p className="mk-product__price mk-tabular">{formatCLP(product.priceCLP)}</p>
                <button
                  type="button"
                  className="mk-site__cta"
                  onClick={() => setQty(product, (state.cart[product.id] ?? 0) + 1)}
                >
                  Agregar
                </button>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {state.stage === "cart" ? (
        <section className="mk-site__block" aria-label="Carrito de ejemplo">
          {items.length === 0 ? (
            <div>
              <p>Tu carrito de ejemplo está vacío</p>
              <button type="button" className="mk-site__cta" onClick={() => setState({ ...state, stage: "catalog" })}>
                Ver productos
              </button>
            </div>
          ) : (
            <>
              <ul className="mk-cartlist">
                {items.map((product) => {
                  const qty = state.cart[product.id] ?? 0;
                  return (
                    <li key={product.id} className="mk-cartrow">
                      <span className="mk-cartrow__name">{product.name}</span>
                      <span className="mk-qty" role="group" aria-label={`Cantidad de ${product.name}`}>
                        <button type="button" aria-label="Quitar una unidad" onClick={() => setQty(product, qty - 1)}>
                          <Minus size={14} aria-hidden />
                        </button>
                        <span aria-live="polite">{qty}</span>
                        <button type="button" aria-label="Agregar una unidad" onClick={() => setQty(product, qty + 1)}>
                          <Plus size={14} aria-hidden />
                        </button>
                      </span>
                      <span className="mk-tabular">{formatCLP(product.priceCLP * qty)}</span>
                      <button type="button" className="mk-cartrow__rm" aria-label={`Quitar ${product.name}`} onClick={() => setQty(product, 0)}>
                        <Trash2 size={14} aria-hidden />
                      </button>
                    </li>
                  );
                })}
              </ul>
              <div className="mk-site__row">
                <button type="button" className="mk-site__ghost" onClick={() => setState({ ...state, stage: "catalog" })}>
                  Seguir viendo
                </button>
                <button type="button" className="mk-site__cta" onClick={() => setState({ ...state, stage: "summary" })}>
                  Ver resumen
                </button>
              </div>
            </>
          )}
        </section>
      ) : null}

      {state.stage === "summary" ? (
        <section className="mk-site__block" aria-label="Resumen de ejemplo">
          <p className="mk-site__label">Destinatario fijo: Empresa Demo Norte</p>
          <p>
            Subtotal <strong className="mk-tabular">{formatCLP(subtotal)}</strong>
          </p>
          <p className="mk-small">Importes de ejemplo; no es una compra real.</p>
          <div className="mk-site__row">
            <button type="button" className="mk-site__ghost" onClick={() => setState({ ...state, stage: "cart" })}>
              Volver al carrito
            </button>
            <button
              type="button"
              className="mk-site__cta"
              disabled={state.processing || items.length === 0}
              onClick={() => setState({ ...state, processing: true })}
            >
              {state.processing ? "Procesando…" : "Simular pedido"}
            </button>
          </div>
        </section>
      ) : null}

      {state.stage === "done" ? (
        <section className="mk-site__block" aria-label="Pedido de ejemplo">
          <p className="mk-note mk-note--ok" role="status">
            <Check size={16} aria-hidden /> Pedido de ejemplo creado · <span className="mk-mono">PED-DEMO-W01</span>
          </p>
          <p className="mk-small">No se realizó ningún cobro.</p>
          <button type="button" className="mk-site__ghost" onClick={() => setState(ECOM_INITIAL)}>
            Reiniciar
          </button>
        </section>
      ) : null}
    </div>
  );
}

/* ------------------------------ E18 BrowserFrame -------------------------- */

function CodeStrip({ t }: { t: number }) {
  const lines = ["<header>Tienda Demo Norte</header>", "<main>catálogo · carrito · resumen</main>", "<footer>Simulación · datos ficticios</footer>"];
  return (
    <div className="mk-codestrip" aria-hidden>
      {lines.map((line, i) => (
        <code key={line} className={cn("mk-codestrip__line", t >= i * 500 && "is-in")}>
          {line}
        </code>
      ))}
      <span className="mk-codestrip__bar">
        <i style={{ transform: `scaleX(${Math.min(1, t / 1600)})` }} />
      </span>
    </div>
  );
}

/**
 * E18 BrowserFrame + I2 selector de formato. Sitio real de código (no iframe),
 * switch «Escritorio / Móvil» que cambia el ancho del contenedor y recompone el
 * layout con container queries (nunca scale). Estado independiente por formato.
 */
export function WebDemo({
  initial = "ecommerce",
  formats = WEB_FORMATS,
  onFormatChange,
  compact,
}: {
  initial?: WebFormat;
  formats?: typeof WEB_FORMATS;
  onFormatChange?: (format: WebFormat) => void;
  compact?: boolean;
}) {
  const uid = useId();
  const [format, setFormat] = useState<WebFormat>(initial);
  const [viewport, setViewport] = useState<"desktop" | "mobile">("desktop");
  const [landingSent, setLandingSent] = useState(false);
  const [corpPage, setCorpPage] = useState<CorpPage>("inicio");
  const [corpSent, setCorpSent] = useState(false);
  const [ecom, setEcom] = useState<EcomState>(ECOM_INITIAL);
  const [attach, clock] = useDemoClock<HTMLDivElement>({ id: `web-${uid}`, duration: 2400, autoplay: true });
  const current = WEB_FORMATS.find((f) => f.id === format) ?? WEB_FORMATS[0];
  const panelId = `${uid}-panel`;

  function change(id: string) {
    const next = id as WebFormat;
    setFormat(next);
    onFormatChange?.(next);
  }

  return (
    <div className="mk-web" ref={attach}>
      <CapabilitySelector
        tabs={formats.map((f) => ({ id: f.id, label: f.label }))}
        value={format}
        onChange={change}
        panelId={panelId}
        idPrefix={`${uid}-web`}
        selectLabel="Formato de la web"
        ariaLabel="Formato de página web"
      />
      <CodeStrip t={clock.t} />
      <DemoFrame title={`Ejemplo · ${current.label}`} controls={controlsOf(clock)} product className={cn("mk-frame--browser", compact && "mk-frame--compact")}>
        <div className="mk-browser" id={panelId} role="tabpanel" aria-label={`Vista de ejemplo: ${current.label}`}>
          <div className="mk-browser__bar">
            <span className="mk-browser__dots" aria-hidden>
              <i />
              <i />
              <i />
            </span>
            <span className="mk-browser__addr">{current.address}</span>
            <div className="mk-browser__switch" role="group" aria-label="Vista Escritorio o Móvil">
              <button type="button" aria-pressed={viewport === "desktop"} onClick={() => setViewport("desktop")}>
                <Monitor size={14} aria-hidden /> Escritorio
              </button>
              <button type="button" aria-pressed={viewport === "mobile"} onClick={() => setViewport("mobile")}>
                <Smartphone size={14} aria-hidden /> Móvil
              </button>
            </div>
          </div>
          <div className="mk-browser__stage" data-viewport={viewport}>
            <div className="mk-browser__view">
              {format === "landing" ? (
                <LandingSite sent={landingSent} onSend={() => setLandingSent(true)} />
              ) : format === "corporativa" ? (
                <CorporateSite page={corpPage} onPage={setCorpPage} sent={corpSent} onSend={() => setCorpSent(true)} />
              ) : (
                <EcommerceSite state={ecom} setState={setEcom} />
              )}
            </div>
          </div>
          <div className="mk-browser__foot">
            <Button
              size="sm"
              variant="tertiary"
              onClick={() => {
                setLandingSent(false);
                setCorpPage("inicio");
                setCorpSent(false);
                setEcom(ECOM_INITIAL);
              }}
            >
              Reiniciar
            </Button>
          </div>
        </div>
      </DemoFrame>
    </div>
  );
}
