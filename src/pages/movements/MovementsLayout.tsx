import { useCallback, useMemo, useState } from 'react'
import { Outlet, useMatch, useSearchParams } from 'react-router'
import { Plus } from 'lucide-react'
import { useApiQuery } from '@/hooks/useApiQuery'
import { useReducedMotion } from '@/hooks/useReducedMotion'
import { formatSoles } from '@/lib/format'
import { formatMonthLong } from '@/lib/cashFlow'
import { todayIso } from '@/lib/dates'
import { currentMonth, daysInMonth, formatMonthTitle, monthFromParam, shiftMonth, summarizeMonth } from '@/lib/monthOverview'
import { monthPace } from '@/lib/monthPace'
import { recurringExpenses } from '@/lib/recurring'
import { movementService } from '@/services/movementService'
import { AssistantComposer } from '@/components/assistant/AssistantComposer'
import { DetectedInbox } from '@/components/assistant/DetectedInbox'
import { ErrorState } from '@/components/feedback/ErrorState'
import { CategoryDonut } from '@/components/movements/CategoryDonut'
import { MonthCompareCard } from '@/components/movements/MonthCompareCard'
import type { MovementsOutletContext } from '@/components/movements/MovementsList'
import { RecurringCard } from '@/components/movements/RecurringCard'
import { SpendingHeatmap } from '@/components/movements/SpendingHeatmap'
import { Button } from '@/components/ui/button'

/** Todos, Ingresos y Gastos comparten el encabezado y el mes de un vistazo; el detalle de cada uno va solo. */
export default function MovementsLayout() {
  const detail = useMatch('/movimientos/:tipo/:id')
  return detail ? <Outlet /> : <MovementsOverview />
}

function MovementsOverview() {
  const [searchParams, setSearchParams] = useSearchParams()
  const month = monthFromParam(searchParams.get('mes'))
  const [version, setVersion] = useState(0)
  const refresh = useCallback(() => setVersion((n) => n + 1), [])
  const reduced = useReducedMotion()

  const query = useApiQuery(['movements', 'month', month, version], (signal) => movementService.month(month, signal))
  const summary = useMemo(() => (query.data ? summarizeMonth(query.data) : undefined), [query.data])
  // Los dos meses anteriores: para comparar a la misma altura y para encontrar los gastos fijos.
  const previousMonth = shiftMonth(month, -1)
  const previous = useApiQuery(['movements', 'month', previousMonth, version], (signal) => movementService.month(previousMonth, signal))
  const beforePrevious = useApiQuery(['movements', 'month', shiftMonth(month, -2), version], (signal) => movementService.month(shiftMonth(month, -2), signal))
  const today = todayIso()
  const isCurrent = today.startsWith(month)
  const pace = useMemo(
    () => (query.data && previous.data ? monthPace(query.data, previous.data, month, previousMonth, isCurrent ? today : `${month}-${daysInMonth(month)}`) : undefined),
    [query.data, previous.data, month, previousMonth, isCurrent, today],
  )
  const recurring = useMemo(
    () =>
      query.data && previous.data && beforePrevious.data
        ? recurringExpenses(query.data, previous.data, beforePrevious.data, isCurrent ? Number(today.slice(8, 10)) : daysInMonth(month))
        : undefined,
    [query.data, previous.data, beforePrevious.data, isCurrent, today, month],
  )

  const changeParams = (change: (params: URLSearchParams) => void, replace: boolean) =>
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev)
        change(next)
        return next
      },
      { replace, preventScrollReset: true },
    )

  const changeMonth = (next: string) =>
    changeParams((params) => {
      if (next === currentMonth()) params.delete('mes')
      else params.set('mes', next)
    }, true)

  const showDay = (date: string) => {
    changeParams((params) => {
      params.set('from', date)
      params.set('to', date)
      params.delete('page')
    }, false)
    document.getElementById('movimientos-lista')?.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth' })
  }

  const context: MovementsOutletContext = { version, refresh, month, summary }

  return (
    <>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="font-display text-4xl leading-tight sm:text-5xl">
            Tus <em className="text-accent-ink">movimientos</em>
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {formatMonthTitle(month)} ·{' '}
            {summary ? (
              `entraron ${formatSoles(summary.earned)} y gastaste ${formatSoles(summary.spent)}`
            ) : (
              <span className="inline-block h-3.5 w-56 animate-pulse rounded-md bg-muted align-middle" />
            )}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={() => changeParams((params) => params.set('nuevo', 'gasto'), true)}>
            <Plus aria-hidden="true" />
            Registrar gasto
          </Button>
          <Button onClick={() => changeParams((params) => params.set('nuevo', 'ingreso'), true)}>
            <Plus aria-hidden="true" />
            Registrar ingreso
          </Button>
        </div>
      </div>

      <AssistantComposer onSaved={refresh} />
      <DetectedInbox version={version} onSaved={refresh} />

      {query.error && !query.data ? (
        <ErrorState error={query.error} onRetry={query.reload} title="No pudimos cargar el resumen del mes" />
      ) : (
        <>
          <SpendingHeatmap month={month} summary={summary} onMonthChange={changeMonth} onShowDay={showDay} />
          <div className="grid gap-5 lg:grid-cols-[minmax(0,1.25fr)_minmax(0,1fr)]">
            <CategoryDonut month={month} summary={summary} />
            <RecurringCard items={recurring} spent={summary?.spent ?? 0} />
          </div>
        </>
      )}

      <Outlet context={context} />

      {pace && (
        <MonthCompareCard
          pace={pace}
          monthName={formatMonthLong(month)}
          previousName={formatMonthLong(previousMonth)}
          incomes={query.data?.filter((m) => m.kind === 'INCOME').length ?? 0}
        />
      )}
    </>
  )
}
