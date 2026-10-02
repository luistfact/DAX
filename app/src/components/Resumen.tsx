import { motion } from 'motion/react'
import { CloudFog, Database, HeartPulse, Route, Skull, Target, Users } from 'lucide-react'
import type { CausaEliminacion, FaseMetrica, Importancia, Metricas, Partida, Perfiles } from '../types/datos'
import { percentilDeRango } from '../analisisPartida'
import { miles, pct, pct100 } from '../formato'
import { LABEL_MINUTOS_ANALIZADOS, etiquetaVariable, rotuloFaseCorto } from '../texto'
import { estiloPerfil } from '../estiloPerfil'
import { usePaleta } from '../hooks/useTema'
import { useAnimarUnaVez } from '../hooks/useAnimarUnaVez'
import { DURACION, useTransicion } from '../movimiento'
import { AnilloZona } from './AnilloZona'
import { Mira } from './Mira'
import { HuellaPerfil } from './HuellaPerfil'
import { Cascada } from './Cascada'
import { Conteo } from './Conteo'
import { Desplegable } from './Desplegable'
import { Detalle, FilaIndicadores, Indicador } from './Plantilla'

type Props = {
  metricas: Metricas | null
  perfiles: Perfiles | null
  partidas: Partida[] | null
  onExplorar: () => void
  onVerPerfiles: () => void
}

type GrupoConPercentil = Perfiles['grupos'][number] & { percentil: number }

// Qué variables cuentan como «llegar completo y sano» y cuáles como «dónde
// estás parado», para el hallazgo de lo que más pesa.
const ESTADO = new Set(['hp_medio', 'hp_minimo', 'jugadores_vivos'])
const POSICION = new Set(['dist_rel', 'dist_centro', 'frac_fuera'])
const CAUSA_ZONA = 'Zona de gas'

/** Mini dona de causas de eliminación: la zona en su color, el resto en grises. Se llena girando. */
function DonaCausas({ causas }: { causas: CausaEliminacion[] }) {
  const paleta = usePaleta()
  // Se llena una vez por carga; al volver a abrirla aparece ya llena.
  const animar = useAnimarUnaVez('dona-causas')
  const { transicion } = useTransicion()
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
  const t = animar ? transicion(DURACION.grafica) : { duration: 0 }

  return (
    <div className="flex items-center gap-4">
      {/* Gira un cuarto de vuelta mientras se llena; termina con la zona arriba. */}
      <motion.svg
        viewBox="0 0 100 100"
        className="h-28 w-28 shrink-0"
        aria-hidden="true"
        initial={animar ? { rotate: -180 } : false}
        animate={{ rotate: -90 }}
        transition={t}
      >
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
            transition={t}
          />
        ))}
      </motion.svg>
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
 * Lo que más pesa: la parte de cada cosa en el total. La barra se escala a la
 * más pesada para que se lea; la cifra es su parte. El estado del escuadrón,
 * resaltado contra la posición.
 */
function BarrasImportancia({ importancia }: { importancia: Importancia }) {
  const total = importancia.variables.reduce((s, v) => s + Math.max(0, v.importancia), 0)
  const peso = (v: number) => (total > 0 ? Math.max(0, v) / total : 0)
  const maximo = Math.max(...importancia.variables.map((v) => peso(v.importancia)))
  const clase = (variable: string) => (ESTADO.has(variable) ? 'bg-alive' : POSICION.has(variable) ? 'bg-muted' : 'bg-line')
  return (
    <div className="space-y-2">
      <ul className="grid gap-x-8 gap-y-1.5 lg:grid-cols-2">
        {importancia.variables.map((v) => {
          const p = peso(v.importancia)
          return (
            <li key={v.variable} className="text-xs">
              <span className="flex items-baseline justify-between gap-2">
                <span className="text-sm text-text">{etiquetaVariable(v.variable)}</span>
                {/* Por debajo de cero (–0.001) no aporta: «sin peso», no un porcentaje negativo. */}
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
        <span>
          Cuánto pesa cada cosa: cuánto empeora el análisis si deja de tenerla en cuenta, como parte del total.
        </span>
      </p>
    </div>
  )
}

/** Qué tan arriba termina el escuadrón típico de cada perfil, con los dos que compara el hallazgo resaltados. */
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

/** Aciertos de cada 100 por cierre, en barras que arrancan en 50 (el azar). */
function BarrasAciertos({ fases }: { fases: FaseMetrica[] }) {
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
            {rotuloFaseCorto(f.Fase)}
          </span>
        ))}
      </div>
      <p className="mt-1 text-xs text-muted">Aciertos de cada 100 en cada cierre; las barras arrancan en 50, que sería acertar al azar.</p>
    </div>
  )
}

function Dato({ etiqueta, valor }: { etiqueta: string; valor: string }) {
  return (
    <div className="rounded-md bg-text/5 p-3">
      <dt className="etiqueta">{etiqueta}</dt>
      <dd className="font-cifra text-3xl font-semibold text-text">{valor}</dd>
    </div>
  )
}

