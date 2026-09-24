import { useId } from 'react'
import type { Mapa, PuntoMapa, ZonaMapa } from '../types/datos'
import { COLOR_FONDO, COLOR_PELIGRO, COLOR_TINTA, COLOR_TINTA_SECUNDARIA, COLOR_ZONA } from '../colores'

type Props = {
  mapa: Mapa
  minuto: number
  onMinuto: (minuto: number) => void
}

// Lienzo abstracto: solo trayectoria y círculos, en las coordenadas
// normalizadas del parser. Nada del mapa real del juego.
const LINEAS_CUADRICULA = 8

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

/** Recorrido del escuadrón sobre un lienzo abstracto, con la zona y las bajas, navegable por minuto. */
export function MapaPartida({ mapa, minuto, onMinuto }: Props) {
  const idRecorte = useId()
  const { x, y, lado } = encuadre(mapa)
  const u = lado / 100 // unidad de dibujo: 1 % del lienzo

  const minutos = mapa.trayectoria.map((p) => p.minuto)
  const minMinuto = minutos.length ? Math.min(...minutos) : 0
  const maxMinuto = minutos.length ? Math.max(...minutos) : 0

  // Los círculos se ordenan del más grande al más pequeño y ganan opacidad al cerrarse.
  const circulos = circulosDistintos(mapa.zonas).sort((a, b) => b.r - a.r)
  const zonaActual = alMinuto(mapa.zonas, minuto)
  const posicionActual = alMinuto(mapa.trayectoria, minuto)
  const recorrido = mapa.trayectoria.map((p) => `${p.x},${p.y}`).join(' ')
  const recorridoHastaAhora = mapa.trayectoria.filter((p) => p.minuto <= minuto).map((p) => `${p.x},${p.y}`).join(' ')

  if (mapa.trayectoria.length === 0) {
    return <p className="text-sm text-tinta-secundaria">Sin posiciones registradas para dibujar el recorrido.</p>
  }

  return (
    <div className="rounded-lg border border-tinta-secundaria/15 bg-superficie p-4">
      <p className="mb-3 text-sm text-tinta">
        Tu recorrido durante la partida. Los círculos azules son la zona segura cerrándose; los puntos rojos, donde cayó
        alguien de tu escuadrón.
      </p>
      <div className="mx-auto max-w-md">
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
          <rect x={x} y={y} width={lado} height={lado} fill={COLOR_FONDO} />
          <g stroke={COLOR_TINTA_SECUNDARIA} strokeOpacity={0.12} strokeWidth={0.25 * u}>
            {Array.from({ length: LINEAS_CUADRICULA - 1 }, (_, i) => {
              const d = (lado * (i + 1)) / LINEAS_CUADRICULA
              return (
                <g key={i}>
                  <line x1={x + d} y1={y} x2={x + d} y2={y + lado} />
                  <line x1={x} y1={y + d} x2={x + lado} y2={y + d} />
                </g>
              )
            })}
          </g>

          <g clipPath={`url(#${idRecorte})`}>
            {circulos.map((z, i) => {
              const esActual = zonaActual != null && z.x === zonaActual.x && z.y === zonaActual.y && z.r === zonaActual.r
              return (
                <circle
                  key={`${z.x}|${z.y}|${z.r}`}
                  cx={z.x}
                  cy={z.y}
                  r={z.r}
                  fill={COLOR_ZONA}
                  fillOpacity={esActual ? 0.1 : 0}
                  stroke={COLOR_ZONA}
                  strokeOpacity={esActual ? 1 : 0.2 + (0.5 * (i + 1)) / circulos.length}
                  strokeWidth={(esActual ? 0.8 : 0.4) * u}
                />
              )
            })}

            {/* Recorrido completo tenue y, encima, lo recorrido hasta el minuto elegido. */}
            <polyline points={recorrido} fill="none" stroke={COLOR_TINTA} strokeOpacity={0.25} strokeWidth={0.5 * u} />
            <polyline
              points={recorridoHastaAhora}
              fill="none"
              stroke={COLOR_TINTA}
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
                fill={COLOR_TINTA}
                fillOpacity={p.minuto <= minuto ? 0.9 : 0.25}
              />
            ))}

            {mapa.eventos.map((e, i) => (
              <circle
                key={i}
                cx={e.x}
                cy={e.y}
                r={1.8 * u}
                fill={COLOR_PELIGRO}
                fillOpacity={e.minuto <= minuto ? 1 : 0.3}
                stroke={COLOR_FONDO}
                strokeWidth={0.4 * u}
              />
            ))}

            {posicionActual && (
              <circle
                cx={posicionActual.x}
                cy={posicionActual.y}
                r={2.4 * u}
                fill="none"
                stroke={COLOR_TINTA}
                strokeWidth={0.7 * u}
              />
            )}
          </g>
        </svg>

        <label className="mt-3 block text-sm text-tinta-secundaria">
          <span className="flex justify-between">
            <span>Minuto</span>
            <span className="font-cifra text-lg text-tinta">{minuto}</span>
          </span>
          <input
            type="range"
            min={minMinuto}
            max={maxMinuto}
            step={1}
            value={Math.min(Math.max(minuto, minMinuto), maxMinuto)}
            onChange={(e) => onMinuto(Number(e.target.value))}
            className="w-full accent-zona"
          />
        </label>
        <p className="text-xs text-tinta-secundaria">Pasa el cursor por la curva de probabilidad para moverte en el mapa.</p>
      </div>
    </div>
  )
}
