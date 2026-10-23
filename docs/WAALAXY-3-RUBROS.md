# Waalaxy · 3 rubros · Región de Antofagasta (desde el 23-oct-2026)

Objetivo: usar lo que queda de la promoción de Waalaxy (2 semanas) para ampliar la red de Christian en los 3 rubros, **en paralelo al correo**. Tope: **20 invitaciones por día** (`linkedin_daily_cap = 20`; LinkedIn no publica su límite, empezar por abajo y subir solo si no hay avisos).

## Dos caminos hacia Waalaxy

1. **Atacama OS → Waalaxy (automático por aprobación).** Todo prospecto con persona nombrada + cargo confiable + perfil personal de LinkedIn verificable aparece en `/ops → Aprobaciones → LinkedIn`. Botón **«Pasar N a Waalaxy»** (respeta el tope del día). Entra a la lista «Atacama OS — Producción» y a la campaña «Atacama OS — LinkedIn Producción». Ya no espera al cierre del correo; solo se excluye a quien respondió, está descartado o ya fue contactado a mano por LinkedIn.
2. **Búsquedas de Christian → Waalaxy (para crecer la red).** En LinkedIn (Búsqueda de personas, filtro Ubicación = Región de Antofagasta) → botón de la extensión de Waalaxy → «Importar» a la lista del rubro. Una lista por rubro:
   - `Corredoras — Antofagasta` · búsquedas: «corredor de propiedades», «corredora de propiedades», «agente inmobiliario», «gerente corredora».
   - `Clínicas y salud — Antofagasta` · búsquedas: «director clínica dental», «odontólogo», «médico veterinario», «kinesiólogo», «psicólogo», «administrador clínica».
   - `Casinos y alimentación — Antofagasta` · búsquedas: «administrador casino», «jefe de casino», «concesionaria de alimentación», «gerente servicios de alimentación», «encargado de alimentación colegio».

Importar de a ~50 por lista; las 3 listas a la vez no deben pasar de 20 invitaciones/día en total.

## Secuencia (la misma en las 3 campañas, 3 pasos)

| Paso | Cuándo | Qué |
|---|---|---|
| 1 | Día 0 | Visitar perfil + **invitación SIN nota** (aceptan más; la nota de venta baja la aceptación). |
| 2 | 2 días después de aceptar | Mensaje 1 (abajo, según rubro). Una sola pregunta, sin demo, sin precios. |
| 3 | 5 días después del mensaje 1, solo si no respondió | Mensaje 2: cierre corto. |

Regla del Playbook que sigue valiendo: nada de demo, reunión, precios ni «agendemos» en el primer contacto; si responde, se conversa a mano.

## Mensaje 1 por rubro

**Corredoras**
> Hola {{firstName}}, gracias por conectar. Hablando con corredoras de la región, lo que más tiempo les quita es revisar cada postulación contra los requisitos de cada propietario: documentos, renta, antigüedad. ¿Cómo lo llevan hoy en {{company}}?

**Clínicas / salud**
> Hola {{firstName}}, gracias por conectar. En clínicas y consultas de Antofagasta suele repetirse lo mismo: agendar, confirmar y hacer seguimiento mientras se atiende, y la hora de quien no avisa queda vacía. ¿Cómo manejan hoy las confirmaciones en {{company}}?

**Casinos y alimentación**
> Hola {{firstName}}, gracias por conectar. En los servicios de alimentación suele aparecer un trabajo repetido: juntar pedidos, opciones de menú y pagos en planillas o mensajes. ¿Cómo registran hoy los pedidos en {{company}}?

## Mensaje 2 (cierre, igual para los 3)
> {{firstName}}, no quiero insistir. Si en algún momento ordenar este proceso entra en sus prioridades, aquí estoy. Éxito con {{company}}.

## Qué sabe y qué no sabe Atacama OS
- Atacama OS **no puede leer** el estado de Waalaxy (la API no avisa de aceptaciones ni respuestas). Cuando alguien responda o acepte, se registra a mano vía Hermes (`log_linkedin_event`) para que se frenen los correos de ese prospecto.
- Las personas importadas a mano desde búsquedas **no pasan por Atacama OS**: si responden, avisar a Hermes para que las registre.
- Si una persona ya recibió el correo y responde por LinkedIn, o al revés, se detienen los dos canales.

## Cómo se mide
Invitaciones enviadas, % aceptación, % respuesta al mensaje 1, conversaciones abiertas. Meta razonable de referencia: 25–40 % de aceptación y 5–10 % de respuesta sobre aceptados (cifras de guías de la industria, no garantizadas).
