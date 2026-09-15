import { useState } from 'react'
import { AvisoTratamiento } from './components/AvisoTratamiento'
import { SelectorPartida } from './components/SelectorPartida'
import { CurvaProbabilidad } from './components/CurvaProbabilidad'
import { Informe } from './components/Informe'
import { PerfilesRadar } from './components/PerfilesRadar'
import { TablaModelos } from './components/TablaModelos'
import { AnalizarPartida } from './components/AnalizarPartida'
import { EstadoVacio } from './components/EstadoVacio'
import { usePartidas } from './hooks/usePartidas'
import { usePerfiles } from './hooks/usePerfiles'
import { useMetricas } from './hooks/useMetricas'

const PESTANAS = ['Partida', 'Perfiles', 'Modelos', 'Analizar mi partida'] as const
type Pestana = (typeof PESTANAS)[number]

function App() {
  const [aceptoTratamiento, setAceptoTratamiento] = useState(false)
  const [pestana, setPestana] = useState<Pestana>('Partida')
  const [partidaSeleccionada, setPartidaSeleccionada] = useState<string | null>(null)
  const { cargando, error, partidas } = usePartidas()
  const partidaActual = partidas?.find((p) => p.id === partidaSeleccionada) ?? null
  const { cargando: cargandoPerfiles, error: errorPerfiles, perfiles } = usePerfiles()
  const { cargando: cargandoMetricas, error: errorMetricas, metricas } = useMetricas()

  return (
    <div className="min-h-screen bg-slate-50">
      <AvisoTratamiento aceptado={aceptoTratamiento} onAceptar={setAceptoTratamiento} />

      <header className="border-b border-slate-200 bg-white px-4 py-3 sm:px-6">
        <h1 className="text-xl font-semibold text-slate-900">ZonaAzul</h1>
        <p className="text-sm text-slate-500">
          Análisis retrospectivo de partidas de PUBG. No predice resultados futuros.
        </p>
      </header>

      {aceptoTratamiento && (
        <>
          <nav className="flex gap-1 border-b border-slate-200 bg-white px-4 sm:px-6">
            {PESTANAS.map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => setPestana(p)}
                className={
                  'border-b-2 px-3 py-2 text-sm font-medium ' +
                  (pestana === p
                    ? 'border-slate-900 text-slate-900'
                    : 'border-transparent text-slate-500 hover:text-slate-700')
                }
              >
                {p}
              </button>
            ))}
          </nav>

          <main className="mx-auto max-w-5xl space-y-6 p-4 sm:p-6">
            {pestana === 'Partida' && (
              <>
                {cargando && <EstadoVacio mensaje="Cargando partidas…" />}
                {error && (
                  <EstadoVacio mensaje={`No se pudieron cargar las partidas (${error}).`} />
                )}
                {partidas && (
                  <>
                    <SelectorPartida
                      partidas={partidas}
                      partidaSeleccionada={partidaSeleccionada}
                      onSeleccionar={setPartidaSeleccionada}
                    />
                    <CurvaProbabilidad partida={partidaActual} />
                    <Informe partida={partidaActual} />
                  </>
                )}
              </>
            )}
            {pestana === 'Perfiles' && (
              <>
                {cargandoPerfiles && <EstadoVacio mensaje="Cargando perfiles…" />}
                {errorPerfiles && (
                  <EstadoVacio mensaje={`No se pudieron cargar los perfiles (${errorPerfiles}).`} />
                )}
                {perfiles && <PerfilesRadar perfiles={perfiles} />}
              </>
            )}
            {pestana === 'Modelos' && (
              <>
                {cargandoMetricas && <EstadoVacio mensaje="Cargando métricas…" />}
                {errorMetricas && (
                  <EstadoVacio mensaje={`No se pudieron cargar las métricas (${errorMetricas}).`} />
                )}
                {metricas && <TablaModelos metricas={metricas} />}
              </>
            )}
            {pestana === 'Analizar mi partida' && <AnalizarPartida />}
          </main>
        </>
      )}
    </div>
  )
}

export default App
