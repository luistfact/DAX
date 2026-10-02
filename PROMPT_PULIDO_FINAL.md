# ZonaAzul — Pulido final: KPIs, animaciones y navegación

Segunda ronda de retroalimentación. Aplica **después** de cerrar las fases del
rediseño BI y su commit.

---

## El prompt

---

Pasada final de pulido sobre el tablero ya rediseñado. No cambies datos, modelos
ni el servicio salvo donde se indica.

NO escribas código todavía. Lee esto, revisa el estado actual y devuélveme un
plan antes de tocar nada.

---

### Regla de color, actualizada

**Verde significa positivo; rojo significa negativo.** Es una sola regla para
toda la aplicación:

- Verde: compañero en pie, mejor que la referencia, factor a favor.
- Rojo: desplome, minuto crítico, baja, peor que la referencia, factor en contra.

Las categorías y los perfiles conservan sus colores. El dorado sigue siendo solo
marca y acción principal.

---

### 1. Navegación de cristal

Barra de navegación fija arriba, con efecto de vidrio esmerilado:

- Fondo semitransparente derivado de `--card`, con `backdrop-filter: blur()` y
  un borde inferior sutil en `--line`.
- **El texto debe conservar contraste AA cuando pasa sobre cualquier contenido**,
  incluidas las zonas claras en modo claro. Valídalo sobre el peor caso, no sobre
  el fondo vacío.
- Respaldo con fondo sólido mediante `@supports` para navegadores sin
  `backdrop-filter`.
- Que no tape el contenido: compensa la altura en el primer elemento de cada
  vista.

### 2. Héroe más bajo

Reduce la altura del héroe del Resumen para que «Lo que encontramos» quede
visible sin desplazarse en una pantalla de portátil. El título y el círculo se
conservan, más compactos.

### 3. Resumen sin jerga

- **Fuera el AUC de los títulos.** El hallazgo se dice en lenguaje de jugador:
  «La predicción se vuelve más exacta conforme avanza la partida».
- La métrica va en un tooltip con ícono de ayuda, explicada como ya está en
  Metodología.
- Lo mismo para «caída de AUC al permutar» y cualquier otro término técnico
  visible fuera de Metodología.

### 4. Perfiles: huella y detalle

- **En el Resumen**, cada perfil lleva un **radar pequeño** como su huella
  visual, en su color. Es una insignia de identidad, no un gráfico para leer
  cifras.
- **En la pestaña Perfiles** se quedan las barras divergentes, que son las que se
  leen con precisión.
- Los radares deben normalizar sus ejes igual para los cuatro perfiles, o las
  huellas no serían comparables.

### 5. Indicadores de la partida

La franja de indicadores pasa a tarjetas de KPI:

- Números grandes y un ícono de contexto por tarjeta: corona o trofeo para la
  posición, tendencia para la probabilidad.
- **Delta contra la referencia** donde exista una comparación real —por ejemplo,
  la probabilidad máxima contra la curva de los que llegaron al top—, con flecha
  y color según la regla de arriba.
- Sin delta donde no haya contra qué comparar. No inventes una referencia.

### 6. Comparación con el top 25 %: gráfico de viñetas

Sustituye el párrafo de «¿Qué hicieron distinto los que llegaron?» por un
**gráfico de viñetas** por variable —salud, compañeros en pie, distancia al
círculo—, fase por fase:

- La barra es tu equipo; la marca vertical es la mediana de los que llegaron al
  top.
- Color según la regla: verde si estás a la altura o mejor, rojo si no.
- Una línea de texto como máximo, para quien quiera la cifra exacta.

### 7. Factores como insignias

«Factores a favor» y «Factores en contra» pasan de lista a insignias en
cuadrícula:

- A favor: ícono de pulgar arriba, en verde.
- En contra: **ícono de alerta**, en rojo. La calavera queda reservada para las
  bajas: en un juego significa eliminación.

### 8. Importancia de variables

- Cada variable con una **barra de progreso** de su peso relativo.
- Nombres en lenguaje de jugador, no de base de datos: por ejemplo, «Cuánto te
  mueves» en lugar de «Desplazamiento», «En qué cierre vas» en lugar de «Fase
  del círculo». Propón la lista completa en el plan.
- La cifra exacta, si se muestra, en tamaño secundario.

### 9. Mapa con reproducción

- Botón de **Play** junto al deslizador que avanza minuto a minuto: el escuadrón
  se mueve y el círculo se cierra, como un timelapse.
- Pausa, y que el usuario pueda tomar el control del deslizador en cualquier
  momento.
- Sincronizado con la curva, como ya está el deslizador.
- Con `prefers-reduced-motion`, el Play avanza por pasos sin transición.

### 10. Tarjetas en los eventos de la curva

Al pasar el cursor por un ícono de baja o de golpe fuerte, una tarjeta pequeña
dice qué pasó en ese minuto.

**Solo con datos que existen.** Las partidas del catálogo no guardan la causa de
cada baja: la tarjeta puede decir «Cae un compañero · salud del equipo 20», pero
no «derribado por la zona». En el análisis en vivo, incluye la causa solo si el
servicio la envía en los eventos del mapa; si no la envía, dímelo en el plan.

La tarjeta no debe tapar la curva: colócala fuera del trazo.

### 11. Animaciones

La regla de una sola animación se relaja, con límites:

- **Entrada de gráficas**: la curva se dibuja de izquierda a derecha y las donas
  se llenan. Duración máxima de 800 ms, con la misma curva de aceleración en
  todas.
- **Solo una vez por carga de datos.** No al cambiar de pestaña, no al pasar el
  cursor, no al redimensionar.
- El círculo del héroe sigue siendo la animación principal de la aplicación.
- Con `prefers-reduced-motion`, ninguna animación: todo aparece en su estado
  final.

Si alguna animación hace que la aplicación se sienta lenta, prefiere quitarla.

---

## Reglas

- Nada de datos inventados.
- Conserva todos los avisos de causalidad.
- Contraste validado en ambos modos para todo lo nuevo.
- **No hagas commits.** Propón el mensaje y espera.

## Orden

1. Plan, y espera aprobación.
2. Navegación, héroe y Resumen (1–3): lo más visible.
3. Partida: KPIs, viñetas e insignias (5–7).
4. Perfiles e importancia (4 y 8).
5. Mapa y tarjetas de eventos (9–10).
6. Animaciones (11), al final: son lo más fácil de recortar.

Repórtame al terminar cada bloque.
