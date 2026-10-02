# ZonaAzul — Orden, tarjetas desplegables y animación

Tres objetivos: **más orden**, **tarjetas que se despliegan con animación**, y
**una aplicación muy animada**, todo en lenguaje no técnico.

Este prompt **sustituye las reglas de animación** de PROMPT_PULIDO_FINAL.md
(punto 11) y amplía los desplegables de PROMPT_MENOS_TEXTO.md (punto 4). Lo demás
de ambos sigue vigente.

---

## El prompt

---

Integra esto al trabajo en curso. Donde choque con las reglas de animación de
los prompts anteriores, manda este.

NO escribas código todavía. Devuélveme el plan con la plantilla de cada pestaña
y la lista de animaciones antes de tocar nada.

---

### 1. Orden: la misma plantilla en todas las pestañas

Hoy cada pestaña organiza su contenido de forma distinta. Que todas sigan el
mismo esquema, de arriba abajo:

1. **Mensaje principal** — una sola frase grande que dice de qué trata la
   pestaña, en lenguaje de jugador.
2. **Fila de indicadores** — tres a cinco tarjetas de número grande.
3. **Gráfico principal** — uno solo, el protagonista de la pestaña.
4. **Tarjetas desplegables** — todo el detalle, cerrado por defecto.

Rejilla consistente: mismos márgenes, mismos espacios entre tarjetas, mismos
anchos de columna en todas las vistas. Muéstrame en el plan cómo queda cada
pestaña con esta plantilla.

---

### 2. Tarjetas desplegables animadas

Un **componente único** para toda la aplicación. Cerrada, la tarjeta muestra:

- Ícono, título corto y una línea de resumen.
- Una flecha que indica que se puede abrir.

Al hacer clic o pulsar Enter:

- La tarjeta **crece suavemente** hasta su altura completa.
- La flecha **gira**.
- El contenido **aparece en cascada**: cada elemento entra un instante después
  del anterior, desvaneciéndose y subiendo unos píxeles.
- Al cerrar, el movimiento inverso, más rápido.

Accesibilidad: botón con `aria-expanded`, operable con teclado, foco visible.
Se pueden abrir varias a la vez.

Úsala en todo el detalle de la aplicación: el informe de la partida, los
factores, la importancia de variables, los escenarios, las subsecciones de
Metodología y las notas largas.

---

### 3. Sistema de animación

Usa la librería Motion, que ya está instalada. Todo el movimiento de la
aplicación sigue estas reglas:

**Duraciones fijas por tipo:**

| Tipo | Duración |
|---|---|
| Respuesta a hover o clic | 150–200 ms |
| Abrir y cerrar tarjetas | 250–300 ms |
| Entrada de una vista | 400–500 ms en total |
| Dibujo de gráficas | 600–800 ms |

**Una sola familia de aceleración** para toda la aplicación —desaceleración
suave, sin rebotes—. Define las curvas una vez, como constantes, y reutilízalas.

**Solo se animan opacidad y transformaciones** —posición, escala, rotación—, más
la altura de las tarjetas a través de Motion. Nunca propiedades que obliguen al
navegador a recalcular el diseño en cada cuadro.

### 4. Qué se anima

- **Cambio de pestaña**: el contenido sale desvaneciéndose y el nuevo entra en
  cascada, tarjeta por tarjeta.
- **Números grandes**: cuentan desde cero hasta su valor al aparecer. Una vez
  por visita a la vista.
- **Tarjetas al pasar el cursor**: se elevan dos píxeles con una sombra sutil.
- **Curva de probabilidad**: se dibuja de izquierda a derecha.
- **Donas**: se llenan girando.
- **Radares de perfiles**: el polígono crece desde el centro hasta su forma.
- **Viñetas**: las barras crecen desde cero.
- **Cambio de fase en las viñetas**: las barras se deslizan de un valor al otro.
- **Mapa**: el Play del timelapse ya planeado.
- **Círculo del héroe**: sigue siendo el emblema de la aplicación.

### 5. Reglas para que se sienta fluido, no lento

- **Nada bloquea al usuario.** Se puede hacer clic, cambiar de pestaña o
  desplazarse en medio de cualquier animación.
- **Las gráficas se dibujan una vez por carga de datos**, no cada vez que se
  vuelve a la pestaña. Cambiar de pestaña sí repite la entrada en cascada, que es
  rápida.
- **La cascada total de una vista no pasa de medio segundo**, aunque tenga muchas
  tarjetas: si hay muchas, el retraso entre cada una se reduce.
- **Con `prefers-reduced-motion`**, ninguna animación: todo aparece en su estado
  final, y la aplicación funciona igual.

Si una animación hace que algo tarde en poder leerse, se acorta o se quita.

---

### 6. Lenguaje no técnico en todo

Fuera de Metodología no aparece ningún término técnico. Revisa toda la
aplicación —tarjetas, tooltips, botones, mensajes vacíos, textos del asistente—
con estas traducciones:

| No decir | Decir |
|---|---|
| AUC | «de cada 100 comparaciones, cuántas acierta» |
| Probabilidad estimada | «tus posibilidades» |
| Percentil | «mejor que el N % de los equipos» |
| Fase de la zona | «cierre N» |
| Predictor, variable | «lo que más pesa» |
| Modelo | «el análisis» |
| Escenario contrafactual | «¿y si…?» |
| Recalibración | no se menciona fuera de Metodología |

Si encuentras otro término técnico visible, propón su traducción en el plan.

---

## Criterio de aceptación

- Todas las pestañas siguen la misma plantilla.
- Todo el detalle está en tarjetas desplegables, cerradas por defecto.
- Las animaciones respetan las duraciones de la tabla y una sola aceleración.
- La aplicación se usa igual de rápido con o sin animaciones.
- Con `prefers-reduced-motion` activado, no se mueve nada y todo funciona.

**No hagas commits** sin mi aprobación.
