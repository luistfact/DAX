// Diccionario de lenguaje: traduce el vocabulario del modelo al del juego.
// Centralizado para no repetir las mismas reglas de traducción en cada componente.

export const LABEL_EQUIPOS_EN_PARTIDA = 'Equipos en la partida'
export const LABEL_MINUTOS_ANALIZADOS = 'Minutos analizados'
export const LABEL_COMPANEROS_EN_PIE = 'Compañeros en pie'
export const LABEL_SALUD_EQUIPO = 'Salud del equipo'
export const LABEL_FASE_CIRCULO = 'Fase del círculo'
export const LABEL_PROBABILIDAD_TOP25 = 'Probabilidad de llegar al top 25 %'

/** Frase propia para el primer lugar (Parte 5): celebra sin repetir el eslogan del juego. */
export const FRASE_VICTORIA = 'Fuiste el último equipo en pie: la zona entera terminó siendo tuya.'

// "Impulso gradiente" es el nombre que trae metricas.json: una traducción
// literal poco usada. Se glosa la primera vez que aparece y luego se usa el
// término con el que se conoce.
const NOMBRE_MODELO: Record<string, { primera: string; siguientes: string }> = {
  'Impulso gradiente': {
    primera: 'Potenciación del gradiente (gradient boosting)',
    siguientes: 'Gradient boosting',
  },
}

/** Nombre de presentación de un modelo; `primeraVez` agrega la glosa en español. */
export function nombreModelo(nombre: string, primeraVez = false): string {
  const alias = NOMBRE_MODELO[nombre]
  if (!alias) return nombre
  return primeraVez ? alias.primera : alias.siguientes
}

// Nombres de los 11 predictores del modelo en el lenguaje de la app (para la
// importancia de variables). Uno nuevo se muestra con su nombre técnico.
const ETIQUETA_VARIABLE: Record<string, string> = {
  jugadores_vivos: LABEL_COMPANEROS_EN_PIE,
  hp_medio: LABEL_SALUD_EQUIPO,
  hp_minimo: 'Salud del más herido',
  tam_real: 'Tamaño del escuadrón',
  dist_rel: 'Distancia al círculo',
  dist_centro: 'Distancia al centro de la zona',
  frac_fuera: 'Tiempo fuera de la zona',
  radio_zona: 'Tamaño de la zona',
  fase_zona: 'Fase del círculo',
  equipos_vivos: 'Equipos restantes',
  desplazamiento: 'Desplazamiento',
}

/** Nombre legible de un predictor del modelo. */
export function etiquetaVariable(variable: string): string {
  return ETIQUETA_VARIABLE[variable] ?? variable
}

/** Fase del círculo rotulada igual en toda la app: «F1» a «F6». */
export function rotuloFase(fase: number): string {
  return `F${fase}`
}
