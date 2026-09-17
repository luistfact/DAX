import type { Minuto } from '../types/datos'

type Props = {
  minutos: Minuto[]
  color: string
  width?: number
  height?: number
}

/** Miniatura de la curva de probabilidad, sin ejes ni tooltip: solo la forma. */
export function Sparkline({ minutos, color, width = 96, height = 28 }: Props) {
  const puntos = minutos
    .filter((m): m is Minuto & { probabilidad: number } => m.probabilidad != null)
    .sort((a, b) => a.minuto - b.minuto)

  if (puntos.length < 2) return null

  const minMinuto = puntos[0].minuto
  const maxMinuto = puntos[puntos.length - 1].minuto
  const rangoMinuto = Math.max(1, maxMinuto - minMinuto)

  const x = (minuto: number) => ((minuto - minMinuto) / rangoMinuto) * width
  const y = (probabilidad: number) => height - probabilidad * height

  const d = puntos
    .map((m, i) => `${i === 0 ? 'M' : 'L'}${x(m.minuto).toFixed(1)},${y(m.probabilidad).toFixed(1)}`)
    .join(' ')

  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} aria-hidden="true" className="shrink-0">
      <path d={d} fill="none" stroke={color} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}
