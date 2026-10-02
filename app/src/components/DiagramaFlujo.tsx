import { usePaleta } from '../hooks/useTema'

type Nodo = { titulo: string; lineas: [string, string]; destacado?: boolean }

// 11 = len(PREDICTORES) en la sección de modelado del notebook.
const NODOS: Nodo[] = [
  { titulo: 'API de PUBG', lineas: ['Partidas de escuadra', 'en Erangel'] },
  { titulo: 'Telemetría', lineas: ['Posiciones, daño,', 'bajas y zona'] },
  { titulo: 'Variables', lineas: ['11 por escuadrón', 'y minuto (60 s)'] },
  { titulo: 'Modelo', lineas: ['Red recurrente y', 'red densa'], destacado: true },
  { titulo: 'App y asistente', lineas: ['Curva, informe', 'y preguntas'] },
]

const DESCRIPCION =
  'Flujo de los datos: la API de PUBG entrega las partidas; su telemetría se resume en 11 variables por escuadrón y minuto; el modelo estima la probabilidad de top 25 %; la aplicación y el asistente la muestran.'

/**
 * Flujo punta a punta en SVG propio. Dos orientaciones con los mismos nodos:
 * horizontal en pantallas anchas, vertical en el teléfono, donde el
 * horizontal quedaría ilegible.
 */
function Flujo({ vertical }: { vertical: boolean }) {
  const paleta = usePaleta()
  const ancho = vertical ? 300 : 170
  const alto = vertical ? 76 : 100
  const hueco = vertical ? 28 : 37.5
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
        return (
          <g key={n.titulo}>
            <rect
              x={x + 0.5}
              y={y + 0.5}
              width={ancho - 1}
              height={alto - 1}
              rx={8}
              fill={paleta.card}
              stroke={n.destacado ? paleta.zone : paleta.line}
              strokeWidth={n.destacado ? 2 : 1}
            />
            <text
              x={centroX}
              y={y + (vertical ? 28 : 36)}
              textAnchor="middle"
              fill={paleta.text}
              style={{ fontFamily: 'var(--font-cifra)', fontWeight: 600, fontSize: 17, letterSpacing: '0.06em' }}
            >
              {n.titulo.toUpperCase()}
            </text>
            {vertical ? (
              <text x={centroX} y={y + 52} textAnchor="middle" fill={paleta.muted} style={{ fontSize: 13 }}>
                {n.lineas.join(' ')}
              </text>
            ) : (
              n.lineas.map((linea, j) => (
                <text key={j} x={centroX} y={y + 60 + j * 17} textAnchor="middle" fill={paleta.muted} style={{ fontSize: 13 }}>
                  {linea}
                </text>
              ))
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
