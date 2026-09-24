import type { Escenario } from '../types/datos'

type Props = {
  /** `undefined` en la partida en vivo: los escenarios salen de la red recurrente, que el servicio no usa. */
  escenarios: Escenario[] | undefined
}

// Por debajo de un punto la diferencia es ruido del modelo, no una señal:
// mostrar la cifra sugeriría una precisión que no tiene.
const UMBRAL_APENAS = 0.01

// Frase de logro cuando el escuadrón ya estaba en ese valor. `aplica` se
// decide sobre el peor momento de la partida, así que el logro vale para toda
// ella. "Casi entera" y no "sin daño": el peor momento de salud de esos
// escuadrones va de 91 a 100, no siempre 100.
const LOGROS: Record<string, string> = {
  'Llegar con el escuadrón completo': 'Ya llegaste completo, bien ahí.',
  'Llegar sin daño acumulado': 'Ya llegaste con la salud casi entera, bien ahí.',
}

const pct = (p: number) => `${Math.round(p * 100)} %`

/** Barra 0-100 % con la probabilidad base (marca gris) y el tramo hasta la alterna. */
function BarraCambio({ base, alterna }: { base: number; alterna: number }) {
  const desde = Math.min(base, alterna)
  const ancho = Math.abs(alterna - base)
  const sube = alterna > base
  return (
    <div className="relative h-2 w-full rounded-full bg-white/10" aria-hidden="true">
      <div
        className={`absolute inset-y-0 rounded-full ${sube ? 'bg-zona' : 'bg-tinta-secundaria/60'}`}
        style={{ left: `${desde * 100}%`, width: `${ancho * 100}%` }}
      />
      <div className="absolute -inset-y-1 w-0.5 bg-tinta" style={{ left: `${base * 100}%` }} />
    </div>
  )
}

function TarjetaEscenario({ esc, destacada }: { esc: Escenario; destacada: boolean }) {
  const borde = destacada ? 'border-zona' : 'border-tinta-secundaria/15'

  if (!esc.aplica || esc.diferencia == null || esc.probabilidad_alterna == null) {
    return (
      <li className={`rounded-md border ${borde} bg-white/5 p-3`}>
        <p className="text-sm font-medium text-tinta">{esc.escenario}</p>
        <p className="mt-1 text-sm text-zona">{LOGROS[esc.escenario] ?? 'Ya estabas en ese valor, bien ahí.'}</p>
      </li>
    )
  }

  const d = esc.diferencia
  let lectura: string
  let cifra: string | null = null
  if (Math.abs(d) < UMBRAL_APENAS) {
    lectura = 'Apenas cambia.'
  } else if (d < 0) {
    // No se oculta: el modelo no es lineal y a veces el cambio "bueno" baja la probabilidad.
    // "No habría mejorado" y no "no habría cambiado": una caída de un punto o
    // más es un cambio, y decir lo contrario contradiría la cifra de al lado.
    lectura = `Según el modelo, esto no habría mejorado tu resultado: la probabilidad baja de ${pct(esc.probabilidad_base)} a ${pct(esc.probabilidad_alterna)}.`
  } else {
    lectura = `Tu probabilidad media pasaría de ${pct(esc.probabilidad_base)} a ${pct(esc.probabilidad_alterna)}.`
    cifra = `+${Math.round(d * 100)} pts`
  }

  return (
    <li className={`rounded-md border ${borde} bg-white/5 p-3`}>
      <div className="flex items-baseline justify-between gap-2">
        <p className="text-sm font-medium text-tinta">{esc.escenario}</p>
        {cifra && <span className="whitespace-nowrap font-cifra text-2xl font-semibold text-zona">{cifra}</span>}
      </div>
      {destacada && (
        <p className="text-xs font-semibold uppercase tracking-wide text-zona">Lo primero en lo que enfocarte</p>
      )}
      <div className="mt-2">
        <BarraCambio base={esc.probabilidad_base} alterna={esc.probabilidad_alterna} />
      </div>
      <p className="mt-2 text-sm text-tinta-secundaria">{lectura}</p>
    </li>
  )
}

/** Escenarios alternativos del modelo, con el aviso de asociación vs. causalidad siempre visible. */
export function Escenarios({ escenarios }: Props) {
  if (escenarios === undefined) {
    return (
      <p className="text-sm text-tinta-secundaria">
        Los escenarios alternativos solo existen para las partidas del corpus: se calculan con un modelo distinto al del
        análisis en vivo, y mezclarlos los haría incomparables.
      </p>
    )
  }
  if (escenarios.length === 0) {
    return <p className="text-sm text-tinta-secundaria">Sin escenarios registrados para esta partida.</p>
  }

  // Los que aplican, de mayor a menor ganancia; los logros al final.
  const ordenados = [...escenarios].sort((a, b) => (b.diferencia ?? -Infinity) - (a.diferencia ?? -Infinity))
  const primero = ordenados[0]
  const hayDestacada = primero.aplica && primero.diferencia != null && primero.diferencia >= UMBRAL_APENAS

  return (
    <div className="space-y-3">
      <ul className="grid gap-2 sm:grid-cols-2">
        {ordenados.map((esc, i) => (
          <TarjetaEscenario key={esc.escenario} esc={esc} destacada={hayDestacada && i === 0} />
        ))}
      </ul>
      <p className="rounded-md border border-tinta-secundaria/30 p-3 text-sm text-tinta">
        Esto compara escenarios dentro del modelo, no lo que habría pasado en realidad. El modelo encuentra relaciones,
        no causas: los equipos que llegan completos suelen ir mejor, pero no sabemos si es por llegar completos o porque
        son mejores jugadores en general.
      </p>
    </div>
  )
}
