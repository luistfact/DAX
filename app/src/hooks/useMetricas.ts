import { useEffect, useState } from 'react'
import type { Metricas } from '../types/datos'

type Estado =
  | { cargando: true; error: null; metricas: null }
  | { cargando: false; error: string; metricas: null }
  | { cargando: false; error: null; metricas: Metricas }

/** Carga metricas.json, ya precalculado; no hay llamadas a servicios externos. */
export function useMetricas(): Estado {
  const [estado, setEstado] = useState<Estado>({ cargando: true, error: null, metricas: null })

  useEffect(() => {
    let cancelado = false
    fetch(`${import.meta.env.BASE_URL}datos/metricas.json`)
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        return res.json() as Promise<Metricas>
      })
      .then((metricas) => {
        if (!cancelado) setEstado({ cargando: false, error: null, metricas })
      })
      .catch((err: unknown) => {
        if (!cancelado) {
          const mensaje = err instanceof Error ? err.message : 'Error desconocido'
          setEstado({ cargando: false, error: mensaje, metricas: null })
        }
      })
    return () => {
      cancelado = true
    }
  }, [])

  return estado
}
