import type { Partida } from '../types/datos'
import { EstadoVacio } from './EstadoVacio'

type Props = {
  partidas: Partida[]
  partidaSeleccionada: string | null
  onSeleccionar: (id: string) => void
}

/** Lista de partidas disponibles con su posición final y si clasificó al cuarto superior. */
export function SelectorPartida({ partidas, partidaSeleccionada, onSeleccionar }: Props) {
  if (partidas.length === 0) {
    return (
      <EstadoVacio mensaje="Aún no hay partidas cargadas. Genera public/datos/partidas.json desde el notebook." />
    )
  }

  return (
    <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
      <table className="w-full text-left text-sm">
        <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase text-slate-500">
          <tr>
            <th className="px-4 py-2">Partida</th>
            <th className="px-4 py-2">Posición final</th>
            <th className="px-4 py-2">Escuadrones</th>
            <th className="px-4 py-2">Clasificó</th>
          </tr>
        </thead>
        <tbody>
          {partidas.map((p) => {
            const activa = p.id === partidaSeleccionada
            return (
              <tr
                key={p.id}
                onClick={() => onSeleccionar(p.id)}
                className={
                  'cursor-pointer border-b border-slate-100 last:border-0 hover:bg-slate-50 ' +
                  (activa ? 'bg-slate-100' : '')
                }
              >
                <td className="px-4 py-2 font-mono text-xs text-slate-700">{p.id}</td>
                <td className="px-4 py-2 text-slate-700">{p.posicion_final} / {p.escuadrones}</td>
                <td className="px-4 py-2 text-slate-700">{p.escuadrones}</td>
                <td className="px-4 py-2">
                  {p.clasifico ? (
                    <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-700">
                      Sí
                    </span>
                  ) : (
                    <span className="rounded-full bg-rose-100 px-2 py-0.5 text-xs font-medium text-rose-700">
                      No
                    </span>
                  )}
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
