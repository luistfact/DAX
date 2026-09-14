// Tipos de los JSON precalculados en public/datos/, verificados contra los
// archivos reales generados por el notebook (40 partidas, 150 en el corpus).

/** Estado del escuadrón en un minuto de la ventana de 15 min observada. */
export type Minuto = {
  minuto: number
  /** Puede ser `null`: la celda de exportación la marca así cuando el modelo de red recurrente no está disponible (DISPONIBLE_TF = False). */
  probabilidad: number | null
  vivos: number
  salud: number
  dist_rel: number
  fase: number
  equipos_vivos: number
  /** Ausentes en el export actual (no hay x_norm/y_norm en la tabla); se incluyen por si una futura exportación sí trae posición en el mapa. */
  x?: number | null
  y?: number | null
}

/** Informe generado por `generar_resumen` para una partida. */
export type Informe = {
  // No se tipa como unión literal: solo se observaron 5 valores de veredicto
  // y 3 de confianza en 40 partidas, insuficiente para asumir el conjunto completo.
  veredicto: string
  resumen: string
  momento_critico: string
  factores_favorables: string[]
  factores_adversos: string[]
  recomendaciones: string[]
  confianza: string
  _origen: string
}

export type Partida = {
  id: string
  match_id: string
  team_id: number
  posicion_final: number
  escuadrones: number
  clasifico: boolean
  minutos: Minuto[]
  informe: Informe
}

export type ModeloMetrica = {
  Modelo: string
  AUC: number
  Brier: number
  AP: number
}

export type FaseMetrica = {
  Fase: number
  n: number
  'Tasa base': number
  AUC: number
  Brier: number
}

export type Corpus = {
  partidas: number
  observaciones: number
  escuadrones: number
}

export type Metricas = {
  modelos: ModeloMetrica[]
  por_fase: FaseMetrica[]
  corpus: Corpus
}

/** Valor de cada característica de estilo de juego, con la característica como llave. */
export type CentroCaracteristicas = Record<string, number>

export type GrupoPerfil = {
  grupo: number
  n: number
  mediana_pct_rank: number
  centro: CentroCaracteristicas
}

export type Perfiles = {
  caracteristicas: string[]
  grupos: GrupoPerfil[]
  promedio_general: CentroCaracteristicas
}
