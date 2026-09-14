import { motion } from 'motion/react'
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

type Props = {
  partida: Partida | null
}

const UMBRAL_CAIDA = 0.1

/** Minutos donde la probabilidad cae más de 10 puntos respecto del minuto anterior. */
function minutosConCaida(minutos: Minuto[]): Minuto[] {
  const resultado: Minuto[] = []
  for (let i = 1; i < minutos.length; i++) {
    const anterior = minutos[i - 1].probabilidad
    const actual = minutos[i].probabilidad
    if (anterior != null && actual != null && anterior - actual > UMBRAL_CAIDA) {
      resultado.push(minutos[i])
    }
  }
  return resultado
}

function PanelHover({ active, payload }: TooltipContentProps) {
  if (!active || !payload || payload.length === 0) return null
  const m = payload[0].payload as Minuto

  return (
    <div className="rounded-md border border-slate-200 bg-white p-3 text-sm shadow-md">
      <p className="font-medium text-slate-900">Minuto {m.minuto}</p>
      <dl className="mt-1 grid grid-cols-2 gap-x-4 gap-y-0.5 text-slate-600">
        <dt>Probabilidad</dt>
        <dd>{m.probabilidad != null ? `${Math.round(m.probabilidad * 100)}%` : '—'}</dd>
        <dt>Integrantes vivos</dt>
        <dd>{m.vivos}</dd>
        <dt>Salud</dt>
        <dd>{m.salud}</dd>
        <dt>Fase del círculo</dt>
        <dd>{m.fase}</dd>
        <dt>Equipos restantes</dt>
        <dd>{m.equipos_vivos}</dd>
      </dl>
    </div>
  )
}

/** Curva de probabilidad minuto a minuto, con marcadores en caídas mayores a 10 puntos. */
export function CurvaProbabilidad({ partida }: Props) {
  if (!partida) {
    return <EstadoVacio mensaje="Selecciona una partida para ver su curva de probabilidad." />
  }

  const caidas = minutosConCaida(partida.minutos)

  return (
    <motion.div
      key={partida.id}
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="rounded-lg border border-slate-200 bg-white p-4"
    >
      <h3 className="mb-3 text-sm font-medium text-slate-700">Probabilidad de clasificar al cuarto superior</h3>
      <ResponsiveContainer width="100%" height={280}>
        <LineChart data={partida.minutos} margin={{ top: 10, right: 20, bottom: 0, left: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
          <XAxis dataKey="minuto" tick={{ fontSize: 12 }} label={{ value: 'Minuto', position: 'insideBottom', offset: -5, fontSize: 12 }} />
          <YAxis domain={[0, 1]} tickFormatter={(v: number) => `${Math.round(v * 100)}%`} tick={{ fontSize: 12 }} width={45} />
          <Tooltip content={PanelHover} />
          <Line
            type="monotone"
            dataKey="probabilidad"
            stroke="#2563eb"
            strokeWidth={2}
            dot={{ r: 3 }}
            connectNulls={false}
            isAnimationActive
            animationDuration={900}
          />
          {caidas.map((m) => (
            <ReferenceDot
              key={m.minuto}
              x={m.minuto}
              y={m.probabilidad ?? 0}
              r={6}
              fill="#dc2626"
              stroke="#fff"
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
      {caidas.length > 0 && (
        <p className="mt-2 text-xs text-slate-500">
          Marcadores en rojo: minutos {caidas.map((m) => m.minuto).join(', ')} — caída de probabilidad mayor a 10 puntos.
        </p>
      )}
    </motion.div>
  )
}
