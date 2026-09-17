import type { Minuto } from './types/datos'

// Umbrales y orden de evaluación documentados en CLAUDE.md (bitácora):
// se evalúa en este orden y gana la primera regla que se cumple, para que
// las 5 formas no se solapen entre sí.
export const FORMAS = ['Dominante', 'Caída temprana', 'Remontada', 'Reñida', 'Desplome'] as const
export type Forma = (typeof FORMAS)[number] | 'Sin datos suficientes'

const MINIMO_PUNTOS = 3

/** Clasifica la partida por la forma de su curva de probabilidad (solo minutos[].probabilidad). */
export function clasificarForma(minutos: Minuto[]): Forma {
  const puntos = minutos
    .filter((m) => m.probabilidad != null)
    .map((m) => ({ minuto: m.minuto, p: m.probabilidad as number }))

  if (puntos.length < MINIMO_PUNTOS) return 'Sin datos suficientes'

  const valores = puntos.map((p) => p.p)
  const minGlobal = Math.min(...valores)
  const ultimo = valores[valores.length - 1]

  // 1. Remontada: cae por debajo de 0.30 en algún punto y termina por encima de 0.50.
  if (minGlobal < 0.3 && ultimo > 0.5) return 'Remontada'

  // 2. Caída temprana: cae >=15 puntos respecto de su máximo hasta ese momento,
  // antes del minuto 5, y el cierre no recupera ese máximo (menos 5 puntos de margen).
  const primerTramo = puntos.filter((p) => p.minuto <= 5)
  if (primerTramo.length >= 2) {
    let maxHastaAhora = primerTramo[0].p
    let picoAntesDeCaer = maxHastaAhora
    let cayoTemprano = false
    for (let i = 1; i < primerTramo.length; i++) {
      const actual = primerTramo[i].p
      if (maxHastaAhora - actual >= 0.15) {
        picoAntesDeCaer = maxHastaAhora
        cayoTemprano = true
        break
      }
      maxHastaAhora = Math.max(maxHastaAhora, actual)
    }
    if (cayoTemprano && ultimo < picoAntesDeCaer - 0.05) return 'Caída temprana'
  }

  // 3. Desplome: se mantuvo alta en los primeros 10 minutos y cae >=20 puntos
  // en los últimos 4, cerrando por debajo de 0.40.
  const primerosDiez = puntos.filter((p) => p.minuto <= 10)
  const ultimosCuatro = puntos.filter((p) => p.minuto >= 11)
  if (primerosDiez.length > 0 && ultimosCuatro.length > 0) {
    const maxDiez = Math.max(...primerosDiez.map((p) => p.p))
    if (maxDiez >= 0.5 && maxDiez - ultimo >= 0.2 && ultimo < 0.4) return 'Desplome'
  }

  // 4. Dominante: en los últimos 5 minutos promedia >=0.55 y nunca se hundió por debajo de 0.35.
  const ultimosCinco = puntos.filter((p) => p.minuto >= 10).map((p) => p.p)
  if (ultimosCinco.length > 0) {
    const promedioUltimosCinco = ultimosCinco.reduce((a, b) => a + b, 0) / ultimosCinco.length
    if (promedioUltimosCinco >= 0.55 && minGlobal >= 0.35) return 'Dominante'
  }

  // 5. Reñida: no cae en ninguna de las anteriores — oscila sin definirse.
  return 'Reñida'
}

// El color solo codifica dos cosas: zona (curva favorable) y peligro (curva
// adversa) — nunca decoración. Reñida y "sin datos" son neutrales. Se
// exporta para que las tarjetas de la lista completa y las de "casos
// destacados" usen exactamente el mismo criterio.
export const ESTILO_FORMA: Record<Forma, string> = {
  Dominante: 'bg-zona/15 text-zona border-zona/30',
  Remontada: 'bg-zona/15 text-zona border-zona/30',
  Reñida: 'bg-tinta-secundaria/15 text-tinta-secundaria border-tinta-secundaria/30',
  'Caída temprana': 'bg-peligro/15 text-peligro border-peligro/30',
  Desplome: 'bg-peligro/15 text-peligro border-peligro/30',
  'Sin datos suficientes': 'bg-tinta-secundaria/10 text-tinta-secundaria border-tinta-secundaria/20',
}

function valoresValidos(minutos: Minuto[]): number[] {
  return minutos.map((m) => m.probabilidad).filter((p): p is number => p != null)
}

/** Cuánto cayó desde su mejor momento hasta el cierre — para ordenar los Desplome más dramáticos. */
export function magnitudDesplome(minutos: Minuto[]): number {
  const valores = valoresValidos(minutos)
  if (valores.length === 0) return 0
  return Math.max(...valores) - valores[valores.length - 1]
}

/** Cuánto recuperó desde su peor momento hasta el cierre — para ordenar las Remontada más dramáticas. */
export function magnitudRemontada(minutos: Minuto[]): number {
  const valores = valoresValidos(minutos)
  if (valores.length === 0) return 0
  return valores[valores.length - 1] - Math.min(...valores)
}

/** Probabilidad promedio de toda la curva — para ordenar las Dominante más sostenidas. */
export function nivelDominante(minutos: Minuto[]): number {
  const valores = valoresValidos(minutos)
  if (valores.length === 0) return 0
  return valores.reduce((a, b) => a + b, 0) / valores.length
}
