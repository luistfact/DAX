const TEXTO = (
  'Las pestañas Partida, Perfiles y Modelos usan partidas de PUBG ya ' +
  'procesadas y precalculadas: no hacen ninguna llamada externa desde el ' +
  'navegador. La pestaña Analizar mi partida sí llama a un servicio propio ' +
  'que consulta la API oficial de PUBG con el nombre de usuario que ' +
  'escribas, procesa tu partida más reciente de escuadrón en Erangel y no ' +
  'guarda ni el nombre ni el resultado entre consultas. Es una herramienta ' +
  'de análisis retrospectivo: no predice partidas futuras ni ofrece ' +
  'ventaja competitiva en tiempo real.'
)

type Props = {
  aceptado: boolean
  onAceptar: (valor: boolean) => void
}

/** Aviso de tratamiento de datos: debe aceptarse antes de mostrar cualquier análisis. */
export function AvisoTratamiento({ aceptado, onAceptar }: Props) {
  if (aceptado) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4">
      <div className="max-w-lg rounded-xl bg-white p-6 shadow-xl">
        <h2 className="text-lg font-semibold text-slate-900">Aviso de tratamiento de datos</h2>
        <p className="mt-3 text-sm text-slate-600">{TEXTO}</p>
        <button
          type="button"
          onClick={() => onAceptar(true)}
          className="mt-5 w-full rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800"
        >
          Acepto el tratamiento de datos descrito arriba
        </button>
      </div>
    </div>
  )
}
