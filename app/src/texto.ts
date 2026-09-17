// Diccionario de lenguaje: traduce el vocabulario del modelo al del juego.
// Centralizado para no repetir las mismas reglas de traducción en cada componente.

export const LABEL_EQUIPOS_EN_PARTIDA = 'Equipos en la partida'
export const LABEL_MINUTOS_ANALIZADOS = 'Minutos analizados'
export const LABEL_COMPANEROS_EN_PIE = 'Compañeros en pie'
export const LABEL_SALUD_EQUIPO = 'Salud del equipo'
export const LABEL_CIERRE_ZONA = 'Cierre de la zona'
export const LABEL_PROBABILIDAD_TOP25 = 'Probabilidad de llegar al top 25 %'

export const AYUDA_TOP25 =
  'El cuarto superior de esa partida: con 24 equipos en la partida, son los 6 primeros lugares.'

/** Frase propia para el primer lugar (Parte 5): celebra sin repetir el eslogan del juego. */
export const FRASE_VICTORIA = 'Fuiste el último equipo en pie: la zona entera terminó siendo tuya.'

/** La fase del círculo tal como la vive el jugador ("3 de 6"), no un índice técnico suelto. */
export function formatCierre(fase: number): string {
  return `${fase} de 6`
}

/** "Top 25 % · Terminó 4° de 21", o su contraparte cuando no llega al cuarto superior. */
export function formatResultado(posicionFinal: number, escuadrones: number, clasifico: boolean): string {
  const etiqueta = clasifico ? 'Top 25 %' : 'Fuera del top 25 %'
  return `${etiqueta} · Terminó ${posicionFinal}° de ${escuadrones}`
}
