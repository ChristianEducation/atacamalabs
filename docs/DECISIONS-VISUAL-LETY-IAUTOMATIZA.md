# Decisiones visuales — referencia IAutomatiza + Lety (2026-09-21)

Autoriza: Christian. Regla: ante duda de densidad o estructura, manda IAutomatiza/Lety; el spec V2.2.1 se respeta salvo lo aquí anotado.

| ID | Decisión | Por qué | Efecto sobre el spec |
| --- | --- | --- | --- |
| D-V01 | Neutros claros de Lety (`#FAFAF8`, `#F5F4F0`, `#ECEAE4`, bordes 9 %) en lugar del arena cálido; el acento rosa de Lety se reemplaza por el azul de marca `#0F5CED`. | Pedido explícito; mantiene el azul del kit de identidad. | Sustituye C1 (fondos). Logo, azul y tinta siguen el kit. |
| D-V02 | Capa `src/styles/lety.css`: eyebrow mono con punto que respira, botones pill, header de vidrio, cards con borde fino, héroe con cuadrícula + resplandor, revelado 900 ms / 24 px. | Aire y movimiento fino como las referencias. | Ajusta D (motion) a más lento; respeta reduced-motion. Reversible quitando el import. |
| D-V03 | Más padding vertical entre secciones (hasta 128 px) y 64 px entre título y contenido. | Menor densidad. | Sustituye espaciados de C3. |
| D-V04 | `/agentes`: G3 (acciones) se integra en G2 (capacidades) y G9 (puesta en marcha) en G10 (preguntas), separados por línea fina. | Menos secciones; contenido y copy intactos. | G3/G9 ya no son secciones propias (AC-08 sigue cubierto). |
| D-V05 | Se mantiene el rotor de verbos del Home (F1/M04 del spec). | Está en el spec; su diferencia con la escritura de IAutomatiza es la transición suave. | Ninguno. |
| D-V06 | Sin cursor-glow ni contadores de MRR de Lety. | Requieren JS continuo; el spec prohíbe métricas comerciales inventadas. | Ninguno. |

Pendiente: repetir la compactación en `/comercial`, `/cobranza` y `/administrativo-financiero`, y la revisión pantalla a pantalla.
