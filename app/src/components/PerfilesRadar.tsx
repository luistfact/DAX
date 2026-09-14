import type { Perfiles } from '../types/datos'
import { EstadoVacio } from './EstadoVacio'

type Props = {
  perfiles: Perfiles | null
}

/** Radar comparando el centro de cada grupo de estilo de juego contra el promedio general. */
export function PerfilesRadar({ perfiles }: Props) {
  if (!perfiles) {
    return (
      <EstadoVacio mensaje="Aún no hay perfiles cargados. Genera public/datos/perfiles.json desde el notebook." />
    )
  }

  // TODO: implementar el radar con Recharts una vez definido el tipo Perfiles.
  return <EstadoVacio mensaje="Perfiles pendiente de implementar." />
}
