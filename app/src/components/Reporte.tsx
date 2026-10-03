import { useEffect, useState, type ReactNode } from 'react'
import { BarChart3, Clock, Crown, Medal, TrendingDown, TrendingUp, Trophy } from 'lucide-react'
import type { Partida, PuntoReferencia } from '../types/datos'
import { CurvaProbabilidad } from './CurvaProbabilidad'
import { Informe } from './Informe'
import { Mira } from './Mira'
import { Cascada } from './Cascada'
import { Conteo } from './Conteo'
import { Detalle, FilaIndicadores, Indicador, MensajePrincipal, type Delta } from './Plantilla'
import { Anillo, Escalera, LineaTiempo, Medidor, MiniCaida } from './MiniGraficas'
import { usePaleta } from '../hooks/useTema'
import { useAnimarUnaVez } from '../hooks/useAnimarUnaVez'
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
  // Doce palabras como máximo: el top ya lo dice el trofeo de la tarjeta.
  const como: Record<Forma, string> = {
    Desplome: minutoCritico != null ? `Se vino abajo en el minuto ${minutoCritico}` : 'Se vino abajo al final',
    Remontada: 'Remontó desde muy abajo',
    Dominante: 'Dominó la partida',
    'Caída temprana': 'Empezó cuesta arriba',
    Reñida: 'Partida reñida',
    'Sin datos suficientes': 'Pocos minutos para leer',
  }
  return `${como[forma]} y terminó ${partida.posicion_final}° de ${partida.escuadrones}.`
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
  // Otro escuadrón: el minuto elegido vuelve al momento crítico. Sin desmontar
  // la vista, para que números y medidores se deslicen al nuevo valor.
  useEffect(() => setMinutoLocal(null), [partida.id])
  const paleta = usePaleta()
  const llenar = useAnimarUnaVez(`kpi-${partida.id}`)
  const corte = lugaresTop25(partida.escuadrones)
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
            grafica={<Escalera posicion={partida.posicion_final} total={partida.escuadrones} corte={corte} />}
          />
          <Indicador
            etiqueta="Mejor que"
            valor={<Conteo valor={percentil} formato={pct100} />}
            detalle="de los equipos"
            Icono={BarChart3}
            grafica={percentil != null ? <Anillo fraccion={percentil / 100} color={paleta.zone} llenar={llenar} /> : undefined}
          />
          <Indicador
            etiqueta="Tus mejores posibilidades"
            valor={<Conteo valor={probMaxima} formato={pct} />}
            Icono={TrendingUp}
            delta={deltaProbMaxima}
            acento="zone"
            grafica={probMaxima != null ? <Medidor fraccion={probMaxima} color={paleta.zone} llenar={llenar} /> : undefined}
          />
          <Indicador
            etiqueta="Caída desde lo más alto"
            valor={
              // Solo el número en grande: «−52 puntos» a 56 px no cabe en la tarjeta.
              caida == null ? '—' : <Conteo valor={caida} formato={(n) => `${Math.round(n * 100) > 0 ? '−' : ''}${Math.round(n * 100)}`} />
            }
            detalle={caida != null ? 'puntos' : undefined}
            tono={caida != null && caida >= 0.1 ? 'text-danger' : undefined}
            Icono={TrendingDown}
            acento={caida != null && caida >= 0.1 ? 'danger' : undefined}
            grafica={<MiniCaida minutos={partida.minutos} roja={caida != null && caida >= 0.1} />}
          />
          <Indicador
            etiqueta="Minuto crítico"
            valor={minutoCritico != null ? <Conteo valor={minutoCritico} formato={(n) => String(Math.round(n))} /> : '—'}
            tono={minutoCritico != null ? 'text-danger' : undefined}
            Icono={Clock}
            acento={minutoCritico != null ? 'danger' : undefined}
            grafica={minutoCritico != null ? <LineaTiempo minuto={minutoCritico} /> : undefined}
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

      <Detalle columnas={2}>
        <Informe partida={partida} fraseMeta={fraseMeta(partida)} faseElegida={faseElegida} />
        {children}
      </Detalle>
    </Cascada>
  )
}
