import { reloadOnStaleChunk } from './staleChunk'

function fakeWindow() {
  const target = new EventTarget()
  const store = new Map<string, string>()
  const reload = vi.fn()
  const win = {
    addEventListener: target.addEventListener.bind(target),
    sessionStorage: { getItem: (k: string) => store.get(k) ?? null, setItem: (k: string, v: string) => void store.set(k, v) },
    location: { reload },
  } as unknown as Window
  const fail = () => {
    const event = new Event('vite:preloadError', { cancelable: true })
    target.dispatchEvent(event)
    return event
  }
  return { win, reload, fail }
}

describe('reloadOnStaleChunk', () => {
  it('un archivo viejo que ya no existe recarga la pagina una vez, sin mostrar el error', () => {
    const { win, reload, fail } = fakeWindow()
    reloadOnStaleChunk(win)

    expect(fail().defaultPrevented).toBe(true)
    expect(reload).toHaveBeenCalledTimes(1)
  })

  it('si vuelve a fallar enseguida no recarga en bucle: deja ver el error', () => {
    const { win, reload, fail } = fakeWindow()
    reloadOnStaleChunk(win)

    fail()
    expect(fail().defaultPrevented).toBe(false)
    expect(reload).toHaveBeenCalledTimes(1)
  })
})
