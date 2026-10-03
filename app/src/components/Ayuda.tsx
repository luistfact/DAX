import { useRef, useState } from 'react'

type Props = {
  texto: string
  etiqueta: string
}

type Alineacion = 'centro' | 'izquierda' | 'derecha'

const ALINEACION: Record<Alineacion, string> = {
  centro: 'left-1/2 -translate-x-1/2',
  izquierda: 'left-0',
  derecha: 'right-0',
}

/** Ancho del globo (w-56 = 14rem) para decidir hacia dónde abrirlo. */
const ANCHO_GLOBO = 224

/**
 * Icono de ayuda accesible y reutilizable: botón con foco visible, no depende
 * de hover. El globo se abre hacia donde haya espacio, para no salirse de la
 * pantalla cerca de los bordes (en el teléfono, sobre todo).
 */
export function Ayuda({ texto, etiqueta }: Props) {
  const [abierto, setAbierto] = useState(false)
  const [alineacion, setAlineacion] = useState<Alineacion>('centro')
  const boton = useRef<HTMLButtonElement>(null)

  const alternar = () => {
    if (!abierto && boton.current) {
      const r = boton.current.getBoundingClientRect()
      const centro = r.left + r.width / 2
      setAlineacion(
        centro - ANCHO_GLOBO / 2 < 8 ? 'izquierda' : centro + ANCHO_GLOBO / 2 > window.innerWidth - 8 ? 'derecha' : 'centro',
      )
    }
    setAbierto((v) => !v)
  }

  return (
    <span className="relative inline-flex items-center">
      <button
        ref={boton}
        type="button"
        onClick={alternar}
        onBlur={() => setAbierto(false)}
        aria-label={etiqueta}
        aria-expanded={abierto}
        className="ml-1 inline-flex h-5 w-5 items-center justify-center rounded-full border border-muted/50 text-xs font-semibold text-muted hover:border-muted hover:text-text focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zone"
      >
        ?
      </button>
      {abierto && (
        <span
          role="tooltip"
          className={`absolute top-full z-10 mt-1 w-56 max-w-[calc(100vw-1rem)] rounded-md border border-line bg-card p-2 text-left text-xs font-normal text-muted shadow-md ${ALINEACION[alineacion]}`}
        >
          {texto}
        </span>
      )}
    </span>
  )
}
