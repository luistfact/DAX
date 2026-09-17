import { Ayuda } from './Ayuda'
import { AYUDA_TOP25 } from '../texto'

/** Aclara qué significa "top 25 %" donde aparece esa etiqueta. */
export function AyudaTop25() {
  return <Ayuda texto={AYUDA_TOP25} etiqueta="¿Qué significa top 25 %?" />
}
