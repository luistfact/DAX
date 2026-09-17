import {
  PolarAngleAxis,
  PolarGrid,
  PolarRadiusAxis,
  Radar,
  RadarChart,
  ResponsiveContainer,
  Tooltip,
} from 'recharts'
import type { TooltipContentProps } from 'recharts'
import type { Perfiles } from '../types/datos'
import { EstadoVacio } from './EstadoVacio'
import { COLOR_ACENTO, COLOR_CONTEXTO, COLOR_CUADRICULA, COLOR_TINTA_SECUNDARIA } from '../colores'

type Props = {
  perfiles: Perfiles | null
}

const COLOR_GRUPO = COLOR_ACENTO
const COLOR_PROMEDIO = COLOR_CONTEXTO

// Etiquetas de presentación para las llaves técnicas de caracteristicas.json;
// si aparece una característica nueva no traducida, se muestra tal cual.
const ETIQUETAS: Record<string, string> = {
  hp_apertura: 'Salud inicial',
  dist_apertura: 'Distancia inicial a zona',
  movilidad: 'Movilidad',
  var_dist: 'Variabilidad de distancia',
  var_mov: 'Variabilidad de movimiento',
}

type FilaRadar = {
  caracteristica: string
  grupoNorm: number
  promedioNorm: number
  grupoReal: number
  promedioReal: number
}

/**
 * Normaliza cada característica a 0-100 usando el mínimo y máximo observados
 * entre todos los grupos y el promedio general. Las características vienen en
 * escalas muy distintas (p. ej. salud 0-100 vs. variabilidad 0-1) y un radar
 * de Recharts usa un solo eje radial compartido, así que sin normalizar por
 * eje una característica de escala pequeña se vería plana. Los valores reales
 * se conservan para el tooltip.
 */
function construirFilas(perfiles: Perfiles, grupo: Perfiles['grupos'][number]): FilaRadar[] {
  return perfiles.caracteristicas.map((car) => {
    const valores = [
      ...perfiles.grupos.map((g) => g.centro[car]),
      perfiles.promedio_general[car],
    ]
    const min = Math.min(...valores)
    const max = Math.max(...valores)
    const normalizar = (v: number) => (max > min ? ((v - min) / (max - min)) * 100 : 50)

    return {
      caracteristica: car,
      grupoNorm: normalizar(grupo.centro[car]),
      promedioNorm: normalizar(perfiles.promedio_general[car]),
      grupoReal: grupo.centro[car],
      promedioReal: perfiles.promedio_general[car],
    }
  })
}

function PanelHover({ active, payload }: TooltipContentProps) {
  if (!active || !payload || payload.length === 0) return null
  const fila = payload[0].payload as FilaRadar
  const etiqueta = ETIQUETAS[fila.caracteristica] ?? fila.caracteristica

  return (
    <div className="rounded-md border border-tinta-secundaria/20 bg-superficie p-3 text-sm shadow-md">
      <p className="font-medium text-tinta">{etiqueta}</p>
      <p style={{ color: COLOR_GRUPO }}>Grupo: {fila.grupoReal}</p>
      <p style={{ color: COLOR_PROMEDIO }}>Promedio general: {fila.promedioReal}</p>
    </div>
  )
}

function TarjetaGrupo({ perfiles, grupo }: { perfiles: Perfiles; grupo: Perfiles['grupos'][number] }) {
  const filas = construirFilas(perfiles, grupo)

  return (
    <div className="rounded-lg border border-tinta-secundaria/15 bg-superficie p-4">
      <div className="mb-2 flex items-baseline justify-between">
        <h3 className="text-sm font-medium text-tinta">{grupo.nombre}</h3>
        <span className="text-xs text-tinta-secundaria">
          {grupo.n} escuadrones · percentil mediano {Math.round(grupo.mediana_pct_rank * 100)}%
        </span>
      </div>
      <ResponsiveContainer width="100%" height={240}>
        <RadarChart data={filas}>
          <PolarGrid stroke={COLOR_CUADRICULA} />
          <PolarAngleAxis
            dataKey="caracteristica"
            tick={{ fontSize: 11, fill: COLOR_TINTA_SECUNDARIA }}
            tickFormatter={(v: string) => ETIQUETAS[v] ?? v}
          />
          <PolarRadiusAxis domain={[0, 100]} tick={false} axisLine={false} />
          <Tooltip content={PanelHover} />
          <Radar
            name="Promedio general"
            dataKey="promedioNorm"
            stroke={COLOR_PROMEDIO}
            fill={COLOR_PROMEDIO}
            fillOpacity={0.15}
            isAnimationActive
          />
          <Radar
            name="Grupo"
            dataKey="grupoNorm"
            stroke={COLOR_GRUPO}
            fill={COLOR_GRUPO}
            fillOpacity={0.25}
            isAnimationActive
          />
        </RadarChart>
      </ResponsiveContainer>
      <p className="text-sm text-tinta-secundaria">{grupo.descripcion}</p>
    </div>
  )
}

/** Radar comparando el centro de cada grupo de estilo de juego contra el promedio general. */
export function PerfilesRadar({ perfiles }: Props) {
  if (!perfiles) {
    return (
      <EstadoVacio mensaje="Aún no hay perfiles cargados. Genera public/datos/perfiles.json desde el notebook." />
    )
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-4 text-xs text-tinta-secundaria">
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-2.5 w-2.5 rounded-sm" style={{ backgroundColor: COLOR_GRUPO }} />
          Grupo
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-2.5 w-2.5 rounded-sm" style={{ backgroundColor: COLOR_PROMEDIO }} />
          Promedio general
        </span>
      </div>
      <p className="text-xs text-tinta-secundaria">
        Cada eje está normalizado entre el mínimo y el máximo observado para esa característica, para poder
        compararlas en la misma gráfica. Los valores reales aparecen al pasar el cursor.
      </p>
      <div className="grid gap-4 sm:grid-cols-2">
        {perfiles.grupos.map((grupo) => (
          <TarjetaGrupo key={grupo.grupo} perfiles={perfiles} grupo={grupo} />
        ))}
      </div>
    </div>
  )
}
