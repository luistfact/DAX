import { motion } from 'motion/react'
import type { Perfiles } from '../types/datos'
import { EstadoVacio } from './EstadoVacio'
import { Cascada } from './Cascada'
import { Conteo } from './Conteo'
import { Desplegable } from './Desplegable'
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

/**
 * La diferencia con el promedio en palabras, calculada con lo que trae
 * perfiles.json (centro del grupo contra promedio general): «1.6 veces el
 * promedio», «un tercio menos que el promedio». Es la forma definitiva de
 * decirlo (decisión del usuario): los perfiles se definen justamente por su
 * diferencia con el promedio.
 */
function comparacionPromedio(valor: number, promedio: number): string {
  if (promedio === 0) return '—'
  const r = valor / promedio
  if (Math.abs(r - 1) < 0.1) return 'casi igual que el promedio'
  if (r >= 1.45) return `${r.toFixed(1)} veces el promedio`
  if (r > 1) return `${Math.round((r - 1) * 100)} % más que el promedio`
  const menos = 1 - r
  if (menos >= 0.45 && menos <= 0.55) return 'casi la mitad del promedio'
  if (menos >= 0.28 && menos <= 0.38) return 'un tercio menos que el promedio'
  if (menos >= 0.22 && menos < 0.28) return 'un cuarto menos que el promedio'
  return `${Math.round(menos * 100)} % menos que el promedio`
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

/** Tarjeta de perfil: su radar, el medidor de «mejor que N de cada 10» y cuántos escuadrones. */
function TarjetaPerfil({ perfiles, grupo }: { perfiles: Perfiles; grupo: Grupo }) {
  const paleta = usePaleta()
  const { Icono, fondo, color } = estiloPerfil(grupo.nombre)
  const llenar = useAnimarUnaVez(`medidor-perfil-${grupo.grupo}`)
  return (
    <article className={`tarjeta flex flex-col gap-3 p-4 ${color ? `acento-${color}` : ''}`}>
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
          {/* El exacto, en pequeño: Rotadores (60 %) y Periféricos (58 %) redondean igual sin ser idénticos. */}
          <p className="text-xs text-muted">{pct100(grupo.percentil)} de los equipos</p>
        </div>
      </div>
      <p className="text-sm text-muted">{miles(grupo.n)} escuadrones</p>
    </article>
  )
}

/**
 * Gráfica de puntos: una fila por característica, un ícono de color por
 * perfil y una línea en el promedio. El ícono, además del color, distingue a
 * cada perfil (la arena y el rojo se confunden con deuteranopía).
 */
function GraficaPuntos({ perfiles, grupos }: { perfiles: Perfiles; grupos: Grupo[] }) {
  const paleta = usePaleta()
  const escala = escalas(perfiles)
  const deslizar = useAnimarUnaVez('puntos-perfiles')
  const { transicion } = useTransicion()
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
        <span className="flex justify-between">
          <span>menos</span>
          <span>promedio</span>
          <span>más</span>
        </span>
      </div>
      <ul className="space-y-3">
        {perfiles.caracteristicas.map((c) => {
          const promedio = perfiles.promedio_general[c]
          return (
            <li key={c} className="grid grid-cols-[minmax(0,12rem)_1fr] items-center gap-x-4">
              <span className="text-sm text-text">{ETIQUETAS[c] ?? c}</span>
              {/* Las posiciones van con translateX sobre una capa del ancho de la pista: solo transformaciones. */}
              <span className="relative block h-6 overflow-x-clip">
                <span className="absolute inset-x-0 top-1/2 h-px bg-line" aria-hidden="true" />
                <span className="absolute inset-y-0 left-1/2 w-0.5 -translate-x-1/2 bg-muted" aria-hidden="true" />
                {grupos.map((g) => {
                  const { Icono } = estiloPerfil(g.nombre)
                  const relativo = Math.max(-1, Math.min(1, (g.centro[c] - promedio) / escala[c]))
                  // Margen de 4 % a cada lado para que el ícono no se corte en los extremos.
                  const x = 4 + ((relativo + 1) / 2) * 92
                  return (
                    <motion.span
                      key={g.grupo}
                      className="absolute inset-y-0 left-0 w-full"
                      initial={deslizar ? { x: '50%' } : false}
                      animate={{ x: `${x}%` }}
                      transition={transicion(DURACION.grafica)}
                    >
                      <span
                        className="absolute top-1/2 flex h-6 w-6 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border-2 bg-card"
                        style={{ borderColor: colorPerfil(g.nombre, paleta) }}
                        title={`${g.nombre}: ${comparacionPromedio(g.centro[c], promedio)} (${exacto(c, g.centro[c])})`}
                      >
                        <Icono className="h-3.5 w-3.5" style={{ color: colorPerfil(g.nombre, paleta) }} aria-hidden="true" />
                      </span>
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

/** Pestaña Perfiles: las cuatro tarjetas, la comparación de puntos y el detalle de cada perfil. */
export function PerfilesBarras({ perfiles }: Props) {
  if (!perfiles) {
    return (
      <EstadoVacio mensaje="Aún no hay perfiles cargados. Genera public/datos/perfiles.json desde el notebook." />
    )
  }

  const ordenados: Grupo[] = [...perfiles.grupos]
    .map((g) => ({ ...g, percentil: percentilDeRango(g.mediana_pct_rank) }))
    .sort((a, b) => b.percentil - a.percentil)
  const mejor = ordenados[0]

  return (
    <Cascada className="space-y-6">
      <MensajePrincipal detalle="Según cómo juegan sus primeros 5 minutos.">
        Cuatro formas de jugar el arranque; {mejor ? `los ${mejor.nombre} llegan más lejos.` : 'cuál llega más lejos.'}
      </MensajePrincipal>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {ordenados.map((g) => (
          <TarjetaPerfil key={g.grupo} perfiles={perfiles} grupo={g} />
        ))}
      </div>

      <GraficaPuntos perfiles={perfiles} grupos={ordenados} />

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
                  <li key={c} className="flex items-baseline justify-between gap-3 text-sm">
                    <span className="text-text">{ETIQUETAS[c] ?? c}</span>
                    <span className="text-right text-muted" title={exacto(c, g.centro[c])}>
                      {comparacionPromedio(g.centro[c], perfiles.promedio_general[c])}
                    </span>
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
