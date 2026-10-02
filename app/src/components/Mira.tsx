import type { ReactNode } from 'react'

const ESQUINA = 'pointer-events-none absolute h-3 w-3 border-muted'

/**
 * Esquinas tipo mira alrededor de una tarjeta principal (héroe, franja de
 * indicadores, curva). Solo en esas: en todas perdería el efecto.
 */
export function Mira({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={`relative ${className ?? ''}`}>
      {children}
      <span className={`${ESQUINA} -left-1 -top-1 border-l-2 border-t-2`} aria-hidden="true" />
      <span className={`${ESQUINA} -right-1 -top-1 border-r-2 border-t-2`} aria-hidden="true" />
      <span className={`${ESQUINA} -bottom-1 -left-1 border-b-2 border-l-2`} aria-hidden="true" />
      <span className={`${ESQUINA} -bottom-1 -right-1 border-b-2 border-r-2`} aria-hidden="true" />
    </div>
  )
}
