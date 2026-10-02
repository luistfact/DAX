import { motion } from 'motion/react'
import { usePrefersReducedMotion } from '../hooks/usePrefersReducedMotion'

type Props = {
  /** Lado del SVG en px. */
  tamano: number
  /** «unaVez»: se cierra al montar (héroe). «bucle»: se cierra una y otra vez (carga). */
  modo: 'unaVez' | 'bucle'
  /** Clase de color del trazo (currentColor), p. ej. «text-zone». */
  className?: string
}

/**
 * La única animación de la app: la zona cerrándose. La misma pieza se usa
 * detrás del título del Resumen y como indicador de carga del análisis en
 * vivo. Con prefers-reduced-motion queda quieta en su radio final.
 */
export function AnilloZona({ tamano, modo, className }: Props) {
  const reducido = usePrefersReducedMotion()
  const radioFinal = 18
  const radioInicial = 46
  const transicion =
    modo === 'bucle'
      ? { duration: 1.6, ease: 'easeIn' as const, repeat: Infinity, repeatDelay: 0.2 }
      : { duration: 1.4, ease: 'easeInOut' as const }

  return (
    <svg
      width={tamano}
      height={tamano}
      viewBox="0 0 100 100"
      aria-hidden="true"
      className={`shrink-0 ${className ?? ''}`}
    >
      {/* La zona segura final: fija, para que se vea hacia dónde se cierra. */}
      <circle cx="50" cy="50" r={radioFinal} fill="none" stroke="currentColor" strokeWidth={1.5} opacity={0.9} />
      <motion.circle
        cx="50"
        cy="50"
        fill="none"
        stroke="currentColor"
        strokeWidth={1.5}
        strokeDasharray="3 3"
        initial={reducido ? { r: radioFinal + 6, opacity: 0.5 } : { r: radioInicial, opacity: 0.25 }}
        animate={reducido ? { r: radioFinal + 6, opacity: 0.5 } : { r: radioFinal + 2, opacity: 0.8 }}
        transition={reducido ? { duration: 0 } : transicion}
      />
    </svg>
  )
}
