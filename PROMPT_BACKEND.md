# ZonaAzul — Fase 2: análisis en vivo por nombre de usuario

Prompt para Claude Code. Léelo completo antes de pegarlo: las dos decisiones de
arquitectura del inicio determinan si el despliegue funciona o no.

---

## Decisión 1 — Qué modelo sirve las predicciones en vivo

**No uses la red recurrente en el servicio.** El plan gratuito de Render ofrece
512 MB de memoria, y solo importar TensorFlow consume la mayor parte. El proceso
muere antes de responder la primera petición.

Usa el **bosque aleatorio** o la **red densa** de scikit-learn, que ya están
serializados en `modelos/modelo_supervisado.pkl`. Pesan poco y `scikit-learn`
tiene una huella mucho menor.

Esto no te cuesta la curva: esos modelos predicen una fila a la vez, así que
aplicándolos a cada ventana obtienes igualmente una probabilidad por minuto.

La red recurrente sigue viva en las partidas precalculadas. En el documento se
explica así: las partidas del conjunto de prueba usan el modelo secuencial; el
análisis en vivo usa el modelo tabular por restricciones de memoria del
despliegue. Es una decisión de ingeniería documentada, no una carencia.

## Decisión 2 — El preprocesamiento debe ser idéntico al del entrenamiento

Es el error que arruina este tipo de servicios. Si el orden de las columnas, la
imputación o el escalado difieren aunque sea un poco, el modelo devuelve
probabilidades sin sentido y **no hay error que lo delate**.

Por eso `modelos/preprocesamiento.pkl` guarda el imputador, el escalador y la
lista `PREDICTORES` en su orden exacto. El servicio debe cargarlos y usarlos, sin
reconstruir ninguna transformación por su cuenta.

---

## El prompt

---

Vas a construir el servicio de análisis en vivo de ZonaAzul. NO escribas código
todavía: lee este documento, lee `CLAUDE.md`, revisa `src/` y `modelos/`, y
devuélveme un plan.

### Qué hace

Recibe un nombre de usuario de PUBG, consulta la API oficial, procesa su partida
reciente más adecuada y devuelve el análisis con **exactamente la misma
estructura** que un elemento de `app/public/datos/partidas.json`. El frontend
debe poder renderizarlo con el mismo componente, sin ramas especiales.

### Reutiliza lo que existe

- `src/pubg_api.py` — cliente con limitador de cuota
- `src/parse_fase1.py` — parseo de telemetría a tablas
- `modelos/modelo_supervisado.pkl` — clasificador
- `modelos/preprocesamiento.pkl` — imputador, escalador y orden de predictores
- `modelos/perfilamiento.pkl` — agrupamiento de estilos

El notebook contiene la construcción de la tabla analítica. **Replícala
exactamente**: unión por proximidad temporal hacia atrás entre posiciones y
estado de zona, agregación en ventanas de 60 segundos, distancia relativa,
desplazamiento del centroide, fase por discretización del radio, y recorte a
quince minutos. Cualquier diferencia invalida las predicciones.

### Estructura

```
servicio/
├── main.py           FastAPI: endpoints y validación
├── analisis.py       pipeline completo de nick a resultado
├── modelos.py        carga perezosa de los .pkl
└── requirements.txt
```

### Endpoints

- `GET /salud` — devuelve `{"estado": "ok"}`. Sirve para despertar el servicio
  antes de la demostración.
- `POST /analizar` — recibe `{"nick": "...", "plataforma": "steam"}` y devuelve
  el análisis, o un error tipado.

### Manejo de errores — tipados, no genéricos

Cada caso devuelve un código que el frontend traduce a un mensaje claro:

| Situación | Código | Mensaje al usuario |
|---|---|---|
| El usuario no existe | `USUARIO_NO_ENCONTRADO` | No encontramos ese nombre de usuario en Steam |
| Sin partidas de escuadrón en Erangel | `SIN_PARTIDAS_COMPATIBLES` | No hay partidas recientes de escuadrón en Erangel |
| Partida expirada en la API | `PARTIDA_EXPIRADA` | Esa partida ya no está disponible |
| Cuota agotada | `LIMITE_ALCANZADO` | Demasiadas consultas, intenta en un minuto |
| API sin responder | `SERVICIO_NO_DISPONIBLE` | La API de PUBG no responde |

