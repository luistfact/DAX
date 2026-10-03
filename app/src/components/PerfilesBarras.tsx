import { useLayoutEffect, useRef, useState, type KeyboardEvent } from 'react'
import { motion } from 'motion/react'
import type { Perfiles } from '../types/datos'
import { EstadoVacio } from './EstadoVacio'
import { Cascada } from './Cascada'
import { Conteo } from './Conteo'
import { Desplegable } from './Desplegable'
import { Globo } from './Globo'
import { HuellaPerfil } from './HuellaPerfil'
import { Medidor } from './MiniGraficas'
import { Detalle, MensajePrincipal } from './Plantilla'
import { percentilDeRango } from '../analisisPartida'
import { colorPerfil, estiloPerfil } from '../estiloPerfil'
import { miles, pct100 } from '../formato'
import { usePaleta } from '../hooks/useTema'
import { useAnimarUnaVez } from '../hooks/useAnimarUnaVez'
import { DURACION, useTransicion } from '../movimiento'

type Props = {
  perfiles: Perfiles | null
}

type Grupo = Perfiles['grupos'][number] & { percentil: number }

/** Perfil resaltado: el que tiene el cursor o el foco, o el que se fijó con un clic. */
type Resaltado = { activo: number | null; fijo: number | null }

// Nombres de jugador para las llaves de perfiles.json. Las dos de variabilidad
// dicen «qué tanto varía» y no «qué tan constante»: un valor alto es menos
// constante, y «1.7 veces el promedio» se leería al revés.
const ETIQUETAS: Record<string, string> = {
  hp_apertura: 'Salud al aterrizar',
  dist_apertura: 'Qué tan lejos de la zona caes',
  movilidad: 'Cuánto te mueves',
  var_dist: 'Qué tanto varía tu ruta',
  var_mov: 'Qué tanto varía tu ritmo',
}

// Valor exacto con su unidad, solo para el tooltip: fuera de la vista del jugador.
const FORMATO_EXACTO: Record<string, (v: number) => string> = {
  hp_apertura: (v) => `${v.toFixed(1)} de salud`,
  dist_apertura: (v) => `${Math.round(v * 100)} % del camino al borde`,
  var_dist: (v) => v.toFixed(3),
  movilidad: (v) => v.toFixed(3),
  var_mov: (v) => v.toFixed(3),
}

const exacto = (c: string, v: number) => (FORMATO_EXACTO[c] ?? ((x: number) => x.toFixed(3)))(v)

// Fracciones de jugador, sin porcentajes: la diferencia se nombra con la
// fracción más cercana. Más allá de la mitad hacia arriba se dice «N veces».
const MAS: [number, string][] = [
  [0.15, 'un poco más que el promedio'],
  [0.25, 'un cuarto más que el promedio'],
  [0.33, 'un tercio más que el promedio'],
]
const MENOS: [number, string][] = [
  [0.15, 'un poco menos que el promedio'],
  [0.25, 'un cuarto menos que el promedio'],
  [0.33, 'un tercio menos que el promedio'],
  [0.5, 'cerca de la mitad del promedio'],
]

const masCercana = (d: number, anclas: [number, string][]) =>
  anclas.reduce((mejor, ancla) => (Math.abs(ancla[0] - d) < Math.abs(mejor[0] - d) ? ancla : mejor))[1]

/**
 * La diferencia con el promedio en palabras, calculada con lo que trae
 * perfiles.json (centro del grupo contra promedio general). Decisión del
 * usuario (2026-10-02, confirmada el 2026-10-03): palabras y no «0.7×», pero
 * con una sola regla para todas las filas, sin porcentajes: la fracción más
 * cercana (un poco, un cuarto, un tercio, la mitad) y «N veces el promedio»
 * desde 1.45. El valor exacto va en el tooltip.
 */
function comparacionPromedio(valor: number, promedio: number): string {
  if (promedio === 0) return '—'
  const r = valor / promedio
  if (Math.abs(r - 1) < 0.1) return 'casi igual que el promedio'
  if (r >= 1.45) return `${r.toFixed(1)} veces el promedio`
  if (r > 1) return masCercana(r - 1, MAS)
  if (r <= 0.4) return 'menos de la mitad del promedio'
  return masCercana(1 - r, MENOS)
}

/**
 * Lo que más distingue al perfil, para la cabecera de su tarjeta: la
 * característica que más se aleja del promedio, en menos de 12 palabras (las
 * descripciones de perfiles.json llegan a 14 y van dentro).
 */
function rasgoPrincipal(perfiles: Perfiles, grupo: Grupo): string {
  const distancia = (c: string) => Math.abs(grupo.centro[c] / perfiles.promedio_general[c] - 1)
  const c = [...perfiles.caracteristicas].sort((a, b) => distancia(b) - distancia(a))[0]
  return `${ETIQUETAS[c] ?? c}: ${comparacionPromedio(grupo.centro[c], perfiles.promedio_general[c])}`
}

