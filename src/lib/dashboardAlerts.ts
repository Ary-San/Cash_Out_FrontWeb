import { CATEGORY_META } from './categories'
import { goalPace } from './dashboard'
import { formatDate, formatSoles } from './format'
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
export function buildAlerts(goals: SavingsGoal[] | undefined, pace: MonthPace | undefined, previousName: string): DashboardAlert[] {
  const alerts: DashboardAlert[] = []
  const late = goals
    ?.filter((goal) => goal.status === 'IN_PROGRESS')
    .map((goal) => ({ goal, pace: goalPace(goal) }))
    .find((g) => g.pace.late && !g.pace.dueSoon)
  if (late) {
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
