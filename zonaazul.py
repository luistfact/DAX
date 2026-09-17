"""Utilidades del proyecto ZonaAzul: acceso a la API, parseo y simulación."""
from __future__ import annotations
import gzip, json, math, random, time, uuid
from datetime import datetime, timedelta
from pathlib import Path

import numpy as np
import pandas as pd

BASE_API = "https://api.pubg.com/shards"

# Tamaño de cada mapa en centímetros; las coordenadas de telemetría vienen en cm.
MAP_SIZES_CM = {
    "Baltic_Main": 816_000, "Erangel_Main": 816_000, "Desert_Main": 816_000,
    "Tiger_Main": 816_000, "Kiki_Main": 816_000, "Neon_Main": 816_000,
    "DihorOtok_Main": 612_000, "Savage_Main": 408_000, "Chimera_Main": 306_000,
    "Heaven_Main": 204_000, "Summerland_Main": 204_000, "Range_Main": 204_000,
}

# ====================================================================== #
# 1. Cliente de la API
# ====================================================================== #
class PubgClient:
    """Cliente con limitador de peticiones incorporado."""

    def __init__(self, api_key: str, platform: str = "steam", rpm: int = 10):
        import requests
        self.platform = platform
        self.min_interval = 60.0 / rpm
        self._last = 0.0
        self.session = requests.Session()
        self.session.headers.update({
            "Authorization": f"Bearer {api_key}",
            "Accept": "application/vnd.api+json",
            "Accept-Encoding": "gzip",
        })

    def _get(self, url, limitado=True, reintentos=3):
        for intento in range(reintentos):
            if limitado:
                espera = self.min_interval - (time.time() - self._last)
                if espera > 0:
                    time.sleep(espera)
            r = self.session.get(url, timeout=60)
            if limitado:
                self._last = time.time()
            if r.status_code == 200:
                return r.json()
            if r.status_code == 429:                       # cuota agotada
                reset = int(r.headers.get("X-RateLimit-Reset", 0))
                time.sleep(max(5, reset - int(time.time())) if reset else 15)
                continue
            if r.status_code == 404:
                raise FileNotFoundError(url)               # partida expirada
            if r.status_code >= 500:
                time.sleep(2 ** intento)
                continue
            raise RuntimeError(f"HTTP {r.status_code}: {r.text[:200]}")
        raise RuntimeError(f"Reintentos agotados: {url}")

    def samples(self, since=None):
        """Muestra de partidas recientes. Es el recurso limitado por cuota."""
        url = f"{BASE_API}/{self.platform}/samples"
        if since:
            url += f"?filter[createdAt-start]={since}"
        d = self._get(url, limitado=True)
        return [m["id"] for m in d["data"]["relationships"]["matches"]["data"]]

    def match(self, match_id):
        """Metadatos de partida. Exento del límite de cuota."""
        return self._get(f"{BASE_API}/{self.platform}/matches/{match_id}", limitado=False)

    @staticmethod
    def telemetry_url(match_json):
        aid = match_json["data"]["relationships"]["assets"]["data"][0]["id"]
        for it in match_json["included"]:
            if it["type"] == "asset" and it["id"] == aid:
                return it["attributes"]["URL"]
        raise KeyError("asset de telemetría ausente")

    def descargar_telemetria(self, url, destino):
        import requests
        destino = Path(destino); destino.parent.mkdir(parents=True, exist_ok=True)
        r = requests.get(url, headers={"Accept-Encoding": "gzip"}, timeout=180)
        r.raise_for_status()
        with gzip.open(destino, "wt", encoding="utf-8") as f:
            f.write(r.text)
        return destino


# ====================================================================== #
# 2. Parseo (Fase 1)
# ====================================================================== #
def parsear_meta(meta_json, match_id):
    """Extrae participantes y posición final. Aquí viven las etiquetas."""
    attrs = meta_json["data"]["attributes"]
    incl  = meta_json.get("included", [])
    parts = {i["id"]: i for i in incl if i["type"] == "participant"}
    filas = []
    for r in [i for i in incl if i["type"] == "roster"]:
        st = r["attributes"].get("stats", {})
        for p in r["relationships"]["participants"]["data"]:
            pa = parts.get(p["id"], {}).get("attributes", {}).get("stats", {})
            filas.append({
                "match_id": match_id, "team_id": st.get("teamId"),
                "team_rank": st.get("rank"),
                "won": str(r["attributes"].get("won", "false")).lower() == "true",
                "account_id": pa.get("playerId"), "name": pa.get("name"),
                "kills": pa.get("kills"), "damage_dealt": pa.get("damageDealt"),
                "time_survived": pa.get("timeSurvived"),
                "walk_distance": pa.get("walkDistance"),
            })
    info = {"match_id": match_id, "map_name": attrs.get("mapName"),
            "game_mode": attrs.get("gameMode"), "duration": attrs.get("duration")}
    df = pd.DataFrame(filas)
    for k, v in info.items():
        if k != "match_id":
            df[k] = v
    return df, info


