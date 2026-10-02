// Tipos de los JSON precalculados en public/datos/, verificados contra los
// archivos reales generados por el notebook (200 escuadrones de 45 partidas
// del conjunto de prueba; el corpus completo tiene 150 partidas).

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
  // en el catálogo, insuficiente para asumir el conjunto completo.
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

/**
 * Probabilidad media de la partida recalculada por el modelo alterando una sola
 * variable. `aplica === false`: el escuadrón ya estaba en ese valor, y
 * `probabilidad_alterna`/`diferencia` vienen en `null`.
 */
export type Escenario = {
  escenario: string
  probabilidad_base: number
  probabilidad_alterna: number | null
  diferencia: number | null
  aplica: boolean
}

/** Punto en coordenadas normalizadas del mapa (0-1, divididas por el tamaño del mapa, como en el parser). */
export type PuntoMapa = { minuto: number; x: number; y: number }

/** Último estado del círculo dentro de ese minuto; `r` en la misma escala normalizada. */
export type ZonaMapa = PuntoMapa & { r: number }

/** Solo en la partida en vivo: el corpus guarda distancias al círculo, no posiciones. */
export type Mapa = {
  trayectoria: PuntoMapa[]
  zonas: ZonaMapa[]
  /** Bajas del escuadrón, con la posición de quien cayó. */
  eventos: PuntoMapa[]
}

export type Partida = {
  id: string
  match_id: string
  team_id: number
  posicion_final: number
  escuadrones: number
  clasifico: boolean
  /** Integrantes reales del escuadrón (1 a 4); no siempre son cuatro. */
  tam_real?: number
  /** Grupo de estilo de juego (llave de perfiles.json). Solo en el catálogo. */
  grupo_estilo?: number
  minutos: Minuto[]
  informe: Informe
  // Precalculados por el notebook desde la regeneración del 2026-09-16.
  // Opcionales: la partida devuelta en vivo por el servicio de análisis
  // (el análisis en vivo del encabezado) todavía no los incluye, así que el
  // frontend cae de vuelta a calcularlos con `analisisPartida.ts` si faltan.
  percentil?: number
  probabilidad_maxima?: number
  momento_critico?: MomentoCritico
  /** Solo en el corpus: salen de la red recurrente, que el servicio en vivo no usa. */
  escenarios?: Escenario[]
  mapa?: Mapa
  /** Solo en el análisis en vivo: inicio de la partida (ISO 8601, UTC). El corpus no guardó la fecha. */
  fecha?: string | null
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
  /** Precisión promedio en esa fase; su referencia al azar es la tasa base, no 0.5. */
  AP: number
}

/** Un punto de la curva de calibración: probabilidad predicha vs. proporción observada en ese tramo. */
export type PuntoCalibracion = {
  predicha: number
  observada: number
}

/** Curvas de calibración en el conjunto de prueba de los dos modelos que usa la aplicación. */
export type Calibracion = {
  conjunto: string
  red_densa: PuntoCalibracion[]
  /** Ya recalibrada: es la que corresponde a lo que ve el usuario. */
  red_recurrente: PuntoCalibracion[]
  /** La red recurrente antes de recalibrar, para mostrar el antes y el después. */
  red_recurrente_sin_recalibrar?: PuntoCalibracion[]
  recalibracion?: { metodo: string; brier_antes: number; brier_despues: number }
}

/** Proporción de las eliminaciones del corpus por causa; las categorías suman 1, incluida «Otros». */
export type CausaEliminacion = {
  causa: string
  proporcion: number
}

/** Importancia por permutación de cada predictor, de mayor a menor. */
export type Importancia = {
  modelo: string
  metrica: string
  variables: { variable: string; importancia: number; desviacion: number }[]
}

/** Probabilidad media por minuto de los escuadrones del conjunto de prueba que llegaron al top. */
export type PuntoReferencia = {
  minuto: number
  probabilidad: number
  escuadrones: number
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
  calibracion: Calibracion
  causas_eliminacion?: CausaEliminacion[]
  importancia?: Importancia
  curva_referencia?: PuntoReferencia[]
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
