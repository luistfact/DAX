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
import { Ayuda } from './Ayuda'
import { COLOR_ACENTO, COLOR_CONTEXTO, COLOR_CUADRICULA, COLOR_TINTA_SECUNDARIA, COLOR_SUPERFICIE } from '../colores'
import { LABEL_MINUTOS_ANALIZADOS } from '../texto'

type Props = {
  metricas: Metricas | null
}

const AYUDA_AUC =
  'De cada 10 pares de equipos que compara, el modelo ordena bien tantos como su AUC × 10 (con 0.69, unos 7 de 10): le da más probabilidad al equipo que terminó mejor.'
const AYUDA_BRIER =
  'Qué tan confiables son las probabilidades que da el modelo. Si dice 70 %, acierta cerca del 70 % de las veces; más bajo es mejor.'
const AYUDA_AP =
  'Qué tan bien detecta a los equipos que sí llegan al top 25 %, que son la minoría (cerca del 26 % de los casos).'

function PanelHover({ active, payload }: TooltipContentProps) {
  if (!active || !payload || payload.length === 0) return null
  const fila = payload[0].payload as FaseMetrica

  return (
    <div className="rounded-md border border-tinta-secundaria/20 bg-superficie p-3 text-sm shadow-md">
      <p className="font-medium text-tinta">Fase {fila.Fase}</p>
      <dl className="mt-1 grid grid-cols-2 gap-x-4 gap-y-0.5 text-tinta-secundaria">
        <dt style={{ color: COLOR_ACENTO }}>AUC</dt>
        <dd className="text-tinta">{fila.AUC}</dd>
        <dt style={{ color: COLOR_CONTEXTO }}>Tasa base</dt>
        <dd className="text-tinta">{fila['Tasa base']}</dd>
        <dt>Brier</dt>
        <dd className="text-tinta">{fila.Brier}</dd>
        <dt>{LABEL_MINUTOS_ANALIZADOS}</dt>
        <dd className="text-tinta">{fila.n}</dd>
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
      <p className="text-sm text-tinta-secundaria">
        Detalle técnico de cómo se construyó y evaluó el modelo, para quien quiera revisar el rigor
        del análisis.
      </p>

      <div className="grid grid-cols-3 gap-3">
        <div className="rounded-lg border border-tinta-secundaria/15 bg-superficie p-4 text-center">
          <p className="font-cifra text-2xl font-semibold text-tinta">{corpus.partidas}</p>
          <p className="text-xs text-tinta-secundaria">Partidas</p>
        </div>
        <div className="rounded-lg border border-tinta-secundaria/15 bg-superficie p-4 text-center">
          <p className="font-cifra text-2xl font-semibold text-tinta">{corpus.escuadrones}</p>
          <p className="text-xs text-tinta-secundaria">Escuadrones</p>
        </div>
        <div className="rounded-lg border border-tinta-secundaria/15 bg-superficie p-4 text-center">
          <p className="font-cifra text-2xl font-semibold text-tinta">{corpus.observaciones}</p>
          <p className="text-xs text-tinta-secundaria">{LABEL_MINUTOS_ANALIZADOS}</p>
        </div>
      </div>

      <div className="overflow-x-auto rounded-lg border border-tinta-secundaria/15 bg-superficie">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-tinta-secundaria/15 bg-white/5 text-xs uppercase text-tinta-secundaria">
            <tr>
              <th className="px-4 py-2">Modelo</th>
              <th className="px-4 py-2">
                AUC
                <Ayuda texto={AYUDA_AUC} etiqueta="¿Qué significa AUC?" />
              </th>
              <th className="px-4 py-2">
                Brier
                <Ayuda texto={AYUDA_BRIER} etiqueta="¿Qué significa Brier?" />
              </th>
              <th className="px-4 py-2">
                AP
                <Ayuda texto={AYUDA_AP} etiqueta="¿Qué significa AP?" />
              </th>
            </tr>
          </thead>
          <tbody>
            {metricas.modelos.map((m) => (
              <tr key={m.Modelo} className="border-b border-tinta-secundaria/10 last:border-0">
                <td className="px-4 py-2 font-medium text-tinta">{m.Modelo}</td>
                <td className="px-4 py-2 text-tinta-secundaria">{m.AUC}</td>
                <td className="px-4 py-2 text-tinta-secundaria">{m.Brier}</td>
                <td className="px-4 py-2 text-tinta-secundaria">{m.AP}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="rounded-lg border border-tinta-secundaria/15 bg-superficie p-4">
        <h3 className="mb-1 text-sm font-medium text-tinta-secundaria">Desempeño por fase del círculo</h3>
        <p className="mb-3 text-xs text-tinta-secundaria">
          Se evalúa dentro de cada fase por separado: la tasa base (proporción real de escuadrones
          que clasifica) crece conforme avanza la partida por sesgo de supervivencia, así que
          comparar el AUC de fases distintas sin esta referencia sería engañoso.
        </p>
        <ResponsiveContainer width="100%" height={280}>
          <LineChart data={metricas.por_fase} margin={{ top: 10, right: 20, bottom: 0, left: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke={COLOR_CUADRICULA} />
            <XAxis
              dataKey="Fase"
              stroke={COLOR_TINTA_SECUNDARIA}
              tick={{ fontSize: 12, fill: COLOR_TINTA_SECUNDARIA }}
              label={{ value: 'Fase del círculo', position: 'insideBottom', offset: -5, fontSize: 12, fill: COLOR_TINTA_SECUNDARIA }}
            />
            <YAxis
              domain={[0, 1]}
              tickFormatter={(v: number) => `${Math.round(v * 100)}%`}
              stroke={COLOR_TINTA_SECUNDARIA}
              tick={{ fontSize: 12, fill: COLOR_TINTA_SECUNDARIA }}
              width={45}
            />
            <Tooltip content={PanelHover} />
            <Legend wrapperStyle={{ color: COLOR_TINTA_SECUNDARIA, fontSize: 12 }} />
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
              dot={{ r: 3, fill: COLOR_SUPERFICIE }}
              isAnimationActive
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
