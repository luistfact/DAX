import { useMemo, useState } from 'react'
import type { Partida } from '../types/datos'
import { EstadoVacio } from './EstadoVacio'
import { AyudaTop25 } from './AyudaTop25'
import { TarjetaPartida } from './TarjetaPartida'
import { FORMAS, ESTILO_FORMA, clasificarForma, type Forma } from '../forma'
import { elegirDestacados } from '../destacados'

type Props = {
  partidas: Partida[]
  partidaSeleccionada: string | null
  onSeleccionar: (id: string) => void
}

function ChipForma({
  forma,
  activo,
  onClick,
}: {
  forma: Forma
  activo: boolean
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={activo}
      className={
        'rounded-full border px-3 py-1 text-xs font-medium focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zona ' +
        (activo ? ESTILO_FORMA[forma] : 'border-tinta-secundaria/20 bg-white/5 text-tinta-secundaria hover:bg-white/10')
      }
    >
      {forma}
    </button>
  )
}

/** Lista de partidas: casos destacados por forma, con la lista completa detrás de un botón. */
export function SelectorPartida({ partidas, partidaSeleccionada, onSeleccionar }: Props) {
  const [mostrarTodas, setMostrarTodas] = useState(false)
  const [formasActivas, setFormasActivas] = useState<Set<Forma>>(new Set())

  const formaPorPartida = useMemo(() => {
    const mapa = new Map<string, Forma>()
    for (const p of partidas) mapa.set(p.id, clasificarForma(p.minutos))
    return mapa
  }, [partidas])

  const destacados = useMemo(() => elegirDestacados(partidas), [partidas])

  const partidasFiltradas = useMemo(() => {
    if (formasActivas.size === 0) return partidas
    return partidas.filter((p) => formasActivas.has(formaPorPartida.get(p.id) ?? 'Sin datos suficientes'))
  }, [partidas, formasActivas, formaPorPartida])

  const alternarForma = (forma: Forma) => {
    setFormasActivas((actual) => {
      const nuevo = new Set(actual)
      if (nuevo.has(forma)) nuevo.delete(forma)
      else nuevo.add(forma)
      return nuevo
    })
  }

  if (partidas.length === 0) {
    return (
      <EstadoVacio mensaje="Aún no hay partidas cargadas. Genera public/datos/partidas.json desde el notebook." />
    )
  }

  return (
    <div className="space-y-4">
      <p className="flex items-center text-xs text-tinta-secundaria">
        Resultado: top 25 %
        <AyudaTop25 />
      </p>

      {!mostrarTodas ? (
        <div className="space-y-5">
          {destacados.map((grupo) => (
            <div key={grupo.forma} className="space-y-2">
              <h3 className="text-sm font-semibold text-tinta">{grupo.titulo}</h3>
              {grupo.partidas.length === 0 ? (
                <p className="text-xs text-tinta-secundaria">Aún no hay casos de esta forma en el corpus cargado.</p>
              ) : (
                <div className="space-y-2">
                  {grupo.partidas.map((p) => (
                    <TarjetaPartida
                      key={p.id}
                      partida={p}
                      forma={grupo.forma}
                      activa={p.id === partidaSeleccionada}
                      onSeleccionar={() => onSeleccionar(p.id)}
                      mostrarSparkline
                    />
                  ))}
                </div>
              )}
            </div>
          ))}
          <button
            type="button"
            onClick={() => setMostrarTodas(true)}
            className="w-full rounded-md border border-tinta-secundaria/20 py-2 text-sm font-medium text-tinta-secundaria hover:bg-white/5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zona"
          >
            Ver las {partidas.length} partidas
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          <div className="flex items-center justify-between gap-2">
            <h3 className="text-sm font-semibold text-tinta">Todas las partidas</h3>
            <button
              type="button"
              onClick={() => setMostrarTodas(false)}
              className="text-xs font-medium text-zona underline underline-offset-2"
            >
              Ver casos destacados
            </button>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-medium uppercase tracking-wide text-tinta-secundaria">
              Forma de la curva
            </span>
            {FORMAS.map((forma) => (
              <ChipForma
                key={forma}
                forma={forma}
                activo={formasActivas.has(forma)}
                onClick={() => alternarForma(forma)}
              />
            ))}
          </div>

          {partidasFiltradas.length === 0 ? (
            <EstadoVacio mensaje="Ninguna partida coincide con las formas seleccionadas." />
          ) : (
            <div className="max-h-[70vh] space-y-2 overflow-y-auto pr-1">
              {partidasFiltradas.map((p) => (
                <TarjetaPartida
                  key={p.id}
                  partida={p}
                  forma={formaPorPartida.get(p.id) ?? 'Sin datos suficientes'}
                  activa={p.id === partidaSeleccionada}
                  onSeleccionar={() => onSeleccionar(p.id)}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
