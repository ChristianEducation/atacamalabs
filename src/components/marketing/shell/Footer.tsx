import Image from "next/image";
import Link from "next/link";
import { BRAND, SERVICES } from "@/content/marketing/nav";
import { DiagnosticLink } from "./DiagnosticLink";
import { PRIVACY_APPROVED, clientPortalUrl, directContact, socialLinks } from "@/lib/marketing/public-config";

/**
 * Footer global — spec V3.0: tres columnas (marca, servicios, empresa). Sin
 * Rubros (fuera de la navegación). Todo legible sin JS; solo enlaces reales.
 */
export function Footer() {
  const portal = clientPortalUrl();
  const socials = socialLinks();
  const contact = directContact();
  const year = new Date().getFullYear();

  return (
    <footer className="mk-footer mk-dark">
      <div className="mk-container">
        <div className="mk-footer__grid mk-footer__grid--compact">
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
            <p className="mk-footer__tag">{BRAND.tagline}</p>
            <p className="mk-footer__origin">{BRAND.origin}</p>
            {contact.email ? (
              <a className="mk-footer__link" href={`mailto:${contact.email}`}>
                {contact.email}
              </a>
            ) : null}
          </div>

          <nav className="mk-footer__col mk-footer__services" aria-label="Servicios">
            <h2 className="mk-footer__h">Servicios</h2>
            <ul>
              {SERVICES.map((s) => (
                <li key={s.id}>
                  <Link className="mk-footer__link" href={s.href}>
                    {s.label}
                  </Link>
                </li>
              ))}
              <li>
                <Link className="mk-footer__link" href="/precios">
                  Precios
                </Link>
              </li>
            </ul>
          </nav>

          <nav className="mk-footer__col mk-footer__company" aria-label="Empresa">
            <h2 className="mk-footer__h">Empresa</h2>
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
              {portal ? (
                <li>
                  <a className="mk-footer__link" href={portal}>
                    Acceso clientes
                  </a>
                </li>
              ) : null}
              {PRIVACY_APPROVED ? (
                <li>
                  <Link className="mk-footer__link" href="/privacidad">
                    Privacidad
                  </Link>
                </li>
              ) : null}
              {socials.map((s) => (
                <li key={s.label}>
                  <a className="mk-footer__link" href={s.url} rel="noopener noreferrer">
                    {s.label}
                  </a>
                </li>
              ))}
            </ul>
          </nav>
        </div>
        <div className="mk-footer__bottom">
          <p>© {year} Atacama Labs</p>
        </div>
      </div>
    </footer>
  );
}
