import { AlertTriangle, BarChart3, Clock, Lightbulb, Shuffle, ThumbsUp, Trophy } from 'lucide-react'
import type { Partida } from '../types/datos'
import { Desplegable } from './Desplegable'
import { Escenarios } from './Escenarios'
import { VinetasTop } from './VinetasTop'
import { useMetricas } from '../hooks/useMetricas'
import { FRASE_VICTORIA } from '../texto'
import { cambioDistancia, textoLlano } from '../formato'
import { extraerMinutoCritico, minutosDelMomentoCritico, proporcionCobertura } from '../analisisPartida'

type Props = {
  partida: Partida
  /** La meta en palabras («en una partida de 27 equipos, es quedar entre los primeros 7…»). */
  fraseMeta: string
  /** Cierre del minuto elegido en la curva, para que las viñetas lo sigan. */
  faseElegida?: number
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
          {textoLlano(item)}
        </li>
      ))}
    </ul>
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

function Lista({ items, vacio }: { items: string[]; vacio: string }) {
  if (items.length === 0) return <p className="text-sm text-muted">{vacio}</p>
  return (
    <ul className="list-disc space-y-1 pl-5 text-sm text-text">
      {items.map((item, i) => (
        <li key={i}>{textoLlano(item)}</li>
      ))}
    </ul>
  )
}

/** Todo el detalle del escuadrón, en tarjetas desplegables cerradas por defecto. */
export function Informe({ partida, fraseMeta, faseElegida }: Props) {
  const { metricas } = useMetricas()
  const { informe } = partida

  // Precalculado por el notebook; la partida en vivo no lo trae y se extrae del texto.
  const minutoCritico = partida.momento_critico?.minuto ?? extraerMinutoCritico(informe.momento_critico)
  const puntosCriticos = minutosDelMomentoCritico(partida.minutos, minutoCritico)
  const favor = informe.factores_favorables
  const contra = informe.factores_adversos

  return (
    <>
      <Desplegable Icono={Trophy} titulo="¿Cómo te fue?" resumen={`${informe.veredicto} · ${informe.confianza}`}>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="font-cifra text-3xl font-semibold text-text">{informe.veredicto}</p>
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
        <p className="text-sm text-text">{textoLlano(informe.resumen)}</p>
        <p className="text-sm text-muted">{fraseMeta}</p>
      </Desplegable>

      <Desplegable
        Icono={ThumbsUp}
        titulo="A favor y en contra"
        resumen={`${favor.length} a favor · ${contra.length} en contra`}
      >
        <div>
          <h4 className="mb-2 titulo-seccion text-sm text-muted">A favor</h4>
          <Insignias items={favor} tipo="favor" vacio="Sin factores a favor registrados." />
        </div>
        <div>
          <h4 className="mb-2 titulo-seccion text-sm text-muted">En contra</h4>
          <Insignias items={contra} tipo="contra" vacio="Sin factores en contra registrados." />
        </div>
      </Desplegable>

      <Desplegable Icono={Clock} titulo="¿Dónde se decidió?" resumen={textoLlano(informe.momento_critico)}>
        {puntosCriticos ? (
          <dl className="grid grid-cols-1 gap-2 text-center sm:grid-cols-3">
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
      </Desplegable>

      {/* Sin referencia, la tarjeta entera sobra: no se muestra un aviso vacío. */}
      {metricas && metricas.referencia_fase.length > 0 && (
        <Desplegable
          Icono={BarChart3}
          titulo="Contra los que llegaron al top"
          resumen="Tu equipo, cierre a cierre, contra lo típico de los que llegaron"
        >
          <VinetasTop
            clave={partida.id}
            minutos={partida.minutos}
            referencia={metricas.referencia_fase}
            faseElegida={faseElegida}
          />
        </Desplegable>
      )}

      <Desplegable
        Icono={Lightbulb}
        titulo="¿Qué hago la próxima?"
        resumen={informe.recomendaciones[0] ? textoLlano(informe.recomendaciones[0]) : 'Sin recomendaciones'}
      >
        <Lista items={informe.recomendaciones} vacio="Sin recomendaciones registradas." />
      </Desplegable>

      <Desplegable Icono={Shuffle} titulo="¿Y si…?" resumen="Qué habría cambiado, según el análisis">
        <Escenarios escenarios={partida.escenarios} />
      </Desplegable>
    </>
  )
}
