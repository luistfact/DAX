import { useMemo, useState } from 'react'
import { EstadoVacio } from './EstadoVacio'
import { FilaEscuadron } from './FilaEscuadron'
import { FILTROS, filtrarCatalogo, type EntradaCatalogo, type Filtro } from '../catalogo'
import { miles } from '../formato'
import { Ayuda } from './Ayuda'

type Props = {
  catalogo: EntradaCatalogo[]
  partidaSeleccionada: string | null
  onSeleccionar: (id: string) => void
}

// Color de cada filtro: el mismo de la barra de su categoría en las filas.
const COLOR_FILTRO: Record<Filtro, { punto: string; activo: string }> = {
  Todas: { punto: 'bg-muted', activo: 'border-text bg-text text-bg' },
  Desplome: { punto: 'bg-danger', activo: 'border-danger bg-danger/15 text-text' },
  Remontada: { punto: 'bg-zone', activo: 'border-zone bg-zone/15 text-text' },
  Dominante: { punto: 'bg-text', activo: 'border-text bg-text/15 text-text' },
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

  // Solo las categorías con pastilla (Desplome, Remontada, Dominante) filtran desde su barra.
  const filtroDeFila = (e: EntradaCatalogo) => {
    const f = FILTROS.find((x) => x.id !== 'Todas' && x.id === e.forma)
    return f ? { onFiltrar: () => setFiltro(f.id), etiquetaFiltro: f.etiqueta } : {}
  }

  if (catalogo.length === 0) {
    return (
      <EstadoVacio mensaje="Aún no hay partidas cargadas. Genera public/datos/partidas.json desde el notebook." />
    )
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3">
      <div className="space-y-2">
        <div className="flex flex-wrap items-center gap-1" role="group" aria-label="Filtrar por forma de la curva">
          {FILTROS.map((f) => (
            <button
              key={f.id}
              type="button"
              onClick={() => setFiltro(f.id)}
              aria-pressed={filtro === f.id}
              className={
                'flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-medium focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zone ' +
                (filtro === f.id ? COLOR_FILTRO[f.id].activo : 'border-line bg-card text-muted hover:text-text')
              }
            >
              {f.id !== 'Todas' && <span className={`h-1.5 w-1.5 rounded-full ${COLOR_FILTRO[f.id].punto}`} aria-hidden="true" />}
              {f.etiqueta}
            </button>
          ))}
          <Ayuda texto={ACLARACION_FORMA} etiqueta="¿La categoría es el resultado?" />
        </div>
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
                {...filtroDeFila(e)}
              />
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
