import { motion } from 'motion/react'
import type { Partida } from '../types/datos'
import { EstadoVacio } from './EstadoVacio'

type Props = {
  partida: Partida | null
}

const ESTILO_CONFIANZA: Record<string, string> = {
  Alta: 'bg-emerald-100 text-emerald-700',
  Media: 'bg-amber-100 text-amber-700',
  Baja: 'bg-rose-100 text-rose-700',
}

function Lista({ items, vacio }: { items: string[]; vacio: string }) {
  if (items.length === 0) {
    return <p className="text-sm text-slate-400">{vacio}</p>
  }
  return (
    <ul className="list-disc space-y-1 pl-5 text-sm text-slate-700">
      {items.map((item, i) => (
        <li key={i}>{item}</li>
      ))}
    </ul>
  )
}

/** Informe de la partida: veredicto, resumen, momento crítico, factores y recomendaciones. */
export function Informe({ partida }: Props) {
  if (!partida) {
    return <EstadoVacio mensaje="Selecciona una partida para ver su informe." />
  }

  const { informe } = partida
  const estiloConfianza = ESTILO_CONFIANZA[informe.confianza] ?? 'bg-slate-100 text-slate-600'

  return (
    <motion.div
      key={partida.id}
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="space-y-4 rounded-lg border border-slate-200 bg-white p-4"
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-lg font-semibold text-slate-900">{informe.veredicto}</h3>
        <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${estiloConfianza}`}>
          Confianza {informe.confianza}
        </span>
      </div>

      <p className="text-sm text-slate-700">{informe.resumen}</p>

      <div className="rounded-md bg-slate-50 p-3 text-sm text-slate-700">
        <span className="font-medium text-slate-900">Momento crítico. </span>
        {informe.momento_critico}
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <h4 className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-500">
            Factores a favor
          </h4>
          <Lista items={informe.factores_favorables} vacio="Sin factores a favor registrados." />
        </div>
        <div>
          <h4 className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-500">
            Factores en contra
          </h4>
          <Lista items={informe.factores_adversos} vacio="Sin factores en contra registrados." />
        </div>
      </div>

      <div>
        <h4 className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-500">
          Recomendaciones
        </h4>
        <Lista items={informe.recomendaciones} vacio="Sin recomendaciones registradas." />
      </div>
    </motion.div>
  )
}
