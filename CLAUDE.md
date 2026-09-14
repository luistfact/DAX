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
