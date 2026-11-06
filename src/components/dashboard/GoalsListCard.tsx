import { Link } from 'react-router'
import { ArrowRight } from 'lucide-react'
import type { ApiQuery } from '@/hooks/useApiQuery'
import { goalPace } from '@/lib/dashboard'
import { formatSoles } from '@/lib/format'
import { forecastLabel, type GoalForecast } from '@/lib/goalForecast'
import { cn } from '@/lib/utils'
import type { SavingsGoal } from '@/types/goals'
import { Skeleton } from '@/components/ui/skeleton'

const pct = (value: number) => Math.round(value * 100)

/** Las metas en curso: cuanto llevan frente a lo que deberian llevar por el tiempo que paso. */
export function GoalsListCard({ query, forecasts }: { query: ApiQuery<SavingsGoal[]>; forecasts?: Map<number, GoalForecast | null> }) {
  const goals = query.data?.filter((goal) => goal.status === 'IN_PROGRESS').map((goal) => ({ goal, pace: goalPace(goal) }))
  const saved = goals?.reduce((sum, g) => sum + g.goal.accumulatedAmount, 0) ?? 0

  return (
    <section aria-labelledby="resumen-metas" className="rounded-2xl border bg-card p-5">
      <div className="mb-3.5 flex items-baseline justify-between gap-2">
        <h2 id="resumen-metas" className="text-sm font-medium text-muted-foreground">
          Metas{goals && goals.length > 0 ? ` · ${formatSoles(saved)} apartados` : ''}
        </h2>
        <Link to="/metas" className="flex items-center gap-1 text-[13px] font-medium whitespace-nowrap underline-offset-4 hover:underline">
          Ver metas
          <ArrowRight className="size-3.5" aria-hidden="true" />
        </Link>
      </div>
      {query.error && !goals ? (
        <p className="py-8 text-center text-sm text-muted-foreground">No pudimos cargar tus metas.</p>
      ) : !goals ? (
        <Skeleton className="h-48 w-full rounded-xl" />
      ) : goals.length === 0 ? (
        <div className="py-8 text-center">
          <strong className="block text-sm font-semibold">No tienes metas en curso</strong>
          <span className="mt-1 block text-[13px] text-muted-foreground">Ponle nombre, monto y fecha a algo que quieras lograr.</span>
        </div>
      ) : (
        <ul className="divide-y">
          {goals.slice(0, 3).map(({ goal, pace }) => (
            <li key={goal.id} className="grid gap-1.5 py-3 first:pt-0 last:pb-0">
              <div className="flex items-baseline justify-between gap-2">
                <Link to={`/metas/${goal.id}`} className="truncate font-semibold underline-offset-4 hover:underline">
                  {goal.name}
                </Link>
                <span className="font-mono text-[13px] whitespace-nowrap text-muted-foreground tabular-nums">
                  {formatSoles(goal.accumulatedAmount)} / {formatSoles(goal.targetAmount)}
                </span>
              </div>
              <div
                role="img"
                aria-label={`${pct(pace.progress)} % ahorrado; por el tiempo que pasó deberías llevar ${pct(pace.elapsed)} %`}
                className="relative h-2 rounded-full bg-muted"
              >
                <i className="absolute inset-y-0 left-0 rounded-full bg-[var(--sage)]" style={{ width: `${pct(pace.progress)}%` }} />
                <u className="absolute -inset-y-[3px] w-0.5 bg-foreground/55" style={{ left: `${pct(pace.elapsed)}%` }} />
              </div>
              <p className="flex flex-wrap items-center gap-2 text-[13px] text-muted-foreground">
                <span className={cn('rounded-full border px-2 text-xs font-medium', pace.late ? 'border-loss text-loss' : 'border-gain text-gain')}>
                  {pace.late ? 'Atrasada' : 'A tiempo'}
                </span>
                {pct(pace.progress)} % · deberías llevar {pct(pace.elapsed)} %
              </p>
              {(() => {
                const eta = forecasts?.get(goal.id) && forecastLabel(forecasts.get(goal.id)!)
                return eta && <p className={cn('text-xs font-medium', eta.late ? 'text-warning' : 'text-gain')}>{eta.text}</p>
              })()}
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
