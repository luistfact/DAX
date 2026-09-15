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
        const cuerpo: unknown = await res.json()
        if (!res.ok) {
          const mensaje = (cuerpo as ErrorServicio).error?.mensaje ?? `HTTP ${res.status}`
          throw new Error(mensaje)
        }
        setEstado({ fase: 'listo', partida: cuerpo as Partida })
      })
      .catch((err: unknown) => {
        if (controlador.signal.aborted) {
          setEstado({
            fase: 'error',
            mensaje: 'El servicio tardó demasiado en responder (más de 90 segundos). Intenta de nuevo.',
          })
          return
        }
        const mensaje = err instanceof Error ? err.message : 'No se pudo conectar con el servicio.'
        setEstado({ fase: 'error', mensaje })
      })
      .finally(() => clearTimeout(temporizador))
  }, [])

  const reiniciar = useCallback(() => setEstado({ fase: 'inactivo' }), [])

  return { estado, analizar, reiniciar }
}
