#!/usr/bin/env node
/**
 * Firma corporativa de Atacama Labs (kit de Christian, 3-nov-2026) → imágenes optimizadas para correo + HTML de la firma para pegar en Gmail.
 * Fuentes (versionadas): brand/outreach/firma/Logo_Atacama_Firma.png y Foto_Circular_Christian_Atacama.png (la foto ya viene recortada en círculo con esquinas transparentes:
 * Outlook ignora border-radius, por eso no se depende del CSS).
 * Salidas:
 *   public/brand/email/firma-logo.png            (640 px de ancho = 3× de los 205 px que se muestran)
 *   public/brand/email/firma-foto-christian.png  (240 px = 3× de los 80 px que se muestran)
 *   brand/outreach/firma/Firma_Gmail_Christian.html  (misma firma que usan los correos automáticos, con imágenes por URL https pública)
 * Las imágenes públicas quedan en https://atacamalabs.cl/brand/email/… cuando se publica el sitio (Vercel sirve public/). Los correos automáticos NO dependen de esas URL:
 * llevan las imágenes incrustadas (cid), así que no pueden aparecer bloqueadas.
 * Uso: node scripts/outreach/build-email-signature.mjs
 */
import fs from 'node:fs';
import sharp from 'sharp';
import { renderSignatureHtml } from './outreach-core.mjs';

const root = new URL('../../', import.meta.url);
const p = (rel) => new URL(rel, root);
const fsPath = (u) => decodeURIComponent(u.pathname).replace(/^\/([A-Za-z]:)/, '$1');
export const PUBLIC_BASE = 'https://atacamalabs.cl/brand/email/';

fs.mkdirSync(p('public/brand/email/'), { recursive: true });
const logo = await sharp(fsPath(p('brand/outreach/firma/Logo_Atacama_Firma.png'))).resize({ width: 640 }).png({ compressionLevel: 9 }).toFile(fsPath(p('public/brand/email/firma-logo.png')));
const foto = await sharp(fsPath(p('brand/outreach/firma/Foto_Circular_Christian_Atacama.png'))).resize({ width: 240, height: 240 }).png({ palette: true, quality: 85, colours: 256, dither: 1, compressionLevel: 9 }).toFile(fsPath(p('public/brand/email/firma-foto-christian.png')));
console.log('logo ', logo.width + '×' + logo.height, logo.size + ' bytes');
console.log('foto ', foto.width + '×' + foto.height, foto.size + ' bytes');

const sig = renderSignatureHtml({ logo: PUBLIC_BASE + 'firma-logo.png', foto: PUBLIC_BASE + 'firma-foto-christian.png', name: 'Christian Wevar', title: 'Fundador', email: 'contacto@atacamalabs.cl' });
const page = '<!doctype html><html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Firma Gmail · Christian Wevar · Atacama Labs</title>'
  + '<style>body{margin:0;background:#f6f8fc;color:#041228;font-family:Arial,Helvetica,sans-serif}main{max-width:760px;margin:40px auto;padding:20px}section{background:#fff;padding:30px;border-radius:12px;border:1px solid #e7edf5}h1{font-size:20px;margin:0 0 8px}p,li{font-size:13px;line-height:1.6;color:#566474}</style></head><body><main>'
  + '<h1>Firma de Gmail · Christian Wevar</h1><p>Es la misma firma que llevan los correos automáticos de Atacama OS (misma función, mismos colores y logo). Aquí las imágenes están en URL públicas https para que Gmail las conserve al pegar.</p>'
  + '<section><!-- INICIO DE FIRMA PARA COPIAR -->' + sig + '<!-- FIN DE FIRMA PARA COPIAR --></section>'
  + '<ol><li>Publica el sitio para que existan <code>' + PUBLIC_BASE + 'firma-logo.png</code> y <code>' + PUBLIC_BASE + 'firma-foto-christian.png</code> (si no abren en el navegador, Gmail no las verá).</li>'
  + '<li>Gmail en computador → Configuración → Ver todos los ajustes → General → Firma → Crear nueva.</li>'
  + '<li>Selecciona y copia SOLO la firma del recuadro blanco y pégala. Si Gmail omite alguna imagen, usa «Insertar imagen» con los PNG de esta carpeta.</li>'
  + '<li>Envía un correo de prueba a otra cuenta (Gmail y Outlook) antes de usarla.</li></ol></main></body></html>';
fs.writeFileSync(fsPath(p('brand/outreach/firma/Firma_Gmail_Christian.html')), page);
console.log('HTML Gmail escrito: brand/outreach/firma/Firma_Gmail_Christian.html');
