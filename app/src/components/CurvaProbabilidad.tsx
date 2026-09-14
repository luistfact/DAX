import type { Partida } from '../types/datos'
import { EstadoVacio } from './EstadoVacio'

type Props = {
  partida: Partida | null
}

/** Curva de probabilidad minuto a minuto, con marcadores en caídas mayores a 10 puntos. */
export function CurvaProbabilidad({ partida }: Props) {
  if (!partida) {
    return <EstadoVacio mensaje="Selecciona una partida para ver su curva de probabilidad." />
  }

  // TODO: implementar la gráfica con Recharts una vez definido el tipo Partida.
  return <EstadoVacio mensaje="Curva de probabilidad pendiente de implementar." />
}
