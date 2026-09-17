# 006 · revisión comercial 2026-09-17

Estado: **IMPLEMENTED_PARTIAL / ASSET_BLOCKED**. UI implementada y comprobada; no COMMERCIAL_READY ni aprobación visual final.

App: C:/Users/alain/ATACAMA-LABS-SPEC-DRIVEN-v1.0/atacama-labs-app.
Paquete: C:/Users/alain/ATACAMA-LABS-SPEC-DRIVEN-v1.0/atacama-labs-spec.
Rama: codex/006-visual-home-v2. Base: b1bc200, sin cambios locales al iniciar.
Ejecución: 2026-09-17 UTC (2026-09-16 America/Santiago); revisión normativa 2026-09-17.

Se comparó el árbol vigente: no había 006, /agentes, widget público, portal Atacama ni screenshots autorizados. Se incorporó únicamente la carpeta 006 desde ATACAMA-LABS-006-VISUAL-HOME-V2. 001–005, backend, n8n, Supabase, leads-contract y analytics permanecen sin modificaciones. No se ejecutaron servicios operativos ni se publicó.

| Bloque/tarea | Estado y evidencia |
| --- | --- |
| Base 1.1–1.2 | Implementada: baseline 1440/390, inventario, tokens, Newsreader/Inter locales con OFL; Manrope conservada en studio |
| Base 1.3 | Implementada; logo refinado frente a A14, máster con paths deterministas, claro/oscuro y favicon; aprobación de reproducción pendiente. Nav colapsa antes de 1100 para evitar solapamiento |
| Home 2.1–2.3/2.5 | Implementada: paisaje continuo, 4 portales, credibilidad, proceso corporativo, CTA/footer oscuro; comparada con ref.1 y ref.2 |
| Home 2.4 | PARTIAL: esquema público rotulado; A10 auténtica y permiso ausentes (V006-U07) |
| Agentes 2.6–2.7/2.9 | Implementada: orden/anclas completos, 9 capacidades, 4 procesos, conectores transversales, 5 pasos, planes desde módulo de contenido, expansión inmediatamente después |
| Agentes 2.8 | PARTIAL: fallback y wrapper iframe allowlist preparados; INTEGRATION_REQUIRED. No conversación fingida. SDK/script necesita contrato oficial si ese es el mecanismo elegido; A17 ausente |
| Agentes 2.10 | UI implementada: plan allowlist → mensaje existente; /precios → pricing canónico; portal omitido. V006-U02 pendiente |
| Consistencia 3.1–3.4 | Implementada/probada; fuentes e identidad públicas aisladas de studio; variantes responsive y comparación documentadas |
| Cierre 3.5 | Preview y evidencia entregados; gate final bloqueado por A10/A17, demo/portal, condiciones/claim y aprobación visual |

## Abrir y reproducir

Preview de producción local: http://127.0.0.1:3000/ y /agentes.
En PowerShell:

~~~powershell
Set-Location 'C:\Users\alain\ATACAMA-LABS-SPEC-DRIVEN-v1.0\atacama-labs-app'
npm run build
npm run start
~~~

Si el puerto 3000 ya tiene el preview de esta sesión, basta abrir la URL. npm run dev permite edición; no es el entorno usado para Lighthouse.

Checks: npm run lint (exit 0, sin warnings); npm run build (exit 0, 47 páginas generadas); validador de 006: 136/136 PASS. node scripts/qa-006.mjs verifica 17 rutas × 6 anchos = 102 combinaciones. node scripts/qa-data-006.mjs y node scripts/qa-form-006.mjs verifican datos comerciales y formulario interceptado. Playwright de runtime; configurar CODEX_NODE_MODULES si se reproduce en otro equipo. No se instala un stack nuevo ni se cambian dependencias de la aplicación.

Capturas en evidence/visual-006: antes 1440/390; Home y Agentes 1920/1440/1366/768/390/320; todas las rutas 1366/390; menú abierto; logo referencia/resultado; contacto 409/429/503/422/201 con mocks; pricing largo/nulo/promoción 320; studio y contact-sheet. qa-results.json contiene navegador y resultados por ruta. Reportes Lighthouse HTML y JSON conservan las 3 corridas móviles por ruta (throttling simulado, localhost, build de producción).

| Mediana Lighthouse | Performance | Accessibility | LCP | CLS |
| --- | --- | --- | --- | --- |
| Home | 91 | 100 | 3,39 s | 0 |
| Agentes | 96 | 100 | 2,69 s | 0 |
| Integraciones | 97 | 100 | 2,62 s | 0 |

