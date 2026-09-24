import { useState } from 'react'
import type { Partida } from '../types/datos'
import { descargarImagen } from '../compartir'

/** Descarga un PNG cuadrado con el resumen de la partida, listo para publicar. */
export function BotonCompartir({ partida }: { partida: Partida }) {
  const [estado, setEstado] = useState<'inactivo' | 'generando' | 'error'>('inactivo')

  const compartir = async () => {
    setEstado('generando')
    try {
      await descargarImagen(partida)
      setEstado('inactivo')
    } catch {
      setEstado('error')
    }
  }

  return (
    <button
      type="button"
      onClick={compartir}
      disabled={estado === 'generando'}
      title="Descarga una imagen cuadrada (PNG) con el resumen de esta partida"
      className="rounded-md border border-zona/50 px-3 py-1 text-sm font-medium text-zona hover:bg-zona/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zona disabled:opacity-50"
    >
      {estado === 'generando' ? 'Generando…' : estado === 'error' ? 'No se pudo, reintentar' : 'Compartir'}
    </button>
  )
}
