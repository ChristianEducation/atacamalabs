# CTA y analítica — cambios de la optimización comercial (nov-2026)

Notas para quien arme campañas y reportes (Tom). Cubre qué identificadores de
CTA cambiaron en la home y en `/precios`, de qué dependen, y qué conviene
revisar. No se instaló ni modificó ningún evento, tag o conexión externa.

## 1. Qué cambió

Contrato de los enlaces (sin cambios): `/diagnostico?servicio=…&source=…&section=…&cta=…&plan=…`.
Los ids van en kebab-case. `source` = página de origen, `section` = bloque,
`cta` = botón.

| Ubicación | Antes | Ahora | Evento al hacer clic |
|---|---|---|---|
| Home · hero, botón principal | «Conoce nuestros agentes» → `/agentes` (sin id) | «Agenda un diagnóstico» → `source=home&section=hero&cta=agendar-diagnostico&servicio=agentes` | No emite `cta_clicked` (enlace directo). El origen se mide al llegar: `diagnostic_started`. |
| Home · hero, «Ver cómo funciona» | Ancla `#que-hara-tu-agente` | Igual (ahora también en móvil) | Ninguno. |
| Home · hero, «Prueba a Nayra» | `home / hero / prueba-a-nayra` | Sin cambios | `cta_clicked` (`destination=nayra`) + `nayra_opened`. |
| Home · planes, «Quiero este plan» | Abría Nayra: `home / pricing / quiero-<plan>` | Enlace a `/diagnostico` con `plan=<plan>`: mismos ids `home / pricing / quiero-<plan>` | **Dejó de emitir `cta_clicked` y `nayra_opened`.** Llega `diagnostic_started` con `plan`. |
| Home · cierre, botón principal | «Hablar con Nayra»: `home / final-cta / hablar-con-nayra` | «Agenda un diagnóstico»: `home / final-cta / agendar-diagnostico` | No emite `cta_clicked`; llega `diagnostic_started`. |
| Home · cierre, enlace secundario | — | «Prueba a Nayra»: `home / final-cta / prueba-a-nayra` | `cta_clicked` + `nayra_opened`. |
| Header (todas las páginas) | «Agendar diagnóstico» | «Agenda un diagnóstico». **Mismo id** `agendar-diagnostico`, `section=header`, `source` = página actual | Ninguno (ya era enlace directo). |
| `/precios` · planes de agentes, «Quiero este plan» | Abría Nayra: `precios / agentes / quiero-<plan>` | Enlace a `/diagnostico` con `plan=<plan>`: mismos ids | **Dejó de emitir `cta_clicked` y `nayra_opened`.** Llega `diagnostic_started` con `plan`. |

Ids que **desaparecen**: `home / final-cta / hablar-con-nayra`.
Ids que **nacen**: `home / hero / agendar-diagnostico`, `home / final-cta / agendar-diagnostico`,
`home / final-cta / prueba-a-nayra`.
`hablar-con-nayra` sigue vigente en `/agentes`, `/agentes/[slug]` y `/rubros/[slug]`.
Sin tocar (siguen igual): `/rubros` («Quiero algo así»), «Quiero sumar un agente» de `/precios`,
«Agendar diagnóstico» de Conócenos y de la página 404.

## 2. Dependencias revisadas

- **Código:** ninguna lógica ramifica según el valor de un `cta`, `section` o `source`. Solo se
  validan (kebab-case, ≤ 48 caracteres) y se reenvían.
- **Supabase** (`lead_submissions.source_page / source_section / source_cta / plan / campaign`):
  texto libre con tope de 64 caracteres, sin lista cerrada. Ids nuevos y viejos conviven.
- **n8n (workflow 01, lead sync):** solo concatena `source_page > source_section > source_cta`
  en la nota de GHL («Origen: …»). No hay reglas por valor. Los leads nuevos mostrarán los ids nuevos.
- **Analítica:** `src/lib/analytics.ts` reenvía a GA4 vía `dataLayer` los eventos `cta_clicked`,
  `nayra_opened`, `diagnostic_started`, `diagnostic_service_selected`, `diagnostic_step_completed`,
  `diagnostic_submitted` y `calendar_viewed`, con las propiedades `source_page`, `source_section`,
  `source_cta`, `service`, `interest`, `plan`, `campaign`.
- **GTM:** el contenedor (tags, triggers, variables) vive fuera del repo; **no se pudo verificar**.
  Hay que revisar si algún trigger o audiencia filtra por `source_cta == hablar-con-nayra`, por
  `cta_clicked` con `destination = nayra` o por los ids de plan.
