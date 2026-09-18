import { useState } from 'react'
import { AvisoTratamiento } from './components/AvisoTratamiento'
import { SelectorPartida } from './components/SelectorPartida'
import { CurvaProbabilidad } from './components/CurvaProbabilidad'
import { Informe } from './components/Informe'
import { AsistenteChat } from './components/AsistenteChat'
import { PerfilesRadar } from './components/PerfilesRadar'
import { TablaModelos } from './components/TablaModelos'
import { AnalizarPartida } from './components/AnalizarPartida'
import { EstadoVacio } from './components/EstadoVacio'
import { usePartidas } from './hooks/usePartidas'
import { usePerfiles } from './hooks/usePerfiles'
import { useMetricas } from './hooks/useMetricas'

const PESTANAS = ['Partida', 'Perfiles', 'Analizar mi partida', 'Cómo funciona'] as const
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
    <div className="min-h-screen">
      <AvisoTratamiento aceptado={aceptoTratamiento} onAceptar={setAceptoTratamiento} />

      <header className="border-b border-tinta-secundaria/15 px-4 py-3 sm:px-6">
        <h1 className="font-cifra text-2xl font-semibold tracking-wide text-tinta">ZonaAzul</h1>
        <p className="text-sm text-tinta-secundaria">
          Análisis retrospectivo de partidas de PUBG. No predice resultados futuros.
        </p>
      </header>

      {aceptoTratamiento && (
        <>
          <nav className="flex gap-1 border-b border-tinta-secundaria/15 px-4 sm:px-6">
            {PESTANAS.map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => setPestana(p)}
                className={
                  'border-b-2 px-3 py-2 text-sm font-medium focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zona ' +
                  (pestana === p
                    ? 'border-zona text-tinta'
                    : 'border-transparent text-tinta-secundaria hover:text-tinta')
                }
              >
                {p}
              </button>
            ))}
          </nav>

          <main className="mx-auto max-w-7xl space-y-6 p-4 sm:p-6">
            {pestana === 'Partida' && (
              <>
                {cargando && <EstadoVacio mensaje="Cargando partidas…" />}
                {error && (
                  <EstadoVacio mensaje={`No se pudieron cargar las partidas (${error}).`} />
                )}
                {partidas && (
                  <div className="grid gap-6 lg:grid-cols-3 lg:items-start">
                    <div className="lg:col-span-1">
                      <SelectorPartida
                        partidas={partidas}
                        partidaSeleccionada={partidaSeleccionada}
                        onSeleccionar={setPartidaSeleccionada}
                      />
                    </div>
                    <div className="space-y-6 lg:sticky lg:top-4 lg:col-span-2">
                      <CurvaProbabilidad partida={partidaActual} />
                      <Informe partida={partidaActual} />
                      {partidaActual && <AsistenteChat partida={partidaActual} />}
                    </div>
                  </div>
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
            {pestana === 'Analizar mi partida' && <AnalizarPartida />}
            {pestana === 'Cómo funciona' && (
              <>
                {cargandoMetricas && <EstadoVacio mensaje="Cargando métricas…" />}
                {errorMetricas && (
                  <EstadoVacio mensaje={`No se pudieron cargar las métricas (${errorMetricas}).`} />
                )}
                {metricas && <TablaModelos metricas={metricas} />}
              </>
            )}
          </main>
        </>
      )}
    </div>
  )
}

export default App
