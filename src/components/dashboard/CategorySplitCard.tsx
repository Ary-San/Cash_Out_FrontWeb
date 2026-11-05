import { useState } from 'react'
import { Link } from 'react-router'
import { ArrowRight } from 'lucide-react'
import { CATEGORY_META } from '@/lib/categories'
import { formatSoles } from '@/lib/format'
import type { MonthPace } from '@/lib/monthPace'
import { cn } from '@/lib/utils'
import { Skeleton } from '@/components/ui/skeleton'

const share = new Intl.NumberFormat('es-PE', { maximumFractionDigits: 1 })

/** En que se fue el dinero del mes: una barra que reparte el 100 % y cada categoria con su cambio. */
export function CategorySplitCard({ pace, previousName }: { pace: MonthPace | undefined; previousName: string }) {
  const [focus, setFocus] = useState<string | null>(null)
  const categories = pace?.categories ?? []

  return (
    <section aria-labelledby="resumen-categorias" className="rounded-2xl border bg-card p-5">
      <div className="mb-3 flex items-baseline justify-between">
        <h2 id="resumen-categorias" className="text-sm font-medium text-muted-foreground">
          En qué se fue
        </h2>
        <Link to="/movimientos/gastos" className="flex items-center gap-1 text-[13px] font-medium underline-offset-4 hover:underline">
          Ver gastos
          <ArrowRight className="size-3.5" aria-hidden="true" />
        </Link>
      </div>
      {!pace ? (
        <Skeleton className="h-56 w-full rounded-xl" />
      ) : categories.length === 0 ? (
        <p className="py-10 text-center text-sm text-muted-foreground">Cuando registres gastos este mes, aquí verás en qué se van.</p>
      ) : (
        <>
          <p className="mb-3 flex items-baseline gap-2">
            <span className="font-mono text-2xl font-medium tabular-nums">{formatSoles(pace.spent)}</span>
            <span className="text-[13px] text-muted-foreground">
              en {categories.length} {categories.length === 1 ? 'categoría' : 'categorías'}
            </span>
          </p>
          <div
            role="img"
            aria-label={categories.map((c) => `${CATEGORY_META[c.category].label} ${share.format(c.share * 100)} %`).join(', ')}
            className="mb-3.5 flex h-3 gap-[3px]"
          >
            {categories.map((c) => (
              <i
                key={c.category}
                className={cn('rounded-[4px] transition-[opacity,transform] duration-200', focus && focus !== c.category && 'opacity-25', focus === c.category && 'scale-y-125')}
                style={{ flex: c.share, background: CATEGORY_META[c.category].color }}
              />
            ))}
          </div>
          <ul className="-mx-2 grid gap-0.5">
            {categories.map((c) => {
              const meta = CATEGORY_META[c.category]
              const Icon = meta.icon
              const up = c.diff > 0
              return (
                <li
                  key={c.category}
                  onPointerEnter={() => setFocus(c.category)}
                  onPointerLeave={() => setFocus(null)}
                  className="flex items-center gap-3 rounded-lg px-2 py-1.5 transition-colors hover:bg-muted"
                >
                  <span
                    aria-hidden="true"
                    className="grid size-8 flex-none place-items-center rounded-lg"
                    style={{ color: meta.color, background: `color-mix(in srgb, ${meta.color} 16%, transparent)` }}
                  >
                    <Icon className="size-4" />
                  </span>
                  <span className="flex min-w-0 flex-1 flex-col">
                    <strong className="text-sm font-semibold">{meta.label}</strong>
                    <span className="text-xs text-muted-foreground">{share.format(c.share * 100)} % del mes</span>
                  </span>
                  <span className="flex flex-col items-end gap-0.5">
                    <span className="font-mono text-sm font-medium tabular-nums">{formatSoles(c.total)}</span>
                    {c.diff !== 0 && (
                      <span className={cn('rounded-full px-1.5 font-mono text-[11px] font-medium', up ? 'bg-loss/10 text-loss' : 'bg-gain/10 text-gain')}>
                        {up ? '↑' : '↓'} {formatSoles(Math.abs(c.diff))}
                      </span>
                    )}
                  </span>
                </li>
              )
            })}
          </ul>
          <p className="mt-3 text-xs text-muted-foreground">Las etiquetas comparan con lo gastado a esta altura de {previousName}.</p>
        </>
      )}
    </section>
  )
}
