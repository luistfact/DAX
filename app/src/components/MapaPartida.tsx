import { useEffect, useId, useState } from 'react'
import { motion } from 'motion/react'
import { Pause, Play } from 'lucide-react'
import { usePrefersReducedMotion } from '../hooks/usePrefersReducedMotion'
import type { Mapa, PuntoMapa, ZonaMapa } from '../types/datos'
import { PALETA_OSCURA } from '../colores'

type Props = {
  mapa: Mapa
  minuto: number
  onMinuto: (minuto: number) => void
}

// Fondo: el mapa oficial de Erangel que publica pubg/api-assets para
// desarrolladores de la API (Erangel_Main_No_Text_Low_Res.png, 819 px), uso no
// comercial con crédito visible. Verificado el 2026-09-30 contra una
// trayectoria real (laze-9527): las posiciones normalizadas del parser caen
// sobre las carreteras y edificios correctos, así que la imagen ocupa el
// cuadrado [0, 1] × [0, 1] sin ajustes.
const URL_MAPA = `${import.meta.env.BASE_URL}mapas/erangel.png`

// El satélite es oscuro en ambos temas: lo que se dibuja encima usa siempre la
// paleta oscura, o el trazo del modo claro se perdería sobre el mapa.
const paleta = PALETA_OSCURA

/**
 * Encuadre cuadrado alrededor del recorrido, las bajas y el círculo más
 * pequeño. Encuadrar el mapa completo dejaría el recorrido de un escuadrón
 * como un punto; los círculos grandes quedan como arcos que entran al lienzo.
 */
function encuadre(mapa: Mapa): { x: number; y: number; lado: number } {
  const puntos: { x: number; y: number }[] = [...mapa.trayectoria, ...mapa.eventos]
  const menor = mapa.zonas.reduce<ZonaMapa | null>((a, z) => (a == null || z.r < a.r ? z : a), null)
  if (menor) puntos.push({ x: menor.x - menor.r, y: menor.y - menor.r }, { x: menor.x + menor.r, y: menor.y + menor.r })
  if (puntos.length === 0) return { x: 0, y: 0, lado: 1 }

  const xs = puntos.map((p) => p.x)
  const ys = puntos.map((p) => p.y)
  const [minX, maxX, minY, maxY] = [Math.min(...xs), Math.max(...xs), Math.min(...ys), Math.max(...ys)]
  const lado = Math.max(maxX - minX, maxY - minY, 0.05) * 1.2
  return { x: (minX + maxX) / 2 - lado / 2, y: (minY + maxY) / 2 - lado / 2, lado }
}

/** Los círculos se repiten minuto a minuto mientras la zona no cambia; se dibuja cada uno una vez. */
function circulosDistintos(zonas: ZonaMapa[]): ZonaMapa[] {
  const vistos = new Set<string>()
  return zonas.filter((z) => {
    const clave = `${z.x}|${z.y}|${z.r}`
    if (vistos.has(clave)) return false
    vistos.add(clave)
    return true
  })
}

const alMinuto = <T extends PuntoMapa>(lista: T[], minuto: number): T | undefined =>
  [...lista].reverse().find((p) => p.minuto <= minuto)

