import { useEffect, useState } from 'react'
import { motion } from 'motion/react'
import type { Minuto, ReferenciaFase } from '../types/datos'
import { estadoPorFase, type EstadoFase } from '../analisisPartida'
import { LABEL_COMPANEROS_EN_PIE, LABEL_SALUD_EQUIPO, rotuloFase, rotuloFaseCorto } from '../texto'
import { DURACION, useTransicion } from '../movimiento'
import { useAnimarUnaVez } from '../hooks/useAnimarUnaVez'

type Props = {
  /** Identifica al escuadrón: las barras crecen desde cero una vez por escuadrón. */
  clave: string
  minutos: Minuto[]
  referencia: ReferenciaFase[]
  /** Cierre del minuto elegido en la curva: las viñetas lo siguen. */
  faseElegida?: number
}

type Variable = {
  titulo: string
  propio: (e: EstadoFase) => number
  top: (r: ReferenciaFase) => number
  maximo: number
  formato: (v: number) => string
  /** null: color neutro, sin juicio de mejor o peor. */
  mejorSiMayor: boolean | null
}

// La distancia al círculo va en neutro a propósito: el hallazgo central del
// proyecto es que la posición casi no pesa (por eso se retiró «rotar antes»
// de los escenarios). Pintar de rojo estar lejos lo contradiría.
const VARIABLES: Variable[] = [
  {
    titulo: LABEL_SALUD_EQUIPO,
    propio: (e) => e.salud,
    top: (r) => r.hp_medio,
    maximo: 100,
    formato: (v) => v.toFixed(0),
    mejorSiMayor: true,
  },
  {
    titulo: LABEL_COMPANEROS_EN_PIE,
    propio: (e) => e.vivos,
    top: (r) => r.jugadores_vivos,
    maximo: 4,
    formato: (v) => (Number.isInteger(v) ? String(v) : v.toFixed(1)),
    mejorSiMayor: true,
  },
  {
    titulo: 'Distancia al círculo',
    propio: (e) => e.dist_rel,
    top: (r) => r.dist_rel,
    maximo: 1.5,
    // Fracción del camino del centro al borde de la zona (1 = en el borde).
    formato: (v) => `${Math.round(v * 100)} % del camino al borde`,
    mejorSiMayor: null,
  },
]

function Vineta({ variable, estado, ref_, crecer }: { variable: Variable; estado: EstadoFase; ref_: ReferenciaFase; crecer: boolean }) {
  const { transicion } = useTransicion()
  const propio = variable.propio(estado)
  const top = variable.top(ref_)
  const fraccion = (v: number) => Math.min(1, Math.max(0, v / variable.maximo))
  const aLaAltura = variable.mejorSiMayor == null ? null : variable.mejorSiMayor ? propio >= top : propio <= top
  const color = aLaAltura == null ? 'bg-muted' : aLaAltura ? 'bg-alive' : 'bg-danger'

  return (
    <li className="space-y-1">
      <p className="flex items-baseline justify-between gap-2 text-sm">
        <span className="text-text">{variable.titulo}</span>
        <span className="text-xs text-muted">
          <span className="font-cifra text-sm text-text">{variable.formato(propio)}</span> · lo típico del top:{' '}
          {variable.formato(top)}
        </span>
      </p>
      {/* Solo transformaciones: la barra crece con scaleX y la marca se desplaza con translateX. */}
      <div className="relative h-3 overflow-x-clip rounded-sm bg-text/5" aria-hidden="true">
        <motion.span
          className={`absolute inset-0 origin-left rounded-sm ${color}`}
          initial={crecer ? { scaleX: 0 } : false}
          animate={{ scaleX: fraccion(propio) }}
          transition={transicion(crecer ? DURACION.grafica : DURACION.cambioValor)}
        />
        <motion.span
          className="absolute -inset-y-1 left-0 w-full"
          initial={false}
          animate={{ x: `${fraccion(top) * 100}%` }}
          transition={transicion(DURACION.cambioValor)}
        >
          <span className="absolute inset-y-0 left-0 w-0.5 -translate-x-1/2 bg-text" />
        </motion.span>
      </div>
    </li>
  )
}

/**
 * Tu equipo (barra) contra lo típico de los que llegaron al top 25 % (marca),
 * un cierre a la vez. Al cambiar de cierre, las barras se deslizan de un valor
 * al otro.
 */
export function VinetasTop({ clave, minutos, referencia, faseElegida }: Props) {
  const fases = estadoPorFase(minutos)
    .map((estado) => ({ estado, ref_: referencia.find((r) => r.fase_zona === estado.fase) }))
    .filter((f): f is { estado: EstadoFase; ref_: ReferenciaFase } => f.ref_ != null)
  const [faseLocal, setFaseLocal] = useState<number | null>(null)
  const crecer = useAnimarUnaVez(`vinetas-${clave}`)

  // Lo último que se tocó manda: elegir un minuto en la curva gana sobre el selector.
  useEffect(() => setFaseLocal(null), [faseElegida])

  if (fases.length === 0) return null
  const disponibles = fases.map((f) => f.estado.fase)
  const elegida =
    [faseLocal, faseElegida].find((f): f is number => f != null && disponibles.includes(f)) ?? disponibles.at(-1)!
  const actual = fases.find((f) => f.estado.fase === elegida)!

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-1.5" role="group" aria-label="Elegir cierre">
        {fases.map(({ estado }) => (
          <button
            key={estado.fase}
            type="button"
            onClick={() => setFaseLocal(estado.fase)}
            aria-pressed={estado.fase === elegida}
            aria-label={rotuloFase(estado.fase)}
            className={
              'rounded-full border px-3 py-1 font-cifra text-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zone ' +
              (estado.fase === elegida ? 'border-text bg-text text-bg' : 'border-line bg-card text-muted hover:text-text')
            }
          >
            {rotuloFaseCorto(estado.fase)}
          </button>
        ))}
        <span className="ml-1 text-xs text-muted">o elige un minuto en la curva</span>
      </div>
      <ul className="space-y-3">
        {VARIABLES.map((v) => (
          <Vineta key={v.titulo} variable={v} estado={actual.estado} ref_={actual.ref_} crecer={crecer} />
        ))}
      </ul>
      <p className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted">
        <span>Barra: tu equipo en el {rotuloFase(elegida).toLowerCase()}</span>
        <span className="flex items-center gap-1.5">
          <span className="h-3 w-0.5 bg-text" aria-hidden="true" /> lo típico de los que llegaron al top
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-2 w-3 rounded-sm bg-alive" aria-hidden="true" /> a la altura
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-2 w-3 rounded-sm bg-danger" aria-hidden="true" /> por debajo
        </span>
        <span>La distancia va sin color: dónde estás casi no pesa en el resultado.</span>
      </p>
    </div>
  )
}
