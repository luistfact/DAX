import { useEffect, useState } from 'react'
import { usePrefersReducedMotion } from './usePrefersReducedMotion'
import { DURACION_GRAFICA_MS } from '../movimiento'

// Lo que ya se animó en esta visita. Vive fuera de React a propósito: un
// componente que se desmonta al cambiar de pestaña y se vuelve a montar no
// debe repetir su entrada.
const animados = new Set<string>()

/**
 * true solo la primera vez que se muestra `clave` (p. ej. la curva de un
 * escuadrón) y solo durante su entrada: después pasa a false para que
 * redimensionar o pasar el cursor no la repitan. Con prefers-reduced-motion,
 * siempre false: todo aparece en su estado final.
 */
export function useAnimarUnaVez(clave: string): boolean {
  const reducido = usePrefersReducedMotion()
  const [animar, setAnimar] = useState(() => !reducido && !animados.has(clave))

  useEffect(() => {
    animados.add(clave)
    if (!animar) return
    const fin = setTimeout(() => setAnimar(false), DURACION_GRAFICA_MS + 50)
    return () => clearTimeout(fin)
  }, [clave, animar])

  return animar && !reducido
}
