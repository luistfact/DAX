import { Bandage, CircleDot, Crosshair, Eye, Route, type LucideIcon } from 'lucide-react'
import type { Paleta } from './colores'

type ColorPerfil = 'zone' | 'violet' | 'sand' | 'danger'

export type EstiloPerfil = {
  color: ColorPerfil | null
  Icono: LucideIcon
  /** Clase de fondo de Tailwind (escrita completa para que Tailwind la detecte). */
  fondo: string
}

// Un color y un ícono propios por perfil: el ícono es la segunda codificación
// que exige la paleta (la arena y el rojo quedan cerca para deuteranopía).
// Castigados no usa HeartCrack porque en la curva significa «golpe fuerte».
const ESTILOS: Record<string, EstiloPerfil> = {
  Rotadores: { color: 'zone', Icono: Route, fondo: 'bg-zone' },
  Periféricos: { color: 'violet', Icono: Eye, fondo: 'bg-violet' },
  Centrales: { color: 'sand', Icono: Crosshair, fondo: 'bg-sand' },
  Castigados: { color: 'danger', Icono: Bandage, fondo: 'bg-danger' },
}

const NEUTRO: EstiloPerfil = { color: null, Icono: CircleDot, fondo: 'bg-muted' }

/** Estilo de un perfil por su nombre en perfiles.json; un nombre nuevo cae a neutro. */
export function estiloPerfil(nombre: string): EstiloPerfil {
  return ESTILOS[nombre] ?? NEUTRO
}

/** El color del perfil para lo que se dibuja desde JS (SVG, Recharts). */
export function colorPerfil(nombre: string, paleta: Paleta): string {
  const { color } = estiloPerfil(nombre)
  return color ? paleta[color] : paleta.muted
}
