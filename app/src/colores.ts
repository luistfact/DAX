// Paleta ZonaAzul (PROMPT_BI_COMPLEMENTO.md): carbón con tinte verde militar.
// Cada acento significa una sola cosa:
//   brand  — marca y la acción principal, nada más
//   zone   — la zona, la curva de probabilidad, remontadas y Rotadores
//   danger — desplomes, minuto crítico, bajas y Castigados
//   alive  — compañeros en pie
//   violet — Periféricos;  sand — Centrales
// El texto nunca usa los acentos: va en `text` o `muted`, con una marca de
// color al lado cuando hace falta identidad.
//
// Deben coincidir con los tokens de index.css: las clases de Tailwind leen el
// CSS, y lo que se dibuja desde JS (Recharts, el mapa, el canvas de compartir)
// lee estos objetos.
//
// Validadas con validate_palette.js del skill de dataviz:
//   perfiles oscuro: "#4594F7,#AF62C1,#A0906F,#F75247" --mode dark --surface "#151A18" --pairs all
//   perfiles claro:  "#1069CB,#874197,#8A7A5A,#BE2420" --mode light --surface "#F3F4EE" --pairs all
// Ajustes respecto del complemento: zone y danger, un poco más oscuros para
// entrar en la banda de luminosidad; violet #B38CFF quedaba idéntico al azul
// para protanopía (ΔE 0.6) y pasó a orquídea #AF62C1 (ΔE 8.5). La arena de
// Centrales falla a propósito el mínimo de saturación (se lee casi gris; el
// verde quedó para «compañero en pie») y queda a ΔE 6.2 del rojo para
// deuteranopía: legal solo porque cada perfil lleva además ícono y nombre. Se
// separa del dorado de marca (ΔE 17.0 en oscuro, 23.0 en claro).

export type Paleta = {
  bg: string
  card: string
  card2: string
  line: string
  text: string
  muted: string
  brand: string
  /** Texto sobre el botón de marca: oscuro en ambos temas (9.6:1). */
  onBrand: string
  zone: string
  danger: string
  alive: string
  violet: string
  sand: string
  /** Área bajo la curva de probabilidad. */
  zoneWash: string
  /** Bandas de fase del círculo. */
  phaseBand: string
  /** Banda del minuto crítico. */
  dangerWash: string
  /** Líneas de cuadrícula: muted muy tenue. */
  cuadricula: string
}

export const PALETA_OSCURA: Paleta = {
  bg: '#0C0F0E',
  card: '#151A18',
  card2: '#1D2422',
  line: '#2A3430',
  text: '#ECEFE9',
  muted: '#9BA79F',
  brand: '#F2A900',
  onBrand: '#0C0F0E',
  zone: '#4594F7',
  danger: '#F75247',
  alive: '#3DDC97',
  violet: '#AF62C1',
  sand: '#A0906F',
  zoneWash: 'rgba(69, 148, 247, 0.14)',
  phaseBand: 'rgba(69, 148, 247, 0.07)',
  dangerWash: 'rgba(247, 82, 71, 0.14)',
  cuadricula: 'rgba(155, 167, 159, 0.14)',
}

export const PALETA_CLARA: Paleta = {
  bg: '#F3F4EE',
  card: '#FCFCF8',
  card2: '#ECEEE6',
  line: '#D6D8CB',
  text: '#1B1D17',
  muted: '#5D604F',
  brand: '#F2A900',
  onBrand: '#0C0F0E',
  zone: '#1069CB',
  danger: '#BE2420',
  alive: '#008C56',
  violet: '#874197',
  sand: '#8A7A5A',
  zoneWash: 'rgba(16, 105, 203, 0.12)',
  phaseBand: 'rgba(16, 105, 203, 0.06)',
  dangerWash: 'rgba(190, 36, 32, 0.12)',
  cuadricula: 'rgba(93, 96, 79, 0.16)',
}
