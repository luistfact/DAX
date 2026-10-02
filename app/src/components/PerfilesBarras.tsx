import type { Perfiles } from '../types/datos'
import { EstadoVacio } from './EstadoVacio'
import { percentilDeRango } from '../analisisPartida'
import { estiloPerfil } from '../estiloPerfil'
import { miles, pct100 } from '../formato'

type Props = {
  perfiles: Perfiles | null
}

type Grupo = Perfiles['grupos'][number]

// Etiquetas de presentación para las llaves técnicas de perfiles.json; si
// aparece una característica nueva no traducida, se muestra tal cual.
const ETIQUETAS: Record<string, string> = {
  hp_apertura: 'Salud inicial',
  dist_apertura: 'Distancia inicial a la zona',
  movilidad: 'Movilidad',
  var_dist: 'Variabilidad de distancia',
  var_mov: 'Variabilidad de movimiento',
}

// Unidad y decimales de cada característica. Las distancias se miden en radios
// de la zona (distancia al centro / radio): sin unidad, un «0.404» no dice nada.
const FORMATO: Record<string, { decimales: number; unidad: string }> = {
  hp_apertura: { decimales: 1, unidad: ' pts' },
  dist_apertura: { decimales: 2, unidad: ' radios' },
  var_dist: { decimales: 3, unidad: ' radios' },
  movilidad: { decimales: 3, unidad: '' },
  var_mov: { decimales: 3, unidad: '' },
}

function formatear(caracteristica: string, valor: number): string {
  const { decimales, unidad } = FORMATO[caracteristica] ?? { decimales: 3, unidad: '' }
  return `${valor.toFixed(decimales)}${unidad}`
}

/**
 * Distancia al promedio de cada característica, escalada al grupo que más se
 * aleja en esa misma característica: así se comparan escalas muy distintas
 * (salud 0-100 contra variabilidades de 0 a 1). La cifra al lado es el valor
 * real, sin escalar.
 */
function escalas(perfiles: Perfiles): Record<string, number> {
  return Object.fromEntries(
    perfiles.caracteristicas.map((c) => [
      c,
      Math.max(...perfiles.grupos.map((g) => Math.abs(g.centro[c] - perfiles.promedio_general[c]))) || 1,
    ]),
  )
}

function TarjetaGrupo({ perfiles, grupo, escala }: { perfiles: Perfiles; grupo: Grupo; escala: Record<string, number> }) {
  const { Icono, fondo } = estiloPerfil(grupo.nombre)

  return (
    <li className="space-y-3 rounded-lg border border-line bg-card p-4">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h3 className="flex items-center gap-2 titulo-seccion text-lg text-text">
          <span className={`flex h-7 w-7 items-center justify-center rounded-full ${fondo}`}>
            <Icono className="h-4 w-4 text-bg" aria-hidden="true" />
          </span>
          {grupo.nombre}
        </h3>
        <p className="text-sm text-muted">
          percentil mediano{' '}
          <span className="font-cifra text-2xl font-semibold text-text">
            {pct100(percentilDeRango(grupo.mediana_pct_rank))}
          </span>{' '}
          · {miles(grupo.n)} escuadrones
        </p>
      </div>
      <p className="text-sm text-muted">{grupo.descripcion}</p>

      <div className="grid grid-cols-[minmax(0,11rem)_1fr] gap-x-3 text-xs text-muted">
        <span />
        <span className="flex justify-between">
          <span>menos</span>
          <span>promedio</span>
          <span>más</span>
        </span>
      </div>
      <ul className="space-y-2">
        {perfiles.caracteristicas.map((c) => {
          const valor = grupo.centro[c]
          const promedio = perfiles.promedio_general[c]
          const relativo = (valor - promedio) / escala[c]
          const ancho = `${Math.min(1, Math.abs(relativo)) * 50}%`
          return (
            <li key={c} className="grid grid-cols-[minmax(0,11rem)_1fr] items-center gap-x-3 text-sm">
              <span className="truncate text-text">{ETIQUETAS[c] ?? c}</span>
              <div>
                <div className="relative h-3 rounded-sm bg-text/5">
                  <span className="absolute inset-y-0 left-1/2 w-px bg-muted" aria-hidden="true" />
                  <span
                    className={`absolute inset-y-0 ${fondo} ${relativo >= 0 ? 'left-1/2 rounded-r-sm' : 'right-1/2 rounded-l-sm'}`}
                    style={{ width: ancho }}
                  />
                </div>
                <p className="mt-0.5 text-xs text-muted">
                  <span className="font-cifra text-sm text-text">{formatear(c, valor)}</span> · promedio{' '}
                  {formatear(c, promedio)}
                </p>
              </div>
            </li>
          )
        })}
      </ul>
    </li>
  )
}

/** Perfiles de estilo de juego: cuánto se aleja cada grupo del promedio general en cada característica. */
export function PerfilesBarras({ perfiles }: Props) {
  if (!perfiles) {
    return (
      <EstadoVacio mensaje="Aún no hay perfiles cargados. Genera public/datos/perfiles.json desde el notebook." />
    )
  }

  const escala = escalas(perfiles)
  const ordenados = [...perfiles.grupos].sort(
    (a, b) => percentilDeRango(b.mediana_pct_rank) - percentilDeRango(a.mediana_pct_rank),
  )

  return (
    <div className="space-y-4">
      <p className="max-w-3xl text-sm text-muted">
        Cuatro formas de jugar los primeros 5 minutos. Cada barra muestra cuánto se aleja el grupo del promedio general
        en esa característica, a escala con el grupo que más se aleja; la cifra debajo es el valor real.
      </p>
      <ul className="grid gap-4 lg:grid-cols-2">
        {ordenados.map((grupo) => (
          <TarjetaGrupo key={grupo.grupo} perfiles={perfiles} grupo={grupo} escala={escala} />
        ))}
      </ul>
    </div>
  )
}
