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
        className="ml-1 inline-flex h-5 w-5 items-center justify-center rounded-full border border-muted/50 text-xs font-semibold text-muted hover:border-muted hover:text-text focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zone"
      >
        ?
      </button>
      {abierto && (
        <span
          role="tooltip"
          className="absolute left-1/2 top-full z-10 mt-1 w-56 -translate-x-1/2 rounded-md border border-line bg-card p-2 text-left text-xs font-normal text-muted shadow-md"
        >
          {texto}
        </span>
      )}
    </span>
  )
}
