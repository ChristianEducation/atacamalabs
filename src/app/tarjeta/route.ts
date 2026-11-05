import html from "./tarjeta-html";

/** Tarjeta digital de Christian Wevar (destino del QR de presentación). HTML autocontenido servido en /tarjeta, sin pasar por el layout del sitio. */
export const dynamic = "force-static";

export function GET() {
  return new Response(html, {
    headers: {
      "content-type": "text/html; charset=utf-8",
      "x-robots-tag": "noindex, nofollow",
      "cache-control": "public, max-age=0, must-revalidate",
    },
  });
}
