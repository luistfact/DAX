import type { Metricas } from '../types/datos'
import { EstadoVacio } from './EstadoVacio'

type Props = {
  metricas: Metricas | null
}

/** Tabla comparativa de modelos y curva de desempeño por fase. */
export function TablaModelos({ metricas }: Props) {
  if (!metricas) {
    return <EstadoVacio mensaje="Aún no hay métricas cargadas. Genera public/datos/metricas.json desde el notebook." />
  }

  // TODO: renderizar la tabla una vez definido el tipo Metricas.
  return <EstadoVacio mensaje="Tabla de modelos pendiente de implementar." />
}
