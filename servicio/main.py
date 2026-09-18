"""FastAPI: endpoints del servicio de análisis en vivo de ZonaAzul.

Se ejecuta con el directorio de trabajo en `servicio/` (igual en local que en
Render): `uvicorn main:app`. Los imports de `analisis` y `modelos` son
absolutos a propósito, para que el mismo comando funcione en ambos sitios.
"""
from __future__ import annotations

import logging
import os
from contextlib import asynccontextmanager

# Sin esto, logger.info(...) no emite nada: Python no configura ningún
# handler por defecto y el nivel implícito es WARNING. El asistente registra
# el consumo de tokens con logger.info; sin esta línea, ese registro se
# pierde en silencio (en local y en Render).
logging.basicConfig(level=logging.INFO, format="%(asctime)s %(name)s %(levelname)s %(message)s")

from dotenv import load_dotenv
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from slowapi.util import get_remote_address

import modelos
from analisis import ErrorAnalisis, analizar
from asistente import responder
from herramientas import ErrorAsistente

load_dotenv()  # PUBG_API_KEY / OPENAI_API_KEY en local; en Render se definen en el panel

CODIGO_A_HTTP = {
    "USUARIO_NO_ENCONTRADO": 404,
    "SIN_PARTIDAS_COMPATIBLES": 404,
    "PARTIDA_EXPIRADA": 404,
    "LIMITE_ALCANZADO": 429,
    "SERVICIO_NO_DISPONIBLE": 503,
}

CODIGO_A_HTTP_ASISTENTE = {
    "PARTIDA_NO_ENCONTRADA": 404,
    "SERVICIO_NO_DISPONIBLE": 503,
}


@asynccontextmanager
async def lifespan(app: FastAPI):
    modelos.cargar()  # una sola vez al arrancar, no en cada petición
    yield


app = FastAPI(lifespan=lifespan)

limiter = Limiter(key_func=get_remote_address)
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

LOCALHOST_VITE = "http://localhost:5173"

# Sin "*": FRONTEND_ORIGIN admite varios orígenes separados por coma (p. ej.
# una URL de preview y una de producción). localhost:5173 siempre queda
# permitido, incluso en despliegue, para poder probar en local contra el
# servicio ya desplegado sin tocar la variable de entorno.
_origenes_propios = [o.strip() for o in os.environ.get("FRONTEND_ORIGIN", "").split(",") if o.strip()]
ORIGENES_PERMITIDOS = list(dict.fromkeys([*_origenes_propios, LOCALHOST_VITE]))

app.add_middleware(
    CORSMiddleware,
    allow_origins=ORIGENES_PERMITIDOS,
    allow_methods=["GET", "POST"],
    allow_headers=["*"],
)


class SolicitudAnalisis(BaseModel):
    nick: str
    plataforma: str = "steam"


class Mensaje(BaseModel):
    rol: str
    texto: str


class SolicitudAsistente(BaseModel):
    partida_id: str
    mensajes: list[Mensaje]
    # La partida completa de "Analizar mi partida": esa nunca se persiste en
    # partidas.json, así que sin esto el asistente no podría encontrarla por
    # id. Ausente (None) para las partidas del corpus precalculado.
    partida: dict | None = None


@app.exception_handler(ErrorAnalisis)
async def manejar_error_analisis(request: Request, exc: ErrorAnalisis) -> JSONResponse:
    return JSONResponse(
        status_code=CODIGO_A_HTTP.get(exc.codigo, 503),
        content={"error": {"codigo": exc.codigo, "mensaje": exc.mensaje}},
    )


@app.exception_handler(ErrorAsistente)
async def manejar_error_asistente(request: Request, exc: ErrorAsistente) -> JSONResponse:
    return JSONResponse(
        status_code=CODIGO_A_HTTP_ASISTENTE.get(exc.codigo, 503),
        content={"error": {"codigo": exc.codigo, "mensaje": exc.mensaje}},
    )


@app.exception_handler(Exception)
async def manejar_error_inesperado(request: Request, exc: Exception) -> JSONResponse:
    # Nunca un 500 sin cuerpo: el frontend siempre puede explicar qué pasó.
    return JSONResponse(
        status_code=503,
        content={"error": {"codigo": "SERVICIO_NO_DISPONIBLE",
                           "mensaje": "La API de PUBG no responde"}},
    )


@app.get("/salud")
async def salud() -> dict:
    return {"estado": "ok"}


@app.post("/analizar")
@limiter.limit("10/minute")
async def post_analizar(request: Request, solicitud: SolicitudAnalisis) -> dict:
    return analizar(solicitud.nick, solicitud.plataforma)


@app.post("/asistente")
@limiter.limit("10/minute")
async def post_asistente(request: Request, solicitud: SolicitudAsistente) -> dict:
    return responder(
        solicitud.partida_id, [m.model_dump() for m in solicitud.mensajes], solicitud.partida
    )
