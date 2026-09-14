import { useEffect, useState } from 'react'
import type { Partida } from '../types/datos'

type Estado =
  | { cargando: true; error: null; partidas: null }
  | { cargando: false; error: string; partidas: null }
  | { cargando: false; error: null; partidas: Partida[] }

/** Carga partidas.json, ya precalculado; no hay llamadas a la API de PUBG desde el navegador. */
export function usePartidas(): Estado {
  const [estado, setEstado] = useState<Estado>({ cargando: true, error: null, partidas: null })

  useEffect(() => {
    let cancelado = false
    fetch(`${import.meta.env.BASE_URL}datos/partidas.json`)
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        return res.json() as Promise<Partida[]>
      })
      .then((partidas) => {
        if (!cancelado) setEstado({ cargando: false, error: null, partidas })
      })
      .catch((err: unknown) => {
        if (!cancelado) {
          const mensaje = err instanceof Error ? err.message : 'Error desconocido'
          setEstado({ cargando: false, error: mensaje, partidas: null })
        }
      })
    return () => {
      cancelado = true
    }
  }, [])

  return estado
}
