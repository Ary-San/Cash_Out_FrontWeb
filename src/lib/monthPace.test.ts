import type { Movement } from '@/types/movements'
import { monthPace } from './monthPace'

let id = 0
const expense = (date: string, amount: number, category: Movement['category'] = 'FOOD'): Movement => ({
  id: ++id,
  kind: 'EXPENSE',
  label: null,
  category,
  amount,
  date,
  createdAt: `${date}T12:00:00`,
})
const income = (date: string, amount: number): Movement => ({ ...expense(date, amount), kind: 'INCOME', category: null })

describe('monthPace', () => {
  const november = [income('2026-11-01', 1200), expense('2026-11-02', 300), expense('2026-11-10', 240, 'TRANSPORT')]
  const october = [expense('2026-10-03', 400), expense('2026-10-09', 200, 'TRANSPORT'), expense('2026-10-25', 500)]

  it('compara con lo gastado el mes pasado hasta el mismo dia, no con el mes entero', () => {
    const pace = monthPace(november, october, '2026-11', '2026-10', '2026-11-15')

    expect(pace.spent).toBe(540)
    expect(pace.previousToDate).toBe(600)
    expect(pace.change).toBeCloseTo(-10)
  })

  it('dice cuanto queda, cuanto se puede gastar por dia y a donde lleva el ritmo actual', () => {
    const pace = monthPace(november, october, '2026-11', '2026-10', '2026-11-15')

    expect(pace.remaining).toBe(660)
    expect(pace.allowance).toBe(44)
    expect(pace.pace).toBe(36)
    expect(pace.projected).toBe(1080)
  })

  it('reparte el gasto por categoria con su diferencia contra el mes pasado', () => {
    const [food, transport] = monthPace(november, october, '2026-11', '2026-10', '2026-11-15').categories

    expect(food).toMatchObject({ category: 'FOOD', total: 300, previous: 400, diff: -100 })
    expect(transport).toMatchObject({ category: 'TRANSPORT', total: 240, diff: 40 })
    expect(food.share).toBeCloseTo(300 / 540)
  })

  it('el acumulado llega hasta hoy y el del mes pasado cubre el mes entero', () => {
    const pace = monthPace(november, october, '2026-11', '2026-10', '2026-11-15')

    expect(pace.cumulative).toHaveLength(15)
    expect(pace.cumulative.at(-1)).toBe(540)
    expect(pace.previousCumulative).toHaveLength(31)
    expect(pace.previousCumulative.at(-1)).toBe(1100)
  })

  it('si ya se gasto mas de lo que entro no hay presupuesto por dia', () => {
    const pace = monthPace([income('2026-11-01', 100), expense('2026-11-02', 150)], [], '2026-11', '2026-10', '2026-11-10')

    expect(pace.allowance).toBeNull()
    expect(pace.change).toBeNull()
  })
})
