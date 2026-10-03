import type { ReactNode } from 'react'
import { motion } from 'motion/react'
import { Area, AreaChart, LabelList, ReferenceLine, ResponsiveContainer, XAxis, YAxis } from 'recharts'
import {
  CircleDashed,
  Clock,
  Footprints,
  Heart,
  HeartPulse,
  MapPin,
  Search,
  Shield,
  Swords,
  Timer,
  Users,
  UsersRound,
  type LucideIcon,
} from 'lucide-react'
import type { CausaEliminacion, FaseMetrica, Importancia, Metricas, Partida, Perfiles } from '../types/datos'
import { percentilDeRango } from '../analisisPartida'
import { decimal, miles, pct, pct100 } from '../formato'
import { LABEL_MINUTOS_ANALIZADOS, etiquetaVariable, rotuloFaseCorto } from '../texto'
import { estiloPerfil } from '../estiloPerfil'
import { usePaleta } from '../hooks/useTema'
import { useAnimarUnaVez } from '../hooks/useAnimarUnaVez'
import { ACELERACION_RECHARTS, DURACION, DURACION_GRAFICA_MS, useTransicion } from '../movimiento'
import { HeroeMapa } from './HeroeMapa'
import { Ayuda } from './Ayuda'
import { Globo } from './Globo'
import { Mira } from './Mira'
import { HuellaPerfil } from './HuellaPerfil'
import { Cascada } from './Cascada'
import { Conteo } from './Conteo'
import { Indicador, type Acento } from './Plantilla'

type Props = {
  metricas: Metricas | null
  perfiles: Perfiles | null
  partidas: Partida[] | null
  onExplorar: () => void
  /** Lleva directo al desplome más claro de Partidas. */
  onVerEjemplo: () => void
  onVerPerfiles: () => void
}

type GrupoConPercentil = Perfiles['grupos'][number] & { percentil: number }

// Qué variables cuentan como «llegar completo y sano» y cuáles como «dónde
// estás parado», para el hallazgo de lo que más pesa.
const ESTADO = new Set(['hp_medio', 'hp_minimo', 'jugadores_vivos'])
const POSICION = new Set(['dist_rel', 'dist_centro', 'frac_fuera'])
const CAUSA_ZONA = 'Zona de gas'
/** Cuántas de las que más pesan se muestran; las demás, en una línea. */
const VARIABLES_VISIBLES = 6

// Un ícono por cosa que pesa, para leerlas sin leer.
const ICONO_VARIABLE: Record<string, LucideIcon> = {
  hp_medio: HeartPulse,
  hp_minimo: Heart,
  jugadores_vivos: Users,
  tam_real: UsersRound,
  equipos_vivos: Shield,
  radio_zona: CircleDashed,
  fase_zona: Timer,
  dist_rel: MapPin,
  dist_centro: MapPin,
  frac_fuera: CircleDashed,
  desplazamiento: Footprints,
}

/**
 * Tarjeta de hallazgo 40/60: la cifra y una frase corta a la izquierda, la
 * gráfica llenando el resto. El borde superior lleva el color de su dato.
 */
function Hallazgo({
  cifra,
  sufijo,
  frase,
  ayuda,
  acento,
  children,
}: {
  cifra: ReactNode
  sufijo?: string
  frase: string
  ayuda?: { texto: string; etiqueta: string }
  acento?: Acento
  children: ReactNode
}) {
  return (
    <article className={`tarjeta grid gap-4 p-5 sm:grid-cols-[2fr_3fr] sm:items-center ${acento ? `acento-${acento}` : ''}`}>
      <div>
        <p className="font-cifra text-[3.5rem] font-bold leading-none text-text">
          {cifra}
          {sufijo && (
            <span className="ml-2 inline-block whitespace-nowrap font-texto text-base font-medium text-muted">{sufijo}</span>
          )}
        </p>
        <p className="mt-3 text-base font-medium text-text">
          {frase}
          {ayuda && <Ayuda texto={ayuda.texto} etiqueta={ayuda.etiqueta} />}
        </p>
      </div>
      <div className="min-w-0">{children}</div>
    </article>
  )
}

