import type { NextConfig } from "next";

/** Alias permanentes (spec B3). Contabilidad queda fuera: /industrias/contabilidad → 404 vía /rubros. */
const ALIASES: readonly [string, string][] = [
  ["/agendamiento", "/comercial#agendamiento"],
  ["/contacto", "/diagnostico"],
  ["/agenda", "/diagnostico#agenda"],
  ["/sobre-el-estudio", "/nosotros"],
  ["/como-trabajamos", "/nosotros#como-trabajamos"],
  ["/casos", "/a-medida#software"],
  ["/proyectos", "/a-medida#software"],
  ["/proyectos/:slug", "/a-medida#software"],
  ["/soluciones", "/a-medida"],
  ["/soluciones/:slug", "/a-medida"],
  ["/industrias", "/rubros"],
  ["/industrias/:slug", "/rubros/:slug"],
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
};

export default nextConfig;
