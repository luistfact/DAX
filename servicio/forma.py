"""Puerto a Python de app/src/forma.ts: MISMOS umbrales, MISMAS constantes y
MISMO orden de evaluación, documentados en CLAUDE.md (2026-10-04). Si las
reglas cambian ahí, cambian aquí también: es la única forma de que el
asistente diga la misma etiqueta que ve el jugador en la interfaz.

Los umbrales son relativos al catálogo y no absolutos: los anteriores estaban
en la escala de la red sin recalibrar y, tras la recalibración, ningún
escuadrón salía Dominante.
"""
from __future__ import annotations

# Minutos que se ignoran: ahí todos empiezan cerca de la tasa base.
PRIMER_MINUTO = 3
# Puntos mínimos (desde PRIMER_MINUTO); con menos, la partida duró muy poco.
MINIMO_PUNTOS = 3

# Calculadas una sola vez sobre el catálogo (partidas.json, 200 escuadrones;
# 187 con al menos 3 minutos desde el minuto 3). Iguales en app/src/forma.ts.
P75_CIERRE = 0.5348  # percentil 75 del promedio de los últimos 3 minutos
MEDIANA = 0.3448  # mediana de todas las probabilidades desde el minuto 3

CAIDA_REMONTADA = 0.10
RECUPERACION_REMONTADA = 0.15
CAIDA_DESPLOME = 0.20
MARGEN_FONDO_DESPLOME = 0.05

# Orden de evaluación: gana la primera que se cumple. Manda el final de la partida.
FORMAS = ["Desplome", "Dominante", "Remontada", "Reñida"]
PARTIDA_MUY_CORTA = "Partida muy corta"


def _curva(minutos: list[dict]) -> list[float]:
    """Probabilidades desde el minuto 3, en orden de minuto, sin minutos vacíos."""
    validos = [m for m in minutos if m["minuto"] >= PRIMER_MINUTO and m.get("probabilidad") is not None]
    return [m["probabilidad"] for m in sorted(validos, key=lambda m: m["minuto"])]


def _caida_desde_maximo(v: list[float]) -> tuple[float, float]:
    """Caída desde el máximo hasta lo más bajo que llega después de él, y ese fondo."""
    pico = v.index(max(v))
    fondo = min(v[pico:])
    return v[pico] - fondo, fondo


def _mejor_recuperacion(v: list[float]) -> float:
    """La mayor recuperación tras una caída de al menos 10 puntos desde un máximo previo."""
    mejor = 0.0
    for i in range(1, len(v)):
        if max(v[:i]) - v[i] >= CAIDA_REMONTADA:
            mejor = max(mejor, max(v[i:]) - v[i])
    return mejor


def clasificar_forma(minutos: list[dict]) -> str:
    """Clasifica el escuadrón por la forma de su curva de probabilidad."""
    v = _curva(minutos)
    if len(v) < MINIMO_PUNTOS:
        return PARTIDA_MUY_CORTA

    # 1. Desplome: cae al menos 20 puntos desde su máximo y termina a 5
    # puntos o menos de lo más bajo que llegó después.
    caida, fondo = _caida_desde_maximo(v)
    if caida >= CAIDA_DESPLOME and v[-1] - fondo <= MARGEN_FONDO_DESPLOME:
        return "Desplome"

    # 2. Dominante: cierra en el cuarto superior del catálogo y nunca baja de la mediana.
    if sum(v[-3:]) / 3 >= P75_CIERRE and min(v) >= MEDIANA:
        return "Dominante"

    # 3. Remontada: cae al menos 10 puntos y después recupera al menos 15.
    if _mejor_recuperacion(v) >= RECUPERACION_REMONTADA:
        return "Remontada"

    # 4. Reñida: ninguna de las anteriores.
    return "Reñida"
