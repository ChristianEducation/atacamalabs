import Link from "next/link";
import { BRAND, INDUSTRIES, SERVICES } from "@/content/marketing/nav";
import { PRIVACY_APPROVED, clientPortalUrl, directContact, socialLinks } from "@/lib/marketing/public-config";

/**
 * N2 Footer global — fondo dark, 12 columnas: marca 4, Servicios 2, Rubros 4
 * (dos subcolumnas), Empresa 2. Todo legible sin JS. Solo enlaces reales:
 * sin `#` vacíos, sin redes personales, sin dirección ni razón social inventadas.
 */
export function Footer() {
  const portal = clientPortalUrl();
  const socials = socialLinks();
  const contact = directContact();
  const year = new Date().getFullYear();
  const half = Math.ceil(INDUSTRIES.length / 2);

  return (
    <footer className="mk-footer mk-dark">
      <div className="mk-container">
        <div className="mk-footer__grid">
          <div className="mk-footer__brand">
            <p className="mk-wordmark mk-wordmark--dark">{BRAND.wordmark}</p>
            <p className="mk-footer__tag">{BRAND.tagline}</p>
            <p className="mk-footer__origin">{BRAND.origin}</p>
            {contact.email ? (
              <a className="mk-footer__link" href={`mailto:${contact.email}`}>
                {contact.email}
              </a>
            ) : (
              <Link className="mk-footer__link" href="/diagnostico">
                Hablemos
              </Link>
            )}
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
                <Link className="mk-footer__link" href="/agentes#voz">
                  Voz · Próximamente
                </Link>
              </li>
              <li>
                <Link className="mk-footer__link" href="/precios">
                  Precios
                </Link>
              </li>
            </ul>
          </nav>

          <nav className="mk-footer__col mk-footer__industries" aria-label="Rubros">
            <h2 className="mk-footer__h">Rubros</h2>
            <div className="mk-footer__sub">
              <ul>
                {INDUSTRIES.slice(0, half).map((i) => (
                  <li key={i.id}>
                    <Link className="mk-footer__link" href={i.href}>
                      {i.label}
                    </Link>
                  </li>
                ))}
              </ul>
              <ul>
                {INDUSTRIES.slice(half).map((i) => (
                  <li key={i.id}>
                    <Link className="mk-footer__link" href={i.href}>
                      {i.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          </nav>

          <nav className="mk-footer__col mk-footer__company" aria-label="Empresa">
            <h2 className="mk-footer__h">Empresa</h2>
            <ul>
              <li>
                <Link className="mk-footer__link" href="/plataforma">
                  Plataforma
                </Link>
              </li>
              <li>
                <Link className="mk-footer__link" href="/nosotros">
                  Conócenos
                </Link>
              </li>
              <li>
                <Link className="mk-footer__link" href="/diagnostico">
                  Diagnóstico
                </Link>
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
