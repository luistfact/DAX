import type { Minuto, ReferenciaFase } from '../types/datos'
import { estadoPorFase, type EstadoFase } from '../analisisPartida'
import { LABEL_COMPANEROS_EN_PIE, LABEL_SALUD_EQUIPO, rotuloFase } from '../texto'

type Props = {
  minutos: Minuto[]
  referencia: ReferenciaFase[]
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
    formato: (v) => `${v.toFixed(2)} radios`,
    mejorSiMayor: null,
  },
]

function Vineta({ variable, estado, ref_ }: { variable: Variable; estado: EstadoFase; ref_: ReferenciaFase }) {
  const propio = variable.propio(estado)
  const top = variable.top(ref_)
  const escala = (v: number) => `${Math.min(1, Math.max(0, v / variable.maximo)) * 100}%`
  const aLaAltura =
    variable.mejorSiMayor == null ? null : variable.mejorSiMayor ? propio >= top : propio <= top
  const color = aLaAltura == null ? 'bg-muted' : aLaAltura ? 'bg-alive' : 'bg-danger'

  return (
    <li className="grid grid-cols-[2rem_minmax(0,1fr)_minmax(6.5rem,auto)] items-center gap-2 text-xs">
      <span className="font-cifra text-sm text-muted">{rotuloFase(estado.fase)}</span>
      <span className="relative h-3 rounded-sm bg-text/5" aria-hidden="true">
        <span className={`absolute inset-y-0 left-0 rounded-sm ${color}`} style={{ width: escala(propio) }} />
        <span className="absolute -inset-y-1 w-0.5 bg-text" style={{ left: escala(top) }} />
      </span>
      <span className="text-right text-muted">
        <span className="font-cifra text-sm text-text">{variable.formato(propio)}</span> · top{' '}
        {variable.formato(top)}
      </span>
    </li>
  )
}

/** Tu equipo (barra) contra la mediana de los que llegaron al top 25 % (marca), en cada fase del círculo. */
export function VinetasTop({ minutos, referencia }: Props) {
  const fases = estadoPorFase(minutos)
    .map((estado) => ({ estado, ref_: referencia.find((r) => r.fase_zona === estado.fase) }))
    .filter((f): f is { estado: EstadoFase; ref_: ReferenciaFase } => f.ref_ != null)
  if (fases.length === 0) return null

  return (
    <div className="space-y-3">
      <p className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted">
        <span>Barra: tu equipo (mediana de la fase)</span>
        <span className="flex items-center gap-1.5">
          <span className="h-3 w-0.5 bg-text" aria-hidden="true" /> mediana de los que llegaron al top
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-2 w-3 rounded-sm bg-alive" aria-hidden="true" /> a la altura
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-2 w-3 rounded-sm bg-danger" aria-hidden="true" /> por debajo
        </span>
      </p>
      <div className="grid gap-4 lg:grid-cols-3">
        {VARIABLES.map((v) => (
          <div key={v.titulo} className="space-y-1.5">
            <h5 className="titulo-seccion text-sm text-muted">{v.titulo}</h5>
            <ul className="space-y-1.5">
              {fases.map(({ estado, ref_ }) => (
                <Vineta key={estado.fase} variable={v} estado={estado} ref_={ref_} />
              ))}
            </ul>
            {v.mejorSiMayor == null && (
              <p className="text-xs text-muted">Sin juicio de color: la posición casi no pesa en el resultado.</p>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
