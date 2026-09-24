# ZonaAzul — Tres mejoras

Dos pasos: primero actualizas el notebook, después le pasas el prompt al agente.

---

# PASO 1 — En el notebook

## Qué cambia y por qué

Los **escenarios alternativos** necesitan el modelo, así que se calculan en el
notebook y se exportan al JSON. La aplicación solo los muestra.

El **mapa** no se puede hacer para las 200 partidas precalculadas: la tabla
analítica guarda la *distancia* al centro del círculo, no la *posición* del
escuadrón, y con una distancia no se reconstruye una trayectoria. Por eso el mapa
vive solo en «Analizar mi partida», donde el servicio sí tiene la telemetría
completa.

**Compartir** es solo frontend. No toca el notebook.

## La celda

Sustituye la celda de exportación completa por esta. Necesita que las variables
del modelado sigan en memoria: si reiniciaste el núcleo, ejecuta desde la celda
puente de la segunda parte.

```python
import json
from pathlib import Path

SALIDA = Path(r"C:\Users\luist\Documents\zonaazul\app\public\datos")
SALIDA.mkdir(parents=True, exist_ok=True)

N_PARTIDAS_EXPORT = 200


def escenarios(traza, i, n):
    """Recalcula la probabilidad alterando una sola variable durante toda la partida.

    ATENCIÓN: es una comparación entre escenarios del modelo, no una predicción
    causal. El modelo mide asociación: cambiar una variable en la entrada no
    equivale a que el jugador la cambie en la partida.
    """
    if not DISPONIBLE_TF:
        return []
    base = float(P_te[i, :n].mean())
    tam = float(traza.tam_real.iloc[0])

    # "Completo" es el tamaño real del escuadrón, no siempre cuatro: un equipo
    # de dos que nunca perdió a nadie ya estaba completo.
    casos = [
        ("Llegar con el escuadrón completo", "jugadores_vivos", tam,
         float(traza.jugadores_vivos.mean())),
        ("Llegar sin daño acumulado", "hp_medio", 95.0,
         float(traza.hp_medio.mean())),
        ("Rotar antes hacia la zona", "dist_rel", 0.30,
         float(traza.dist_rel.mean())),
    ]
    salidas = []
    for nombre, var, objetivo, actual in casos:
        j = PREDICTORES.index(var)
        fila = pd.DataFrame(np.zeros((1, len(PREDICTORES))), columns=PREDICTORES)
        fila[var] = objetivo
        valor_esc = escalador.transform(imputador.transform(fila))[0, j]

        X = Xte_s[i:i+1].copy()
        X[0, :n, j] = valor_esc
        alterna = float(modelo_rnn.predict(X, verbose=0)[0, :n, 0].mean())

        # Si el escuadrón ya estaba en el valor del escenario, no hay nada que
        # mejorar ahí: se marca para que la interfaz lo presente como logro.
        aplica = abs(actual - objetivo) > (0.5 if var == "jugadores_vivos" else
                                           5.0 if var == "hp_medio" else 0.05)
        salidas.append({"escenario": nombre,
                        "probabilidad_base": round(base, 4),
                        "probabilidad_alterna": round(alterna, 4),
                        "diferencia": round(alterna - base, 4),
                        "aplica": bool(aplica)})

    return sorted(salidas, key=lambda r: r["diferencia"], reverse=True)


# --- Partidas ----------------------------------------------------------------
partidas = []
for i, (mid, tid) in enumerate(claves_te[:N_PARTIDAS_EXPORT]):
    n = int(Mte_s[i].sum())
    traza = test[(test.match_id == mid) & (test.team_id == tid)].sort_values("ventana")
    if len(traza) == 0:
        continue
    prob = P_te[i, :n] if DISPONIBLE_TF else None
    rank, total = int(traza.team_rank.iloc[0]), int(traza.n_rosters.iloc[0])

    critico = None
    if prob is not None and len(prob) > 1:
        dif = np.diff(prob)
        k = int(np.argmin(dif))
        critico = {"minuto": int(traza.ventana.iloc[k + 1]),
                   "caida": round(float(dif[k]), 4)}

    grupo = perfil.loc[(perfil.match_id == mid) & (perfil.team_id == tid), "grupo"]

    partidas.append({
        "id": f"{mid[:8]}-{int(tid)}",
        "match_id": mid,
        "team_id": int(tid),
        "posicion_final": rank,
        "escuadrones": total,
        "percentil": round(100 * (total - rank) / (total - 1), 1) if total > 1 else 0.0,
        "clasifico": bool(traza.top25.iloc[0]),
        "grupo_estilo": int(grupo.iloc[0]) if len(grupo) else None,
        "probabilidad_maxima": round(float(prob.max()), 4) if prob is not None else None,
        "momento_critico": critico,
        "minutos": [
            {"minuto": int(f.ventana),
             "probabilidad": round(float(prob[k]), 4) if prob is not None else None,
             "vivos": int(f.jugadores_vivos),
             "salud": round(float(f.hp_medio), 1),
             "dist_rel": round(float(f.dist_rel), 3),
             "fase": int(f.fase_zona),
             "equipos_vivos": int(f.equipos_vivos)}
            for k, (_, f) in enumerate(traza.iterrows()) if k < n
        ],
        "escenarios": escenarios(traza, i, n),
        "informe": generar_resumen(traza, prob),
    })

(SALIDA / "partidas.json").write_text(
    json.dumps(partidas, ensure_ascii=False, indent=1), encoding="utf-8")

# --- Perfiles ----------------------------------------------------------------
perfiles = {
    "caracteristicas": CARACTERISTICAS,
    "grupos": [
        {"grupo": int(g),
         "nombre": NOMBRES_PERFIL[int(g)],
         "descripcion": DESCRIPCION_PERFIL[int(g)],
         "n": int((perfil.grupo == g).sum()),
         "mediana_pct_rank": round(float(perfil[perfil.grupo == g].pct_rank.median()), 3),
         "centro": {c: round(float(v), 3) for c, v in
                    perfil[perfil.grupo == g][CARACTERISTICAS].mean().items()}}
        for g in sorted(perfil.grupo.unique())
    ],
    "promedio_general": {c: round(float(v), 3)
                         for c, v in perfil[CARACTERISTICAS].mean().items()},
}
(SALIDA / "perfiles.json").write_text(
    json.dumps(perfiles, ensure_ascii=False, indent=1), encoding="utf-8")

# --- Métricas ----------------------------------------------------------------
referencia_fase = (d[d.top25 == 1]
                   .groupby("fase_zona")[["hp_medio", "jugadores_vivos",
                                          "dist_rel", "desplazamiento"]]
                   .median().round(3).reset_index().to_dict("records"))

metricas = {
    "modelos": tabla_final.reset_index().to_dict("records"),
    "por_fase": por_fase.to_dict("records"),
    "referencia_fase": referencia_fase,
    "corpus": {"partidas": int(d.match_id.nunique()),
               "observaciones": int(len(d)),
               "escuadrones": int(d.groupby(["match_id", "team_id"]).ngroups)},
}
(SALIDA / "metricas.json").write_text(
    json.dumps(metricas, ensure_ascii=False, indent=1), encoding="utf-8")

print(f"Partidas exportadas: {len(partidas)}")
for f in sorted(SALIDA.iterdir()):
    print(f"  {f.name}: {f.stat().st_size/1024:.0f} KB")
```

