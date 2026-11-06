import { todayIso } from './dates'
import { shiftMonth } from './monthOverview'
import type { Contribution, SavingsGoal } from '@/types/goals'

const WINDOW = 3
const monthOf = (iso: string) => iso.slice(0, 7)
const monthIndex = (month: string) => Number(month.slice(0, 4)) * 12 + Number(month.slice(5, 7)) - 1

export interface GoalForecast {
  /** Lo que se viene aportando al mes: promedio de los ultimos tres meses (o desde que existe la meta). */
  rate: number
  /** yyyy-MM en que se llega a ese ritmo; null si no hay aportes recientes. */
  arrival: string | null
  /** Meses entre la llegada y la fecha limite: positivo es tarde, negativo es antes. */
  monthsLate: number | null
  /** Lo que habria que aportar al mes desde ahora para llegar justo a la fecha limite. */
  needed: number
  /** Lo ahorrado al cierre de cada mes, desde el primer aporte. */
  history: { month: string; total: number }[]
}

/** A donde llega una meta en curso con lo que se viene aportando de verdad. */
export function goalForecast(goal: SavingsGoal, contributions: readonly Contribution[], today = todayIso()): GoalForecast | null {
  if (goal.status !== 'IN_PROGRESS') return null
  const month = monthOf(today)
  const created = monthOf(goal.createdAt)
  const months = Math.max(1, Math.min(WINDOW, monthIndex(month) - monthIndex(created) + 1))
  const since = shiftMonth(month, -(months - 1))
  const recent = contributions.filter((c) => monthOf(c.createdAt) >= since).reduce((sum, c) => sum + c.amount, 0)
  const rate = Math.max(0, recent / months)
  const remaining = Math.max(goal.targetAmount - goal.accumulatedAmount, 0)
  const deadline = monthOf(goal.deadline)
  const arrival = rate > 0 ? shiftMonth(month, Math.ceil(remaining / rate)) : null
  const left = Math.max(monthIndex(deadline) - monthIndex(month), 1)

  const sorted = [...contributions].sort((a, b) => a.createdAt.localeCompare(b.createdAt))
  const history: { month: string; total: number }[] = []
  let total = 0
  for (const c of sorted) {
    total += c.amount
    const m = monthOf(c.createdAt)
    if (history.at(-1)?.month === m) history.at(-1)!.total = total
    else history.push({ month: m, total })
  }

  return {
    rate,
    arrival,
    monthsLate: arrival ? monthIndex(arrival) - monthIndex(deadline) : null,
    // Redondeado a S/ 5 hacia arriba: un monto facil de recordar.
    needed: Math.ceil(remaining / left / 5) * 5,
    history,
  }
}

const SHORT = new Intl.DateTimeFormat('es-PE', { month: 'short' })
const LONG = new Intl.DateTimeFormat('es-PE', { month: 'long', year: 'numeric' })
const date = (month: string) => new Date(`${month}-15T12:00:00`)
export const forecastMonthShort = (month: string) => SHORT.format(date(month)).replace('.', '').toLowerCase()
export const forecastMonthLong = (month: string) => LONG.format(date(month)).toLowerCase()

/** "Llegas en jun · 3 meses tarde", "… justo a tiempo", "… 2 meses antes". */
export function forecastLabel(f: GoalForecast): { text: string; late: boolean } | null {
  if (!f.arrival || f.monthsLate === null) return null
  const n = Math.abs(f.monthsLate)
  const span = n === 1 ? '1 mes' : `${n} meses`
  const when = `Llegas en ${forecastMonthShort(f.arrival)}`
  if (f.monthsLate > 0) return { text: `${when} · ${span} tarde`, late: true }
  if (f.monthsLate < 0) return { text: `${when} · ${span} antes`, late: false }
  return { text: `${when} · justo a tiempo`, late: false }
}
