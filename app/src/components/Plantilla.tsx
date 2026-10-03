import type { ReactNode } from 'react'
import { ArrowDownRight, ArrowUpRight, type LucideIcon } from 'lucide-react'
import { Cascada } from './Cascada'

// Piezas de la plantilla común de las cuatro pestañas (PROMPT_ANIMACION_ORDEN.md):
// 1. mensaje principal, 2. fila de indicadores, 3. gráfico principal,
// 4. tarjetas desplegables. Misma rejilla en todas: `gap-6` entre bloques,
// `gap-3` entre tarjetas.

/** Una sola frase grande que dice de qué trata la vista, en lenguaje de jugador. */
export function MensajePrincipal({ antetitulo, children, detalle }: { antetitulo?: string; children: ReactNode; detalle?: ReactNode }) {
  return (
    <header className="space-y-1">
      {antetitulo && <p className="titulo-seccion text-sm text-muted">{antetitulo}</p>}
      <h2 className="text-2xl font-semibold leading-tight text-text sm:text-3xl">{children}</h2>
      {detalle && <p className="text-sm text-muted">{detalle}</p>}
    </header>
  )
}

export type Delta = { texto: string; positivo: boolean }

/** Color de dato para el borde superior de una tarjeta. */
export type Acento = 'zone' | 'danger' | 'alive' | 'violet' | 'sand'

/**
 * Tarjeta de número grande. El delta solo aparece donde hay una comparación
 * real: verde si es mejor, rojo si es peor.
 */
export function Indicador({
  etiqueta,
  valor,
  detalle,
  tono,
  Icono,
  icono,
  delta,
  acento,
  grafica,
}: {
  etiqueta: string
  valor: ReactNode
  detalle?: string
  tono?: string
  /** Ícono de contexto, en tono secundario. */
  Icono?: LucideIcon
  /** O un ícono propio (p. ej. la huella de un perfil). */
  icono?: ReactNode
  delta?: Delta | null
  /** Color del dato: borde superior de 3 px. */
  acento?: Acento
  /** Mini gráfica bajo la cifra (escalera, anillo, medidor…). */
  grafica?: ReactNode
}) {
  const Flecha = delta?.positivo ? ArrowUpRight : ArrowDownRight
  return (
    <div className={`tarjeta flex min-w-0 flex-col gap-1 p-4 ${acento ? `acento-${acento}` : ''}`}>
      <div className="flex items-start justify-between gap-2">
        <dt className="etiqueta">{etiqueta}</dt>
        {icono ?? (Icono && <Icono className="h-5 w-5 shrink-0 text-muted" aria-hidden="true" />)}
      </div>
      <dd className={`font-cifra text-[3.5rem] font-semibold leading-none ${tono ?? 'text-text'}`}>
        {valor}
        {detalle && <span className="ml-1 font-texto text-sm font-normal text-muted">{detalle}</span>}
      </dd>
      {grafica && <dd className="pt-1">{grafica}</dd>}
      {delta && (
        <dd className={`flex items-center gap-1 text-sm font-medium ${delta.positivo ? 'text-alive' : 'text-danger'}`}>
          <Flecha className="h-4 w-4 shrink-0" aria-hidden="true" />
          {delta.texto}
        </dd>
      )}
    </div>
  )
}

const COLUMNAS: Record<3 | 4 | 5, string> = {
  3: 'grid-cols-1 sm:grid-cols-3',
  4: 'grid-cols-2 xl:grid-cols-4',
  5: 'grid-cols-2 sm:grid-cols-3 xl:grid-cols-5',
}

/** Fila de tres a cinco indicadores, con la misma rejilla en todas las pestañas. */
export function FilaIndicadores({ columnas, children }: { columnas: 3 | 4 | 5; children: ReactNode }) {
  return <dl className={`grid gap-3 ${COLUMNAS[columnas]}`}>{children}</dl>
}

/** Pila de tarjetas desplegables: todo el detalle de la vista, cerrado por defecto, que entra en cascada. */
export function Detalle({ children, columnas = 1 }: { children: ReactNode; columnas?: 1 | 2 }) {
  return (
    <Cascada className={columnas === 2 ? 'grid grid-cols-1 gap-3 xl:grid-cols-2 xl:items-start' : 'space-y-3'}>{children}</Cascada>
  )
}
