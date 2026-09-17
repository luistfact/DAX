import { motion } from 'motion/react'
import { usePrefersReducedMotion } from '../hooks/usePrefersReducedMotion'
import { COLOR_ZONA, COLOR_PELIGRO } from '../colores'

type Props = {
  /** Cambia con cada partida para reiniciar la animación (normalmente partida.id). */
  claveAnimacion: string
  clasifico: boolean
  duracionMs?: number
}

const RADIO_INICIAL = 44
const RADIO_FINAL = 14

/**
 * El único momento de animación de la app: la zona cerrándose al cargar una
 * partida, sincronizada con la duración del trazo de la curva (Parte 5).
 */
export function CirculoCierre({ claveAnimacion, clasifico, duracionMs = 900 }: Props) {
  const reducido = usePrefersReducedMotion()
  const color = clasifico ? COLOR_ZONA : COLOR_PELIGRO

  return (
    <svg width="64" height="64" viewBox="0 0 96 96" aria-hidden="true" className="shrink-0">
      <motion.circle
        key={claveAnimacion}
        cx="48"
        cy="48"
        stroke={color}
        strokeWidth={2}
        fill="none"
        initial={reducido ? { r: RADIO_FINAL, opacity: 0.8 } : { r: RADIO_INICIAL, opacity: 0.35 }}
        animate={{ r: RADIO_FINAL, opacity: 0.8 }}
        transition={reducido ? { duration: 0 } : { duration: duracionMs / 1000, ease: 'easeIn' }}
      />
      <circle cx="48" cy="48" r="3" fill={color} />
    </svg>
  )
}