/** Portada con la plantilla común: el héroe, las cifras de los hallazgos, lo que más pesa y el detalle desplegable. */
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
  const aciertos = (auc: number) => Math.round(auc * 100)
  const entero = (n: number) => String(Math.round(n))

  return (
    <Cascada className="space-y-6">
      {/* 1. Mensaje principal: el héroe con el anillo de zona. */}
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
              ZonaAzul calcula, minuto a minuto, tus posibilidades de terminar en el cuarto superior de tu partida de
              PUBG, con los datos oficiales del juego. Revisa escuadrones reales, o escribe tu nombre de usuario arriba
              para analizar tu partida más reciente.
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

      {/* 2. Indicadores: las cifras de los hallazgos. */}
      <FilaIndicadores columnas={4}>
        <Indicador
          etiqueta="de las bajas son por la zona"
          valor={<Conteo valor={zona?.proporcion} formato={pct} />}
          Icono={CloudFog}
        />
        <Indicador
          etiqueta="pesa más el escuadrón que dónde estás"
          valor={<Conteo valor={razon} formato={(n) => `${n.toFixed(1)}×`} />}
          Icono={HeartPulse}
        />
        <Indicador
          etiqueta="rotar o quedarse quieto: casi igual"
          valor={
            rotadores && perifericos ? (
              <>
                <Conteo valor={rotadores.percentil} formato={pct100} /> ·{' '}
                <Conteo valor={perifericos.percentil} formato={pct100} />
              </>
            ) : (
              '—'
            )
          }
          Icono={Route}
        />
        <Indicador
          etiqueta="aciertos de cada 100, del cierre 1 al 6"
          valor={
            primeraFase && ultimaFase ? (
              <>
                <Conteo valor={aciertos(primeraFase.AUC)} formato={entero} /> →{' '}
                <Conteo valor={aciertos(ultimaFase.AUC)} formato={entero} />
              </>
            ) : (
              '—'
            )
          }
          Icono={Target}
        />
      </FilaIndicadores>

      {/* 3. Gráfico principal: lo que más pesa. */}
      {importancia && (
        <section className="space-y-3 rounded-lg border border-line bg-card p-5">
          <div>
            <h3 className="titulo-seccion text-base text-text">Lo que más pesa para llegar al top</h3>
            <p className="text-sm text-muted">
              Llegar con el escuadrón completo y sano pesa más que el lugar donde estés parado
              {razon != null && `: unas ${razon.toFixed(1)} veces más`}.
            </p>
          </div>
          <BarrasImportancia importancia={importancia} />
        </section>
      )}

      {/* 4. Detalle desplegable, cerrado por defecto. */}
      <Detalle>
        {zona && (
          <Desplegable
            Icono={Skull}
            titulo="De qué caen los escuadrones"
            resumen={`Solo el ${pct(zona.proporcion)} por la zona; el ${pct(combate)} es combate`}
          >
            <DonaCausas causas={causas} />
          </Desplegable>
        )}
        {rotadores && perifericos && (
          <Desplegable
            Icono={Route}
            titulo="Rotar o quedarse quieto"
            resumen={`Rotadores, mejor que el ${pct100(rotadores.percentil)}; Periféricos, que el ${pct100(perifericos.percentil)}`}
          >
            <p className="text-sm text-text">Rotar sin parar y quedarse quieto en la periferia dan casi el mismo resultado.</p>
            <BarrasPercentil grupos={grupos} resaltados={['Rotadores', 'Periféricos']} />
          </Desplegable>
        )}
        {primeraFase && ultimaFase && (
          <Desplegable
            Icono={Target}
            titulo="Las predicciones mejoran al avanzar"
            resumen={`De ${aciertos(primeraFase.AUC)} a ${aciertos(ultimaFase.AUC)} aciertos de cada 100`}
          >
            <p className="text-sm text-text">
              De cada 100 comparaciones entre un escuadrón que llegó al top y uno que no, cuántas acierta el análisis,
              cierre por cierre. Más detalle en Metodología.
            </p>
            <BarrasAciertos fases={fases} />
          </Desplegable>
        )}
        {grupos.length > 0 && (
          <Desplegable Icono={Users} titulo="Cuatro formas de jugar" resumen={grupos.map((g) => g.nombre).join(', ')}>
            <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              {grupos.map((g) => {
                const { Icono, fondo } = estiloPerfil(g.nombre)
                return (
                  <li key={g.grupo} className="flex flex-col gap-2 rounded-lg border border-line bg-card-2 p-4">
                    <div className="flex items-start justify-between gap-2">
                      <h4 className="flex items-center gap-2 titulo-seccion text-lg text-text">
                        <span className={`flex h-7 w-7 items-center justify-center rounded-full ${fondo}`}>
                          <Icono className="h-4 w-4 text-bg" aria-hidden="true" />
                        </span>
                        {g.nombre}
                      </h4>
                      {perfiles && <HuellaPerfil perfiles={perfiles} grupo={g} />}
                    </div>
                    <p className="text-sm text-text">Mejor que el {pct100(g.percentil)} de los equipos</p>
                    <p className="text-sm text-muted">{g.descripcion}</p>
                  </li>
                )
              })}
            </ul>
            <button
              type="button"
              onClick={onVerPerfiles}
              className="text-sm text-zone underline underline-offset-2 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zone"
            >
              Ver perfiles
            </button>
          </Desplegable>
        )}
        {metricas && (
          <Desplegable
            Icono={Database}
            titulo="De dónde salen los datos"
            resumen={`${miles(metricas.corpus.partidas)} partidas y ${miles(metricas.corpus.escuadrones)} escuadrones de PUBG`}
          >
            <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <Dato etiqueta="Partidas" valor={miles(metricas.corpus.partidas)} />
              <Dato etiqueta="Escuadrones" valor={miles(metricas.corpus.escuadrones)} />
              <Dato etiqueta={LABEL_MINUTOS_ANALIZADOS} valor={miles(metricas.corpus.observaciones)} />
              <Dato etiqueta="Para explorar" valor={miles(partidas?.length)} />
            </dl>
            {partidas && numPartidasCatalogo != null && (
              <p className="text-sm text-muted">
                Los {miles(partidas.length)} escuadrones para explorar vienen de {miles(numPartidasCatalogo)} partidas que
                se apartaron para comprobar el análisis: cada partida tiene varios escuadrones.
              </p>
            )}
          </Desplegable>
        )}
      </Detalle>
    </Cascada>
  )
}
