import { useState } from 'react'

type Props = {
  texto: string
  etiqueta: string
}

/** Icono de ayuda accesible y reutilizable: botón con foco visible, no depende de hover. */
export function Ayuda({ texto, etiqueta }: Props) {
  const [abierto, setAbierto] = useState(false)

  return (
    <span className="relative inline-flex items-center">
      <button
        type="button"
        onClick={() => setAbierto((v) => !v)}
        onBlur={() => setAbierto(false)}
        aria-label={etiqueta}
        aria-expanded={abierto}
        className="ml-1 inline-flex h-4 w-4 items-center justify-center rounded-full border border-tinta-secundaria/50 text-[10px] font-semibold text-tinta-secundaria hover:border-tinta-secundaria hover:text-tinta focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zona"
      >
        ?
      </button>
      {abierto && (
        <span
          role="tooltip"
          className="absolute left-1/2 top-full z-10 mt-1 w-56 -translate-x-1/2 rounded-md border border-tinta-secundaria/20 bg-superficie p-2 text-left text-xs font-normal text-tinta-secundaria shadow-md"
        >
          {texto}
        </span>
      )}
    </span>
  )
}
