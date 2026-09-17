// Paleta con significado (Parte 5 del rediseño): dos acentos —uno frío para la
// zona segura, uno cálido para el peligro y las caídas de probabilidad— sobre
// un fondo oscuro. Validada con el skill de dataviz
// (node scripts/validate_palette.js "#2f8fd1,#d9603f" --mode dark --surface "#0d1420"):
// banda de luminosidad, piso de croma, separación CVD (ΔE 21-32) y contraste
// contra la superficie, todo en verde. Documentada en CLAUDE.md.
export const COLOR_FONDO = '#0d1420'
export const COLOR_SUPERFICIE = '#141d2e'
export const COLOR_TINTA = '#e8ecf1'
export const COLOR_TINTA_SECUNDARIA = '#8b96a8'
export const COLOR_ZONA = '#2f8fd1'
export const COLOR_PELIGRO = '#d9603f'

// Nombres usados por las gráficas existentes (patrón "emphasis": acento + gris
// de contexto). Se mantienen para no tocar cada gráfica, mapeados a la paleta.
export const COLOR_ACENTO = COLOR_ZONA
export const COLOR_CONTEXTO = COLOR_TINTA_SECUNDARIA

// Color de líneas de cuadrícula sobre el fondo oscuro: tinta secundaria muy tenue.
export const COLOR_CUADRICULA = 'rgba(139, 150, 168, 0.15)'
