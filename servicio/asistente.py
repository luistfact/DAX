"""Orquesta la conversación del asistente: declara las herramientas para la
Responses API, corre el bucle de tool calls, y valida que las cifras de la
respuesta final existan en lo que las herramientas devolvieron (mismo
criterio que `validar_informe` de la sección 14 del notebook, adaptado a
resultados de herramientas en vez de una sola tabla).
"""
from __future__ import annotations

import json
import logging
import os
import re
from pathlib import Path

from openai import OpenAI

import herramientas
from herramientas import ErrorAsistente

logger = logging.getLogger("asistente")

MODELO = "gpt-4o-mini"
MAX_TOKENS_RESPUESTA = 500
MAX_TURNOS = 12  # mensajes de usuario+asistente en el historial recibido
MAX_ITERACIONES_HERRAMIENTAS = 5
TOLERANCIA_CIFRAS = 2

RUTA_INSTRUCCION = Path(__file__).resolve().parent / "instruccion_asistente.md"
INSTRUCCION = RUTA_INSTRUCCION.read_text(encoding="utf-8")

RUTA_CLAVE_RESPALDO = Path(__file__).resolve().parent.parent / "openai_key.txt"

MENSAJE_LIMITE_TURNOS = (
    "Esta conversación ya lleva muchos turnos. Empecemos de nuevo: vuelve a "
    "preguntar y seguimos desde ahí."
)
MENSAJE_SIN_VALIDAR = "No puedo responder eso con seguridad a partir de los datos de la partida."

HERRAMIENTAS_DISPONIBLES = {
    "resumen_partida": herramientas.resumen_partida,
    "estado_por_minuto": herramientas.estado_por_minuto,
    "momento_critico": herramientas.momento_critico,
    "comparar_con_referencia": herramientas.comparar_con_referencia,
    "perfil_estilo": herramientas.perfil_estilo,
}

TOOLS = [
    {
        "type": "function",
        "name": "resumen_partida",
        "description": "Posición final, equipos en la partida, percentil y forma de la curva de probabilidad.",
        "parameters": {
            "type": "object",
            "properties": {"partida_id": {"type": "string"}},
            "required": ["partida_id"],
            "additionalProperties": False,
        },
        "strict": True,
    },
    {
        "type": "function",
        "name": "estado_por_minuto",
        "description": "Compañeros en pie, salud, distancia al círculo y cierre, minuto a minuto en un rango.",
        "parameters": {
            "type": "object",
            "properties": {
                "partida_id": {"type": "string"},
                "desde": {"type": "integer", "description": "Minuto inicial, inclusive"},
                "hasta": {"type": "integer", "description": "Minuto final, inclusive"},
            },
            "required": ["partida_id", "desde", "hasta"],
            "additionalProperties": False,
        },
        "strict": True,
    },
    {
        "type": "function",
        "name": "momento_critico",
        "description": "El minuto de mayor caída de probabilidad y qué cambió ahí.",
        "parameters": {
            "type": "object",
            "properties": {"partida_id": {"type": "string"}},
            "required": ["partida_id"],
            "additionalProperties": False,
        },
        "strict": True,
    },
    {
        "type": "function",
        "name": "comparar_con_referencia",
        "description": (
            "El estado del escuadrón en un cierre del círculo frente a la mediana "
            "de los equipos que llegan al top 25 %."
        ),
        "parameters": {
            "type": "object",
            "properties": {
                "partida_id": {"type": "string"},
                "cierre": {"type": "integer", "description": "Cierre del círculo, de 1 a 6"},
            },
            "required": ["partida_id", "cierre"],
            "additionalProperties": False,
        },
        "strict": True,
    },
    {
        "type": "function",
        "name": "perfil_estilo",
        "description": "El grupo de estilo de juego asignado a esta partida y sus características.",
        "parameters": {
            "type": "object",
            "properties": {"partida_id": {"type": "string"}},
            "required": ["partida_id"],
            "additionalProperties": False,
        },
        "strict": True,
    },
]


def _leer_clave() -> str | None:
    """OPENAI_API_KEY del entorno; si no está, openai_key.txt como respaldo de desarrollo."""
    clave = os.environ.get("OPENAI_API_KEY")
    if clave:
        return clave
    if RUTA_CLAVE_RESPALDO.exists():
        return RUTA_CLAVE_RESPALDO.read_text().strip()
    return None


def _cliente() -> OpenAI:
    clave = _leer_clave()
    if not clave:
        raise ErrorAsistente("SERVICIO_NO_DISPONIBLE", "El asistente no está disponible")
    return OpenAI(api_key=clave)


def _extraer_cifras(texto: str) -> set[float]:
    return {float(x) for x in re.findall(r"\d+(?:\.\d+)?", texto)}


def validar_respuesta(
    texto: str, resultados: list[dict], tolerancia: int = TOLERANCIA_CIFRAS
) -> tuple[bool, list[float]]:
    """Comprueba que las cifras de la respuesta existan en los resultados de
    las herramientas invocadas este turno. Devuelve (es_válida, cifras
    sospechosas), igual que `validar_informe` de la sección 14 del notebook.
    """
    contexto = json.dumps(resultados, ensure_ascii=False)
    cifras_respuesta = _extraer_cifras(texto)
    cifras_contexto = _extraer_cifras(contexto)
    sospechosas = [
        c for c in cifras_respuesta if c > 1 and not any(abs(c - r) < 0.51 for r in cifras_contexto)
    ]
    return len(sospechosas) <= tolerancia, sorted(sospechosas)