Nunca devuelvas un error 500 sin cuerpo. El frontend debe poder explicar qué
pasó.

### Memoria — es la restricción crítica

El servicio corre con 512 MB. Un archivo de telemetría ocupa entre 10 y 30 MB
sin comprimir, y parsearlo a objetos de Python multiplica esa cifra.

- Procesa **una sola partida por petición**.
- Libera el JSON crudo en cuanto extraigas los eventos que necesitas.
- No guardes nada en disco entre peticiones.
- Carga los modelos **una vez al arrancar**, no en cada petición.

### Seguridad

- La clave de la API se lee de la variable de entorno `PUBG_API_KEY`. Nunca en
  el código, nunca en el frontend, nunca en un archivo versionado.
- CORS restringido al origen del frontend desplegado. No uses `*`.
- Límite de peticiones por dirección IP.
- No almacenes nombres de usuario ni resultados entre peticiones.

### Frontend — pestaña nueva

Una cuarta pestaña, **Analizar mi partida**, que no toque las tres existentes.

1. Campo de texto para el nombre de usuario y botón.
2. **Barra de progreso con mensajes rotatorios**, porque el proceso tarda entre
   30 y 60 segundos. El primero debe ser «Despertando el servicio, la primera
   consulta tarda más». Los siguientes rotan cada tres o cuatro segundos con
   datos del propio proyecto:
   - Cerca del 90 % de las eliminaciones vienen del combate, no de la zona.
   - La mediana de escuadrones por partida en el corpus es 26.
   - La salud del escuadrón es el predictor más informativo del modelo.
   - Perder un integrante antes del minuto 5 reduce mucho la probabilidad.

   Define los mensajes en un arreglo del frontend. No los generes con un modelo
   de lenguaje.
3. Al recibir la respuesta, renderiza con **los mismos componentes** de la
   pestaña Partida.
4. Tiempo de espera máximo de 90 segundos, con mensaje claro al agotarse.

### Reglas de trabajo

1. Plan explícito antes de escribir código. Espera aprobación.
2. Construye y prueba **el servicio primero**, en local, con un nombre de
   usuario real. No toques el frontend hasta que el endpoint responda bien.
3. Verifica que el resultado tenga la misma forma que un elemento de
   `partidas.json`. Compáralos campo por campo.
4. Verifica en la documentación oficial cualquier API que no conozcas con
   certeza.
5. **No hagas commits.** Propón el mensaje y espera.

### NO CONSTRUYAS

- Base de datos, autenticación, registro de usuarios.
- Caché persistente entre peticiones.
- Descarga masiva o análisis de varias partidas por consulta.
- Uso de TensorFlow en el servicio.
- Cualquier función sobre partidas en curso.
- Almacenamiento de datos de jugadores más allá de la respuesta.

### Primera entrega

Solo `servicio/` funcionando en local: `GET /salud` responde, y `POST /analizar`
con un nombre de usuario real devuelve el JSON con la forma correcta. Sin
frontend, sin despliegue.

Criterio de aceptación: puedo llamar al endpoint desde la terminal y recibir un
análisis cuyos campos coinciden con los de `partidas.json`.

---

## Después: despliegue en Render

1. Repositorio en GitHub con la carpeta `servicio/`.
2. En Render, nuevo *Web Service* apuntando a ese repositorio.
3. Directorio raíz: `servicio`. Comando de arranque:
   `uvicorn main:app --host 0.0.0.0 --port $PORT`
4. Variable de entorno `PUBG_API_KEY` en el panel de Render, **nunca en el
   repositorio**.
5. Copia la URL que te asigne y configúrala en el frontend.

**El día de la demostración**, abre `/salud` diez minutos antes. El servicio
gratuito se duerme tras quince minutos de inactividad y tarda cerca de un minuto
en despertar. Ese despertar delante del evaluador es el riesgo más alto de toda
la presentación, y se evita con un clic.
