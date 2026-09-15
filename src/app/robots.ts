import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/site-url";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      // Higiene: el panel privado (004) y previews no son autenticación,
      // pero no deben indexarse.
      disallow: ["/control", "/*?preview=", "/studio"],
    },
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
