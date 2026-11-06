import { Repeat } from 'lucide-react'
import { CATEGORY_META } from '@/lib/categories'
import { formatSoles } from '@/lib/format'
import type { RecurringExpense } from '@/lib/recurring'
import { cn } from '@/lib/utils'
import { Skeleton } from '@/components/ui/skeleton'

const STATUS: Record<RecurringExpense['status'], { className: string; label: (r: RecurringExpense) => string }> = {
  paid: { className: 'border-gain text-gain', label: () => 'Pagado' },
  upcoming: { className: 'border-warning text-warning', label: (r) => (r.daysLeft === 0 ? 'Hoy' : r.daysLeft === 1 ? 'Mañana' : `En ${r.daysLeft} días`) },
  late: { className: 'border-loss text-loss', label: () => 'Aún no aparece' },
}

/** Los gastos fijos: lo que se paga todos los meses, cuanto suma y si ya salio este mes. */
export function RecurringCard({ items, spent }: { items: RecurringExpense[] | undefined; spent: number }) {
  const total = items?.reduce((sum, r) => sum + r.amount, 0) ?? 0

  return (
    <section aria-labelledby="movimientos-fijos" className="rounded-2xl border bg-card p-5 lg:p-6">
      <p className="text-xs tracking-wider text-muted-foreground uppercase">Se repiten cada mes</p>
      {!items ? (
        <Skeleton className="mt-4 h-40 w-full rounded-xl" />
      ) : items.length === 0 ? (
        <p id="movimientos-fijos" className="mt-4 text-[13px] text-muted-foreground">
          Todavía no hay gastos fijos: aparecen cuando un gasto se repite con el mismo nombre y monto dos meses seguidos.
        </p>
      ) : (
        <>
          <h2 id="movimientos-fijos" className="mt-1.5 flex items-baseline gap-2">
            <span className="font-mono text-2xl font-medium tabular-nums">{formatSoles(total)}</span>
            <span className="text-[13px] font-normal text-muted-foreground">
              al mes en gastos fijos{spent > 0 ? ` · ${Math.round((total / spent) * 100)} % de tu gasto` : ''}
            </span>
          </h2>
          <ul className="mt-3 divide-y">
            {items.map((r) => {
              const meta = CATEGORY_META[r.category]
              const status = STATUS[r.status]
              return (
                <li key={r.key} className="flex items-center gap-3 py-2.5 first:pt-0 last:pb-0">
                  <span
                    aria-hidden="true"
                    className="grid size-8 shrink-0 place-items-center rounded-[10px]"
                    style={{ color: meta.color, background: `color-mix(in srgb, ${meta.color} 16%, transparent)` }}
                  >
                    <Repeat className="size-4" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <strong className="block truncate text-sm font-semibold first-letter:uppercase">{r.label}</strong>
                    <span className="text-xs text-muted-foreground">
                      Día {r.day} · {meta.label}
                    </span>
                  </span>
                  <span className="flex flex-col items-end gap-1">
                    <span className="font-mono text-sm font-medium tabular-nums">{formatSoles(r.amount)}</span>
                    <span className={cn('rounded-full border px-2 text-[11px] font-semibold', status.className)}>{status.label(r)}</span>
                  </span>
                </li>
              )
            })}
          </ul>
          <p className="mt-3 text-xs text-muted-foreground">Los detectamos porque se repiten con el mismo nombre y monto en los dos meses anteriores.</p>
        </>
      )}
    </section>
  )
}
