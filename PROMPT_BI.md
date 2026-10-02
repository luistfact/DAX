# ZonaAzul — Rediseño como tablero de BI

Única recomendación del profesor: mejorar la presentación visual, ordenarla y
hacerla presentable, con pestañas estilo tablero de BI.

Prompt para Claude Code. Cinco fases, **la primera son correcciones de datos**:
van antes que cualquier cambio visual porque afectan lo que la app afirma.

---

## El prompt

---

Vas a rediseñar la interfaz de ZonaAzul como un tablero de BI con estética de
tracker de videojuegos. No cambies datos, modelos ni el servicio.

NO escribas código todavía. Lee esto completo, revisa `app/src/` y los JSON, y
devuélveme un plan antes de tocar nada.

### Restricción legal

Repositorio público: nada extraído del juego. Ni logotipos, ni arte oficial, ni
tipografías del juego, ni mapas. La atmósfera puede evocar un battle royale; los
activos son propios.

---

## FASE 0 — Correcciones de datos y rigor

Estas van primero: son errores en lo que la aplicación afirma.

**0.1 Percentil de los perfiles invertido.** `perfiles.json` trae
`mediana_pct_rank`, donde **0 es el ganador y 1 el último**. Si la interfaz lo
muestra como percentil, invierte el significado: los Castigados, con 0.885,
aparecen como el mejor grupo cuando son el peor. Convierte en todas partes:

```
percentil = round((1 − mediana_pct_rank) × 100)
```

Resultado esperado: Rotadores 60 %, Periféricos 58 %, Centrales 48 %,
Castigados 12 %. Busca cualquier otro lugar donde se muestre `pct_rank` o un
derivado y verifica el sentido. **No renombres a los Castigados**: el nombre es
correcto.

**0.2 AUC por fase.** El AUC de un modelo al azar vale 0.5 con cualquier tasa
base; la métrica cuya referencia es la tasa base es la precisión promedio (AP).
En «Desempeño por fase»:
- El AUC se grafica con una línea de referencia en 0.5, no contra la tasa base.
- Si se muestra la tasa base, va junto a la AP, que es la comparación que le
  corresponde. Si `metricas.json` no trae AP por fase, dilo en el plan en lugar
  de calcularlo en el cliente.
- Corrige que la leyenda se encima con el título del eje.

**0.3 «200 partidas».** Son 200 **escuadrones** de 45 partidas del conjunto de
prueba, no 200 partidas. Choca con las 150 del corpus. Corrige todo texto que
diga «partidas» cuando se refiere a escuadrones, y explica la diferencia en una
línea donde aparezcan ambas cifras.

**0.4 Unidades.** «Cayó 42 %» es ambiguo: de 79 % a 37 % son 42 **puntos
porcentuales**, pero una caída relativa del 53 %. Usa «pp» en toda diferencia de
probabilidades. Las distancias al círculo llevan unidad o se dicen en palabras;
nunca un «−0.1» suelto.

**0.5 La categoría no es el resultado.** Algunas partidas «Dominante» o
«Remontada» terminaron fuera del top. La categoría describe la **forma de la
curva**, no el desenlace. Acláralo en la interfaz con una línea junto a los
filtros.

**0.6 Formatos.** Separador de miles en todas las cifras (3,862). Mismos
decimales para la misma métrica (hoy conviven 0.698 y 0.6933). Espacio antes del
signo de porcentaje en todo el texto, o en ninguno, pero consistente.

**0.7 Nomenclatura.** «Impulso gradiente» es una traducción literal poco usada.
Cámbialo por «Potenciación del gradiente (gradient boosting)» la primera vez, y
«Gradient boosting» después.

---

## FASE 1 — Paleta y tipografía

### Paleta

La aplicación se llama ZonaAzul: usa el código de colores del mapa que el
jugador ya conoce. Cada color significa una sola cosa.

```css
:root {
  --bunker:    #141612;  /* fondo: negro con toque oliva */
  --oliva:     #22261D;  /* tarjetas y filas */
  --linea:     #343829;  /* bordes */
  --texto:     #ECEDE6;
  --humo:      #9A9C8C;  /* etiquetas, texto secundario */
  --zona-azul: #3D8BFF;  /* marca, curva de probabilidad, remontadas */
  --ambar:     #F2A900;  /* acción principal, top, dominantes */
  --zona-roja: #E5484D;  /* desplomes, minuto crítico, bajas */
}
```

Reglas de uso:
- **Rojo** solo en números grandes y gráficas. Contra las tarjetas baja de 4:1,
  así que nunca en texto pequeño.
- **Ámbar** es el color de la acción principal. Un solo botón ámbar por
  pantalla.
- Categorías: desplome rojo, remontada azul, dominante ámbar.
- El texto de párrafo usa los tokens de texto, nunca los acentos.

**Modo oscuro por defecto.** Deriva un modo claro con la misma semántica y
valida el contraste de ambos con el script que ya usaste. Ajusta lo que no pase.

Migra los tokens anteriores —`zona`, `peligro`— a los nuevos, y confirma que no
quede ningún color literal en componentes, gráficas, mapa ni fondo.

### Tipografía

- **Barlow** para el cuerpo y **Barlow Condensed** solo para números y títulos
  de sección en mayúsculas. La condensada en minúsculas pierde legibilidad.
- `font-variant-numeric: tabular-nums` en toda cifra, para que se alineen.
- Etiquetas pequeñas y en minúsculas sobre números grandes, como en un tracker.

