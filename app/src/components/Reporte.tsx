import type { ReactNode } from 'react'
import { Trophy } from 'lucide-react'
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

function Indicador({
  etiqueta,
  valor,
  detalle,
  tono,
  icono,
}: {
  etiqueta: string
  valor: string
  detalle?: string
  tono?: string
  icono?: ReactNode
}) {
  return (
    <div className="min-w-0 px-4 py-3">
      <dt className="etiqueta">{etiqueta}</dt>
      <dd className={`flex items-baseline gap-1 font-cifra text-4xl font-semibold leading-tight ${tono ?? 'text-text'}`}>
        {icono}
        {valor}
        {detalle && <span className="ml-1 font-texto text-sm font-normal text-muted">{detalle}</span>}
      </dd>
    </div>
  )
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

  return (
    <div className="space-y-4">
      <div>
        <h2 className="titulo-seccion text-2xl text-text">{titulo}</h2>
        {subtitulo && <p className="text-sm text-muted">{subtitulo}</p>}
      </div>

      <Mira>
      <dl className="grid grid-cols-2 divide-line rounded-lg border border-line bg-card sm:grid-cols-3 xl:grid-cols-5 xl:divide-x">
        <Indicador
          etiqueta="Posición"
          valor={`${partida.posicion_final}°`}
          detalle={`de ${partida.escuadrones}`}
          icono={
            partida.clasifico ? <Trophy className="h-6 w-6 self-center text-text" aria-label="Top 25 %" /> : undefined
          }
        />
        <Indicador etiqueta="Percentil" valor={pct100(percentil)} />
        <Indicador etiqueta="Probabilidad máxima" valor={pct(probMaxima)} />
        <Indicador
          etiqueta="Caída desde el pico"
          valor={caida == null ? '—' : caida > 0 ? `−${pp(caida)}` : pp(caida)}
          tono={caida != null && caida >= 0.1 ? 'text-danger' : undefined}
        />
        <Indicador
          etiqueta="Minuto crítico"
          valor={minutoCritico != null ? String(minutoCritico) : '—'}
          tono={minutoCritico != null ? 'text-danger' : undefined}
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
