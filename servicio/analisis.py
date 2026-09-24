"""Pipeline completo: nombre de usuario de PUBG -> análisis de la partida más reciente.

Replica exactamente la construcción de la tabla analítica del notebook
(celda 9 de zonaazul_completo.ipynb): merge_asof posición/zona, ventanas de
60 s, distancia relativa, desplazamiento del centroide y fase por
discretización del radio. Cualquier diferencia con esa celda invalida las
predicciones del modelo.
"""
from __future__ import annotations

import logging
import os
import sys
from pathlib import Path
from urllib.parse import quote

import numpy as np
import pandas as pd
import requests

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
import zonaazul as za  # noqa: E402  (después de ajustar sys.path)

import modelos

logger = logging.getLogger(__name__)

# Mismos valores que en la celda 2 del notebook: deben coincidir con los
# usados para construir la tabla analítica de entrenamiento.
MAPA = "Baltic_Main"       # código interno de Erangel en la API de PUBG
MODO_JUEGO = "squad"
VENTANA = 60               # segundos por ventana de agregación
T_MAX = 900                # horizonte de análisis: primeros 15 minutos
LIMITE_CANDIDATOS = 20     # partidas recientes que se revisan como máximo


class ErrorAnalisis(Exception):
    """Error tipado que el endpoint traduce a una respuesta clara."""

    def __init__(self, codigo: str, mensaje: str):
        super().__init__(mensaje)
        self.codigo = codigo
        self.mensaje = mensaje


RUTA_CLAVE_RESPALDO = Path(__file__).resolve().parent.parent / "pubg_key.txt"


def _leer_clave() -> str | None:
    """PUBG_API_KEY del entorno; si no está, pubg_key.txt como respaldo de desarrollo."""
    clave = os.environ.get("PUBG_API_KEY")
    if clave:
        return clave
    if RUTA_CLAVE_RESPALDO.exists():
        return RUTA_CLAVE_RESPALDO.read_text().strip()
    return None


def _cliente(plataforma: str) -> za.PubgClient:
    """Construye el cliente con la clave leída de entorno; nunca del código."""
    clave = _leer_clave()
    if not clave:
        raise ErrorAnalisis("SERVICIO_NO_DISPONIBLE", "La API de PUBG no responde")
    return za.PubgClient(clave, platform=plataforma)


def _buscar_jugador(cli: za.PubgClient, nick: str) -> tuple[str, list[str]]:
    """Devuelve (account_id, ids de sus partidas recientes, más reciente primero)."""
    url = f"{za.BASE_API}/{cli.platform}/players?filter[playerNames]={quote(nick)}"
    try:
        # Se llama al método privado del cliente a propósito: reutiliza el
        # limitador de cuota ya construido en zonaazul.py sin modificar ese
        # módulo (lo regenera la celda %%writefile del notebook).
        datos = cli._get(url, limitado=True)
    except FileNotFoundError as e:
        raise ErrorAnalisis("USUARIO_NO_ENCONTRADO",
                            "No encontramos ese nombre de usuario en Steam") from e
    except RuntimeError as e:
        # `_get` agota sus reintentos solo tras respuestas 429 o 5xx; en /players,
        # el único recurso limitado por cuota de este flujo, eso es la cuota.
        # Cualquier otro código (p. ej. 401 por una clave inválida) llega como
        # "HTTP nnn: ..." y no debe disfrazarse de límite: se registra el
        # código real para que se vea en los logs del despliegue.
        if str(e).startswith("Reintentos agotados"):
            raise ErrorAnalisis("LIMITE_ALCANZADO",
                                "Demasiadas consultas, intenta en un minuto") from e
        logger.error("La API de PUBG rechazó /players: %s", e)
        raise ErrorAnalisis("SERVICIO_NO_DISPONIBLE", "La API de PUBG no responde") from e

    jugadores = datos.get("data") or []
    if not jugadores:
        raise ErrorAnalisis("USUARIO_NO_ENCONTRADO",
                            "No encontramos ese nombre de usuario en Steam")

    jugador = jugadores[0]
    ids = [m["id"] for m in jugador.get("relationships", {})
                             .get("matches", {}).get("data", [])]
    return jugador["id"], ids


