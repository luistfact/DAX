import { useEffect, useState } from 'react'
import { AnilloZona } from './AnilloZona'
import type { useAnalisis } from '../hooks/useAnalisis'
import type { Partida } from '../types/datos'
import { Reporte } from './Reporte'
import { MapaPartida } from './MapaPartida'
import { Desplegable } from './Desplegable'
import { Map as MapIcono } from 'lucide-react'
import { EstadoVacio } from './EstadoVacio'

const INTERVALO_MENSAJE_MS = 3_500

const MENSAJE_INICIAL = 'Despertando el servicio, la primera consulta tarda más.'

// Fijos a propósito: el prompt pide datos del propio proyecto, no generados
// por un modelo de lenguaje.
const MENSAJES_ROTATIVOS = [
  'Cerca del 90 % de las eliminaciones vienen del combate, no de la zona.',
  'Una partida típica tiene 26 escuadrones.',
  'La salud del escuadrón es lo que más pesa en el análisis.',
  'Perder un integrante antes del minuto 5 reduce mucho la probabilidad.',
]

// Espera de red de hasta 90 s: el anillo de zona (la única animación de la
// app) indica que sigue trabajando, y los mensajes rotan con datos del
// proyecto. Sin barra de progreso: no hay avance real que medir.
function EsperaAnalisis({ inicio }: { inicio: number }) {
  const [ahora, setAhora] = useState(() => Date.now())
  const [indiceMensaje, setIndiceMensaje] = useState(0)

  useEffect(() => {
    const tick = setInterval(() => setAhora(Date.now()), 500)
    return () => clearInterval(tick)
  }, [])

  useEffect(() => {
    const rotacion = setInterval(
      () => setIndiceMensaje((i) => (i + 1) % MENSAJES_ROTATIVOS.length),
      INTERVALO_MENSAJE_MS,
    )
    return () => clearInterval(rotacion)
  }, [])

  const transcurrido = ahora - inicio
  const mensaje =
    transcurrido < INTERVALO_MENSAJE_MS ? MENSAJE_INICIAL : MENSAJES_ROTATIVOS[indiceMensaje]

  return (
    <div className="flex items-center gap-4 tarjeta p-4" role="status">
      <AnilloZona tamano={56} modo="bucle" className="text-zone" />
      <div>
        <p className="text-sm font-medium text-text">Analizando tu partida más reciente…</p>
        <p className="mt-1 text-sm text-muted">{mensaje}</p>
      </div>
    </div>
  )
}

const formatoFecha = new Intl.DateTimeFormat('es-MX', { dateStyle: 'long', timeStyle: 'short' })

/** «29 de septiembre de 2026, 21:40 · Erangel, escuadra»; sin fecha si el servicio no la mandó. */
function subtituloEnVivo(partida: Partida): string {
  const lugar = 'Erangel, escuadra'
  if (!partida.fecha) return lugar
  const fecha = new Date(partida.fecha)
  return Number.isNaN(fecha.getTime()) ? lugar : `${formatoFecha.format(fecha)} · ${lugar}`
}

/**
 * Reporte de la partida en vivo, con el mapa entre la curva y el informe. El
 * minuto elegido vive aquí para que la curva y el mapa se muevan juntos; se
 * monta con `key` por partida, así un análisis nuevo arranca en su propio
 * último minuto.
 */
function VistaEnVivo({ partida }: { partida: Partida }) {
  const ultimo = partida.mapa?.trayectoria.at(-1)?.minuto ?? partida.minutos.at(-1)?.minuto ?? 0
  const [minuto, setMinuto] = useState(ultimo)

  return (
    <Reporte
      partida={partida}
      titulo="Tu partida más reciente"
      subtitulo={subtituloEnVivo(partida)}
      minutoMarcado={partida.mapa ? minuto : undefined}
      onMinutoActivo={partida.mapa ? setMinuto : undefined}
    >
      {partida.mapa && (
        <Desplegable
          Icono={MapIcono}
          titulo="Tu recorrido en el mapa"
          resumen={`Con Play, minuto a minuto · ${partida.mapa.eventos.length} ${partida.mapa.eventos.length === 1 ? 'baja' : 'bajas'}`}
        >
          <MapaPartida mapa={partida.mapa} minuto={minuto} onMinuto={setMinuto} />
        </Desplegable>
      )}
    </Reporte>
  )
}

type Props = {
  estado: ReturnType<typeof useAnalisis>['estado']
  /** Cierra el análisis en vivo y vuelve al escuadrón del catálogo. */
  onCerrar: () => void
}

/**
 * Análisis en vivo, lanzado desde el buscador del encabezado: se muestra en
 * la columna del reporte de la pestaña Partidas, con los mismos componentes
 * que un escuadrón del catálogo. El estado vive en App.tsx para que el
 * asistente conozca la partida activa.
 */
export function AnalisisEnVivo({ estado, onCerrar }: Props) {
  if (estado.fase === 'inactivo') return null

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3 tarjeta px-4 py-2">
        <p className="titulo-seccion text-sm text-muted">Análisis en vivo</p>
        <button
          type="button"
          onClick={onCerrar}
          className="text-sm text-zone underline underline-offset-2 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zone"
        >
          {estado.fase === 'cargando' ? 'Cancelar' : 'Volver al catálogo'}
        </button>
      </div>
      {estado.fase === 'cargando' && <EsperaAnalisis inicio={estado.inicio} />}
      {estado.fase === 'error' && <EstadoVacio mensaje={estado.mensaje} />}
      {estado.fase === 'listo' && <VistaEnVivo key={estado.partida.id} partida={estado.partida} />}
    </div>
  )
}
