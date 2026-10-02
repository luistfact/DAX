import type { ReactNode } from 'react'
import { AlertTriangle, ThumbsUp, Trophy } from 'lucide-react'
import type { Partida } from '../types/datos'
import { EstadoVacio } from './EstadoVacio'
import { Escenarios } from './Escenarios'
import { VinetasTop } from './VinetasTop'
import { useMetricas } from '../hooks/useMetricas'
import { FRASE_VICTORIA } from '../texto'
import { cambioDistancia, espaciarPorcentajes } from '../formato'
import {
  extraerMinutoCritico,
  minutosDelMomentoCritico,
  proporcionCobertura,
} from '../analisisPartida'

type Props = {
  partida: Partida | null
}

/**
 * Cobertura ("N de 15 minutos analizados"): neutral salvo cuando es baja. Sin
 * acento de color: el azul y el rojo ya significan otra cosa en la app.
 */
function estiloCobertura(confianza: string): string {
  const proporcion = proporcionCobertura(confianza)
  if (proporcion != null && proporcion < 0.4) return 'border border-muted text-text'
  return 'bg-muted/15 text-muted'
}

function Lista({ items, vacio }: { items: string[]; vacio: string }) {
  if (items.length === 0) {
    return <p className="text-sm text-muted">{vacio}</p>
  }
  return (
    <ul className="list-disc space-y-1 pl-5 text-sm text-text">
      {items.map((item, i) => (
        <li key={i}>{espaciarPorcentajes(item)}</li>
      ))}
    </ul>
  )
}

/**
 * Factores como insignias en cuadrícula: a favor con pulgar arriba en verde,
 * en contra con alerta en rojo. La calavera no: en un juego significa
 * eliminación y queda reservada para las bajas.
 */
function Insignias({ items, tipo, vacio }: { items: string[]; tipo: 'favor' | 'contra'; vacio: string }) {
  if (items.length === 0) {
    return <p className="text-sm text-muted">{vacio}</p>
  }
  const Icono = tipo === 'favor' ? ThumbsUp : AlertTriangle
  const color = tipo === 'favor' ? 'text-alive' : 'text-danger'
  return (
    <ul className="grid gap-2 sm:grid-cols-2">
      {items.map((item, i) => (
        <li key={i} className="flex items-start gap-2 rounded-md border border-line bg-card-2 px-3 py-2 text-sm text-text">
          <Icono className={`mt-0.5 h-4 w-4 shrink-0 ${color}`} aria-hidden="true" />
          {espaciarPorcentajes(item)}
        </li>
      ))}
    </ul>
  )
}

function Pregunta({ titulo, children }: { titulo: string; children: ReactNode }) {
  return (
    <div className="space-y-2">
      <h4 className="text-sm font-semibold text-text">{titulo}</h4>
      {children}
    </div>
  )
}

/** `texto`: el valor es una frase (p. ej. la distancia al círculo en palabras), no una cifra grande. */
function Estadistica({ etiqueta, valor, texto }: { etiqueta: string; valor: string; texto?: boolean }) {
  return (
    <div className="rounded-md bg-text/5 p-2">
      <dt className="etiqueta">{etiqueta}</dt>
      <dd className={texto ? 'pt-1 text-sm font-medium text-text' : 'font-cifra text-2xl font-semibold text-text'}>
        {valor}
      </dd>
    </div>
  )
}

/** Delta con signo, redondeado, con un guion cuando no hay dato (regla del prompt). */
function formatDelta(actual: number | null | undefined, anterior: number | null | undefined): string {
  if (actual == null || anterior == null) return '—'
  const delta = Math.round((actual - anterior) * 10) / 10
  if (delta === 0) return 'sin cambio'
  return delta > 0 ? `+${delta}` : `${delta}`
}

