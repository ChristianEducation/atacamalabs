import Image from "next/image";
import Link from "next/link";
import { FOOTER_BRAND } from "@/content/marketing/nav";
import { clientPortalUrl, directContact, socialLinks } from "@/lib/marketing/public-config";
import { DiagnosticLink } from "./DiagnosticLink";

const SOLUTIONS = [
  { label: "Agentes", href: "/agentes" },
  { label: "Plataforma", href: "/plataforma" },
  { label: "A medida", href: "/a-medida" },
  { label: "Páginas web", href: "/paginas-web" },
  { label: "Rubros", href: "/rubros" },
  { label: "Precios", href: "/precios" },
] as const;

/**
 * Footer global (RUBROS_Y_FOOTER_SPEC_V1 §24–§29): cierre de marca, navegación
 * secundaria, contacto, redes, acceso cliente y legal. SIN CTA comercial: cada
 * página ya cierra con el suyo. Todo legible sin JS y solo con enlaces reales:
 * el correo, las redes y el portal aparecen únicamente si están configurados
 * (y la columna «Conecta» se omite si queda vacía).
 */
export function Footer() {
  const portal = clientPortalUrl();
  // Solo Instagram y LinkedIn en el footer comercial (GitHub queda fuera de V1).
  const socials = socialLinks().filter((s) => s.label === "Instagram" || s.label === "LinkedIn");
  const contact = directContact();
  const year = new Date().getFullYear();
  const hasConnect = socials.length > 0 || Boolean(portal);

  return (
    <footer className="mk-footer mk-dark">
      <div className="mk-container">
        <div className={hasConnect ? "mk-footer__grid mk-footer__grid--connect" : "mk-footer__grid"}>
          <div className="mk-footer__brand">
            <p className="mk-wordmark">
              <Image
                src="/brand/logo-horizontal-fondo-oscuro.svg"
                alt="Atacama Labs"
                width={1768}
                height={169}
                unoptimized
              />
            </p>
            <p className="mk-footer__tag">{FOOTER_BRAND.tagline}</p>
            <p className="mk-footer__sub">{FOOTER_BRAND.sub}</p>
            {contact.email ? (
              <a className="mk-footer__link mk-footer__mail" href={`mailto:${contact.email}`}>
                {contact.email}
              </a>
            ) : null}
          </div>

          <nav className="mk-footer__col" aria-label="Soluciones">
            <h2 className="mk-footer__h">Soluciones</h2>
            <ul>
              {SOLUTIONS.map((item) => (
                <li key={item.href}>
                  <Link className="mk-footer__link" href={item.href}>
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>

          <nav className="mk-footer__col" aria-label="Atacama Labs">
            <h2 className="mk-footer__h">Atacama Labs</h2>
            <ul>
              <li>
                <Link className="mk-footer__link" href="/conocenos">
                  Conócenos
                </Link>
              </li>
              <li>
                <DiagnosticLink className="mk-footer__link" section="footer" cta="diagnostico">
                  Diagnóstico
                </DiagnosticLink>
              </li>
            </ul>
          </nav>

          {hasConnect ? (
            <nav className="mk-footer__col" aria-label="Conecta">
              <h2 className="mk-footer__h">Conecta</h2>
              <ul>
                {socials.map((s) => (
                  <li key={s.label}>
                    <a className="mk-footer__link" href={s.url} rel="noopener noreferrer" target="_blank">
                      {s.label} ↗
                    </a>
                  </li>
                ))}
                {portal ? (
                  <li>
                    <a className="mk-footer__link" href={portal}>
                      Acceso clientes ↗
                    </a>
                  </li>
                ) : null}
              </ul>
            </nav>
          ) : null}
        </div>

        <div className="mk-footer__bottom">
          <p>© {year} Atacama Labs</p>
          <nav className="mk-footer__legal" aria-label="Legal">
            <Link className="mk-footer__link" href="/privacidad">
              Privacidad
            </Link>
            <Link className="mk-footer__link" href="/terminos">
              Términos
            </Link>
          </nav>
        </div>
      </div>
    </footer>
  );
}
