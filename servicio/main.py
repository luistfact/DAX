"""FastAPI: endpoints del servicio de análisis en vivo de ZonaAzul.

Se ejecuta con el directorio de trabajo en `servicio/` (igual en local que en
Render): `uvicorn main:app`. Los imports de `analisis` y `modelos` son
absolutos a propósito, para que el mismo comando funcione en ambos sitios.
"""
from __future__ import annotations

import os
from contextlib import asynccontextmanager

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

load_dotenv()  # PUBG_API_KEY en local; en Render se define en el panel

CODIGO_A_HTTP = {
    "USUARIO_NO_ENCONTRADO": 404,
    "SIN_PARTIDAS_COMPATIBLES": 404,
    "PARTIDA_EXPIRADA": 404,
    "LIMITE_ALCANZADO": 429,
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

app.add_middleware(
    CORSMiddleware,
    # Sin "*": en local el origen del frontend Vite; en despliegue se
    # sustituye por la URL real vía la variable de entorno.
    allow_origins=[os.environ.get("FRONTEND_ORIGIN", "http://localhost:5173")],
    allow_methods=["GET", "POST"],
    allow_headers=["*"],
)


class SolicitudAnalisis(BaseModel):
    nick: str
    plataforma: str = "steam"


@app.exception_handler(ErrorAnalisis)
async def manejar_error_analisis(request: Request, exc: ErrorAnalisis) -> JSONResponse:
    return JSONResponse(
        status_code=CODIGO_A_HTTP.get(exc.codigo, 503),
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
