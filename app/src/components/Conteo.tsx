import { useEffect, useRef, useState } from 'react'
import { animate } from 'motion/react'
import { ACELERACION, DURACION, useTransicion } from '../movimiento'

type Props = {
  valor: number | null | undefined
  formato: (n: number) => string
}

/**
 * Número grande que cuenta desde cero hasta su valor al aparecer (cada vez
 * que se entra a la vista) y que, si el valor cambia sin desmontarse (otro
 * escuadrón), se desliza desde el anterior en lugar de saltar. Los lectores
 * de pantalla oyen solo el valor final. Con movimiento reducido aparece
 * directo en su valor.
 */
export function Conteo({ valor, formato }: Props) {
  const { reducido } = useTransicion()
  const [actual, setActual] = useState<number>(() => (reducido || valor == null ? (valor ?? 0) : 0))
  const anterior = useRef(0)

  useEffect(() => {
    if (valor == null) return
    if (reducido) {
      setActual(valor)
      anterior.current = valor
      return
    }
    const desde = anterior.current
    anterior.current = valor
    const control = animate(desde, valor, {
      duration: desde === 0 ? DURACION.conteo : DURACION.cambioValor,
      ease: ACELERACION,
      onUpdate: setActual,
    })
    // Respaldo: si el navegador pausa los cuadros (pestaña en segundo plano),
    // el número no se queda a medias; al acabar su duración muestra el final.
    const fin = setTimeout(() => {
      control.stop()
      setActual(valor)
    }, DURACION.cambioValor * 1000 + 100)
    return () => {
      control.stop()
      clearTimeout(fin)
    }
  }, [valor, reducido])

  if (valor == null) return <>—</>
  return (
    <span aria-label={formato(valor)}>
      <span aria-hidden="true">{formato(actual)}</span>
    </span>
  )
}
