import { motion } from 'motion/react'
import type { Minuto } from '../types/datos'
import { usePaleta } from '../hooks/useTema'
import { DURACION, useTransicion } from '../movimiento'

// Mini gráficas de las tarjetas de indicadores de la partida. SVG propio, sin
// dependencias. Los anillos y medidores se llenan una vez por carga (`llenar`)
// y, si cambia el valor, se deslizan al nuevo en lugar de saltar.

const TRAZO = 8

/** Escalera de 1 a N: un peldaño por lugar, el corte del top marcado y el tuyo resaltado. */
export function Escalera({ posicion, total, corte }: { posicion: number; total: number; corte: number }) {
  const paleta = usePaleta()
  const ancho = 100
  const paso = ancho / total
  return (
    <svg viewBox={`0 0 ${ancho} 24`} className="h-9 w-full" aria-hidden="true" preserveAspectRatio="none">
      {Array.from({ length: total }, (_, i) => {
        const lugar = i + 1
        const alto = 6 + (16 * (total - lugar)) / Math.max(1, total - 1)
        const esTuyo = lugar === posicion
        return (
          <rect
            key={lugar}
            x={i * paso + paso * 0.15}
            y={24 - alto}
            width={paso * 0.7}
            height={alto}
            rx={0.6}
            fill={esTuyo ? paleta.text : paleta.muted}
            fillOpacity={esTuyo ? 1 : lugar <= corte ? 0.55 : 0.2}
          />
        )
      })}
      {/* El corte del top 25 %: a la izquierda de esta línea, dentro. */}
      <line x1={corte * paso} x2={corte * paso} y1={0} y2={24} stroke={paleta.text} strokeWidth={0.8} strokeDasharray="2 1.5" />
    </svg>
  )
}

/** Anillo de progreso: qué parte del total. */
export function Anillo({ fraccion, color, llenar }: { fraccion: number; color: string; llenar: boolean }) {
  const paleta = usePaleta()
  const { transicion } = useTransicion()
  return (
    <svg viewBox="0 0 48 48" className="h-9 w-9 -rotate-90" aria-hidden="true">
      <circle cx="24" cy="24" r="19" fill="none" stroke={paleta.line} strokeWidth={TRAZO} />
      <motion.circle
        cx="24"
        cy="24"
        r="19"
        fill="none"
        stroke={color}
        strokeWidth={TRAZO}
        strokeLinecap="round"
        initial={llenar ? { pathLength: 0 } : false}
        animate={{ pathLength: Math.max(0.001, Math.min(1, fraccion)) }}
        transition={transicion(llenar ? DURACION.grafica : DURACION.cambioValor)}
      />
    </svg>
  )
}

/** Medidor semicircular: de 0 a 100 %, la aguja del arco llena hasta el valor. */
export function Medidor({ fraccion, color, llenar }: { fraccion: number; color: string; llenar: boolean }) {
  const paleta = usePaleta()
  const { transicion } = useTransicion()
  const arco = 'M 6 30 A 24 24 0 0 1 54 30'
  return (
    <svg viewBox="0 0 60 34" className="h-9 w-16" aria-hidden="true">
      <path d={arco} fill="none" stroke={paleta.line} strokeWidth={TRAZO} strokeLinecap="round" />
      <motion.path
        d={arco}
        fill="none"
        stroke={color}
        strokeWidth={TRAZO}
        strokeLinecap="round"
        initial={llenar ? { pathLength: 0 } : false}
        animate={{ pathLength: Math.max(0.001, Math.min(1, fraccion)) }}
        transition={transicion(llenar ? DURACION.grafica : DURACION.cambioValor)}
      />
    </svg>
  )
}

/** Mini línea de la curva: el tramo desde el punto más alto hasta el final, en rojo si fue una caída. */
export function MiniCaida({ minutos, roja }: { minutos: Minuto[]; roja: boolean }) {
  const paleta = usePaleta()
  const puntos = minutos
    .filter((m): m is Minuto & { probabilidad: number } => m.probabilidad != null)
    .sort((a, b) => a.minuto - b.minuto)
  if (puntos.length < 2) return null
  const ancho = 100
  const alto = 24
  const x = (i: number) => (i / (puntos.length - 1)) * ancho
  const y = (p: number) => alto - p * (alto - 2) - 1
  const pico = puntos.reduce((mejor, p, i) => (p.probabilidad > puntos[mejor].probabilidad ? i : mejor), 0)
  const trazo = (desde: number, hasta: number) =>
    puntos
      .slice(desde, hasta + 1)
      .map((p, k) => `${k === 0 ? 'M' : 'L'}${x(desde + k).toFixed(1)},${y(p.probabilidad).toFixed(1)}`)
      .join(' ')
  return (
    <svg viewBox={`0 0 ${ancho} ${alto}`} className="h-9 w-full" aria-hidden="true" preserveAspectRatio="none">
      <path d={trazo(0, pico)} fill="none" stroke={paleta.muted} strokeWidth={1.5} vectorEffect="non-scaling-stroke" />
      <path
        d={trazo(pico, puntos.length - 1)}
        fill="none"
        stroke={roja ? paleta.danger : paleta.muted}
        strokeWidth={2}
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  )
}

/** Línea de tiempo de 15 minutos con un punto en el minuto crítico (HTML: el punto no se deforma al estirar). */
export function LineaTiempo({ minuto, total = 15 }: { minuto: number; total?: number }) {
  const { transicion } = useTransicion()
  const izquierda = `${(minuto / (total - 1)) * 100}%`
  return (
    <span className="relative block h-4" aria-hidden="true">
      <span className="absolute inset-x-0 top-1/2 h-0.5 -translate-y-1/2 rounded bg-line" />
      <span className="absolute inset-x-0 top-1/2 flex -translate-y-1/2 justify-between">
        {Array.from({ length: total }, (_, m) => (
          <span key={m} className="h-1.5 w-px bg-muted/50" />
        ))}
      </span>
      {/* Una capa del ancho de la pista que se traslada: el punto se desliza
          al minuto del nuevo escuadrón solo con transformaciones. */}
      <motion.span
        className="absolute inset-0"
        initial={false}
        animate={{ x: izquierda }}
        transition={transicion(DURACION.cambioValor)}
      >
        <span className="absolute left-0 top-1/2 h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full bg-danger" />
      </motion.span>
    </span>
  )
}
