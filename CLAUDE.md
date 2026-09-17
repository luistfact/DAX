# Convenciones del proyecto ZonaAzul

Instrucciones permanentes para el agente. Se leen al inicio de cada sesión.

> Si además usas Codex CLI o Gemini CLI, copia este mismo contenido a un
> archivo `AGENTS.md` en la raíz: es la convención que esas herramientas leen.

---

## Contexto

Proyecto integrador de un diplomado en ciencia de datos. Estima la probabilidad
de que un escuadrón de PUBG termine en el cuarto superior de su partida, a
partir de la telemetría oficial del juego.

Se evalúa con una rúbrica de 110 puntos, de los cuales **45 corresponden a la
demostración en vivo y al video**. Ambos miden usabilidad, no sofisticación
técnica. Prioriza en consecuencia: una aplicación clara vale más que una
arquitectura elegante.

## Seguridad

- **Nunca escribas una clave en el código**, ni en comentarios, ni en ejemplos.
  Se leen de variables de entorno o de `.env`, que está en `.gitignore`.
- **Nunca hagas commit sin permiso explícito.** Propón el mensaje y espera.
- **Nunca subas telemetría cruda** al repositorio. Son decenas de megabytes por
  partida.
- Antes de cualquier commit, verifica que `git status` no incluya
  `pubg_key.txt`, `.env`, `raw/` ni `meta/`.

## Datos

- La clave de la API permite diez peticiones por minuto. Los recursos
  `/matches` y la telemetría quedan exentos; `/samples` y `/players` no.
  Respeta el limitador que ya existe en `src/pubg_api.py`.
- Las partidas expiran en la API. **La tabla analítica en `datos/` es la fuente
  de verdad**; no la regeneres sin necesidad.
- Todo lo que el modelo reciba en el minuto *t* debe ser calculable con la
  información disponible en el minuto *t*. Las columnas `time_survived`,
  `kills`, `damage_dealt` y `walk_distance` solo existen al terminar la partida
  y **no pueden usarse como predictores**.
- La partición entre entrenamiento y prueba es por fecha de partida, nunca
  aleatoria: las ventanas de una misma partida están correlacionadas.

## Decisiones ya tomadas

No las revierta sin discutirlo primero.

| Decisión | Razón |
|---|---|
| Variable objetivo `top25`, normalizada por escuadrones de la partida | El número de equipos varía entre 15 y 46; una etiqueta absoluta mezclaría dificultades distintas |
| Eje temporal: fase del círculo, no minuto | Cada partida entra en las fases en momentos distintos del reloj |
| Horizonte: primeros 15 minutos | Después quedan pocos equipos y las ventanas son poco representativas |
| Unidad de observación: escuadrón-ventana de 60 s | La pregunta es sobre el equipo en un momento, no sobre el jugador en la partida |
| Métricas: AUC y Brier, no exactitud | La clase positiva ronda el 26 % |
| Evaluación dentro de cada fase | La tasa base crece por sesgo de supervivencia y falsearía la comparación |

## Convenciones de código

- Python 3.11+. Nombres de variables y comentarios en español; nombres de
  librerías y API en inglés.
- Funciones cortas con docstring de una línea. Comentarios que expliquen el
  *por qué*, no el *qué*.
- Sin dependencias nuevas sin justificarlas antes.
- El notebook debe ejecutarse de principio a fin en Google Colab **sin
  credenciales**. El modo `demo` existe para eso y no debe romperse.

## Fuera de alcance

- Cómputo distribuido (Spark, Dask). El conjunto cabe en memoria.
- Redes convolucionales sobre el mapa rasterizado. Documentado como trabajo
  futuro.
- Autenticación de usuarios, panel de administración, base de datos.
- Cualquier funcionalidad que sugiera ventaja competitiva en tiempo real
  durante una partida en curso.

## Comandos

```bash
python src/ingest.py --n 20          # descarga de prueba
python src/parse_fase1.py            # parseo de telemetría
streamlit run app/main.py            # aplicación Streamlit en local
pdflatex documento/documento.tex     # documento (ejecutar dos veces)

cd app && npm run dev                # app React (Vite) en local
cd app && npm run build              # build de producción de la app React
```

## Bitácora de decisiones

