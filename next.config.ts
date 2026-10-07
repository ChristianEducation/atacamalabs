import type { NextConfig } from "next";

/**
 * Alias permanentes — ATACAMA_LABS_FINAL_MINIMAL_WEB_SPEC_V3_0_1 §4.
 * Los top-level /comercial, /cobranza, etc. no son páginas propias: viven
 * dentro de /agentes (selector A3, por hash). Distinto de /agentes/[slug] y
 * /rubros/[slug] (SEO_GROWTH_SPEC_V1 §8, §15), que sí son páginas reales.
 */
const ALIASES: readonly [string, string][] = [
  ["/comercial", "/agentes#comercial"],
  ["/cobranza", "/agentes#cobranza"],
  ["/administrativo-financiero", "/agentes#administrativo-financiero"],
  ["/agendamiento", "/agentes#agendamiento"],
  // Rubros: desde SEO_GROWTH_SPEC_V1 §8, /rubros/[slug] es una página real e
  // indexable por rubro (ya no un alias a la ancla del hub) — un slug antiguo
  // que ya no existe (ej. "servicios-b2b") pasa a su reemplazo real.
  ["/rubros/servicios-b2b", "/rubros/b2b-industria"],
  ["/rubros/fitness-bienestar", "/rubros/gimnasios"],
  ["/industrias", "/rubros"],
  ["/industrias/:slug", "/rubros"],
  ["/contacto", "/diagnostico"],
  ["/privacy", "/privacidad"],
  ["/agenda", "/diagnostico#agenda"],
  ["/nosotros", "/conocenos"],
  ["/sobre-el-estudio", "/conocenos"],
  ["/como-trabajamos", "/conocenos"],
  ["/casos", "/a-medida"],
  ["/proyectos", "/a-medida"],
  ["/proyectos/:slug", "/a-medida"],
  ["/soluciones", "/a-medida"],
  ["/soluciones/:slug", "/a-medida"],
];

const nextConfig: NextConfig = {
  // Ancla el root a este repo: evita que Turbopack suba a la carpeta de
  // usuario (que tiene su propio .git ajeno) buscando un package-lock.json.
  turbopack: {
    root: __dirname,
  },
  async redirects() {
    return ALIASES.map(([source, destination]) => ({ source, destination, permanent: true }));
  },
  // Security headers mínimos — PRODUCTION_READINESS_SPEC_V1 §43. Sin CSP
  // todavía: hoy conviven el script de Lety, el iframe de GHL y recursos de
  // Next/Vercel; una CSP estricta queda como hardening posterior (§64).
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
        ],
      },
      // Panel privado /ops: nunca indexable, nunca cacheado, sin referrer.
      {
        source: "/ops/:path*",
        headers: [
          { key: "X-Robots-Tag", value: "noindex, nofollow, noarchive, nosnippet" },
          { key: "Cache-Control", value: "private, no-store" },
          { key: "Referrer-Policy", value: "no-referrer" },
        ],
      },
    ];
  },
};

export default nextConfig;
