import { useMemo, useState } from 'react'
import { EstadoVacio } from './EstadoVacio'
import { FilaEscuadron } from './FilaEscuadron'
import { FILTROS, filtrarCatalogo, type EntradaCatalogo, type Filtro } from '../catalogo'
import { miles } from '../formato'

type Props = {
  catalogo: EntradaCatalogo[]
  partidaSeleccionada: string | null
  onSeleccionar: (id: string) => void
}

// La categoría sale de la forma de la curva, no del desenlace: en el catálogo
// hay curvas «Dominante» y «Remontada» que terminaron fuera del top.
const ACLARACION_FORMA =
  'La categoría describe la forma de la curva de tus posibilidades, no el resultado: una partida «Dominante» puede terminar fuera del top.'

/** Lista del catálogo: pastillas de filtro por forma y filas densas, con scroll propio. */
export function SelectorPartida({ catalogo, partidaSeleccionada, onSeleccionar }: Props) {
  const [filtro, setFiltro] = useState<Filtro>('Todas')
  const visibles = useMemo(() => filtrarCatalogo(catalogo, filtro), [catalogo, filtro])
  const numPartidas = useMemo(() => new Set(catalogo.map((e) => e.partida.match_id)).size, [catalogo])

  if (catalogo.length === 0) {
    return (
      <EstadoVacio mensaje="Aún no hay partidas cargadas. Genera public/datos/partidas.json desde el notebook." />
    )
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3">
      <div className="space-y-2">
        <div className="flex flex-wrap gap-1.5" role="group" aria-label="Filtrar por forma de la curva">
          {FILTROS.map((f) => (
            <button
              key={f.id}
              type="button"
              onClick={() => setFiltro(f.id)}
              aria-pressed={filtro === f.id}
              className={
                'rounded-full border px-3 py-1 text-sm font-medium focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zone ' +
                (filtro === f.id
                  ? 'border-text bg-text text-bg'
                  : 'border-line bg-card text-muted hover:text-text')
              }
            >
              {f.etiqueta}
            </button>
          ))}
        </div>
        <p className="text-xs text-muted">{ACLARACION_FORMA}</p>
        <p className="text-xs text-muted">
          {filtro === 'Todas'
            ? `${miles(catalogo.length)} escuadrones de ${miles(numPartidas)} partidas apartadas para comprobar el análisis.`
            : `${miles(visibles.length)} escuadrones, del caso más claro al menos claro.`}
        </p>
      </div>

      {visibles.length === 0 ? (
        <EstadoVacio mensaje="Ningún escuadrón tiene esa forma de curva." />
      ) : (
        <ul className="relative max-h-[60vh] space-y-1.5 overflow-y-auto pr-1 lg:max-h-none lg:min-h-0 lg:flex-1">
          {visibles.map((e) => (
            <li key={e.partida.id}>
              <FilaEscuadron
                entrada={e}
                activa={e.partida.id === partidaSeleccionada}
                onSeleccionar={() => onSeleccionar(e.partida.id)}
              />
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
