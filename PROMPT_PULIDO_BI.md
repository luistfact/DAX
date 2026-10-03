# ZonaAzul — Pulido del tablero y fondo

Revisión sobre las capturas del rediseño en curso. Todo lo de
PROMPT_ANIMACION_ORDEN.md y PROMPT_BI_VISUAL.md sigue vigente; esto corrige
errores, reparte mejor el espacio, recorta texto y agrega el fondo.

---

## El prompt

---

Integra esto al trabajo en curso.

NO escribas código todavía. Devuélveme primero el plan en el mismo orden
(A → I). Si algún punto choca con una decisión ya tomada en CLAUDE.md, dilo
en el plan y no lo apliques sin mi aprobación.

Reglas que no cambian:

- **Datos:** ninguna cifra inventada; todo sale de los JSON.
- **Dependencias:** sin dependencias nuevas sin justificarlas antes.
- **Color:** cualquier color nuevo se valida con `validate_palette.js` en
  ambos temas.
- **Movimiento:** con `prefers-reduced-motion`, nada se mueve y todo
  funciona.

---

### A. Errores (primero)

1. **Doble signo** en la insignia de «¿Dónde se decidió?»: dice
   «Min 11 · −−22 puntos». El signo se agrega dos veces.
2. **Partidas: el detalle ocupa solo la mitad del ancho.** Las desplegables
   quedan en una columna y la derecha vacía.
3. **Huecos al abrir desplegables** (sobre todo en Metodología): la tarjeta
   vecina deja un hueco enorme debajo. Usar **dos columnas independientes**
   (cada una con su propia pila), no una rejilla por filas. Aplica a
   Partidas, Perfiles y Metodología.
4. **Factor confuso:** «Tus posibilidades nunca pasaron del 70 %» aparece
   junto al KPI «Tus mejores posibilidades 54 %» y se lee como
   contradicción. Que diga el máximo real: «Lo más alto que llegaron tus
   posibilidades: 54 %».
5. **Mensaje de Perfiles:** «los Rotadores llegan más lejos» contradice al
   Resumen («rotar o quedarse quieto: casi el mismo resultado», 60 % contra
   58 %). Propuesta: «Cuatro formas de jugar el arranque; solo los Castigados
   se quedan atrás».
6. **Título del héroe:** se parte en «…al top / 25 %?», y el anillo quedó
   como un circulito que parece botón de opción. Lo resuelve el fondo
   (sección I).

### B. Espacio y rejilla

7. **Ancho de Partidas:** unos 1600 px. Las demás pestañas pueden quedarse
   en 1200.
8. **KPI de Partidas con estructura fija:** etiqueta, número, mini visual de
   36 px de alto y delta. Hoy «Mejor que» parte «de los / equipos» y el
   anillo flota abajo.
9. **Lista de escuadrones:** los soldaditos recortan el nombre («Partida 19 ·
   Escua…»). Pasarlos a la segunda línea, junto a categoría y perfil.
10. **Chips de filtro** más compactos, para que los 4 quepan en una fila.
11. **Metodología:**
    - el diagrama de flujo estirado al ancho de su tarjeta;
    - 6 desplegables en lugar de 5, para que la rejilla quede pareja
      (ver 28).
12. **Regla para el borde superior de color de las tarjetas:**
    - azul: informativo;
    - verde: bueno;
    - rojo: malo;
    - en Perfiles, el color de cada perfil.

### C. Resumen

13. **Un solo botón principal:** «Explorar escuadrones» relleno y «Ver un
    ejemplo» como enlace.
14. **Dona:** sin repetir «5 %» al centro; ahí va un ícono de gas o la
    palabra «zona».
15. **3.9×:** dos puntos de leyenda, «Cómo está tu equipo» y «Dónde estás».
    Hoy hay tres tonos de barra sin explicación.
16. **«Cuatro formas de jugar»** siempre abierta (excepción a «cerrado por
    defecto»): es lo más vistoso, y cerrada deja la página terminando en un
    hueco.

### D. Partidas

17. **Leyenda de la curva:** de 8 elementos a 4: «Tu equipo», «Los que
    llegaron», «Cae un compañero», «Golpe fuerte».
18. **«¿Cómo te fue?»:**
    - el párrafo se cambia por 3 chips: «18° de 27», «Empezó con 100 de
      salud», «Terminó 2 de 4 en pie»;
    - quitar el «14 de 15 minutos analizados» repetido.
19. **«¿Qué hago la próxima?»:** 3 tarjetas numeradas con ícono en lugar de
    viñetas de texto. La primera, destacada.
20. **Distancia:** si cambió menos de unos 5 %, decir «Casi no se movió», en
    lugar de «Se alejó del centro (1 % del camino al borde)».
