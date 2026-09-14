const TEXTO = (
  'Este análisis usa partidas de PUBG ya procesadas y precalculadas. No se ' +
  'realizan llamadas a la API de PUBG ni a ningún servicio externo desde el ' +
  'navegador: todo lo que se muestra proviene de archivos locales generados ' +
  'de antemano. Es una herramienta de análisis retrospectivo: no predice ' +
  'partidas futuras ni ofrece ventaja competitiva en tiempo real.'
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
