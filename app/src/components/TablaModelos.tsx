import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import type { TooltipContentProps } from 'recharts'
import type { FaseMetrica, Metricas } from '../types/datos'
import { EstadoVacio } from './EstadoVacio'
import { COLOR_ACENTO, COLOR_CONTEXTO } from '../colores'

type Props = {
  metricas: Metricas | null
}

function PanelHover({ active, payload }: TooltipContentProps) {
  if (!active || !payload || payload.length === 0) return null
  const fila = payload[0].payload as FaseMetrica

  return (
    <div className="rounded-md border border-slate-200 bg-white p-3 text-sm shadow-md">
      <p className="font-medium text-slate-900">Fase {fila.Fase}</p>
      <dl className="mt-1 grid grid-cols-2 gap-x-4 gap-y-0.5 text-slate-600">
        <dt style={{ color: COLOR_ACENTO }}>AUC</dt>
        <dd>{fila.AUC}</dd>
        <dt style={{ color: COLOR_CONTEXTO }}>Tasa base</dt>
        <dd>{fila['Tasa base']}</dd>
        <dt>Brier</dt>
        <dd>{fila.Brier}</dd>
        <dt>Observaciones</dt>
        <dd>{fila.n}</dd>
      </dl>
    </div>
  )
}

/** Tabla comparativa de modelos y curva de desempeño (AUC vs. tasa base) por fase. */
export function TablaModelos({ metricas }: Props) {
  if (!metricas) {
    return (
      <EstadoVacio mensaje="Aún no hay métricas cargadas. Genera public/datos/metricas.json desde el notebook." />
    )
  }

  const { corpus } = metricas

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-3 gap-3">
        <div className="rounded-lg border border-slate-200 bg-white p-4 text-center">
          <p className="text-2xl font-semibold text-slate-900">{corpus.partidas}</p>
          <p className="text-xs text-slate-500">Partidas</p>
        </div>
        <div className="rounded-lg border border-slate-200 bg-white p-4 text-center">
          <p className="text-2xl font-semibold text-slate-900">{corpus.escuadrones}</p>
          <p className="text-xs text-slate-500">Escuadrones</p>
        </div>
        <div className="rounded-lg border border-slate-200 bg-white p-4 text-center">
          <p className="text-2xl font-semibold text-slate-900">{corpus.observaciones}</p>
          <p className="text-xs text-slate-500">Observaciones</p>
        </div>
      </div>

      <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase text-slate-500">
            <tr>
              <th className="px-4 py-2">Modelo</th>
              <th className="px-4 py-2">AUC</th>
              <th className="px-4 py-2">Brier</th>
              <th className="px-4 py-2">AP</th>
            </tr>
          </thead>
          <tbody>
            {metricas.modelos.map((m) => (
              <tr key={m.Modelo} className="border-b border-slate-100 last:border-0">
                <td className="px-4 py-2 font-medium text-slate-800">{m.Modelo}</td>
                <td className="px-4 py-2 text-slate-700">{m.AUC}</td>
                <td className="px-4 py-2 text-slate-700">{m.Brier}</td>
                <td className="px-4 py-2 text-slate-700">{m.AP}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="rounded-lg border border-slate-200 bg-white p-4">
        <h3 className="mb-1 text-sm font-medium text-slate-700">Desempeño por fase del círculo</h3>
        <p className="mb-3 text-xs text-slate-500">
          Se evalúa dentro de cada fase por separado: la tasa base (proporción real de escuadrones
          que clasifica) crece conforme avanza la partida por sesgo de supervivencia, así que
          comparar el AUC de fases distintas sin esta referencia sería engañoso.
        </p>
        <ResponsiveContainer width="100%" height={280}>
          <LineChart data={metricas.por_fase} margin={{ top: 10, right: 20, bottom: 0, left: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
            <XAxis
              dataKey="Fase"
              tick={{ fontSize: 12 }}
              label={{ value: 'Fase del círculo', position: 'insideBottom', offset: -5, fontSize: 12 }}
            />
            <YAxis
              domain={[0, 1]}
              tickFormatter={(v: number) => `${Math.round(v * 100)}%`}
              tick={{ fontSize: 12 }}
              width={45}
            />
            <Tooltip content={PanelHover} />
            <Legend />
            <Line
              type="monotone"
              dataKey="AUC"
              name="AUC"
              stroke={COLOR_ACENTO}
              strokeWidth={2}
              dot={{ r: 3 }}
              isAnimationActive
            />
            <Line
              type="monotone"
              dataKey="Tasa base"
              name="Tasa base"
              stroke={COLOR_CONTEXTO}
              strokeWidth={2}
              dot={{ r: 3 }}
              isAnimationActive
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
