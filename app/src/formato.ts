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
 * Diferencia entre dos probabilidades, en puntos porcentuales. De 79 % a 37 %
 * son 42 pp; decir "cayó 42 %" se leería como caída relativa (53 %).
 */
export function pp(d: number | null | undefined, { signo = false } = {}): string {
  if (d == null) return '—'
  const puntos = Math.round(Math.abs(d) * 100)
  const prefijo = !signo || puntos === 0 ? '' : d > 0 ? '+' : MENOS
  return `${prefijo}${puntos}${NBSP}pp`
}

/**
 * Distancia relativa al círculo (distancia al centro / radio de la zona) en
 * palabras: 1 es el borde, por encima de 1 está fuera.
 */
export function distanciaCirculo(d: number | null | undefined): string {
  if (d == null) return '—'
  const radios = d.toFixed(2)
  if (d > 1) return `Fuera de la zona, a ${radios} radios del centro`
  return `Dentro de la zona, a ${radios} radios del centro`
}

/** Cambio de distancia al círculo entre dos minutos, en palabras y en radios de la zona. */
export function cambioDistancia(actual: number | null | undefined, anterior: number | null | undefined): string {
  if (actual == null || anterior == null) return '—'
  const delta = actual - anterior
  if (Math.abs(delta) < 0.005) return 'Sin cambio'
  const radios = Math.abs(delta).toFixed(2)
  return delta < 0 ? `${radios} radios más cerca del centro` : `${radios} radios más lejos del centro`
}

/**
 * Normaliza el espaciado del porcentaje en textos que vienen ya redactados en
 * los JSON ("el 36% del tiempo" -> "el 36 % del tiempo"). Solo tipografía: no
 * cambia ninguna cifra.
 */
export function espaciarPorcentajes(texto: string): string {
  return texto.replace(/(\d)\s?%/g, `$1${NBSP}%`)
}
