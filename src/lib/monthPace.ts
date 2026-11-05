import { todayIso } from './dates'
import { daysInMonth, summarizeMonth } from './monthOverview'
import type { ExpenseCategory, Movement } from '@/types/movements'

export interface CategoryPace {
  category: ExpenseCategory
  total: number
  /** Parte del gasto del mes, de 0 a 1. */
  share: number
  /** Diferencia con lo gastado en esa categoria a la misma altura del mes pasado. */
  diff: number
  previous: number
}

export interface MonthPace {
  day: number
  days: number
  earned: number
  spent: number
  /** Lo gastado el mes pasado hasta el mismo dia. */
  previousToDate: number
  /** Variacion del gasto contra el mes pasado al mismo dia, en %; null si el mes pasado no hubo gasto. */
  change: number | null
  remaining: number
  /** Lo que se puede gastar por dia hasta fin de mes sin pasarse; null si ya no queda. */
  allowance: number | null
  /** Lo que se esta gastando por dia. */
  pace: number
  /** Lo que se gastaria al terminar el mes a este ritmo. */
  projected: number
  /** Gasto acumulado dia a dia: este mes hasta hoy y el mes pasado completo. */
  cumulative: number[]
  previousCumulative: number[]
  categories: CategoryPace[]
}

const cents = (value: number) => Math.round(value * 100) / 100
const dayOf = (iso: string) => Number(iso.slice(8, 10))

function cumulativeSpend(movements: Movement[], days: number): number[] {
  const perDay = new Array<number>(days).fill(0)
  for (const m of movements) if (m.kind === 'EXPENSE') perDay[dayOf(m.date) - 1] += m.amount
  let sum = 0
  return perDay.map((value) => (sum = cents(sum + value)))
}

/** Como va el mes contra el mes pasado a la misma altura, y a que ritmo se esta gastando. */
export function monthPace(current: Movement[], previous: Movement[], month: string, previousMonth: string, today = todayIso()): MonthPace {
  const days = daysInMonth(month)
  const day = today.startsWith(month) ? dayOf(today) : days
  const previousDays = daysInMonth(previousMonth)
  const sameDay = Math.min(day, previousDays)

  const now = summarizeMonth(current)
  const before = summarizeMonth(previous.filter((m) => dayOf(m.date) <= sameDay))
  const previousToDate = before.spent
  const remaining = cents(now.earned - now.spent)
  const left = days - day
  const pace = cents(now.spent / day)
  const beforeBy = new Map(before.categories.map((c) => [c.category, c.total]))

  return {
    day,
    days,
    earned: now.earned,
    spent: now.spent,
    previousToDate,
    change: previousToDate > 0 ? ((now.spent - previousToDate) / previousToDate) * 100 : null,
    remaining,
    allowance: left > 0 && remaining > 0 ? cents(remaining / left) : null,
    pace,
    projected: cents(now.spent + pace * left),
    cumulative: cumulativeSpend(current, days).slice(0, day),
    previousCumulative: cumulativeSpend(previous, previousDays),
    categories: now.categories.map((c) => ({
      category: c.category,
      total: c.total,
      share: now.spent > 0 ? c.total / now.spent : 0,
      previous: beforeBy.get(c.category) ?? 0,
      diff: cents(c.total - (beforeBy.get(c.category) ?? 0)),
    })),
  }
}
