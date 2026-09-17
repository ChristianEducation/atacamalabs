import Image from "next/image";
import Link from "next/link";
import site from "@/lib/content";
import { Container } from "@/components/ui";

export function SiteFooter() {
  const socials = [
    { label: "LinkedIn", url: site.publicSettings.linkedinCompanyUrl },
    { label: "Instagram", url: site.publicSettings.instagramUrl },
    { label: "GitHub", url: site.publicSettings.githubUrl },
  ].filter((x) => x.url);
  return (
    <footer className="site-footer">
      <Container className="footer-top">
        <div>
          <Image
            src="/brand/logo-horizontal-light.svg"
            alt="Atacama Labs"
            width={196}
            height={39}
          />
          <p className="mt-4 text-sm">
            Desde Antofagasta, Chile.
            <br />
            Tecnología que parte del proceso real.
          </p>
        </div>
        <nav aria-label="Pie de página">
          {site.navigation.map((item) => (
            <Link key={item.href} href={item.href}>
              {item.label}
            </Link>
          ))}
          <Link href="/como-trabajamos">Cómo trabajamos</Link>
          <Link href="/agentes#planes">Planes</Link>
          <Link href="/contacto">Contacto</Link>
        </nav>
        {socials.length > 0 && (
          <div>
            {socials.map((item) => (
              <a key={item.label} href={item.url!}>
                {item.label}
              </a>
            ))}
          </div>
        )}
      </Container>
      <Container>
        <div className="footer-bottom">
          © {new Date().getFullYear()} Atacama Labs.
          <span>{site.brand.origin}</span>
        </div>
      </Container>
    </footer>
  );
}