/**
 * Posición -1..1 de cada valor contra el promedio, escalada al grupo que más
 * se aleja en esa característica: así caben escalas muy distintas (salud
 * 0-100 contra variabilidades de 0 a 1) en la misma gráfica.
 */
function escalas(perfiles: Perfiles): Record<string, number> {
  return Object.fromEntries(
    perfiles.caracteristicas.map((c) => [
      c,
      Math.max(...perfiles.grupos.map((g) => Math.abs(g.centro[c] - perfiles.promedio_general[c]))) || 1,
    ]),
  )
}

const relativoDe = (perfiles: Perfiles, escala: Record<string, number>, grupo: Grupo, c: string) =>
  Math.max(-1, Math.min(1, (grupo.centro[c] - perfiles.promedio_general[c]) / escala[c]))

/** Atenuado si hay otro perfil resaltado. */
function atenuado(resaltado: Resaltado, grupo: number): boolean {
  const actual = resaltado.activo ?? resaltado.fijo
  return actual != null && actual !== grupo
}

/** Tarjeta de perfil: su radar, el medidor de «mejor que N de cada 10» y cuántos escuadrones. */
function TarjetaPerfil({
  perfiles,
  grupo,
  resaltado,
  onActivar,
  onFijar,
}: {
  perfiles: Perfiles
  grupo: Grupo
  resaltado: Resaltado
  onActivar: (grupo: number | null) => void
  onFijar: (grupo: number) => void
}) {
  const paleta = usePaleta()
  const { Icono, fondo, color } = estiloPerfil(grupo.nombre)
  const llenar = useAnimarUnaVez(`medidor-perfil-${grupo.grupo}`)
  const encendida = (resaltado.activo ?? resaltado.fijo) === grupo.grupo
  const tecla = (e: KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      onFijar(grupo.grupo)
    }
  }
  return (
    // Resaltado cruzado: pasar el cursor, enfocar o pulsar la tarjeta resalta
    // sus puntos en la gráfica; pulsarla lo deja fijo hasta pulsarla otra vez.
    <article
      role="button"
      tabIndex={0}
      aria-pressed={resaltado.fijo === grupo.grupo}
      aria-label={`${grupo.nombre}: resaltar en la gráfica`}
      onMouseEnter={() => onActivar(grupo.grupo)}
      onMouseLeave={() => onActivar(null)}
      onFocus={() => onActivar(grupo.grupo)}
      onBlur={() => onActivar(null)}
      onClick={() => onFijar(grupo.grupo)}
      onKeyDown={tecla}
      className={`tarjeta flex cursor-pointer flex-col gap-3 p-4 transition-opacity duration-150 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zone ${color ? `acento-${color}` : ''} ${encendida ? 'ring-2 ring-text/40' : ''} ${atenuado(resaltado, grupo.grupo) ? 'opacity-50' : ''}`}
    >
      <h3 className="flex items-center gap-2 titulo-seccion text-lg text-text">
        <span className={`flex h-7 w-7 items-center justify-center rounded-full ${fondo}`}>
          <Icono className="h-4 w-4 text-bg" aria-hidden="true" />
        </span>
        {grupo.nombre}
      </h3>
      <div className="flex items-center justify-between gap-3">
        <HuellaPerfil perfiles={perfiles} grupo={grupo} tamano={96} />
        <div className="text-right">
          <Medidor fraccion={grupo.percentil / 100} color={colorPerfil(grupo.nombre, paleta)} llenar={llenar} />
          <p className="etiqueta">mejor que</p>
          <p className="font-cifra text-3xl font-semibold leading-none text-text">
            <Conteo valor={Math.round(grupo.percentil / 10)} formato={(n) => `${Math.round(n)} de cada 10`} />
          </p>
          {/* Solo la cifra exacta, sin repetir «de los equipos»: Rotadores (60 %)
              y Periféricos (58 %) redondean igual sin ser idénticos. */}
          <p className="text-xs text-muted">exacto: {pct100(grupo.percentil)}</p>
        </div>
      </div>
      <p className="text-sm text-muted">{miles(grupo.n)} escuadrones</p>
    </article>
  )
}

// Diámetro del punto (24 px) más un respiro: dos puntos más cerca que esto en
// la misma fila se separan en carriles verticales.
const SEPARACION_PX = 26

/**
 * Carril vertical de cada perfil en una fila: los puntos que chocarían en
 * horizontal (p. ej. tres perfiles con casi la misma salud al aterrizar) van
 * uno debajo del otro, sin moverse en x (la posición sigue siendo el dato).
 */
