# Perfiles de movimiento (Motion v2)

Cuatro perfiles de resorte amortiguado (ω = rigidez, ζ = amortiguación). Se eligen por pieza y se mantienen en toda la pieza.

| Perfil | ω | ζ | Cuándo |
|---|---|---|---|
| **seco** | 22 | 1,0 | cursores, cortes de interfaz, datos: llega sin rebote |
| **estándar** | 14 | 0,8 | la mayoría de entradas y cambios de estado |
| **pesado** | 8 | 0,9 | objetos grandes, cierres con logo, calma |
| **juguetón** | 16 | 0,45 | llamita, ganchos, un acento por pieza (no todo) |

**Suma de resortes:** cuando un elemento cambia de destino a mitad de camino, NO se reinicia la animación: cada cambio de destino agrega su propio resorte desde ese instante (`valor = inicio + Σ (destinoᵢ − destinoᵢ₋₁) · resorte(t − tᵢ)`). Así no hay saltos. Implementación de referencia: `lista-de-estados/composition.html` (`spring`, `sumSprings`).

**Determinismo:** todo depende solo de `t` (sin `Date.now`, sin azar sin semilla). La puerta de calidad lo comprueba renderizando dos veces.