def parsear_telemetria(eventos, match_id, map_name):
    """Recorre la bitácora una sola vez y llena tres tablas planas."""
    escala = MAP_SIZES_CM.get(map_name, 816_000)
    pos, zona, muertes = [], [], []

    for ev in eventos:
        t = ev.get("_T")

        if t == "LogPlayerPosition":
            ch  = ev.get("character") or {}
            loc = ch.get("location") or {}
            x, y = loc.get("x"), loc.get("y")
            pos.append({
                "match_id": match_id, "t": ev.get("elapsedTime"),
                "account_id": ch.get("accountId"), "team_id": ch.get("teamId"),
                "health": ch.get("health"),
                "x_norm": x / escala if x is not None else None,
                "y_norm": y / escala if y is not None else None,
                "in_blue_zone": ch.get("isInBlueZone"),
                "num_alive": ev.get("numAlivePlayers"),
            })

        elif t == "LogGameStatePeriodic":
            gs = ev.get("gameState") or {}
            sz = gs.get("safetyZonePosition") or {}
            zona.append({
                "match_id": match_id, "t": gs.get("elapsedTime"),
                "safety_x_norm": sz.get("x") / escala if sz.get("x") is not None else None,
                "safety_y_norm": sz.get("y") / escala if sz.get("y") is not None else None,
                "safety_r_norm": (gs.get("safetyZoneRadius") or 0) / escala,
                "num_alive_teams": gs.get("numAliveTeams"),
                "num_alive_players": gs.get("numAlivePlayers"),
            })

        # La API usa LogPlayerKillV2 en versiones recientes y LogPlayerKill en
        # partidas antiguas: se admiten ambas.
        elif t in ("LogPlayerKillV2", "LogPlayerKill"):
            v  = ev.get("victim") or {}
            k  = ev.get("killer") or ev.get("finisher") or {}
            di = ev.get("finishDamageInfo") or {}
            vl = v.get("location") or {}
            muertes.append({
                "match_id": match_id, "ts": ev.get("_D"),
                "victim_team": v.get("teamId"), "killer_team": k.get("teamId"),
                "victim_x_norm": vl.get("x") / escala if vl.get("x") is not None else None,
                "victim_y_norm": vl.get("y") / escala if vl.get("y") is not None else None,
                "damage_reason": di.get("damageReason") or ev.get("damageReason"),
                "damage_category": di.get("damageTypeCategory") or ev.get("damageTypeCategory"),
                "distance": di.get("distance") or ev.get("distance"),
            })

    return {"posiciones": pd.DataFrame(pos), "zona": pd.DataFrame(zona),
            "muertes": pd.DataFrame(muertes)}


