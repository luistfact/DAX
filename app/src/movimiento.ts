// Sistema de movimiento de la app (PROMPT_ANIMACION_ORDEN.md): una sola
// familia de aceleración y duraciones fijas por tipo. Todo componente que se
// mueva toma sus valores de aquí.
import { usePrefersReducedMotion } from './hooks/usePrefersReducedMotion'

/**
 * Desaceleración suave, sin rebotes: ease-out, cubic-bezier(0, 0, 0.58, 1).
 * Es la misma curva con el nombre que entiende cada pieza: Motion la llama
 * «easeOut», Recharts y CSS «ease-out».
 */
export const ACELERACION = 'easeOut' as const
export const ACELERACION_RECHARTS = 'ease-out' as const
export const ACELERACION_CSS = 'cubic-bezier(0, 0, 0.58, 1)'

/** Duraciones en segundos (Motion); los milisegundos se derivan de aquí. */
export const DURACION = {
  /** Respuesta a hover o clic. */
  respuesta: 0.18,
  /** Abrir una tarjeta desplegable. */
  abrir: 0.3,
  /** Cerrar una tarjeta: el movimiento inverso, más rápido. */
  cerrar: 0.25,
  /** Salida de la vista al cambiar de pestaña. */
  salidaVista: 0.15,
  /** Entrada de cada elemento de una cascada. */
  elemento: 0.25,
  /** Tope de toda la cascada de una vista, por muchas tarjetas que tenga. */
  cascadaTotal: 0.45,
  /** Números grandes contando desde cero: corto, para que se lean pronto. */
  conteo: 0.45,
  /** Dibujo de gráficas. */
  grafica: 0.7,
  /** Una barra que se desliza de un valor a otro. */
  cambioValor: 0.6,
} as const

export const DURACION_GRAFICA_MS = DURACION.grafica * 1000

/** Cuánto sube un elemento al entrar en cascada, en px. */
export const DESPLAZAMIENTO_ENTRADA = 8

/**
 * Retraso entre elementos de una cascada: si hay muchos se reduce, para que
 * la cascada completa nunca pase de `DURACION.cascadaTotal`.
 */
export function retrasoCascada(cantidad: number): number {
  if (cantidad <= 1) return 0
  return Math.min(0.06, (DURACION.cascadaTotal - DURACION.elemento) / (cantidad - 1))
}

/**
 * Transición de Motion de una duración dada, o instantánea con
 * prefers-reduced-motion: entonces nada se mueve y todo aparece en su estado
 * final.
 */
export function useTransicion() {
  const reducido = usePrefersReducedMotion()
  return {
    reducido,
    transicion: (duracion: number, retraso = 0) =>
      reducido ? { duration: 0 } : { duration: duracion, delay: retraso, ease: ACELERACION },
  }
}
