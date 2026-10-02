import type { Partida, Perfiles } from './types/datos'
import { extraerMinutoCritico, percentilDeRango } from './analisisPartida'

export type Pantalla = 'Resumen' | 'Partidas' | 'Perfiles' | 'Metodología'

/**
 * Preguntas sugeridas a Botsito según lo que hay en pantalla, con los datos
 * reales de esa pantalla (el minuto crítico de la partida, el nombre de los
 * perfiles). Solo se sugiere lo que el asistente puede contestar: con partida,
 * sus herramientas; sin partida, la ficha del proyecto.
 */
export function sugerencias(pantalla: Pantalla, partida: Partida | null, perfiles: Perfiles | null): string[] {
  if (partida) {
    const minuto = partida.momento_critico?.minuto ?? extraerMinutoCritico(partida.informe.momento_critico)
    // El momento crítico es la mayor caída entre minutos; si la curva nunca
    // bajó, no hubo caída que explicar.
    const cayo = partida.momento_critico ? partida.momento_critico.caida < 0 : true
    return [
      minuto != null && cayo ? `¿Por qué caí en el minuto ${minuto}?` : '¿Cuál fue el momento clave de la partida?',
      '¿Qué hago la próxima?',
      // El análisis en vivo no trae grupo de estilo: esa herramienta respondería «no disponible».
      'grupo_estilo' in partida ? '¿Cuál es mi estilo de juego?' : '¿Cómo me comparo con los que llegaron al top?',
    ]
  }

  if (pantalla === 'Perfiles' && perfiles && perfiles.grupos.length > 0) {
    const ordenados = [...perfiles.grupos].sort(
      (a, b) => percentilDeRango(b.mediana_pct_rank) - percentilDeRango(a.mediana_pct_rank),
    )
    return [
      `¿Qué distingue a los ${ordenados[0].nombre}?`,
      `¿Qué les pasa a los ${ordenados[ordenados.length - 1].nombre}?`,
      '¿Cómo se formaron los perfiles?',
    ]
  }

  if (pantalla === 'Metodología') {
    return ['¿Qué tan preciso es?', '¿Por qué usan dos modelos?', '¿Qué significa el AUC?']
  }

  return ['¿Esto cómo funciona?', '¿Qué es el top 25 %?', '¿Por qué la zona casi no elimina a nadie?']
}
