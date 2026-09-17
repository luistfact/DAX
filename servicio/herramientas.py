"""Las 5 herramientas del asistente: leen los mismos JSON precalculados que
sirve el frontend (`app/public/datos/`), nunca inventan un dato. Todas
devuelven texto/claves en español llano — ese texto entra al contexto del
modelo, así que ayuda a que hable como quien juega, no como el modelo.

Cuando una herramienta no puede responder (dato ausente, no exportado
todavía), devuelve `{"disponible": False, "razon": "..."}` en vez de
inventar o de fallar: es la señal que la instrucción de sistema usa para que
el asistente diga que no lo sabe.
"""
from __future__ import annotations

import json
from pathlib import Path
from threading import Lock

from forma import clasificar_forma

RUTA_DATOS = Path(__file__).resolve().parent.parent / "app" / "public" / "datos"


class ErrorAsistente(Exception):
    """Error tipado que el endpoint traduce a una respuesta clara."""

    def __init__(self, codigo: str, mensaje: str):
        super().__init__(mensaje)
        self.codigo = codigo
        self.mensaje = mensaje


_bloqueo = Lock()
_partidas_por_id: dict[str, dict] | None = None
_metricas: dict | None = None
_perfiles: dict | None = None


def _cargar() -> None:
    global _partidas_por_id, _metricas, _perfiles
    if _partidas_por_id is not None:
        return
    with _bloqueo:
        if _partidas_por_id is not None:
            return
        partidas = json.loads((RUTA_DATOS / "partidas.json").read_text(encoding="utf-8"))
        _partidas_por_id = {p["id"]: p for p in partidas}
        _metricas = json.loads((RUTA_DATOS / "metricas.json").read_text(encoding="utf-8"))
        _perfiles = json.loads((RUTA_DATOS / "perfiles.json").read_text(encoding="utf-8"))


def _buscar_partida(partida_id: str) -> dict:
    _cargar()
    partida = _partidas_por_id.get(partida_id)
    if partida is None:
        raise ErrorAsistente("PARTIDA_NO_ENCONTRADA", f"No existe la partida {partida_id}")
    return partida


def resumen_partida(partida_id: str) -> dict:
    """Posición, equipos, percentil, etiqueta de forma de curva."""
    partida = _buscar_partida(partida_id)
    percentil = partida.get("percentil")
    return {
        "posicion_final": partida["posicion_final"],
        "equipos_en_la_partida": partida["escuadrones"],
        "percentil": round(percentil) if percentil is not None else None,
        "forma_de_la_curva": clasificar_forma(partida["minutos"]),
    }


def estado_por_minuto(partida_id: str, desde: int, hasta: int) -> dict:
    """Compañeros en pie, salud, distancia al círculo, cierre, en ese rango de minutos."""
    partida = _buscar_partida(partida_id)
    filas = [
        {
            "minuto": m["minuto"],
            "companeros_en_pie": m["vivos"],
            "salud_del_equipo": m["salud"],
            "distancia_al_circulo": m["dist_rel"],
            "cierre": m["fase"],
        }
        for m in partida["minutos"]
        if desde <= m["minuto"] <= hasta
    ]
    if not filas:
        return {"disponible": False, "razon": f"no hay minutos registrados entre {desde} y {hasta}"}
    return {"minutos": filas}


def momento_critico(partida_id: str) -> dict:
    """El minuto de mayor caída y qué cambió ahí (compañeros, salud, distancia)."""
    partida = _buscar_partida(partida_id)
    mc = partida.get("momento_critico")
    if mc is None:
        return {"disponible": False, "razon": "no hay momento crítico calculado para esta partida"}

    minutos_por_numero = {m["minuto"]: m for m in partida["minutos"]}
    actual = minutos_por_numero.get(mc["minuto"])
    anterior = minutos_por_numero.get(mc["minuto"] - 1)

    resultado = {"minuto": mc["minuto"], "caida_de_probabilidad": mc["caida"]}
    if actual is not None and anterior is not None:
        resultado["companeros_perdidos"] = max(0, anterior["vivos"] - actual["vivos"])
        resultado["cambio_de_salud"] = round(actual["salud"] - anterior["salud"], 1)
        resultado["cambio_de_distancia_al_circulo"] = round(actual["dist_rel"] - anterior["dist_rel"], 3)
    return resultado


def comparar_con_referencia(partida_id: str, cierre: int) -> dict:
    """El estado del escuadrón en ese cierre frente a la mediana de los que llegan al top."""
    partida = _buscar_partida(partida_id)
    _cargar()
    referencia = next((r for r in _metricas["referencia_fase"] if r["fase_zona"] == cierre), None)
    minutos_en_cierre = [m for m in partida["minutos"] if m["fase"] == cierre]

    if referencia is None or not minutos_en_cierre:
        return {"disponible": False, "razon": f"no hay datos suficientes para el cierre {cierre}"}

    propio = minutos_en_cierre[-1]
    return {
        "cierre": cierre,
        "tu_salud": propio["salud"],
        "tus_companeros_en_pie": propio["vivos"],
        "mediana_salud_de_los_que_llegan_al_top": round(referencia["hp_medio"], 1),
        "mediana_companeros_de_los_que_llegan_al_top": round(referencia["jugadores_vivos"], 1),
    }


def perfil_estilo(partida_id: str) -> dict:
    """El grupo de estilo de juego asignado a esta partida y sus características."""
    partida = _buscar_partida(partida_id)
    _cargar()
    grupo = partida.get("grupo_estilo")
    if grupo is None:
        return {
            "disponible": False,
            "razon": "el grupo de estilo de juego de esta partida no está exportado todavía",
        }
    info = next((g for g in _perfiles["grupos"] if g["grupo"] == grupo), None)
    if info is None:
        return {"disponible": False, "razon": "el grupo asignado no coincide con ninguno de perfiles.json"}
    return {"nombre_del_grupo": info["nombre"], "descripcion": info["descripcion"]}