/** Recorrido del escuadrón sobre el mapa de Erangel, con la zona y las bajas, navegable por minuto. */
export function MapaPartida({ mapa, minuto, onMinuto }: Props) {
  const idRecorte = useId()
  const { x, y, lado } = encuadre(mapa)
  const u = lado / 100 // unidad de dibujo: 1 % del lienzo

  const minutos = mapa.trayectoria.map((p) => p.minuto)
  const minMinuto = minutos.length ? Math.min(...minutos) : 0
  const maxMinuto = minutos.length ? Math.max(...minutos) : 0
  const reducido = usePrefersReducedMotion()
  const [reproduciendo, setReproduciendo] = useState(false)
  // Con movimiento reducido, el Play avanza por pasos: sin deslizamiento entre minutos.
  const transicion = reducido ? { duration: 0 } : { duration: 0.6, ease: 'easeInOut' as const }

  // Timelapse: un minuto cada 0.7 s hasta el último; ahí se detiene solo.
  useEffect(() => {
    if (!reproduciendo) return
    if (minuto >= maxMinuto) {
      setReproduciendo(false)
      return
    }
    const siguiente = setTimeout(() => onMinuto(minuto + 1), 700)
    return () => clearTimeout(siguiente)
  }, [reproduciendo, minuto, maxMinuto, onMinuto])

  const alternarReproduccion = () => {
    // Desde el final, Play vuelve a empezar.
    if (!reproduciendo && minuto >= maxMinuto) onMinuto(minMinuto)
    setReproduciendo((v) => !v)
  }

  // Los círculos se ordenan del más grande al más pequeño y ganan opacidad al cerrarse.
  const circulos = circulosDistintos(mapa.zonas).sort((a, b) => b.r - a.r)
  const zonaActual = alMinuto(mapa.zonas, minuto)
  const posicionActual = alMinuto(mapa.trayectoria, minuto)
  const recorrido = mapa.trayectoria.map((p) => `${p.x},${p.y}`).join(' ')
  const recorridoHastaAhora = mapa.trayectoria.filter((p) => p.minuto <= minuto).map((p) => `${p.x},${p.y}`).join(' ')

  if (mapa.trayectoria.length === 0) {
    return <p className="text-sm text-muted">Sin posiciones registradas para dibujar el recorrido.</p>
  }

  return (
    <div className="tarjeta p-4">
      <p className="mb-3 text-sm text-text">
        Tu recorrido durante la partida. Los círculos azules son la zona segura cerrándose; los puntos rojos, donde cayó
        alguien de tu escuadrón.
      </p>
      <div className="mx-auto max-w-md">
        <div className="relative">
        <svg
          viewBox={`${x} ${y} ${lado} ${lado}`}
          className="aspect-square w-full rounded-md"
          role="img"
          aria-label={`Recorrido del escuadrón en el minuto ${minuto}: ${mapa.eventos.filter((e) => e.minuto <= minuto).length} bajas hasta ese momento.`}
        >
          <defs>
            <clipPath id={idRecorte}>
              <rect x={x} y={y} width={lado} height={lado} />
            </clipPath>
          </defs>
          <rect x={x} y={y} width={lado} height={lado} fill={paleta.bg} />
          <image href={URL_MAPA} x={0} y={0} width={1} height={1} preserveAspectRatio="none" clipPath={`url(#${idRecorte})`} />

          <g clipPath={`url(#${idRecorte})`}>
            {circulos.map((z, i) => {
              const esActual = zonaActual != null && z.x === zonaActual.x && z.y === zonaActual.y && z.r === zonaActual.r
              return (
                <circle
                  key={`${z.x}|${z.y}|${z.r}`}
                  cx={z.x}
                  cy={z.y}
                  r={z.r}
                  fill="none"
                  stroke={paleta.zone}
                  strokeOpacity={esActual ? 0 : 0.2 + (0.5 * (i + 1)) / circulos.length}
                  strokeWidth={0.4 * u}
                />
              )
            })}
            {/* La zona del minuto elegido, aparte: se cierra deslizándose al avanzar. */}
            {zonaActual && (
              <motion.circle
                initial={false}
                animate={{ cx: zonaActual.x, cy: zonaActual.y, r: zonaActual.r }}
                transition={transicion}
                fill={paleta.zone}
                fillOpacity={0.1}
                stroke={paleta.zone}
                strokeWidth={0.8 * u}
              />
            )}

            {/* Recorrido completo tenue y, encima, lo recorrido hasta el minuto elegido. */}
            <polyline points={recorrido} fill="none" stroke={paleta.text} strokeOpacity={0.25} strokeWidth={0.5 * u} />
            <polyline
              points={recorridoHastaAhora}
              fill="none"
              stroke={paleta.text}
              strokeWidth={0.7 * u}
              strokeLinejoin="round"
              strokeLinecap="round"
            />
            {mapa.trayectoria.map((p) => (
              <circle
                key={p.minuto}
                cx={p.x}
                cy={p.y}
                r={0.9 * u}
                fill={paleta.text}
                fillOpacity={p.minuto <= minuto ? 0.9 : 0.25}
              />
            ))}

            {mapa.eventos.map((e, i) => (
              <circle
                key={i}
                cx={e.x}
                cy={e.y}
                r={1.8 * u}
                fill={paleta.danger}
                fillOpacity={e.minuto <= minuto ? 1 : 0.3}
                stroke={paleta.bg}
                strokeWidth={0.4 * u}
              >
                <title>{`Minuto ${e.minuto}${e.causa ? ` · ${e.causa}` : ''}`}</title>
              </circle>
            ))}

            {posicionActual && (
              <motion.circle
                initial={false}
                animate={{ cx: posicionActual.x, cy: posicionActual.y }}
                transition={transicion}
                r={2.4 * u}
                fill="none"
                stroke={paleta.text}
                strokeWidth={0.7 * u}
              />
            )}
          </g>
        </svg>
          <p className="pointer-events-none absolute bottom-1 right-1 rounded bg-bg/80 px-1.5 py-0.5 text-xs text-text">
            Mapa: KRAFTON, Inc., vía pubg/api-assets
          </p>
        </div>
        {/* Un punto por minuto (centroide del escuadrón): una línea recta entre dos puede cruzar agua aunque se haya ido por el puente. */}
        <p className="mt-2 text-xs text-muted">El trazo une las posiciones de cada minuto; no es el camino exacto.</p>
        {mapa.eventos.length > 0 && (
          <ul className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted">
            {mapa.eventos.map((e, i) => (
              <li key={i} className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-danger" aria-hidden="true" />
                Baja en el minuto {e.minuto}
                {e.causa && <span className="text-text"> · {e.causa.toLowerCase()}</span>}
              </li>
            ))}
          </ul>
        )}

        <div className="mt-3 flex items-end gap-3">
          <button
            type="button"
            onClick={alternarReproduccion}
            aria-label={reproduciendo ? 'Pausar' : 'Reproducir la partida minuto a minuto'}
            aria-pressed={reproduciendo}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-zone text-text hover:bg-zone/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zone"
          >
            {reproduciendo ? <Pause className="h-4 w-4" aria-hidden="true" /> : <Play className="h-4 w-4" aria-hidden="true" />}
          </button>
          <label className="block flex-1 text-sm text-muted">
            <span className="flex justify-between">
              <span>Minuto</span>
              <span className="font-cifra text-lg text-text">{minuto}</span>
            </span>
            <input
              type="range"
              min={minMinuto}
              max={maxMinuto}
              step={1}
              value={Math.min(Math.max(minuto, minMinuto), maxMinuto)}
              // Tomar el deslizador pausa la reproducción: el control es del usuario.
              onPointerDown={() => setReproduciendo(false)}
              onChange={(e) => {
                setReproduciendo(false)
                onMinuto(Number(e.target.value))
              }}
              className="w-full accent-zone"
            />
          </label>
        </div>
        <p className="text-xs text-muted">Pasa el cursor por la curva para moverte en el mapa.</p>
      </div>
    </div>
  )
}
