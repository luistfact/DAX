import type { Partida } from '../types/datos'
import { LABEL_EQUIPOS_EN_PARTIDA, formatResultado } from '../texto'
import { ESTILO_FORMA, type Forma } from '../forma'
import { Sparkline } from './Sparkline'
import { COLOR_ZONA, COLOR_PELIGRO } from '../colores'

type Props = {
  partida: Partida
  forma: Forma
  activa: boolean
  onSeleccionar: () => void
  mostrarSparkline?: boolean
}

/** Tarjeta de partida reutilizada por los casos destacados y por la lista completa. */
export function TarjetaPartida({ partida, forma, activa, onSeleccionar, mostrarSparkline }: Props) {
  return (
    <button
      type="button"
      onClick={onSeleccionar}
      className={
        'flex w-full flex-col gap-2 rounded-lg border p-3 text-left focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zona ' +
        (activa ? 'border-zona bg-white/10' : 'border-tinta-secundaria/15 bg-superficie hover:bg-white/5')
      }
    >
      <div className="flex items-center justify-between gap-2">
        <span className="font-mono text-xs text-tinta-secundaria">{partida.id}</span>
        <span className={'rounded-full border px-2 py-0.5 text-xs font-medium ' + ESTILO_FORMA[forma]}>
          {forma}
        </span>
      </div>
      <span
        className={
          'inline-flex w-fit rounded-full px-2 py-0.5 text-xs font-medium ' +
          (partida.clasifico ? 'bg-zona/15 text-zona' : 'bg-peligro/15 text-peligro')
        }
      >
        {formatResultado(partida.posicion_final, partida.escuadrones, partida.clasifico)}
      </span>
      {mostrarSparkline && (
        <Sparkline minutos={partida.minutos} color={partida.clasifico ? COLOR_ZONA : COLOR_PELIGRO} />
      )}
      <span className="text-xs text-tinta-secundaria">
        {LABEL_EQUIPOS_EN_PARTIDA}: {partida.escuadrones}
      </span>
    </button>
  )
}
