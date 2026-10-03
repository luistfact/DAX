# ZonaAzul — Tablero visual, poco texto y lenguaje de jugador

Cuatro objetivos: **lenguaje no técnico**, **mucho menos texto**, **gráficas
tipo BI** y **una aplicación visualmente atractiva y animada**.

Este prompt **complementa PROMPT_ANIMACION_ORDEN.md**: la plantilla por
pestaña (mensaje, indicadores, gráfico principal, desplegables) y el sistema
de animación de ese prompt siguen vigentes. Donde este prompt pida algo
distinto en lo visual (colores, gráficas, distribución), manda este.

---

## El prompt

---

Integra esto al trabajo en curso.

NO escribas código todavía. Devuélveme primero el plan: qué cambia en cada
pestaña, qué gráficas se reemplazan y por cuáles, y los textos nuevos. Espera
mi aprobación antes de tocar nada.

Reglas que no cambian:

- Ninguna cifra inventada. Los números de este prompt son ejemplos: todo sale
  de `partidas.json`, `perfiles.json` y `metricas.json`.
- Sin dependencias nuevas sin justificarlas antes. Medidores, anillos y mini
  gráficas se pueden hacer en SVG propio o con Recharts, que ya está.
- Cualquier color nuevo se valida con `validate_palette.js` en ambos temas,
  como en las fases anteriores.
- Con `prefers-reduced-motion`, nada se mueve y todo funciona.

---

### 1. Menos texto

- **Una frase por bloque, máximo 12 palabras.** Si necesita más, va a una
  desplegable o a un ícono de ayuda (?).
- **Cifra antes que frase**: «5 % de las bajas son por la zona», no
  «Encontramos que el 5 % de las bajas…».
- **Fuera los párrafos introductorios** de Perfiles y Metodología: los
  reemplaza el mensaje principal de una línea.
- **Texto convertido en íconos y chips**:
  - «1 a favor · 3 en contra» → dos chips de color.
  - «Top 25 %» → trofeo.
  - Compañeros en pie → soldaditos, también en las tarjetas, no solo en el
    panel de la curva.
- **Leyendas de 2 a 4 palabras**: «Tu equipo», «Los que llegaron», «Momento
  clave», «Cae un compañero», «Golpe fuerte».
- **La franja de cifras del corpus** del Resumen pasa a tarjetas KPI con
  ícono.

---

### 2. Lenguaje de jugador

Fuera de Metodología no aparece ningún término técnico: ni en tarjetas, ni en
leyendas, ni en tooltips, ni en mensajes vacíos, ni en Botsito.

| Hoy dice | Que diga |
|---|---|
| Probabilidad de top 25 % | Tus posibilidades de top 25 % |
| Percentil mediano 60 % | Mejor que 6 de cada 10 equipos |
| Fases del círculo (F1 a F6) | Cierres de la zona |
| 0.55 radios del centro | A medio camino del borde |
| Distancia inicial a la zona, 0.38 radios | Qué tan lejos de la zona caes |
| Movilidad 0.115 | Cuánto te mueves (alto / medio / bajo) |
| Variabilidad de distancia | Qué tan constante es tu ruta |
| Variabilidad de movimiento | Qué tan parejo es tu ritmo |
| Salud inicial 95.5 pts | Salud al aterrizar |
| La predicción se vuelve más exacta | El análisis acierta más mientras avanza la partida |
| Cuánto pesa en el modelo la variable de estado… | Lo que más pesa para llegar |
| Según el modelo… | Según el análisis… |
| Promedio de los que llegaron al top (307 escuadrones del conjunto de prueba) | Los que llegaron al top |
| Golpe fuerte (25 puntos de salud o más en un minuto) | Golpe fuerte (el detalle, en el tooltip) |

- **Los valores crudos** (0.082, «radios», «pts») salen de la vista del
  jugador. Se traducen a una escala de 3 niveles (alto / medio / bajo) o a
  una comparación («el doble que el promedio»). El número exacto queda en el
  tooltip.
- **«Modelo», AUC, Brier, AP, red densa, red recurrente y recalibración**
  solo aparecen en Metodología.
- **Botsito habla igual**: agrega esta tabla a
  `servicio/instruccion_asistente.md` para el registro llano.

Si encuentras otro término técnico visible, propón su traducción en el plan.

---

### 3. Gráficas tipo BI

#### Resumen

- **Héroe compacto en una sola banda**:
  - a la izquierda, el título y el botón;
  - a la derecha, 4 KPI del corpus con ícono y conteo animado.
  - Corregir el anillo, que hoy tapa la palabra «escuadrón».
