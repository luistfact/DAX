import { useState } from 'react'
import type { Partida } from '../types/datos'
import { AsistenteChat } from './AsistenteChat'

function IconoChat({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
    </svg>
  )
}

function IconoCerrar({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M18 6 6 18M6 6l12 12" />
    </svg>
  )
}

type Props = {
  /** La partida activa según la pestaña (o null si no hay ninguna cargada). */
  partida: Partida | null
}

/**
 * Botón flotante del asistente, visible en toda la app (las 4 pestañas):
 * habla de la partida activa si hay una, o del proyecto en general si no.
 */
export function AsistenteFlotante({ partida }: Props) {
  const [abierto, setAbierto] = useState(false)

  return (
    <div className="fixed bottom-4 right-4 z-40 flex flex-col items-end gap-3 sm:bottom-6 sm:right-6">
      {abierto && (
        <div className="w-[min(24rem,calc(100vw-2rem))]">
          <AsistenteChat partida={partida} />
        </div>
      )}
      <button
        type="button"
        onClick={() => setAbierto((v) => !v)}
        aria-label={abierto ? 'Cerrar el asistente' : 'Abrir el asistente'}
        aria-expanded={abierto}
        className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-zona text-fondo shadow-lg hover:brightness-110 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zona"
      >
        {abierto ? <IconoCerrar className="h-5 w-5" /> : <IconoChat className="h-5 w-5" />}
      </button>
    </div>
  )
}
