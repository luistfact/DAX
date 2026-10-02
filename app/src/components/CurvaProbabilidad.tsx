import { useState, type ReactNode } from 'react'
import {
  Area,
  CartesianGrid,
  ComposedChart,
  Line,
  ReferenceArea,
  ReferenceDot,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { ChevronLeft, ChevronRight, HeartCrack, User, UserX } from 'lucide-react'
import type { Minuto, Partida, PuntoReferencia } from '../types/datos'
import { EstadoVacio } from './EstadoVacio'
import { BotonCompartir } from './BotonCompartir'
import { Mira } from './Mira'
import { LABEL_COMPANEROS_EN_PIE, LABEL_FASE_CIRCULO, LABEL_PROBABILIDAD_TOP25, LABEL_SALUD_EQUIPO, rotuloFase } from '../texto'
import { eventosPorMinuto, extraerMinutoCritico, type EventoMinuto } from '../analisisPartida'
import { distanciaCirculo, miles, pct, pp } from '../formato'
import { usePaleta } from '../hooks/useTema'
import { ACELERACION_ENTRADA, DURACION_ENTRADA_MS, useAnimarUnaVez } from '../hooks/useAnimarUnaVez'

type Props = {
  partida: Partida | null
  /** Curva promedio de los que llegaron al top. Solo para el catálogo: sale de la red recurrente, no de la red densa del análisis en vivo. */
  referencia?: PuntoReferencia[]
  /** Minuto elegido desde fuera (el deslizador del mapa en el análisis en vivo). */
  minutoMarcado?: number
  /** Avisa qué minuto se eligió, para sincronizar el mapa. */
  onMinutoActivo?: (minuto: number) => void
}

type TramoFase = { fase: number; desde: number; hasta: number }

type Fila = Minuto & { referencia: number | null }

/** Minutos consecutivos con la misma fase del círculo, para sombrearlos como bandas. */
function tramosDeFase(minutos: Minuto[]): TramoFase[] {
  const tramos: TramoFase[] = []
  for (const m of minutos) {
    const ultimo = tramos.at(-1)
    if (ultimo && ultimo.fase === m.fase && m.minuto === ultimo.hasta + 1) ultimo.hasta = m.minuto
    else tramos.push({ fase: m.fase, desde: m.minuto, hasta: m.minuto })
  }
  return tramos
}

/**
 * Causas de las bajas que el mapa del análisis en vivo registra en ese mismo
 * minuto. El catálogo no las guarda. Solo coincidencia exacta: la cuenta de
 * vivos de la curva va uno o dos minutos detrás de la hora de cada baja, así
 * que emparejar por cercanía sería adivinar a cuál ícono le toca cada causa.
 */
function causasDelMinuto(partida: Partida, minuto: number): string[] {
  const causas = (partida.mapa?.eventos ?? []).filter((e) => e.minuto === minuto && e.causa).map((e) => e.causa as string)
  return [...new Set(causas)]
}

/**
 * Qué pasó en ese minuto, en una tarjeta pequeña. Va encima de la gráfica,
 * fuera del trazo, alineada con el ícono.
 */
function TarjetaEvento({
  evento,
  minuto,
  causas,
  x,
}: {
  evento: EventoMinuto | undefined
  minuto: Minuto | undefined
  causas: string[]
  x: number
}) {
  if (!evento || !minuto) return null
  const queFue = describirEvento(evento)
  return (
    <div
      role="tooltip"
      className="pointer-events-none absolute bottom-full z-10 mb-1 w-max max-w-64 -translate-x-1/2 rounded-md border border-line bg-card-2 px-3 py-2 text-xs text-muted shadow-md"
      style={{ left: Math.max(90, x) }}
    >
      <p className="font-medium text-text">
        Minuto {minuto.minuto}
        {queFue && ` · ${queFue.charAt(0).toUpperCase()}${queFue.slice(1)}`}
      </p>
      <p>
        Salud del equipo {minuto.salud.toFixed(0)} · {minuto.vivos} en pie
      </p>
      {causas.length > 0 && <p>Causa: {causas.map((c) => c.toLowerCase()).join(', ')}</p>}
    </div>
  )
}

/** Lo que pasó en el escuadrón ese minuto, en palabras. */
function describirEvento(evento: EventoMinuto | undefined): string | null {
  if (!evento) return null
  if (evento.bajas === 1) return 'cae un compañero'
  if (evento.bajas > 1) return `caen ${evento.bajas} compañeros`
  if (evento.golpe != null) return `golpe de −${evento.golpe.toFixed(0)} de salud`
  return null
}

function Dato({ etiqueta, children }: { etiqueta: string; children: ReactNode }) {
  return (
    <div>
      <dt className="etiqueta">{etiqueta}</dt>
      <dd className="text-sm font-medium text-text">{children}</dd>
    </div>
  )
}

/** Un soldado por integrante real del escuadrón: en pie en verde, caídos en gris. */
function Soldados({ vivos, tamano }: { vivos: number; tamano: number }) {
  return (
    <span className="flex items-center gap-0.5" role="img" aria-label={`${vivos} de ${tamano} en pie`}>
      {Array.from({ length: tamano }, (_, i) => (
        <User
          key={i}
          className={`h-5 w-5 ${i < vivos ? 'text-alive' : 'text-muted opacity-40'}`}
          strokeWidth={i < vivos ? 2.5 : 1.5}
          aria-hidden="true"
        />
      ))}
    </span>
  )
}

/** Mini círculo con un punto: el borde es la zona (distancia relativa 1) y el punto, el escuadrón. */
function DistanciaZona({ distancia }: { distancia: number }) {
  const paleta = usePaleta()
  const radio = 14
  // Más allá de 1.6 radios el punto se queda en el borde del dibujo.
  const d = Math.min(distancia, 1.6) * radio
  const angulo = -Math.PI / 4
  return (
    <svg viewBox="-26 -26 52 52" className="h-12 w-12 shrink-0" aria-hidden="true">
      <circle r={radio} fill={paleta.zoneWash} stroke={paleta.zone} strokeWidth={1.5} />
      <circle r={1.5} fill={paleta.muted} />
      <circle cx={d * Math.cos(angulo)} cy={d * Math.sin(angulo)} r={3.5} fill={paleta.text} stroke={paleta.card} strokeWidth={1} />
    </svg>
  )
}

/** Estado del escuadrón en el minuto elegido, como HUD: reemplaza al tooltip, que tapaba el pico de la curva. */
function PanelMinuto({
  minuto,
  tamano,
  evento,
  esCritico,
  onAnterior,
  onSiguiente,
}: {
  minuto: Minuto
  tamano: number
  evento: EventoMinuto | undefined
  esCritico: boolean
  onAnterior: (() => void) | null
  onSiguiente: (() => void) | null
}) {
  const botonFlecha =
    'rounded p-1 text-muted hover:text-text disabled:opacity-30 focus-visible:outline focus-visible:outline-2 focus-visible:outline-zone'
  const salud = Math.max(0, Math.min(100, minuto.salud))
  return (
    <div className="flex flex-col gap-3 rounded-md border border-line bg-card-2 p-3" aria-live="polite">
      <div className="flex items-center justify-between gap-2">
        <button type="button" onClick={onAnterior ?? undefined} disabled={!onAnterior} className={botonFlecha} aria-label="Minuto anterior">
          <ChevronLeft className="h-4 w-4" aria-hidden="true" />
        </button>
        <p className="titulo-seccion text-base text-text">
          Minuto {minuto.minuto} · {rotuloFase(minuto.fase)}
        </p>
        <button type="button" onClick={onSiguiente ?? undefined} disabled={!onSiguiente} className={botonFlecha} aria-label="Minuto siguiente">
          <ChevronRight className="h-4 w-4" aria-hidden="true" />
        </button>
      </div>
      <div>
        <p className="etiqueta">probabilidad de top 25 %</p>
        <p className="font-cifra text-4xl font-semibold text-text">{pct(minuto.probabilidad)}</p>
        {esCritico && <p className="text-xs text-muted">Momento crítico de la partida</p>}
      </div>
      <dl className="space-y-3">
        <Dato etiqueta={LABEL_COMPANEROS_EN_PIE}>
          <Soldados vivos={minuto.vivos} tamano={tamano} />
        </Dato>
        <Dato etiqueta={LABEL_SALUD_EQUIPO}>
          <span className="flex items-center gap-2">
            {/* Blanca, como la barra de salud del juego: el verde ya significa «en pie». */}
            <span className="h-2 flex-1 rounded-sm bg-text/10" aria-hidden="true">
              <span className="block h-full rounded-sm bg-text" style={{ width: `${salud}%` }} />
            </span>
            <span className="w-8 text-right font-cifra text-base">{minuto.salud.toFixed(0)}</span>
          </span>
        </Dato>
        <Dato etiqueta="Distancia al círculo">
          <span className="flex items-center gap-2">
            <DistanciaZona distancia={minuto.dist_rel} />
            <span className="text-xs font-normal text-muted">{distanciaCirculo(minuto.dist_rel)}</span>
          </span>
        </Dato>
        <div className="grid grid-cols-2 gap-2">
          <Dato etiqueta={LABEL_FASE_CIRCULO}>{rotuloFase(minuto.fase)}</Dato>
          <Dato etiqueta="Equipos restantes">{minuto.equipos_vivos}</Dato>
        </div>
      </dl>
      {evento && (
        <ul className="space-y-1 border-t border-line pt-2 text-sm text-text">
          {evento.bajas > 0 && (
            <li className="flex items-center gap-2">
              <UserX className="h-4 w-4 shrink-0 text-danger" aria-hidden="true" />
              {evento.bajas === 1 ? 'Cayó un compañero' : `Cayeron ${evento.bajas} compañeros`}
            </li>
          )}
          {evento.golpe != null && (
            <li className="flex items-center gap-2">
              <HeartCrack className="h-4 w-4 shrink-0 text-text" aria-hidden="true" />
              Golpe fuerte: −{evento.golpe.toFixed(0)} de salud
            </li>
          )}
        </ul>
      )}
    </div>
  )
}

/** Curva de probabilidad minuto a minuto: fases, minuto crítico, bajas y golpes, y el estado del minuto al lado. */
export function CurvaProbabilidad({ partida, referencia, minutoMarcado, onMinutoActivo }: Props) {
  const paleta = usePaleta()
  const [minutoPropio, setMinutoPropio] = useState<number | null>(null)
  // La curva se dibuja de izquierda a derecha la primera vez que se muestra
  // este escuadrón; no al volver a la pestaña ni al redimensionar.
  const animar = useAnimarUnaVez(`curva-${partida?.id ?? 'vacia'}`)
  // Ícono de evento bajo el cursor o con foco: su minuto y su x en la gráfica.
  const [eventoActivo, setEventoActivo] = useState<{ minuto: number; x: number } | null>(null)

  if (!partida) {
    return <EstadoVacio mensaje="Selecciona un escuadrón para ver su probabilidad de llegar al top 25 %." />
  }

  const minutos = [...partida.minutos].sort((a, b) => a.minuto - b.minuto)
  if (minutos.length === 0) {
    return <EstadoVacio mensaje="Este escuadrón no tiene minutos analizados." />
  }

  const refPorMinuto = new Map((referencia ?? []).map((r) => [r.minuto, r.probabilidad]))
  const filas: Fila[] = minutos.map((m) => ({ ...m, referencia: refPorMinuto.get(m.minuto) ?? null }))
  const escuadronesReferencia = referencia?.[0]?.escuadrones

  const minutoCritico = partida.momento_critico?.minuto ?? extraerMinutoCritico(partida.informe.momento_critico)
  const puntoCritico = minutos.find((m) => m.minuto === minutoCritico && m.probabilidad != null)
  const indiceCritico = puntoCritico ? minutos.indexOf(puntoCritico) : -1
  const anteriorCritico = indiceCritico > 0 ? minutos[indiceCritico - 1] : undefined
  const caidaCritica =
    partida.momento_critico?.caida ??
    (puntoCritico?.probabilidad != null && anteriorCritico?.probabilidad != null
      ? puntoCritico.probabilidad - anteriorCritico.probabilidad
      : null)
  const eventos = eventosPorMinuto(minutos)
  const tramos = tramosDeFase(minutos)
  const primero = minutos[0].minuto
  const ultimo = minutos[minutos.length - 1].minuto
  // tam_real viene en el catálogo; el análisis en vivo no lo manda y se usa la
  // misma regla con la que el servicio lo calcula: el máximo de vivos observado.
  const tamano = partida.tam_real ?? Math.max(...minutos.map((m) => m.vivos))

  // «Min 12 · −30 pp · cae un compañero», con los datos reales de la partida.
  const etiquetaCritica = puntoCritico
    ? [
        `Min ${puntoCritico.minuto}`,
        caidaCritica != null ? `${caidaCritica < 0 ? '−' : '+'}${pp(caidaCritica)}` : null,
        describirEvento(eventos.find((e) => e.minuto === puntoCritico.minuto)),
      ]
        .filter(Boolean)
        .join(' · ')
    : null
  // Pegada al lado del gráfico que tiene espacio, para que no se salga del borde.
  const etiquetaALaIzquierda = puntoCritico != null && puntoCritico.minuto > (primero + ultimo) / 2

  // Sin elección, el panel abre en el momento crítico: es lo primero que hay que ver.
  const elegido = minutoMarcado ?? minutoPropio ?? puntoCritico?.minuto ?? ultimo
  const indice = Math.max(0, minutos.findIndex((m) => m.minuto === elegido))
  const actual = minutos[indice]

  const elegir = (minuto: number) => {
    setMinutoPropio(minuto)
    onMinutoActivo?.(minuto)
  }

  return (
    <Mira>
      <div className="rounded-lg border border-line bg-card p-4">
        <div className="mb-2 flex items-center justify-between gap-3">
          <h3 className="titulo-seccion text-base text-muted">{LABEL_PROBABILIDAD_TOP25}</h3>
          <BotonCompartir partida={partida} />
        </div>

        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_240px]">
          <div className="min-w-0">
            <div className="relative">
            {eventoActivo && (
              <TarjetaEvento
                evento={eventos.find((e) => e.minuto === eventoActivo.minuto)}
                minuto={minutos.find((m) => m.minuto === eventoActivo.minuto)}
                causas={causasDelMinuto(partida, eventoActivo.minuto)}
                x={eventoActivo.x}
              />
            )}
            <ResponsiveContainer width="100%" height={320}>
              <ComposedChart
                data={filas}
                margin={{ top: 28, right: 12, bottom: 24, left: 0 }}
                onMouseMove={(estado) => {
                  // activeLabel es el valor del XAxis (dataKey "minuto").
                  if (estado.activeLabel != null) elegir(Number(estado.activeLabel))
                }}
              >
                {tramos.map((t, i) => (
                  <ReferenceArea
                    key={`${t.fase}-${t.desde}`}
                    x1={t.desde - 0.5}
                    x2={t.hasta + 0.5}
                    fill={i % 2 === 0 ? 'transparent' : paleta.phaseBand}
                    stroke="none"
                    label={{ value: rotuloFase(t.fase), position: 'insideTop', offset: -18, fontSize: 12, fill: paleta.muted }}
                  />
                ))}
                {puntoCritico && etiquetaCritica && (
                  <ReferenceArea
                    x1={puntoCritico.minuto - 0.5}
                    x2={puntoCritico.minuto + 0.5}
                    fill={paleta.dangerWash}
                    stroke="none"
                    label={({ viewBox }: { viewBox?: { x?: number; y?: number; width?: number; height?: number } }) => {
                      const x = viewBox?.x ?? 0
                      const y = viewBox?.y ?? 0
                      const ancho = viewBox?.width ?? 0
                      const alto = viewBox?.height ?? 0
                      return (
                        <text
                          x={etiquetaALaIzquierda ? x + ancho - 4 : x + 4}
                          y={y + alto - 8}
                          textAnchor={etiquetaALaIzquierda ? 'end' : 'start'}
                          fontSize={12}
                          fontWeight={600}
                          fill={paleta.text}
                        >
                          {etiquetaCritica}
                        </text>
                      )
                    }}
                  />
                )}
                <CartesianGrid strokeDasharray="3 3" stroke={paleta.cuadricula} vertical={false} />
                <XAxis
                  dataKey="minuto"
                  type="number"
                  domain={[primero - 0.5, ultimo + 0.5]}
                  ticks={minutos.map((m) => m.minuto)}
                  stroke={paleta.muted}
                  tick={{ fontSize: 12, fill: paleta.muted }}
                  label={{ value: 'Minuto', position: 'insideBottom', offset: -16, fontSize: 12, fill: paleta.muted }}
                />
                <YAxis
                  domain={[0, 1]}
                  ticks={[0, 0.25, 0.5, 0.75, 1]}
                  tickFormatter={(v: number) => pct(v)}
                  stroke={paleta.muted}
                  tick={{ fontSize: 12, fill: paleta.muted }}
                  width={48}
                />
                {/* Solo aporta el rastreo del cursor; el contenido va en el panel lateral. */}
                <Tooltip content={() => null} cursor={false} />
                <ReferenceLine x={actual.minuto} stroke={paleta.muted} strokeDasharray="4 4" />
                {referencia && (
                  <Line
                    type="monotone"
                    dataKey="referencia"
                    stroke={paleta.muted}
                    strokeWidth={1.5}
                    strokeDasharray="5 4"
                    dot={false}
                    activeDot={false}
                    isAnimationActive={false}
                  />
                )}
                <Area
                  type="monotone"
                  dataKey="probabilidad"
                  stroke={paleta.zone}
                  strokeWidth={2}
                  fill={paleta.zoneWash}
                  fillOpacity={1}
                  dot={{ r: 3, fill: paleta.zone, stroke: paleta.zone }}
                  activeDot={false}
                  connectNulls={false}
                  isAnimationActive={animar}
                  animationDuration={DURACION_ENTRADA_MS}
                  animationEasing={ACELERACION_ENTRADA}
                />
                {puntoCritico && (
                  <ReferenceDot
                    x={puntoCritico.minuto}
                    y={puntoCritico.probabilidad ?? 0}
                    r={6}
                    fill={paleta.danger}
                    stroke={paleta.card}
                    strokeWidth={2}
                  />
                )}
                {eventos.map((e) => {
                  const m = minutos.find((x) => x.minuto === e.minuto)
                  if (m?.probabilidad == null) return null
                  const Icono = e.bajas > 0 ? UserX : HeartCrack
                  const color = e.bajas > 0 ? paleta.danger : paleta.text
                  return (
                    <ReferenceDot
                      key={`evento-${e.minuto}`}
                      x={e.minuto}
                      y={m.probabilidad}
                      r={0}
                      shape={({ cx, cy }: { cx?: number; cy?: number }) => (
                        // Por encima de la curva, para no tapar el punto del minuto.
                        <g
                          transform={`translate(${(cx ?? 0) - 9}, ${(cy ?? 0) - 30})`}
                          tabIndex={0}
                          role="img"
                          aria-label={`Minuto ${e.minuto}: ${describirEvento(e) ?? ''}`}
                          className="cursor-pointer focus:outline-none"
                          onMouseEnter={() => setEventoActivo({ minuto: e.minuto, x: cx ?? 0 })}
                          onMouseLeave={() => setEventoActivo(null)}
                          onFocus={() => setEventoActivo({ minuto: e.minuto, x: cx ?? 0 })}
                          onBlur={() => setEventoActivo(null)}
                        >
                          <circle cx={9} cy={9} r={10} fill={paleta.card} stroke={color} strokeWidth={1} />
                          <Icono x={3} y={3} width={12} height={12} color={color} aria-hidden="true" />
                        </g>
                      )}
                    />
                  )
                })}
              </ComposedChart>
            </ResponsiveContainer>
            </div>
            <ul className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted">
              <li className="flex items-center gap-1.5">
                <span className="h-3 w-3 rounded-sm bg-danger-wash ring-1 ring-danger" aria-hidden="true" />
                Momento crítico
              </li>
              <li className="flex items-center gap-1.5">
                <UserX className="h-3.5 w-3.5 text-danger" aria-hidden="true" />
                Cae un compañero
              </li>
              <li className="flex items-center gap-1.5">
                <HeartCrack className="h-3.5 w-3.5 text-text" aria-hidden="true" />
                Golpe fuerte (25 puntos de salud o más en un minuto)
              </li>
              <li className="flex items-center gap-1.5">
                <span className="h-2.5 w-4 rounded-sm bg-phase-band ring-1 ring-line" aria-hidden="true" />
                Fases del círculo (F1 a F6)
              </li>
              {referencia && (
                <li className="flex items-center gap-1.5">
                  <span className="w-4 border-t-2 border-dashed border-muted" aria-hidden="true" />
                  Promedio de los que llegaron al top
                  {escuadronesReferencia != null && ` (${miles(escuadronesReferencia)} escuadrones del conjunto de prueba)`}
                </li>
              )}
            </ul>
          </div>

          <PanelMinuto
            minuto={actual}
            tamano={tamano}
            evento={eventos.find((e) => e.minuto === actual.minuto)}
            esCritico={actual.minuto === puntoCritico?.minuto}
            onAnterior={indice > 0 ? () => elegir(minutos[indice - 1].minuto) : null}
            onSiguiente={indice < minutos.length - 1 ? () => elegir(minutos[indice + 1].minuto) : null}
          />
        </div>
      </div>
    </Mira>
  )
}