Añade aquí lo que se resuelva en cada sesión, con fecha. Evita repetir
discusiones ya cerradas.

- **2026-09-13** — Se inicia una segunda interfaz, en **React + Vite +
  TypeScript**, dentro del mismo directorio `app/` que la app Streamlit
  (`app/main.py`), sin tocar ni reemplazar esta última. Es una app
  **completamente estática**: sin backend, sin llamadas a la API de PUBG ni a
  ningún servicio externo, sin ejecución de modelos en el cliente. Lee tres
  JSON precalculados por el notebook (`app/public/datos/partidas.json`,
  `perfiles.json`, `metricas.json`) — todavía no existen; hasta que se
  generen, la interfaz muestra estados vacíos explícitos y los tipos en
  `app/src/types/datos.ts` quedan como `unknown` con `TODO`. Stack fijado
  verificando versiones en el registro de npm ese mismo día: Vite 8.3,
  React 19.2, TypeScript ~6.0, Tailwind CSS 4.3 (vía `@tailwindcss/vite`),
  Recharts 3.10, Motion 13.2. Primera entrega acordada: solo selector de
  partida + curva de probabilidad, sin informe/perfiles/métricas.
- **2026-09-13** — Primera entrega completada: `usePartidas` carga
  `public/datos/partidas.json` con `fetch`; `SelectorPartida` y
  `CurvaProbabilidad` (Recharts, animada, con `ReferenceDot` en minutos con
  caída de probabilidad > 10 puntos y tooltip con vivos/salud/fase/equipos
  restantes) quedan implementados y probados de punta a punta en el navegador
  (`npm run dev`, sin errores de consola). `Informe`, `PerfilesRadar` y
  `TablaModelos` siguen como esqueleto a la espera de la siguiente entrega.
- **2026-09-13** — Vista de Informe implementada: veredicto, confianza,
  resumen, momento crítico y las tres listas (factores a favor/en contra,
  recomendaciones), con estado vacío explícito por lista cuando viene vacía
  en el JSON (p. ej. "Sin factores a favor registrados"), no un valor de
  relleno. Probada en el navegador con una partida "Adversa" sin factores a
  favor. `PerfilesRadar` y `TablaModelos` siguen pendientes.
- **2026-09-13** — Vista de Perfiles implementada: `usePerfiles` carga
  `perfiles.json`; un radar (Recharts) por grupo (grupo vs. promedio general),
  en vez de un radar único con las 4 series superpuestas, siguiendo el skill
  de dataviz (patrón "emphasis": 1 color de acento + gris para el contexto).
  Cada eje se normaliza entre el mínimo y máximo observado para esa
  característica —las características vienen en escalas muy distintas (salud
  0-100 vs. variabilidad 0-1) y Recharts usa un solo eje radial compartido—
  pero el tooltip siempre muestra el valor real sin normalizar, nunca solo la
  posición normalizada. Probado en el navegador: los 4 radares y el tooltip
  con valores reales funcionan correctamente. `TablaModelos` sigue pendiente.
- **2026-09-16** — Rediseño "hablarle al jugador" (`PROMPT_REDISENO.md`),
  bloque 1 (lenguaje) completado. Diccionario centralizado en `src/texto.ts`
  (`Equipos en la partida`, `Minutos analizados`, `Compañeros en pie`, `Salud
  del equipo`, `Cierre de la zona`, `formatResultado`). En `SelectorPartida`
  las columnas "Posición final" y "Clasificó" se fusionaron en una sola
  "Resultado" (`Top 25 % · Terminó 4° de 21`), con un icono de ayuda accesible
  (`AyudaTop25.tsx`, botón con `aria-expanded`, no depende de hover) una sola
  vez en la cabecera de la columna. Dos vacíos de datos que el prompt asume
  resueltos, decisión tomada con el usuario: `referencia_fase` no existe en
  `partidas.json` — se calcula en el cliente agregando las partidas cargadas
  con `clasifico === true` por fase, sin tocar el notebook ni `datos/`; los
  "escenarios alternativos" del informe tampoco existen como campo y se omiten
  (requieren corridas del modelo que esta app no hace).
  Componentes que quedan con colores literales (Tailwind `slate-*`,
  `emerald-*`, `rose-*`, hexes sueltos en `stroke`/`fill`) pendientes de
  migrar a los tokens del tema cuando llegue el bloque 5 (identidad visual):
  `AyudaTop25`, `SelectorPartida`, `CurvaProbabilidad`, `TablaModelos`,
  `PerfilesRadar`, `EstadoVacio`, `AvisoTratamiento`, `AnalizarPartida`,
  `App.tsx`, `colores.ts`.