- **Hallazgos en tarjetas 40/60**: la cifra a la izquierda y la gráfica
  llenando el resto, sin huecos.
  - **Bajas**: dona grande con la cifra al centro; la zona de gas
    resaltada y el resto en gris.
  - **Lo que más pesa**: solo las 5 o 6 variables con peso, en barras
    horizontales gruesas con ícono. Las que no pesan, fuera.
  - **Perfiles**: barras con la línea del 75 % marcada como «zona top».
  - **Aciertos por cierre**: área ascendente con degradado, en lugar de 6
    barras iguales.
- **Botón «Ver un ejemplo»** que lleve directo al desplome más claro de
  Partidas.

#### Partidas

- **KPI con mini gráfica**, no solo número:
  - **Posición**: escalera de 1 a N con el corte del top marcado.
  - **Mejor que**: anillo de progreso.
  - **Mejores posibilidades**: medidor semicircular.
  - **Caída**: mini línea del desplome.
  - **Minuto crítico**: punto sobre una línea de tiempo de 15 minutos.
- **Curva**:
  - tramos azules cuando sube y rojos cuando cae;
  - área con degradado debajo;
  - la etiqueta del momento clave arriba de la gráfica, sin encimarse con la
    línea;
  - los cierres como una franja segmentada bajo el eje, tipo línea de tiempo
    de videojuego, en lugar de bandas pálidas.
- **Desplegables en 2 columnas**, cerradas por defecto pero con un adelanto
  visual en la cabecera:
  - «A favor y en contra»: barra partida verde / rojo.
  - «¿Dónde se decidió?»: insignia roja con minuto y caída.
  - «¿Y si…?»: chip con la mejor ganancia.
  - «Contra los que llegaron al top»: tres puntos verde / rojo, uno por
    variable.
- **Lista**: chips de filtro con el color de su categoría, y la posición
  en dorado si fue top.

#### Perfiles

- **Arriba, 4 tarjetas de perfil**: radar animado, medidor de «mejor que N de
  cada 10» y número de escuadrones.
- **Una sola gráfica comparativa de puntos** como gráfico principal, en lugar
  de las 4 tarjetas de barras:
  - una fila por característica, con nombre de jugador;
  - un punto de color por perfil;
  - una línea en el promedio.
- **El detalle de cada perfil**, con los valores exactos, en desplegables.

#### Metodología

Aquí sí se permite el lenguaje técnico.

- **Comparación de modelos** como barras de AUC con los dos modelos de la
  app resaltados. La tabla, en una desplegable.
- **Diagrama de flujo** más grande y con íconos.

---

### 4. Apariencia

- **Ancho máximo de unos 1600 px, centrado**, sobre una rejilla de 12
  columnas. A 1920 px hoy todo se estira y quedan huecos enormes.
- **Tarjetas con más presencia**:
  - esquinas de 12 px;
  - borde superior de 3 px del color de su dato;
  - sombra suave en el tema claro.
- **Tema claro**: fondo gris frío con tarjetas blancas, en lugar de beige
  sobre beige.
- **Fondo**: bajar la opacidad de la cuadrícula A–H y las líneas
  topográficas, que se notan detrás de las tarjetas.
- **Tema oscuro, aspecto de HUD**: es el tema de la demo.
- **Cifras héroe de unos 56 px**, con la etiqueta pequeña encima.
- **Una acción principal por pantalla**: en Resumen «Explorar escuadrones»,
  en Partidas «Analizar mi partida».

---

### 5. Animación

Con las duraciones y la aceleración única de PROMPT_ANIMACION_ORDEN.md.

- **Al entrar a una pestaña**: tarjetas en cascada, medio segundo en total.
- **Números grandes**: cuentan desde 0.
- **Gráficas**:
  - la curva se dibuja de izquierda a derecha;
  - las barras crecen;
  - la dona se llena girando;
  - los radares crecen desde el centro;
  - los anillos y medidores de los KPI se llenan.
  - Todo esto una vez por carga de datos, no cada vez que se vuelve a la
    pestaña.
- **Cambio de escuadrón, cierre o perfil**: barras, medidores y puntos se
  deslizan al nuevo valor en lugar de saltar.
- **Hover**: solo las tarjetas que se pueden pulsar se elevan 2 px.
- **Momento clave**: un pulso suave en su punto de la curva, dos latidos al
  cargar y se detiene.

---

## Criterio de aceptación

- **Prueba de los 5 segundos**: alguien que no conoce el proyecto puede decir
  de qué trata cada pestaña en 5 segundos.
- **Lenguaje**: ningún término técnico fuera de Metodología, incluido
  Botsito.
- **Texto**: ningún bloque de más de 12 palabras visible sin abrir una
  desplegable.
- **Espacio**: a 1920 px no quedan huecos vacíos dentro de las tarjetas.
- **Pantallas angostas**: a 390 px no hay scroll horizontal.
- **Temas**: los dos se ven bien y pasan las verificaciones de contraste.
- **Movimiento**: con `prefers-reduced-motion`, nada se mueve y todo
  funciona.

**No hagas commits** sin mi aprobación.
