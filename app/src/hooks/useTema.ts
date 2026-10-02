import { useSyncExternalStore } from 'react'
import { PALETA_CLARA, PALETA_OSCURA, type Paleta } from '../colores'

export type Tema = 'light' | 'dark'

// La misma clave la lee el script en línea de index.html antes de montar React.
const CLAVE = 'zonaazul-tema'

/** El atributo data-theme de <html> es la única fuente de verdad del tema activo. */
function temaActual(): Tema {
  return document.documentElement.dataset.theme === 'light' ? 'light' : 'dark'
}

function suscribir(avisar: () => void): () => void {
  const observador = new MutationObserver(avisar)
  observador.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] })
  return () => observador.disconnect()
}

/** Tema activo y la función para elegirlo. Oscuro por defecto; la elección se guarda. */
export function useTema(): { tema: Tema; elegir: (tema: Tema) => void } {
  const tema = useSyncExternalStore(suscribir, temaActual)
  const elegir = (nuevo: Tema) => {
    document.documentElement.dataset.theme = nuevo
    try {
      localStorage.setItem(CLAVE, nuevo)
    } catch {
      // Sin almacenamiento el cambio vale solo para esta visita.
    }
  }
  return { tema, elegir }
}

/** Colores del tema activo para lo que se dibuja desde JS (Recharts, SVG); se actualiza al cambiar de tema. */
export function usePaleta(): Paleta {
  return useTema().tema === 'light' ? PALETA_CLARA : PALETA_OSCURA
}
