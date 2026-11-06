import { forecastMonthLong, forecastMonthShort, type GoalForecast } from '@/lib/goalForecast'
import { formatSoles } from '@/lib/format'
import type { SavingsGoal } from '@/types/goals'

const W = 300
const H = 130
const PAD = { l: 4, r: 50, t: 10, b: 20 }
const monthIndex = (month: string) => Number(month.slice(0, 4)) * 12 + Number(month.slice(5, 7)) - 1

/** Lo ahorrado, a donde llega con el ritmo actual y la linea para llegar justo a la fecha limite. */
export function ForecastChart({ goal, forecast, today }: { goal: SavingsGoal; forecast: GoalForecast; today: string }) {
  const now = today.slice(0, 7)
  const deadline = goal.deadline.slice(0, 7)
  const history = forecast.history.length ? forecast.history : [{ month: now, total: goal.accumulatedAmount }]
  const first = history[0].month
  const end = [forecast.arrival ?? deadline, deadline, now].sort().at(-1)!
  const span = Math.max(monthIndex(end) - monthIndex(first), 1)
  const x = (month: string) => PAD.l + ((monthIndex(month) - monthIndex(first)) / span) * (W - PAD.l - PAD.r)
  const y = (value: number) => PAD.t + (1 - value / (goal.targetAmount * 1.08)) * (H - PAD.t - PAD.b)
  // El ultimo punto es lo que la meta tiene hoy, aunque haya ajustes que no son aportes.
  const points = [...history.filter((p) => p.month < now), { month: now, total: goal.accumulatedAmount }]
  const line = points.map((p) => `${x(p.month).toFixed(1)},${y(p.total).toFixed(1)}`).join(' ')
  const late = (forecast.monthsLate ?? 0) > 0
  const tone = late ? 'var(--warning)' : 'var(--gain)'

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      className="h-auto w-full overflow-visible"
      role="img"
      aria-label={
        forecast.arrival
          ? `A tu ritmo llegas a ${formatSoles(goal.targetAmount)} en ${forecastMonthLong(forecast.arrival)}; la fecha límite es ${forecastMonthLong(deadline)}.`
          : `Sin aportes en los últimos meses no hay fecha de llegada; la fecha límite es ${forecastMonthLong(deadline)}.`
      }
    >
      <line x1={PAD.l} x2={W - PAD.r} y1={y(goal.targetAmount)} y2={y(goal.targetAmount)} stroke="var(--border)" strokeDasharray="3 3" />
      <text x={W - PAD.r + 6} y={y(goal.targetAmount) + 4} fontSize="10" fill="var(--muted-foreground)" fontFamily="var(--font-mono)">
        {formatSoles(goal.targetAmount).replace(/\.00$/, '')}
      </text>
      <line x1={x(deadline)} x2={x(deadline)} y1={PAD.t} y2={H - PAD.b} stroke="var(--muted-foreground)" strokeDasharray="2 3" opacity=".6" />
      <text x={x(deadline)} y={H - 5} fontSize="10" fill="var(--muted-foreground)" textAnchor="middle">
        {forecastMonthShort(deadline)}
      </text>
      <text x={PAD.l} y={H - 5} fontSize="10" fill="var(--muted-foreground)">
        {forecastMonthShort(first)}
      </text>
      <polygon points={`${x(first)},${y(0)} ${line} ${x(now)},${y(0)}`} fill="var(--accent-ink)" opacity=".12" />
      <polyline
        points={`${x(now)},${y(goal.accumulatedAmount)} ${x(deadline)},${y(goal.targetAmount)}`}
        fill="none"
        stroke="var(--gain)"
        strokeWidth="2"
        strokeDasharray="1.5 4"
        strokeLinecap="round"
      />
      {forecast.arrival && (
        <>
          <polyline
            points={`${x(now)},${y(goal.accumulatedAmount)} ${x(forecast.arrival)},${y(goal.targetAmount)}`}
            fill="none"
            stroke="var(--accent-ink)"
            strokeWidth="2"
            strokeDasharray="5 5"
          />
          <circle cx={x(forecast.arrival)} cy={y(goal.targetAmount)} r="4" fill="var(--card)" stroke={tone} strokeWidth="2" />
          <text x={x(forecast.arrival)} y={y(goal.targetAmount) - 9} fontSize="10" fontWeight="600" fill={tone} textAnchor="middle">
            {forecastMonthShort(forecast.arrival)}
          </text>
        </>
      )}
      <polyline points={line} fill="none" stroke="var(--accent-ink)" strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" />
      <circle cx={x(now)} cy={y(goal.accumulatedAmount)} r="4.5" fill="var(--accent-ink)" stroke="var(--card)" strokeWidth="2" />
    </svg>
  )
}
