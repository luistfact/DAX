import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react'
import type { Partida } from '../types/datos'
import { enriquecerParaAsistente } from '../analisisPartida'
import { espaciarPorcentajes } from '../formato'

type Rol = 'usuario' | 'asistente'

type HerramientaInvocada = { herramienta: string; argumentos: Record<string, unknown> }

type MensajeChat = {
  rol: Rol
  texto: string
  herramientas?: HerramientaInvocada[]
}

const URL_SERVICIO: string = import.meta.env.VITE_SERVICIO_URL ?? 'http://localhost:8000'

const MENSAJE_ERROR_GENERICO = 'Botsito no pudo responder. Intenta de nuevo.'

// Frases discretas para mostrar qué consultó el asistente, en el mismo
// lenguaje llano que el resto de la interfaz — nunca el nombre técnico solo.
const ETIQUETAS_HERRAMIENTA: Record<string, (args: Record<string, unknown>) => string> = {
  resumen_partida: () => 'consultó el resumen de la partida',
  estado_por_minuto: (a) => `consultó el estado entre los minutos ${a.desde} y ${a.hasta}`,
  momento_critico: () => 'consultó el momento crítico',
  comparar_con_referencia: (a) => `consultó la comparación en F${a.cierre}`,
  perfil_estilo: () => 'consultó tu estilo de juego',
}

function describirHerramienta(h: HerramientaInvocada): string {
  const describir = ETIQUETAS_HERRAMIENTA[h.herramienta]
  return describir ? describir(h.argumentos) : `consultó ${h.herramienta}`
}

type Props = {
  /** null cuando no hay ninguna partida cargada (p. ej. en Perfiles o
   * Metodología): Botsito solo puede hablar del proyecto en general. */
  partida: Partida | null
  /** Preguntas sugeridas según la pantalla; se muestran solo antes del primer mensaje. */
  sugerencias: string[]
}

/** Chat de Botsito: habla del escuadrón cargado o, si no hay ninguno, del proyecto. */
export function AsistenteChat({ partida, sugerencias }: Props) {
  const [mensajes, setMensajes] = useState<MensajeChat[]>([])
  const [texto, setTexto] = useState('')
  const [cargando, setCargando] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const listaRef = useRef<HTMLDivElement>(null)

  // La partida del análisis en vivo no trae percentil/probabilidad
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

  // Solo el scroll de la conversación: scrollIntoView movería también la página.
  useEffect(() => {
    const lista = listaRef.current
    if (lista) lista.scrollTop = lista.scrollHeight
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

  return (
    <div className="space-y-3 tarjeta p-4 shadow-xl">
      <div>
        <h4 className="titulo-seccion text-lg text-text">Botsito</h4>
        <p className="text-xs text-muted">
          {partida
            ? 'Pregúntale por este escuadrón: responde con sus datos, minuto a minuto.'
            : 'Pregúntale cómo funciona ZonaAzul y qué encontramos.'}
        </p>
      </div>

      {mensajes.length === 0 ? (
        <div className="flex flex-wrap gap-2">
          {sugerencias.map((pregunta) => (
            <button
              key={pregunta}
              type="button"
              onClick={() => enviar(pregunta)}
              disabled={cargando}
              className="rounded-full border border-line bg-text/5 px-3 py-1 text-left text-sm text-text hover:bg-text/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zone disabled:opacity-50"
            >
              {pregunta}
            </button>
          ))}
        </div>
      ) : (
        <div ref={listaRef} className="max-h-80 space-y-3 overflow-y-auto pr-1">
          {mensajes.map((m, i) => (
            <div key={i} className={m.rol === 'usuario' ? 'text-right' : 'text-left'}>
              <p
                className={
                  'inline-block max-w-[85%] rounded-lg px-3 py-2 text-left text-sm text-text ' +
                  (m.rol === 'usuario' ? 'bg-text/10' : 'bg-text/5')
                }
              >
                {/* El modelo escribe «12%»; se normaliza como el resto de la app. Solo tipografía. */}
                {m.rol === 'asistente' ? espaciarPorcentajes(m.texto) : m.texto}
              </p>
              {m.herramientas && m.herramientas.length > 0 && (
                <p className="mt-1 text-xs text-muted">
                  {m.herramientas.map(describirHerramienta).join(' · ')}
                </p>
              )}
            </div>
          ))}
          {cargando && <p className="text-left text-sm text-muted">Botsito está escribiendo…</p>}
        </div>
      )}

      {error && <p className="border-l-2 border-danger pl-2 text-sm text-text">{error}</p>}

      <form onSubmit={enviarFormulario} className="flex gap-2">
        <input
          type="text"
          value={texto}
          onChange={(e) => setTexto(e.target.value)}
          placeholder={partida ? 'Pregunta sobre este escuadrón' : 'Pregunta sobre el proyecto'}
          disabled={cargando}
          className="min-w-0 flex-1 rounded-md border border-muted/30 bg-card px-3 py-2 text-sm text-text placeholder:text-muted focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zone disabled:opacity-50"
        />
        <button
          type="submit"
          disabled={cargando || !texto.trim()}
          className="rounded-md bg-zone px-4 py-2 text-sm font-medium text-bg hover:brightness-110 disabled:opacity-50"
        >
          Preguntar
        </button>
      </form>
    </div>
  )
}
