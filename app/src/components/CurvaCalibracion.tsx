import {
  CartesianGrid,
  Legend,
  ReferenceLine,
  ResponsiveContainer,
  Scatter,
  ScatterChart,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import type { TooltipContentProps } from 'recharts'
import type { Calibracion, PuntoCalibracion } from '../types/datos'
import { usePaleta } from '../hooks/useTema'
import { metrica, pct, pp } from '../formato'

/** Desviación media (sin ponderar) entre lo predicho y lo observado, en fracción. */
function desviacion(puntos: PuntoCalibracion[] | undefined): number | null {
  if (!puntos || puntos.length === 0) return null
  return puntos.reduce((s, p) => s + Math.abs(p.predicha - p.observada), 0) / puntos.length
}

/** El punto de la curva más cercano a 70 % predicho: un ejemplo concreto de lo que significa la desviación. */
function ejemplo(puntos: PuntoCalibracion[] | undefined): PuntoCalibracion | null {
  if (!puntos || puntos.length === 0) return null
  return puntos.reduce((mejor, p) => (Math.abs(p.predicha - 0.7) < Math.abs(mejor.predicha - 0.7) ? p : mejor))
}

function PanelHover({ active, payload }: TooltipContentProps) {
  if (!active || !payload || payload.length === 0) return null
  const punto = payload[0].payload as PuntoCalibracion
  return (
    <div className="rounded-md border border-line bg-card p-3 text-sm shadow-md">
      <p className="font-medium text-text">{payload[0].name}</p>
      <p className="text-muted">
        Dice {pct(punto.predicha)}; llegan al top {pct(punto.observada)}
      </p>
    </div>
  )
}

/**
 * Probabilidad que da el modelo contra la proporción que de verdad llega al
 * top: la red densa, y la red recurrente antes y después de recalibrar.
 */
export function CurvaCalibracion({ calibracion }: { calibracion: Calibracion }) {
  const paleta = usePaleta()
  const antes = calibracion.red_recurrente_sin_recalibrar
  const desvDensa = desviacion(calibracion.red_densa)
  const desvRecurrente = desviacion(calibracion.red_recurrente)
  const desvAntes = desviacion(antes)
  const ejemploAntes = ejemplo(antes)
  const { recalibracion } = calibracion

  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_380px] xl:items-center">
      <div className="min-w-0 space-y-3">
        <p className="text-sm text-muted">
          Como la app muestra probabilidades, no basta con que ordene bien: si dice 40 %, cerca del 40 % de esos
          escuadrones debería llegar al top. Cada punto agrupa escuadrones con una probabilidad parecida; sobre la
          diagonal, el modelo acierta la frecuencia.
        </p>
        <ResponsiveContainer width="100%" height={320}>
          <ScatterChart margin={{ top: 10, right: 20, bottom: 24, left: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke={paleta.cuadricula} />
            <XAxis
              type="number"
              dataKey="predicha"
              domain={[0, 1]}
              ticks={[0, 0.25, 0.5, 0.75, 1]}
              tickFormatter={(v: number) => pct(v)}
              stroke={paleta.muted}
              tick={{ fontSize: 12, fill: paleta.muted }}
              label={{
                value: 'Probabilidad que da el modelo',
                position: 'insideBottom',
                offset: -16,
                fontSize: 12,
                fill: paleta.muted,
              }}
            />
            <YAxis
              type="number"
              dataKey="observada"
              domain={[0, 1]}
              ticks={[0, 0.25, 0.5, 0.75, 1]}
              tickFormatter={(v: number) => pct(v)}
              stroke={paleta.muted}
              tick={{ fontSize: 12, fill: paleta.muted }}
              width={48}
            />
            <ReferenceLine
              segment={[
                { x: 0, y: 0 },
                { x: 1, y: 1 },
              ]}
              stroke={paleta.muted}
              strokeDasharray="4 4"
              label={{ value: 'Calibración perfecta', position: 'insideTopLeft', fontSize: 12, fill: paleta.muted }}
            />
            <Tooltip content={PanelHover} cursor={false} />
            <Legend verticalAlign="top" align="right" height={28} wrapperStyle={{ color: paleta.muted, fontSize: 12 }} />
            {antes && (
              // El antes, punteado y hueco: se lee como referencia, no como lo que ve el usuario.
              <Scatter
                name="Red recurrente, antes de recalibrar"
                data={antes}
                fill={paleta.card}
                stroke={paleta.zone}
                line={{ stroke: paleta.zone, strokeWidth: 1.5, strokeDasharray: '5 4' }}
                isAnimationActive={false}
              />
            )}
            <Scatter
              name="Red recurrente (catálogo)"
              data={calibracion.red_recurrente}
              fill={paleta.zone}
              line={{ stroke: paleta.zone, strokeWidth: 2 }}
              isAnimationActive={false}
            />
            <Scatter
              name="Red densa (en vivo)"
              data={calibracion.red_densa}
              fill={paleta.muted}
              line={{ stroke: paleta.muted, strokeWidth: 2 }}
              isAnimationActive={false}
            />
          </ScatterChart>
        </ResponsiveContainer>
      </div>
      <div className="space-y-2 text-sm text-text">
        {antes && desvAntes != null && desvRecurrente != null && (
          <p>
            La <strong className="font-semibold">red recurrente</strong>, la que dibuja la curva del catálogo, se
            entrenó compensando el desbalance de clases, y eso inflaba sus probabilidades
            {ejemploAntes &&
              ` (cuando decía ${pct(ejemploAntes.predicha)}, llegaba al top el ${pct(ejemploAntes.observada)})`}
            . Se recalibraron sin alterar el orden de los escuadrones, así que el AUC no cambia: la desviación media bajó
            de {pp(desvAntes)} a {pp(desvRecurrente)}
            {recalibracion &&
              ` y el Brier de ${metrica(recalibracion.brier_antes)} a ${metrica(recalibracion.brier_despues)}`}
            .
          </p>
        )}
        {desvDensa != null && (
          <p>
            La <strong className="font-semibold">red densa</strong>, la del análisis en vivo, ya estaba bien calibrada:
            en promedio se aleja {pp(desvDensa)} de lo observado.
          </p>
        )}
        <p className="text-xs text-muted">
          Tramos del conjunto de {calibracion.conjunto}; desviación media sin ponderar por el número de escuadrones de cada
          tramo.{recalibracion && ` Método: ${recalibracion.metodo}.`}
        </p>
      </div>
    </div>
  )
}
