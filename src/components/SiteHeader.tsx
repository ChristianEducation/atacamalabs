import Image from "next/image";
import Link from "next/link";
import site from "@/lib/content";

export function SiteHeader() {
  return (
    <header className="border-b border-border/60 bg-background">
      <div className="mx-auto flex max-w-[var(--container-max)] items-center justify-between gap-6 px-5 py-4 sm:px-8">
        <Link href="/" className="shrink-0">
          <Image
            src="/brand/logo-horizontal.svg"
            alt={site.brand.name}
            width={168}
            height={42}
            priority
          />
        </Link>
        <nav className="hidden items-center gap-8 text-sm font-medium text-ink md:flex">
          {site.navigation.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="hover:text-copper transition-colors"
            >
              {item.label}
            </Link>
          ))}
        </nav>
        <Link
          href="/contacto"
          className="hidden rounded-full bg-action px-5 py-2.5 text-sm font-medium text-white hover:bg-action-hover transition-colors sm:inline-block"
        >
          Conversemos
        </Link>
      </div>
    </header>
  );
}
