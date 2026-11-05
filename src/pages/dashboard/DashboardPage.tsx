import { Link, useSearchParams } from 'react-router'
import { Plus } from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import { useApiQuery } from '@/hooks/useApiQuery'
import { DEFAULT_CASH_FLOW_RANGE, isCashFlowRange, monthsFor, monthsThisYear, type CashFlowRange } from '@/lib/cashFlow'
import { firstName, formatDateTime } from '@/lib/format'
import { currentMonth, shiftMonth } from '@/lib/monthOverview'
import { monthPace } from '@/lib/monthPace'
import { buildAlerts } from '@/lib/dashboardAlerts'
import { goalService } from '@/services/goalService'
import { movementService } from '@/services/movementService'
import { portfolioService } from '@/services/portfolioService'
import { savingsService } from '@/services/savingsService'
import { walletService } from '@/services/walletService'
import { CashFlowBars } from '@/components/dashboard/CashFlowBars'
import { CategorySplitCard } from '@/components/dashboard/CategorySplitCard'
import { DashboardAlerts } from '@/components/dashboard/DashboardAlerts'
import { FirstStepsCard } from '@/components/dashboard/FirstStepsCard'
import { GoalsPaceCard } from '@/components/dashboard/GoalsPaceCard'
import { MonthPaceCard } from '@/components/dashboard/MonthPaceCard'
import { MarketComparisonCard } from '@/components/dashboard/MarketComparisonCard'
import { PortfolioSummaryCard } from '@/components/dashboard/PortfolioSummaryCard'
import { RecentActivityCard } from '@/components/dashboard/RecentActivityCard'
import { SavingsCard } from '@/components/dashboard/SavingsCard'
import { SavingsRateCard } from '@/components/dashboard/SavingsRateCard'
import { TokenWalletCard } from '@/components/dashboard/TokenWalletCard'
import { PageHeader } from '@/components/layout/PageHeader'
import { Button } from '@/components/ui/button'

export default function DashboardPage() {
  const { user } = useAuth()
  const savings = useApiQuery(['savings'], (signal) => savingsService.get(signal))
  const wallet = useApiQuery(['token-wallet'], (signal) => walletService.get(signal))
  const tokenMoves = useApiQuery(['token-moves'], (signal) =>
    walletService.transactions({ page: 0, size: 3, sort: 'createdAt,desc' }, signal),
  )
  const goals = useApiQuery(['goals'], (signal) => goalService.list(signal))
  const portfolio = useApiQuery(['portfolio'], (signal) => portfolioService.get(signal))
  // Los ultimos movimientos tambien dicen si la cuenta es nueva: un grafico en cero no alcanza para saberlo.
  const recent = useApiQuery(['movements', 'recent'], (signal) => movementService.list({ page: 0, size: 5 }, signal))

  const [searchParams, setSearchParams] = useSearchParams()
  const rangeParam = searchParams.get('rango')
  const range: CashFlowRange = isCashFlowRange(rangeParam) ? rangeParam : DEFAULT_CASH_FLOW_RANGE
  const months = monthsFor(range)
  const flows = useApiQuery(['movements', 'monthly', months], (signal) => movementService.monthly(months, signal))
  const yearMonths = monthsThisYear()
  const year = useApiQuery(['movements', 'monthly', yearMonths], (signal) => movementService.monthly(yearMonths, signal))

  // El mes en curso y el anterior completos: para comparar a la misma altura del mes.
  const month = currentMonth()
  const previousMonth = shiftMonth(month, -1)
  const thisMonth = useApiQuery(['movements', 'month', month], (signal) => movementService.month(month, signal))
  const lastMonth = useApiQuery(['movements', 'month', previousMonth], (signal) => movementService.month(previousMonth, signal))
  const pace = thisMonth.data && lastMonth.data ? monthPace(thisMonth.data, lastMonth.data, month, previousMonth) : undefined
  const previousName = new Intl.DateTimeFormat('es-PE', { month: 'long' }).format(new Date(`${previousMonth}-15T12:00:00`))

  const s = savings.data
  const isNewAccount = recent.data?.totalElements === 0
  const hasPositions = (portfolio.data?.positions.length ?? 0) > 0
  const goalsInProgress = goals.data?.filter((goal) => goal.status === 'IN_PROGRESS').length

  const changeRange = (next: CashFlowRange) =>
    setSearchParams(
      (prev) => {
        const params = new URLSearchParams(prev)
        params.set('rango', next)
        return params
      },
      // Cambiar el rango no es navegar: la pagina se queda donde esta.
      { replace: true, preventScrollReset: true },
    )

  return (
    <>
      <PageHeader
        title={user ? `Hola, ${firstName(user.name)}` : 'Resumen'}
        description={
          isNewAccount
            ? 'Bienvenida a Cash-Out. Empecemos por lo básico.'
            : s
              ? `Saldos actualizados el ${formatDateTime(s.updatedAt)}`
              : 'Así van tus finanzas.'
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
      )}

      {!isNewAccount && <DashboardAlerts alerts={buildAlerts(goals.data, pace, previousName)} />}

      <div className="grid gap-5 lg:grid-cols-3">
        {!isNewAccount && (
          <>
            <GoalsPaceCard query={goals} />
            <CategorySplitCard pace={pace} previousName={previousName} />
          </>
        )}
        <RecentActivityCard movements={recent} />
      </div>

      {!isNewAccount && <SavingsCard savings={savings} year={year} goalsInProgress={goalsInProgress} />}
      <div className="grid gap-5 lg:grid-cols-3">
        {!isNewAccount && <CashFlowBars query={flows} range={range} onRangeChange={changeRange} />}
        <SavingsRateCard year={year} />
      </div>

      {/* Lo simulado va aparte, con su etiqueta: fichas, no dinero real. */}
      <section aria-labelledby="resumen-simulador" className="grid gap-4 rounded-3xl border-[1.5px] border-dashed border-accent-ink/45 bg-accent/35 p-4 sm:p-5">
        <div className="flex flex-wrap items-center gap-3">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-accent-ink bg-card py-0.5 pr-2.5 pl-1 text-xs font-semibold text-accent-ink">
            <img src="/cashout-chip.svg" alt="" className="size-4.5" />
            Simulador · fichas, no dinero real
          </span>
          <h2 id="resumen-simulador" className="text-[15px] font-semibold">
            Tu portafolio de práctica
          </h2>
        </div>
        <div className="grid gap-5 lg:grid-cols-3">
          <TokenWalletCard wallet={wallet} moves={tokenMoves} ownerName={user?.name ?? ''} />
          {(!isNewAccount || hasPositions) && <PortfolioSummaryCard query={portfolio} />}
          {hasPositions && portfolio.data && <MarketComparisonCard portfolio={portfolio.data} />}
        </div>
        <p className="px-1 text-xs text-muted-foreground">Precios reales del mercado de EE. UU. (Alpaca). Las compras y ventas son con fichas.</p>
      </section>
    </>
  )
}
