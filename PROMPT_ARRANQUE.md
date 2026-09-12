# Prompt de arranque — Aplicación ZonaAzul

Pega este texto completo en la primera sesión del agente, dentro del repositorio.
Está escrito para construir **solo la aplicación**: el análisis y el modelado ya
existen en los notebooks.

---

Eres desarrollador senior de aplicaciones de datos. Vas a construir la interfaz
de **ZonaAzul**, una herramienta de análisis retrospectivo de partidas de PUBG.
NO escribas código todavía: lee este documento completo, lee `CLAUDE.md`,
explora el repositorio y devuélveme un plan antes de tocar cualquier archivo.

## Objetivo

Una aplicación web donde un jugador escribe su nombre de usuario de PUBG y
obtiene el análisis de sus partidas recientes: en qué momento se decidió cada
una, qué factor deterioró su probabilidad de clasificar, y qué perfil de juego
tiene.

Es una herramienta educativa de análisis retrospectivo. **Nunca presenta una
estimación sin su incertidumbre, y nunca sugiere que predice partidas futuras.**

## Lo que ya existe — no lo reescribas

- `notebooks/01_obtencion_y_eda.ipynb` — ingesta, parseo y análisis exploratorio
- `src/pubg_api.py` — cliente de la API con limitador de cuota incorporado
- `src/parse_fase1.py` — parseo de telemetría a tablas
- `datos/tabla_analitica.parquet` — 47 218 observaciones de 150 partidas
- `CLAUDE.md` — convenciones y decisiones ya tomadas

Reutiliza estos módulos. Si necesitas modificarlos, dímelo antes.

## Vistas

1. **Aviso y acceso.** Antes de pedir el nombre de usuario, el usuario debe leer
   y aceptar el tratamiento de datos. Sin aceptación, el campo permanece
   deshabilitado.
2. **Mi perfil.** Estadísticas de temporada y lista de partidas recientes.
3. **Mi última partida.** Curva de probabilidad a lo largo de las fases del
   círculo, con marcadores en los eventos que la mueven. Mapa con la trayectoria
   del escuadrón.
4. **Mi estilo de juego.** Perfil asignado por el modelo no supervisado, con
   nombre propio y gráfica de radar contra el promedio.
5. **Asistente.** Conversación restringida al dominio del análisis.

Cada vista debe funcionar con un estado vacío que indique al usuario qué hacer.
Nunca una pantalla en blanco.

## Asistente conversacional

Esta es la parte donde hay que ser más cuidadoso.

- El asistente **solo puede hablar de las partidas cargadas en la sesión**. Si
  le preguntan cualquier otra cosa, redirige a su propósito con un mensaje
  breve, sin regañar.
- Recibe como contexto **únicamente** el resumen estructurado de la partida
  analizada: fases, probabilidades, eventos clave y perfil asignado. No recibe
  la tabla completa ni la telemetría cruda.
- **Valida la salida antes de mostrarla**: si el modelo menciona una cifra que
  no está en el contexto entregado, se descarta la respuesta y se reintenta.
- El prompt del sistema va en un archivo aparte y versionado, no incrustado en
  el código de la interfaz.
- Documenta las iteraciones del prompt: forma parte del entregable.

## Stack

- **Streamlit**, desplegado en Streamlit Community Cloud.
- `pandas`, `numpy`, `plotly` para datos y gráficas.
- `scikit-learn` y `keras` para cargar los modelos ya entrenados.
- `openai` para el asistente.
- Claves desde variables de entorno o `st.secrets`. Nunca en el código.

## Reglas de trabajo

1. Devuelve un **plan explícito** antes de escribir código, y espera mi
   aprobación.
2. Trabaja por vistas. Una vista funcionando y probada antes de empezar la
   siguiente.
3. Mantén `CLAUDE.md` actualizado: añade a la bitácora lo que se decida en cada
   sesión.
4. Si una librería cambió su API, **verifícalo en la documentación oficial** en
   lugar de asumir.
5. La aplicación debe arrancar sin credenciales, usando los datos locales. Las
   claves habilitan funciones adicionales, no el arranque.
6. **No hagas commits sin permiso.** Propón el mensaje y espera.

## NO CONSTRUYAS

- Autenticación real de usuarios, registro, base de datos o panel de
  administración.
- Cualquier función que opere sobre una partida en curso o sugiera ventaja
  competitiva en tiempo real.
- Predicciones de partidas futuras. El sistema analiza lo que ya ocurrió.
- Cómputo distribuido, contenedores, orquestadores, API REST propia.
- Descarga masiva de partidas desde la interfaz. La ingesta es un proceso
  aparte, ya resuelto.
- Almacenamiento de datos de otros jugadores más allá de la sesión.
- Cualquier cifra presentada sin su incertidumbre.

## Primera entrega

Solo la vista 3, «Mi última partida», leyendo desde
`datos/tabla_analitica.parquet` con un identificador de partida fijo. Sin API,
sin asistente, sin modelo: la curva y el mapa a partir de datos ya calculados.

Cuando eso funcione de principio a fin, seguimos.