/** Dona grande de causas de eliminación: la zona resaltada, el resto en gris, la palabra «zona» al centro. Se llena girando. */
function DonaCausas({ causas }: { causas: CausaEliminacion[] }) {
  const paleta = usePaleta()
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
      <div className="relative h-36 w-36 shrink-0">
        <motion.svg
          viewBox="0 0 100 100"
          className="h-full w-full"
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
        {/* La cifra ya va grande a la izquierda: al centro, solo de qué porción se habla. */}
        <p className="absolute inset-0 flex items-center justify-center font-cifra text-xl font-semibold uppercase tracking-wide text-text" aria-hidden="true">
          zona
        </p>
      </div>
      <ul className="space-y-1 text-sm">
        {porciones.map((p) => (
          <li key={p.causa} className="flex items-center gap-2">
            <span className="h-2.5 w-2.5 shrink-0 rounded-sm" style={{ backgroundColor: p.color, opacity: p.opacidad }} aria-hidden="true" />
            <span className="text-text">{p.causa}</span>
            <span className="ml-auto pl-2 font-cifra text-base text-muted">{pct(p.proporcion)}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}

/** Una barra que crece desde cero (scaleX, solo transformación) la primera vez que se carga. */
function BarraCrece({ fraccion, clase, crecer, alto = 'h-3' }: { fraccion: number; clase: string; crecer: boolean; alto?: string }) {
  const { transicion } = useTransicion()
  return (
    <span className={`relative block ${alto} overflow-hidden rounded-sm bg-text/5`}>
      <motion.span
        className={`absolute inset-0 origin-left rounded-sm ${clase}`}
        initial={crecer ? { scaleX: 0 } : false}
        animate={{ scaleX: Math.max(0, Math.min(1, fraccion)) }}
        transition={transicion(crecer ? DURACION.grafica : DURACION.cambioValor)}
      />
    </span>
  )
}

/** Las 6 cosas que más pesan, en barras gruesas con ícono; el estado del escuadrón en verde. */
function BarrasPeso({ importancia }: { importancia: Importancia }) {
  const crecer = useAnimarUnaVez('barras-peso')
  const total = importancia.variables.reduce((s, v) => s + Math.max(0, v.importancia), 0)
  const peso = (v: number) => (total > 0 ? Math.max(0, v) / total : 0)
  const visibles = importancia.variables.filter((v) => v.importancia > 0).slice(0, VARIABLES_VISIBLES)
  const maximo = Math.max(...visibles.map((v) => peso(v.importancia)))
  // Dos tonos, los dos de la comparación del 3.9×: el estado del equipo en verde
  // y todo lo demás en gris (la posición y cómo va la partida: la zona, los
  // equipos que quedan). Antes había un tercer tono sin leyenda.
  const clase = (variable: string) => (ESTADO.has(variable) ? 'bg-alive' : 'bg-muted')
  return (
    <div className="space-y-2">
      <ul className="space-y-2">
        {visibles.map((v) => {
          const Icono = ICONO_VARIABLE[v.variable] ?? CircleDashed
          return (
            <li key={v.variable} className="grid grid-cols-[1.25rem_minmax(0,1fr)_2.5rem] items-center gap-2">
              <Icono className="h-4 w-4 text-muted" aria-hidden="true" />
              <Globo
                className="block min-w-0"
                alinear="izquierda"
                texto={`${etiquetaVariable(v.variable)}: ${decimal(peso(v.importancia) * 100)} % del peso total.`}
              >
                <span className="block truncate text-sm text-text">{etiquetaVariable(v.variable)}</span>
                <BarraCrece fraccion={maximo > 0 ? peso(v.importancia) / maximo : 0} clase={clase(v.variable)} crecer={crecer} />
              </Globo>
              <span className="text-right font-cifra text-sm text-muted">{pct(peso(v.importancia))}</span>
            </li>
          )
        })}
      </ul>
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted">
        <span className="flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full bg-alive" aria-hidden="true" />
          Cómo está tu equipo
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full bg-muted" aria-hidden="true" />
          Dónde estás y cómo va la partida
        </span>
        <span>Las demás pesan poco.</span>
      </div>
    </div>
  )
}

/** Qué tan arriba termina el escuadrón típico de cada perfil, con la línea del top marcada. */
function BarrasPerfiles({ grupos, resaltados }: { grupos: GrupoConPercentil[]; resaltados: string[] }) {
  const crecer = useAnimarUnaVez('barras-perfiles')
  return (
    <div className="space-y-2">
      <ul className="space-y-2">
        {grupos.map((g) => {
          const { Icono, fondo } = estiloPerfil(g.nombre)
          return (
            <li
              key={g.grupo}
              className={`grid grid-cols-[7rem_minmax(0,1fr)_3rem] items-center gap-2 text-sm ${resaltados.includes(g.nombre) ? '' : 'opacity-50'}`}
            >
              <span className="flex items-center gap-1.5 text-text">
                <Icono className="h-4 w-4 shrink-0" aria-hidden="true" />
                {g.nombre}
              </span>
              <Globo
                className="block"
                texto={`${g.nombre}: lo típico es quedar mejor que el ${decimal((1 - g.mediana_pct_rank) * 100)} % de los equipos (${miles(g.n)} escuadrones).`}
              >
                <BarraCrece fraccion={g.percentil / 100} clase={fondo} crecer={crecer} />
                {/* Llegar al top equivale a quedar mejor que el 75 % de los equipos. */}
                <span className="absolute -inset-y-1 left-3/4 w-0.5 bg-text" aria-hidden="true" />
              </Globo>
              <span className="text-right font-cifra text-base text-muted">{pct100(g.percentil)}</span>
            </li>
          )
        })}
      </ul>
      <p className="flex items-center gap-1.5 text-xs text-muted">
        <span className="h-3 w-0.5 bg-text" aria-hidden="true" /> zona top: mejor que el 75 %
      </p>
    </div>
  )
}

/** Aciertos de cada 100 por cierre: un área que empieza en 50, lo que lograría cualquiera adivinando. */
function AreaAciertos({ fases }: { fases: FaseMetrica[] }) {
  const paleta = usePaleta()
  const animar = useAnimarUnaVez('area-aciertos')
  const datos = fases.map((f) => ({ cierre: rotuloFaseCorto(f.Fase), aciertos: Math.round(f.AUC * 100) }))
  const techo = Math.max(80, ...datos.map((d) => d.aciertos + 4))
  return (
    <ResponsiveContainer width="100%" height={170}>
      <AreaChart data={datos} margin={{ top: 22, right: 12, bottom: 0, left: 12 }}>
        <defs>
          <linearGradient id="degradado-aciertos" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={paleta.zone} stopOpacity={0.45} />
            <stop offset="100%" stopColor={paleta.zone} stopOpacity={0.04} />
          </linearGradient>
        </defs>
        <XAxis dataKey="cierre" stroke={paleta.muted} tick={{ fontSize: 12, fill: paleta.muted }} tickLine={false} />
        <YAxis domain={[50, techo]} hide />
        <ReferenceLine
          y={50}
          stroke={paleta.muted}
          strokeDasharray="4 4"
          label={{ value: 'al azar', position: 'insideBottomRight', fontSize: 12, fill: paleta.muted }}
        />
        <Area
          type="monotone"
          dataKey="aciertos"
          // El área arranca en 50, no en cero: acertar la mitad lo haría cualquiera adivinando.
          baseValue={50}
          stroke={paleta.zone}
          strokeWidth={2.5}
          fill="url(#degradado-aciertos)"
          dot={{ r: 3, fill: paleta.zone, stroke: paleta.zone }}
          isAnimationActive={animar}
          animationDuration={DURACION_GRAFICA_MS}
          animationEasing={ACELERACION_RECHARTS}
        >
          <LabelList dataKey="aciertos" position="top" offset={8} fontSize={12} fill={paleta.text} />
        </Area>
      </AreaChart>
    </ResponsiveContainer>
  )
}

/** Portada: banda del héroe con el corpus, los cuatro hallazgos en tarjetas 40/60 y los perfiles desplegables. */
export function Resumen({ metricas, perfiles, partidas, onExplorar, onVerEjemplo, onVerPerfiles }: Props) {
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
  // Un solo botón principal, relleno con el texto invertido: el dorado sigue
  // siendo exclusivo del buscador del encabezado (decisión del usuario).
  const botonPrincipal =
    'rounded-md bg-text px-4 py-2 text-sm font-semibold text-bg hover:opacity-90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zone'
  const enlace =
    'text-sm font-medium text-zone underline underline-offset-2 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zone'

  return (
    <Cascada className="space-y-6">
      {/* 1-2. Héroe con Erangel de fondo (PROMPT_PULIDO_BI.md, opción A): todo
          el contenido en la columna izquierda, sobre el velo; la derecha queda
          para el mapa con la zona cerrándose, el emblema de la app. */}
      <Mira>
        <section className="tarjeta relative overflow-hidden px-6 py-8 sm:px-8 lg:py-10">
          <HeroeMapa />
          <div className="relative space-y-5 lg:w-[58%]">
            <div className="space-y-3">
              {/* Espacios no separables: «top 25 %» nunca se parte entre renglones. */}
              <h2 className="font-stencil text-4xl leading-tight text-text sm:text-5xl">¿Llega tu escuadrón al top 25 %?</h2>
              <p className="text-base text-muted">Tus posibilidades de top 25 %, minuto a minuto.</p>
            </div>
            <div className="flex flex-wrap items-center gap-4">
              <button type="button" onClick={onExplorar} className={botonPrincipal}>
                Explorar escuadrones →
              </button>
              <button type="button" onClick={onVerEjemplo} className={enlace}>
                Ver un ejemplo
              </button>
            </div>
            {metricas && (
              <dl className="grid grid-cols-2 gap-3 xl:grid-cols-4">
                <Indicador etiqueta="Partidas" valor={<Conteo valor={metricas.corpus.partidas} formato={miles} />} Icono={Swords} />
                <Indicador etiqueta="Escuadrones" valor={<Conteo valor={metricas.corpus.escuadrones} formato={miles} />} Icono={Users} />
                <Indicador
                  etiqueta={LABEL_MINUTOS_ANALIZADOS}
                  valor={<Conteo valor={metricas.corpus.observaciones} formato={miles} />}
                  Icono={Clock}
                />
                <Indicador
                  // «200 de 45 partidas» se leía como 200 de un total de 45: son
                  // 200 escuadrones repartidos en 45 partidas.
                  etiqueta="Escuadrones para explorar"
                  valor={<Conteo valor={partidas?.length} formato={miles} />}
                  detalle={numPartidasCatalogo != null ? `en ${numPartidasCatalogo} partidas` : undefined}
                  Icono={Search}
                />
              </dl>
            )}
          </div>
        </section>
      </Mira>

      {/* 3. Gráfico principal: los cuatro hallazgos. */}
      <section className="grid gap-4 xl:grid-cols-2" aria-label="Lo que encontramos">
        {zona && (
          <Hallazgo
            acento="zone"
            cifra={<Conteo valor={zona.proporcion} formato={pct} />}
            frase="de las bajas son por la zona de gas."
          >
            <DonaCausas causas={causas} />
          </Hallazgo>
        )}
        {importancia && razon != null && (
          <Hallazgo
            acento="alive"
            cifra={<Conteo valor={razon} formato={(n) => `${n.toFixed(1)}×`} />}
            frase="Pesa más llegar completo y sano que dónde estés."
            ayuda={{
              etiqueta: '¿Cómo se mide?',
              texto: 'Cuánto empeora el análisis si deja de tener en cuenta cada cosa, como parte del total.',
            }}
          >
            <BarrasPeso importancia={importancia} />
          </Hallazgo>
        )}
        {rotadores && perifericos && (
          <Hallazgo
            acento="zone"
            cifra={
              <>
                <Conteo valor={rotadores.percentil} formato={pct100} /> · <Conteo valor={perifericos.percentil} formato={pct100} />
              </>
            }
            frase="Rotar o quedarse quieto: casi el mismo resultado."
          >
            <BarrasPerfiles grupos={grupos} resaltados={['Rotadores', 'Periféricos']} />
          </Hallazgo>
        )}
        {primeraFase && ultimaFase && (
          <Hallazgo
            acento="zone"
            cifra={
              <>
                <Conteo valor={aciertos(primeraFase.AUC)} formato={entero} /> →{' '}
                <Conteo valor={aciertos(ultimaFase.AUC)} formato={entero} />
              </>
            }
            sufijo="de cada 100"
            frase="El análisis acierta más mientras avanza la partida."
            ayuda={{
              etiqueta: '¿Qué se cuenta?',
              texto:
                'De cada 100 comparaciones entre un escuadrón que llegó al top y uno que no, cuántas acierta, cierre por cierre. Más detalle en Metodología.',
            }}
          >
            <AreaAciertos fases={fases} />
          </Hallazgo>
        )}
      </section>

      {/* 4. Siempre abierta (excepción a «cerrado por defecto», PROMPT_PULIDO_BI.md):
          es lo más vistoso y, cerrada, la página terminaba en un hueco. */}
      {grupos.length > 0 && (
        <section className="tarjeta space-y-4 p-5" aria-labelledby="cuatro-formas">
          <h3 id="cuatro-formas" className="flex items-center gap-2 titulo-seccion text-base text-text">
            <Users className="h-5 w-5 text-muted" aria-hidden="true" />
            Cuatro formas de jugar
          </h3>
            <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              {grupos.map((g) => {
                const { Icono, fondo } = estiloPerfil(g.nombre)
                return (
                  <li key={g.grupo} className="flex flex-col gap-2 rounded-xl border border-line bg-card-2 p-4">
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
        </section>
      )}
    </Cascada>
  )
}
