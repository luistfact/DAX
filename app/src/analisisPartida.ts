import type { Minuto, ReferenciaFase } from './types/datos'

/**
 * Percentil de la posición final: 0 % para el último lugar, 100 % para el
 * primero. Recalculado en el cliente solo como respaldo: la partida ya trae
 * `percentil` precalculado por el notebook, salvo la que devuelve en vivo el
 * servicio de análisis (pestaña "Analizar mi partida").
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

/** Busca la referencia de esa fase en `metricas.referencia_fase` (mediana real, no un agregado del cliente). */
export function buscarReferenciaFase(referencias: ReferenciaFase[], fase: number): ReferenciaFase | null {
  return referencias.find((r) => r.fase_zona === fase) ?? null
}

/** "N de M minutos analizados" -> proporción, para colorear la cobertura sin inventar una escala nueva. */
export function proporcionCobertura(confianza: string): number | null {
  const coincidencia = /(\d+) de (\d+)/.exec(confianza)
  if (!coincidencia) return null
  const [, n, total] = coincidencia
  return Number(total) > 0 ? Number(n) / Number(total) : null
}
