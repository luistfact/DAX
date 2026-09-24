import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react'
import type { Partida } from '../types/datos'
import { enriquecerParaAsistente } from '../analisisPartida'

type Rol = 'usuario' | 'asistente'

type HerramientaInvocada = { herramienta: string; argumentos: Record<string, unknown> }

type MensajeChat = {
  rol: Rol
  texto: string
  herramientas?: HerramientaInvocada[]
}

const URL_SERVICIO: string = import.meta.env.VITE_SERVICIO_URL ?? 'http://localhost:8000'

const PREGUNTAS_SUGERIDAS = ['¿En qué minuto perdí?', '¿Qué hice mal?', '¿Qué hago la próxima?']

const MENSAJE_ERROR_GENERICO = 'El asistente no pudo responder. Intenta de nuevo.'

// Frases discretas para mostrar qué consultó el asistente, en el mismo
// lenguaje llano que el resto de la interfaz — nunca el nombre técnico solo.
const ETIQUETAS_HERRAMIENTA: Record<string, (args: Record<string, unknown>) => string> = {
  resumen_partida: () => 'consultó el resumen de la partida',
  estado_por_minuto: (a) => `consultó el estado entre los minutos ${a.desde} y ${a.hasta}`,
  momento_critico: () => 'consultó el momento crítico',
  comparar_con_referencia: (a) => `consultó la comparación en el cierre ${a.cierre}`,
  perfil_estilo: () => 'consultó tu estilo de juego',
}

function describirHerramienta(h: HerramientaInvocada): string {
  const describir = ETIQUETAS_HERRAMIENTA[h.herramienta]
  return describir ? describir(h.argumentos) : `consultó ${h.herramienta}`
}

const PREGUNTAS_SUGERIDAS_PROYECTO = ['¿Esto cómo funciona?', '¿Qué tan preciso es?', '¿Qué datos usa?']

type Props = {
  /** null cuando no hay ninguna partida cargada (p. ej. en Perfiles o Cómo
   * funciona): el asistente solo puede hablar del proyecto en general. */
  partida: Partida | null
}

/** Chat del asistente: habla de la partida cargada o, si no hay ninguna, del proyecto. */
export function AsistenteChat({ partida }: Props) {
  const [mensajes, setMensajes] = useState<MensajeChat[]>([])
  const [texto, setTexto] = useState('')
  const [cargando, setCargando] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const finRef = useRef<HTMLDivElement>(null)

  // La partida en vivo de "Analizar mi partida" no trae percentil/probabilidad
  // máxima/momento_critico (nunca se persiste en partidas.json); se completan
  // aquí para que el backend siempre reciba la misma forma.
  const partidaEnriquecida = useMemo(() => (partida ? enriquecerParaAsistente(partida) : null), [partida])

  // Cambia el contexto (otra partida, o partida <-> sin partida) -> conversación
  // limpia (sin memoria entre partidas ni sesiones).
  useEffect(() => {
    setMensajes([])
    setTexto('')
    setError(null)
    setCargando(false)
  }, [partida?.id])

  useEffect(() => {
    finRef.current?.scrollIntoView({ block: 'nearest' })
  }, [mensajes, cargando])

  const enviar = async (pregunta: string) => {
    const limpio = pregunta.trim()
    if (!limpio || cargando) return

    const historial = [...mensajes, { rol: 'usuario' as const, texto: limpio }]
    setMensajes(historial)
    setTexto('')
    setError(null)
    setCargando(true)

    try {
      const res = await fetch(`${URL_SERVICIO}/asistente`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          partida_id: partida?.id ?? null,
          partida: partidaEnriquecida,
          mensajes: historial.map((m) => ({ rol: m.rol, texto: m.texto })),
        }),
      })
      const cuerpo: unknown = await res.json().catch(() => null)
      if (!res.ok) {
        const mensajeApi = (cuerpo as { error?: { mensaje?: string } } | null)?.error?.mensaje
        throw new Error(mensajeApi ?? MENSAJE_ERROR_GENERICO)
      }
      const { respuesta, herramientas } = cuerpo as { respuesta: string; herramientas: HerramientaInvocada[] }
      setMensajes([...historial, { rol: 'asistente', texto: respuesta, herramientas }])
    } catch {
      setError(MENSAJE_ERROR_GENERICO)
    } finally {
      setCargando(false)
    }
  }

  const enviarFormulario = (e: FormEvent) => {
    e.preventDefault()
    enviar(texto)
  }

  const preguntasSugeridas = partida ? PREGUNTAS_SUGERIDAS : PREGUNTAS_SUGERIDAS_PROYECTO

  return (
    <div className="space-y-3 rounded-lg border border-tinta-secundaria/15 bg-superficie p-4">
      <h4 className="text-sm font-semibold text-tinta">
        {partida ? 'Pregúntale a la partida' : 'Pregúntale al proyecto'}
      </h4>

      {mensajes.length === 0 ? (
        <div className="flex flex-wrap gap-2">
          {preguntasSugeridas.map((pregunta) => (
            <button
              key={pregunta}
              type="button"
              onClick={() => enviar(pregunta)}
              disabled={cargando}
              className="rounded-full border border-tinta-secundaria/20 bg-white/5 px-3 py-1 text-xs text-tinta-secundaria hover:bg-white/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zona disabled:opacity-50"
            >
              {pregunta}
            </button>
          ))}
        </div>
      ) : (
        <div className="max-h-80 space-y-3 overflow-y-auto pr-1">
          {mensajes.map((m, i) => (
            <div key={i} className={m.rol === 'usuario' ? 'text-right' : 'text-left'}>
              <p
                className={
                  'inline-block max-w-[85%] rounded-lg px-3 py-2 text-left text-sm text-tinta ' +
                  (m.rol === 'usuario' ? 'bg-white/10' : 'bg-white/5')
                }
              >
                {m.texto}
              </p>
              {m.herramientas && m.herramientas.length > 0 && (
                <p className="mt-1 text-xs text-tinta-secundaria">
                  {m.herramientas.map(describirHerramienta).join(' · ')}
                </p>
              )}
            </div>
          ))}
          {cargando && <p className="text-left text-sm text-tinta-secundaria">Escribiendo…</p>}
          <div ref={finRef} />
        </div>
      )}

      {error && <p className="text-sm text-peligro">{error}</p>}

      <form onSubmit={enviarFormulario} className="flex gap-2">
        <input
          type="text"
          value={texto}
          onChange={(e) => setTexto(e.target.value)}
          placeholder={partida ? 'Pregunta sobre esta partida' : 'Pregunta sobre el proyecto'}
          disabled={cargando}
          className="min-w-0 flex-1 rounded-md border border-tinta-secundaria/30 bg-superficie px-3 py-2 text-sm text-tinta placeholder:text-tinta-secundaria focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zona disabled:opacity-50"
        />
        <button
          type="submit"
          disabled={cargando || !texto.trim()}
          className="rounded-md bg-zona px-4 py-2 text-sm font-medium text-fondo hover:brightness-110 disabled:opacity-50"
        >
          Preguntar
        </button>
      </form>
    </div>
  )
}
