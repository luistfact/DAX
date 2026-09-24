// Imagen para compartir: composición propia dibujada con Canvas 2D desde los
// datos de la partida, no una captura de la pantalla. Así no depende de cómo
// una librería rasterice el SVG de Recharts, y no suma dependencias.
import type { Partida } from './types/datos'
import { enriquecerParaAsistente } from './analisisPartida'
import { LABEL_PROBABILIDAD_TOP25 } from './texto'
import { COLOR_FONDO, COLOR_PELIGRO, COLOR_SUPERFICIE, COLOR_TINTA, COLOR_TINTA_SECUNDARIA, COLOR_ZONA } from './colores'

const LADO = 1080 // cuadrado: funciona en la mayoría de redes sin recorte
const MARGEN = 72
const CIFRA = '"Barlow Condensed", sans-serif'
const TEXTO = '"Inter", sans-serif'

/** El canvas solo usa una fuente web si ya está cargada; si no, cae en silencio a la genérica. */
async function cargarFuentes(): Promise<void> {
  await Promise.all([
    document.fonts.load(`700 160px ${CIFRA}`),
    document.fonts.load(`600 64px ${CIFRA}`),
    document.fonts.load(`400 30px ${TEXTO}`),
    document.fonts.load(`600 30px ${TEXTO}`),
  ])
}

function dibujarCurva(ctx: CanvasRenderingContext2D, partida: Partida, minutoCritico: number | null) {
  const x0 = MARGEN + 60
  const x1 = LADO - MARGEN
  const y0 = 470
  const y1 = 860
  const minutos = partida.minutos
  const primero = minutos[0]?.minuto ?? 0
  const ultimo = minutos[minutos.length - 1]?.minuto ?? 1
  const escalaX = (m: number) => x0 + ((m - primero) / Math.max(1, ultimo - primero)) * (x1 - x0)
  const escalaY = (p: number) => y1 - p * (y1 - y0)

  ctx.fillStyle = COLOR_TINTA_SECUNDARIA
  ctx.font = `400 26px ${TEXTO}`
  ctx.textBaseline = 'alphabetic'
  ctx.fillText(LABEL_PROBABILIDAD_TOP25, MARGEN, y0 - 40)

  // Cuadrícula en 0, 50 y 100 %: suficiente para leer la forma, no para medir.
  ctx.textAlign = 'right'
  ctx.textBaseline = 'middle'
  for (const p of [0, 0.5, 1]) {
    ctx.strokeStyle = 'rgba(139, 150, 168, 0.2)'
    ctx.lineWidth = 2
    ctx.beginPath()
    ctx.moveTo(x0, escalaY(p))
    ctx.lineTo(x1, escalaY(p))
    ctx.stroke()
    ctx.fillText(`${Math.round(p * 100)} %`, x0 - 14, escalaY(p))
  }
  ctx.textAlign = 'center'
  ctx.textBaseline = 'top'
  ctx.fillText(`min ${primero}`, x0, y1 + 16)
  ctx.fillText(`min ${ultimo}`, x1, y1 + 16)

  // La línea se corta donde la probabilidad es nula: no se inventan tramos.
  ctx.strokeStyle = COLOR_ZONA
  ctx.lineWidth = 6
  ctx.lineJoin = 'round'
  ctx.lineCap = 'round'
  ctx.beginPath()
  let enTrazo = false
  for (const m of minutos) {
    if (m.probabilidad == null) {
      enTrazo = false
      continue
    }
    const [x, y] = [escalaX(m.minuto), escalaY(m.probabilidad)]
    if (enTrazo) ctx.lineTo(x, y)
    else ctx.moveTo(x, y)
    enTrazo = true
  }
  ctx.stroke()

  const critico = minutos.find((m) => m.minuto === minutoCritico && m.probabilidad != null)
  if (critico?.probabilidad != null) {
    ctx.fillStyle = COLOR_PELIGRO
    ctx.strokeStyle = COLOR_FONDO
    ctx.lineWidth = 5
    ctx.beginPath()
    ctx.arc(escalaX(critico.minuto), escalaY(critico.probabilidad), 14, 0, Math.PI * 2)
    ctx.fill()
    ctx.stroke()
  }
}