- **2026-09-16** — Bloque 2 (forma de la curva) completado. `src/forma.ts`
  clasifica cada partida por la forma de `minutos[].probabilidad` (solo datos
  no nulos; menos de 3 puntos válidos → `'Sin datos suficientes'`). Se evalúa
  en este orden, gana la primera regla que se cumple:
  1. **Remontada** — el mínimo de toda la curva es `< 0.30` y el último valor
     válido es `> 0.50`.
  2. **Caída temprana** — entre los minutos 0-5 hay una caída `>= 0.15`
     respecto del máximo hasta ese punto, y el cierre no recupera ese máximo
     (margen de `0.05`).
  3. **Desplome** — el máximo de los minutos 0-10 es `>= 0.5` y cae `>= 0.20`
     en los últimos 4 minutos (11-14), cerrando por debajo de `0.40`.
  4. **Dominante** — el promedio de los minutos 10-14 es `>= 0.55` y el
     mínimo de toda la curva nunca bajó de `0.35`.
  5. **Reñida** — cualquier otro caso.
  Verificado contra las 40 partidas de `partidas.json`: la distribución no
  degenera en una sola categoría (13 Dominante, 9 Reñida, 8 Caída temprana,
  6 Desplome, 2 Remontada, 2 Sin datos suficientes). `SelectorPartida` pasó de
  tabla a tarjetas con la forma como distintivo y una fila de chips para
  filtrar (multi-selección, sin filtro activo = muestra todas).
- **2026-09-16** — Bloque 3 (las 3-4 preguntas del detalle) completado.
  Nuevo `src/analisisPartida.ts` con las funciones puras que necesitaba el
  detalle: `calcularPercentil` (fórmula corregida por el usuario:
  `(escuadrones - posicion_final) / (escuadrones - 1)`, 0 % el último lugar,
  100 % el primero), `probabilidadMaxima`, `extraerMinutoCritico` (parsea
  "Minuto N" de `informe.momento_critico` con regex), `minutosDelMomentoCritico`
  (ese minuto y el anterior, para mostrar qué cambió) y
  `calcularReferenciaFase` — la agregación en el cliente de `referencia_fase`
  acordada con el usuario: promedio de salud/compañeros/distancia de las
  partidas cargadas con `clasifico === true` en esa fase, excluyendo la propia
  partida. `Informe.tsx` quedó reorganizado en las 4 preguntas exactas del
  prompt y carga el corpus con `usePartidas()` para la comparación (se
  reutiliza también en la pestaña "Analizar mi partida", que no tenía antes
  ese corpus de referencia). "Compañeros perdidos" muestra un conteo positivo
  (`anterior.vivos - actual.vivos`, nunca negativo), no un delta con signo,
  para que no se lea al revés. `CurvaProbabilidad` cambió de marcar todas las
  caídas >10 pt a marcar un solo punto: el minuto de `momento_critico`. Sin
  "escenarios alternativos" (no existen como campo). Probado en el navegador
  con una partida "Dominante" (percentil 81 %, sin compañeros perdidos) y una
  "Desplome" (percentil 90 %, -12.3 de salud, comparación contra la
  referencia con números reales de ambos lados).
- **2026-09-16** — Bloque 4 (pestaña "Cómo funciona") completado. En
  `App.tsx` la pestaña `Modelos` se renombró a `Cómo funciona` y pasó al
  final del orden (`Partida, Perfiles, Analizar mi partida, Cómo funciona`).
  `TablaModelos.tsx` gana una línea introductoria ("Detalle técnico de cómo
  se construyó y evaluó el modelo, para quien quiera revisar el rigor del
  análisis") y un icono de ayuda junto a cada cabecera de métrica (AUC,
  Brier, AP) con su traducción, tal como las da el prompt. El componente
  `AyudaTop25` se generalizó en `Ayuda.tsx` (recibe `texto`/`etiqueta`) para
  reutilizar el mismo patrón accesible en ambos lugares.
  `AvisoTratamiento.tsx` mencionaba la pestaña vieja por nombre ("Modelos")
  y quedó actualizado a "Cómo funciona". Probado en el navegador: la pestaña
  se ve al final, la intro y los tres tooltips de métrica se leen y abren
  correctamente.
