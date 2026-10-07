# Primer lote real — 14 prospectos en *Investigado* (8-oct-2026)

> **Nada se ha contactado.** Los 14 entraron por el Prospect Gateway (`import`, request_id `lote1-2026-10-08`) a **Investigado**, con nota de revisión, ángulo y borrador; las tareas «Revisar prospecto» las crea la automatización de GHL. Los borradores de correo (13) están guardados en el motor (`outreach_messages`, estado `draft`, **sin aprobar**); el envío real está apagado (`mode = off`).

## Cómo se eligieron (de los 43 que pasan el scoring del Gateway)
- Score alto (77–84) **y** canal público, con preferencia por correo (el motor es de correo); WhatsApp/teléfono como respaldo.
- Proceso observable concreto (agenda, reserva, cotización, formularios, varias sedes/servicios) y facilidad de conversación: negocios dirigidos por su dueño o administración (clínicas dentales y veterinarias, taller, arriendo/equipos, hotel boutique, OTEC), más que grandes cadenas (Reutter, Wall Street English, Hotel Diego de Almagro, Medicenter).
- Variedad de rubros para aprender qué ángulo responde mejor, y **un pie en el norte** (Hidromec en Antofagasta; Clínica Smile en Calama, solo WhatsApp).
- Descartados por calidad de dato aunque pasaban: Audilex MR (el sitio no coincide con el contacto), Casa Kalfu (hipótesis vaga), Dental Valpo (hecho débil), Comercial Alameda (fuente OSM, sin correo).

| # | Empresa | Score | Banda | Rubro | Ciudad | Canal público | Ángulo (un dolor, un resultado) |
|---|---|---|---|---|---|---|---|
| 1 | Clínica Ramis | 84 | alta | Clínica privada de medicina, odontología | Valdivia | correo + WhatsApp | Recepción clasifica solicitudes de muchas especialidades a mano: un agente que ordene especialidad, profesional y previsión antes de derivar deja a recepción solo la excepción. |
| 2 | Europa Mechanical / Daytona Services | 84 | alta | Taller mecánico automotriz multimarca | Santiago | correo + WhatsApp + teléfono | Antes de agendar o cotizar se repiten las mismas preguntas (marca, modelo, kilometraje, falla): un agente que las capture entrega la solicitud lista a recepción. |
| 3 | Dental y Estética Maipú | 84 | alta | Clínica dental familiar y estética facia | Maipú | correo + WhatsApp + teléfono | Recepción repite motivo, urgencia y disponibilidad antes de agendar: un agente que clasifique y entregue la solicitud lista para coordinar libera tiempo sin tocar nada clínico. |
| 4 | Mundo Cursos | 84 | alta | OTEC y e-learning para salud, educación  | Chile | correo + WhatsApp | Admisiones repite preguntas de curso, modalidad, SENCE y fechas antes de inscribir: un agente que identifique el programa entrega a admisiones un interesado listo para cerrar. |
| 5 | Vet24 | 82 | alta | salud / veterinaria | Ñuñoa | correo + teléfono | Recepción separa a mano urgencias, especialidades y reservas: un agente que lo ordene y capture los datos de la mascota deja a recepción solo las excepciones. |
| 6 | Clínica Dental CIPO | 79 | valida | Clínica dental, tratamientos y ortodonci | Santiago | correo + WhatsApp | Recepción repite preguntas de tratamiento y disponibilidad antes de dar la hora: un agente que las resuelva entrega la solicitud lista para reservar. |
| 7 | Clínica Smile by Nohemi Cortés | 79 | valida | Clínica dental general, ortodoncia, urge | Calama | WhatsApp | Recepción repite tratamiento, urgencia y disponibilidad antes de dar la hora: un agente que ordene esa primera conversación entrega la solicitud lista a recepción (clínica en Calama, contacto solo por WhatsApp). |
| 8 | Casa Higueras | 79 | valida | Hotel boutique y restaurante | Valparaíso | correo + WhatsApp + teléfono | Reservas responde seguido las mismas preguntas de fechas, tarifas y programas para empresas: un agente que las ordene entrega a reservas un brief completo. |
| 9 | Chilelift | 79 | valida | Equipamiento, servicios y arriendo para  | Quilicura | correo + WhatsApp + teléfono | Ventas y postventa repiten preguntas de compatibilidad, instalación y cobertura: un agente que reúna los datos técnicos entrega al vendedor una solicitud lista para cotizar. |
| 10 | Veterinaria San Joaquin | 79 | valida | Clínica veterinaria, consultas a domicil | Chicureo | correo + WhatsApp + teléfono | Recepción repite especie, motivo, modalidad (clínica o domicilio) y comuna antes de agendar: un agente que lo capture entrega la solicitud lista para coordinar. |
| 11 | Rentalin | 79 | valida | Arriendo de maquinaria pesada y movimien | Linares | correo + WhatsApp | Antes de cotizar se piden comuna, fechas, tipo de obra y equipo: un agente que reúna esos datos entrega a operaciones un brief completo y acelera la cotización. |
| 12 | Hidromec | 77 | valida | Servicios integrales de mantención, oleo | Antofagasta | correo + teléfono | Las solicitudes técnicas llegan incompletas y se repiten las mismas preguntas (equipo, componente, faena, urgencia): un agente que las capture entrega a operaciones una solicitud lista para revisar. |
| 13 | Comercial MaqCenter SpA | 77 | valida | ecommerce B2B de insumos, filtros, herra | Curicó | correo + teléfono | Ventas responde a mano compatibilidad, disponibilidad y alternativas, incluso de productos agotados: un agente que tome la consulta por SKU o equipo entrega a ventas una cotización completa. |
| 14 | Dentaline | 77 | valida | Clínica odontológica especializada en or | Las Condes y Providencia | correo | Recepción repite tratamiento, sucursal y horarios antes de dar la primera hora: un agente que lo ordene entrega cada consulta lista para agenda. |

## Qué sigue con este lote (cuando Christian quiera empezar)
1. Revisar los borradores por Telegram: «muéstrame el borrador de Clínica Ramis» (`get_draft`), ajustar con `save_draft`.
2. Activar el envío real (checklist de `OUTREACH.md` §5: buzón, credencial de Gmail, pie legal, envío de prueba a tu correo).
3. **Primeros contactos controlados:** 3–5 correos el primer día (`daily_cap = 5`), empezando por las bandas *alta*; aprobar de a uno con `approve_outreach` (código + «sí, confirmo»). Clínica Smile (Calama) y cualquier otro de solo WhatsApp se contactan a mano y se registran con `log_manual_contact`.
4. Seguimientos a +3 y +7 días hábiles: los prepara solo el planificador (borrador, nunca autoenvío).
