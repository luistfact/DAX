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

## Despliegue

- El servicio (`servicio/`) corre en Render con Auto-Deploy desde `main`:
  cada push a `main` lo redespliega sin intervención.
- **Al configurar variables de entorno en Render, pega el contenido del
  archivo de la clave, nunca su nombre**, y verifica el prefijo antes de
  guardar: `eyJ` para `PUBG_API_KEY`, `sk-` para `OPENAI_API_KEY`. Ya pasó
  dos veces que el valor quedó como `pubg_key.txt` u `openai_key.txt`.

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
- **2026-09-16** — `servicio/main.py`: `FRONTEND_ORIGIN` ahora admite varios
  orígenes separados por coma (p. ej. preview y producción a la vez), y
  `http://localhost:5173` queda permitido siempre, incluso en despliegue,
  para poder probar en local contra el servicio ya desplegado en Render sin
  tocar la variable de entorno. Verificado con `curl -H Origin: ...` contra
  el servicio local: `localhost:5173` recibe el header
  `access-control-allow-origin`, un origen no listado no lo recibe.
- **2026-09-16** — `perfiles.json` trae `nombre` y `descripcion` por grupo.
  `PerfilesRadar.tsx` usa `grupo.nombre` en vez de "Grupo N" en el título de
  cada tarjeta, y muestra `grupo.descripcion` como texto bajo el radar.
  Verificado en el navegador: los 4 grupos ("Periféricos", "Rotadores",
  "Centrales", "Castigados") con su descripción.
- **2026-09-16** — `servicio/requirements.txt`: se agregó `openai==3.14.1`
  (versión fijada, más reciente disponible ese día) de cara al asistente,
  para no tener que redesplegar solo por esto más adelante. Verificado con
  `pip download --only-binary=:all: --python-version 3.13` (hay wheel
  `py3-none-any`) y con `pip install --dry-run -r requirements.txt`: resuelve
  sin conflictos con el resto del archivo (pydantic-core, httpx, etc.).
