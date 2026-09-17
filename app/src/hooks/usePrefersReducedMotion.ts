import { useEffect, useState } from 'react'

const CONSULTA = '(prefers-reduced-motion: reduce)'

/** true si el sistema pide menos movimiento; se respeta antes de animar el círculo. */
export function usePrefersReducedMotion(): boolean {
  const [reducido, setReducido] = useState(
    () => typeof window !== 'undefined' && window.matchMedia(CONSULTA).matches,
  )

  useEffect(() => {
    const medio = window.matchMedia(CONSULTA)
    const escuchar = () => setReducido(medio.matches)
    medio.addEventListener('change', escuchar)
    return () => medio.removeEventListener('change', escuchar)
  }, [])

  return reducido
}
