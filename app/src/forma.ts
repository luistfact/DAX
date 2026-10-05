import type { Minuto } from './types/datos'

// Reglas de forma de curva (2026-10-04, documentadas en CLAUDE.md). Idénticas
// en servicio/forma.py: el asistente debe decir la misma etiqueta que ve el
// jugador. Los umbrales son relativos al catálogo y no absolutos: los
// anteriores (0.30, 0.50, 0.55…) estaban en la escala de la red sin
// recalibrar y, tras la recalibración, ningún escuadrón salía Dominante.

/** Minutos que se ignoran: ahí todos empiezan cerca de la tasa base. */
export const PRIMER_MINUTO = 3
/** Puntos mínimos (desde PRIMER_MINUTO) para leer una forma; con menos, la partida duró muy poco. */
const MINIMO_PUNTOS = 3

// Calculadas una sola vez sobre el catálogo (partidas.json, 200 escuadrones;
// 187 con al menos 3 minutos desde el minuto 3). Si se regenera el catálogo,
// se recalculan y se copian igual en servicio/forma.py.
/** Percentil 75 del promedio de los últimos 3 minutos de cada escuadrón. */
export const P75_CIERRE = 0.5348
/** Mediana de todas las probabilidades del catálogo desde el minuto 3. */
export const MEDIANA = 0.3448

const CAIDA_REMONTADA = 0.1
const RECUPERACION_REMONTADA = 0.15
const CAIDA_DESPLOME = 0.2
const MARGEN_FONDO_DESPLOME = 0.05

/** Orden de evaluación: gana la primera que se cumple. Manda el final de la partida. */
export const FORMAS = ['Desplome', 'Dominante', 'Remontada', 'Reñida'] as const
export type Forma = (typeof FORMAS)[number] | 'Partida muy corta'

/** Probabilidades desde el minuto 3, en orden de minuto, sin minutos vacíos. */
function curva(minutos: Minuto[]): number[] {
  return [...minutos]
    .filter((m) => m.minuto >= PRIMER_MINUTO && m.probabilidad != null)
    .sort((a, b) => a.minuto - b.minuto)
    .map((m) => m.probabilidad as number)
}

const promedio = (v: number[]) => v.reduce((a, b) => a + b, 0) / v.length

/** Caída desde el máximo hasta lo más bajo que llega después de él. */
function caidaDesdeMaximo(v: number[]): { caida: number; fondo: number } {
  const pico = v.indexOf(Math.max(...v))
  const fondo = Math.min(...v.slice(pico))
  return { caida: v[pico] - fondo, fondo }
}

/**
 * La mayor recuperación tras una caída de al menos 10 puntos desde un máximo
 * previo: para cada punto bajo, cuánto sube después. 0 si nunca cayó así.
 */
function mejorRecuperacion(v: number[]): number {
  let mejor = 0
  for (let i = 1; i < v.length; i++) {
    if (Math.max(...v.slice(0, i)) - v[i] >= CAIDA_REMONTADA) {
      mejor = Math.max(mejor, Math.max(...v.slice(i)) - v[i])
    }
  }
  return mejor
}

/** Clasifica el escuadrón por la forma de su curva de probabilidad. */
export function clasificarForma(minutos: Minuto[]): Forma {
  const v = curva(minutos)
  if (v.length < MINIMO_PUNTOS) return 'Partida muy corta'

  // 1. Desplome: cae al menos 20 puntos desde su máximo y termina a 5 puntos
  // o menos de lo más bajo que llegó después.
  const { caida, fondo } = caidaDesdeMaximo(v)
  if (caida >= CAIDA_DESPLOME && v[v.length - 1] - fondo <= MARGEN_FONDO_DESPLOME) return 'Desplome'

  // 2. Dominante: cierra en el cuarto superior del catálogo y nunca baja de la mediana.
  if (promedio(v.slice(-3)) >= P75_CIERRE && Math.min(...v) >= MEDIANA) return 'Dominante'

  // 3. Remontada: cae al menos 10 puntos y después recupera al menos 15 desde ese punto.
  if (mejorRecuperacion(v) >= RECUPERACION_REMONTADA) return 'Remontada'

  // 4. Reñida: ninguna de las anteriores.
  return 'Reñida'
}

// Qué tan claro es cada caso, para ordenar dentro de su categoría (los
// mayores primero). Miden el mismo rasgo que define la categoría.

/** Desplome: cuánto cayó desde su máximo. */
export function magnitudDesplome(minutos: Minuto[]): number {
  const v = curva(minutos)
  return v.length === 0 ? 0 : caidaDesdeMaximo(v).caida
}

/** Remontada: cuánto recuperó tras la caída. */
export function magnitudRemontada(minutos: Minuto[]): number {
  const v = curva(minutos)
  return v.length === 0 ? 0 : mejorRecuperacion(v)
}

/** Dominante: posibilidades promedio sostenidas desde el minuto 3. */
export function nivelDominante(minutos: Minuto[]): number {
  const v = curva(minutos)
  return v.length === 0 ? 0 : promedio(v)
}

/** Reñida: qué tan pegada a la mediana anduvo (más cerca, más reñida). */
export function nivelRenida(minutos: Minuto[]): number {
  const v = curva(minutos)
  return v.length === 0 ? -Infinity : -Math.abs(promedio(v) - MEDIANA)
}

/** Partida muy corta: las más cortas primero (sin datos para otra medida). */
export function nivelCorta(minutos: Minuto[]): number {
  return -minutos.filter((m) => m.probabilidad != null).length
}
