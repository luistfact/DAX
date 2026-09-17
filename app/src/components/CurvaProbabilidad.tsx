import {
  Line,
  LineChart,
  ReferenceDot,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  CartesianGrid,
} from 'recharts'
import type { TooltipContentProps } from 'recharts'
import type { Minuto, Partida } from '../types/datos'
import { EstadoVacio } from './EstadoVacio'
import { CirculoCierre } from './CirculoCierre'
import { LABEL_PROBABILIDAD_TOP25, formatCierre } from '../texto'
import { extraerMinutoCritico } from '../analisisPartida'
import { usePrefersReducedMotion } from '../hooks/usePrefersReducedMotion'
import { COLOR_ZONA, COLOR_PELIGRO, COLOR_CUADRICULA, COLOR_TINTA_SECUNDARIA, COLOR_SUPERFICIE } from '../colores'

type Props = {
  partida: Partida | null
}

function PanelHover({ active, payload }: TooltipContentProps) {
  if (!active || !payload || payload.length === 0) return null
  const m = payload[0].payload as Minuto

  return (
    <div className="rounded-md border border-tinta-secundaria/20 bg-superficie p-3 text-sm shadow-md">
      <p className="font-medium text-tinta">Minuto {m.minuto}</p>
      <dl className="mt-1 grid grid-cols-2 gap-x-4 gap-y-0.5 text-tinta-secundaria">
        <dt>Prob. top 25 %</dt>
        <dd className="font-cifra text-tinta">{m.probabilidad != null ? `${Math.round(m.probabilidad * 100)}%` : '—'}</dd>
        <dt>Compañeros en pie</dt>
        <dd>{m.vivos}</dd>
        <dt>Salud del equipo</dt>
        <dd>{m.salud}</dd>
        <dt>Cierre de la zona</dt>
        <dd>{formatCierre(m.fase)}</dd>
        <dt>Equipos restantes</dt>
        <dd>{m.equipos_vivos}</dd>
      </dl>
    </div>
  )
}

/** Curva de probabilidad minuto a minuto, con el momento crítico marcado sobre la línea. */
export function CurvaProbabilidad({ partida }: Props) {
  const reducido = usePrefersReducedMotion()

  if (!partida) {
    return <EstadoVacio mensaje="Selecciona una partida para ver tu probabilidad de llegar al top 25 %." />
  }

  const minutoCritico = extraerMinutoCritico(partida.informe.momento_critico)
  const puntoCritico = partida.minutos.find((m) => m.minuto === minutoCritico && m.probabilidad != null)

  return (
    <div className="rounded-lg border border-tinta-secundaria/15 bg-superficie p-4">
      <div className="mb-1 flex items-center justify-between gap-3">
        <h3 className="text-sm font-medium text-tinta-secundaria">{LABEL_PROBABILIDAD_TOP25}</h3>
        <CirculoCierre claveAnimacion={partida.id} clasifico={partida.clasifico} duracionMs={900} />
      </div>
      <ResponsiveContainer width="100%" height={280}>
        <LineChart data={partida.minutos} margin={{ top: 10, right: 20, bottom: 0, left: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke={COLOR_CUADRICULA} />
          <XAxis
            dataKey="minuto"
            stroke={COLOR_TINTA_SECUNDARIA}
            tick={{ fontSize: 12, fill: COLOR_TINTA_SECUNDARIA }}
            label={{ value: 'Minuto', position: 'insideBottom', offset: -5, fontSize: 12, fill: COLOR_TINTA_SECUNDARIA }}
          />
          <YAxis
            domain={[0, 1]}
            tickFormatter={(v: number) => `${Math.round(v * 100)}%`}
            stroke={COLOR_TINTA_SECUNDARIA}
            tick={{ fontSize: 12, fill: COLOR_TINTA_SECUNDARIA }}
            width={45}
          />
          <Tooltip content={PanelHover} />
          <Line
            type="monotone"
            dataKey="probabilidad"
            stroke={COLOR_ZONA}
            strokeWidth={2}
            dot={{ r: 3 }}
            connectNulls={false}
            isAnimationActive={!reducido}
            animationDuration={900}
          />
          {puntoCritico && (
            <ReferenceDot
              x={puntoCritico.minuto}
              y={puntoCritico.probabilidad ?? 0}
              r={6}
              fill={COLOR_PELIGRO}
              stroke={COLOR_SUPERFICIE}
            />
          )}
        </LineChart>
      </ResponsiveContainer>
      {puntoCritico && (
        <p className="mt-2 text-xs text-tinta-secundaria">
          Marcador en rojo: minuto {puntoCritico.minuto} — el momento crítico de la partida.
        </p>
      )}
    </div>
  )
}
