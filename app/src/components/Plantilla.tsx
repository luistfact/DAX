import { Children, Fragment, isValidElement, type ReactNode } from 'react'
import { ArrowDownRight, ArrowUpRight, type LucideIcon } from 'lucide-react'
import { Cascada } from './Cascada'
import { useConsultaMedios } from '../hooks/useConsultaMedios'

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
  fija,
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
  /**
   * Estructura fija (Partidas): etiqueta, número, pie de la cifra, visual de
   * 36 px y delta, cada uno en su renglón, para que las cinco tarjetas se
   * alineen y nada se parta a media frase al lado del número.
   */
  fija?: boolean
}) {
  const Flecha = delta?.positivo ? ArrowUpRight : ArrowDownRight
  if (fija) {
    return (
      <div className={`tarjeta flex min-w-0 flex-col p-4 acento-${acento ?? 'neutro'}`}>
        <div className="flex items-start justify-between gap-2">
          <dt className="etiqueta">{etiqueta}</dt>
          {icono ?? (Icono && <Icono className="h-5 w-5 shrink-0 text-muted" aria-hidden="true" />)}
        </div>
        <dd className={`mt-1 truncate font-cifra text-[2.5rem] font-semibold leading-none sm:text-[3.5rem] ${tono ?? 'text-text'}`}>{valor}</dd>
        <dd className="h-5 truncate text-sm text-muted">{detalle}</dd>
        <dd className="mt-2 flex h-9 items-center">{grafica}</dd>
        {delta && (
          <dd className={`mt-2 flex items-start gap-1 text-sm font-medium ${delta.positivo ? 'text-alive' : 'text-danger'}`}>
            <Flecha className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
            {delta.texto}
          </dd>
        )}
      </div>
    )
  }
  return (
    <div className={`tarjeta flex min-w-0 flex-col gap-1 p-4 ${acento ? `acento-${acento}` : ''}`}>
      <div className="flex items-start justify-between gap-2">
        <dt className="etiqueta">{etiqueta}</dt>
        {icono ?? (Icono && <Icono className="h-5 w-5 shrink-0 text-muted" aria-hidden="true" />)}
      </div>
      <dd className={`font-cifra text-[2.5rem] font-semibold leading-none sm:text-[3.5rem] ${tono ?? 'text-text'}`}>
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

/** Hijos sin fragmentos: un componente que devuelve varias tarjetas en un `<>` cuenta como varias, no como una. */
function aplanar(children: ReactNode): ReactNode[] {
  return Children.toArray(children).flatMap((hijo) =>
    isValidElement<{ children?: ReactNode }>(hijo) && hijo.type === Fragment ? aplanar(hijo.props.children) : [hijo],
  )
}

/**
 * Pila de tarjetas desplegables: todo el detalle de la vista, cerrado por
 * defecto, que entra en cascada. Con 2 columnas, en pantalla ancha son dos
 * pilas independientes (1, 3, 5… a la izquierda; 2, 4, 6… a la derecha): en
 * una rejilla por filas, abrir una tarjeta dejaba un hueco bajo su vecina.
 */
export function Detalle({ children, columnas = 1 }: { children: ReactNode; columnas?: 1 | 2 }) {
  const ancho = useConsultaMedios('(min-width: 80rem)')
  const tarjetas = aplanar(children)
  if (columnas === 1 || !ancho) return <Cascada className="space-y-3">{tarjetas}</Cascada>
  return (
    <div className="grid grid-cols-2 items-start gap-3">
      <Cascada className="space-y-3">{tarjetas.filter((_, i) => i % 2 === 0)}</Cascada>
      <Cascada className="space-y-3">{tarjetas.filter((_, i) => i % 2 === 1)}</Cascada>
    </div>
  )
}
