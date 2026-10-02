import { Children, type ReactNode } from 'react'
import { motion } from 'motion/react'
import { DESPLAZAMIENTO_ENTRADA, DURACION, retrasoCascada, useTransicion } from '../movimiento'

/**
 * Entrada en cascada de una vista: cada bloque entra un instante después del
 * anterior, desvaneciéndose y subiendo unos píxeles. Toda la cascada cabe en
 * `DURACION.cascadaTotal`, tenga los bloques que tenga. No bloquea nada: el
 * contenido se puede usar desde el primer cuadro.
 */
export function Cascada({ children, className }: { children: ReactNode; className?: string }) {
  const { reducido, transicion } = useTransicion()
  const bloques = Children.toArray(children)
  const retraso = retrasoCascada(bloques.length)
  return (
    <div className={className}>
      {bloques.map((bloque, i) => (
        <motion.div
          key={i}
          initial={reducido ? false : { opacity: 0, y: DESPLAZAMIENTO_ENTRADA }}
          animate={{ opacity: 1, y: 0 }}
          transition={transicion(DURACION.elemento, i * retraso)}
        >
          {bloque}
        </motion.div>
      ))}
    </div>
  )
}
