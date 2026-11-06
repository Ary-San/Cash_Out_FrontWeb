import type { ExpenseCategory, Movement } from '@/types/movements'

export interface RecurringExpense {
  key: string
  label: string
  amount: number
  category: ExpenseCategory
  /** Dia del mes en que suele pagarse: el del mes pasado. */
  day: number
  status: 'paid' | 'upcoming' | 'late'
  /** Para 'upcoming': cuantos dias faltan. */
  daysLeft: number
}

const keyOf = (m: Movement) => `${(m.label ?? '').trim().toLowerCase()}|${m.amount.toFixed(2)}`
const dayOf = (iso: string) => Number(iso.slice(8, 10))

/**
 * Gastos fijos: el mismo nombre y monto en cada uno de los dos meses anteriores.
 * `today` es el dia del mes que se mira (el ultimo dia si es un mes pasado).
 */
export function recurringExpenses(current: Movement[], previous: Movement[], beforePrevious: Movement[], today: number): RecurringExpense[] {
  const expenses = (list: Movement[]) => list.filter((m) => m.kind === 'EXPENSE' && m.label?.trim())
  const older = new Set(expenses(beforePrevious).map(keyOf))
  const paid = new Set(expenses(current).map(keyOf))
  const seen = new Set<string>()
  const found: RecurringExpense[] = []
  for (const m of expenses(previous)) {
    const key = keyOf(m)
    if (!older.has(key) || seen.has(key)) continue
    seen.add(key)
    const day = dayOf(m.date)
    found.push({
      key,
      label: m.label!.trim(),
      amount: m.amount,
      category: m.category ?? 'OTHER',
      day,
      status: paid.has(key) ? 'paid' : day >= today ? 'upcoming' : 'late',
      daysLeft: Math.max(day - today, 0),
    })
  }
  return found.sort((a, b) => a.day - b.day)
}
