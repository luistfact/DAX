import { useEffect, useState } from 'react'
import { animate } from 'motion/react'
import { ACELERACION, DURACION, useTransicion } from '../movimiento'

type Props = {
  valor: number | null | undefined
  formato: (n: number) => string
}

/**
 * Número grande que cuenta desde cero hasta su valor al aparecer, cada vez
 * que se entra a la vista (se monta de nuevo). Corto, para que se lea pronto.
 * Los lectores de pantalla oyen solo el valor final. Con movimiento reducido
 * aparece directo en su valor.
 */
export function Conteo({ valor, formato }: Props) {
  const { reducido } = useTransicion()
  const [actual, setActual] = useState<number>(() => (reducido || valor == null ? (valor ?? 0) : 0))

  useEffect(() => {
    if (valor == null) return
    if (reducido) {
      setActual(valor)
      return
    }
    const control = animate(0, valor, { duration: DURACION.conteo, ease: ACELERACION, onUpdate: setActual })
    return () => control.stop()
  }, [valor, reducido])

  if (valor == null) return <>—</>
  return (
    <span aria-label={formato(valor)}>
      <span aria-hidden="true">{formato(actual)}</span>
    </span>
  )
}
