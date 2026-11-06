import { useState } from 'react'
import { ChevronDown } from 'lucide-react'
import { CATEGORY_META } from '@/lib/categories'
import { formatSoles } from '@/lib/format'
import type { MonthPace } from '@/lib/monthPace'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'

const oneDecimal = new Intl.NumberFormat('es-PE', { minimumFractionDigits: 1, maximumFractionDigits: 1 })

/** La frase del mes contra el anterior; las cifras se abren con "Mostrar mas". */
function sentence(p: MonthPace, monthName: string, previousName: string): string {
  if (p.spent === 0) return `En ${monthName} todavía no registras gastos.`
  const top = CATEGORY_META[p.categories[0].category].label
  const risers = p.categories.filter((c) => c.diff > 0)
  const where = `La mayor parte se fue en ${top}${risers.length === 1 && risers[0].category === p.categories[0].category ? ', que es lo único que subió' : ''}.`
  if (p.change === null) return `En ${monthName} gastaste ${formatSoles(p.spent)}. ${where}`
  const diff = Math.abs(p.spent - p.previousToDate)
  return `Gastaste ${formatSoles(diff)} ${p.spent <= p.previousToDate ? 'menos' : 'más'} que a esta altura de ${previousName}. ${where}`
}

interface MonthCompareCardProps {
  pace: MonthPace
  monthName: string
  previousName: string
  incomes: number
}

export function MonthCompareCard({ pace, monthName, previousName, incomes }: MonthCompareCardProps) {
  const [open, setOpen] = useState(false)
  const most = Math.max(pace.spent, pace.previousToDate, 1)
  const bar = (label: string, value: number, old: boolean) => (
    <div className="grid grid-cols-[5.5rem_minmax(0,1fr)_6rem] items-center gap-2.5 text-[13px] text-muted-foreground">
      <span className="capitalize">{label}</span>
      <span className="h-2.5 overflow-hidden rounded-full bg-muted">
        <i
          className={cn('block h-full rounded-full', old ? 'bg-[repeating-linear-gradient(-45deg,color-mix(in_srgb,var(--muted-foreground)_45%,transparent)_0_5px,color-mix(in_srgb,var(--muted-foreground)_25%,transparent)_5px_10px)]' : 'bg-accent-ink')}
          style={{ width: `${(value / most) * 100}%` }}
        />
      </span>
      <b className={cn('text-right font-mono font-medium tabular-nums', !old && 'text-foreground')}>{formatSoles(value)}</b>
    </div>
  )

  return (
    <section aria-labelledby="movimientos-mes" className="rounded-2xl border bg-card p-5 lg:p-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 id="movimientos-mes" className="text-xs tracking-wider text-muted-foreground uppercase">
            <span className="capitalize">{monthName}</span>, al día {pace.day}
          </h2>
          <p className="mt-2 max-w-[44ch] font-display text-2xl leading-snug text-pretty">{sentence(pace, monthName, previousName)}</p>
        </div>
        <Button variant="outline" size="sm" aria-expanded={open} aria-controls="movimientos-mes-cifras" onClick={() => setOpen(!open)}>
          {open ? 'Mostrar menos' : 'Mostrar más'}
          <ChevronDown aria-hidden="true" className={cn('transition-transform duration-300', open && 'rotate-180')} />
        </Button>
      </div>
      <div
        id="movimientos-mes-cifras"
        inert={!open}
        className={cn('grid transition-[grid-template-rows] duration-400 ease-[cubic-bezier(.2,.8,.2,1)] motion-reduce:transition-none', open ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]')}
      >
        <div className="grid items-center gap-6 overflow-hidden lg:grid-cols-2">
          <div role="img" aria-label={`Gasto al día ${pace.day}: ${monthName} ${formatSoles(pace.spent)}, ${previousName} ${formatSoles(pace.previousToDate)}`} className={cn('grid gap-2', open && 'pt-5')}>
            {bar(monthName, pace.spent, false)}
            {bar(previousName, pace.previousToDate, true)}
          </div>
          <dl className={cn('grid grid-cols-3 gap-2.5', open && 'lg:pt-5')}>
            {[
              { label: 'Entró', value: formatSoles(pace.earned), note: incomes === 1 ? '1 ingreso' : `${incomes} ingresos`, tone: 'text-income' },
              {
                label: 'Salió',
                value: formatSoles(pace.spent),
                note: pace.change === null ? '' : `${pace.change <= 0 ? '↓' : '↑'} ${oneDecimal.format(Math.abs(pace.change))} % vs. ${previousName}`,
                tone: '',
                noteTone: pace.change !== null && pace.change <= 0 ? 'text-gain' : 'text-loss',
              },
              { label: 'Queda', value: formatSoles(pace.remaining), note: pace.earned > 0 ? `${Math.max(Math.round((pace.remaining / pace.earned) * 100), 0)} % de lo que entró` : '', tone: '' },
            ].map((fig) => (
              <div key={fig.label} className="grid gap-0.5 rounded-xl border px-3.5 py-3">
                <dt className="text-xs text-muted-foreground">{fig.label}</dt>
                <dd className={cn('font-mono text-[17px] font-medium tabular-nums', fig.tone)}>{fig.value}</dd>
                {fig.note && <dd className={cn('text-xs font-medium', fig.noteTone ?? 'text-muted-foreground')}>{fig.note}</dd>}
              </div>
            ))}
          </dl>
        </div>
      </div>
    </section>
  )
}
