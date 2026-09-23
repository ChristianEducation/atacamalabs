import type { NextConfig } from "next";

/**
 * Alias permanentes — ATACAMA_LABS_FINAL_MINIMAL_WEB_SPEC_V3_0_1 §4.
 * Comercial/Cobranza/Administrativo-Financiero ya no son páginas propias:
 * viven dentro de /agentes (selector A3, por hash). Rubros queda fuera de la
 * arquitectura comercial principal; sus rutas redirigen a /agentes.
 */
const ALIASES: readonly [string, string][] = [
  ["/comercial", "/agentes#comercial"],
  ["/cobranza", "/agentes#cobranza"],
  ["/administrativo-financiero", "/agentes#administrativo-financiero"],
  ["/agendamiento", "/agentes#agendamiento"],
  ["/rubros", "/agentes"],
  ["/rubros/:slug", "/agentes"],
  ["/industrias", "/agentes"],
  ["/industrias/:slug", "/agentes"],
  ["/contacto", "/diagnostico"],
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
};

export default nextConfig;
