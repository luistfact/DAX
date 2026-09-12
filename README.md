# ZonaAzul

Estimación de la probabilidad de supervivencia de escuadrones en partidas de
PUBG, con análisis explicativo y asistente conversacional.

**Proyecto Integrador — Módulo V**
Diplomado en Ciencia de Datos · Centro de Educación Continua, FES Acatlán, UNAM

---

## Qué hace

Escribes tu nombre de usuario de PUBG y el sistema descarga tus partidas
recientes, reconstruye cada una minuto a minuto y estima la probabilidad de que
tu escuadrón terminara en el cuarto superior. Señala el momento en que la
partida se decidió, te asigna un perfil de estilo de juego y responde preguntas
sobre tu desempeño.

Es una herramienta de análisis retrospectivo con fines educativos. No predice
resultados futuros ni ofrece ventaja competitiva en tiempo real.

## Instalación

```bash
git clone https://github.com/USUARIO/zonaazul.git
cd zonaazul
pip install -r requirements.txt
```

## Configuración

La clave de la PUBG Developer API se obtiene gratis en
[developer.pubg.com](https://developer.pubg.com).

```bash
cp .env.example .env
```

Edita `.env` con tus claves:

```
PUBG_API_KEY=tu_clave
OPENAI_API_KEY=tu_clave
```

**Nunca subas el archivo `.env` al repositorio.** Ya está en `.gitignore`.

## Ejecución sin API

El notebook y la aplicación funcionan sin credenciales, con los datos ya
procesados. Esto permite reproducir todo el análisis aunque la interfaz esté
fuera de servicio o las partidas hayan expirado.

- **Datos preprocesados:** [carpeta en Drive](PENDIENTE_ENLACE)
- **Modelos entrenados:** [carpeta en Drive](PENDIENTE_ENLACE)

Descárgalos a `datos/` y `modelos/`, y ejecuta el notebook con `MODO = "local"`.

## Estructura

```
zonaazul/
├── notebooks/
│   ├── 01_obtencion_y_eda.ipynb     Ingesta, parseo y análisis exploratorio
│   └── 02_modelado.ipynb            Clustering, modelos y evaluación
├── src/
│   ├── pubg_api.py                  Cliente de la API con control de cuota
│   ├── ingest.py                    Descarga de partidas
│   └── parse_fase1.py               Parseo de telemetría a tablas
├── app/
│   └── main.py                      Aplicación Streamlit
├── documento/
│   ├── documento.tex                Documento final
│   └── figuras/                     Gráficas exportadas del notebook
├── datos/                           Tabla analítica (los datos crudos no se versionan)
└── modelos/                         Modelos serializados (se descargan de Drive)
```

## Fuentes de datos

Toda la información procede de interfaces de programación públicas.

| Fuente | Uso |
|---|---|
| PUBG Developer API — partidas y telemetría | Corpus de entrenamiento y personalización |
| PUBG Developer API — estadísticas de temporada | Perfil histórico del jugador |
| `pubg/api-assets` | Diccionarios de traducción de identificadores |

El límite de la clave estándar es de diez peticiones por minuto. Los recursos
`/matches` y la descarga de telemetría quedan exentos, lo que hace viable
construir el corpus sin cuotas adicionales.

## Metodología

El análisis exploratorio corrigió la hipótesis de partida. Se esperaba que el
posicionamiento respecto de la zona segura fuera el factor determinante; los
datos muestran que el predictor dominante es la integridad del escuadrón, y que
cerca del 90 % de las eliminaciones proceden del combate directo frente a un
5.5 % atribuible a la zona.

Dos decisiones metodológicas se derivan del análisis:

- **La variable objetivo se normaliza** por el número de escuadrones de cada
  partida, que oscila entre 15 y 46.
- **El eje temporal es la fase del círculo**, no el minuto transcurrido, porque
  cada partida entra en las fases en momentos distintos del reloj.

## Despliegue

La aplicación se publica en Streamlit Community Cloud. Los modelos se descargan
desde Drive al iniciar, por exceder el límite de tamaño de GitHub.

## Autor

PENDIENTE_NOMBRE

## Licencia

MIT. Los datos de PUBG pertenecen a Krafton y se consumen conforme a los
términos de su interfaz pública.
