import type { Partida } from '../types/datos'
import { EstadoVacio } from './EstadoVacio'

type Props = {
  partida: Partida | null
}

/** Informe de la partida: veredicto, resumen, momento crítico, factores y recomendaciones. */
export function Informe({ partida }: Props) {
  if (!partida) {
    return <EstadoVacio mensaje="Selecciona una partida para ver su informe." />
  }

  // TODO: renderizar el campo `informe` una vez definido el tipo Partida.
  return <EstadoVacio mensaje="Informe pendiente de implementar." />
}
