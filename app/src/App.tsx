import { useEffect, useMemo, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { DURACION, useTransicion } from './movimiento'
import { AvisoTratamiento } from './components/AvisoTratamiento'
import { BotonTema } from './components/BotonTema'
import { BuscadorJugador } from './components/BuscadorJugador'
import { Resumen } from './components/Resumen'
import { SelectorPartida } from './components/SelectorPartida'
import { Reporte } from './components/Reporte'
import { AsistenteFlotante } from './components/AsistenteFlotante'
import { PerfilesBarras } from './components/PerfilesBarras'
import { FondoMapa } from './components/FondoMapa'
import { Metodologia } from './components/Metodologia'
import { AnalisisEnVivo } from './components/AnalisisEnVivo'
import { EstadoVacio } from './components/EstadoVacio'
import { usePartidas } from './hooks/usePartidas'
import { usePerfiles } from './hooks/usePerfiles'
import { useMetricas } from './hooks/useMetricas'
import { useAnalisis } from './hooks/useAnalisis'
import { construirCatalogo, filtrarCatalogo, nombreEscuadron } from './catalogo'
import { miles } from './formato'
import { sugerencias } from './sugerencias'

// Primero el panorama (Resumen), luego filtrar y hacer zoom (Partidas,
// Perfiles), el detalle técnico a demanda (Metodología).
const PESTANAS = ['Resumen', 'Partidas', 'Perfiles', 'Metodología'] as const
type Pestana = (typeof PESTANAS)[number]

function App() {
  const [aceptoTratamiento, setAceptoTratamiento] = useState(false)
  const [pestana, setPestana] = useState<Pestana>('Resumen')
  const [partidaSeleccionada, setPartidaSeleccionada] = useState<string | null>(null)
  const { cargando, error, partidas } = usePartidas()
  const { cargando: cargandoPerfiles, error: errorPerfiles, perfiles } = usePerfiles()
  const catalogo = useMemo(() => (partidas ? construirCatalogo(partidas, perfiles) : []), [partidas, perfiles])
  // Sin elección, Partidas abre en el desplome más claro: el caso que mejor
  // enseña a leer la curva. Nunca en blanco.
  const idPorDefecto = (filtrarCatalogo(catalogo, 'Desplome')[0] ?? catalogo[0])?.partida.id ?? null
  const entradaActual = catalogo.find((e) => e.partida.id === (partidaSeleccionada ?? idPorDefecto)) ?? null
  const partidaActual = entradaActual?.partida ?? null
  const { cargando: cargandoMetricas, error: errorMetricas, metricas } = useMetricas()
  const analisis = useAnalisis()
  const refEncabezado = useRef<HTMLElement>(null)
  const { transicion } = useTransicion()

  // La altura del encabezado fijo cambia con el ancho (el buscador baja de
  // fila en el teléfono); la columna fija de Partidas la necesita para no
  // quedar debajo de él.
  useEffect(() => {
    const encabezado = refEncabezado.current
    if (!encabezado) return
    const medir = () =>
      document.documentElement.style.setProperty('--alto-encabezado', `${encabezado.offsetHeight}px`)
    medir()
    const observador = new ResizeObserver(medir)
    observador.observe(encabezado)
    return () => observador.disconnect()
  }, [])
  // El análisis en vivo ocupa la columna del reporte mientras no se cierre.
  const enVivo = analisis.estado.fase !== 'inactivo'

  const buscar = (nick: string) => {
    analisis.analizar(nick, 'steam')
    setPestana('Partidas')
  }

  const seleccionar = (id: string) => {
    analisis.reiniciar()
    setPartidaSeleccionada(id)
  }

  // La partida que conoce Botsito: la del reporte visible en Partidas;
  // en cualquier otra pestaña, ninguna (solo habla del proyecto).
  const partidaParaAsistente =
    pestana !== 'Partidas'
      ? null
      : enVivo
        ? analisis.estado.fase === 'listo'
          ? analisis.estado.partida
          : null
        : partidaActual

  return (
    <div className="flex min-h-screen flex-col">
      <FondoMapa />
      <AvisoTratamiento aceptado={aceptoTratamiento} onAceptar={setAceptoTratamiento} />

      <header ref={refEncabezado} className="nav-cristal sticky top-0 z-30 border-b border-line">
        <div className="flex flex-wrap items-center gap-x-6 gap-y-3 px-4 py-3 sm:px-6 lg:px-8">
          <div className="min-w-0 flex-1">
            <h1 className="titulo-seccion text-2xl text-text">ZonaAzul</h1>
            <p className="text-sm text-muted">
              Aprende de tus partidas: revisamos lo que ya jugaste para que sepas qué mejorar en la siguiente.
            </p>
          </div>
          {aceptoTratamiento && (
            <div className="order-last w-full md:order-none md:w-auto md:flex-1 md:max-w-xl">
              <BuscadorJugador ocupado={analisis.estado.fase === 'cargando'} onBuscar={buscar} />
            </div>
          )}
          <BotonTema />
        </div>

        {aceptoTratamiento && (
          <nav className="flex overflow-x-auto px-2 [scrollbar-width:none] sm:gap-1 sm:px-6 lg:px-8" aria-label="Secciones">
            {PESTANAS.map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => setPestana(p)}
                aria-current={pestana === p ? 'page' : undefined}
                className={
                  'titulo-seccion whitespace-nowrap border-b-2 px-2 py-2 text-base sm:px-3 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zone ' +
                  (pestana === p ? 'border-zone text-text' : 'border-transparent text-muted hover:text-text')
                }
              >
                {p}
              </button>
            ))}
          </nav>
        )}
      </header>

      {aceptoTratamiento && (
        <>
          <main className="relative flex-1 px-4 py-6 sm:px-6 lg:px-8">
            {/* Cambio de pestaña: la vista sale desvaneciéndose (150 ms) y la nueva entra
                en cascada (cada vista trae la suya). popLayout y no wait: la vista nueva
                aparece de inmediato, sin esperar a que termine la salida (nada bloquea). */}
            <AnimatePresence mode="popLayout" initial={false}>
              <motion.div
                key={pestana}
                className="space-y-6"
                // La vista que sale no recibe clics: nada debe interponerse con la nueva.
                exit={{ opacity: 0, pointerEvents: 'none', transition: transicion(DURACION.salidaVista) }}
              >
            {pestana === 'Resumen' && (
              <Resumen
                metricas={metricas}
                perfiles={perfiles}
                partidas={partidas}
                onExplorar={() => setPestana('Partidas')}
                onVerPerfiles={() => setPestana('Perfiles')}
              />
            )}
            {pestana === 'Partidas' && (
              <>
                {cargando && <EstadoVacio mensaje="Cargando partidas…" />}
                {error && <EstadoVacio mensaje={`No se pudieron cargar las partidas (${error}).`} />}
                {partidas && (
                  <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(320px,400px)_minmax(0,1fr)] lg:items-start">
                    {/* La lista queda fija con su propio scroll; el reporte, más alto que la pantalla, avanza con la página. */}
                    <div className="flex flex-col lg:sticky lg:top-[calc(var(--alto-encabezado,7rem)+1rem)] lg:h-[calc(100vh-var(--alto-encabezado,7rem)-2rem)]">
                      <SelectorPartida
                        catalogo={catalogo}
                        partidaSeleccionada={enVivo ? null : (partidaActual?.id ?? null)}
                        onSeleccionar={seleccionar}
                      />
                    </div>
                    <div className="min-w-0">
                      {enVivo ? (
                        <AnalisisEnVivo estado={analisis.estado} onCerrar={analisis.reiniciar} />
                      ) : entradaActual ? (
                        <Reporte
                          // Un escuadrón nuevo empieza limpio: su minuto elegido, su cascada, sus números.
                          key={entradaActual.partida.id}
                          partida={entradaActual.partida}
                          titulo={nombreEscuadron(entradaActual)}
                          subtitulo={[
                            `${miles(entradaActual.partida.escuadrones)} equipos en la partida`,
                            `curva: ${entradaActual.forma}`,
                            entradaActual.perfil ? `estilo: ${entradaActual.perfil}` : null,
                          ]
                            .filter(Boolean)
                            .join(' · ')}
                          referencia={metricas?.curva_referencia}
                        />
                      ) : (
                        <EstadoVacio mensaje="Selecciona un escuadrón de la lista." />
                      )}
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
                {perfiles && <PerfilesBarras perfiles={perfiles} />}
              </>
            )}
            {pestana === 'Metodología' && (
              <>
                {cargandoMetricas && <EstadoVacio mensaje="Cargando métricas…" />}
                {errorMetricas && (
                  <EstadoVacio mensaje={`No se pudieron cargar las métricas (${errorMetricas}).`} />
                )}
                {metricas && <Metodologia metricas={metricas} />}
              </>
            )}
              </motion.div>
            </AnimatePresence>
          </main>

          <footer className="border-t border-line px-4 py-4 text-xs text-muted sm:px-6 lg:px-8">
            <p>
              Proyecto académico independiente. No afiliado a KRAFTON ni a PUBG. Imágenes de mapas: KRAFTON, Inc., vía
              pubg/api-assets.
            </p>
            {/* Frase de atribución que exigen los términos de la API de PUBG (developer.pubg.com/tos), textual. */}
            <p lang="en">
              PUBG, PLAYERUNKNOWN&apos;S BATTLEGROUNDS and all related logos are trademarks of PUBG Corporation or its
              affiliates.
            </p>
          </footer>

          <AsistenteFlotante
            partida={partidaParaAsistente}
            sugerencias={sugerencias(pestana, partidaParaAsistente, perfiles)}
          />
        </>
      )}
    </div>
  )
}

export default App
