import { CATEGORY_META } from './categories'
import { goalPace } from './dashboard'
import { formatDate, formatSoles } from './format'
import { forecastMonthLong, type GoalForecast } from './goalForecast'
import type { MonthPace } from './monthPace'
import type { SavingsGoal } from '@/types/goals'

export interface DashboardAlert {
  key: string
  tone: 'warning' | 'info'
  title: string
  text: string
  action: { label: string; to: string }
}

/** Solo avisos que piden algo: una meta atrasada y la categoria que mas crecio. */
export function buildAlerts(
  goals: SavingsGoal[] | undefined,
  pace: MonthPace | undefined,
  previousName: string,
  forecasts?: Map<number, GoalForecast | null>,
): DashboardAlert[] {
  const alerts: DashboardAlert[] = []
  // Con aportes recientes manda el ritmo real: la meta que mas tarde llegaria.
  const behind = goals
    ?.map((goal) => ({ goal, forecast: forecasts?.get(goal.id) }))
    .filter((g): g is { goal: SavingsGoal; forecast: GoalForecast } => (g.forecast?.monthsLate ?? 0) > 0)
    .sort((a, b) => b.forecast.monthsLate! - a.forecast.monthsLate!)[0]
  if (behind) {
    const { goal, forecast } = behind
    const late = forecast.monthsLate!
    alerts.push({
      key: `goal-${goal.id}`,
      tone: 'warning',
      title: `${goal.name} va atrasada`,
      text: `Con tus aportes de los últimos meses (${formatSoles(forecast.rate)} al mes) llegas en ${forecastMonthLong(forecast.arrival!)}, ${late === 1 ? 'un mes' : `${late} meses`} después del ${formatDate(goal.deadline)}. Para llegar a tiempo aporta ${formatSoles(forecast.needed)} al mes.`,
      action: { label: `Aportar ${formatSoles(forecast.needed)}`, to: `/metas/${goal.id}` },
    })
  }
  const late = goals
    ?.filter((goal) => goal.status === 'IN_PROGRESS')
    .map((goal) => ({ goal, pace: goalPace(goal) }))
    .find((g) => g.pace.late && !g.pace.dueSoon && !forecasts?.get(g.goal.id)?.arrival)
  if (late && !behind) {
    alerts.push({
      key: `goal-${late.goal.id}`,
      tone: 'warning',
      title: `${late.goal.name} va atrasada`,
      text: `Lleva ${Math.round(late.pace.progress * 100)} % y ya pasó el ${Math.round(late.pace.elapsed * 100)} % del plazo. Para llegar al ${formatDate(late.goal.deadline)} te falta apartar ${formatSoles(late.pace.perMonth)} al mes.`,
      action: { label: `Aportar a ${late.goal.name}`, to: `/metas/${late.goal.id}` },
    })
  }
  const grew = pace?.categories.filter((c) => c.previous > 0 && c.diff > 0).sort((a, b) => b.diff - a.diff)[0]
  if (grew) {
    const label = CATEGORY_META[grew.category].label
    alerts.push({
      key: `cat-${grew.category}`,
      tone: 'info',
      title: `${label} subió ${Math.round((grew.diff / grew.previous) * 100)} %`,
      text: `Llevas ${formatSoles(grew.total)}, ${formatSoles(grew.diff)} más que a esta altura de ${previousName}. Es el ${Math.round(grew.share * 100)} % de lo que gastaste este mes.`,
      action: { label: `Ver gastos de ${label.toLowerCase()}`, to: `/movimientos/gastos?category=${grew.category}` },
    })
  }
  return alerts
}
