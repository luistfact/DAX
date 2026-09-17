/** Estado vacío de una línea: nunca se deja una sección en blanco. */
export function EstadoVacio({ mensaje }: { mensaje: string }) {
  return (
    <div className="rounded-lg border border-dashed border-tinta-secundaria/30 p-6 text-center text-sm text-tinta-secundaria">
      {mensaje}
    </div>
  )
}