def _elegir_partida(cli: za.PubgClient, match_ids: list[str]) -> tuple[str, dict]:
    """Primera partida de escuadrón en Erangel, no personalizada, de la lista.

    La API ordena `match_ids` por recencia (más reciente primero), así que
    basta con tomar la primera compatible. Una partida individual que ya
    expiró (404) se salta; solo si eso ocurrió se distingue "no había
    ninguna compatible" de "la había, pero expiró".
    """
    hubo_expirada = False
    for match_id in match_ids[:LIMITE_CANDIDATOS]:
        try:
            meta = cli.match(match_id)
        except FileNotFoundError:
            hubo_expirada = True
            continue
        except RuntimeError as e:
            logger.error("La API de PUBG rechazó /matches: %s", e)
            raise ErrorAnalisis("SERVICIO_NO_DISPONIBLE",
                                "La API de PUBG no responde") from e

        attrs = meta["data"]["attributes"]
        if (attrs.get("mapName") == MAPA and attrs.get("gameMode") == MODO_JUEGO
                and not attrs.get("isCustomMatch")):
            return match_id, meta

    if hubo_expirada:
        raise ErrorAnalisis("PARTIDA_EXPIRADA", "Esa partida ya no está disponible")
    raise ErrorAnalisis("SIN_PARTIDAS_COMPATIBLES",
                        "No hay partidas recientes de escuadrón en Erangel")


def _descargar_telemetria(cli: za.PubgClient, url: str) -> list[dict]:
    """Trae la telemetría a memoria; no se escribe nada a disco."""
    try:
        r = cli.session.get(url, headers={"Accept-Encoding": "gzip"}, timeout=60)
        r.raise_for_status()
    except requests.exceptions.HTTPError as e:
        if e.response is not None and e.response.status_code == 404:
            raise ErrorAnalisis("PARTIDA_EXPIRADA",
                                "Esa partida ya no está disponible") from e
        raise ErrorAnalisis("SERVICIO_NO_DISPONIBLE",
                            "La API de PUBG no responde") from e
    except requests.exceptions.RequestException as e:
        raise ErrorAnalisis("SERVICIO_NO_DISPONIBLE",
                            "La API de PUBG no responde") from e
    return r.json()


def _parsear_equipo(eventos: list[dict], map_name: str, team_id: int,
                    t_max: int = T_MAX) -> tuple[pd.DataFrame, pd.DataFrame, pd.DataFrame]:
    """Recorre la bitácora una sola vez; descarta lo que no es del equipo o pasa el minuto 15."""
    escala = za.MAP_SIZES_CM.get(map_name, 816_000)
    pos, zona, bajas = [], [], []

    for ev in eventos:
        t = ev.get("_T")

        if t == "LogPlayerPosition":
            elapsed = ev.get("elapsedTime")
            if elapsed is None or elapsed >= t_max:
                continue
            ch = ev.get("character") or {}
            if ch.get("teamId") != team_id:
                continue
            loc = ch.get("location") or {}
            x, y = loc.get("x"), loc.get("y")
            pos.append({
                "t": elapsed, "ts": ev.get("_D"), "account_id": ch.get("accountId"),
                "health": ch.get("health"),
                "x_norm": x / escala if x is not None else None,
                "y_norm": y / escala if y is not None else None,
            })

        elif t == "LogGameStatePeriodic":
            gs = ev.get("gameState") or {}
            elapsed = gs.get("elapsedTime")
            if elapsed is None or elapsed >= t_max:
                continue
            sz = gs.get("safetyZonePosition") or {}
            zona.append({
                "t": elapsed,
                "safety_x_norm": sz.get("x") / escala if sz.get("x") is not None else None,
                "safety_y_norm": sz.get("y") / escala if sz.get("y") is not None else None,
                "safety_r_norm": (gs.get("safetyZoneRadius") or 0) / escala,
                "num_alive_teams": gs.get("numAliveTeams"),
            })

        # Mismos dos nombres de evento que admite el parser del notebook.
        elif t in ("LogPlayerKillV2", "LogPlayerKill"):
            v = ev.get("victim") or {}
            if v.get("teamId") != team_id:
                continue
            vl = v.get("location") or {}
            if vl.get("x") is None or vl.get("y") is None:
                continue  # sin posición no se dibuja: no se inventa una
            bajas.append({"ts": ev.get("_D"),
                          "x_norm": vl["x"] / escala, "y_norm": vl["y"] / escala})

    return pd.DataFrame(pos), pd.DataFrame(zona), pd.DataFrame(bajas)


