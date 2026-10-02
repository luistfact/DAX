import { Children, useId, useState, type ReactNode } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { ChevronDown, type LucideIcon } from 'lucide-react'
import { DESPLAZAMIENTO_ENTRADA, DURACION, retrasoCascada, useTransicion } from '../movimiento'

type Props = {
  Icono: LucideIcon
  titulo: string
  /** Una línea: lo que hay dentro, para decidir si abrirla sin abrirla. */
  resumen: ReactNode
  children: ReactNode
}

/**
 * La tarjeta desplegable única de la app. Cerrada: ícono, título, resumen y
 * flecha. Abierta: crece hasta su altura, la flecha gira y el contenido entra
 * en cascada; al cerrar, lo inverso y más rápido. Empieza cerrada; se pueden
 * abrir varias a la vez. Es un botón con aria-expanded: Enter y Espacio la
 * abren, y el foco se ve.
 */
export function Desplegable({ Icono, titulo, resumen, children }: Props) {
  const [abierta, setAbierta] = useState(false)
  const idContenido = useId()
  const { reducido, transicion } = useTransicion()
  const elementos = Children.toArray(children)
  const retraso = retrasoCascada(elementos.length)

  return (
    <section className="elevable rounded-lg border border-line bg-card">
      <h3>
        <button
          type="button"
          onClick={() => setAbierta((v) => !v)}
          aria-expanded={abierta}
          aria-controls={idContenido}
          className="flex w-full items-center gap-3 rounded-lg p-4 text-left focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zone"
        >
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-card-2 text-text">
            <Icono className="h-5 w-5" aria-hidden="true" />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block titulo-seccion text-base text-text">{titulo}</span>
            <span className="block text-sm text-muted">{resumen}</span>
          </span>
          <motion.span
            animate={{ rotate: abierta ? 180 : 0 }}
            transition={transicion(abierta ? DURACION.abrir : DURACION.cerrar)}
            className="shrink-0 text-muted"
            aria-hidden="true"
          >
            <ChevronDown className="h-5 w-5" />
          </motion.span>
        </button>
      </h3>
      <AnimatePresence initial={false}>
        {abierta && (
          <motion.div
            id={idContenido}
            key="contenido"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1, transition: transicion(DURACION.abrir) }}
            exit={{ height: 0, opacity: 0, transition: transicion(DURACION.cerrar) }}
            className="overflow-hidden"
          >
            <div className="space-y-4 px-4 pb-4">
              {elementos.map((elemento, i) => (
                <motion.div
                  key={i}
                  initial={reducido ? false : { opacity: 0, y: DESPLAZAMIENTO_ENTRADA }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={transicion(DURACION.elemento, i * retraso)}
                >
                  {elemento}
                </motion.div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  )
}
