"""Carga de los modelos serializados que usa el análisis en vivo.

Solo se usa el bosque aleatorio (modelo_supervisado.pkl): ya es un Pipeline de
scikit-learn con su propia imputación, así que no hace falta aplicar por
separado el imputador/escalador de preprocesamiento.pkl (esos están ajustados
para la red recurrente, que este servicio no usa). De preprocesamiento.pkl
solo se toma `predictores`: el orden exacto de columnas con el que se
entrenó, que es lo que de verdad puede romper una predicción si difiere.
"""
from __future__ import annotations

from pathlib import Path
from threading import Lock

import joblib
import numpy as np
import pandas as pd

RUTA_MODELOS = Path(__file__).resolve().parent.parent / "modelos"

_bloqueo = Lock()
_pipeline = None
_predictores: list[str] | None = None


def cargar() -> None:
    """Carga el pipeline y el orden de predictores una sola vez (idempotente)."""
    global _pipeline, _predictores
    if _pipeline is not None:
        return
    with _bloqueo:
        if _pipeline is not None:
            return
        _pipeline = joblib.load(RUTA_MODELOS / "modelo_supervisado.pkl")
        preprocesamiento = joblib.load(RUTA_MODELOS / "preprocesamiento.pkl")
        _predictores = preprocesamiento["predictores"]


def predictores() -> list[str]:
    """Orden exacto de columnas que espera el modelo."""
    cargar()
    return _predictores


def predecir(tabla: pd.DataFrame) -> np.ndarray:
    """Probabilidad de top25 por fila, en el mismo orden que las filas de entrada."""
    cargar()
    return _pipeline.predict_proba(tabla[_predictores])[:, 1]
