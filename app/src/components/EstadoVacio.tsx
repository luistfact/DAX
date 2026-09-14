/** Estado vacío de una línea: nunca se deja una sección en blanco. */
export function EstadoVacio({ mensaje }: { mensaje: string }) {
  return (
    <div className="rounded-lg border border-dashed border-slate-300 p-6 text-center text-sm text-slate-500">
      {mensaje}
    </div>
  )
}
