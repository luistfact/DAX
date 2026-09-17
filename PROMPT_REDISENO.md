# ZonaAzul — Rediseño: hablarle al jugador

Prompt para Claude Code. Dos frentes: el lenguaje y el aspecto. El primero
importa más.

---

## El problema de fondo

La interfaz actual habla el idioma del modelo, no el del jugador. Dice
«clasificó» sin explicar a qué, «observaciones» en lugar de partidas, y muestra
AUC y Brier sin traducción. Quien abre la app y juega PUBG no entiende qué está
viendo.

Todo lo que sigue apunta a lo mismo: **que un jugador entienda su partida sin
saber estadística.**

---

## El prompt

---

Vas a rediseñar la interfaz de ZonaAzul. El objetivo no es agregar funciones
sino hacer que un jugador de PUBG entienda lo que ve.

NO escribas código todavía. Lee esto completo, revisa los componentes actuales
y los JSON, y devuélveme un plan de diseño antes de tocar nada.

### Parte 1 — Lenguaje

Este es el trabajo principal. Sustituye el vocabulario del modelo por el del
juego, en toda la interfaz.

| Ahora dice | Debe decir |
|---|---|
| Clasificó / No clasificó | Top 25 % · Terminó 4° de 21 |
| Observaciones | Minutos analizados |
| Escuadrones | Equipos en la partida |
| Probabilidad | Probabilidad de llegar al top 25 % |
| Fase de la zona | Cierre 3 de 6 |
| `dist_rel` | Distancia al círculo |
| `hp_medio` | Salud del equipo |
| `jugadores_vivos` | Compañeros en pie |

«Top 25 %» necesita explicación la primera vez que aparece: un icono de ayuda
que diga *el cuarto superior de esa partida; con 24 equipos son los 6 primeros*.

Revisa **todos** los textos de la interfaz con este criterio, no solo los de la
tabla. Incluye títulos, estados vacíos y mensajes de error.

### Parte 2 — Etiquetar cada partida por su forma

La lista de partidas parece un inventario aleatorio. Clasifícalas según la forma
de su curva, calculándolo en el frontend a partir de `minutos[].probabilidad`:

- **Dominante** — sube pronto y se mantiene alta
- **Caída temprana** — baja antes del minuto 5 y no se recupera
- **Remontada** — cae por debajo de 0.3 y termina por encima de 0.5
- **Reñida** — oscila sin definirse
- **Desplome** — se mantiene y cae fuerte al final

Define los umbrales con criterio propio y documéntalos en `CLAUDE.md`. Muestra
la etiqueta como distintivo en la lista, y permite filtrar por ella.

### Parte 3 — El detalle debe responder tres preguntas

Reorganiza la vista de partida en torno a estas preguntas, con estos títulos:

**¿Cómo te fue?** — Posición, percentil y probabilidad máxima alcanzada.

**¿Dónde se decidió?** — El minuto de `momento_critico`, y qué cambió ahí:
compañeros perdidos, salud, distancia al círculo. Marcado sobre la curva.

**¿Qué hicieron distinto los que llegaron?** — La comparación contra
`referencia_fase`, redactada en lenguaje llano: «llegaste al cierre 4 con 62 de
salud y 2 compañeros; los equipos que llegan al top lo hacen con 88 y 3.5».

**¿Qué hago la próxima?** — Las recomendaciones del informe y los escenarios
alternativos.

### Parte 4 — Traducir la pestaña de modelos

Esa pestaña sirve a la evaluación académica, no al jugador. Consérvala completa
—las métricas son la evidencia del rigor del análisis— pero:

1. Renómbrala **Cómo funciona** y ponla al final.
2. Añade una línea introductoria que diga para quién es: *detalle técnico de
   cómo se construyó y evaluó el modelo*.
3. Traduce cada métrica junto a su cifra:
   - **AUC 0.693** — De cada 10 pares de equipos, el modelo ordena bien 7: le da
     más probabilidad al que terminó mejor.
   - **Brier 0.197** — Qué tan confiables son las probabilidades. Si dice 70 %,
     acierta cerca del 70 % de las veces.
   - **AP** — Qué tan bien detecta a los equipos que sí llegan al top, que son
     la minoría.

### Parte 5 — Identidad visual

El aspecto actual es neutro. Necesita una identidad propia, y el nombre ya la
sugiere: **la zona azul** es el círculo que se cierra y define toda la partida.
Que sea el eje del diseño, no un adorno.

**Restricciones legales, no negociables.** No uses capturas del juego, logotipos
de PUBG o Krafton, tipografías del juego, ni mapas o iconos extraídos de él. Es
un proyecto académico que se publica en un repositorio: todo lo visual se genera
con CSS y SVG propios. La paleta y la atmósfera pueden evocar el juego; los
activos, no.

Sobre la frase de victoria: puedes celebrar el primer lugar, pero redáctala con
palabras propias en lugar de reproducir el eslogan del juego.

**Dirección propuesta, para que la desarrolles:**

- Fondo oscuro con una textura topográfica sutil generada en SVG, que evoque un
  mapa táctico sin copiar ninguno.
- Dos acentos con significado: uno frío para la zona segura y uno cálido para el
  peligro y las caídas de probabilidad. Que el color **signifique** algo, no que
  decore.
- Tipografía condensada para las cifras, como los marcadores de un HUD, y una
  humanista legible para el texto. Dos familias como máximo.
- Los números grandes son el héroe de cada pantalla.

Propón tu propia paleta con 4 a 6 valores nombrados y justifícala. Si tu
propuesta se parece a lo que harías para cualquier dashboard, revísala.

**Un solo momento de animación, no efectos por todas partes.** El mejor
candidato es el círculo cerrándose al cargar la partida, sincronizado con el
trazo de la curva. Las transiciones de hover en cada tarjeta y las entradas con
desvanecimiento en cada sección son el recurso genérico y se notan.

Respeta `prefers-reduced-motion`.

### Reglas

- Todo sale de los JSON existentes. Sin llamadas externas, sin datos inventados.
- Si un campo viene nulo, muestra un guion.
- Responsiva: se demuestra en pantalla compartida de videollamada.
- Foco de teclado visible y contraste suficiente.
- **No hagas commits.** Propón el mensaje y espera.

### Orden

1. Plan de diseño: paleta, tipografías, concepto de disposición. Espera
   aprobación antes de codificar.
2. Lenguaje en toda la interfaz (parte 1).
3. Etiquetas de partida y filtro (parte 2).
4. Reorganización del detalle (parte 3).
5. Traducción de métricas (parte 4).
6. Identidad visual y la animación (parte 5).

Repórtame al terminar cada bloque. Si el tiempo se acorta, los puntos 2 y 3 son
los que más cambian la experiencia; el 6 es el que más se puede recortar.

Criterio de aceptación: `npm run build` compila sin errores, y alguien que juega
PUBG pero no sabe estadística entiende qué le dice cada pantalla.
