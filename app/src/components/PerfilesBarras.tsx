import type { Perfiles } from '../types/datos'
import { EstadoVacio } from './EstadoVacio'
import { Cascada } from './Cascada'
import { Conteo } from './Conteo'
import { Desplegable } from './Desplegable'
import { HuellaPerfil } from './HuellaPerfil'
import { Detalle, FilaIndicadores, Indicador, MensajePrincipal } from './Plantilla'
import { percentilDeRango } from '../analisisPartida'
import { estiloPerfil } from '../estiloPerfil'
import { miles, pct100 } from '../formato'

type Props = {
  perfiles: Perfiles | null
}

type Grupo = Perfiles['grupos'][number]

// Etiquetas de jugador para las llaves de perfiles.json; si aparece una
// característica nueva no traducida, se muestra tal cual.
const ETIQUETAS: Record<string, string> = {
  hp_apertura: 'Salud al empezar',
  dist_apertura: 'Qué tan lejos del centro de la zona',
  movilidad: 'Cuánto se mueve',
  var_dist: 'Qué tanto cambia su distancia',
  var_mov: 'Qué tanto cambia su movimiento',
}

// Las distancias van como parte del camino del centro al borde de la zona
// (1 = en el borde): «38 % del camino al borde» en lugar de «0.38 radios».
const FORMATO: Record<string, (v: number) => string> = {
  hp_apertura: (v) => `${v.toFixed(1)} pts`,
  dist_apertura: (v) => `${Math.round(v * 100)} % del camino al borde`,
  var_dist: (v) => `${(v * 100).toFixed(1)} % del radio`,
  movilidad: (v) => v.toFixed(3),
  var_mov: (v) => v.toFixed(3),
}

const formatear = (caracteristica: string, valor: number) => (FORMATO[caracteristica] ?? ((v: number) => v.toFixed(3)))(valor)

/**
 * Distancia al promedio de cada característica, escalada al grupo que más se
 * aleja en esa misma característica: así se comparan escalas muy distintas
 * (salud 0-100 contra variabilidades de 0 a 1). La cifra debajo es el valor
 * real, sin escalar.
 */
function escalas(perfiles: Perfiles): Record<string, number> {
  return Object.fromEntries(
    perfiles.caracteristicas.map((c) => [
      c,
      Math.max(...perfiles.grupos.map((g) => Math.abs(g.centro[c] - perfiles.promedio_general[c]))) || 1,
    ]),
  )
}

/** Barras divergentes de un perfil contra el promedio de todos. */
function BarrasDivergentes({ perfiles, grupo, escala }: { perfiles: Perfiles; grupo: Grupo; escala: Record<string, number> }) {
  const { fondo } = estiloPerfil(grupo.nombre)
  return (
    <div className="space-y-2">
      <div className="grid grid-cols-[minmax(0,13rem)_1fr] gap-x-3 text-xs text-muted">
        <span />
        <span className="flex justify-between">
          <span>menos</span>
          <span>promedio de todos</span>
          <span>más</span>
        </span>
      </div>
      <ul className="space-y-2">
        {perfiles.caracteristicas.map((c) => {
          const valor = grupo.centro[c]
          const promedio = perfiles.promedio_general[c]
          const relativo = (valor - promedio) / escala[c]
          const ancho = `${Math.min(1, Math.abs(relativo)) * 50}%`
          return (
            <li key={c} className="grid grid-cols-[minmax(0,13rem)_1fr] items-center gap-x-3 text-sm">
              <span className="text-text">{ETIQUETAS[c] ?? c}</span>
              <div>
                <div className="relative h-3 rounded-sm bg-text/5">
                  <span className="absolute inset-y-0 left-1/2 w-px bg-muted" aria-hidden="true" />
                  <span
                    className={`absolute inset-y-0 ${fondo} ${relativo >= 0 ? 'left-1/2 rounded-r-sm' : 'right-1/2 rounded-l-sm'}`}
                    style={{ width: ancho }}
                  />
                </div>
                <p className="mt-0.5 text-xs text-muted">
                  <span className="font-cifra text-sm text-text">{formatear(c, valor)}</span> · promedio de todos{' '}
                  {formatear(c, promedio)}
                </p>
              </div>
            </li>
          )
        })}
      </ul>
    </div>
  )
}

/** Pestaña Perfiles con la plantilla común: mensaje, los cuatro perfiles, su comparación y el detalle de cada uno. */
export function PerfilesBarras({ perfiles }: Props) {
  if (!perfiles) {
    return (
      <EstadoVacio mensaje="Aún no hay perfiles cargados. Genera public/datos/perfiles.json desde el notebook." />
    )
  }

  const escala = escalas(perfiles)
  const ordenados = [...perfiles.grupos]
    .map((g) => ({ ...g, percentil: percentilDeRango(g.mediana_pct_rank) }))
    .sort((a, b) => b.percentil - a.percentil)
  const mejor = ordenados[0]

  return (
    <Cascada className="space-y-6">
      <MensajePrincipal detalle="Se agruparon los escuadrones según cómo juegan sus primeros 5 minutos.">
        Cuatro formas de jugar el arranque, y {mejor ? `los ${mejor.nombre} son los que llegan más lejos` : 'cuál llega más lejos'}.
      </MensajePrincipal>

      <FilaIndicadores columnas={4}>
        {ordenados.map((g) => {
          const { Icono } = estiloPerfil(g.nombre)
          return (
            <Indicador
              key={g.grupo}
              etiqueta={`${g.nombre}: mejor que`}
              valor={<Conteo valor={g.percentil} formato={pct100} />}
              detalle="de los equipos"
              icono={
                <span className="flex items-center gap-1">
                  <Icono className="h-4 w-4 text-muted" aria-hidden="true" />
                  <HuellaPerfil perfiles={perfiles} grupo={g} tamano={48} />
                </span>
              }
            />
          )
        })}
      </FilaIndicadores>

      <section className="space-y-3 rounded-lg border border-line bg-card p-5">
        <div>
          <h3 className="titulo-seccion text-base text-text">Qué tan arriba termina cada perfil</h3>
          <p className="text-sm text-muted">El escuadrón típico de cada perfil termina mejor que este porcentaje de los equipos.</p>
        </div>
        <ul className="space-y-3">
          {ordenados.map((g) => {
            const { Icono, fondo } = estiloPerfil(g.nombre)
            return (
              <li key={g.grupo} className="grid grid-cols-[8rem_1fr_3.5rem] items-center gap-3 text-sm">
                <span className="flex items-center gap-1.5 text-text">
                  <Icono className="h-4 w-4 shrink-0" aria-hidden="true" />
                  {g.nombre}
                </span>
                <span className="h-3 rounded-sm bg-text/5">
                  <span className={`block h-full rounded-sm ${fondo}`} style={{ width: `${g.percentil}%` }} />
                </span>
                <span className="text-right font-cifra text-lg text-text">{pct100(g.percentil)}</span>
              </li>
            )
          })}
        </ul>
      </section>

      <Detalle>
        {ordenados.map((g) => {
          const { Icono } = estiloPerfil(g.nombre)
          return (
            <Desplegable key={g.grupo} Icono={Icono} titulo={g.nombre} resumen={g.descripcion}>
              <p className="text-sm text-muted">
                {miles(g.n)} escuadrones. Cada barra muestra cuánto se aleja el grupo del promedio de todos, a escala con el
                grupo que más se aleja; la cifra debajo es el valor real.
              </p>
              <BarrasDivergentes perfiles={perfiles} grupo={g} escala={escala} />
            </Desplegable>
          )
        })}
      </Detalle>
    </Cascada>
  )
}
