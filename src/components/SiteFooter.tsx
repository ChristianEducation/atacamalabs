import Image from "next/image";
import Link from "next/link";
import site from "@/lib/content";

export function SiteFooter() {
  return (
    <footer className="mt-auto border-t border-border/60 bg-surface-warm">
      <div className="mx-auto flex max-w-[var(--container-max)] flex-col gap-6 px-5 py-10 sm:px-8 md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-3">
          <Image
            src="/brand/logo-mark.svg"
            alt=""
            width={28}
            height={19}
            aria-hidden
          />
          <div>
            <p className="text-sm font-semibold text-ink">{site.brand.name}</p>
            <p className="text-sm text-muted">{site.brand.origin}</p>
          </div>
        </div>
        <nav className="flex flex-wrap gap-x-6 gap-y-2 text-sm text-muted">
          {site.navigation.map((item) => (
            <Link key={item.href} href={item.href} className="hover:text-ink">
              {item.label}
            </Link>
          ))}
          <Link href="/contacto" className="hover:text-ink">
            Contacto
          </Link>
        </nav>
      </div>
    </footer>
  );
}
