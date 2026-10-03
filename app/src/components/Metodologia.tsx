import type { ReactNode } from 'react'
import { motion } from 'motion/react'
import { useAnimarUnaVez } from '../hooks/useAnimarUnaVez'
import { DURACION, useTransicion } from '../movimiento'
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import type { TooltipContentProps } from 'recharts'
import type { FaseMetrica, Metricas, ModeloMetrica } from '../types/datos'
import { EstadoVacio } from './EstadoVacio'
import { Ayuda } from './Ayuda'
import { Globo } from './Globo'
import { DiagramaFlujo } from './DiagramaFlujo'
import { Cascada } from './Cascada'
import { Conteo } from './Conteo'
import { Desplegable } from './Desplegable'
import { Detalle, FilaIndicadores, Indicador, MensajePrincipal } from './Plantilla'
import { Clock, Cpu, Crosshair, Database, Layers, Swords, Table2, Target, Users } from 'lucide-react'
import { CurvaCalibracion } from './CurvaCalibracion'
import { usePaleta } from '../hooks/useTema'
import { usePartidas } from '../hooks/usePartidas'
import { LABEL_MINUTOS_ANALIZADOS, nombreModelo, rotuloFaseCorto } from '../texto'
import { metrica, miles } from '../formato'

type Props = {
  metricas: Metricas | null
}

// Nombres tal como vienen en metricas.json.
const RECURRENTE = 'Red recurrente'
const DENSA = 'Red densa'
const BOOSTING = 'Impulso gradiente'

const AYUDA_AUC =
  'Si comparas un escuadrón que llegó al top con uno que no, el AUC es la proporción de veces que el modelo le da más probabilidad al que llegó. 0.5 es azar; 1 es perfecto.'
const AYUDA_BRIER =
  'Qué tan confiables son las probabilidades que da el modelo. Si dice 70 %, acierta cerca del 70 % de las veces; más bajo es mejor.'
const AYUDA_AP =
  'Qué tan bien detecta a los equipos que sí llegan al top 25 %, que son la minoría (cerca del 26 % de los casos).'

function Tarjeta({ children, destacada }: { children: ReactNode; destacada?: boolean }) {
  return (
    <div className={`rounded-lg border bg-card p-4 ${destacada ? 'border-zone' : 'border-line'}`}>{children}</div>
  )
}

function PanelHover({ active, payload }: TooltipContentProps) {
  if (!active || !payload || payload.length === 0) return null
  const fila = payload[0].payload as FaseMetrica

  return (
    <div className="rounded-md border border-line bg-card p-3 text-sm shadow-md">
      <p className="font-medium text-text">Fase {fila.Fase}</p>
      <dl className="mt-1 grid grid-cols-2 gap-x-4 gap-y-0.5 text-muted">
        <dt>AUC</dt>
        <dd className="text-text">{metrica(fila.AUC)}</dd>
        <dt>AP</dt>
        <dd className="text-text">{metrica(fila.AP)}</dd>
        <dt>Tasa base</dt>
        <dd className="text-text">{metrica(fila['Tasa base'])}</dd>
        <dt>Brier</dt>
        <dd className="text-text">{metrica(fila.Brier)}</dd>
        <dt>{LABEL_MINUTOS_ANALIZADOS}</dt>
        <dd className="text-text">{miles(fila.n)}</dd>
      </dl>
    </div>
  )
}

type Serie = { dataKey: keyof FaseMetrica; nombre: string; color: string; punteada?: boolean }

/**
 * Una métrica por fase del círculo. La leyenda va arriba: abajo se encimaba
 * con el título del eje X.
 */
