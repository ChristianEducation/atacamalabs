import { notFound } from "next/navigation";

/**
 * /recursos — NO existe como índice público (decisión de Christian, 13-oct-2026).
 * Los recursos son páginas «solo con la URL»: ningún enlace del sitio lleva a ellas, no están en el
 * sitemap y no se indexan; las entrega el agente por mensaje directo (ver /recursos/[slug]).
 */
export default function RecursosPage() {
  notFound();
}
