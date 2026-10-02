import { motion } from 'motion/react'
import type { Perfiles } from '../types/datos'
import { useAnimarUnaVez } from '../hooks/useAnimarUnaVez'
import { DURACION, useTransicion } from '../movimiento'
import { colorPerfil } from '../estiloPerfil'
import { usePaleta } from '../hooks/useTema'

type Props = {
  perfiles: Perfiles
  grupo: Perfiles['grupos'][number]
  tamano?: number
}

/**
 * Posición 0-1 de cada característica, con el mismo mínimo y máximo para los
 * cuatro perfiles (los cuatro grupos y el promedio general): si cada radar se
 * normalizara por su cuenta, las huellas no serían comparables entre sí.
 */
function normalizar(perfiles: Perfiles, grupo: Props['grupo']): number[] {
  return perfiles.caracteristicas.map((c) => {
    const valores = [...perfiles.grupos.map((g) => g.centro[c]), perfiles.promedio_general[c]]
    const min = Math.min(...valores)
    const max = Math.max(...valores)
    return max > min ? (grupo.centro[c] - min) / (max - min) : 0.5
  })
}

/**
 * Huella del perfil: un radar pequeño en su color. Es una insignia de
 * identidad, no un gráfico para leer cifras; las cifras están en las barras
 * de la pestaña Perfiles.
 */
export function HuellaPerfil({ perfiles, grupo, tamano = 72 }: Props) {
  const paleta = usePaleta()
  const color = colorPerfil(grupo.nombre, paleta)
  // Crece desde el centro la primera vez que aparece cada huella; no al volver.
  const crecer = useAnimarUnaVez(`huella-${grupo.nombre}-${tamano}`)
  const { transicion } = useTransicion()
  const valores = normalizar(perfiles, grupo)
  const n = valores.length
  const radio = 40
  // Un mínimo de 15 % del radio: un eje en cero no colapsa la forma al centro.
  const punto = (i: number, v: number) => {
    const angulo = -Math.PI / 2 + (2 * Math.PI * i) / n
    const r = radio * (0.15 + 0.85 * v)
    return `${(r * Math.cos(angulo)).toFixed(1)},${(r * Math.sin(angulo)).toFixed(1)}`
  }
  const contorno = (v: number) => Array.from({ length: n }, (_, i) => punto(i, v)).join(' ')

  return (
    <svg width={tamano} height={tamano} viewBox="-48 -48 96 96" aria-hidden="true" className="shrink-0">
      <polygon points={contorno(1)} fill="none" stroke={paleta.line} strokeWidth={1} />
      <polygon points={contorno(0.5)} fill="none" stroke={paleta.line} strokeWidth={1} strokeDasharray="2 2" />
      <motion.polygon
        // El centro del radar es el origen del viewBox: escala desde ahí, solo transformación.
        style={{ transformOrigin: '0px 0px', transformBox: 'view-box' }}
        initial={crecer ? { scale: 0 } : false}
        animate={{ scale: 1 }}
        transition={transicion(DURACION.grafica)}
        points={valores.map((v, i) => punto(i, v)).join(' ')}
        fill={color}
        fillOpacity={0.3}
        stroke={color}
        strokeWidth={2}
        strokeLinejoin="round"
      />
    </svg>
  )
}
