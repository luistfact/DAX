import { useCallback, useRef, useState } from 'react'
import type { Partida } from '../types/datos'

const URL_SERVICIO: string = import.meta.env.VITE_SERVICIO_URL ?? 'http://localhost:8000'
const TIEMPO_MAXIMO_MS = 90_000

type Estado =
  | { fase: 'inactivo' }
  | { fase: 'cargando'; inicio: number }
  | { fase: 'error'; mensaje: string }
  | { fase: 'listo'; partida: Partida }

type ErrorServicio = { error: { codigo: string; mensaje: string } }

/** Error con un mensaje ya redactado en español por el servicio: se muestra tal cual. */
class ErrorDelServicio extends Error {}

const MENSAJE_SIN_CONEXION = 'No se pudo conectar con el servicio de análisis. Intenta de nuevo en un momento.'

/** Llama a POST /analizar del servicio en vivo; nunca a la API de PUBG desde el navegador. */
export function useAnalisis() {
  const [estado, setEstado] = useState<Estado>({ fase: 'inactivo' })
  const controladorRef = useRef<AbortController | null>(null)

  const analizar = useCallback((nick: string, plataforma = 'steam') => {
    controladorRef.current?.abort()
    const controlador = new AbortController()
    controladorRef.current = controlador
    const temporizador = setTimeout(() => controlador.abort(), TIEMPO_MAXIMO_MS)
    setEstado({ fase: 'cargando', inicio: Date.now() })

    fetch(`${URL_SERVICIO}/analizar`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ nick, plataforma }),
      signal: controlador.signal,
    })
      .then(async (res) => {
        const cuerpo: unknown = await res.json().catch(() => null)
        if (!res.ok) {
          const mensaje = (cuerpo as ErrorServicio | null)?.error?.mensaje
          throw mensaje ? new ErrorDelServicio(mensaje) : new Error(`HTTP ${res.status}`)
        }
        if (controladorRef.current === controlador) setEstado({ fase: 'listo', partida: cuerpo as Partida })
      })
      .catch((err: unknown) => {
        // Cancelada por el usuario o reemplazada por otra búsqueda: ya no es la vigente.
        if (controladorRef.current !== controlador) return
        if (controlador.signal.aborted) {
          setEstado({
            fase: 'error',
            mensaje: 'El servicio tardó demasiado en responder (más de 90 segundos). Intenta de nuevo.',
          })
          return
        }
        // Los errores del navegador ("Failed to fetch") y los códigos HTTP sueltos
        // no le dicen nada al jugador: solo se muestra el mensaje del servicio.
        const mensaje = err instanceof ErrorDelServicio ? err.message : MENSAJE_SIN_CONEXION
        setEstado({ fase: 'error', mensaje })
      })
      .finally(() => clearTimeout(temporizador))
  }, [])

  const reiniciar = useCallback(() => {
    const vigente = controladorRef.current
    controladorRef.current = null
    vigente?.abort()
    setEstado({ fase: 'inactivo' })
  }, [])

  return { estado, analizar, reiniciar }
}
