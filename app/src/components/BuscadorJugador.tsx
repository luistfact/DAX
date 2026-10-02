import { useState, type FormEvent } from 'react'
import { Search } from 'lucide-react'
import { AnilloZona } from './AnilloZona'

type Props = {
  ocupado: boolean
  onBuscar: (nick: string) => void
}

/** Buscador del encabezado: lanza el análisis en vivo. Su botón es el único ámbar de la app. */
export function BuscadorJugador({ ocupado, onBuscar }: Props) {
  const [nick, setNick] = useState('')

  const enviar = (e: FormEvent) => {
    e.preventDefault()
    if (nick.trim() && !ocupado) onBuscar(nick.trim())
  }

  return (
    <form onSubmit={enviar} role="search" className="flex w-full max-w-xl gap-2">
      <label className="relative flex-1">
        <span className="sr-only">Tu nombre de usuario de PUBG</span>
        <Search
          className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted"
          aria-hidden="true"
        />
        <input
          type="text"
          value={nick}
          onChange={(e) => setNick(e.target.value)}
          placeholder="Tu nombre de usuario de PUBG"
          autoComplete="off"
          spellCheck={false}
          disabled={ocupado}
          className="w-full rounded-md border border-line bg-card py-2 pl-9 pr-3 text-sm text-text placeholder:text-muted focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zone disabled:opacity-60"
        />
      </label>
      <button
        type="submit"
        disabled={ocupado || !nick.trim()}
        className={
          'flex shrink-0 items-center gap-1.5 rounded-md bg-brand px-4 py-2 text-sm font-semibold text-on-brand hover:brightness-110 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand ' +
          // Mientras analiza no se atenúa: el anillo que se cierra es el indicador de carga.
          (ocupado ? '' : 'disabled:opacity-50')
        }
      >
        {ocupado && <AnilloZona tamano={18} modo="bucle" />}
        {ocupado ? 'Analizando…' : 'Analizar'}
      </button>
    </form>
  )
}
