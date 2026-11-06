import { useMemo } from 'react'
import { Link } from 'react-router'
import { Plus } from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import { useApiQuery } from '@/hooks/useApiQuery'
import { buildAlerts } from '@/lib/dashboardAlerts'
import { goalForecast } from '@/lib/goalForecast'
import { firstName } from '@/lib/format'
import { currentMonth, daysInMonth, shiftMonth } from '@/lib/monthOverview'
import { monthPace } from '@/lib/monthPace'
import { goalService } from '@/services/goalService'
import { movementService } from '@/services/movementService'
import { portfolioService } from '@/services/portfolioService'
import { walletService } from '@/services/walletService'
import { CategorySplitCard } from '@/components/dashboard/CategorySplitCard'
import { DashboardAlerts } from '@/components/dashboard/DashboardAlerts'
import { FirstStepsCard } from '@/components/dashboard/FirstStepsCard'
import { GoalsListCard } from '@/components/dashboard/GoalsListCard'
import { MonthPaceCard } from '@/components/dashboard/MonthPaceCard'
import { RecentActivityCard } from '@/components/dashboard/RecentActivityCard'
import { SimulatorCard } from '@/components/dashboard/SimulatorCard'
import { PageHeader } from '@/components/layout/PageHeader'
import { Button } from '@/components/ui/button'

const today = new Intl.DateTimeFormat('es-PE', { weekday: 'long', day: 'numeric', month: 'long' })
const monthName = (month: string) => new Intl.DateTimeFormat('es-PE', { month: 'long' }).format(new Date(`${month}-15T12:00:00`))

export default function DashboardPage() {
  const { user } = useAuth()
  const wallet = useApiQuery(['token-wallet'], (signal) => walletService.get(signal))
  const goals = useApiQuery(['goals'], (signal) => goalService.list(signal))
  // Los aportes de las metas en curso: para decir cuando llega cada una con el ritmo real.
  const running = goals.data?.filter((goal) => goal.status === 'IN_PROGRESS').map((goal) => goal.id)
  const contributions = useApiQuery(['goal-contributions', running ?? null], (signal) =>
    running ? Promise.all(running.map(async (goalId) => ({ goalId, items: await goalService.contributions(goalId, signal) }))) : Promise.resolve(null),
  )
  const forecasts = useMemo(
    () =>
      new Map(
        (goals.data ?? []).map((goal) => {
          const items = contributions.data?.find((entry) => entry.goalId === goal.id)?.items
          return [goal.id, items ? goalForecast(goal, items) : null]
        }),
      ),
    [goals.data, contributions.data],
  )
  const portfolio = useApiQuery(['portfolio'], (signal) => portfolioService.get(signal))
  // Los ultimos movimientos tambien dicen si la cuenta es nueva: un grafico en cero no alcanza para saberlo.
  const recent = useApiQuery(['movements', 'recent'], (signal) => movementService.list({ page: 0, size: 5 }, signal))

  // El mes en curso y el anterior completos: para comparar a la misma altura del mes.
  const month = currentMonth()
  const previousMonth = shiftMonth(month, -1)
  const thisMonth = useApiQuery(['movements', 'month', month], (signal) => movementService.month(month, signal))
  const lastMonth = useApiQuery(['movements', 'month', previousMonth], (signal) => movementService.month(previousMonth, signal))
  const pace = thisMonth.data && lastMonth.data ? monthPace(thisMonth.data, lastMonth.data, month, previousMonth) : undefined
  const previousName = monthName(previousMonth)
  const isNewAccount = recent.data?.totalElements === 0
  const now = new Date()

  return (
    <>
      <PageHeader
        title={user ? `Hola, ${firstName(user.name)}` : 'Resumen'}
        description={
          isNewAccount
            ? 'Bienvenida a Cash-Out. Empecemos por lo básico.'
            : `${today.format(now).replace(/^./, (c) => c.toUpperCase())} · día ${now.getDate()} de ${daysInMonth(month)}`
        }
        actions={
          <>
            <Button asChild variant="outline">
              <Link to="/movimientos/gastos?nuevo=1">
                <Plus aria-hidden="true" />
                Registrar gasto
              </Link>
            </Button>
            <Button asChild>
              <Link to="/movimientos/ingresos?nuevo=1">
                <Plus aria-hidden="true" />
                Registrar ingreso
              </Link>
            </Button>
          </>
        }
      />

      {isNewAccount ? (
        <FirstStepsCard />
      ) : (
        <>
          <MonthPaceCard
            month={month}
            previousMonth={previousMonth}
            pace={pace}
            error={thisMonth.error ?? lastMonth.error ?? null}
            onRetry={() => {
              thisMonth.reload()
              lastMonth.reload()
            }}
          />
          <DashboardAlerts alerts={buildAlerts(goals.data, pace, previousName, forecasts)} />
        </>
      )}

      <div className="grid gap-5 lg:grid-cols-3">
        {!isNewAccount && (
          <>
            <GoalsListCard query={goals} forecasts={forecasts} />
            <CategorySplitCard pace={pace} previousName={previousName} />
          </>
        )}
        <RecentActivityCard movements={recent} />
      </div>

      <SimulatorCard wallet={wallet} portfolio={portfolio} />
    </>
  )
}