- **2026-09-16** — Bloque 5 (identidad visual) completado.
  **Paleta** en `src/colores.ts`, validada con el script del skill de
  dataviz (`node scripts/validate_palette.js "#2f8fd1,#d9603f" --mode dark
  --surface "#0d1420"`, las 5 verificaciones en verde): `fondo` `#0d1420`,
  `superficie` `#141d2e`, `tinta` `#e8ecf1`, `tinta-secundaria` `#8b96a8`,
  `zona` `#2f8fd1` (frío, zona segura/curva favorable), `peligro` `#d9603f`
  (cálido, peligro/curva adversa). Registrada como tokens de Tailwind v4
  (`@theme` en `index.css`) para usarse como clases (`bg-fondo`,
  `text-zona`, etc.). El color dejó de ser decorativo: los badges de
  Resultado, Forma y Confianza que antes usaban una paleta ad hoc
  (emerald/rose/amber/sky/orange) ahora solo usan zona/peligro/tinta-secundaria
  según si la curva o el resultado son favorables, adversos o neutrales.
  Verifiqué el contraste de los botones con fondo `zona`: texto blanco daba
  3.52:1 (insuficiente); se cambió a `text-fondo` (5.25:1, pasa AA) en
  `AvisoTratamiento` y `AnalizarPartida`.
  **Tipografía**: `Barlow Condensed` 600/700 (cifras/HUD) e `Inter` 400/500/600
  (texto), cargadas por `<link>` en `index.html` (un `@import` de Google
  Fonts después de `@import "tailwindcss"` en el CSS genera un warning de
  build porque dejó de ser el primer `@import` real). Tokens `--font-cifra`/
  `--font-texto` en `@theme`. Los números "héroe" (posición, percentil,
  probabilidad máxima, deltas del momento crítico, cifras del corpus en
  "Cómo funciona") usan `font-cifra` a mayor tamaño.
  **Textura**: patrón topográfico SVG propio (`feTurbulence`+
  `feDisplacementMap` sobre unos círculos, nada extraído del juego) como
  `background-image` de `body` en `index.css`, opacidad de trazo 0.07.
  **Animación única**: nuevo `CirculoCierre.tsx` — un anillo que se cierra
  (radio 44→14px) sincronizado con los 900 ms del trazo de la curva en
  `CurvaProbabilidad`, coloreado según si la partida clasificó. Respeta
  `prefers-reduced-motion` vía el nuevo hook `usePrefersReducedMotion`
  (también apaga `isAnimationActive` de la línea de Recharts). Se retiraron
  los fade-in genéricos de `motion.div` en `CurvaProbabilidad` e `Informe`,
  y las `transition-colors` de hover en las tarjetas/chips de
  `SelectorPartida` — el prompt los señala como "el recurso genérico".
  Se mantuvo la barra de progreso animada de `AnalizarPartida`
  (`BarraProgreso`): no es un efecto de entrada, comunica un estado real
  (espera de red de hasta 90 s) y quitarla dañaría la usabilidad.
  **Frase de victoria** (`FRASE_VICTORIA` en `texto.ts`): texto propio para
  el primer lugar en `Informe`, sin repetir el eslogan del juego.
  Verificado con `npm run build` (sin warnings) y en el navegador: las 4
  pestañas, tarjetas, curva con el círculo, radares y tabla de modelos.
  Nota de proceso: en esta sesión el navegador automatizado mostró dos veces
  una captura de pantalla parcial/con artefactos (línea de la curva o
  radares "cortados") que no correspondía al DOM real — confirmado
  inspeccionando los atributos SVG (`d`, `points`) por JavaScript, que
  siempre estaban completos y correctos; un scroll mínimo forzaba el
  repintado y la captura siguiente ya se veía bien. Es un glitch de la
  herramienta de captura, no un bug de la aplicación.
