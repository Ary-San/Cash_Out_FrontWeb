const KEY = 'cashout.chunk-reload'
/** Si la recarga no lo arreglo en este tiempo, el problema es otro: no se vuelve a recargar. */
const WINDOW_MS = 10_000

/**
 * Tras un despliegue nuevo, una pestana abierta pide archivos de pantallas que ya no existen.
 * Vite avisa con `vite:preloadError`; recargar una vez trae la version nueva en lugar de la pantalla de error.
 */
export function reloadOnStaleChunk(win: Window = window): void {
  win.addEventListener('vite:preloadError', (event) => {
    let last = 0
    try {
      last = Number(win.sessionStorage.getItem(KEY) ?? 0)
    } catch {
      // Sin almacenamiento igual se intenta una vez.
    }
    if (Date.now() - last < WINDOW_MS) return
    try {
      win.sessionStorage.setItem(KEY, String(Date.now()))
    } catch {
      // Si no se puede guardar, recargar igual es mejor que mostrar el error.
    }
    event.preventDefault()
    win.location.reload()
  })
}