/** Dibuja la composición cuadrada completa sobre un canvas nuevo. */
export async function dibujarImagen(partidaOriginal: Partida): Promise<HTMLCanvasElement> {
  await cargarFuentes()
  const partida = enriquecerParaAsistente(partidaOriginal)
  const canvas = document.createElement('canvas')
  canvas.width = LADO
  canvas.height = LADO
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('Canvas 2D no disponible')

  ctx.fillStyle = COLOR_FONDO
  ctx.fillRect(0, 0, LADO, LADO)
  ctx.strokeStyle = COLOR_SUPERFICIE
  ctx.lineWidth = 16
  ctx.strokeRect(8, 8, LADO - 16, LADO - 16)

  // Posición final como cifra héroe, con el resultado en el color de su significado.
  ctx.textAlign = 'left'
  ctx.textBaseline = 'alphabetic'
  ctx.fillStyle = COLOR_TINTA_SECUNDARIA
  ctx.font = `600 28px ${TEXTO}`
  ctx.fillText('TERMINÓ', MARGEN, MARGEN + 28)
  ctx.fillStyle = COLOR_TINTA
  ctx.font = `700 170px ${CIFRA}`
  ctx.fillText(`${partida.posicion_final}° de ${partida.escuadrones}`, MARGEN, MARGEN + 190)
  ctx.fillStyle = partida.clasifico ? COLOR_ZONA : COLOR_PELIGRO
  ctx.font = `600 34px ${TEXTO}`
  ctx.fillText(partida.clasifico ? 'Top 25 % de su partida' : 'Fuera del top 25 %', MARGEN, MARGEN + 245)

  ctx.textAlign = 'right'
  ctx.fillStyle = COLOR_TINTA_SECUNDARIA
  ctx.font = `600 28px ${TEXTO}`
  ctx.fillText('VEREDICTO', LADO - MARGEN, MARGEN + 28)
  ctx.fillStyle = COLOR_TINTA
  ctx.font = `600 72px ${CIFRA}`
  ctx.fillText(partida.informe.veredicto || '—', LADO - MARGEN, MARGEN + 105)
  ctx.textAlign = 'left'

  const critico = partida.momento_critico ?? null
  dibujarCurva(ctx, partida, critico?.minuto ?? null)

  // dibujarCurva deja la alineación centrada; se restablece antes de escribir.
  ctx.textAlign = 'left'
  ctx.textBaseline = 'alphabetic'
  const frase = critico
    ? `Momento crítico: minuto ${critico.minuto}, la probabilidad cayó ${Math.round(Math.abs(critico.caida) * 100)} pts.`
    : 'Momento crítico: —'
  if (critico) {
    // Mismo punto rojo que marca el minuto sobre la curva, como leyenda.
    ctx.fillStyle = COLOR_PELIGRO
    ctx.beginPath()
    ctx.arc(MARGEN + 10, LADO - MARGEN - 30, 10, 0, Math.PI * 2)
    ctx.fill()
  }
  ctx.fillStyle = COLOR_TINTA
  ctx.font = `400 30px ${TEXTO}`
  ctx.fillText(frase, MARGEN + (critico ? 36 : 0), LADO - MARGEN - 20)

  // Firma discreta en la esquina.
  ctx.textAlign = 'right'
  ctx.fillStyle = COLOR_TINTA_SECUNDARIA
  ctx.font = `600 30px ${CIFRA}`
  ctx.fillText('ZonaAzul', LADO - MARGEN, LADO - 30)

  return canvas
}

/** Genera el PNG y lo descarga en el equipo del usuario; no se sube a ningún servicio. */
export async function descargarImagen(partida: Partida): Promise<void> {
  const canvas = await dibujarImagen(partida)
  const blob = await new Promise<Blob | null>((resolver) => canvas.toBlob(resolver, 'image/png'))
  if (!blob) throw new Error('No se pudo generar la imagen')
  const url = URL.createObjectURL(blob)
  const enlace = document.createElement('a')
  enlace.href = url
  enlace.download = `zonaazul-${partida.id}.png`
  enlace.click()
  // Se libera después: revocar en el mismo tick puede cancelar la descarga en algunos navegadores.
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}
