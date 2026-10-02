// Formatos numéricos únicos para toda la app: misma métrica, mismos decimales,
// y el signo de porcentaje siempre separado por un espacio (fino, no separable).

const NBSP = ' '
const MENOS = '−'

const enteros = new Intl.NumberFormat('es-MX', { maximumFractionDigits: 0 })

/** Separador de miles: 3862 -> "3,862". */
export function miles(n: number | null | undefined): string {
  return n == null ? '—' : enteros.format(n)
}

/** Métricas de evaluación (AUC, Brier, AP): siempre tres decimales. */
export function metrica(n: number | null | undefined): string {
  return n == null ? '—' : n.toFixed(3)
}

/** Nivel de probabilidad (0-1) como porcentaje: 0.37 -> "37 %". */
export function pct(p: number | null | undefined): string {
  return p == null ? '—' : `${Math.round(p * 100)}${NBSP}%`
}

/** Un valor que ya viene en escala 0-100: 85 -> "85 %". */
export function pct100(n: number | null | undefined): string {
  return n == null ? '—' : `${Math.round(n)}${NBSP}%`
}

/**
 * Diferencia entre dos probabilidades, en puntos: de 79 % a 37 % son 42
 * puntos. Decir "cayó 42 %" se leería como caída relativa (53 %); «puntos»
 * evita esa ambigüedad sin la jerga de «pp» (decisión del usuario).
 */
export function pp(d: number | null | undefined, { signo = false } = {}): string {
  if (d == null) return '—'
  const puntos = Math.round(Math.abs(d) * 100)
  const prefijo = !signo || puntos === 0 ? '' : d > 0 ? '+' : MENOS
  return `${prefijo}${puntos}${NBSP}${puntos === 1 ? 'punto' : 'puntos'}`
}

/**
 * Distancia al círculo en palabras de jugador. `d` es la distancia al centro
 * dividida entre el radio de la zona: 0 es el centro, 1 el borde, más de 1
 * fuera. La cifra va como parte del camino del centro al borde.
 */
export function distanciaCirculo(d: number | null | undefined): string {
  if (d == null) return '—'
  if (d > 1) return 'Fuera de la zona'
  const camino = `${Math.round(d * 100)}${NBSP}% del camino al borde`
  if (d <= 0.33) return `Dentro de la zona, cerca del centro (${camino})`
  if (d <= 0.66) return `Dentro de la zona, a medio camino del borde (${camino})`
  return `Dentro de la zona, cerca del borde (${camino})`
}

/** Cambio de distancia al círculo entre dos minutos, en palabras. */
export function cambioDistancia(actual: number | null | undefined, anterior: number | null | undefined): string {
  if (actual == null || anterior == null) return '—'
  const delta = actual - anterior
  if (Math.abs(delta) < 0.005) return 'Sin cambio'
  const tramo = `${Math.round(Math.abs(delta) * 100)}${NBSP}% del camino al borde`
  return delta < 0 ? `Se acercó al centro (${tramo})` : `Se alejó del centro (${tramo})`
}

/**
 * Normaliza el espaciado del porcentaje en textos que vienen ya redactados en
 * los JSON ("el 36% del tiempo" -> "el 36 % del tiempo"). Solo tipografía: no
 * cambia ninguna cifra.
 */
export function espaciarPorcentajes(texto: string): string {
  return texto.replace(/(\d)\s?%/g, `$1${NBSP}%`)
}

// Frases de los textos ya redactados en el JSON (notebook y servicio) que
// llevan jerga, con su versión de jugador. Solo cambian palabras, nunca cifras;
// el resto pasa tal cual.
const FRASES_LLANAS: [RegExp, string][] = [
  [/la probabilidad cayó (\d+) pp/g, 'tus posibilidades bajaron $1 puntos'],
  [/Nunca superó el (\d+)\s?% de probabilidad estimada/g, 'Tus posibilidades nunca pasaron del $1 %'],
  [/Perdió (\d+) pp de probabilidad respecto de su mejor momento/g, 'Perdió $1 puntos de posibilidades desde su mejor momento'],
  [/por encima del (\d+)\s?% de los equipos/g, 'mejor que el $1 % de los equipos'],
  [/(\d+) pp\b/g, '$1 puntos'],
]

/** Texto del JSON en lenguaje de jugador, con el espaciado de porcentaje de la app. */
export function textoLlano(texto: string): string {
  const llano = FRASES_LLANAS.reduce((t, [patron, reemplazo]) => t.replace(patron, reemplazo), texto)
  return espaciarPorcentajes(llano)
}
