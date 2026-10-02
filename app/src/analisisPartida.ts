import type { Minuto, Partida } from './types/datos'

/**
 * Percentil de la posición final: 0 % para el último lugar, 100 % para el
 * primero. Recalculado en el cliente solo como respaldo: la partida ya trae
 * `percentil` precalculado por el notebook, salvo la que devuelve en vivo el
 * servicio de análisis (el buscador del encabezado).
 */
export function calcularPercentil(posicionFinal: number, escuadrones: number): number | null {
  if (escuadrones <= 1) return null
  return Math.round(((escuadrones - posicionFinal) / (escuadrones - 1)) * 100)
}

/** La probabilidad más alta que alcanzó el escuadrón en los minutos observados (respaldo, ver arriba). */
export function probabilidadMaxima(minutos: Minuto[]): number | null {
  const valores = minutos.map((m) => m.probabilidad).filter((p): p is number => p != null)
  return valores.length > 0 ? Math.max(...valores) : null
}

/** Extrae el minuto del texto de `informe.momento_critico` (respaldo, ver arriba). */
export function extraerMinutoCritico(momentoCritico: string): number | null {
  const coincidencia = /Minuto (\d+)/.exec(momentoCritico)
  return coincidencia ? Number(coincidencia[1]) : null
}

/** El minuto del momento crítico y el inmediatamente anterior, para mostrar qué cambió ahí. */
export function minutosDelMomentoCritico(
  minutos: Minuto[],
  minutoCritico: number | null,
): { actual: Minuto; anterior: Minuto } | null {
  if (minutoCritico == null) return null
  const actual = minutos.find((m) => m.minuto === minutoCritico)
  const anterior = minutos.find((m) => m.minuto === minutoCritico - 1)
  if (!actual || !anterior) return null
  return { actual, anterior }
}

/** "N de M minutos analizados" -> proporción, para colorear la cobertura sin inventar una escala nueva. */
export function proporcionCobertura(confianza: string): number | null {
  const coincidencia = /(\d+) de (\d+)/.exec(confianza)
  if (!coincidencia) return null
  const [, n, total] = coincidencia
  return Number(total) > 0 ? Number(n) / Number(total) : null
}

/**
 * Rellena percentil/probabilidad_maxima/momento_critico cuando faltan — la
 * partida del análisis en vivo no los trae, a diferencia de
 * partidas.json — con el mismo cálculo de respaldo que ya usa `Informe.tsx`.
 * Así el asistente (`AsistenteChat.tsx`) recibe una partida con la misma
 * forma sin importar si viene del corpus o de un análisis en vivo.
 */
export function enriquecerParaAsistente(partida: Partida): Partida {
  const percentil = partida.percentil ?? calcularPercentil(partida.posicion_final, partida.escuadrones) ?? undefined
  const probabilidadMax = partida.probabilidad_maxima ?? probabilidadMaxima(partida.minutos) ?? undefined

  let momentoCritico = partida.momento_critico
  if (!momentoCritico) {
    const minuto = extraerMinutoCritico(partida.informe.momento_critico)
    const puntos = minutosDelMomentoCritico(partida.minutos, minuto)
    if (minuto != null && puntos?.actual.probabilidad != null && puntos.anterior.probabilidad != null) {
      momentoCritico = { minuto, caida: puntos.actual.probabilidad - puntos.anterior.probabilidad }
    }
  }

  return { ...partida, percentil, probabilidad_maxima: probabilidadMax, momento_critico: momentoCritico }
}

/**
 * `mediana_pct_rank` va de 0 (ganador) a 1 (último): al revés de un
 * percentil. Mostrarlo tal cual pondría a los Castigados como el mejor grupo.
 */
export function percentilDeRango(pctRank: number): number {
  return Math.round((1 - pctRank) * 100)
}

/**
 * Cuántos lugares cuentan como top 25 % en una partida de `escuadrones`
 * equipos. Misma definición que el objetivo del modelo:
 * (posición − 1) / (escuadrones − 1) ≤ 0.25. Con 28 equipos, los primeros 7.
 */
export function lugaresTop25(escuadrones: number): number {
  if (escuadrones <= 1) return 1
  return Math.floor(1 + (escuadrones - 1) / 4)
}

/** Cuánto bajó la probabilidad desde su pico hasta el último minuto con dato (fracción, ≥ 0). */
export function caidaDesdePico(minutos: Minuto[]): number | null {
  const valores = minutos.map((m) => m.probabilidad).filter((p): p is number => p != null)
  if (valores.length === 0) return null
  return Math.max(...valores) - valores[valores.length - 1]
}

// Un golpe fuerte: la salud media baja al menos esto en un minuto.
const UMBRAL_GOLPE = 25

export type EventoMinuto = {
  minuto: number
  /** Compañeros perdidos respecto del minuto anterior (0 si ninguno). */
  bajas: number
  /** Puntos de salud perdidos en un golpe fuerte; null si no hubo golpe. */
  golpe: number | null
}

/**
 * Bajas y golpes fuertes minuto a minuto. `salud` promedia solo a los vivos:
 * cuando cae un compañero la media puede subir o bajar sin que nadie reciba
 * daño, así que un golpe solo cuenta en minutos sin cambio de vivos.
 */
export function eventosPorMinuto(minutos: Minuto[]): EventoMinuto[] {
  const ordenados = [...minutos].sort((a, b) => a.minuto - b.minuto)
  const eventos: EventoMinuto[] = []
  for (let i = 1; i < ordenados.length; i++) {
    const anterior = ordenados[i - 1]
    const actual = ordenados[i]
    const bajas = Math.max(0, anterior.vivos - actual.vivos)
    const caidaSalud = anterior.salud - actual.salud
    const golpe = bajas === 0 && caidaSalud >= UMBRAL_GOLPE ? caidaSalud : null
    if (bajas > 0 || golpe != null) eventos.push({ minuto: actual.minuto, bajas, golpe })
  }
  return eventos
}

function mediana(valores: number[]): number {
  const ordenados = [...valores].sort((a, b) => a - b)
  const medio = Math.floor(ordenados.length / 2)
  return ordenados.length % 2 ? ordenados[medio] : (ordenados[medio - 1] + ordenados[medio]) / 2
}

export type EstadoFase = { fase: number; salud: number; vivos: number; dist_rel: number; minutos: number }

/**
 * Mediana de salud, compañeros en pie y distancia al círculo del escuadrón
 * en cada fase que vivió. Mediana y no promedio: la referencia
 * (`metricas.referencia_fase`) es la mediana de los que llegaron al top.
 */
export function estadoPorFase(minutos: Minuto[]): EstadoFase[] {
  const porFase = new Map<number, Minuto[]>()
  for (const m of minutos) porFase.set(m.fase, [...(porFase.get(m.fase) ?? []), m])
  return [...porFase.entries()]
    .sort(([a], [b]) => a - b)
    .map(([fase, ms]) => ({
      fase,
      salud: mediana(ms.map((m) => m.salud)),
      vivos: mediana(ms.map((m) => m.vivos)),
      dist_rel: mediana(ms.map((m) => m.dist_rel)),
      minutos: ms.length,
    }))
}
