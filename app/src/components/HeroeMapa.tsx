import { useEffect, useRef, useState } from 'react'
import { motion } from 'motion/react'
import { useAnimarUnaVez } from '../hooks/useAnimarUnaVez'
import { DURACION, useTransicion } from '../movimiento'

// Geometría en el sistema 0-100 de la caja del mapa (ejemplo_fondos.html,
// opción A). Dibujo propio encima del mapa oficial: ni personajes, ni logos,
// ni capturas del juego.
type Punto = { x: number; y: number }
type Lado = 'izquierda' | 'arriba' | 'derecha' | 'abajo'
type Ruta = { desde: Punto; hasta: Punto; lado: Lado }

// La ruta del ejemplo: la que queda quieta con prefers-reduced-motion.
const RUTA_FIJA: Ruta = { desde: { x: 2, y: 88 }, hasta: { x: 98, y: 14 }, lado: 'izquierda' }
const AVION_FIJO: Punto = { x: 78.8, y: 28.8 }

// Zona por la que pasan todas las rutas, con algo de azar: como en el juego,
// el avión cruza cerca del centro del mapa.
const CENTRO: Punto = { x: 56, y: 48 }
const DISPERSION = 14
// Las rutas empiezan y terminan un poco fuera de la caja: el avión entra y
// sale de cuadro en lugar de aparecer de golpe.
const BORDE = -6
const FIN = 106

// Rumbo hacia adentro (en grados, eje y hacia abajo) según el lado de entrada.
const RUMBO: Record<Lado, number> = { izquierda: 0, arriba: 90, derecha: 180, abajo: 270 }
const LADOS = Object.keys(RUMBO) as Lado[]

const angulo = (r: Ruta) => (Math.atan2(r.hasta.y - r.desde.y, r.hasta.x - r.desde.x) * 180) / Math.PI

/** Distancia desde `p` hasta el borde de la caja ampliada, avanzando en la dirección `d`. */
function distanciaAlBorde(p: Punto, d: Punto): number {
  const cruces: number[] = []
  for (const [origen, paso] of [
    [p.x, d.x],
    [p.y, d.y],
  ]) {
    if (Math.abs(paso) < 1e-6) continue
    for (const limite of [BORDE, FIN]) {
      const t = (limite - origen) / paso
      if (t > 0) cruces.push(t)
    }
  }
  return Math.min(...cruces)
}

/**
 * Ruta nueva que entra por un lado distinto del anterior, con hasta ±50° de
 * inclinación y pasando cerca del centro del mapa. Los extremos son los
 * cruces de esa recta con el borde de la caja (ampliada).
 */
function rutaAleatoria(anterior: Lado | null): Ruta {
  const opciones = LADOS.filter((l) => l !== anterior)
  const lado = opciones[Math.floor(Math.random() * opciones.length)]
  const rumbo = ((RUMBO[lado] + (Math.random() * 100 - 50)) * Math.PI) / 180
  const d = { x: Math.cos(rumbo), y: Math.sin(rumbo) }
  const centro = {
    x: CENTRO.x + (Math.random() * 2 - 1) * DISPERSION,
    y: CENTRO.y + (Math.random() * 2 - 1) * DISPERSION,
  }
  const atras = distanciaAlBorde(centro, { x: -d.x, y: -d.y })
  const adelante = distanciaAlBorde(centro, d)
  return {
    lado,
    desde: { x: centro.x - d.x * atras, y: centro.y - d.y * atras },
    hasta: { x: centro.x + d.x * adelante, y: centro.y + d.y * adelante },
  }
}

/** El vuelo en curso; `siguiente` programa otro, desde otro lado, tras una pausa. */
function useVuelos(activo: boolean) {
  const [vuelo, setVuelo] = useState(() => ({ ruta: activo ? rutaAleatoria(null) : RUTA_FIJA, n: 0 }))
  const espera = useRef<ReturnType<typeof setTimeout> | null>(null)
  useEffect(
    () => () => {
      if (espera.current) clearTimeout(espera.current)
    },
    [],
  )
  const siguiente = () => {
    espera.current = setTimeout(
      () => setVuelo((v) => ({ ruta: rutaAleatoria(v.ruta.lado), n: v.n + 1 })),
      DURACION.pausaAvion * 1000,
    )
  }
  return { ...vuelo, siguiente }
}

// La caja del mapa y la del dibujo coinciden: cuadrada, a la derecha, centrada
// en alto. Se dimensiona por la altura del héroe y no por su ancho: a 1600 px,
// el 72 % del ancho daba una caja de 1150 px donde la zona y el círculo
// punteado no cabían.
const CAJA = 'absolute right-[-3%] top-1/2 aspect-square h-[150%] -translate-y-1/2 max-md:right-[-25%]'

