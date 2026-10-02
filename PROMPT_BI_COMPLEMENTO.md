# ZonaAzul — Complemento al rediseño BI

Aplica **después de la fase 0** de `PROMPT_BI.md` y **sustituye su fase 1**. Lo
demás de ese prompt sigue vigente.

---

## El prompt

---

Complemento al rediseño. La fase 0 de PROMPT_BI.md sigue igual y va primero.
Esto **sustituye la paleta de la fase 1** y agrega elementos a las fases 2 y 3.

NO escribas código todavía. Intégralo al plan y muéstrame los cambios antes de
aplicarlos.

---

### 1. Paleta — sustituye la de la fase 1

Carbón con tinte verde militar: táctico pero limpio. El azul se aclara en oscuro
y el dorado queda solo para marca y acciones.

```css
:root[data-theme="dark"] {
  --bg:     #0C0F0E;  --card:   #151A18;  --card-2: #1D2422;
  --line:   #2A3430;  --text:   #ECEFE9;  --muted:  #9BA79F;
  --brand:  #F2A900;  /* marca y acción principal, nada más */
  --zone:   #4C9BFF;  /* zona, curva de probabilidad */
  --danger: #FF5A4E;  /* desplomes, minuto crítico, bajas */
  --alive:  #3DDC97;  /* compañeros en pie */
  --violet: #B38CFF;

  --zone-wash:   rgba(76,155,255,.14);  /* área bajo la curva */
  --phase-band:  rgba(76,155,255,.07);  /* bandas de fase */
  --danger-wash: rgba(255,90,78,.14);   /* banda del minuto crítico */
}
```

El modo claro conserva el fondo crema actual y usa **los mismos nombres de
variable**: cambiar de tema es solo cambiar valores. Valida el contraste de ambos
modos con el script que ya usaste. El texto secundario debe pasar contraste AA
al tamaño en que se usa.

### 2. Un color por perfil, sin choques

Cada perfil con su color e **ícono propio**, para quien no distingue bien rojo y
verde:

| Perfil | Color | Ícono sugerido |
|---|---|---|
| Rotadores | `--zone` | `Wind` o `Route` |
| Periféricos | `--violet` | `Eye` o `Scan` |
| Centrales | propón uno nuevo | `Crosshair` |
| Castigados | `--danger` | `HeartCrack` |

**Dos choques que debes evitar:**

- **Centrales no puede ser verde**, porque el verde significa «compañero en pie»
  en el panel del minuto. Propón otro tono, valida su contraste y que se
  distinga de los otros tres.
- **Rojo de desplomes y rojo de Castigados** pueden coincidir en la misma fila de
  la lista. En la lista, la barra de color de cada fila es la **categoría de la
  curva**; el perfil se muestra solo con su ícono y nombre, sin su color.

Reutiliza los colores de perfil en los radares, las barras de percentil y la
pestaña de perfiles.

### 3. Hallazgos como tarjetas de dato grande

En el Resumen, cada hallazgo es un número enorme con su evidencia al lado, no
una frase.

- **Causas de eliminación:** el 5 % como número grande, con una mini dona de
  arma de fuego, remate tras derribo, zona de gas **y otros**. Sin «otros», 5 % y
  90 % no suman 100 y alguien lo va a preguntar. Toma las proporciones reales de
  los datos; si no están en los JSON, dilo en el plan.
- **Llegar completo pesa más que dónde estás:** barras de importancia de
  variables como evidencia. Si no están en `metricas.json`, dilo en el plan.

### 4. Héroe del Resumen

- Conserva la pregunta «¿Llega tu escuadrón al top 25 %?».
- **El círculo que se cierra detrás del título es la animación principal** de la
  aplicación. Reutilízalo como indicador de carga del botón de análisis.
- Las cifras del corpus bajan a una franja pequeña: son contexto, no resultado.

Sigue siendo **una sola animación**. Respeta `prefers-reduced-motion`.

### 5. Curva de probabilidad

- **Área bajo la línea** con `--zone-wash`.
- **Minuto crítico** como banda vertical con `--danger-wash` y una etiqueta:
  «Min 12 · −30 pp · cae un compañero», con los datos reales de cada partida.
- **Fases rotuladas igual en todas partes**: F1 a F6. Hoy conviven «Fase 1», «F2»
  y «Fase 5».
- **Referencia:** conserva la curva promedio de los equipos que clasificaron. Si
  agregas la tasa base, **nunca como línea plana**: por el sesgo de
  supervivencia, la tasa entre los equipos vivos sube de 27 % a 47 % entre F1 y
  F6. Debe ser escalonada por fase, tomada de `por_fase`.

### 6. Panel del minuto como HUD

- **Barra de salud** en lugar del número.
- **Íconos de soldado** por integrante del escuadrón según `tam_real`, los
  caídos en gris. Un escuadrón de dos muestra dos, no cuatro.
- **Mini círculo con un punto** para la distancia a la zona.

### 7. Perfiles

Los radares ocupan una fracción mínima de cada tarjeta. Pon el radar a la
izquierda y las cifras a la derecha, o propón barras divergentes contra el
promedio, que se leen más rápido. Muéstrame ambas opciones en el plan.

### 8. Tipografía

- Tamaño base de 15 px. Nada de texto por debajo de 12 px.
- **Barlow** para el cuerpo; **Barlow Condensed** con `tabular-nums` para cifras
  y títulos en mayúsculas.
- **Saira Stencil One** solo para el título del héroe. Ningún otro uso.

Tres familias como máximo.

### 9. Detalles de HUD

- Esquinas tipo mira en las tarjetas principales, no en todas.
- Cuadrícula sutil de mapa con coordenadas A–H y 1–8 junto a las curvas de nivel
  del fondo.

### 10. Mapa oficial de Erangel

El repositorio oficial `pubg/api-assets` publica arte, incluidos mapas, para
desarrolladores de la API, condicionado a los Términos de Uso de PUBG y su
política de contenido creado por jugadores.

**Antes de usarlo:**
1. Lee esa política y dime qué condiciones impone.
2. Confirma que haya un mapa de `Baltic_Main`, el Erangel remasterizado que usa
   la telemetría. Si solo existe el Erangel original, dime si el contorno
   coincide, o las trayectorias quedarán desalineadas.

**Si procede:** úsalo como fondo del mapa en el análisis en vivo, en lugar del
lienzo abstracto. Con crédito visible en el propio mapa.

**Nunca** el logotipo, íconos oficiales ni la tipografía del juego.

### 11. Pie de página

Agrega: *«Proyecto académico independiente. No afiliado a KRAFTON ni a PUBG.
Imágenes de mapas: KRAFTON, Inc., vía pubg/api-assets.»* — la segunda frase solo
si usas el mapa.

---

## Fuera de esta pasada

- Búsqueda por voz.
- Mapa de calor de desplomes sobre Erangel: requiere exportar coordenadas del
  notebook, que el catálogo hoy no trae.
- Fuente monoespaciada para cifras: `tabular-nums` ya alinea las columnas.

## Reglas

- No hagas commits sin permiso.
- Nada de datos inventados.
- Conserva todos los avisos de causalidad.