# ====================================================================== #
# 3. Simulador (modo demo)
# ====================================================================== #
def simular_partida(n_equipos=25, por_equipo=4, duracion=1500, semilla=None):
    """
    Genera una partida con la misma estructura que devuelve la API real.

    Cada equipo recibe una habilidad latente que gobierna simultáneamente su
    velocidad de rotación hacia la zona segura y su supervivencia. La asociación
    entre conducta y resultado emerge de ese parámetro común, no se impone.
    """
    rnd = random.Random(semilla)
    mid = str(uuid.uuid4())
    t0  = datetime(2026, 8, 25, 20, 0, 0)
    ts  = lambda s: (t0 + timedelta(seconds=s)).strftime("%Y-%m-%dT%H:%M:%S.000Z")

    habilidad = {e: rnd.betavariate(2, 2) for e in range(1, n_equipos + 1)}
    orden = sorted(range(1, n_equipos + 1),
                   key=lambda e: habilidad[e] + rnd.gauss(0, 0.12))
    ganador = orden[-1]
    muerte = {e: 120 + (i / n_equipos) * (duracion - 150) + rnd.uniform(-40, 40)
              for i, e in enumerate(orden)}
    muerte[ganador] = duracion + 999

    jug = [{"accountId": f"account.{uuid.uuid4().hex}", "name": f"j{e}_{k}",
            "teamId": e, "x": rnd.uniform(.1, .9) * 816_000,
            "y": rnd.uniform(.1, .9) * 816_000, "health": 100.0,
            "muere": muerte[e] + rnd.uniform(-25, 25)}
           for e in range(1, n_equipos + 1) for k in range(por_equipo)]

    cx, cy = rnd.uniform(.35, .65) * 816_000, rnd.uniform(.35, .65) * 816_000
    radio = lambda t: max(.02, 1 - (t / duracion) ** 1.3) * 816_000 * .5

    eventos, muertos = [], set()
    for t in range(0, duracion + 1, 5):
        r = radio(t)
        vivos = [p for p in jug if t < p["muere"]]
        eventos.append({"_D": ts(t), "_T": "LogGameStatePeriodic", "gameState": {
            "elapsedTime": t, "numAliveTeams": len({p["teamId"] for p in vivos}),
            "numAlivePlayers": len(vivos),
            "safetyZonePosition": {"x": cx, "y": cy, "z": 0}, "safetyZoneRadius": r,
            "poisonGasWarningPosition": {"x": cx, "y": cy, "z": 0},
            "poisonGasWarningRadius": r * .7}})

        if t % 10 == 0:
            for p in vivos:
                dx, dy = cx - p["x"], cy - p["y"]
                d = math.hypot(dx, dy) or 1
                paso = min(d, rnd.uniform(0, 2000 + 5000 * habilidad[p["teamId"]]))
                p["x"] += dx / d * paso + rnd.uniform(-800, 800)
                p["y"] += dy / d * paso + rnd.uniform(-800, 800)
                fuera = math.hypot(p["x"] - cx, p["y"] - cy) > r
                if fuera:
                    p["health"] = max(1.0, p["health"] - rnd.uniform(0, 3))
                eventos.append({"_D": ts(t), "_T": "LogPlayerPosition",
                    "elapsedTime": t, "numAlivePlayers": len(vivos), "character": {
                        "name": p["name"], "teamId": p["teamId"],
                        "health": round(p["health"], 1), "accountId": p["accountId"],
                        "location": {"x": p["x"], "y": p["y"], "z": 100.0},
                        "isInBlueZone": bool(fuera), "isInRedZone": False}})

        for p in jug:
            if p["accountId"] not in muertos and t >= p["muere"]:
                muertos.add(p["accountId"])
                cand = [q for q in vivos if q["teamId"] != p["teamId"]]
                k = rnd.choice(cand) if cand else None
                eventos.append({"_D": ts(t), "_T": "LogPlayerKillV2",
                    "victim": {"name": p["name"], "teamId": p["teamId"],
                               "accountId": p["accountId"],
                               "location": {"x": p["x"], "y": p["y"], "z": 100.0}},
                    "killer": ({"name": k["name"], "teamId": k["teamId"],
                                "accountId": k["accountId"]} if k else None),
                    "finishDamageInfo": {
                        "damageReason": rnd.choice(["HeadShot", "TorsoShot", "PelvisShot"]),
                        "damageTypeCategory": rnd.choice(
                            ["Damage_Gun", "Damage_Groggy", "Damage_BlueZone"]),
                        "distance": round(rnd.uniform(500, 30000), 1)}})

    rank = {e: n_equipos - i for i, e in enumerate(orden)}
    incl = []
    for e in range(1, n_equipos + 1):
        pids = []
        for p in [x for x in jug if x["teamId"] == e]:
            pid = str(uuid.uuid4()); pids.append({"type": "participant", "id": pid})
            incl.append({"type": "participant", "id": pid, "attributes": {"stats": {
                "playerId": p["accountId"], "name": p["name"],
                "kills": rnd.randint(0, 6), "damageDealt": round(rnd.uniform(0, 900), 1),
                "timeSurvived": round(min(p["muere"], duracion), 1),
                "walkDistance": round(rnd.uniform(200, 4000), 1),
                "winPlace": rank[e]}}})
        incl.append({"type": "roster", "id": str(uuid.uuid4()),
            "attributes": {"stats": {"rank": rank[e], "teamId": e},
                           "won": "true" if e == ganador else "false"},
            "relationships": {"participants": {"data": pids}}})
    aid = str(uuid.uuid4())
    incl.append({"type": "asset", "id": aid,
                 "attributes": {"URL": "https://telemetry-cdn.pubg.com/demo.json"}})

    meta = {"data": {"type": "match", "id": mid, "attributes": {
        "mapName": "Baltic_Main", "gameMode": "squad", "duration": duracion,
        "isCustomMatch": False, "createdAt": ts(0)},
        "relationships": {"assets": {"data": [{"type": "asset", "id": aid}]}}},
        "included": incl}
    return eventos, meta, mid