def _construir_tabla(pos: pd.DataFrame, zona: pd.DataFrame) -> pd.DataFrame:
    """Réplica de la celda 9 del notebook, acotada a un escuadrón de una partida."""
    pos = pos.sort_values("t")
    zona = zona.sort_values("t")
    df = pd.merge_asof(pos, zona, on="t", direction="backward")

    df["dist_centro"] = np.hypot(df.x_norm - df.safety_x_norm,
                                 df.y_norm - df.safety_y_norm)
    df["dist_rel"] = df.dist_centro / df.safety_r_norm.replace(0, np.nan)
    df["fuera_zona"] = (df.dist_rel > 1).astype(int)
    df["ventana"] = (df.t // VENTANA).astype(int)

    agg = (df.groupby("ventana")
             .agg(jugadores_vivos=("account_id", "nunique"),
                  hp_medio=("health", "mean"),
                  hp_minimo=("health", "min"),
                  dist_centro=("dist_centro", "mean"),
                  dist_rel=("dist_rel", "mean"),
                  frac_fuera=("fuera_zona", "mean"),
                  radio_zona=("safety_r_norm", "mean"),
                  equipos_vivos=("num_alive_teams", "min"))
             .reset_index())
    agg["tam_real"] = agg["jugadores_vivos"].max()

    cen = df.groupby("ventana")[["x_norm", "y_norm"]].mean().reset_index()
    cen[["dx", "dy"]] = cen[["x_norm", "y_norm"]].diff()
    cen["desplazamiento"] = np.hypot(cen.dx, cen.dy)
    agg = agg.merge(cen[["ventana", "desplazamiento"]], on="ventana", how="left")
    agg["desplazamiento"] = agg.desplazamiento.fillna(0)

    # Mismos cortes que en el entrenamiento. A diferencia del corpus de
    # entrenamiento, una sola partida en vivo puede arrancar con un radio
    # fuera de los cortes definidos (NaN); se trata como la fase más
    # temprana en vez de descartar la ventana.
    agg["fase_zona"] = pd.cut(agg.radio_zona,
                              bins=[0, .15, .25, .35, .45, .60, .80],
                              labels=[6, 5, 4, 3, 2, 1]).astype(float)
    agg["fase_zona"] = agg.fase_zona.fillna(1)
    return agg


def _construir_mapa(pos: pd.DataFrame, zona: pd.DataFrame, bajas: pd.DataFrame,
                    t_max: int = T_MAX) -> dict:
    """Trayectoria, círculo y bajas por minuto, en las coordenadas normalizadas del parser."""
    pos = pos.dropna(subset=["x_norm", "y_norm"])
    ventana_pos = (pos.t // VENTANA).astype(int)
    cen = pos.groupby(ventana_pos)[["x_norm", "y_norm"]].mean()
    trayectoria = [{"minuto": int(v), "x": round(float(f.x_norm), 4), "y": round(float(f.y_norm), 4)}
                   for v, f in cen.iterrows()]

    # El círculo "en ese minuto" es el último estado observado dentro de la
    # ventana; radio 0 significa que la zona aún no existe y no se dibuja.
    zona = zona.dropna(subset=["safety_x_norm", "safety_y_norm"])
    zona = zona[zona.safety_r_norm > 0]
    # Después del último minuto con posiciones el escuadrón ya no está en la
    # partida: los círculos posteriores no son parte de su recorrido.
    zona = zona[zona.t // VENTANA <= ventana_pos.max()]
    ultima = zona.sort_values("t").groupby((zona.t // VENTANA).astype(int)).last()
    zonas = [{"minuto": int(v), "x": round(float(f.safety_x_norm), 4),
              "y": round(float(f.safety_y_norm), 4), "r": round(float(f.safety_r_norm), 4)}
             for v, f in ultima.iterrows()]

    # Las bajas solo traen la marca de tiempo absoluta (_D). Se pasan al reloj
    # de elapsedTime con el desfase medido en las posiciones del propio equipo,
    # que traen ambas marcas: así caen en la misma ventana que usa la tabla.
    eventos = []
    if not bajas.empty and pos.ts.notna().any():
        desfase = (pd.to_datetime(pos.ts, utc=True)
                   - pd.to_timedelta(pos.t, unit="s")).median()
        t_baja = (pd.to_datetime(bajas.ts, utc=True) - desfase).dt.total_seconds()
        for t, f in zip(t_baja, bajas.itertuples()):
            if 0 <= t < t_max:
                eventos.append({"minuto": int(t // VENTANA),
                                "x": round(float(f.x_norm), 4), "y": round(float(f.y_norm), 4)})

    return {"trayectoria": trayectoria, "zonas": zonas, "eventos": eventos}


def _generar_informe(agg: pd.DataFrame, prob: np.ndarray,
                     posicion_final: int, escuadrones: int) -> dict:
    """Réplica literal de `resumen_determinista` (celda 76 del notebook)."""
    t = agg.sort_values("ventana")
    hp_ini, hp_fin = t.hp_medio.iloc[0], t.hp_medio.iloc[-1]
    bajas = int(t.jugadores_vivos.iloc[0] - t.jugadores_vivos.iloc[-1])
    fuera = float(t.frac_fuera.mean())

    if len(prob) > 1:
        caida = int(np.argmin(np.diff(prob))) + 1
        magnitud = float(np.min(np.diff(prob)))
        critico = (f"Minuto {caida}: la probabilidad cayó "
                   f"{abs(magnitud):.0%} respecto del minuto anterior.")
    else:
        critico = "No se dispone de curva de probabilidad para esta partida."

    favorables, adversos, recomendaciones = [], [], []
    (favorables if hp_fin >= 80 else adversos).append(
        f"Salud final del escuadrón: {hp_fin:.0f} puntos")
    if bajas == 0:
        favorables.append("El escuadrón se mantuvo completo")
    else:
        adversos.append(f"Se perdieron {bajas} integrantes")
        recomendaciones.append("Revisar la coordinación en los enfrentamientos")
    if fuera > 0.15:
        adversos.append(f"Permaneció fuera de la zona el {fuera:.0%} del tiempo")
        recomendaciones.append("Iniciar la rotación antes del cierre del círculo")
    else:
        favorables.append("Posicionamiento dentro de la zona sostenido")
    if hp_ini - hp_fin > 40:
        recomendaciones.append("Priorizar la recuperación de salud tras cada combate")

    puntaje = (hp_fin / 100) - 0.2 * bajas
    veredicto = ("Dominante" if puntaje > .9 else "Sólida" if puntaje > .7
                 else "Irregular" if puntaje > .4 else "Difícil" if puntaje > .1
                 else "Adversa")

    return {
        "veredicto": veredicto,
        "resumen": (f"El escuadrón terminó en la posición "
                    f"{posicion_final} de {escuadrones}. "
                    f"Comenzó con {hp_ini:.0f} puntos de salud promedio y cerró "
                    f"con {hp_fin:.0f}, perdiendo {bajas} integrantes durante "
                    f"los {len(t)} minutos observados."),
        "momento_critico": critico,
        "factores_favorables": favorables[:3],
        "factores_adversos": adversos[:3],
        "recomendaciones": recomendaciones[:3] or ["Mantener el planteamiento actual"],
        "confianza": "Alta" if len(t) >= 12 else "Media" if len(t) >= 6 else "Baja",
        "_origen": "determinista",
    }


def analizar(nick: str, plataforma: str = "steam") -> dict:
    """Nombre de usuario -> mismo objeto que un elemento de partidas.json."""
    cli = _cliente(plataforma)
    account_id, match_ids = _buscar_jugador(cli, nick)
    if not match_ids:
        raise ErrorAnalisis("SIN_PARTIDAS_COMPATIBLES",
                            "No hay partidas recientes de escuadrón en Erangel")

    match_id, meta = _elegir_partida(cli, match_ids)
    url_telemetria = za.PubgClient.telemetry_url(meta)

    participantes, info = za.parsear_meta(meta, match_id)
    fila = participantes[participantes.account_id == account_id]
    if fila.empty:
        raise ErrorAnalisis("SIN_PARTIDAS_COMPATIBLES",
                            "No hay partidas recientes de escuadrón en Erangel")
    team_id = int(fila.team_id.iloc[0])
    team_rank = int(fila.team_rank.iloc[0])
    n_rosters = int(participantes.team_id.nunique())
    del meta, participantes

    eventos = _descargar_telemetria(cli, url_telemetria)
    pos, zona, bajas = _parsear_equipo(eventos, info["map_name"], team_id)
    del eventos

    if pos.empty:
        raise ErrorAnalisis("PARTIDA_EXPIRADA", "Esa partida ya no está disponible")

    agg = _construir_tabla(pos, zona)
    mapa = _construir_mapa(pos, zona, bajas)
    del pos, zona, bajas

    prob = modelos.predecir(agg)

    minutos = [{
        "minuto": int(fila.ventana),
        "probabilidad": round(float(p), 4),
        "vivos": int(fila.jugadores_vivos),
        "salud": round(float(fila.hp_medio), 1),
        "dist_rel": round(float(fila.dist_rel), 3),
        "fase": int(fila.fase_zona),
        "equipos_vivos": int(fila.equipos_vivos),
    } for fila, p in zip(agg.itertuples(), prob)]

    clasifico = ((team_rank - 1) / (n_rosters - 1) <= 0.25) if n_rosters > 1 else True
    informe = _generar_informe(agg, prob, team_rank, n_rosters)

    return {
        "id": f"{match_id[:8]}-{team_id}",
        "match_id": match_id,
        "team_id": team_id,
        "posicion_final": team_rank,
        "escuadrones": n_rosters,
        "clasifico": bool(clasifico),
        "minutos": minutos,
        "informe": informe,
        # Solo en el análisis en vivo: el corpus guarda distancias al círculo,
        # no posiciones, y con eso no se reconstruye un recorrido.
        "mapa": mapa,
    }