- **Documentación:** `docs/ANALYTICS-EVENTS.md` decía que `cta_clicked` sale en «cualquier CTA que
  abre Nayra o `/diagnostico`». En la práctica solo lo emiten los botones que abren a Nayra
  (`AgentCtaLink`). Los enlaces directos a `/diagnostico` (header, hero, rubros, planes web,
  404 y ahora los planes de agentes) no lo emiten. Se corrigió esa línea.
- **Evento no usado:** `plan_interest` está definido y reenviado a GA4, pero ningún botón lo emite hoy.

## 3. Impacto en reportes

1. **Clics en «Quiero este plan» (home y `/precios`):** dejan de verse como `cta_clicked`. El interés
   por plan se mide ahora con `diagnostic_started` filtrando por `plan` (y `source_page`/`source_section`).
   La serie histórica de `cta_clicked` por plan **no es comparable** con la de antes del cambio.
2. **Conversión plan → diagnóstico mejora de medir:** el plan viaja siempre hasta el lead (Nayra no
   recibía el contexto del botón). Se ve en el formulario («Paso 1 de 2 · Esencial») y en la nota de GHL.
3. **Hero y cierre de la home:** sin `cta_clicked`, igual que el header. Si Tom necesita el clic exacto,
   hay dos opciones sin tocar GTM: (a) medirlo con `diagnostic_started` por `source_section`, o
   (b) añadir en el sitio un envoltorio que emita `cta_clicked` (`destination=diagnostico`) en los
   enlaces directos. (b) es un cambio de código que requiere aprobación.

## 4. Para las campañas

- **Destino recomendado de un anuncio:** `/diagnostico?servicio=agentes&source=<canal>&section=<anuncio>&cta=<boton>&campaign=<campana>`
  (todo en kebab-case, sin espacios ni PII). `campaign` ya se guarda en el lead y se reenvía a analítica.
- **UTM:** la primera llegada captura `utm_source / medium / campaign / content / term`, `landing_path` y
  el host del referrer (`src/lib/marketing/attribution.ts`) y los envía con el lead. Funcionan aunque la
  persona aterrice en la home y navegue antes de enviar. No dependen de los ids de CTA.
- **Textos y precios vigentes** (todos + IVA): Esencial $190.000/mes, implementación $297.000;
  Operación $347.000/mes, implementación $497.000; Escala desde $497.000/mes, implementación desde $697.000.
  La promo «Beneficio octubre» ya no existe en el sitio: los creativos no deben mencionarla ni usar
  precios anteriores.
- **Hero vigente:** «Agentes de IA que atienden / agendan / venden / trabajan.» + «24/7 por todos tus
  canales». CTA único: «Agenda un diagnóstico». Mantener coherencia de promesa en anuncios y no
  prometer resultados ni plazos que el sitio no promete.
- **Fuera de este trabajo:** el contenido de Instagram (hay menciones de la promo en `brand/` y
  `social/`), la base de conocimiento de Nayra/Lety (puede citar precios antiguos) y el contenedor GTM.

## 5. Páginas por rubro (Bloque C, nov-2026)

Aplica a `/rubros/<slug>` (9 páginas) y al botón de cada rubro en el hub `/rubros`.

| Ubicación | Antes | Ahora | Evento al hacer clic |
|---|---|---|---|
| Rubro · hero y bloque «situación» | «Quiero algo así» → `rubros-<slug> / hero y situacion / diagnostico-rubro` | «Agenda un diagnóstico», **mismos ids** (`industria=<slug>`, `servicio=agentes`) | Ninguno (enlace directo); llega `diagnostic_started`. Sin cambios de medición. |
| Rubro · cierre, botón principal | «Hablar con Nayra»: `rubros-<slug> / final-cta / hablar-con-nayra` (abría el chat) | «Agenda un diagnóstico»: `rubros-<slug> / final-cta / diagnostico-rubro` | **Dejó de emitir `cta_clicked`/`nayra_opened`** en ese botón; llega `diagnostic_started`. |
| Rubro · cierre, enlace secundario | «Ver todos los rubros» | «Prueba a Nayra»: conserva el id `hablar-con-nayra` (serie continua del acceso a Nayra) | `cta_clicked` (`destination=nayra`) + `nayra_opened`. |
| Hub `/rubros` · botón de cada rubro | «Quiero algo así» | «Agenda un diagnóstico» (mismos ids: `rubros / <slug> / diagnostico-rubro`) | Sin cambios. |

- La serie `rubros-<slug> / final-cta / hablar-con-nayra` ahora mide solo a quienes eligen Nayra; antes mezclaba el CTA principal.
- «Ver todos los rubros» ya no está en el cierre: el acceso sigue en el breadcrumb y el footer.
