import { useEffect, useState, type FormEvent } from 'react'
import { motion } from 'motion/react'
import { COLOR_ZONA } from '../colores'
import { useAnalisis } from '../hooks/useAnalisis'
import { CurvaProbabilidad } from './CurvaProbabilidad'
import { Informe } from './Informe'
import { AsistenteChat } from './AsistenteChat'
import { EstadoVacio } from './EstadoVacio'

const TIEMPO_MAXIMO_MS = 90_000
const INTERVALO_MENSAJE_MS = 3_500

const MENSAJE_INICIAL = 'Despertando el servicio, la primera consulta tarda más.'

// Fijos a propósito: el prompt pide datos del propio proyecto, no generados
// por un modelo de lenguaje.
const MENSAJES_ROTATIVOS = [
  'Cerca del 90 % de las eliminaciones vienen del combate, no de la zona.',
  'La mediana de escuadrones por partida en el corpus es 26.',
  'La salud del escuadrón es el predictor más informativo del modelo.',
  'Perder un integrante antes del minuto 5 reduce mucho la probabilidad.',
]

// Barra de progreso real de una espera de red (hasta 90 s), no decorativa:
// se mantiene animada incluso siendo la Parte 5 "un solo momento de
// animación", porque comunica un estado real, no un efecto de entrada.
function BarraProgreso({ inicio }: { inicio: number }) {
  const [ahora, setAhora] = useState(() => Date.now())
  const [indiceMensaje, setIndiceMensaje] = useState(0)

  useEffect(() => {
    const tick = setInterval(() => setAhora(Date.now()), 200)
    return () => clearInterval(tick)
  }, [])

  useEffect(() => {
    const rotacion = setInterval(
      () => setIndiceMensaje((i) => (i + 1) % MENSAJES_ROTATIVOS.length),
      INTERVALO_MENSAJE_MS,
    )
    return () => clearInterval(rotacion)
  }, [])

  const transcurrido = ahora - inicio
  const porcentaje = Math.min(97, (transcurrido / TIEMPO_MAXIMO_MS) * 100)
  const mensaje =
    transcurrido < INTERVALO_MENSAJE_MS ? MENSAJE_INICIAL : MENSAJES_ROTATIVOS[indiceMensaje]

  return (
    <div className="rounded-lg border border-tinta-secundaria/15 bg-superficie p-4">
      <div className="h-2 w-full overflow-hidden rounded-full bg-white/10">
        <motion.div
          className="h-full rounded-full"
          style={{ backgroundColor: COLOR_ZONA }}
          animate={{ width: `${porcentaje}%` }}
          transition={{ ease: 'linear', duration: 0.2 }}
        />
      </div>
      <p className="mt-3 text-sm text-tinta-secundaria">{mensaje}</p>
    </div>
  )
}

/** Pestaña "Analizar mi partida": nick de Steam -> análisis en vivo con los mismos componentes que la pestaña Partida. */
export function AnalizarPartida() {
  const [nick, setNick] = useState('')
  const { estado, analizar, reiniciar } = useAnalisis()

  const enviar = (e: FormEvent) => {
    e.preventDefault()
    if (nick.trim() && estado.fase !== 'cargando') analizar(nick.trim(), 'steam')
  }

  return (
    <div className="space-y-4">
      <form onSubmit={enviar} className="flex flex-wrap gap-2">
        <input
          type="text"
          value={nick}
          onChange={(e) => setNick(e.target.value)}
          placeholder="Nombre de usuario de Steam"
          className="min-w-[200px] flex-1 rounded-md border border-tinta-secundaria/30 bg-superficie px-3 py-2 text-sm text-tinta placeholder:text-tinta-secundaria focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zona"
          disabled={estado.fase === 'cargando'}
        />
        <button
          type="submit"
          disabled={estado.fase === 'cargando' || !nick.trim()}
          className="rounded-md bg-zona px-4 py-2 text-sm font-medium text-fondo hover:brightness-110 disabled:opacity-50"
        >
          Analizar
        </button>
      </form>

      {estado.fase === 'inactivo' && (
        <EstadoVacio mensaje="Escribe un nombre de usuario de Steam para analizar su partida más reciente de escuadrón en Erangel." />
      )}
      {estado.fase === 'cargando' && <BarraProgreso inicio={estado.inicio} />}
      {estado.fase === 'error' && (
        <div className="space-y-2">
          <EstadoVacio mensaje={estado.mensaje} />
          <button type="button" onClick={reiniciar} className="text-sm text-zona underline">
            Intentar de nuevo
          </button>
        </div>
      )}
      {estado.fase === 'listo' && (
        <>
          <CurvaProbabilidad partida={estado.partida} />
          <Informe partida={estado.partida} />
          <AsistenteChat partida={estado.partida} />
        </>
      )}
    </div>
  )
}
