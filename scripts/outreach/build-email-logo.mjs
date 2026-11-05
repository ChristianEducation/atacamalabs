#!/usr/bin/env node
/**
 * Rasteriza el asset OFICIAL public/brand/logo-horizontal.svg a PNG para la firma del correo.
 * Motivo: Gmail y la mayoría de clientes de correo NO muestran SVG. No se redibuja nada: es el mismo vector, convertido con sharp.
 * Uso: node scripts/outreach/build-email-logo.mjs   →  public/brand/email/logo-horizontal-email.png  (440 px de ancho = 2× de los 220 px que se muestran)
 */
import fs from 'node:fs';
import sharp from 'sharp';

const SRC = new URL('../../public/brand/logo-horizontal.svg', import.meta.url);
const OUT_DIR = new URL('../../public/brand/email/', import.meta.url);
const OUT = new URL('logo-horizontal-email.png', OUT_DIR);
export const DISPLAY_WIDTH = 220;

fs.mkdirSync(OUT_DIR, { recursive: true });
const svg = fs.readFileSync(SRC);
const info = await sharp(svg, { density: 300 }).resize({ width: DISPLAY_WIDTH * 2 }).png({ compressionLevel: 9, palette: false }).toFile(OUT.pathname.replace(/^\/([A-Za-z]:)/, '$1'));
console.log('PNG escrito:', OUT.pathname, info.width + '×' + info.height, info.size + ' bytes (fondo transparente)');
