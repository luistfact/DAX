import { useState, type ReactNode } from 'react'
import { BarChart3, Clock, Crown, Medal, TrendingDown, TrendingUp, Trophy } from 'lucide-react'
import type { Partida, PuntoReferencia } from '../types/datos'
import { CurvaProbabilidad } from './CurvaProbabilidad'
import { Informe } from './Informe'
import { Mira } from './Mira'
import { Cascada } from './Cascada'
import { Conteo } from './Conteo'
import { Detalle, FilaIndicadores, Indicador, MensajePrincipal, type Delta } from './Plantilla'
import {
  caidaDesdePico,
  calcularPercentil,
  extraerMinutoCritico,
  lugaresTop25,
  probabilidadMaxima,
} from '../analisisPartida'
import { clasificarForma, type Forma } from '../forma'
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
  /** Tarjetas desplegables extra al final del detalle (el mapa, en el análisis en vivo). */
  children?: ReactNode
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

/** El mensaje principal: qué forma tuvo la partida y cómo terminó, en una frase. */
function mensaje(forma: Forma, partida: Partida, minutoCritico: number | null): string {
  const como: Record<Forma, string> = {
    Desplome: minutoCritico != null ? `Se vino abajo en el minuto ${minutoCritico}` : 'Se vino abajo al final',
    Remontada: 'Remontó desde muy abajo',
    Dominante: 'Llevó la partida arriba de principio a fin',
    'Caída temprana': 'Empezó cuesta arriba desde los primeros minutos',
    Reñida: 'Una partida reñida, sin definirse',
    'Sin datos suficientes': 'Pocos minutos para leer la partida',
  }
  const final = partida.clasifico
    ? `y terminó ${partida.posicion_final}° de ${partida.escuadrones}, dentro del top 25 %`
    : `y terminó ${partida.posicion_final}° de ${partida.escuadrones}`
  return `${como[forma]} ${final}.`
}

/** Reporte de un escuadrón con la plantilla común: mensaje, indicadores, la curva y el detalle desplegable. */
export function Reporte({ partida, titulo, subtitulo, referencia, minutoMarcado, onMinutoActivo, children }: Props) {
  // Precalculados por el notebook; la partida en vivo no los trae y se
  // recalculan con las mismas funciones de respaldo.
  const percentil = partida.percentil ?? calcularPercentil(partida.posicion_final, partida.escuadrones)
  const probMaxima = partida.probabilidad_maxima ?? probabilidadMaxima(partida.minutos)
  const minutoCritico = partida.momento_critico?.minuto ?? extraerMinutoCritico(partida.informe.momento_critico)
  const caida = caidaDesdePico(partida.minutos)
  // El minuto elegido en la curva sube hasta aquí para que las viñetas sigan su cierre.
  const [minutoLocal, setMinutoLocal] = useState<number | null>(null)
  const minutoElegido = minutoMarcado ?? minutoLocal ?? minutoCritico
  const faseElegida = partida.minutos.find((m) => m.minuto === minutoElegido)?.fase

  // Solo con la curva de referencia (catálogo): misma red y misma calibración,
  // así que la comparación es real. En vivo no hay contra qué comparar.
  const maxReferencia = referencia && referencia.length > 0 ? Math.max(...referencia.map((r) => r.probabilidad)) : null
  // El signo sale de la diferencia ya redondeada a puntos enteros: con los
  // valores crudos, 53.9 % contra 53.92 % daba «−0» en rojo.
  const puntosVsReferencia =
    probMaxima != null && maxReferencia != null ? Math.round((probMaxima - maxReferencia) * 100) : null
  const deltaProbMaxima: Delta | null =
    puntosVsReferencia == null
      ? null
      : puntosVsReferencia === 0
        ? { texto: 'Igual que lo más alto de los que llegaron al top', positivo: true }
        : {
            texto: `${puntosVsReferencia > 0 ? '+' : '−'}${pp(puntosVsReferencia / 100)} frente a lo más alto de los que llegaron al top`,
            positivo: puntosVsReferencia > 0,
          }

  return (
    <Cascada className="space-y-6">
      <MensajePrincipal antetitulo={titulo} detalle={subtitulo}>
        {mensaje(clasificarForma(partida.minutos), partida, minutoCritico)}
      </MensajePrincipal>

      <Mira>
        <FilaIndicadores columnas={5}>
          <Indicador
            etiqueta="Posición"
            valor={<Conteo valor={partida.posicion_final} formato={(n) => `${Math.round(n)}°`} />}
            detalle={`de ${partida.escuadrones}`}
            Icono={partida.posicion_final === 1 ? Crown : partida.clasifico ? Trophy : Medal}
            delta={deltaPosicion(partida)}
          />
          <Indicador
            etiqueta="Mejor que"
            valor={<Conteo valor={percentil} formato={pct100} />}
            detalle="de los equipos"
            Icono={BarChart3}
          />
          <Indicador
            etiqueta="Tus mejores posibilidades"
            valor={<Conteo valor={probMaxima} formato={pct} />}
            Icono={TrendingUp}
            delta={deltaProbMaxima}
          />
          <Indicador
            etiqueta="Caída desde lo más alto"
            valor={
              caida == null ? '—' : <Conteo valor={caida} formato={(n) => (n > 0.005 ? `−${pp(n)}` : pp(n))} />
            }
            tono={caida != null && caida >= 0.1 ? 'text-danger' : undefined}
            Icono={TrendingDown}
          />
          <Indicador
            etiqueta="Minuto crítico"
            valor={minutoCritico != null ? <Conteo valor={minutoCritico} formato={(n) => String(Math.round(n))} /> : '—'}
            tono={minutoCritico != null ? 'text-danger' : undefined}
            Icono={Clock}
          />
        </FilaIndicadores>
      </Mira>

      <CurvaProbabilidad
        key={partida.id}
        partida={partida}
        referencia={referencia}
        minutoMarcado={minutoMarcado ?? minutoLocal ?? undefined}
        onMinutoActivo={(m) => {
          setMinutoLocal(m)
          onMinutoActivo?.(m)
        }}
      />

      <Detalle>
        <Informe partida={partida} fraseMeta={fraseMeta(partida)} faseElegida={faseElegida} />
        {children}
      </Detalle>
    </Cascada>
  )
}
