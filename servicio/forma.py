"""Puerto a Python de app/src/forma.ts: MISMOS umbrales y MISMO orden de
evaluación, documentados en CLAUDE.md. Si esas reglas cambian ahí, cambian
aquí también — es la única forma de que el asistente diga la misma etiqueta
que ve el jugador en la interfaz.
"""
from __future__ import annotations

FORMAS = ["Dominante", "Caída temprana", "Remontada", "Reñida", "Desplome"]
MINIMO_PUNTOS = 3


def clasificar_forma(minutos: list[dict]) -> str:
    """Clasifica la partida por la forma de su curva de probabilidad."""
    puntos = [
        {"minuto": m["minuto"], "p": m["probabilidad"]}
        for m in minutos
        if m.get("probabilidad") is not None
    ]
    if len(puntos) < MINIMO_PUNTOS:
        return "Sin datos suficientes"

    valores = [p["p"] for p in puntos]
    min_global = min(valores)
    ultimo = valores[-1]

    # 1. Remontada: cae por debajo de 0.30 en algún punto y termina por encima de 0.50.
    if min_global < 0.3 and ultimo > 0.5:
        return "Remontada"

    # 2. Caída temprana: cae >=15 puntos respecto de su máximo hasta ese
    # momento, antes del minuto 5, y el cierre no recupera ese máximo
    # (margen de 0.05).
    primer_tramo = [p for p in puntos if p["minuto"] <= 5]
    if len(primer_tramo) >= 2:
        max_hasta_ahora = primer_tramo[0]["p"]
        pico_antes_de_caer = max_hasta_ahora
        cayo_temprano = False
        for i in range(1, len(primer_tramo)):
            actual = primer_tramo[i]["p"]
            if max_hasta_ahora - actual >= 0.15:
                pico_antes_de_caer = max_hasta_ahora
                cayo_temprano = True
                break
            max_hasta_ahora = max(max_hasta_ahora, actual)
        if cayo_temprano and ultimo < pico_antes_de_caer - 0.05:
            return "Caída temprana"

    # 3. Desplome: se mantuvo alta en los primeros 10 minutos y cae >=20
    # puntos en los últimos 4, cerrando por debajo de 0.40.
    primeros_diez = [p for p in puntos if p["minuto"] <= 10]
    ultimos_cuatro = [p for p in puntos if p["minuto"] >= 11]
    if primeros_diez and ultimos_cuatro:
        max_diez = max(p["p"] for p in primeros_diez)
        if max_diez >= 0.5 and max_diez - ultimo >= 0.2 and ultimo < 0.4:
            return "Desplome"

    # 4. Dominante: en los últimos 5 minutos promedia >=0.55 y nunca se
    # hundió por debajo de 0.35.
    ultimos_cinco = [p["p"] for p in puntos if p["minuto"] >= 10]
    if ultimos_cinco:
        promedio_ultimos_cinco = sum(ultimos_cinco) / len(ultimos_cinco)
        if promedio_ultimos_cinco >= 0.55 and min_global >= 0.35:
            return "Dominante"

    # 5. Reñida: no cae en ninguna de las anteriores.
    return "Reñida"
