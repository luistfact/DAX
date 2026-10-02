import type { Minuto, Partida, Perfiles } from './types/datos'
import { clasificarForma, magnitudDesplome, magnitudRemontada, nivelDominante, type Forma } from './forma'

export type Filtro = 'Todas' | 'Desplome' | 'Remontada' | 'Dominante'

export const FILTROS: { id: Filtro; etiqueta: string }[] = [
  { id: 'Todas', etiqueta: 'Todas' },
  { id: 'Desplome', etiqueta: 'Desplomes' },
  { id: 'Remontada', etiqueta: 'Remontadas' },
  { id: 'Dominante', etiqueta: 'Dominadas' },
]

/**
 * Dentro de cada filtro, primero los casos más claros de esa forma (documentado
 * en CLAUDE.md): Desplome por la caída entre su mejor momento y el cierre,
 * Remontada por la recuperación desde su peor momento, Dominante por la
 * probabilidad promedio sostenida en toda la curva.
 */
const PUNTAJE: Record<Exclude<Filtro, 'Todas'>, (minutos: Minuto[]) => number> = {
  Desplome: magnitudDesplome,
  Remontada: magnitudRemontada,
  Dominante: nivelDominante,
}

export type EntradaCatalogo = {
  partida: Partida
  forma: Forma
  /** Número de la partida (1 a N) en el catálogo; varios escuadrones comparten número. */
  numero: number
  /** Perfil de estilo de juego (por `grupo_estilo`); null si la partida no lo trae. */
  perfil: string | null
}

/**
 * Numera las partidas por orden de `match_id`: el corpus no guardó la fecha,
 * y un orden fijo hace que «Partida 7» sea siempre la misma entre visitas.
 */
export function construirCatalogo(partidas: Partida[], perfiles: Perfiles | null): EntradaCatalogo[] {
  const ids = [...new Set(partidas.map((p) => p.match_id))].sort()
  const numeros = new Map(ids.map((id, i) => [id, i + 1]))
  const nombres = new Map(perfiles?.grupos.map((g) => [g.grupo, g.nombre]) ?? [])
  return partidas
    .map((partida) => ({
      partida,
      forma: clasificarForma(partida.minutos),
      numero: numeros.get(partida.match_id) ?? 0,
      perfil: partida.grupo_estilo != null ? (nombres.get(partida.grupo_estilo) ?? null) : null,
    }))
    .sort((a, b) => a.numero - b.numero || a.partida.posicion_final - b.partida.posicion_final)
}

/** Entradas de un filtro, en el orden en que se muestran. */
export function filtrarCatalogo(catalogo: EntradaCatalogo[], filtro: Filtro): EntradaCatalogo[] {
  if (filtro === 'Todas') return catalogo
  const puntuar = PUNTAJE[filtro]
  return catalogo
    .filter((e) => e.forma === filtro)
    .sort((a, b) => puntuar(b.partida.minutos) - puntuar(a.partida.minutos))
}

/** «Partida 7 · Escuadrón 12»: una partida tiene varios escuadrones, así que el nombre lleva los dos. */
export function nombreEscuadron(entrada: Pick<EntradaCatalogo, 'numero' | 'partida'>): string {
  return `Partida ${entrada.numero} · Escuadrón ${entrada.partida.team_id}`
}