function carriles(xs: { grupo: number; px: number }[]): Map<number, number> {
  const ordenados = [...xs].sort((a, b) => a.px - b.px)
  const ultimoPorCarril: number[] = []
  const carril = new Map<number, number>()
  for (const { grupo, px } of ordenados) {
    let i = ultimoPorCarril.findIndex((ultimo) => px - ultimo >= SEPARACION_PX)
    if (i === -1) {
      i = ultimoPorCarril.length
      ultimoPorCarril.push(px)
    } else {
      ultimoPorCarril[i] = px
    }
    carril.set(grupo, i)
  }
  return carril
}

/** Ancho en px de un elemento, al día con los cambios de tamaño. */
function useAncho<T extends HTMLElement>() {
  const ref = useRef<T>(null)
  const [ancho, setAncho] = useState(0)
  useLayoutEffect(() => {
    const el = ref.current
    if (!el) return
    const medir = () => setAncho(el.getBoundingClientRect().width)
    medir()
    const observador = new ResizeObserver(medir)
    observador.observe(el)
    return () => observador.disconnect()
  }, [])
  return [ref, ancho] as const
}

/**
 * Gráfica de puntos: una fila por característica, un ícono de color por
 * perfil y una línea en el promedio. El ícono, además del color, distingue a
 * cada perfil (la arena y el rojo se confunden con deuteranopía).
 */
function GraficaPuntos({
  perfiles,
  grupos,
  resaltado,
  onActivar,
}: {
  perfiles: Perfiles
  grupos: Grupo[]
  resaltado: Resaltado
  onActivar: (grupo: number | null) => void
}) {
  const paleta = usePaleta()
  const escala = escalas(perfiles)
  const deslizar = useAnimarUnaVez('puntos-perfiles')
  const { transicion } = useTransicion()
  const [refPista, anchoPista] = useAncho<HTMLSpanElement>()
  return (
    <section className="tarjeta space-y-4 p-5">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h3 className="titulo-seccion text-base text-text">Cómo juega cada perfil</h3>
        <ul className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted">
          {grupos.map((g) => {
            const { Icono } = estiloPerfil(g.nombre)
            return (
              <li key={g.grupo} className="flex items-center gap-1">
                <Icono className="h-3.5 w-3.5" style={{ color: colorPerfil(g.nombre, paleta) }} aria-hidden="true" />
                {g.nombre}
              </li>
            )
          })}
        </ul>
      </div>
      <div className="grid grid-cols-[minmax(0,12rem)_1fr] gap-x-4 text-xs text-muted">
        <span />
        <span ref={refPista} className="flex justify-between">
          <span>menos</span>
          <span>promedio</span>
          <span>más</span>
        </span>
      </div>
      <ul className="space-y-3">
        {perfiles.caracteristicas.map((c) => {
          const promedio = perfiles.promedio_general[c]
          // Margen de 4 % a cada lado para que el ícono no se corte en los extremos.
          const xDe = (g: Grupo) => 4 + ((relativoDe(perfiles, escala, g, c) + 1) / 2) * 92
          const carril = carriles(grupos.map((g) => ({ grupo: g.grupo, px: (xDe(g) / 100) * anchoPista })))
          const numCarriles = Math.max(1, ...[...carril.values()].map((i) => i + 1))
          return (
            <li key={c} className="grid grid-cols-[minmax(0,12rem)_1fr] items-center gap-x-4">
              <span className="text-sm text-text">{ETIQUETAS[c] ?? c}</span>
              {/* Las posiciones van con translateX sobre una capa del ancho de la pista: solo transformaciones. */}
              <span className="relative block overflow-x-clip" style={{ height: numCarriles * SEPARACION_PX }}>
                <span className="absolute inset-x-0 top-1/2 h-px bg-line" aria-hidden="true" />
                <span className="absolute inset-y-0 left-1/2 w-0.5 -translate-x-1/2 bg-muted" aria-hidden="true" />
                {grupos.map((g) => {
                  const { Icono } = estiloPerfil(g.nombre)
                  const y = ((carril.get(g.grupo) ?? 0) - (numCarriles - 1) / 2) * SEPARACION_PX
                  const encendido = (resaltado.activo ?? resaltado.fijo) === g.grupo
                  return (
                    <motion.span
                      key={g.grupo}
                      className="pointer-events-none absolute inset-y-0 left-0 w-full"
                      initial={deslizar ? { x: '50%' } : false}
                      animate={{ x: `${xDe(g)}%` }}
                      transition={transicion(DURACION.grafica)}
                    >
                      {/* Enfocable: con el teclado también se abre el valor exacto y se resalta su tarjeta. */}
                      <Globo
                        className={`pointer-events-auto absolute top-1/2 flex h-6 w-6 -translate-x-1/2 items-center justify-center rounded-full border-2 bg-card transition-opacity duration-150 ${atenuado(resaltado, g.grupo) ? 'opacity-25' : ''} ${encendido ? 'z-10 scale-125' : ''}`}
                        style={{ borderColor: colorPerfil(g.nombre, paleta), marginTop: y - 12 }}
                        alinear={xDe(g) < 25 ? 'izquierda' : xDe(g) > 75 ? 'derecha' : 'centro'}
                        texto={`${g.nombre}: ${comparacionPromedio(g.centro[c], promedio)} (${exacto(c, g.centro[c])}).`}
                        onMouseEnter={() => onActivar(g.grupo)}
                        onMouseLeave={() => onActivar(null)}
                        onFocus={() => onActivar(g.grupo)}
                        onBlur={() => onActivar(null)}
                      >
                        <Icono className="h-3.5 w-3.5" style={{ color: colorPerfil(g.nombre, paleta) }} aria-hidden="true" />
                      </Globo>
                    </motion.span>
                  )
                })}
              </span>
            </li>
          )
        })}
      </ul>
    </section>
  )
}