---

## FASE 2 — Estructura de tablero

Principio de Shneiderman: primero el panorama, luego filtrar y hacer zoom, el
detalle a demanda. Hoy la aplicación abre directo en una partida sin contexto.

### Pestañas nuevas

1. **Resumen** — la portada. Cifras del corpus, tres o cuatro hallazgos de una
   frase cada uno, y los cuatro perfiles como arquetipos. Es lo primero que ve
   quien abre la app.
2. **Partidas** — lista y reporte, como la sección de partidas de un tracker.
3. **Perfiles**
4. **Metodología** — lo que hoy es «Cómo funciona».

«Analizar mi partida» deja de ser pestaña y pasa al encabezado (ver abajo).

### Hallazgos para el Resumen

Usa estos, redactados en una frase cada uno:
- Solo el 5 % de las bajas vienen de la zona; cerca del 90 %, del combate.
- Llegar con el escuadrón completo y sano pesa más que dónde estés parado.
- Rotar sin parar y quedarse quieto en la periferia dan casi el mismo resultado.
- La probabilidad se vuelve más predecible conforme avanza la partida.

### Encabezado

- Buscador con el texto «Tu nombre de usuario de PUBG», que lanza el análisis en
  vivo. Es el **único botón ámbar** de la aplicación.
- Botón de tema.
- Aprovecha el ancho completo: hoy el contenido ocupa la mitad de la pantalla.

### Fondo

Los anillos concéntricos que ya existen son la imagen de marca: son literalmente
los círculos de la zona. Consérvalos, con los tokens nuevos.

---

## FASE 3 — Vista de partidas

### La lista

- **Nombres legibles.** Sustituye `0f55b02e-7` por «Partida 7 · 21 equipos».
  El corpus **no guardó la fecha** y todas las partidas son de Erangel en
  escuadra, así que no los agregues. En el análisis en vivo sí muestra la fecha,
  porque el servicio recibe los metadatos completos.
- **Filas densas** en lugar de tarjetas: barra de color de la categoría, posición
  en grande y la curva en miniatura.
- **Pastillas de filtro** en lugar de secciones apiladas: Todas, Desplomes,
  Remontadas, Dominadas. Junto a ellas, la aclaración de la fase 0.5.
- Disposición en dos columnas: lista a la izquierda, reporte a la derecha.

### El reporte

**Franja de indicadores** arriba, una sola fila: posición, percentil,
probabilidad máxima, caída desde el pico en pp y minuto crítico. Etiqueta
pequeña, número grande.

**Traduce la meta.** «Top 25 %» se explica con la cifra de esa partida: «en una
partida de 28 equipos, es quedar entre los primeros 7».

**La gráfica de probabilidad es la pieza principal:**
- Sombrea de fondo las seis fases del círculo, en bandas alternas muy tenues.
- Íconos sobre la curva donde el escuadrón pierde a alguien y donde recibe un
  golpe fuerte de salud.
- **Sustituye el tooltip grande**, que tapa el pico, por una línea vertical que
  sigue al cursor y un panel lateral con el estado de ese minuto.
- Corrige el título «Minuto» del eje, que se corta.

**Estados vacíos:** si la comparación con la referencia no tiene datos, oculta
la sección completa en lugar de mostrar «Aún no hay datos de referencia».

---

## FASE 4 — Metodología

Es la pestaña para el evaluador. Debe demostrar rigor sin exagerar resultados.

- **Diagrama del flujo** punta a punta: API de PUBG → telemetría → variables por
  minuto → modelo → aplicación y asistente. En SVG propio.
- **Modelo elegido destacado**, y la advertencia honesta: las diferencias entre
  familias son pequeñas, de 0.677 a 0.698.
- **El AUC en lenguaje llano:** «con 0.70, si comparas un escuadrón que llegó al
  top con uno que no, el modelo le da más probabilidad al que llegó 7 de cada 10
  veces».
- **Curva de calibración**, porque al usuario se le muestran probabilidades. Si
  los datos de calibración no están en `metricas.json`, dilo en el plan: se
  exportarían desde la sección 8.1 del notebook.

---

## FASE 5 — El asistente

- Dale un nombre corto y propio. Propón tres.
- **Preguntas sugeridas según la pantalla**: en una partida, «¿Por qué caí en el
  minuto 11?» con el minuto real del momento crítico; en perfiles, «¿Qué
  distingue a los Rotadores?».
- Que se sienta parte del producto: mismos tokens, misma tipografía.

---

## Fuera de esta pasada

No lo implementes sin preguntarme:
- Búsqueda por voz.
- Tipografía stencil en la posición final.
- Intervalos de confianza por bootstrap.

---

## Reglas

- Nada de datos inventados. Si un campo viene nulo, guion.
- Conserva los avisos sobre causalidad en los escenarios.
- Una sola animación principal. Respeta `prefers-reduced-motion`.
- Verifica en la documentación oficial cualquier API que no conozcas con certeza.
- **No hagas commits.** Propón el mensaje y espera.

## Orden y reportes

Plan primero, y espera aprobación. Después una fase a la vez, reportando al
terminar cada una. La fase 0 es obligatoria antes de cualquier cambio visual.

Criterio de aceptación: `npm run build` sin errores, y alguien que abre la
aplicación por primera vez entiende en treinta segundos de qué trata y qué hacer.
