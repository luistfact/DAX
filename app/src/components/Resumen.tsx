import type { ReactNode } from 'react'
import { motion } from 'motion/react'
import type { CausaEliminacion, FaseMetrica, Importancia, Metricas, Partida, Perfiles } from '../types/datos'
import { percentilDeRango } from '../analisisPartida'
import { metrica, miles, pct, pct100 } from '../formato'
import { LABEL_MINUTOS_ANALIZADOS, etiquetaVariable, rotuloFase } from '../texto'
import { estiloPerfil } from '../estiloPerfil'
import { usePaleta } from '../hooks/useTema'
import { DURACION_ENTRADA_MS, useAnimarUnaVez } from '../hooks/useAnimarUnaVez'
import { AnilloZona } from './AnilloZona'
import { Ayuda } from './Ayuda'
import { Mira } from './Mira'
import { HuellaPerfil } from './HuellaPerfil'

type Props = {
  metricas: Metricas | null
  perfiles: Perfiles | null
  partidas: Partida[] | null
  onExplorar: () => void
  onVerPerfiles: () => void
}

type GrupoConPercentil = Perfiles['grupos'][number] & { percentil: number }

// Qué variables cuentan como «llegar completo y sano» y cuáles como «dónde
// estás parado», para la evidencia del hallazgo 2.
const ESTADO = new Set(['hp_medio', 'hp_minimo', 'jugadores_vivos'])
const POSICION = new Set(['dist_rel', 'dist_centro', 'frac_fuera'])
const CAUSA_ZONA = 'Zona de gas'

/** Tarjeta de hallazgo: número enorme y frase a la izquierda, su evidencia a la derecha. */
function Hallazgo({
  cifra,
  sufijo,
  frase,
  detalle,
  ayuda,
  children,
}: {
  cifra: string
  /** Unidad pequeña junto a la cifra, p. ej. «de cada 100». */
  sufijo?: string
  frase: string
  detalle?: string
  /** El término técnico detrás del hallazgo, a demanda: fuera de Metodología no va a la vista. */
  ayuda?: { texto: string; etiqueta: string }
  children?: ReactNode
}) {
  return (
    <li className="grid gap-4 rounded-lg border border-line bg-card p-5 sm:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)] sm:items-center">
      <div>
        <p className="font-cifra text-6xl font-bold leading-none text-text">
          {cifra}
          {sufijo && <span className="ml-2 inline-block whitespace-nowrap font-texto text-base font-medium text-muted">{sufijo}</span>}
        </p>
        <p className="mt-3 text-base font-medium text-text">{frase}</p>
        {detalle && (
          <p className="mt-1 text-sm text-muted">
            {detalle}
            {ayuda && <Ayuda texto={ayuda.texto} etiqueta={ayuda.etiqueta} />}
          </p>
        )}
      </div>
      {children && <div className="min-w-0">{children}</div>}
    </li>
  )
}