/** Cuántos compañeros se perdieron entre un minuto y el anterior (nunca negativo: no se "ganan"). */
function formatCompanerosPerdidos(actual: number | null | undefined, anterior: number | null | undefined): string {
  if (actual == null || anterior == null) return '—'
  const perdidos = Math.max(0, anterior - actual)
  return perdidos === 0 ? 'ninguno' : `${perdidos}`
}

/** Informe de la partida, reorganizado en las 4 preguntas que le importan al jugador. */
export function Informe({ partida }: Props) {
  const { metricas } = useMetricas()

  if (!partida) {
    return <EstadoVacio mensaje="Selecciona una partida para ver su informe." />
  }

  const { informe } = partida

  // Precalculado por el notebook; la partida en vivo no lo trae y se extrae del texto.
  const minutoCritico = partida.momento_critico?.minuto ?? extraerMinutoCritico(informe.momento_critico)

  const puntosCriticos = minutosDelMomentoCritico(partida.minutos, minutoCritico)

  return (
    <div className="space-y-6 rounded-lg border border-line bg-card p-4">
      <Pregunta titulo="¿Cómo te fue?">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="font-cifra text-2xl font-semibold text-text">{informe.veredicto}</h3>
          <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${estiloCobertura(informe.confianza)}`}>
            {informe.confianza}
          </span>
        </div>
        {partida.posicion_final === 1 && (
          <p className="flex items-center gap-2 text-base font-medium text-text">
            <Trophy className="h-4 w-4 shrink-0 text-text" aria-hidden="true" />
            {FRASE_VICTORIA}
          </p>
        )}
        <p className="text-sm text-text">{espaciarPorcentajes(informe.resumen)}</p>
        <div className="grid gap-4 xl:grid-cols-2">
          <div>
            <h5 className="mb-2 titulo-seccion text-sm text-muted">Factores a favor</h5>
            <Insignias items={informe.factores_favorables} tipo="favor" vacio="Sin factores a favor registrados." />
          </div>
          <div>
            <h5 className="mb-2 titulo-seccion text-sm text-muted">Factores en contra</h5>
            <Insignias items={informe.factores_adversos} tipo="contra" vacio="Sin factores en contra registrados." />
          </div>
        </div>
      </Pregunta>

      <Pregunta titulo="¿Dónde se decidió?">
        <div className="rounded-md bg-text/5 p-3 text-sm text-text">{espaciarPorcentajes(informe.momento_critico)}</div>
        {puntosCriticos ? (
          <dl className="grid grid-cols-3 gap-2 text-center">
            <Estadistica
              etiqueta="Compañeros perdidos"
              valor={formatCompanerosPerdidos(puntosCriticos.actual.vivos, puntosCriticos.anterior.vivos)}
            />
            <Estadistica
              etiqueta="Salud del equipo (puntos)"
              valor={formatDelta(puntosCriticos.actual.salud, puntosCriticos.anterior.salud)}
            />
            <Estadistica
              etiqueta="Distancia al círculo"
              valor={cambioDistancia(puntosCriticos.actual.dist_rel, puntosCriticos.anterior.dist_rel)}
              texto
            />
          </dl>
        ) : (
          <p className="text-sm text-muted">Sin datos suficientes para ese minuto.</p>
        )}
      </Pregunta>

      {/* Sin referencia, la sección entera sobra: no se muestra un aviso vacío. */}
      {metricas && metricas.referencia_fase.length > 0 && (
        <Pregunta titulo="¿Qué hicieron distinto los que llegaron?">
          <VinetasTop minutos={partida.minutos} referencia={metricas.referencia_fase} />
        </Pregunta>
      )}

      <Pregunta titulo="¿Qué hago la próxima?">
        <Lista items={informe.recomendaciones} vacio="Sin recomendaciones registradas." />
        <h5 className="pt-2 titulo-seccion text-sm text-muted">
          ¿Qué habría cambiado?
        </h5>
        <Escenarios escenarios={partida.escenarios} />
      </Pregunta>
    </div>
  )
}