La celda tarda más que antes: calcula tres predicciones adicionales por partida,
seiscientas en total. Es normal, no la interrumpas.

---

# PASO 2 — El prompt para Claude Code

---

Vas a implementar tres mejoras en ZonaAzul. NO escribas código todavía: lee esto
completo, revisa los JSON regenerados y el servicio, y devuélveme un plan.

## Mejora 1 — Escenarios alternativos

`partidas.json` trae ahora un campo `escenarios` por partida: una lista ordenada
de mayor a menor ganancia, donde cada elemento tiene `escenario`,
`probabilidad_base`, `probabilidad_alterna`, `diferencia` y `aplica`.

Muéstralos en la vista de partida, en la sección «¿Qué hago la próxima?», como
tarjetas:

- Cada tarjeta muestra el nombre del escenario y el cambio de probabilidad de
  forma visual: la base, la alterna y la diferencia en puntos.
- La tarjeta con mayor diferencia se destaca: es lo primero en lo que el jugador
  debe enfocarse.
- Cuando `aplica` es falso, el escuadrón ya estaba en ese valor. Muéstralo como
  logro —«Ya llegaste completo, bien ahí»— en lugar de como mejora posible.
- Diferencias menores a un punto se presentan como «apenas cambia», no como una
  cifra que sugiera precisión que el modelo no tiene.