/** Barra divergente pequeña: desde el promedio (centro) hacia menos o más, en el color del perfil. */
function MiniDivergente({ relativo, color }: { relativo: number; color: string }) {
  const ancho = Math.abs(relativo) * 50
  return (
    <span className="relative block h-2 w-20 shrink-0 rounded-full bg-text/10" aria-hidden="true">
      <span
        className="absolute inset-y-0 rounded-full"
        style={{ backgroundColor: color, width: `${ancho}%`, left: relativo < 0 ? `${50 - ancho}%` : '50%' }}
      />
      <span className="absolute -inset-y-0.5 left-1/2 w-px -translate-x-1/2 bg-muted" />
    </span>
  )
}

/** Pestaña Perfiles: las cuatro tarjetas, la comparación de puntos y el detalle de cada perfil. */
export function PerfilesBarras({ perfiles }: Props) {
  const paleta = usePaleta()
  const [resaltado, setResaltado] = useState<Resaltado>({ activo: null, fijo: null })

  if (!perfiles) {
    return (
      <EstadoVacio mensaje="Aún no hay perfiles cargados. Genera public/datos/perfiles.json desde el notebook." />
    )
  }

  const ordenados: Grupo[] = [...perfiles.grupos]
    .map((g) => ({ ...g, percentil: percentilDeRango(g.mediana_pct_rank) }))
    .sort((a, b) => b.percentil - a.percentil)
  // Los de arriba quedan cerca entre sí (Rotadores 60 %, Periféricos 58 %): el
  // mensaje nombra al que se queda atrás, no a un ganador que el Resumen niega.
  const rezagado = ordenados.at(-1)
  const escala = escalas(perfiles)
  const activar = (grupo: number | null) => setResaltado((r) => ({ ...r, activo: grupo }))
  const fijar = (grupo: number) => setResaltado((r) => ({ ...r, fijo: r.fijo === grupo ? null : grupo }))

  return (
    <Cascada className="space-y-6">
      <MensajePrincipal detalle="Según cómo juegan sus primeros 5 minutos.">
        Cuatro formas de jugar el arranque; {rezagado ? `solo los ${rezagado.nombre} se quedan atrás.` : 'así terminan.'}
      </MensajePrincipal>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {ordenados.map((g) => (
          <TarjetaPerfil
            key={g.grupo}
            perfiles={perfiles}
            grupo={g}
            resaltado={resaltado}
            onActivar={activar}
            onFijar={fijar}
          />
        ))}
      </div>

      <GraficaPuntos perfiles={perfiles} grupos={ordenados} resaltado={resaltado} onActivar={activar} />

      <Detalle columnas={2}>
        {ordenados.map((g) => {
          const { Icono, color } = estiloPerfil(g.nombre)
          return (
            <Desplegable
              key={g.grupo}
              Icono={Icono}
              titulo={g.nombre}
              resumen={rasgoPrincipal(perfiles, g)}
              acento={color ?? undefined}
            >
              <p className="text-sm text-text">{g.descripcion}</p>
              <ul className="space-y-2">
                {perfiles.caracteristicas.map((c) => (
                  <li key={c} className="grid grid-cols-[minmax(0,1fr)_auto_5rem] items-center gap-3 text-sm">
                    <span className="text-text">{ETIQUETAS[c] ?? c}</span>
                    <span className="text-right text-muted" title={exacto(c, g.centro[c])}>
                      {comparacionPromedio(g.centro[c], perfiles.promedio_general[c])}
                    </span>
                    <MiniDivergente relativo={relativoDe(perfiles, escala, g, c)} color={colorPerfil(g.nombre, paleta)} />
                  </li>
                ))}
              </ul>
              <p className="text-xs text-muted">{miles(g.n)} escuadrones. El valor exacto, al pasar el cursor.</p>
            </Desplegable>
          )
        })}
      </Detalle>
    </Cascada>
  )
}