def _ejecutar_herramienta(nombre: str, argumentos: dict, partida_en_vivo: dict | None) -> dict:
    funcion = HERRAMIENTAS_DISPONIBLES.get(nombre)
    if funcion is None:
        return {"disponible": False, "razon": f"herramienta desconocida: {nombre}"}
    try:
        return funcion(**argumentos, partida_en_vivo=partida_en_vivo)
    except ErrorAsistente:
        raise
    except Exception as e:  # una herramienta no debe tumbar la conversación
        logger.warning("Herramienta %s falló: %s", nombre, e)
        return {"disponible": False, "razon": "la herramienta no pudo completarse"}


def _un_turno(
    cliente: OpenAI, input_list: list, instrucciones: str, partida_en_vivo: dict | None
) -> tuple[str, list[dict], list[dict]]:
    """Corre el bucle de tool calls hasta que el modelo entrega texto final.

    Devuelve (texto, herramientas_invocadas, resultados_de_herramientas).
    """
    herramientas_invocadas: list[dict] = []
    resultados: list[dict] = []

    for _ in range(MAX_ITERACIONES_HERRAMIENTAS):
        try:
            respuesta = cliente.responses.create(
                model=MODELO,
                instructions=instrucciones,
                input=input_list,
                tools=TOOLS,
                max_output_tokens=MAX_TOKENS_RESPUESTA,
            )
        except Exception as e:
            logger.warning("La API de OpenAI no respondió: %s", e)
            raise ErrorAsistente("SERVICIO_NO_DISPONIBLE", "El asistente no está disponible") from e
        logger.info(
            "asistente: %s tokens entrada, %s tokens salida",
            respuesta.usage.input_tokens,
            respuesta.usage.output_tokens,
        )

        llamadas = [item for item in respuesta.output if item.type == "function_call"]
        if not llamadas:
            return respuesta.output_text, herramientas_invocadas, resultados

        # by_alias=True: algunos campos del SDK usan un nombre de atributo
        # distinto al que espera la API (p. ej. `async_` en vez de `async`,
        # porque "async" es palabra reservada en Python). Sin by_alias, la
        # API rechaza el campo con "Unknown parameter".
        input_list.extend(
            item.model_dump(mode="json", by_alias=True, exclude_none=True) for item in respuesta.output
        )
        for llamada in llamadas:
            argumentos = json.loads(llamada.arguments)
            resultado = _ejecutar_herramienta(llamada.name, argumentos, partida_en_vivo)
            herramientas_invocadas.append({"herramienta": llamada.name, "argumentos": argumentos})
            resultados.append(resultado)
            input_list.append(
                {
                    "type": "function_call_output",
                    "call_id": llamada.call_id,
                    "output": json.dumps(resultado, ensure_ascii=False),
                }
            )

    return MENSAJE_SIN_VALIDAR, herramientas_invocadas, resultados


def _validar_si_corresponde(invocadas: list[dict], texto: str, resultados: list[dict]) -> tuple[bool, list[float]]:
    """Sin herramientas invocadas, la respuesta es de nivel "proyecto" (o un
    "no lo sé" / una redirección): sus cifras vienen de la ficha técnica de
    `instruccion_asistente.md`, no de una herramienta, así que no hay nada
    contra qué validarlas.
    """
    if not invocadas:
        return True, []
    return validar_respuesta(texto, resultados)


def responder(partida_id: str | None, mensajes: list[dict], partida_en_vivo: dict | None = None) -> dict:
    """Nombre de partida (opcional: puede no haber ninguna cargada) +
    historial -> respuesta del asistente y herramientas usadas.
    """
    if partida_id is not None:
        # Valida que exista: la propia en vivo (si el id coincide) o, si no,
        # la del corpus precalculado. Lanza ErrorAsistente si no hay ninguna.
        herramientas._resolver_partida(partida_id, partida_en_vivo)

    if len(mensajes) > MAX_TURNOS:
        return {"respuesta": MENSAJE_LIMITE_TURNOS, "herramientas": []}

    cliente = _cliente()
    if partida_id is not None:
        instrucciones = (
            INSTRUCCION
            + f'\n\nLa partida cargada es "{partida_id}". Usa siempre este valor '
            "exacto como partida_id en cualquier herramienta que lo requiera."
        )
    else:
        instrucciones = (
            INSTRUCCION
            + "\n\nNo hay ninguna partida cargada en esta conversación: no puedes "
            "usar las herramientas de partida (todas piden un partida_id que no "
            "tienes). Solo puedes hablar del proyecto en general con la ficha técnica."
        )
    input_list = [
        {"role": "user" if m["rol"] == "usuario" else "assistant", "content": m["texto"]} for m in mensajes
    ]

    texto, invocadas, resultados = _un_turno(cliente, list(input_list), instrucciones, partida_en_vivo)
    valido, sospechosas = _validar_si_corresponde(invocadas, texto, resultados)

    if not valido:
        logger.warning("Respuesta no validada, cifras sospechosas: %s. Reintentando.", sospechosas)
        instruccion_estricta = (
            instrucciones
            + "\n\nMUY IMPORTANTE: tu respuesta anterior citó cifras que no aparecen en "
            "los datos de las herramientas. No repitas ese error: usa solo números "
            "que las herramientas te dieron."
        )
        texto, invocadas, resultados = _un_turno(cliente, list(input_list), instruccion_estricta, partida_en_vivo)
        valido, sospechosas = _validar_si_corresponde(invocadas, texto, resultados)
        if not valido:
            logger.warning("Segunda respuesta tampoco validó. Cifras: %s", sospechosas)
            return {"respuesta": MENSAJE_SIN_VALIDAR, "herramientas": invocadas}

    return {"respuesta": texto, "herramientas": invocadas}
