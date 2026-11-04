import { useEffect, useId, useRef, useState } from 'react'
import { Loader2, Search, X } from 'lucide-react'
import { useApiQuery } from '@/hooks/useApiQuery'
import { useDebouncedValue } from '@/hooks/useDebouncedValue'
import { ASSET_TYPE_LABEL } from '@/lib/market'
import { cn } from '@/lib/utils'
import { marketService } from '@/services/marketService'

export const BENCHMARK = 'SPY'

interface ComparePickerProps {
  /** El activo de la pagina: no se compara consigo mismo. */
  symbol: string
  /** Contra que se compara ahora; null si no se compara. */
  selected: string | null
  onChange(symbol: string | null): void
}

/** "Comparar con…": el S&P 500 a un clic, o cualquier accion o ETF buscandolo. Las cripto no entran. */
export function ComparePicker({ symbol, selected, onChange }: ComparePickerProps) {
  const [open, setOpen] = useState(false)
  const [text, setText] = useState('')
  const box = useRef<HTMLDivElement>(null)
  const listId = useId()
  const term = useDebouncedValue(text.trim(), 250)
  const results = useApiQuery(['compare-search', term], (signal) =>
    term ? marketService.searchAssets({ search: term, page: 0, size: 8 }, signal) : Promise.resolve(null),
  )
  const options = term ? (results.data?.content ?? []).filter((a) => a.type !== 'CRYPTO' && a.symbol !== symbol).slice(0, 6) : []

  useEffect(() => {
    if (!open) return
    const close = (event: MouseEvent) => {
      if (!box.current?.contains(event.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', close)
    return () => document.removeEventListener('mousedown', close)
  }, [open])

  const pick = (next: string | null) => {
    onChange(next)
    setOpen(false)
    setText('')
  }

  return (
    <div ref={box} className="relative">
      <div className="flex">
        <button
          type="button"
          aria-expanded={open}
          aria-pressed={selected !== null}
          onClick={() => setOpen(!open)}
          className={cn(
            'inline-flex h-7.5 items-center gap-1.5 rounded-lg border px-2.5 text-[12.5px] outline-none hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring',
            selected && 'rounded-r-none border-accent-ink bg-accent hover:bg-accent',
          )}
        >
          <span aria-hidden="true" className="w-3.5 border-t-2 border-dashed border-income" />
          {selected ? `vs ${selected === BENCHMARK ? 'S&P 500' : selected}` : 'Comparar con…'}
        </button>
        {selected && (
          <button
            type="button"
            aria-label="Quitar la comparación"
            onClick={() => pick(null)}
            className="inline-flex h-7.5 items-center rounded-r-lg border border-l-0 border-accent-ink bg-accent px-1.5 outline-none hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring"
          >
            <X aria-hidden="true" className="size-3.5" />
          </button>
        )}
      </div>
      {open && (
        <div className="absolute top-full right-0 z-20 mt-1.5 w-64 rounded-xl border bg-card p-2 shadow-lg">
          {symbol !== BENCHMARK && (
            <button
              type="button"
              onClick={() => pick(BENCHMARK)}
              className="w-full rounded-lg px-2 py-1.5 text-left text-[13px] hover:bg-muted"
            >
              S&amp;P 500 <span className="font-mono text-muted-foreground">SPY</span>
            </button>
          )}
          <label className="mt-1 flex items-center gap-2 rounded-lg border px-2">
            <Search aria-hidden="true" className="size-3.5 text-muted-foreground" />
            <input
              autoFocus
              value={text}
              onChange={(event) => setText(event.target.value)}
              placeholder="Otra acción o ETF"
              aria-label="Buscar con qué comparar"
              aria-controls={listId}
              className="h-8 w-full bg-transparent text-[13px] outline-none"
            />
            {results.isLoading && term && <Loader2 aria-hidden="true" className="size-3.5 animate-spin" />}
          </label>
          <ul id={listId} className="mt-1">
            {options.map((asset) => (
              <li key={asset.id}>
                <button
                  type="button"
                  onClick={() => pick(asset.symbol)}
                  className="flex w-full items-baseline gap-2 rounded-lg px-2 py-1.5 text-left text-[13px] hover:bg-muted"
                >
                  <span className="font-mono font-medium">{asset.symbol}</span>
                  <span className="truncate text-muted-foreground">{asset.name}</span>
                  <span className="ml-auto shrink-0 text-[11px] text-muted-foreground">{ASSET_TYPE_LABEL[asset.type]}</span>
                </button>
              </li>
            ))}
            {term && !results.isLoading && options.length === 0 && (
              <li className="px-2 py-1.5 text-[12.5px] text-muted-foreground">No hay acciones ni ETF con ese nombre.</li>
            )}
          </ul>
        </div>
      )}
    </div>
  )
}