- **2026-09-16** — Primera entrega de `PROMPT_ASISTENTE.md`: endpoint
  `POST /asistente` en `servicio/`, probado en local. Verifiqué la forma real
  de la Responses API contra el SDK `openai==3.14.1` instalado (no contra un
  resumen de docs): `client.responses.create(model=, instructions=, input=,
  tools=, max_output_tokens=)`; tool calls en `response.output` como items
  `type="function_call"`; se responden con
  `{"type": "function_call_output", "call_id":, "output":}`.
  Archivos nuevos: `servicio/forma.py` (puerto exacto de `app/src/forma.ts` —
  verificado sin ninguna diferencia contra las 200 partidas reales),
  `servicio/herramientas.py` (las 5 funciones, leen
  `app/public/datos/{partidas,metricas,perfiles}.json`),
  `servicio/instruccion_asistente.md` (system prompt versionado, no
  incrustado en código), `servicio/asistente.py` (el bucle de tool calls y
  `validar_respuesta`, puerto de `validar_informe` de la sección 14 del
  notebook: mismo regex de cifras y tolerancia de 2, pero contra el JSON de
  los resultados de herramientas del turno en vez de una sola tabla).
  `perfil_estilo` ya no está bloqueada: el usuario regeneró `partidas.json`
  con `grupo_estilo` (entero) antes de esta prueba, así que la herramienta
  responde con el `nombre` real de `perfiles.json` ("Rotadores", etc.), no el
  número de grupo.
  Límite acordado: 10 peticiones/minuto por IP (`@limiter.limit` en
  `main.py`, igual que `/analizar`).
  Dos bugs reales encontrados y corregidos al probar de verdad (no solo
  import): (1) al reinyectar `response.output` como `input` del siguiente
  turno, `item.model_dump()` sin `by_alias=True` exportaba el campo interno
  del SDK `async_` en vez de `async` (la API lo rechazaba con "Unknown
  parameter") — se corrigió con
  `model_dump(mode="json", by_alias=True, exclude_none=True)`. (2) el
  registro de consumo de tokens usaba `logger.info(...)` pero no había
  ningún `logging.basicConfig` en todo el servicio, así que esos logs nunca
  se emitían (nivel implícito WARNING) — se agregó `logging.basicConfig` al
  inicio de `main.py`. Ambos bugs solo aparecieron al correr el servidor sin
  `--reload` y probarlo con `curl` de verdad, no al solo importar el módulo.
  Nota aparte: `uvicorn --reload` (WatchFiles) dejó de aplicar cambios de
  archivo a mitad de esta sesión sin avisar (mostraba "Reloading..." pero
  servía código viejo) — cuando una prueba no refleje un cambio reciente,
  reiniciar el proceso sin `--reload` antes de sospechar del código.
  Probadas las 4 preguntas de la primera entrega contra la partida real
  `053b957b-1`: una herramienta (momento crítico), dos herramientas (momento
  crítico + comparación contra la referencia), fuera de tema (redirección
  sin herramientas) y la trampa de bajas (reconoce que no tiene el dato).
  Pendiente, fuera de esta entrega: interfaz de chat en el frontend y el
  presupuesto mensual en el panel de OpenAI (no es código).
- **2026-09-16** — Interfaz de chat del asistente: `AsistenteChat.tsx`, nuevo,
  dentro de la vista de partida (debajo de `Informe`, no en pestaña aparte),
  solo cuando hay una partida seleccionada. No se agregó a "Analizar mi
  partida": esa partida en vivo nunca se persiste en `partidas.json`, así que
  `servicio/herramientas.py` no podría encontrarla por id (mismo límite ya
  anotado en el bloque del backend); agregar el chat ahí solo mostraría un
  error siempre. Tres preguntas sugeridas como chips (solo antes del primer
  mensaje), indicador "Escribiendo…" sin animación nueva (no hace falta otra
  después de la del bloque 5), y debajo de cada respuesta del asistente una
  línea discreta con las herramientas que consultó, en lenguaje llano
  ("consultó el momento crítico", "consultó tu estilo de juego"...). Errores
  de red o del servicio se traducen a un mensaje fijo en español, nunca el
  cuerpo crudo de la API. Conversación sin memoria entre partidas: cambiar de
  partida reinicia el chat. Probado en el navegador con dos preguntas
  seguidas sobre la misma partida (momento crítico, luego estilo de juego):
  cita cifras reales, mantiene el hilo, y muestra el indicador de herramienta
  bajo cada respuesta.
- **2026-09-17** — El chat ahora también funciona en "Analizar mi partida"
  (decisión del usuario, revirtiendo la exclusión del bloque anterior).
  Cambió el contrato de `/asistente`: `SolicitudAsistente` gana `partida:
  dict | None` opcional con la partida completa; ausente para las partidas
  del corpus (el backend ya la tiene), presente para la partida en vivo que
  nunca se persiste. `herramientas.py` gana `_resolver_partida(partida_id,
  partida_en_vivo)` — usa la partida en vivo si su `id` coincide, si no cae
  al corpus — y las 5 herramientas reciben `partida_en_vivo` como kwarg
  inyectado por `asistente.py` (no por el modelo: no está en el schema de
  `TOOLS`). En el frontend, `analisisPartida.ts` gana
  `enriquecerParaAsistente(partida)`: la partida en vivo no trae
  `percentil`/`probabilidad_maxima`/`momento_critico` (nunca se persiste), así
  que `AsistenteChat.tsx` los calcula con las mismas funciones de respaldo
  que ya usaba `Informe.tsx` antes de mandarla al backend — un solo lugar
  para ese cálculo, no dos. `grupo_estilo` sigue sin equivalente para una
  partida en vivo (no hay forma de recalcularlo sin el modelo de
  perfilamiento, que no está desplegado); `perfil_estilo` devuelve "no
  disponible" ahí, correctamente. `AnalizarPartida.tsx` ahora también monta
  `AsistenteChat`. Probado por API con una partida sintética fuera del
  corpus y en el navegador con `laze-9527` real vía "Analizar mi partida":
  el chat consultó `momento_critico` y `estado_por_minuto` y respondió con
  las cifras reales de esa partida en vivo.
- **2026-09-19** — Botón flotante del asistente en las 4 pestañas, y cuarta
  capa de dominio: el proyecto en sí. `AsistenteChat.tsx` ya no vive
  incrustado en la vista de partida; `AsistenteFlotante.tsx` (nuevo) lo
  envuelve en un botón fijo (`fixed bottom-4 right-4`) montado una sola vez
  en `App.tsx`, visible siempre tras aceptar el aviso de tratamiento.
  `useAnalisis()` subió de `AnalizarPartida.tsx` a `App.tsx` (esta ahora
  recibe `estado`/`analizar`/`reiniciar` por props, tipados con
  `ReturnType<typeof useAnalisis>`) para que el botón flotante sepa cuál es
  la partida activa del análisis en vivo sin duplicar el hook.
  `partida_id` pasó a ser opcional en `SolicitudAsistente` (`main.py`) y en
  `responder()` (`asistente.py`): sin partida cargada (Perfiles, Cómo
  funciona, o Partida/Analizar sin selección) el asistente solo puede hablar
  del proyecto en general, con la ficha técnica agregada a
  `instruccion_asistente.md` (fuente, corpus, unidad de análisis, objetivo,
  los 11 predictores, los 5 modelos con su rango de AUC, el agrupamiento
  K-medias y su ARI, los 3 hallazgos y las limitaciones) — dos registros
  según cómo pregunten (llano vs. técnico), a elección del propio modelo.
  Corregí una consecuencia real de esto: `validar_respuesta` comparaba las
  cifras de la ficha (150 partidas, AUC 0.677–0.698, etc.) contra los
  resultados de herramientas de ese turno, que están vacíos en una respuesta
  de nivel "proyecto" — todas esas cifras habrían salido "sospechosas" y
  activado el reintento/rechazo. Ahora `_validar_si_corresponde` salta la
  validación por completo cuando no se invocó ninguna herramienta en el
  turno (nivel proyecto, un "no lo sé", o una redirección), y solo valida
  cuando sí hubo herramientas de por medio (nivel partida). Probado por API:
  pregunta llana ("¿Esto cómo funciona?") sin tecnicismos; pregunta técnica
  (AUC, modelos, agrupamiento) con las cifras exactas de la ficha; pregunta
  sobre "esta partida" sin ninguna cargada → "no tengo esa información".
  Probado en el navegador: el botón aparece en las 4 pestañas, y desde
  Perfiles (sin partida) responde en modo "Pregúntale al proyecto".
- **2026-09-23** — Tres mejoras de `PROMPT_TRES_MEJORAS.md` (paso 2).
  **Escenarios** (`Escenarios.tsx`, dentro de «¿Qué hago la próxima?» de
  `Informe.tsx`): tarjetas con barra base→alterna y diferencia en puntos;
  se destaca la de mayor ganancia solo si `aplica` y sube ≥ 1 punto (32 de
  200 partidas no tienen ninguna así, y no se destaca nada). `|diferencia|`
  < 1 punto → «Apenas cambia», sin cifra. `aplica === false` → logro
  («Ya llegaste completo, bien ahí»; «salud casi entera», porque el peor
  momento de esos escuadrones va de 91 a 100). **Solo dos escenarios**
  (completo, sin daño): el usuario retiró «Rotar antes» del notebook porque
  `dist_rel` está confundida con la fase y fijarla en 0.30 toda la partida
  genera estados que ningún escuadrón tiene en las fases finales — daba
  caídas de hasta 19 puntos que se habrían leído como consejo falso. `aplica`
  se calcula sobre el peor momento de la partida, no el promedio (con el
  promedio, 51 partidas marcaban "completo" aunque perdieron gente al
  final). Si aparece una diferencia negativa ≥ 1 punto con `aplica = true`,
  se muestra: «Según el modelo, esto no habría mejorado tu resultado: la
  probabilidad baja de X a Y» (hoy las 11 negativas son < 1 punto y salen
  como «Apenas cambia»). Aviso de asociación vs. causalidad con el texto exacto
  del prompt, a tamaño normal. En «Analizar mi partida» no hay escenarios
  (salen de la red recurrente; el servicio usa la red densa): aviso
  breve, decisión del usuario.
  **Compartir** (`compartir.ts` + `BotonCompartir.tsx`, en la cabecera de
  `CurvaProbabilidad`, ambas pestañas): Canvas 2D nativo, sin dependencias
  (decisión del usuario), 1080×1080 PNG dibujado desde los datos —no una
  captura—; espera `document.fonts.load` porque el canvas cae en silencio a
  la fuente genérica si Barlow/Inter no están cargadas. Descarga local con
  `toBlob` + `<a download>`, nada se sube.
  **Mapa** (solo en vivo): `servicio/analisis.py` agrega `mapa` a la
  respuesta de `/analizar` (`_construir_mapa`): `trayectoria` (centroide por
  minuto), `zonas` (último estado del círculo en cada minuto, radio > 0,
  recortadas al último minuto con posiciones del escuadrón) y `eventos`
  (bajas del escuadrón de `LogPlayerKillV2`/`LogPlayerKill`). Las bajas solo
  traen `_D`: se pasan al reloj de `elapsedTime` con el desfase mediano
  `_D − elapsedTime` de las posiciones del propio equipo. Verificado contra
  `time_survived` de la API con `laze-9527` (251/438/495 s → minutos 4/7/8,
  exactos). La columna `vivos` de la tabla va rezagada respecto de las bajas
  porque los muertos siguen emitiendo `LogPlayerPosition` un rato; es el
  mismo comportamiento del entrenamiento y no se tocó. `MapaPartida.tsx`:
  SVG propio en coordenadas normalizadas, encuadre alrededor del recorrido,
  las bajas y el círculo más pequeño (el mapa completo dejaría el recorrido
  como un punto), deslizador de minuto sincronizado con la curva
  (`onMouseMove` de `LineChart` → `activeLabel`, firma verificada en los
  tipos de Recharts 3.10; la curva marca el minuto elegido con una
  `ReferenceLine`).
- **2026-09-23** — Corrección de documentación: el servicio en vivo usa la
  **red densa** (`modelo_supervisado.pkl` = Pipeline imputación + escalado +
  `MLPClassifier` (64, 32), 78 KB, verificado cargando el archivo), no el
  bosque aleatorio. Actualizados el docstring de `servicio/modelos.py` y la
  entrada anterior de esta bitácora. `instruccion_asistente.md` solo lista
  los modelos comparados y no dice cuál sirve el servicio; no se tocó.
- **2026-09-23** — `servicio/analisis.py`: `LIMITE_ALCANZADO` ya no disfraza
  otros errores. `_get` (en `zonaazul.py`, que no se toca porque lo regenera
  el notebook) lanza `RuntimeError("Reintentos agotados…")` solo tras 429/5xx
  repetidos, y `RuntimeError("HTTP nnn: …")` para cualquier otro código.
  Antes todo `RuntimeError` de `/players` salía como "Demasiadas consultas";
  ahora solo el primero, y el resto sale como `SERVICIO_NO_DISPONIBLE` con
  el código real de PUBG en el log (`logger.error`). Motivo: en Render
  `/analizar` devolvía 429 a todas las peticiones mientras la clave local
  tenía cuota (9 de 10 restantes). **Causa confirmada** con el log nuevo
  (`HTTP 401: Unauthorized` de `/players`): el valor de `PUBG_API_KEY` en
  Render era el nombre del archivo, `"pubg_key.txt"`, no su contenido — el
  mismo error que ya había ocurrido con `OPENAI_API_KEY`. El usuario lo
  corrigió en Render; `/analizar` en `dax-li6v.onrender.com` respondió 200
  con `mapa` (9 minutos, 9 zonas, 3 bajas), idéntico al servicio local.
  Regla agregada en la sección «Despliegue».
- **2026-09-26** — Leyenda de alcance en positivo y modo claro/oscuro.
  **Textos**: subtítulo de la cabecera → «Aprende de tus partidas: revisamos
  lo que ya jugaste para que sepas qué mejorar en la siguiente.»; en
  `AvisoTratamiento` la limitación queda «Analizamos partidas que ya
  terminaron. No da ventaja en tiempo real: es tu repetición, explicada.»
  **Tema**: se cierra la migración a tokens pendiente desde el bloque 1
  (`bg-white/*` → `bg-tinta/*`, `bg-black/70` → `bg-velo`, estilos inline y
  `COLOR_*` de Recharts/mapa/sparkline/círculo → `usePaleta()`). Fuera de
  `colores.ts`, solo `compartir.ts` usa colores fijos, a propósito: la
  imagen para compartir siempre sale en oscuro (`PALETA_OSCURA`).
  `colores.ts` exporta `PALETA_OSCURA`/`PALETA_CLARA`; `index.css` las
  replica como tokens (`@theme` = oscuro, `:root[data-theme="light"]` =
  claro, incluida la textura vía `--textura`) — deben coincidir.
  `hooks/useTema.ts`: `data-theme` de `<html>` es la fuente de verdad
  (`useSyncExternalStore` + `MutationObserver`), la elección se guarda en
  `localStorage` (`zonaazul-tema`) y gana sobre `prefers-color-scheme`; sin
  elección, sigue al sistema incluso si cambia con la página abierta. Script
  en línea en `index.html` fija el tema antes de montar React (sin
  destello). `BotonTema.tsx` (Sun/Moon de `lucide-react`, dependencia nueva
  pedida por el usuario, +5.7 kB al bundle; el aviso de chunk >500 kB ya
  existía en `HEAD`), `aria-label="Modo oscuro"` + `aria-pressed`.
  **Paleta clara** final: fondo `#f5f7fa`, superficie `#ffffff`, tinta
  `#0d1420`, tinta secundaria `#5b6678`, zona `#1a65a0`, peligro `#a84126`.
  La propuesta (`#1f6fae`/`#b8482b`) pasaba `validate_palette.js`, pero el
  texto de los distintivos (acento sobre acento al 15 %) daba 4.3:1; se
  oscurecieron los acentos (4.9:1) y siguen pasando las 5 verificaciones.
  **Pendiente**: en modo oscuro esos mismos distintivos dan 3.9:1 (ya desde
  el bloque 5); no se tocó la paleta oscura sin discutirlo.
  Verificado en el navegador en ambos modos: Partida, Perfiles, Analizar mi
  partida (estado vacío y análisis en vivo de `laze-9527` con mapa), Cómo
  funciona, aviso modal y asistente; Recharts y el mapa cambian de color
  sin recargar.
- **2026-09-29** — Rediseño BI (`PROMPT_BI.md`), fase 0 (correcciones de
  datos) completada, sin cambios visuales. Los JSON se regeneraron: 200
  escuadrones de **45** partidas del conjunto de prueba (verificado por
  `match_id`), `por_fase` trae `AP` y `metricas.json` trae `calibracion`
  (`red_densa`, `red_recurrente`). Nuevo `src/formato.ts` como único lugar de
  formato: `miles` (es-MX, 3,862), `metrica` (AUC/Brier/AP siempre a 3
  decimales), `pct`/`pct100` (nivel, «37 %» con espacio no separable), `pp`
  (diferencias entre probabilidades), `distanciaCirculo`/`cambioDistancia`
  (`dist_rel` = distancia al centro / radio de la zona, en «radios») y
  `espaciarPorcentajes` (solo tipografía sobre los textos ya redactados en el
  JSON, que traen «36%»). Perfiles: `mediana_pct_rank` va de 0 (ganador) a 1
  (último); se muestra `round((1 − r) × 100)` → Rotadores 60 %, Periféricos
  58 %, Centrales 48 %, Castigados 12 %. «Cómo funciona»: AUC por fase contra
  una línea en 0.5 (azar), y en gráfica aparte AP contra la tasa base, que es
  su referencia; leyenda arriba para no encimarse con el eje.
  `nombreModelo()` en `texto.ts` glosa «Impulso gradiente» como
  «Potenciación del gradiente (gradient boosting)» la primera vez. Textos que
  decían «partidas» por escuadrones corregidos, con la línea 150 partidas vs.
  200 escuadrones de 45 partidas. Aclaración junto a los filtros: la
  categoría es la forma de la curva, no el resultado (27 «Dominante» y 5
  «Remontada» terminaron fuera del top). `servicio/analisis.py`: momento
  crítico en pp y «36 % del tiempo» (autorizado por el usuario). Pendiente
  detectado, no tocado: el notebook tiene **dos** celdas con
  `resumen_determinista` (75 corregida con pp, 76 la versión vieja con
  `:.0%`); ejecutado de principio a fin, la 76 sobrescribe a la 75.
- **2026-09-29** — Rediseño BI, fase 1 (paleta y tipografía) completada.
  Tokens nuevos en `colores.ts` e `index.css` (`bunker`, `oliva`, `linea`,
  `texto`, `humo`, `zona-azul`, `ambar`, `ambar-dato`, `zona-roja`,
  `sobre-ambar`); `zona`/`peligro`/`tinta`/`superficie`/`fondo` ya no existen.
  Validación con `validate_palette.js`: la propuesta fallaba en oscuro (el
  ámbar `#F2A900` tiene L 0.785, fuera de la banda 0.48–0.67). Se separó en
  `ambar` `#F2A900` (solo el botón de acción, que no es una marca de datos) y
  `ambar-dato` `#CA8400` (top y Dominante en gráficas y distintivos); con el
  ámbar en banda, el rojo `#E5484D` quedaba a ΔE 6.7 para deuteranopía y se
  cambió a `#D33949` (mismo tono, ΔE 10.4). Claro: `#0D62D3`, `#C27B00`,
  `#BF1E2E` sobre `#F3F4EE`/`#FCFCF8`. Ambos temas pasan las 5
  verificaciones contra sus dos superficies. Reglas aplicadas: el texto nunca
  usa acentos (distintivos con texto en `texto` y el acento solo en fondo,
  borde o un punto); categorías Desplome rojo, Remontada azul, Dominante
  ámbar, el resto neutral; la curva siempre azul; el círculo de cierre ámbar
  si llegó al top y humo si no. **Oscuro por defecto**: ya no se sigue
  `prefers-color-scheme` (se quitó `seguirPreferenciaDelSistema`). Barlow
  (cuerpo) + Barlow Condensed (cifras y utilidad `titulo-seccion`, siempre en
  mayúsculas); `tabular-nums` en `body`; utilidad `etiqueta` (pequeña, en
  minúsculas, encima de la cifra). Recharts pinta los puntos de la línea en
  blanco por defecto: hay que pasar `fill` explícito.
- **2026-09-29** — Rediseño BI, fase 2 (estructura de tablero) completada.
  Pestañas `Resumen · Partidas · Perfiles · Metodología`; se abre en Resumen.
  `Resumen.tsx` (nuevo): qué hace la app en dos frases con un botón a
  Partidas, cifras del corpus, los 4 hallazgos del prompt (el 3 y el 4 con su
  cifra de apoyo leída de `perfiles.json` y `metricas.json`, no escrita a
  mano; el 1 y el 2 no tienen campo en los JSON y van solo como frase) y los
  4 perfiles como arquetipos ordenados por percentil. «Analizar mi partida»
  dejó de ser pestaña: `BuscadorJugador.tsx` en el encabezado («Tu nombre de
  usuario de PUBG», el único botón ámbar) lanza el análisis y lleva a
  Partidas, donde `AnalisisEnVivo.tsx` (antes `AnalizarPartida.tsx`, sin el
  formulario) ocupa la columna del reporte hasta «Volver al catálogo»;
  elegir un escuadrón de la lista también lo cierra. `useAnalisis.reiniciar`
  ahora aborta la petición en curso (antes, cancelar y recibir la respuesta
  tarde reabría el análisis), y los errores de red se muestran como un
  mensaje fijo en español en lugar del «Failed to fetch» del navegador.
  Ancho completo (sin `max-w`), lista de `minmax(320px,420px)` y reporte con
  el resto. Verificado a 390 px con un iframe (el cambio de tamaño de ventana
  no funciona con la herramienta): sin scroll horizontal y las 4 pestañas
  caben.
- **2026-09-29** — Rediseño BI, fase 3 (vista de partidas) completada.
  **Lista**: `catalogo.ts` (reemplaza `destacados.ts`) numera las partidas
  1 a 45 por orden de `match_id` (el corpus no guardó la fecha; el orden fijo
  hace que «Partida 7» sea siempre la misma) y nombra cada fila «Partida 7 ·
  Escuadrón 12»: hay varios escuadrones por partida, así que el nombre del
  prompt («Partida 7 · 21 equipos») sería ambiguo; los equipos van en la
  fila y en el subtítulo. `FilaEscuadron.tsx` (reemplaza `TarjetaPartida`):
  barra de categoría (Desplome rojo, Remontada azul, Dominante ámbar, el
  resto neutro), posición en grande y la curva en miniatura. Pastillas Todas,
  Desplomes, Remontadas y Dominadas (una a la vez; filtradas, van del caso más
  claro al menos claro con los puntajes de `forma.ts`) y la aclaración de
  forma vs. resultado. La lista es la columna fija con scroll propio; el
  reporte avanza con la página (antes lo fijo era el reporte, más alto que la
  pantalla). Partidas abre en el desplome más claro, nunca en blanco.
  **Reporte** (`Reporte.tsx`, compartido con el análisis en vivo): franja de
  5 indicadores, la meta traducida con `lugaresTop25` = ⌊1 + (equipos −
  1)/4⌋, la misma definición del objetivo ((posición − 1)/(equipos − 1) ≤
  0.25; con 28 equipos, 7), la curva y el informe. La curva usa un eje X
  numérico para poder sombrear las fases con `ReferenceArea` desde el medio
  minuto; íconos de `lucide-react` sobre la curva (`UserX` en rojo si bajan
  los vivos; `HeartCrack` en tinta si la salud cae ≥ 25 puntos en un minuto
  **sin** cambio de vivos, porque `hp_medio` promedia solo a los vivos); el
  tooltip se reemplazó por una línea vertical y `PanelMinuto` al lado, que
  abre en el momento crítico y también se maneja con botones anterior/
  siguiente (teclado). «¿Qué hicieron distinto los que llegaron?» se oculta
  entera si no hay referencia. `servicio/analisis.py` devuelve `fecha`
  (`createdAt` de la partida) y el análisis en vivo la muestra; **hace falta
  redesplegar en Render** para que llegue a producción, mientras tanto el
  subtítulo cae a «Erangel, escuadra». Eliminados `AyudaTop25.tsx`,
  `TarjetaPartida.tsx`, `destacados.ts`, `ESTILO_FORMA`, `AYUDA_TOP25` y
  `formatResultado`, sin uso tras el cambio.
- **2026-09-29** — Rediseño BI, fase 4 (Metodología) completada.
  `TablaModelos.tsx` → `Metodologia.tsx`, con `DiagramaFlujo.tsx` (SVG propio:
  API → telemetría → 11 variables por minuto → modelo → app y asistente; una
  versión horizontal y otra vertical para teléfono) y `CurvaCalibracion.tsx`.
  Se destacan los dos modelos que usa la app: red recurrente (curva del
  catálogo; la única que lee la trayectoria, según las conclusiones del
  notebook) y red densa (en vivo; 78 KB y sin TensorFlow, por los 512 MB del
  servidor). Gradient boosting: AUC más alto (0.698), 5 milésimas sobre la red
  densa. El argumento pedido era «no entrega probabilidad por minuto», pero
  eso también vale para la red densa, que sí se usa en vivo; se redactó como
  «predice con una foto de cada minuto, así que no reemplaza a la red
  recurrente en el catálogo». **Hallazgo de calibración** (datos de
  `metricas.calibracion`): la red densa se desvía 1.9 pp en promedio; la red
  recurrente **sobreestima en los 10 tramos, 19.4 pp en promedio** (dice 70 %
  → llega el 47 %). La pestaña lo dice tal cual y recomienda leer esas curvas
  como orden entre minutos, no como frecuencia; los textos se calculan de los
  datos. Recalibrarla es decisión pendiente del usuario (notebook).
- **2026-09-29** — Rediseño BI, fase 5 (asistente) completada en el
  frontend. El asistente se llama **Botsito** (decisión del usuario): botón
  flotante con el nombre a la vista (`lucide-react` en lugar de los SVG a
  mano), panel con `titulo-seccion` y los mismos tokens. `sugerencias.ts`
  (nuevo) arma las preguntas según la pantalla con datos reales: en Partidas
  «¿Por qué caí en el minuto N?» con el minuto crítico (o «momento clave» si
  la curva nunca bajó) y «¿Cuál es mi estilo de juego?» solo si la partida
  trae `grupo_estilo` (el análisis en vivo no lo trae); en Perfiles el grupo
  de mayor y el de menor percentil por nombre; Metodología y Resumen, del
  proyecto. El scroll de la conversación ya no usa `scrollIntoView` (movía la
  página). **Pendiente en el servidor, no tocado**: la ficha de
  `servicio/instruccion_asistente.md` tiene cifras de corpus viejas (46,886 /
  3,931 frente a 46,817 / 3,862 de `metricas.json`), no conoce los perfiles
  por nombre ni qué modelo usa cada parte de la app, así que «¿Qué distingue a
  los Rotadores?» y «¿Por qué usan dos modelos?» no tienen con qué
  responderse hasta actualizarla.
- **2026-09-29** — Resuelto el pendiente de la fase 5 (autorizado por el
  usuario): `servicio/instruccion_asistente.md` se presenta como Botsito y su
  ficha trae las cifras actuales de `metricas.json` (46,817 / 3,862), los 4
  perfiles con nombre, descripción, tamaño y percentil de `perfiles.json`, qué
  modelo usa cada parte de la app, la calibración, el AUC por fase y los
  hallazgos del Resumen. Si se regeneran los JSON, esta ficha se actualiza a
  mano. No probado contra OpenAI; requiere reiniciar el servicio y
  redesplegar en Render.
- **2026-09-29** — Botsito probado en local contra OpenAI (servicio sin
  `--reload`), con «¿Quién eres?» y las 6 sugerencias sin escuadrón.
  Primera ronda: se presentaba bien y usaba las cifras nuevas, pero
  interpretaba el percentil mediano 60 % de los Rotadores como «terminar en
  el cuarto superior» y atribuía a los Castigados conductas que la ficha no
  dice. La ficha ahora explica que el percentil no es la probabilidad de top
  25 % (el top equivale a percentil ≥ 75 %, que ningún grupo alcanza en
  mediana), prohíbe atribuir causas o conductas que no estén en ella y fija
  el ejemplo de «7 de cada 10» para explicar el AUC. Segunda ronda correcta,
  con un adorno menor que persiste («posicionarse estratégicamente»). El chat
  aplica `espaciarPorcentajes` a las respuestas («12%» → «12 %»). Probado
  también de punta a punta desde la interfaz, en Perfiles. De paso: los
  radares de Perfiles animaban su entrada sin respetar
  `prefers-reduced-motion` y contra la regla de una sola animación
  principal; se apagó. (En la herramienta de automatización la pestaña queda
  con `document.hidden = true`, lo que congela las animaciones de Recharts
  en su primer cuadro: un radar o una línea «vacíos» en una captura no son
  necesariamente un fallo.)
- **2026-09-30** — Complemento BI (`PROMPT_BI_COMPLEMENTO.md`), fase 1
  sustituida: paleta «carbón con tinte verde militar». Tokens con los nombres
  del complemento en ambos temas (`bg`, `card`, `card-2`, `line`, `text`,
  `muted`, `brand`, `on-brand`, `zone`, `danger`, `alive`, `violet`, `sand`,
  `zone-wash`, `phase-band`, `danger-wash`); clases `bg-bg`, `text-text`,
  `text-muted`, etc. Ajustes validados con `validate_palette.js` (aceptados
  por el usuario): zone `#4594F7` y danger `#F75247` un poco más oscuros (banda
  de luminosidad); violet `#B38CFF` → `#AF62C1` (era idéntico al azul para
  protanopía, ΔE 0.6). Centrales en arena (opción B del usuario: el verde
  queda para «compañero en pie»): `#A0906F` oscuro / `#8A7A5A` claro; falla
  a propósito el mínimo de saturación y queda en la franja de advertencia
  contra el rojo (ΔE 6.2), legal solo porque cada perfil lleva ícono y nombre;
  se separa del dorado ΔE 17.0 / 23.0 (condición del usuario: `#C9B98F`, la
  primera propuesta, quedaba a 10.7). El dorado es solo marca y acción:
  «Dominante» pasa a barra en `text` y el top se marca con un trofeo sin
  color. Tipografía: base de 15 px en `body` (no en `html`, que encogería las
  clases rem); nada por debajo de 12 px (ticks y rótulos de Recharts subidos);
  Saira Stencil One cargada para el título del héroe (fase 2), tres familias.
  JSON regenerados con `tam_real`, `causas_eliminacion` (4 categorías con
  «Otros»), `importancia` (bosque aleatorio, caída de AUC al permutar) y
  `curva_referencia` (307 escuadrones que clasificaron, todo el conjunto de
  prueba).
- **2026-09-30** — Complemento BI, fase 2. **Una sola animación**:
  `AnilloZona.tsx` (la zona cerrándose) detrás del título del héroe (modo
  `unaVez`) y como indicador de carga en el botón «Analizar» y en la espera
  del análisis en vivo (modo `bucle`); se quitaron `CirculoCierre`, el trazo
  animado de la curva, la barra de progreso animada y la animación de los
  radares. Héroe en Saira Stencil One con `Mira` (esquinas tipo mira, solo en
  héroe, franja de indicadores y curva). Cifras del corpus en una franja
  pequeña. Hallazgos como tarjetas de dato grande con evidencia leída de
  `metricas.json`: «5 %» + dona de `causas_eliminacion` (la zona en `zone`, el
  resto en grises); «3.9×» = variable de estado más importante / variable de
  posición más importante en `importancia` (barras con el estado en `alive`,
  la posición en `muted`; muestra modelo y métrica); «60 % · 58 %» con las
  barras de percentil por perfil; «0.637 → 0.759» con el AUC por fase desde
  0.5. `estiloPerfil.ts`: color e ícono por perfil (Rotadores zone/Route,
  Periféricos violet/Eye, Centrales sand/Crosshair, Castigados
  danger/Bandage; no HeartCrack, que en la curva es «golpe fuerte»).
  `PerfilesBarras.tsx` reemplaza los radares (opción 2 del usuario): barras
  divergentes contra el promedio, escaladas por característica al grupo que
  más se aleja, con el valor real y su unidad debajo. `FondoMapa.tsx`:
  cuadrícula A–H × 1–8 fija detrás del contenido. Pie de página con «Proyecto
  académico independiente…» y la frase de marca que exigen los términos de la
  API de PUBG, textual en inglés. `texto.ts` gana `etiquetaVariable` (los 11
  predictores) y `rotuloFase` («F1»…«F6», se aplica en la fase 3).
- **2026-09-30** — Complemento BI, fase 3. **Mapa oficial**: política leída
  (términos de la API: licencia no comercial, frase de marca obligatoria;
  guía de creadores de KRAFTON: no parecer contenido oficial, KRAFTON puede
  objetar; el enlace a la política de contenido de jugadores del repositorio
  da 404). No existe `Baltic_Main` en `pubg/api-assets`, solo `Erangel_Main`,
  actualizado en 2020 (parche 8.2) y de nuevo en 2022–2024. Alineación
  verificada con la partida real de `laze-9527` del 2026-09-29: aterrizaje y
  una baja sobre los edificios de la base militar, el recorrido sobre la
  carretera al puente este y el pueblo de la costa, círculos finales en
  tierra; la imagen ocupa [0, 1] × [0, 1] de las coordenadas normalizadas sin
  ajustes. `Erangel_Main_No_Text_Low_Res.png` (819 px, 1.1 MB) copiado a
  `app/public/mapas/`; en `MapaPartida` el recorrido se dibuja con la paleta
  oscura en ambos temas (el satélite es oscuro) y el crédito «Mapa: KRAFTON,
  Inc., vía pubg/api-assets» va sobre el mapa y en el pie de página.
  **Curva** (`ComposedChart`): área en `zone-wash`; banda del minuto crítico
  en `danger-wash` con etiqueta de datos reales («Min 12 · −30 pp · cae un
  compañero», la última parte solo si hubo baja o golpe); fases rotuladas F1
  a F6 en curva, panel, Metodología, informe y asistente (`rotuloFase`;
  `formatCierre` y `LABEL_CIERRE_ZONA` eliminados); curva de referencia de
  `metricas.curva_referencia` punteada, solo en el catálogo (sale de la red
  recurrente; mezclarla con la red densa del análisis en vivo no sería
  comparable); sin tasa base escalonada (decisión del usuario). **Panel tipo
  HUD**: barra de salud blanca (el verde ya es «en pie»), un soldado por
  integrante según `tam_real` (en vivo, el máximo de vivos, la misma regla del
  servicio), mini círculo con el punto del escuadrón para la distancia.
  **Lista**: el perfil va con ícono y nombre, sin color (la barra es la
  categoría de la curva). Recharts 3 hace enfocable el SVG de las gráficas: el
  contorno de foco se dejó solo para teclado (`:focus-visible`, en
  `index.css`).
- **2026-10-01** — Fase 4: recalibración de la red recurrente. El usuario la
  hizo en la exportación del notebook con escalado de Platt ajustado en
  validación; todas sus probabilidades visibles (curva, escenarios y
  `curva_referencia`) vienen recalibradas. `metricas.calibracion` trae
  `red_recurrente` (recalibrada), `red_recurrente_sin_recalibrar` y
  `recalibracion` {metodo, brier_antes 0.237, brier_despues 0.198}. Desviación
  media: 19.4 pp antes (sobreestimaba en los 10 tramos) → 1.2 pp después;
  AUC sin cambio (no altera el orden). `CurvaCalibracion.tsx` muestra las tres
  curvas (el «antes» punteado y hueco) con la frase de la causa: se entrenó
  compensando el desbalance de clases. La tarjeta de la red recurrente en
  Metodología muestra el Brier recalibrado; la tabla sigue con
  `metricas.modelos` (los modelos tal como se entrenaron) y una nota lo
  aclara. Ficha de Botsito actualizada. `.gitignore`: `zonaazul-*.png`, las
  imágenes que genera el botón Compartir al probarlo. Bajo el mapa del
  análisis en vivo: «El trazo une las posiciones de cada minuto; no es el
  camino exacto».
- **2026-10-01** — Commit `8b0a830` del rediseño BI completo (fases 0–4 y
  complemento), sin push. Pulido final (`PROMPT_PULIDO_FINAL.md`), bloque 1.
  Regla de color nueva: **verde = positivo, rojo = negativo** (`alive` /
  `danger`); verde claro `#008C56` → `#007A4B` (4.18:1 no pasaba AA como
  texto; ahora 5.3:1 en `card`, 4.6:1 en `card-2`). **Navegación de cristal**:
  el encabezado completo es `sticky` con `.nav-cristal` (`--card` al 90 % +
  `blur(14px)`; respaldo sólido con `@supports`). 90 % y no 80 % por el peor
  caso: con contenido blanco detrás (oscuro) o casi negro (claro), el texto
  secundario queda en 5.3 / 5.1:1; al 80 % bajaba a 3.7 / 4.0. La columna fija
  de Partidas usa `--alto-encabezado`, que `App.tsx` mide con un
  `ResizeObserver`. **Héroe** más bajo (título 3xl/5xl, anillo de 200 px):
  a 1366 × 768, «Lo que encontramos» queda a 491 px. **Resumen sin jerga**:
  el hallazgo 4 es «64 → 76 de cada 100» y «La predicción se vuelve más exacta
  conforme avanza la partida» (el AUC queda en el ícono de ayuda); la
  importancia se explica como «cuánto empeora el modelo si esa variable deja
  de aportar información» (la permutación revuelve, no quita; corrección del
  usuario), con el término técnico y el modelo en la ayuda.
- **2026-10-01** — Pulido final, bloque 2 (la partida). **KPI**: la franja
  pasa a tarjetas (`Kpi` en `Reporte.tsx`) con número grande e ícono
  (corona si ganó, trofeo si llegó al top, medalla si no; barras, tendencia
  arriba/abajo, reloj). Dos deltas, los únicos con comparación real
  (aprobados por el usuario): posición contra el corte del top («A 11 lugares
  del top» / «Dentro del top»), y probabilidad máxima contra el máximo de
  `curva_referencia`, solo en el catálogo (en vivo no hay referencia de la
  misma red). El signo del delta sale de la diferencia ya redondeada: con los
  valores crudos, 53.9 % contra 53.92 % salía «−0 pp» en rojo; con 0 se lee
  «Igual que el máximo…» y cuenta como a la altura. **Viñetas**
  (`VinetasTop.tsx`) en lugar del párrafo «¿Qué hicieron distinto…?»: por
  variable y fase, barra = mediana del escuadrón en la fase
  (`estadoPorFase`), marca = mediana de los que llegaron al top
  (`referencia_fase`); salud y compañeros en verde/rojo; **distancia al
  círculo en neutro** (ajuste del usuario: el hallazgo central es que la
  posición casi no pesa; por eso se retiró «rotar antes»). **Factores** como
  insignias: pulgar arriba verde / alerta roja (la calavera queda para las
  bajas). Eliminado `buscarReferenciaFase`, sin uso.
- **2026-10-01** — Pulido final, bloque 3 (perfiles e importancia).
  `HuellaPerfil.tsx`: radar pequeño (72 px, SVG propio) en el color de cada
  perfil en las tarjetas de arquetipos del Resumen; insignia de identidad,
  sin cifras ni interacción (`aria-hidden`). Ejes normalizados con el mismo
  mínimo y máximo para los cuatro (grupos + promedio general), con un piso de
  15 % del radio para que un eje en cero no colapse la forma. La pestaña
  Perfiles conserva las barras divergentes. **Importancia**: barra de peso
  relativo (parte del total de importancia positiva; la barra se escala a la
  más pesada para que se lea, la cifra es el peso: salud del equipo 25 %);
  las dos variables con importancia negativa (−0.001) dicen «sin peso».
  Nombres en lenguaje de jugador en `texto.ts` (`etiquetaVariable`, lista
  aprobada): «Cuánto te mueves», «En qué cierre vas», «Qué tan cerrada está la
  zona», «Con cuántos empezaste», etc.
- **2026-10-01** — Pulido final, bloque 4 (mapa y eventos). **Causa de las
  bajas** en `servicio/analisis.py` (opción b del usuario): mismo campo que el
  parser del notebook (`finishDamageInfo.damageTypeCategory`, con el del
  evento de respaldo) y `_categoria_causa`, copia de `categoria_causa` de la
  celda de exportación (Gun → arma de fuego; DBNO o Groggy → remate tras
  derribo; BlueZone → zona de gas; el resto → otros). Cada evento de `mapa`
  trae `causa`; verificado con `laze-9527` (4 bajas, arma de fuego). **La
  cuenta de vivos de la curva va 1-2 minutos detrás de la hora de cada baja**
  (bajas en 2, 3, 5 y 11; caídas de vivos en 4, 5, 7 y 12; y los vivos
  vuelven a subir por reanimaciones), así que la causa se muestra donde el
  minuto es exacto: en el `<title>` de cada marcador del mapa y en la lista
  bajo el mapa; en la tarjeta de la curva solo si hay una baja del mapa en
  ese mismo minuto. **Tarjetas de evento** en la curva: al pasar el cursor o
  enfocar un ícono (tabulable), «Minuto 12 · Cae un compañero · Salud del
  equipo 4 · 3 en pie», encima de la gráfica, fuera del trazo. (Con la
  pestaña de automatización en segundo plano, `focus()` no dispara eventos
  de foco: se verificó con `focusin` explícito.) **Play** en el mapa: avanza
  un minuto cada 0.7 s, desde el final vuelve a empezar, tomar el deslizador
  pausa; el escuadrón y la zona del minuto se deslizan entre minutos
  (`motion`, 0.6 s), sin deslizamiento con `prefers-reduced-motion`.
- **2026-10-01** — Pulido final, bloque 5 (animaciones). La regla de una sola
  animación se relaja con límites: `useAnimarUnaVez(clave)` devuelve true
  solo la primera vez que se muestra esa clave en la visita (un `Set` fuera
  de React: desmontar al cambiar de pestaña no la repite) y solo durante la
  entrada (a los 850 ms pasa a false, así que redimensionar o pasar el cursor
  no la repiten, y la gráfica termina en su estado final aunque la pestaña
  esté en segundo plano); con `prefers-reduced-motion`, siempre false. Se usa
  en la curva (`Area`: de izquierda a derecha, `curva-<id>`; un escuadrón
  nuevo sí se anima) y en la dona de causas del Resumen (se llena,
  `dona-causas`). Las dos con 800 ms y ease-out (`DURACION_ENTRADA_MS`,
  `ACELERACION_ENTRADA`; en `motion`, `easeOut`, la misma curva). El anillo
  del héroe sigue siendo la animación principal. Verificado por DOM: hay
  animación al entrar a Partidas, ninguna al volver a la pestaña, sí con otro
  escuadrón; la dona aparece llena al volver al Resumen.
- **2026-10-02** — Commit `857fe67` del pulido final. Pasada de orden y
  animación (`PROMPT_ANIMACION_ORDEN.md`; sustituye las reglas de animación
  anteriores; `PROMPT_MENOS_TEXTO.md`, al que alude, no existe en el repo).
  **Plantilla común** (`Plantilla.tsx`): mensaje principal, fila de
  indicadores (`Indicador`, `FilaIndicadores`), un gráfico principal y el
  detalle en `Desplegable`s cerrados (`Detalle`). Resumen: héroe + cifras de
  los hallazgos + «lo que más pesa» + 5 desplegables (el corpus pasó a «De
  dónde salen los datos», decisión del usuario). Partidas: mensaje armado con
  forma, minuto crítico y resultado («Se vino abajo en el minuto 11 y terminó
  18° de 27.») + 5 KPIs + curva + 6 desplegables (+ el mapa en vivo, cerrado).
  Perfiles: 4 perfiles con huella + comparación + un desplegable por perfil.
  Metodología: corpus y AUC + diagrama + 5 desplegables. **Movimiento**
  (`movimiento.ts`): una aceleración (ease-out = cubic-bezier(0,0,0.58,1),
  «easeOut» en Motion y «ease-out» en Recharts) y duraciones fijas (respuesta
  180 ms, abrir 300 / cerrar 250, salida de vista 150, cascada ≤ 450 en total
  con `retrasoCascada`, conteo 450, gráficas 700, cambio de valor 600);
  `useTransicion` da duración 0 con `prefers-reduced-motion`, más
  `MotionConfig reducedMotion="user"` en la raíz y una media consulta para la
  elevación CSS (`.elevable`: transform y la opacidad de una capa de sombra).
  Cambio de pestaña con `AnimatePresence mode="popLayout"` (no `wait`: la
  vista nueva no espera a la salida) y la saliente sin eventos de puntero.
  `Conteo`: números que cuentan desde cero en cada entrada a la vista (texto
  que cambia por cuadro: excepción aceptada por el usuario). Viñetas: un
  cierre a la vez con selector C1–C6, siguen al minuto elegido en la curva
  (el estado subió a `Reporte`), barras con `scaleX` y marca con
  `translateX`. Huellas que crecen desde el centro, dona que se llena
  girando. **Lenguaje** (decisiones del usuario): «pp» → «puntos»; fases →
  «Cierre N» / «CN»; «percentil» → «mejor que el N %»; «probabilidad» → «tus
  posibilidades»; «mediana» → «lo típico»; «modelo» → «el análisis»;
  «escenarios» → «¿y si…?»; distancias en palabras («a medio camino del
  borde», «% del camino al borde») en vez de radios; los textos del JSON pasan
  por `textoLlano` (`formato.ts`, reglas exactas por frase, solo palabras).
  Ficha de Botsito con la misma tabla de traducciones. Pendiente de revisar en
  el notebook: la recomendación «Iniciar la rotación antes del cierre del
  círculo» (40 escuadrones) contradice el hallazgo de que la posición casi no
  pesa.