function GraficaPorFase({
  datos,
  series,
  dominio,
  referencia,
}: {
  datos: FaseMetrica[]
  series: Serie[]
  dominio: [number, number]
  referencia?: { y: number; etiqueta: string }
}) {
  const paleta = usePaleta()
  return (
    <ResponsiveContainer width="100%" height={260}>
      <LineChart data={datos} margin={{ top: 10, right: 20, bottom: 20, left: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke={paleta.cuadricula} />
        <XAxis
          dataKey="Fase"
          tickFormatter={(f: number) => rotuloFaseCorto(f)}
          stroke={paleta.muted}
          tick={{ fontSize: 12, fill: paleta.muted }}
          label={{ value: 'Fase del círculo', position: 'insideBottom', offset: -12, fontSize: 12, fill: paleta.muted }}
        />
        <YAxis
          domain={dominio}
          tickFormatter={(v: number) => v.toFixed(1)}
          stroke={paleta.muted}
          tick={{ fontSize: 12, fill: paleta.muted }}
          width={40}
        />
        <Tooltip content={PanelHover} />
        <Legend verticalAlign="top" align="right" height={28} wrapperStyle={{ color: paleta.muted, fontSize: 12 }} />
        {referencia && (
          <ReferenceLine
            y={referencia.y}
            stroke={paleta.muted}
            strokeDasharray="4 4"
            label={{ value: referencia.etiqueta, position: 'insideBottomRight', fontSize: 12, fill: paleta.muted }}
          />
        )}
        {series.map((s) => (
          <Line
            key={s.dataKey}
            type="monotone"
            dataKey={s.dataKey}
            name={s.nombre}
            stroke={s.color}
            strokeWidth={2}
            strokeDasharray={s.punteada ? '4 4' : undefined}
            dot={{ r: 3, fill: s.punteada ? paleta.card : s.color, stroke: s.color }}
            isAnimationActive={false}
          />
        ))}
      </LineChart>
    </ResponsiveContainer>
  )
}

function Cifras({ modelo }: { modelo: ModeloMetrica | undefined }) {
  if (!modelo) return <p className="text-sm text-muted">Sin métricas para este modelo.</p>
  return (
    <dl className="grid grid-cols-3 gap-2">
      {(['AUC', 'Brier', 'AP'] as const).map((m) => (
        <div key={m}>
          <dt className="text-xs text-muted">{m}</dt>
          <dd className="font-cifra text-3xl font-semibold text-text">{metrica(modelo[m])}</dd>
        </div>
      ))}
    </dl>
  )
}

// El eje de las barras de AUC arranca en 0.5 (el azar): desde cero, las cinco
// familias se verían iguales; el rótulo lo dice para no exagerar diferencias.
const AUC_PISO = 0.5
const AUC_TECHO = 0.75

/** AUC de los cinco modelos en barras, con los dos que usa la app resaltados. */
function BarrasAuc({ modelos }: { modelos: ModeloMetrica[] }) {
  const crecer = useAnimarUnaVez('barras-auc')
  const { transicion } = useTransicion()
  const ordenados = [...modelos].sort((a, b) => b.AUC - a.AUC)
  return (
    <div className="space-y-2">
      <ul className="space-y-2.5">
        {ordenados.map((m) => {
          const enApp = m.Modelo === RECURRENTE ? 'Catálogo' : m.Modelo === DENSA ? 'En vivo' : null
          const fraccion = Math.max(0, Math.min(1, (m.AUC - AUC_PISO) / (AUC_TECHO - AUC_PISO)))
          return (
            <li key={m.Modelo} className="grid grid-cols-[minmax(0,15rem)_1fr_3.5rem] items-center gap-3 text-sm">
              <span className={`flex items-center gap-2 ${enApp ? 'font-semibold text-text' : 'text-muted'}`}>
                {/* Nombre corto en la gráfica; el completo, solo en la tabla. */}
                {nombreModelo(m.Modelo)}
                {enApp && (
                  <span className="rounded-full border border-zone/60 bg-zone/15 px-2 py-0.5 text-xs font-medium text-text">
                    {enApp}
                  </span>
                )}
              </span>
              <Globo
                className="block"
                alinear="izquierda"
                texto={`${nombreModelo(m.Modelo)}: AUC ${metrica(m.AUC)} · Brier ${metrica(m.Brier)} · AP ${metrica(m.AP)}`}
              >
              <span className="relative block h-3 overflow-hidden rounded-sm bg-text/5">
                <motion.span
                  className={`absolute inset-0 origin-left rounded-sm ${enApp ? 'bg-zone' : 'bg-muted/60'}`}
                  initial={crecer ? { scaleX: 0 } : false}
                  animate={{ scaleX: fraccion }}
                  transition={transicion(DURACION.grafica)}
                />
              </span>
              </Globo>
              <span className={`text-right font-cifra text-base ${enApp ? 'text-text' : 'text-muted'}`}>{metrica(m.AUC)}</span>
            </li>
          )
        })}
      </ul>
      <p className="flex items-center gap-1.5 text-sm text-muted">
        Las diferencias entre modelos son pequeñas.
        <Ayuda
          texto="El eje va de 0.5 (el azar) a 0.75, no desde cero: así se ven las diferencias sin exagerarlas. Los dos resaltados son los que usa la app."
          etiqueta="¿Cómo se lee esta gráfica?"
        />
      </p>
    </div>
  )
}

/** Pestaña para el evaluador: de dónde salen los datos, qué modelo se usa y qué tan bien funciona, sin exagerar. */
export function Metodologia({ metricas }: Props) {
  const paleta = usePaleta()
  const { partidas } = usePartidas()
  if (!metricas) {
    return (
      <EstadoVacio mensaje="Aún no hay métricas cargadas. Genera public/datos/metricas.json desde el notebook." />
    )
  }

  const { corpus, modelos } = metricas
  const partidasCatalogo = partidas ? new Set(partidas.map((p) => p.match_id)).size : null
  const porNombre = (nombre: string) => modelos.find((m) => m.Modelo === nombre)
  const recurrente = porNombre(RECURRENTE)
  const recalibracion = metricas.calibracion?.recalibracion
  // La app muestra la red recurrente recalibrada: su tarjeta lleva el Brier de
  // después (el AUC no cambia, la recalibración no altera el orden).
  const recurrenteEnLaApp = recurrente && recalibracion ? { ...recurrente, Brier: recalibracion.brier_despues } : recurrente
  const densa = porNombre(DENSA)
  const boosting = porNombre(BOOSTING)
  const aucs = modelos.map((m) => m.AUC)
  const aucMin = Math.min(...aucs)
  const aucMax = Math.max(...aucs)
  const mejor = modelos.find((m) => m.AUC === aucMax)
  const ventajaBoosting = boosting && densa ? Math.round((boosting.AUC - densa.AUC) * 1000) : null

  return (
    <Cascada className="space-y-6">
      <MensajePrincipal detalle="Aquí sí se usa el lenguaje técnico: es la pestaña para revisar el rigor del análisis.">
        Cómo se construyó el análisis y qué tan confiable es.
      </MensajePrincipal>

      <FilaIndicadores columnas={4}>
        <Indicador etiqueta="Partidas" valor={<Conteo valor={corpus.partidas} formato={miles} />} Icono={Swords} />
        <Indicador etiqueta="Escuadrones" valor={<Conteo valor={corpus.escuadrones} formato={miles} />} Icono={Users} />
        <Indicador
          etiqueta={LABEL_MINUTOS_ANALIZADOS}
          valor={<Conteo valor={corpus.observaciones} formato={miles} />}
          Icono={Clock}
        />
        <Indicador
          etiqueta="AUC de la red recurrente"
          valor={<Conteo valor={recurrente?.AUC} formato={metrica} />}
          Icono={Target}
        />
      </FilaIndicadores>

      <section className="space-y-3 tarjeta p-5">
        <h3 className="titulo-seccion text-base text-text">De los datos a la app</h3>
        <DiagramaFlujo />
      </section>

      <section className="tarjeta acento-zone space-y-3 p-5">
        <h3 className="titulo-seccion text-base text-text">AUC de los cinco modelos</h3>
        <BarrasAuc modelos={modelos} />
      </section>

      <Detalle columnas={2}>
        {/* Antes era un párrafo bajo el diagrama; como desplegable, la rejilla queda en 3 + 3. */}
        <Desplegable
          Icono={Database}
          titulo="De dónde salen los datos"
          resumen={`${miles(corpus.partidas)} partidas, separadas por fecha`}
        >
          {partidas && partidasCatalogo != null ? (
            <p className="text-sm text-text">
              El modelo se construyó con {miles(corpus.partidas)} partidas. La pestaña Partidas muestra{' '}
              {miles(partidas.length)} escuadrones de {miles(partidasCatalogo)} de esas partidas, las del conjunto de
              prueba: cada partida tiene varios escuadrones. La partición entre entrenamiento y prueba es por fecha, nunca
              aleatoria, porque los minutos de una misma partida están correlacionados.
            </p>
          ) : (
            <p className="text-sm text-muted">Aún no hay partidas cargadas.</p>
          )}
        </Desplegable>
        <Desplegable
          Icono={Cpu}
          titulo="Los modelos que usa la app"
          resumen="Red recurrente para el catálogo y red densa en vivo"
        >
          <div className="grid gap-3 md:grid-cols-2">
            <Tarjeta destacada>
              <p className="titulo-seccion text-lg text-text">Red recurrente</p>
              <p className="mb-3 text-sm text-muted">
                Dibuja la curva minuto a minuto de los escuadrones del catálogo. Es el único de los cinco modelos que lee
                la trayectoria del escuadrón y no una foto aislada de cada minuto.
              </p>
              <Cifras modelo={recurrenteEnLaApp} />
              {recalibracion && (
                <p className="mt-2 text-xs text-muted">
                  Brier ya recalibrado; antes de recalibrar era {metrica(recalibracion.brier_antes)}.
                </p>
              )}
            </Tarjeta>
            <Tarjeta destacada>
              <p className="titulo-seccion text-lg text-text">Red densa</p>
              <p className="mb-3 text-sm text-muted">
                Hace el análisis en vivo de tu partida. Se eligió por la restricción de memoria del servidor gratuito
                (512 MB): pesa 78 KB y no necesita TensorFlow, que la red recurrente sí requiere.
              </p>
              <Cifras modelo={densa} />
            </Tarjeta>
          </div>
          {/* Una frase a la vista; el detalle, en la ayuda (PROMPT_PULIDO_BI.md). */}
          <p className="flex items-center gap-1.5 text-sm font-semibold text-text">
            Las diferencias entre modelos son pequeñas.
            <Ayuda
              texto={
                `Las cinco familias quedan entre ${metrica(aucMin)} y ${metrica(aucMax)} de AUC.` +
                (mejor?.Modelo === BOOSTING && boosting && ventajaBoosting != null
                  ? ` Gradient boosting tuvo el más alto, ${metrica(boosting.AUC)}: ${ventajaBoosting} milésimas sobre la red densa. No justifica usarlo: igual que la red densa, predice con una foto de cada minuto, así que no reemplaza a la red recurrente en la curva del catálogo.`
                  : '')
              }
              etiqueta="¿Qué tan pequeñas?"
            />
          </p>
        </Desplegable>

        <Desplegable Icono={Target} titulo="El AUC en lenguaje llano" resumen="Con 0.70, acierta 7 de cada 10 comparaciones">
          <p className="text-base text-text">
            Con un AUC de 0.70, si comparas un escuadrón que llegó al top con uno que no, el modelo le da más
            probabilidad al que llegó <strong className="font-semibold">7 de cada 10 veces</strong>. Un modelo al azar
            acertaría 5 de cada 10.
          </p>
        </Desplegable>

        <Desplegable
          Icono={Table2}
          titulo="Comparación de modelos"
          resumen={`Cinco familias, de ${metrica(aucMin)} a ${metrica(aucMax)} de AUC`}
        >
          <div className="overflow-x-auto tarjeta">
            <table className="w-full text-left text-sm">
              <thead className="titulo-seccion border-b border-line bg-text/5 text-sm text-muted">
                <tr>
                  <th className="px-4 py-2">Modelo</th>
                  <th className="px-4 py-2">
                    AUC
                    <Ayuda texto={AYUDA_AUC} etiqueta="¿Qué significa AUC?" />
                  </th>
                  <th className="px-4 py-2">
                    Brier
                    <Ayuda texto={AYUDA_BRIER} etiqueta="¿Qué significa Brier?" />
                  </th>
                  <th className="px-4 py-2">
                    AP
                    <Ayuda texto={AYUDA_AP} etiqueta="¿Qué significa AP?" />
                  </th>
                  <th className="px-4 py-2">En la app</th>
                </tr>
              </thead>
              <tbody>
                {modelos.map((m) => (
                  <tr key={m.Modelo} className="border-b border-line last:border-0">
                    <td className="px-4 py-2 font-medium text-text">{nombreModelo(m.Modelo, true)}</td>
                    <td className="px-4 py-2 text-muted">{metrica(m.AUC)}</td>
                    <td className="px-4 py-2 text-muted">{metrica(m.Brier)}</td>
                    <td className="px-4 py-2 text-muted">{metrica(m.AP)}</td>
                    <td className="px-4 py-2 text-muted">
                      {m.Modelo === RECURRENTE ? 'Catálogo' : m.Modelo === DENSA ? 'En vivo' : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {recalibracion && (
            <p className="text-xs text-muted">
              La tabla compara los modelos tal como se entrenaron. La red recurrente que usa la app está recalibrada:
              mismo AUC, Brier de {metrica(recalibracion.brier_despues)}.
            </p>
          )}
        </Desplegable>

        <Desplegable
          Icono={Crosshair}
          titulo="Calibración"
          resumen={
            recalibracion
              ? `Red recurrente recalibrada: Brier de ${metrica(recalibracion.brier_antes)} a ${metrica(recalibracion.brier_despues)}`
              : 'Si dice 40 %, ¿se cumple cerca del 40 % de las veces?'
          }
        >
          {metricas.calibracion ? (
            <CurvaCalibracion calibracion={metricas.calibracion} />
          ) : (
            <p className="text-sm text-muted">Sin datos de calibración en metricas.json.</p>
          )}
        </Desplegable>

        <Desplegable
          Icono={Layers}
          titulo="Desempeño por cierre"
          resumen="AUC contra el azar y AP contra la tasa base, cierre a cierre"
        >
          <p className="text-sm text-muted">
            Se evalúa dentro de cada fase por separado: la proporción de escuadrones que llega al top crece conforme
            avanza la partida (sesgo de supervivencia), y mezclar fases falsearía la comparación.
          </p>
          <div className="grid gap-6 lg:grid-cols-2">
            <div>
              <h4 className="titulo-seccion text-sm text-muted">AUC por fase</h4>
              <p className="mb-2 text-xs text-muted">
                Un modelo al azar tiene un AUC de 0.5 en cualquier fase, sin importar cuántos equipos lleguen al top:
                esa es su referencia.
              </p>
              <GraficaPorFase
                datos={metricas.por_fase}
                series={[{ dataKey: 'AUC', nombre: 'AUC', color: paleta.zone }]}
                dominio={[0.4, 0.8]}
                referencia={{ y: 0.5, etiqueta: 'Azar (0.5)' }}
              />
            </div>
            <div>
              <h4 className="titulo-seccion text-sm text-muted">Precisión promedio (AP) por fase</h4>
              <p className="mb-2 text-xs text-muted">
                La referencia de la AP sí es la tasa base: un modelo al azar tendría una AP igual a la proporción de
                escuadrones que llega al top en esa fase.
              </p>
              <GraficaPorFase
                datos={metricas.por_fase}
                series={[
                  { dataKey: 'AP', nombre: 'AP', color: paleta.zone },
                  { dataKey: 'Tasa base', nombre: 'Tasa base (azar)', color: paleta.muted, punteada: true },
                ]}
                dominio={[0, 0.8]}
              />
            </div>
          </div>
        </Desplegable>
      </Detalle>
    </Cascada>
  )
}
