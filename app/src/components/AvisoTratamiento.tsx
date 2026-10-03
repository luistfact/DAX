const TEXTO = (
  'Las pestañas Resumen, Partidas, Perfiles y Metodología usan partidas de ' +
  'PUBG ya procesadas y precalculadas: no hacen ninguna llamada externa desde ' +
  'el navegador. El buscador del encabezado sí llama a un servicio propio ' +
  'que consulta la API oficial de PUBG con el nombre de usuario que ' +
  'escribas, procesa tu partida más reciente de escuadrón en Erangel y no ' +
  'guarda ni el nombre ni el resultado entre consultas. Analizamos ' +
  'partidas que ya terminaron. No da ventaja en tiempo real: es tu ' +
  'repetición, explicada.'
)

type Props = {
  aceptado: boolean
  onAceptar: (valor: boolean) => void
}

/** Aviso de tratamiento de datos: debe aceptarse antes de mostrar cualquier análisis. */
export function AvisoTratamiento({ aceptado, onAceptar }: Props) {
  if (aceptado) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-velo p-4">
      <div className="max-w-lg rounded-xl border border-line bg-card p-6 shadow-xl">
        <h2 className="font-cifra text-xl font-semibold text-text">Aviso de tratamiento de datos</h2>
        {/* Una línea a la vista (12 palabras como máximo) y el texto completo, sin
            cambios, desplegable antes de aceptar (decisión del usuario). */}
        <p className="mt-3 text-sm text-text">
          Analizamos partidas ya jugadas; el buscador consulta la API oficial de PUBG.
        </p>
        <details className="mt-2 text-sm text-muted">
          <summary className="cursor-pointer text-text underline underline-offset-2 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zone">
            Leer el aviso completo
          </summary>
          <p className="mt-2">{TEXTO}</p>
        </details>
        <button
          type="button"
          onClick={() => onAceptar(true)}
          className="mt-5 w-full rounded-md bg-zone px-4 py-2 text-sm font-medium text-bg hover:brightness-110 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zone"
        >
          Acepto el tratamiento de datos descrito arriba
        </button>
      </div>
    </div>
  )
}
