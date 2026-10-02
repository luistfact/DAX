import { useState } from 'react'
import { MessageCircle, X } from 'lucide-react'
import type { Partida } from '../types/datos'
import { AsistenteChat } from './AsistenteChat'

type Props = {
  /** El escuadrón del reporte visible (o null si no hay ninguno). */
  partida: Partida | null
  /** Preguntas sugeridas para la pantalla actual. */
  sugerencias: string[]
}

/**
 * Botón flotante de Botsito, visible en las 4 pestañas: habla del escuadrón
 * del reporte si hay uno, o del proyecto en general si no.
 */
export function AsistenteFlotante({ partida, sugerencias }: Props) {
  const [abierto, setAbierto] = useState(false)

  return (
    <div className="fixed bottom-4 right-4 z-40 flex flex-col items-end gap-3 sm:bottom-6 sm:right-6">
      {abierto && (
        <div className="w-[min(26rem,calc(100vw-2rem))]">
          <AsistenteChat partida={partida} sugerencias={sugerencias} />
        </div>
      )}
      <button
        type="button"
        onClick={() => setAbierto((v) => !v)}
        aria-label={abierto ? 'Cerrar a Botsito' : 'Preguntarle a Botsito'}
        aria-expanded={abierto}
        className="flex h-12 shrink-0 items-center gap-2 rounded-full bg-zone px-4 text-bg shadow-lg hover:brightness-110 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zone"
      >
        {abierto ? (
          <X className="h-5 w-5" aria-hidden="true" />
        ) : (
          <>
            <MessageCircle className="h-5 w-5" aria-hidden="true" />
            <span className="titulo-seccion text-base">Botsito</span>
          </>
        )}
      </button>
    </div>
  )
}
