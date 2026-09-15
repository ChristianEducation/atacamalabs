import site from "@/content/site.json";

export type Solution = (typeof site.solutions)[number];
export type Case = (typeof site.cases)[number];

/**
 * Campos internos que content/site.json trae para uso editorial pero que
 * WEB-CONTENT.md prohíbe exponer al navegador (internalName, permisos,
 * config interna, URLs pendientes). No desestructurar site.cases directo
 * en una página — pasar siempre por publicCase().
 */
export function publicCase(c: Case) {
  const {
    internalName: _internalName,
    identityAuthorized: _identityAuthorized,
    publicationMode: _publicationMode,
    ...rest
  } = c;
  void _internalName;
  void _identityAuthorized;
  void _publicationMode;
  return rest;
}

export function getSolution(slug: string): Solution | undefined {
  return site.solutions.find((s) => s.slug === slug);
}

export function getCase(slug: string): Case | undefined {
  return site.cases.find((c) => c.slug === slug);
}

export default site;