/** El avión en trazo, apuntando en la dirección de vuelo. */
function Avion({ grados }: { grados: number }) {
  return (
    <path
      d="M -2.2 0 L 2.2 0 M 0.4 -1.8 L 0.4 1.8 M -1.8 -0.7 L -1.8 0.7"
      transform={`rotate(${grados})`}
      stroke="currentColor"
      strokeWidth={0.55}
      strokeLinecap="round"
    />
  )
}

/**
 * Fondo del héroe del Resumen: el mapa oficial de Erangel (pubg/api-assets,
 * copia ligera de 800 px), fundido con la tarjeta; un velo que deja leer el
 * título; y encima, el círculo blanco de la zona siguiente, la zona azul
 * cerrándose (el emblema de la app, reemplaza al anillo) y el avión con su
 * ruta. La zona se cierra una vez por visita; el avión cruza una y otra vez,
 * cada vez desde otro lado (pedido del usuario). Con prefers-reduced-motion,
 * los dos quedan quietos en su lugar. En el teléfono el velo cubre casi todo y
 * el dibujo se oculta: quedaba encima del título. Decorativo: oculto a
 * lectores de pantalla. El crédito del mapa va en el pie de página.
 */
export function HeroeMapa() {
  const animar = useAnimarUnaVez('heroe-mapa')
  const { reducido, transicion } = useTransicion()
  const { ruta, n, siguiente } = useVuelos(!reducido)
  return (
    <div className="pointer-events-none absolute inset-0" aria-hidden="true">
      <img
        src="/mapas/erangel-heroe.jpg"
        alt=""
        width={800}
        height={800}
        decoding="async"
        className={`${CAJA} w-auto max-w-none object-cover`}
        style={{
          filter: 'var(--mapa-filtro)',
          opacity: 'var(--mapa-opacidad)',
          maskImage: 'radial-gradient(circle at 55% 50%, #000 45%, transparent 72%)',
          WebkitMaskImage: 'radial-gradient(circle at 55% 50%, #000 45%, transparent 72%)',
        }}
      />
      <div className="absolute inset-0" style={{ background: 'var(--velo-heroe)' }} />
      <svg viewBox="0 0 100 100" className={`${CAJA} overflow-visible max-md:hidden`} style={{ color: 'var(--trazo-heroe)' }}>
        <circle cx={54} cy={47} r={30} fill="none" stroke="currentColor" strokeOpacity={0.7} strokeWidth={0.35} strokeDasharray="1.2 1" />
        <motion.circle
          cx={58}
          cy={50}
          r={13}
          className="fill-zone/15 stroke-zone"
          strokeWidth={0.55}
          style={{ transformBox: 'fill-box', transformOrigin: 'center' }}
          initial={animar ? { scale: 1.9, opacity: 0 } : false}
          animate={{ scale: 1, opacity: 1 }}
          transition={transicion(DURACION.cierreZona)}
        />
        {reducido ? (
          <>
            <path
              d={`M ${RUTA_FIJA.desde.x} ${RUTA_FIJA.desde.y} L ${RUTA_FIJA.hasta.x} ${RUTA_FIJA.hasta.y}`}
              fill="none"
              stroke="currentColor"
              strokeOpacity={0.55}
              strokeWidth={0.35}
              strokeDasharray="0.6 1.4"
              strokeLinecap="round"
            />
            <g transform={`translate(${AVION_FIJO.x} ${AVION_FIJO.y})`}>
              <Avion grados={angulo(RUTA_FIJA)} />
            </g>
          </>
        ) : (
          // Velocidad constante (lineal, no ease-out): un avión que frenara al
          // final de cada cruce se vería raro. La ruta y el avión entran y salen
          // con un fundido corto; al terminar, una pausa y otro vuelo.
          <g key={n}>
            <motion.path
              d={`M ${ruta.desde.x} ${ruta.desde.y} L ${ruta.hasta.x} ${ruta.hasta.y}`}
              fill="none"
              stroke="currentColor"
              strokeWidth={0.35}
              strokeDasharray="0.6 1.4"
              strokeLinecap="round"
              initial={{ strokeOpacity: 0 }}
              animate={{ strokeOpacity: [0, 0.55, 0.55, 0] }}
              transition={{ duration: DURACION.avion, times: [0, 0.08, 0.92, 1], ease: 'linear' }}
            />
            <motion.g
              initial={{ x: ruta.desde.x, y: ruta.desde.y, opacity: 0 }}
              animate={{ x: ruta.hasta.x, y: ruta.hasta.y, opacity: [0, 1, 1, 0] }}
              transition={{
                x: { duration: DURACION.avion, ease: 'linear' },
                y: { duration: DURACION.avion, ease: 'linear' },
                opacity: { duration: DURACION.avion, times: [0, 0.08, 0.92, 1], ease: 'linear' },
              }}
              onAnimationComplete={siguiente}
            >
              <Avion grados={angulo(ruta)} />
            </motion.g>
          </g>
        )}
      </svg>
    </div>
  )
}