21. **Leyenda de las viñetas** en una sola línea.
22. **«¿Y si…?»:** en la tarjeta destacada, una mini barra «hoy 37 % →
    46 %» con la flecha animada.

### E. Perfiles

23. **Gráfica de puntos:** los íconos se enciman (sobre todo en «Salud al
    aterrizar»). Puntos más chicos, con el ícono solo en el tooltip, o
    separar verticalmente los que choquen.
24. **Resaltado cruzado:** al pasar el cursor o pulsar la tarjeta de un
    perfil, sus puntos se resaltan y los demás se atenúan. Al revés también:
    al pasar por un punto se resalta su tarjeta.
25. **Un solo formato de comparación:** «1.6× el promedio» / «0.7× el
    promedio», en lugar de mezclar «un tercio menos», «45 % menos» y
    «1.6 veces».
26. **Desplegables de perfil:** cada fila con una mini barra divergente al
    lado del texto.
27. **Duplicado:** «6 de cada 10» y «60 % de los equipos» dicen lo mismo;
    dejar uno.

### F. Metodología

28. **El párrafo bajo el diagrama** va a una desplegable nueva, «De dónde
    salen los datos».
29. **«Las diferencias entre modelos son pequeñas»:** una frase; el resto,
    al tooltip.
30. **Calibración:**
    - la gráfica, más grande;
    - el texto de la derecha, en 2 viñetas: «La red recurrente inflaba:
      decía 70 %, llegaba el 47 %» y «Recalibrada: se desvía 1 punto».
31. **En la gráfica de AUC:** «Gradient boosting», sin el nombre largo. El
    nombre completo, solo en la tabla.
32. **«Desempeño por fase del círculo»** → «Desempeño por cierre».

### G. Dinamismo e interacción

33. **Tooltips con el valor exacto en todas las gráficas:** barras del
    Resumen, puntos de Perfiles y barras de AUC.
34. **Pulso del momento clave** en la curva: dos latidos al cargar.
35. **Al cambiar de escuadrón,** los KPI cuentan y las mini gráficas se
    deslizan al nuevo valor.
36. **Las barras de categoría de la lista** (Desplome, Remontada…) filtran
    al pulsarlas.

### H. Para la demo

37. **Tema oscuro para el video.**
38. **Prueba de los 5 segundos** en cada pestaña con alguien que no conozca
    el proyecto.

### I. Fondo: Erangel en el héroe

Ejemplo de referencia: `ejemplo_fondos.html` (opción A, recomendada).

- **Solo en el héroe del Resumen:** el mapa oficial de Erangel que ya está
  en `app/public/mapas/` (pubg/api-assets, el mismo del análisis en vivo).
  Va a la derecha, oscurecido y con una máscara radial que lo funde con la
  tarjeta.
- **Velo degradado:** de opaco a la izquierda a transparente a la derecha,
  para que el título y los KPI se lean siempre.
- **Encima del mapa, en SVG propio:**
  - la ruta del avión punteada, con el avión cruzando una vez;
  - el círculo blanco punteado de la zona;
  - la zona azul cerrándose.

  Esta zona reemplaza al anillo actual del héroe (punto 6) y sigue siendo el
  emblema de la app.
- **KPI del corpus** abajo del título, en la columna izquierda, para no
  tapar el mapa.
- **Tema claro:** el mapa desaturado y aclarado, con velo blanco.
- **Teléfono:** el velo cubre casi todo y el mapa queda como textura.
- **El resto de la página conserva el fondo actual** (curvas de nivel y
  cuadrícula A–H), con menos opacidad en el tema claro. El mapa a toda la
  página (opción C del ejemplo) se descarta: le quita contraste a las
  gráficas.
- **Sin arte del juego:** nada de personajes, logos ni capturas. Además de
  la marca, la guía de creadores de KRAFTON pide no parecer contenido
  oficial. El crédito «Mapa: KRAFTON, Inc., vía pubg/api-assets» ya está en
  el pie de página.
- **Con `prefers-reduced-motion`:** el avión aparece ya en su lugar y la
  zona ya cerrada.

---

## Criterio de aceptación

- **Errores:** los 6 errores de la sección A, corregidos.
- **Espacio:** a 1920 px no quedan huecos dentro de las tarjetas ni media
  columna vacía en Partidas.
- **Desplegables:** abrir una no deja huecos en la columna vecina.
- **Pantallas angostas:** a 390 px no hay scroll horizontal.
- **Temas:** los dos se ven bien y pasan las verificaciones de contraste.
- **Movimiento:** con `prefers-reduced-motion`, nada se mueve y todo
  funciona.

**No hagas commits** sin mi aprobación.
