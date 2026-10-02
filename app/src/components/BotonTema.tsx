import { Moon, Sun } from 'lucide-react'
import { useTema } from '../hooks/useTema'

/** Alterna entre modo claro y oscuro; el cambio es instantáneo, sin transición. */
export function BotonTema() {
  const { tema, elegir } = useTema()
  const oscuro = tema === 'dark'

  return (
    <button
      type="button"
      onClick={() => elegir(oscuro ? 'light' : 'dark')}
      aria-label="Modo oscuro"
      aria-pressed={oscuro}
      title={oscuro ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}
      className="rounded-md border border-line p-2 text-muted hover:text-text focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zone"
    >
      {oscuro ? <Moon size={18} aria-hidden="true" /> : <Sun size={18} aria-hidden="true" />}
    </button>
  )
}
