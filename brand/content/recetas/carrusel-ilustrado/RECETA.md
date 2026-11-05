# Receta · carrusel ilustrado (producción automática en la VPS, Atacama OS v3 §6.5)

Fuente: `docs/ESTRATEGIA-CARRUSELES-ILUSTRADOS.md` (lo aprendido con el carrusel de Flows). Esto es el **método**, no una plantilla:
cada carrusel compone su propia disposición según su historia.

## Reparto de trabajo
- **El modelo** (Higgsfield · GPT Image 2.5) dibuja SOLO lo visual de cada lámina: objeto o escena sobre **fondo liso uniforme** (#E8EDF6), con los textos exactos que deben verse DENTRO de la escena (chats, formularios). Nunca titulares, logos ni contadores.
- **El sistema** (`scripts/content/carousel-composer.mjs`) pone titular con énfasis azul, texto de apoyo, pill, pasos, logo oficial, contador «NN / TT», fondo con la cuadrícula de marca y el cierre. Recorte del fondo en local (`scripts/media/cutout.py`, solo Pillow).
- **Control de calidad** (`scripts/content/taller-producer-core.mjs`): 1080×1350, texto exacto leído con la visión de Hermes (≤ 1 diferencia de tilde/mayúscula por línea), logo y cuadrícula presentes, sin marcos ni chips; crítica visual de la hoja de contacto.
- **Lámina de prueba primero**; máx. 3 intentos por lámina, 30 créditos por pieza, 200 por semana → si se agota: «necesita ayuda».

## Especificación que escribe Hermes (`taller_produce`)
```json
{ "caption": "Texto de la publicación (incluye la palabra clave si la idea la lleva)",
  "slides": [
    { "layout": "portada", "pill": "NUEVO COBRO DESDE EL 1 DE OCTUBRE", "title": "¿Agendar una hora en 8 mensajes?", "emph": "Bastan 3 toques.",
      "art": { "scene": "Close-up of a hand holding a phone… plain flat light blue-grey background", "texts": ["Clínica Dental Sonrisa", "Limpieza dental"], "cutout": true } },
    { "layout": "arte_texto", "title": "Pedir cada dato por separado|*alarga la conversación.*", "body": "Texto de apoyo con **una idea** fuerte.", "art": { "scene": "…", "cutout": true } },
    { "layout": "pasos", "title": "Y nosotros lo dejamos *configurado.*", "steps": ["Revisamos tu *proceso*", "Configuramos el *agente*", "Lo *probamos contigo*"], "art": { "scene": "…" } },
    { "layout": "texto", "title": "Una idea fuerte", "body": "Texto breve." },
    { "layout": "cierre", "title": "¿Hoy agendas *por WhatsApp?*", "body": "Escríbenos y lo revisamos contigo." } ] }
```
Layouts: `portada · arte_texto · pasos · texto · cierre` (la última lámina de un carrusel SIEMPRE es `cierre`). `*así*` = énfasis azul. `|` separa líneas del título.

## Errores ya conocidos (no repetirlos)
- La **llamita** oficial: bípeda, 4 patas (2 brazos + 2 piernas), lana crema, manos y pezuñas cafés, SIN bufanda ni ropa. Usar las poses oficiales de `brand/content/mascot/` como referencia; si sale con 6 patas o deforme, se rehace.
- **Verde = empresa / blanco = cliente** en todos los chats; no cambiar de punto de vista entre láminas. Negocio ficticio y coherente en todas las láminas.
- **Pantallas realistas** (aspecto de WhatsApp sin su logo), manos reales; nada de render de juguete.
- **Encuadre cercano**: el objeto principal ocupa ≥ 60 % del ancho; máximo 4–5 mensajes o tarjetas; texto grande y legible en un celular.
- **Fondo liso** para recortar; nunca cuadrícula, mesa ni sombra proyectada en el fondo del arte (la cuadrícula la pone el compositor).
- Prohibido: robots, hologramas, neón, circuitos, brillo excesivo, logos inventados, esquinas decorativas o «marcos».
- Toda corrección que Christian repite se convierte en **regla propuesta** (`tpRuleCandidates`) para que él la apruebe.

## Prompts aprobados (referencia, carrusel de Flows)
En `prompts/`: portada con formulario, portada de lado, chat en mano, tres celulares, llamita con panel. Se reutiliza su estructura (estilo, fondo, sujeto, textos exactos, encuadre), nunca su contenido.