/** Mini dona de causas de eliminación: la zona en su color, el resto en grises. */
function DonaCausas({ causas }: { causas: CausaEliminacion[] }) {
  const paleta = usePaleta()
  // Se llena una vez por visita; al volver al Resumen aparece ya llena.
  const animar = useAnimarUnaVez('dona-causas')
  const radio = 38
  const circunferencia = 2 * Math.PI * radio
  // La zona primero, para que su porción arranque arriba y se lea sola.
  const ordenadas = [...causas].sort((a, b) => Number(b.causa === CAUSA_ZONA) - Number(a.causa === CAUSA_ZONA))
  const grises = [0.85, 0.55, 0.3]
  let acumulado = 0
  let gris = 0
  const porciones = ordenadas.map((c) => {
    const largo = c.proporcion * circunferencia
    const porcion = {
      ...c,
      largo,
      desde: acumulado,
      color: c.causa === CAUSA_ZONA ? paleta.zone : paleta.muted,
      opacidad: c.causa === CAUSA_ZONA ? 1 : grises[gris++ % grises.length],
    }
    acumulado += largo
    return porcion
  })

  return (
    <div className="flex items-center gap-4">
      <svg viewBox="0 0 100 100" className="h-28 w-28 shrink-0 -rotate-90" aria-hidden="true">
        {porciones.map((p) => (
          <motion.circle
            key={p.causa}
            cx="50"
            cy="50"
            r={radio}
            fill="none"
            stroke={p.color}
            strokeOpacity={p.opacidad}
            strokeWidth={16}
            // 1.5 de hueco entre porciones, del color de la tarjeta.
            initial={animar ? { strokeDasharray: `0 ${circunferencia}`, strokeDashoffset: 0 } : false}
            animate={{ strokeDasharray: `${Math.max(0, p.largo - 1.5)} ${circunferencia}`, strokeDashoffset: -p.desde }}
            // Misma duración y aceleración (ease-out) que la curva de probabilidad.
            transition={animar ? { duration: DURACION_ENTRADA_MS / 1000, ease: 'easeOut' } : { duration: 0 }}
          />
        ))}
      </svg>
      <ul className="space-y-1 text-sm">
        {porciones.map((p) => (
          <li key={p.causa} className="flex items-center gap-2">
            <span
              className="h-2.5 w-2.5 shrink-0 rounded-sm"
              style={{ backgroundColor: p.color, opacity: p.opacidad }}
              aria-hidden="true"
            />
            <span className="text-text">{p.causa}</span>
            <span className="ml-auto pl-2 font-cifra text-base text-muted">{pct(p.proporcion)}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}

/**
 * Peso relativo de cada variable: su parte del total de importancia positiva.
 * La barra se escala a la más pesada para que se lea; la cifra es el peso.
 * El estado del escuadrón, resaltado contra la posición.
 */
function BarrasImportancia({ importancia }: { importancia: Importancia }) {
  const total = importancia.variables.reduce((s, v) => s + Math.max(0, v.importancia), 0)
  const peso = (v: number) => (total > 0 ? Math.max(0, v) / total : 0)
  const maximo = Math.max(...importancia.variables.map((v) => peso(v.importancia)))
  const clase = (variable: string) => (ESTADO.has(variable) ? 'bg-alive' : POSICION.has(variable) ? 'bg-muted' : 'bg-line')
  return (
    <div className="space-y-2">
      <ul className="space-y-1.5">
        {importancia.variables.map((v) => {
          const p = peso(v.importancia)
          return (
            <li key={v.variable} className="text-xs">
              <span className="flex items-baseline justify-between gap-2">
                <span className="text-text">{etiquetaVariable(v.variable)}</span>
                {/* Por debajo de cero (–0.001) la variable no aporta: «sin peso», no un porcentaje negativo. */}
                <span className="shrink-0 text-muted">{p > 0 ? pct(p) : 'sin peso'}</span>
              </span>
              <span className="mt-0.5 block h-1.5 rounded-sm bg-text/5">
                <span
                  className={`block h-full rounded-sm ${clase(v.variable)}`}
                  style={{ width: `${maximo > 0 ? (p / maximo) * 100 : 0}%` }}
                />
              </span>
            </li>
          )
        })}
      </ul>
      <p className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted">
        <span className="flex items-center gap-1.5">
          <span className="h-2 w-3 rounded-sm bg-alive" aria-hidden="true" /> Escuadrón completo y sano
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-2 w-3 rounded-sm bg-muted" aria-hidden="true" /> Dónde estás parado
        </span>
      </p>
      <p className="text-xs text-muted">
        Peso de cada variable: cuánto empeora el modelo si deja de aportar información, como parte del total.
      </p>
    </div>
  )
}

/** Percentil mediano de cada perfil, con los dos que compara el hallazgo resaltados. */
function BarrasPercentil({ grupos, resaltados }: { grupos: GrupoConPercentil[]; resaltados: string[] }) {
  return (
    <ul className="space-y-2">
      {grupos.map((g) => {
        const { Icono, fondo } = estiloPerfil(g.nombre)
        const resaltado = resaltados.includes(g.nombre)
        return (
          <li key={g.grupo} className={`grid grid-cols-[7.5rem_1fr_3rem] items-center gap-2 text-sm ${resaltado ? '' : 'opacity-50'}`}>
            <span className="flex items-center gap-1.5 text-text">
              <Icono className="h-4 w-4 shrink-0" aria-hidden="true" />
              {g.nombre}
            </span>
            <span className="h-2 rounded-sm bg-text/5">
              <span className={`block h-full rounded-sm ${fondo}`} style={{ width: `${g.percentil}%` }} />
            </span>
            <span className="text-right font-cifra text-base text-muted">{pct100(g.percentil)}</span>
          </li>
        )
      })}
    </ul>
  )
}

/** AUC por fase, en barras que arrancan en 0.5 (el azar). */
function BarrasAucFase({ fases }: { fases: FaseMetrica[] }) {
  const piso = 0.5
  const techo = Math.max(0.8, ...fases.map((f) => f.AUC))
  return (
    <div>
      <div className="flex h-28 items-end gap-2">
        {fases.map((f) => (
          <div key={f.Fase} className="flex h-full flex-1 flex-col items-center justify-end gap-1">
            <span className="font-cifra text-sm text-muted">{Math.round(f.AUC * 100)}</span>
            <span
              className="w-full rounded-t-sm bg-zone"
              style={{ height: `${((f.AUC - piso) / (techo - piso)) * 100}%` }}
            />
          </div>
        ))}
      </div>
      <div className="mt-1 flex gap-2 border-t border-line pt-1">
        {fases.map((f) => (
          <span key={f.Fase} className="flex-1 text-center font-cifra text-sm text-muted">
            {rotuloFase(f.Fase)}
          </span>
        ))}
      </div>
      <p className="mt-1 text-xs text-muted">Aciertos de cada 100 por fase del círculo; las barras arrancan en 50, el azar.</p>
    </div>
  )
}

/** Portada: la pregunta, el contexto del corpus, los hallazgos y los cuatro perfiles como arquetipos. */
export function Resumen({ metricas, perfiles, partidas, onExplorar, onVerPerfiles }: Props) {
  const grupos: GrupoConPercentil[] = perfiles
    ? [...perfiles.grupos]
        .map((g) => ({ ...g, percentil: percentilDeRango(g.mediana_pct_rank) }))
        .sort((a, b) => b.percentil - a.percentil)
    : []
  const porNombre = (nombre: string) => grupos.find((g) => g.nombre === nombre)
  const rotadores = porNombre('Rotadores')
  const perifericos = porNombre('Periféricos')

  const causas = metricas?.causas_eliminacion ?? []
  const zona = causas.find((c) => c.causa === CAUSA_ZONA)
  const combate = causas
    .filter((c) => c.causa === 'Arma de fuego' || c.causa === 'Remate tras derribo')
    .reduce((s, c) => s + c.proporcion, 0)

  const importancia = metricas?.importancia
  const maxDe = (grupo: Set<string>) =>
    Math.max(0, ...(importancia?.variables.filter((v) => grupo.has(v.variable)).map((v) => v.importancia) ?? []))
  const razon = importancia && maxDe(POSICION) > 0 ? maxDe(ESTADO) / maxDe(POSICION) : null

  const fases = metricas?.por_fase ?? []
  const primeraFase = fases[0]
  const ultimaFase = fases.at(-1)
  const numPartidasCatalogo = partidas ? new Set(partidas.map((p) => p.match_id)).size : null

  return (
    <div className="space-y-10">
      <Mira>
        <section className="relative overflow-hidden rounded-lg border border-line bg-card px-6 py-6 sm:px-10">
          <AnilloZona
            tamano={200}
            modo="unaVez"
            className="pointer-events-none absolute left-1/2 top-20 -translate-x-1/2 -translate-y-1/2 text-zone opacity-40 sm:left-[30rem]"
          />
          <div className="relative max-w-3xl space-y-3">
            <h2 className="font-stencil text-3xl leading-tight text-text sm:text-5xl">¿Llega tu escuadrón al top 25 %?</h2>
            <p className="max-w-2xl text-base text-muted">
              ZonaAzul estima, minuto a minuto, la probabilidad de que un escuadrón de PUBG termine en el cuarto
              superior de su partida, a partir de la telemetría oficial del juego. Revisa escuadrones reales, o escribe
              tu nombre de usuario arriba para analizar tu partida más reciente.
            </p>
            <button
              type="button"
              onClick={onExplorar}
              className="rounded-md border border-zone px-4 py-2 text-sm font-semibold text-text hover:bg-zone/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zone"
            >
              Explorar escuadrones →
            </button>
          </div>
        </section>
      </Mira>

      {/* Contexto, no resultado: una franja pequeña. */}
      {metricas && (
        <p className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted">
          <span>
            <span className="font-cifra text-base text-text">{miles(metricas.corpus.partidas)}</span> partidas
          </span>
          <span>
            <span className="font-cifra text-base text-text">{miles(metricas.corpus.escuadrones)}</span> escuadrones
          </span>
          <span>
            <span className="font-cifra text-base text-text">{miles(metricas.corpus.observaciones)}</span>{' '}
            {LABEL_MINUTOS_ANALIZADOS.toLowerCase()}
          </span>
          {partidas && numPartidasCatalogo != null && (
            <span>
              <span className="font-cifra text-base text-text">{miles(partidas.length)}</span> escuadrones para
              explorar, de {miles(numPartidasCatalogo)} partidas del conjunto de prueba
            </span>
          )}
        </p>
      )}

      <section className="space-y-3" aria-labelledby="titulo-hallazgos">
        <h3 id="titulo-hallazgos" className="titulo-seccion text-base text-muted">
          Lo que encontramos
        </h3>
        <ol className="grid gap-4 xl:grid-cols-2">
          {zona && (
            <Hallazgo
              cifra={pct(zona.proporcion)}
              frase="de las bajas vienen de la zona de gas."
              detalle={combate > 0 ? `El ${pct(combate)} es combate: arma de fuego y remate tras derribo.` : undefined}
            >
              <DonaCausas causas={causas} />
            </Hallazgo>
          )}
          {importancia && razon != null && (
            <Hallazgo
              cifra={`${razon.toFixed(1)}×`}
              frase="Llegar con el escuadrón completo y sano pesa más que el lugar donde estés parado."
              detalle="Cuánto pesa en el modelo la variable de estado más importante frente a la de posición más importante."
              ayuda={{
                etiqueta: '¿Cómo se mide el peso?',
                texto: `Importancia por permutación en el ${importancia.modelo.toLowerCase()} (${importancia.metrica}): se revuelven los valores de una variable y se mide cuánto empeora el modelo. Detalle en Metodología.`,
              }}
            >
              <BarrasImportancia importancia={importancia} />
            </Hallazgo>
          )}
          {rotadores && perifericos && (
            <Hallazgo
              cifra={`${pct100(rotadores.percentil)} · ${pct100(perifericos.percentil)}`}
              frase="Rotar sin parar y quedarse quieto en la periferia dan casi el mismo resultado."
              detalle="Percentil mediano de Rotadores y Periféricos."
            >
              <BarrasPercentil grupos={grupos} resaltados={['Rotadores', 'Periféricos']} />
            </Hallazgo>
          )}
          {primeraFase && ultimaFase && (
            <Hallazgo
              cifra={`${Math.round(primeraFase.AUC * 100)} → ${Math.round(ultimaFase.AUC * 100)}`}
              sufijo="de cada 100"
              frase="La predicción se vuelve más exacta conforme avanza la partida."
              detalle={`De cada 100 comparaciones entre un escuadrón que llegó al top y uno que no, cuántas acierta, en ${rotuloFase(primeraFase.Fase)} y en ${rotuloFase(ultimaFase.Fase)}.`}
              ayuda={{
                etiqueta: '¿De dónde sale esta cifra?',
                texto: `Es el AUC del modelo en cada fase del círculo (${metrica(primeraFase.AUC)} en ${rotuloFase(primeraFase.Fase)} y ${metrica(ultimaFase.AUC)} en ${rotuloFase(ultimaFase.Fase)}): la proporción de pares de escuadrones que ordena bien. 50 de cada 100 sería azar. Detalle en Metodología.`,
              }}
            >
              <BarrasAucFase fases={fases} />
            </Hallazgo>
          )}
        </ol>
      </section>

      {grupos.length > 0 && (
        <section className="space-y-3" aria-labelledby="titulo-perfiles">
          <div className="flex items-baseline justify-between gap-3">
            <h3 id="titulo-perfiles" className="titulo-seccion text-base text-muted">
              Cuatro formas de jugar
            </h3>
            <button
              type="button"
              onClick={onVerPerfiles}
              className="text-sm text-zone underline underline-offset-2 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zone"
            >
              Ver perfiles
            </button>
          </div>
          <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {grupos.map((g) => {
              const { Icono, fondo } = estiloPerfil(g.nombre)
              return (
                <li key={g.grupo} className="flex flex-col gap-2 rounded-lg border border-line bg-card p-4">
                  <div className="flex items-start justify-between gap-2">
                    <h4 className="flex items-center gap-2 titulo-seccion text-lg text-text">
                      <span className={`flex h-7 w-7 items-center justify-center rounded-full ${fondo}`}>
                        <Icono className="h-4 w-4 text-bg" aria-hidden="true" />
                      </span>
                      {g.nombre}
                    </h4>
                    {perfiles && <HuellaPerfil perfiles={perfiles} grupo={g} />}
                  </div>
                  <div>
                    <p className="etiqueta">percentil mediano</p>
                    <p className="font-cifra text-4xl font-semibold text-text">{pct100(g.percentil)}</p>
                    <div className="mt-1 h-1.5 w-full rounded-full bg-text/10" aria-hidden="true">
                      <div className={`h-full rounded-full ${fondo}`} style={{ width: `${g.percentil}%` }} />
                    </div>
                  </div>
                  <p className="text-sm text-muted">{g.descripcion}</p>
                  <p className="mt-auto text-xs text-muted">{miles(g.n)} escuadrones</p>
                </li>
              )
            })}
          </ul>
        </section>
      )}
    </div>
  )
}
