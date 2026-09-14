import type { Partida } from '../types/datos'
import { EstadoVacio } from './EstadoVacio'

type Props = {
  partidas: Partida[]
  partidaSeleccionada: string | null
  onSeleccionar: (id: string) => void
}

/** Lista de partidas disponibles con su posición final y si clasificó al cuarto superior. */
export function SelectorPartida({ partidas }: Props) {
  if (partidas.length === 0) {
    return (
      <EstadoVacio mensaje="Aún no hay partidas cargadas. Genera public/datos/partidas.json desde el notebook." />
    )
  }

  // TODO: renderizar la lista real una vez definido el tipo Partida.
  return <EstadoVacio mensaje="Selector de partida pendiente de implementar." />
}
