import { useId, type HTMLAttributes, type ReactNode } from 'react'

type Props = Omit<HTMLAttributes<HTMLSpanElement>, 'children'> & {
  /** Lo que se señala: una barra, un punto, una fila. */
  children: ReactNode
  /** El valor exacto y su contexto, en una o dos líneas. */
  texto: string
  /** Hacia dónde se abre, para no salirse por un borde. */
  alinear?: 'izquierda' | 'centro' | 'derecha'
  /** Clases del contenedor (que conserve su lugar en la rejilla). */
  className?: string
}

const POSICION = {
  izquierda: 'left-0',
  centro: 'left-1/2 -translate-x-1/2',
  derecha: 'right-0',
} as const

/**
 * Globo con el valor exacto de una marca de gráfica. Se abre al pasar el
 * cursor y al enfocar con el teclado (el contenedor es enfocable), solo con
 * CSS: aparece y desaparece sin movimiento, así que no depende de
 * prefers-reduced-motion. El texto también va como descripción accesible.
 */
export function Globo({ children, texto, alinear = 'centro', className = '', ...resto }: Props) {
  const id = useId()
  // Un contenedor ya posicionado (un punto absoluto en una gráfica) sirve de
  // referencia al globo tal cual; si no, se vuelve relativo.
  const posicion = className.split(' ').includes('absolute') ? '' : 'relative'
  return (
    <span
      {...resto}
      tabIndex={0}
      aria-describedby={id}
      className={`group/globo ${posicion} rounded-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zone ${className}`}
    >
      {children}
      <span
        id={id}
        role="tooltip"
        // Cerrado con display: none y no con visibility: hidden: invisible seguía
        // ocupando lugar y, cerca de un borde, daba scroll horizontal en el teléfono.
        className={`pointer-events-none absolute bottom-full z-30 mb-2 hidden w-max max-w-[16rem] rounded-md border border-line bg-card px-2.5 py-1.5 text-left text-xs font-normal leading-snug text-text shadow-md group-hover/globo:block group-focus-visible/globo:block ${POSICION[alinear]}`}
      >
        {texto}
      </span>
    </span>
  )
}
