import { useEffect, useState } from 'react'
import type { Perfiles } from '../types/datos'

type Estado =
  | { cargando: true; error: null; perfiles: null }
  | { cargando: false; error: string; perfiles: null }
  | { cargando: false; error: null; perfiles: Perfiles }

/** Carga perfiles.json, ya precalculado; no hay llamadas a servicios externos. */
export function usePerfiles(): Estado {
  const [estado, setEstado] = useState<Estado>({ cargando: true, error: null, perfiles: null })

  useEffect(() => {
    let cancelado = false
    fetch(`${import.meta.env.BASE_URL}datos/perfiles.json`)
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        return res.json() as Promise<Perfiles>
      })
      .then((perfiles) => {
        if (!cancelado) setEstado({ cargando: false, error: null, perfiles })
      })
      .catch((err: unknown) => {
        if (!cancelado) {
          const mensaje = err instanceof Error ? err.message : 'Error desconocido'
          setEstado({ cargando: false, error: mensaje, perfiles: null })
        }
      })
    return () => {
      cancelado = true
    }
  }, [])

  return estado
}
