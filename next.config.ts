import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Ancla el root a este repo: evita que Turbopack suba a la carpeta de
  // usuario (que tiene su propio .git ajeno) buscando un package-lock.json.
  turbopack: {
    root: __dirname,
  },
};

export default nextConfig;
