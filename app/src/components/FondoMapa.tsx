const COLUMNAS = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H']
const FILAS = 8

/**
 * Cuadrícula de mapa A–H × 1–8, fija detrás de todo el contenido y junto a
 * las curvas de nivel de `body`. Propia y genérica: no reproduce la del
 * juego. Decorativa: oculta a lectores de pantalla y sin eventos.
 */
export function FondoMapa() {
  return (
    <svg
      className="pointer-events-none fixed inset-0 -z-10 h-full w-full text-muted"
      aria-hidden="true"
      preserveAspectRatio="none"
    >
      {COLUMNAS.map((letra, i) => {
        const x = `${((i + 0.5) / COLUMNAS.length) * 100}%`
        const linea = `${(i / COLUMNAS.length) * 100}%`
        return (
          <g key={letra}>
            {i > 0 && <line x1={linea} x2={linea} y1="0" y2="100%" stroke="currentColor" strokeOpacity={0.035} />}
            <text x={x} y="99%" textAnchor="middle" fill="currentColor" fillOpacity={0.18} fontSize={12}>
              {letra}
            </text>
          </g>
        )
      })}
      {Array.from({ length: FILAS }, (_, i) => {
        const y = `${((i + 0.5) / FILAS) * 100}%`
        const linea = `${(i / FILAS) * 100}%`
        return (
          <g key={i}>
            {i > 0 && <line x1="0" x2="100%" y1={linea} y2={linea} stroke="currentColor" strokeOpacity={0.035} />}
            <text x="6" y={y} fill="currentColor" fillOpacity={0.18} fontSize={12} dominantBaseline="middle">
              {i + 1}
            </text>
          </g>
        )
      })}
    </svg>
  )
}
