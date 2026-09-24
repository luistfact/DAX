import type { ReactNode } from 'react'
import type { Partida } from '../types/datos'
import { EstadoVacio } from './EstadoVacio'
import { Escenarios } from './Escenarios'
import { useMetricas } from '../hooks/useMetricas'
import { FRASE_VICTORIA } from '../texto'
import {
  buscarReferenciaFase,
  calcularPercentil,
  extraerMinutoCritico,
  minutosDelMomentoCritico,
  probabilidadMaxima,
  proporcionCobertura,
} from '../analisisPartida'

type Props = {
  partida: Partida | null
}

/** Colorea la cobertura ("N de 15 minutos analizados") por proporción real, no por una etiqueta subjetiva. */
function estiloCobertura(confianza: string): string {
  const proporcion = proporcionCobertura(confianza)
  if (proporcion == null) return 'bg-tinta-secundaria/15 text-tinta-secundaria'
  if (proporcion >= 0.8) return 'bg-zona/15 text-zona'
  if (proporcion >= 0.4) return 'bg-tinta-secundaria/15 text-tinta-secundaria'
  return 'bg-peligro/15 text-peligro'
}

function Lista({ items, vacio }: { items: string[]; vacio: string }) {
  if (items.length === 0) {
    return <p className="text-sm text-tinta-secundaria">{vacio}</p>
  }
  return (
    <ul className="list-disc space-y-1 pl-5 text-sm text-tinta">
      {items.map((item, i) => (
        <li key={i}>{item}</li>
      ))}
    </ul>
  )
}

function Pregunta({ titulo, children }: { titulo: string; children: ReactNode }) {
  return (
    <div className="space-y-2">
      <h4 className="text-sm font-semibold text-tinta">{titulo}</h4>
      {children}
    </div>
  )
}

function Estadistica({ etiqueta, valor }: { etiqueta: string; valor: string }) {
  return (
    <div className="rounded-md bg-white/5 p-2">
      <dt className="text-xs text-tinta-secundaria">{etiqueta}</dt>
      <dd className="font-cifra text-2xl font-semibold text-tinta">{valor}</dd>
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

  // Precalculados por el notebook; si faltan (partida en vivo de "Analizar
  // mi partida"), se recalculan en el cliente como respaldo.
  const percentil = partida.percentil ?? calcularPercentil(partida.posicion_final, partida.escuadrones)
  const probMaxima = partida.probabilidad_maxima ?? probabilidadMaxima(partida.minutos)
  const minutoCritico = partida.momento_critico?.minuto ?? extraerMinutoCritico(informe.momento_critico)

  const puntosCriticos = minutosDelMomentoCritico(partida.minutos, minutoCritico)
  const referencia =
    metricas && puntosCriticos ? buscarReferenciaFase(metricas.referencia_fase, puntosCriticos.actual.fase) : null

  return (
    <div className="space-y-6 rounded-lg border border-tinta-secundaria/15 bg-superficie p-4">
      <Pregunta titulo="¿Cómo te fue?">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="font-cifra text-2xl font-semibold text-tinta">{informe.veredicto}</h3>
          <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${estiloCobertura(informe.confianza)}`}>
            {informe.confianza}
          </span>
        </div>
        {partida.posicion_final === 1 && (
          <p className="font-cifra text-lg text-zona">{FRASE_VICTORIA}</p>
        )}
        <p className="text-sm text-tinta">{informe.resumen}</p>
        <dl className="grid grid-cols-3 gap-2 text-center">
          <Estadistica etiqueta="Posición" valor={`${partida.posicion_final}° de ${partida.escuadrones}`} />
          <Estadistica etiqueta="Percentil" valor={percentil != null ? `${Math.round(percentil)}%` : '—'} />
          <Estadistica
            etiqueta="Probabilidad máxima"
            valor={probMaxima != null ? `${Math.round(probMaxima * 100)}%` : '—'}
          />
        </dl>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <h5 className="mb-1 text-xs font-semibold uppercase tracking-wide text-tinta-secundaria">
              Factores a favor
            </h5>
            <Lista items={informe.factores_favorables} vacio="Sin factores a favor registrados." />
          </div>
          <div>
            <h5 className="mb-1 text-xs font-semibold uppercase tracking-wide text-tinta-secundaria">
              Factores en contra
            </h5>
            <Lista items={informe.factores_adversos} vacio="Sin factores en contra registrados." />
          </div>
        </div>
      </Pregunta>

      <Pregunta titulo="¿Dónde se decidió?">
        <div className="rounded-md bg-white/5 p-3 text-sm text-tinta">{informe.momento_critico}</div>
        {puntosCriticos ? (
          <dl className="grid grid-cols-3 gap-2 text-center">
            <Estadistica
              etiqueta="Compañeros perdidos"
              valor={formatCompanerosPerdidos(puntosCriticos.actual.vivos, puntosCriticos.anterior.vivos)}
            />
            <Estadistica
              etiqueta="Salud del equipo"
              valor={formatDelta(puntosCriticos.actual.salud, puntosCriticos.anterior.salud)}
            />
            <Estadistica
              etiqueta="Distancia al círculo"
              valor={formatDelta(puntosCriticos.actual.dist_rel, puntosCriticos.anterior.dist_rel)}
            />
          </dl>
        ) : (
          <p className="text-sm text-tinta-secundaria">Sin datos suficientes para ese minuto.</p>
        )}
      </Pregunta>

      <Pregunta titulo="¿Qué hicieron distinto los que llegaron?">
        {puntosCriticos && referencia ? (
          <p className="text-sm text-tinta">
            Llegaste al cierre {puntosCriticos.actual.fase} de 6 con {puntosCriticos.actual.salud} de salud y{' '}
            {puntosCriticos.actual.vivos} compañeros; los equipos que llegan al top 25 % lo hacen, en mediana, con{' '}
            {Math.round(referencia.hp_medio * 10) / 10} y {Math.round(referencia.jugadores_vivos * 10) / 10}.
          </p>
        ) : (
          <p className="text-sm text-tinta-secundaria">Aún no hay datos de referencia cargados para esa fase.</p>
        )}
      </Pregunta>

      <Pregunta titulo="¿Qué hago la próxima?">
        <Lista items={informe.recomendaciones} vacio="Sin recomendaciones registradas." />
        <h5 className="pt-2 text-xs font-semibold uppercase tracking-wide text-tinta-secundaria">
          ¿Qué habría cambiado?
        </h5>
        <Escenarios escenarios={partida.escenarios} />
      </Pregunta>
    </div>
  )
}
