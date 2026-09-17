import type { Partida } from './types/datos'
import { clasificarForma, magnitudDesplome, magnitudRemontada, nivelDominante, type Forma } from './forma'

export type GrupoDestacado = {
  forma: Extract<Forma, 'Desplome' | 'Remontada' | 'Dominante'>
  titulo: string
  partidas: Partida[]
}

const CANTIDAD_POR_GRUPO = 3

/**
 * Casos destacados de la pestaña Partida: 3 partidas por forma, elegidas por
 * qué tan extremo es el rasgo que define esa forma (documentado en CLAUDE.md):
 * - Desplome: mayor caída entre el mejor momento y el cierre.
 * - Remontada: mayor recuperación entre el peor momento y el cierre.
 * - Dominante: mayor probabilidad promedio sostenida en toda la curva.
 */
export function elegirDestacados(partidas: Partida[]): GrupoDestacado[] {
  const clasificadas = partidas.map((p) => ({ partida: p, forma: clasificarForma(p.minutos) }))

  const porPuntaje = (
    forma: Forma,
    puntuar: (minutos: Partida['minutos']) => number,
  ): Partida[] =>
    clasificadas
      .filter((c) => c.forma === forma)
      .sort((a, b) => puntuar(b.partida.minutos) - puntuar(a.partida.minutos))
      .slice(0, CANTIDAD_POR_GRUPO)
      .map((c) => c.partida)

  return [
    {
      forma: 'Desplome',
      titulo: '¿Cómo se pierde una partida ganada?',
      partidas: porPuntaje('Desplome', magnitudDesplome),
    },
    {
      forma: 'Remontada',
      titulo: '¿Cómo se remonta?',
      partidas: porPuntaje('Remontada', magnitudRemontada),
    },
    {
      forma: 'Dominante',
      titulo: '¿Cómo se ve una partida dominada?',
      partidas: porPuntaje('Dominante', nivelDominante),
    },
  ]
}