- **2026-09-16** — Los JSON se regeneraron con datos reales que antes se
  calculaban en el cliente; el frontend se ajustó para usarlos.
  `partidas.json` (ahora 200 partidas, antes 40) trae `percentil` (escala
  0-100, no 0-1), `probabilidad_maxima` (0-1, igual que
  `minutos[].probabilidad`) y `momento_critico: {minuto, caida}`
  (estructurado) por partida. `Informe.tsx` los usa directamente y solo cae a
  `calcularPercentil`/`probabilidadMaxima`/`extraerMinutoCritico` de
  `analisisPartida.ts` si faltan — pasa con la partida que devuelve en vivo
  `servicio/analisis.py`, que no trae estos tres campos (no se tocó el
  backend Python). `metricas.json` trae `referencia_fase`: mediana real de
  salud/compañeros/distancia/desplazamiento por fase de los equipos que
  llegan al top 25 %, y reemplaza el agregado que `Informe.tsx` calculaba en
  el cliente (`calcularReferenciaFase`, eliminada). La pregunta "¿Qué
  hicieron distinto los que llegaron?" ahora dice "en mediana" y ya no
  reporta un conteo de observaciones (ese campo no viene en la referencia);
  no se usa `desplazamiento` porque la partida no trae ese dato por minuto
  para comparar. `informe.confianza` dejó de ser una etiqueta cerrada
  (Alta/Media/Baja) y ahora es una frase de cobertura real, p. ej. "15 de 15
  minutos analizados"; el badge ya no mapea por texto exacto sino que
  `proporcionCobertura` (nueva) parsea "N de M" y colorea por la proporción
  real. Verificado con `npm run build` y en el navegador contra el corpus de
  200 partidas.
- **2026-09-16** — Pestaña Partida: casos destacados + layout de dos
  columnas. `src/destacados.ts` elige 3 partidas por forma (Desplome,
  Remontada, Dominante) con un criterio por qué tan extremo es el rasgo que
  define esa forma, no al azar ni por posición en el JSON:
  - **Desplome** ("¿Cómo se pierde una partida ganada?") — mayor caída entre
    el mejor momento de la curva y el cierre (`magnitudDesplome` en
    `forma.ts`).
  - **Remontada** ("¿Cómo se remonta?") — mayor recuperación entre el peor
    momento y el cierre (`magnitudRemontada`).
  - **Dominante** ("¿Cómo se ve una partida dominada?") — mayor probabilidad
    promedio sostenida en toda la curva (`nivelDominante`), no solo el
    último tramo (que es lo que exige la regla de clasificación).
  Cada tarjeta (`TarjetaPartida.tsx`, ahora compartida entre destacados y la
  lista completa) suma un `Sparkline.tsx` propio en SVG plano (sin ejes ni
  tooltip, solo la forma) coloreado con el mismo criterio zona/peligro que el
  resto de la app. La lista completa de 200 partidas quedó detrás del botón
  "Ver las 200 partidas", con un buscador nuevo por ID de partida (no hay
  nombre de jugador en este dataset) y los mismos chips de forma; con
  scroll propio (`max-h-[70vh]`) para no alargar la página.
  `App.tsx`: la pestaña Partida pasó a dos columnas (`grid lg:grid-cols-3`,
  selector `lg:col-span-1`, curva+informe `lg:col-span-2 lg:sticky lg:top-4`)
  para que el análisis quede siempre visible sin desplazar la página aunque
  la lista de la izquierda sea larga; el contenedor general pasó de
  `max-w-5xl` a `max-w-7xl` para darle aire a las dos columnas. Nota: no pude
  verificar el apilado en pantalla angosta con la herramienta de
  automatización (`resize_window` no cambió el viewport real en esta sesión,
  se quedó en 1920×951) — el layout usa el mismo patrón `lg:` de Tailwind ya
  verificado en `PerfilesRadar`, pero falta confirmarlo visualmente en una
  pantalla angosta real.
- **2026-09-16** — Se quitó el buscador por ID de partida de la lista
  completa (decisión del usuario: nadie busca por identificador y el
  dataset no tiene nombre de jugador). Quedan solo los chips de forma de
  curva como filtro en `SelectorPartida.tsx`.
