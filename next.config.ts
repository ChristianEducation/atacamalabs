import type { NextConfig } from "next";

/**
 * Alias permanentes — ATACAMA_LABS_FINAL_MINIMAL_WEB_SPEC_V3_0_1 §4.
 * Comercial/Cobranza/Administrativo-Financiero ya no son páginas propias:
 * viven dentro de /agentes (selector A3, por hash). Rubros es una sola
 * página (/rubros); sus rutas antiguas redirigen a su ancla.
 */
const ALIASES: readonly [string, string][] = [
  ["/comercial", "/agentes#comercial"],
  ["/cobranza", "/agentes#cobranza"],
  ["/administrativo-financiero", "/agentes#administrativo-financiero"],
  ["/agendamiento", "/agentes#agendamiento"],
  // Rubros (RUBROS_Y_FOOTER_SPEC_V1 §22): una sola página; las rutas antiguas apuntan a su ancla.
  ["/rubros/salud", "/rubros#salud"],
  ["/rubros/inmobiliarias", "/rubros#inmobiliarias"],
  ["/rubros/educacion", "/rubros#educacion"],
  ["/rubros/retail-ecommerce", "/rubros#retail-ecommerce"],
  ["/rubros/gimnasios", "/rubros#fitness-bienestar"],
  ["/rubros/servicios-profesionales", "/rubros#servicios-profesionales"],
  ["/rubros/servicios-b2b", "/rubros#b2b-industria"],
  ["/rubros/:slug", "/rubros"],
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
};

export default nextConfig;
