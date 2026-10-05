import type { Minuto, Partida, Perfiles } from './types/datos'
import { clasificarForma, magnitudDesplome, magnitudRemontada, nivelCorta, nivelDominante, nivelRenida, type Forma } from './forma'

export type Filtro = 'Todas' | 'Desplome' | 'Remontada' | 'Dominante'

export const FILTROS: { id: Filtro; etiqueta: string }[] = [
  { id: 'Todas', etiqueta: 'Todas' },
  { id: 'Desplome', etiqueta: 'Desplomes' },
  { id: 'Remontada', etiqueta: 'Remontadas' },
  { id: 'Dominante', etiqueta: 'Dominadas' },
]

/**
 * Dentro de cada categoría, primero los casos más claros (documentado en
 * CLAUDE.md): Desplome por cuánto cayó desde su máximo, Remontada por cuánto
 * recuperó tras la caída, Dominante por sus posibilidades promedio, Reñida por
 * qué tan pegada a la mediana anduvo y las partidas muy cortas, las más
 * cortas primero.
 */
const PUNTAJE: Record<Forma, (minutos: Minuto[]) => number> = {
  Desplome: magnitudDesplome,
  Remontada: magnitudRemontada,
  Dominante: nivelDominante,
  Reñida: nivelRenida,
  'Partida muy corta': nivelCorta,
}

/** Secciones de la lista con «Todas»: las de pastilla primero y las partidas muy cortas al final. */
export const SECCIONES: { forma: Forma; titulo: string }[] = [
  { forma: 'Desplome', titulo: 'Desplomes' },
  { forma: 'Remontada', titulo: 'Remontadas' },
  { forma: 'Dominante', titulo: 'Dominadas' },
  { forma: 'Reñida', titulo: 'Reñidas' },
  { forma: 'Partida muy corta', titulo: 'Partidas muy cortas' },
]

/** Las entradas de una categoría, del caso más claro al menos claro. */
function porClaridad(catalogo: EntradaCatalogo[], forma: Forma): EntradaCatalogo[] {
  const puntuar = PUNTAJE[forma]
  return catalogo
    .filter((e) => e.forma === forma)
    .sort((a, b) => puntuar(b.partida.minutos) - puntuar(a.partida.minutos))
}

/** La lista agrupada del filtro «Todas»: una sección por categoría, sin las vacías. */
export function agruparCatalogo(catalogo: EntradaCatalogo[]) {
  return SECCIONES.map((s) => ({ ...s, entradas: porClaridad(catalogo, s.forma) })).filter((s) => s.entradas.length > 0)
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
  return filtro === 'Todas' ? catalogo : porClaridad(catalogo, filtro)
}

/** «Partida 7 · Escuadrón 12»: una partida tiene varios escuadrones, así que el nombre lleva los dos. */
export function nombreEscuadron(entrada: Pick<EntradaCatalogo, 'numero' | 'partida'>): string {
  return `Partida ${entrada.numero} · Escuadrón ${entrada.partida.team_id}`
}
