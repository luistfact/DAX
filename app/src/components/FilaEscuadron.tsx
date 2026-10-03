import { useEffect, useRef } from 'react'
import { Trophy, User } from 'lucide-react'
import type { Forma } from '../forma'
import type { EntradaCatalogo } from '../catalogo'
import { nombreEscuadron } from '../catalogo'
import { Sparkline } from './Sparkline'
import { estiloPerfil } from '../estiloPerfil'
import { usePaleta } from '../hooks/useTema'

type Props = {
  entrada: EntradaCatalogo
  activa: boolean
  onSeleccionar: () => void
  /** Filtra la lista por la categoría de esta fila (solo las que tienen pastilla de filtro). */
  onFiltrar?: () => void
  /** Nombre de la pastilla de esa categoría, para la etiqueta accesible. */
  etiquetaFiltro?: string
}

// Barra lateral por categoría de la curva: desplome rojo, remontada azul y
// dominante en tinta clara (el dorado es solo de marca); el resto, neutro.
const BARRA: Record<Forma, string> = {
  Desplome: 'bg-danger',
  Remontada: 'bg-zone',
  Dominante: 'bg-text',
  'Caída temprana': 'bg-line',
  Reñida: 'bg-line',
  'Sin datos suficientes': 'bg-line',
}

/** Soldaditos: en pie en verde, caídos en gris. */
function Soldados({ vivos, tamano }: { vivos: number; tamano: number }) {
  return (
    <span className="flex shrink-0 items-center" role="img" aria-label={`${vivos} de ${tamano} en pie al final`}>
      {Array.from({ length: tamano }, (_, i) => (
        <User key={i} className={`h-3.5 w-3.5 ${i < vivos ? 'text-alive' : 'text-muted opacity-40'}`} aria-hidden="true" />
      ))}
    </span>
  )
}

/** Fila densa del catálogo: categoría, posición en grande y la curva en miniatura. */
export function FilaEscuadron({ entrada, activa, onSeleccionar, onFiltrar, etiquetaFiltro }: Props) {
  const paleta = usePaleta()
  const { partida, forma, perfil } = entrada
  // En la lista el color de la barra es la categoría de la curva: el perfil va
  // solo con su ícono y nombre, para que el rojo de Castigados no se confunda
  // con el de un desplome en la misma fila.
  const IconoPerfil = perfil ? estiloPerfil(perfil).Icono : null
  const ref = useRef<HTMLButtonElement>(null)
  // Integrantes en pie al final de los minutos analizados, sobre el tamaño real.
  const ordenados = [...partida.minutos].sort((a, b) => a.minuto - b.minuto)
  const vivosAlFinal = ordenados.at(-1)?.vivos ?? 0
  const tamano = partida.tam_real ?? Math.max(0, ...ordenados.map((m) => m.vivos))

  // La selección por defecto (o al cambiar de filtro) puede quedar fuera de la
  // vista de la lista. Se mueve solo el scroll de la lista, no el de la página
  // (scrollIntoView movería los dos).
  useEffect(() => {
    const fila = ref.current
    const lista = fila?.closest('ul')
    if (!activa || !fila || !lista) return
    const arriba = fila.offsetTop
    const abajo = arriba + fila.offsetHeight
    if (arriba < lista.scrollTop || abajo > lista.scrollTop + lista.clientHeight) {
      lista.scrollTop = arriba - lista.clientHeight / 2 + fila.offsetHeight / 2
    }
  }, [activa])

  return (
    <div className="relative">
    <button
      ref={ref}
      type="button"
      onClick={onSeleccionar}
      aria-current={activa ? 'true' : undefined}
      className={
        'elevable flex w-full items-stretch gap-3 overflow-hidden rounded-md border text-left focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zone ' +
        (activa ? 'border-zone bg-text/10' : 'border-line bg-card hover:bg-text/5')
      }
    >
      <span className={`w-1 shrink-0 ${BARRA[forma]}`} aria-hidden="true" />
      <span className="flex w-14 shrink-0 flex-col justify-center py-2">
        <span className="font-cifra text-2xl font-semibold leading-none text-text">
          {partida.posicion_final}°
        </span>
        <span className="text-xs text-muted">de {partida.escuadrones}</span>
      </span>
      <span className="flex min-w-0 flex-1 flex-col justify-center gap-0.5 py-2">
        {/* El nombre con toda la línea: los soldaditos van abajo, con categoría y perfil. */}
        <span className="truncate text-sm font-medium text-text">{nombreEscuadron(entrada)}</span>
        <span className="flex flex-wrap items-center gap-x-1.5 text-xs text-muted">
          {forma}
          {perfil && IconoPerfil && (
            <>
              <span aria-hidden="true">·</span>
              <IconoPerfil className="h-3.5 w-3.5" aria-hidden="true" />
              {perfil}
            </>
          )}
          {partida.clasifico && (
            <>
              <span aria-hidden="true">·</span>
              <Trophy className="h-3.5 w-3.5 text-text" aria-hidden="true" />
              Top 25 %
            </>
          )}
          {tamano > 0 && (
            <>
              <span aria-hidden="true">·</span>
              <Soldados vivos={vivosAlFinal} tamano={tamano} />
            </>
          )}
        </span>
      </span>
      <span className="flex items-center pr-3">
        <Sparkline minutos={partida.minutos} color={paleta.zone} width={80} height={28} />
      </span>
    </button>
    {/* La barra de categoría filtra la lista. Botón aparte (no se anidan
        botones) sobre la franja izquierda, fuera del orden de tabulación: con
        el teclado, lo mismo hacen las pastillas de filtro. */}
    {onFiltrar && (
      <button
        type="button"
        tabIndex={-1}
        onClick={onFiltrar}
        aria-label={`Ver solo ${etiquetaFiltro ?? forma}`}
        title={`Ver solo ${etiquetaFiltro ?? forma}`}
        className={`absolute inset-y-0 left-0 w-3 rounded-l-md opacity-0 hover:opacity-60 ${BARRA[forma]}`}
      />
    )}
    </div>
  )
}