Scores cumplen 85/95; **LCP ≤2,5 s no alcanzado** en estas condiciones. No son datos de campo ni certificación de accesibilidad. Widget real abierto no medido porque falta configuración. La última extracción de helpers/configuración no cambia el marcado visual y reduce el bundle; los scores corresponden al build de la medición, antes de esa extracción final.

## Comparación visual Q3/Q6

PASS de implementación: marfil/arena/cobre, serif real, paisaje derecho/aire izquierdo, hero nuevo de Agentes, prioridad portal01, 2×2 desde 1024 y 1 columna debajo, cuatro motivos, narrativa breve, caso antes de proceso, 4 etapas, cierre paisajístico/footer oscuro, continuidad interna y responsive. Home 1440 aproximadamente 3178px, móvil390: 5423px (23px sobre la alerta orientativa, por labels demostrativos visibles y crecimiento natural); no se ocultó contenido para alcanzar alturas.

Correcciones surgidas del render: fuente inicialmente no aplicada (carga local real comprobada), halo de conversación que desbordaba en detalle, labels demostrativos que quedaban fuera del crop y contraste de eyebrows en arena (action-hover). Header usa cerros escalonados de 9 trazos finos en lugar de 5 curvas gruesas; figura pequeña simplificada a 3 contornos. Comparación A14 en logo-result.png; reproducción final requiere revisión del usuario.

BLOCKED: captura real de caso A10 y plataforma A17. A07/A08/A09/A15 son HTML/SVG demostrativos, no screenshots. No se copiaron dashboards, robots, porcentajes ni referencias completas a public/. Platform fallback editorial no inventa una interfaz.

PASS funcional: destinos 200, /casos 308→/proyectos, canonical único y sitemap sin alias; navegación activa, Escape/retorno de foco, Tab/Shift+Tab, salida explícita y resize a desktop sin foco oculto; contenido sin JS, reduced-motion, reflow equivalente a 200% (640px), todos los slugs. Formulario conserva campos, honeypot, requestId, validación y API; respuestas 409/429/503/422/201 interceptadas, datos retenidos y query solucion preservada. Planes desconocidos ignorados. Intención de plan viaja en message, sin campos nuevos de API. El shell y formulario reciben proyecciones públicas: no nombres internos de casos en chunks cliente.

Límites: reflow probado, pero no se certifica zoom nativo en todos los navegadores; no se verificó agenda externa configurada ni widget real/captura/derivación. Sus estados requieren fixtures o entornos auténticos autorizados. No se enviaron leads reales. CTA/badge blanco/action 5,15:1, texto ink/marfil 11,25:1; sobre arena eyebrow action-hover, Lighthouse final sin fallos de contraste. Fotos decorativas con alt vacío y un único crop hero por viewport; medios secundarios diferidos cuando hay imágenes reales.

## Estados comerciales independientes

UI: IMPLEMENTED / QA_PASS de implementación. DEMO_INTEGRATION: INTEGRATION_REQUIRED. PLATFORM_ASSET: ASSET_REQUIRED. CLIENT_PORTAL: USER_ACTION_REQUIRED. COMMERCIAL_TERMS: reference, impuestos/soporte/adicional/consumo abiertos. CLAIM_CATALOG: user_provided 2026-09-17, sin auditoría. FINAL_VISUAL_APPROVAL: PENDING.

Pendientes concretos: USER-ACTIONS.md (V006-U01–U07). El 003 sigue pausado según su historial; 004/005 no se iniciaron. Siguiente acción independiente: revisar resultado visual y completar los insumos auténticos para cerrar integración/capturas y publicación comercial. Deploy requiere autorización explícita.

Commit frontend: 01ae62c. Baseline anterior usó fallback tipográfico por red bloqueada; capturas finales cargan Newsreader/Inter locales. Último ajuste: marfil sólido en CTA secundario y apoyo claro en nota sobre fotografía para contraste en crops reales; Contacto identifica aria-current.

Validación final tras las correcciones: build exit0, lint exit0 sin warnings, 102 combinaciones y fixtures PASS; chunks sin internalName, identidad interna, promoSetupPrice ni catalogVerifiedAt. Config .env.local revisada solo por nombres: no claves públicas de widget/demo/portal/booking. Último cotejo A14 ajustó la posición de ambos cerros/pico y wordmark Arial Bold en ATACAMA/Regular en LABS. Snapshot visual final: navegador Chromium151.0.7922.34. Fuente de specs manifestada (22archivos), únicamente tasks/USER-ACTIONS evolucionaron durante ejecución.