**Obligatorio**, debajo de las tarjetas y visible, no como letra pequeña:

> Esto compara escenarios dentro del modelo, no lo que habría pasado en
> realidad. El modelo encuentra relaciones, no causas: los equipos que llegan
> completos suelen ir mejor, pero no sabemos si es por llegar completos o
> porque son mejores jugadores en general.

No la suavices ni la omitas. Distinguir asociación de causalidad es contenido,
no un descargo legal.

## Mejora 2 — Mapa de la partida

**Solo en «Analizar mi partida».** Las partidas precalculadas no tienen
coordenadas, y no deben inventarse.

### En el servicio

El análisis en vivo ya descarga la telemetría completa. Agrega a la respuesta un
campo `mapa` con:

- `trayectoria`: la posición del centroide del escuadrón en cada minuto, en
  coordenadas normalizadas de 0 a 1.
- `zonas`: el centro y el radio del círculo en cada minuto, normalizados igual.
- `eventos`: el minuto y la posición de cada baja del escuadrón.

Usa las mismas coordenadas normalizadas que ya calcula el parser. No agregues
nada que no salga de la telemetría.

### En el frontend

Un componente SVG propio, sin librerías de mapas ni imágenes externas:

- Un lienzo cuadrado con fondo oscuro y una cuadrícula tenue.
- Los círculos de la zona dibujados en el tono frío, del más grande al más
  pequeño, con opacidad creciente conforme se cierran.
- La trayectoria del escuadrón como línea, con un punto por minuto.
- Las bajas marcadas en el tono cálido sobre la trayectoria.
- Un deslizador de minuto que muestre dónde estaba el escuadrón y cómo era el
  círculo en ese instante. Si lo sincronizas con la curva de probabilidad —al
  pasar el cursor por un minuto de la curva se marca en el mapa— mucho mejor.

**Restricción legal:** nada del mapa real de Erangel ni de ningún mapa del juego.
El lienzo es abstracto: solo trayectoria y círculos.

Una frase de lectura encima: *«Tu recorrido durante la partida. Los círculos
azules son la zona segura cerrándose; los puntos rojos, donde cayó alguien de tu
escuadrón.»*

## Mejora 3 — Compartir el análisis

Un botón «Compartir» en la vista de partida que genere una imagen lista para
publicar.

- Composición propia para compartir, no una captura de la pantalla: posición
  final, veredicto, la curva de probabilidad y el momento crítico, con el nombre
  del proyecto discreto en una esquina.
- Formato cuadrado, que funciona en la mayoría de redes.
- Se descarga como PNG. No subas la imagen a ningún servicio.

Verifica en la documentación oficial la librería que elijas para convertir el
componente en imagen, y que funcione con SVG de Recharts: algunas no lo
capturan bien.

## Reglas

- Nada de datos inventados. Si un campo viene nulo, guion.
- Nada extraído del juego.
- Verifica en la documentación oficial cualquier API que no conozcas con certeza.
- **No hagas commits.** Propón el mensaje y espera.

## Orden

1. Plan, y espera aprobación.
2. Escenarios — solo frontend, los datos ya están.
3. Compartir — solo frontend.
4. Mapa — primero el servicio, probado desde la terminal; después el componente.

El mapa va al final porque es el único que toca el backend: si algo se complica,
los otros dos ya quedaron.

Repórtame al terminar cada una.
