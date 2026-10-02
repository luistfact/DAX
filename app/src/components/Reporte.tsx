import type { ReactNode } from 'react'
import {
  ArrowDownRight,
  ArrowUpRight,
  BarChart3,
  Clock,
  Crown,
  Medal,
  TrendingDown,
  TrendingUp,
  Trophy,
  type LucideIcon,
} from 'lucide-react'
import type { Partida, PuntoReferencia } from '../types/datos'
import { CurvaProbabilidad } from './CurvaProbabilidad'
import { Informe } from './Informe'
import { Mira } from './Mira'
import {
  caidaDesdePico,
  calcularPercentil,
  extraerMinutoCritico,
  lugaresTop25,
  probabilidadMaxima,
} from '../analisisPartida'
import { pct, pct100, pp } from '../formato'

type Props = {
  partida: Partida
  titulo: string
  subtitulo?: string
  /** Curva promedio de los que llegaron al top; solo en el catálogo (sale de la red recurrente). */
  referencia?: PuntoReferencia[]
  /** Minuto sincronizado con el mapa (solo en el análisis en vivo). */
  minutoMarcado?: number
  onMinutoActivo?: (minuto: number) => void
  /** Lo que va entre la curva y el informe (el mapa, en el análisis en vivo). */
  children?: ReactNode
}

type Delta = { texto: string; positivo: boolean }

/**
 * Tarjeta de KPI: etiqueta, número grande e ícono de contexto. El delta solo
 * aparece donde hay una comparación real; verde si es mejor, rojo si es peor.
 */
function Kpi({
  etiqueta,
  valor,
  detalle,
  tono,
  Icono,
  delta,
}: {
  etiqueta: string
  valor: string
  detalle?: string
  tono?: string
  Icono: LucideIcon
  delta?: Delta | null
}) {
  const Flecha = delta?.positivo ? ArrowUpRight : ArrowDownRight
  return (
    <div className="flex min-w-0 flex-col gap-1 rounded-lg border border-line bg-card p-4">
      <div className="flex items-start justify-between gap-2">
        <dt className="etiqueta">{etiqueta}</dt>
        <Icono className="h-5 w-5 shrink-0 text-muted" aria-hidden="true" />
      </div>
      <dd className={`font-cifra text-5xl font-semibold leading-none ${tono ?? 'text-text'}`}>
        {valor}
        {detalle && <span className="ml-1 font-texto text-sm font-normal text-muted">{detalle}</span>}
      </dd>
      {delta && (
        <dd className={`flex items-center gap-1 text-sm font-medium ${delta.positivo ? 'text-alive' : 'text-danger'}`}>
          <Flecha className="h-4 w-4 shrink-0" aria-hidden="true" />
          {delta.texto}
        </dd>
      )}
    </div>
  )
}

/** Posición contra el corte del top 25 % de esa partida. */
function deltaPosicion(partida: Partida): Delta {
  const corte = lugaresTop25(partida.escuadrones)
  if (partida.posicion_final <= corte) return { texto: `Dentro del top (corte en el ${corte}°)`, positivo: true }
  const lugares = partida.posicion_final - corte
  return { texto: `A ${lugares} ${lugares === 1 ? 'lugar' : 'lugares'} del top`, positivo: false }
}

/** La meta en palabras, con la cifra de esa partida: «top 25 %» solo no dice cuántos lugares son. */
function fraseMeta(partida: Partida): string {
  const top = lugaresTop25(partida.escuadrones)
  const meta =
    top === 1
      ? `en una partida de ${partida.escuadrones} equipos, es ganarla`
      : `en una partida de ${partida.escuadrones} equipos, es quedar entre los primeros ${top}`
  const resultado = partida.clasifico
    ? `Este escuadrón lo logró: terminó ${partida.posicion_final}°.`
    : `Este escuadrón terminó ${partida.posicion_final}°, fuera de ese grupo.`
  return `Top 25 %: ${meta}. ${resultado}`
}

/** Reporte de un escuadrón: franja de indicadores, la curva como pieza principal y el informe. */
export function Reporte({ partida, titulo, subtitulo, referencia, minutoMarcado, onMinutoActivo, children }: Props) {
  // Precalculados por el notebook; la partida en vivo no los trae y se
  // recalculan con las mismas funciones de respaldo.
  const percentil = partida.percentil ?? calcularPercentil(partida.posicion_final, partida.escuadrones)
  const probMaxima = partida.probabilidad_maxima ?? probabilidadMaxima(partida.minutos)
  const minutoCritico = partida.momento_critico?.minuto ?? extraerMinutoCritico(partida.informe.momento_critico)
  const caida = caidaDesdePico(partida.minutos)
  // Solo con la curva de referencia (catálogo): misma red y misma calibración,
  // así que la comparación es real. En vivo no hay contra qué comparar.
  const maxReferencia = referencia && referencia.length > 0 ? Math.max(...referencia.map((r) => r.probabilidad)) : null
  // El signo sale de la diferencia ya redondeada a puntos enteros: con los
  // valores crudos, 53.9 % contra 53.92 % daba «−0 pp» en rojo.
  const puntosVsReferencia =
    probMaxima != null && maxReferencia != null ? Math.round((probMaxima - maxReferencia) * 100) : null
  const deltaProbMaxima: Delta | null =
    puntosVsReferencia == null
      ? null
      : puntosVsReferencia === 0
        ? { texto: 'Igual que el máximo de los que llegaron al top', positivo: true }
        : {
            texto: `${puntosVsReferencia > 0 ? '+' : '−'}${pp(puntosVsReferencia / 100)} vs. el máximo de los que llegaron al top`,
            positivo: puntosVsReferencia > 0,
          }

  return (
    <div className="space-y-4">
      <div>
        <h2 className="titulo-seccion text-2xl text-text">{titulo}</h2>
        {subtitulo && <p className="text-sm text-muted">{subtitulo}</p>}
      </div>

      <Mira>
        <dl className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-5">
          <Kpi
            etiqueta="Posición"
            valor={`${partida.posicion_final}°`}
            detalle={`de ${partida.escuadrones}`}
            Icono={partida.posicion_final === 1 ? Crown : partida.clasifico ? Trophy : Medal}
            delta={deltaPosicion(partida)}
          />
          <Kpi etiqueta="Percentil" valor={pct100(percentil)} Icono={BarChart3} />
          <Kpi etiqueta="Probabilidad máxima" valor={pct(probMaxima)} Icono={TrendingUp} delta={deltaProbMaxima} />
          <Kpi
            etiqueta="Caída desde el pico"
            valor={caida == null ? '—' : caida > 0 ? `−${pp(caida)}` : pp(caida)}
            tono={caida != null && caida >= 0.1 ? 'text-danger' : undefined}
            Icono={TrendingDown}
          />
          <Kpi
            etiqueta="Minuto crítico"
            valor={minutoCritico != null ? String(minutoCritico) : '—'}
            tono={minutoCritico != null ? 'text-danger' : undefined}
            Icono={Clock}
          />
        </dl>
      </Mira>
      <p className="text-sm text-muted">{fraseMeta(partida)}</p>

      <CurvaProbabilidad
        key={partida.id}
        partida={partida}
        referencia={referencia}
        minutoMarcado={minutoMarcado}
        onMinutoActivo={onMinutoActivo}
      />
      {children}
      <Informe partida={partida} />
    </div>
  )
}
