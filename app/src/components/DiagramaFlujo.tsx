import { Cpu, Database, LayoutDashboard, ListOrdered, Radio, type LucideIcon } from 'lucide-react'
import { usePaleta } from '../hooks/useTema'

type Nodo = { titulo: string; lineas: [string, string]; Icono: LucideIcon; destacado?: boolean }

// 11 = len(PREDICTORES) en la sección de modelado del notebook.
const NODOS: Nodo[] = [
  { titulo: 'API de PUBG', lineas: ['Partidas de escuadra', 'en Erangel'], Icono: Database },
  { titulo: 'Telemetría', lineas: ['Posiciones, daño,', 'bajas y zona'], Icono: Radio },
  { titulo: 'Variables', lineas: ['11 por escuadrón', 'y minuto (60 s)'], Icono: ListOrdered },
  { titulo: 'Modelo', lineas: ['Red recurrente y', 'red densa'], Icono: Cpu, destacado: true },
  { titulo: 'App y asistente', lineas: ['Curva, informe', 'y preguntas'], Icono: LayoutDashboard },
]

const DESCRIPCION =
  'Flujo de los datos: la API de PUBG entrega las partidas; su telemetría se resume en 11 variables por escuadrón y minuto; el modelo estima la probabilidad de top 25 %; la aplicación y el asistente la muestran.'

/**
 * Flujo punta a punta en SVG propio, con un ícono por paso. Dos orientaciones
 * con los mismos nodos: horizontal en pantallas anchas, vertical en el
 * teléfono, donde el horizontal quedaría ilegible.
 */
function Flujo({ vertical }: { vertical: boolean }) {
  const paleta = usePaleta()
  const ancho = vertical ? 300 : 180
  const alto = vertical ? 84 : 150
  const hueco = vertical ? 28 : 40
  const total = NODOS.length * (vertical ? alto : ancho) + (NODOS.length - 1) * hueco
  const viewBox = vertical ? `0 0 ${ancho} ${total}` : `0 0 ${total} ${alto}`

  return (
    <svg viewBox={viewBox} role="img" aria-label={DESCRIPCION} className="h-auto w-full">
      <defs>
        <marker id={`punta-${vertical ? 'v' : 'h'}`} viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto">
          <path d="M0,0 L10,5 L0,10 z" fill={paleta.muted} />
        </marker>
      </defs>
      {NODOS.map((n, i) => {
        const x = vertical ? 0 : i * (ancho + hueco)
        const y = vertical ? i * (alto + hueco) : 0
        const centroX = x + ancho / 2
        const siguiente = i < NODOS.length - 1
        const color = n.destacado ? paleta.zone : paleta.muted
        return (
          <g key={n.titulo}>
            <rect
              x={x + 0.5}
              y={y + 0.5}
              width={ancho - 1}
              height={alto - 1}
              rx={12}
              fill={paleta.card}
              stroke={n.destacado ? paleta.zone : paleta.line}
              strokeWidth={n.destacado ? 2 : 1}
            />
            {vertical ? (
              <>
                <n.Icono x={x + 16} y={y + alto / 2 - 14} width={28} height={28} color={color} aria-hidden="true" />
                <text
                  x={x + 58}
                  y={y + 36}
                  fill={paleta.text}
                  style={{ fontFamily: 'var(--font-cifra)', fontWeight: 600, fontSize: 17, letterSpacing: '0.06em' }}
                >
                  {n.titulo.toUpperCase()}
                </text>
                <text x={x + 58} y={y + 58} fill={paleta.muted} style={{ fontSize: 13 }}>
                  {n.lineas.join(' ')}
                </text>
              </>
            ) : (
              <>
                <n.Icono x={centroX - 16} y={y + 18} width={32} height={32} color={color} aria-hidden="true" />
                <text
                  x={centroX}
                  y={y + 76}
                  textAnchor="middle"
                  fill={paleta.text}
                  style={{ fontFamily: 'var(--font-cifra)', fontWeight: 600, fontSize: 17, letterSpacing: '0.06em' }}
                >
                  {n.titulo.toUpperCase()}
                </text>
                {n.lineas.map((linea, j) => (
                  <text key={j} x={centroX} y={y + 102 + j * 18} textAnchor="middle" fill={paleta.muted} style={{ fontSize: 13 }}>
                    {linea}
                  </text>
                ))}
              </>
            )}
            {siguiente &&
              (vertical ? (
                <line
                  x1={centroX}
                  y1={y + alto + 3}
                  x2={centroX}
                  y2={y + alto + hueco - 3}
                  stroke={paleta.muted}
                  strokeWidth={1.5}
                  markerEnd="url(#punta-v)"
                />
              ) : (
                <line
                  x1={x + ancho + 3}
                  y1={alto / 2}
                  x2={x + ancho + hueco - 3}
                  y2={alto / 2}
                  stroke={paleta.muted}
                  strokeWidth={1.5}
                  markerEnd="url(#punta-h)"
                />
              ))}
          </g>
        )
      })}
    </svg>
  )
}

/** De la API de PUBG a la aplicación y el asistente. */
export function DiagramaFlujo() {
  return (
    <>
      <div className="hidden md:block">
        <Flujo vertical={false} />
      </div>
      <div className="mx-auto max-w-xs md:hidden">
        <Flujo vertical />
      </div>
    </>
  )
}
