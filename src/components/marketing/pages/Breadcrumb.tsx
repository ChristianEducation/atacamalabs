import Link from "next/link";
import { ChevronRight } from "lucide-react";

/** Breadcrumb visible (SEO_GROWTH_SPEC_V1 §4) — el `BreadcrumbList` JSON-LD se agrega aparte, en la página. */
export function Breadcrumb({ items }: { items: readonly { label: string; href?: string }[] }) {
  return (
    <nav className="mk-breadcrumb" aria-label="Ruta de navegación">
      <ol>
        {items.map((item, index) => (
          <li key={item.label}>
            {item.href ? <Link href={item.href}>{item.label}</Link> : <span aria-current="page">{item.label}</span>}
            {index < items.length - 1 ? <ChevronRight size={13} strokeWidth={2} aria-hidden /> : null}
          </li>
        ))}
      </ol>
    </nav>
  );
}
