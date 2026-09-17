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

/** El minuto y la magnitud (fracción negativa) de la caída de probabilidad que definió la partida. */
export type MomentoCritico = {
  minuto: number
  caida: number
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
  // Precalculados por el notebook desde la regeneración del 2026-09-16.
  // Opcionales: la partida devuelta en vivo por el servicio de análisis
  // (pestaña "Analizar mi partida") todavía no los incluye, así que el
  // frontend cae de vuelta a calcularlos con `analisisPartida.ts` si faltan.
  percentil?: number
  probabilidad_maxima?: number
  momento_critico?: MomentoCritico
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

/** Mediana de salud/compañeros/distancia/desplazamiento de los equipos que llegan al top 25 %, por fase. */
export type ReferenciaFase = {
  fase_zona: number
  hp_medio: number
  jugadores_vivos: number
  dist_rel: number
  desplazamiento: number
}

export type Metricas = {
  modelos: ModeloMetrica[]
  por_fase: FaseMetrica[]
  referencia_fase: ReferenciaFase[]
  corpus: Corpus
}

/** Valor de cada característica de estilo de juego, con la característica como llave. */
export type CentroCaracteristicas = Record<string, number>

export type GrupoPerfil = {
  grupo: number
  nombre: string
  descripcion: string
  n: number
  mediana_pct_rank: number
  centro: CentroCaracteristicas
}

export type Perfiles = {
  caracteristicas: string[]
  grupos: GrupoPerfil[]
  promedio_general: CentroCaracteristicas
}
