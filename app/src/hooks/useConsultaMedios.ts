import { useEffect, useState } from 'react'

/** true mientras la consulta de medios se cumpla (p. ej. el ancho `xl` de Tailwind). */
export function useConsultaMedios(consulta: string): boolean {
  const [cumple, setCumple] = useState(() => typeof window !== 'undefined' && window.matchMedia(consulta).matches)

  useEffect(() => {
    const medio = window.matchMedia(consulta)
    const escuchar = () => setCumple(medio.matches)
    escuchar()
    medio.addEventListener('change', escuchar)
    return () => medio.removeEventListener('change', escuchar)
  }, [consulta])

  return cumple
}
