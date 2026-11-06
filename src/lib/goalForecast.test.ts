import type { Contribution, SavingsGoal } from '@/types/goals'
import { forecastLabel, goalForecast } from './goalForecast'

const goal = (overrides: Partial<SavingsGoal> = {}): SavingsGoal => ({
  id: 1,
  name: 'Laptop para la U',
  targetAmount: 3500,
  accumulatedAmount: 1850,
  progressPercent: 52.86,
  deadline: '2027-03-31',
  status: 'IN_PROGRESS',
  completedAt: null,
  createdAt: '2026-05-10T15:00:00',
  ...overrides,
})
let id = 0
const aporte = (date: string, amount: number): Contribution => ({ id: ++id, amount, source: 'MANUAL', createdAt: `${date}T15:00:00` })
const laptop = [aporte('2026-05-10', 450), aporte('2026-08-12', 200), aporte('2026-09-15', 250), aporte('2026-10-14', 250), aporte('2026-11-15', 250)]

describe('goalForecast', () => {
  it('con el promedio de los ultimos tres meses dice cuando llega y cuanto tarde', () => {
    const f = goalForecast(goal(), laptop, '2026-11-18')!

    expect(f.rate).toBe(250)
    expect(f.arrival).toBe('2027-06')
    expect(f.monthsLate).toBe(3)
    expect(forecastLabel(f)).toEqual({ text: 'Llegas en jun · 3 meses tarde', late: true })
  })

  it('dice cuanto aportar al mes para llegar justo, redondeado a S/ 5', () => {
    // Faltan S/ 1,650 en 4 meses (de noviembre a marzo): S/ 412.50, redondeado a S/ 415.
    expect(goalForecast(goal(), laptop, '2026-11-18')!.needed).toBe(415)
  })

  it('una meta nueva promedia solo los meses que lleva', () => {
    const f = goalForecast(goal({ createdAt: '2026-11-02T10:00:00', accumulatedAmount: 300, targetAmount: 1000, deadline: '2027-12-31' }), [aporte('2026-11-03', 300)], '2026-11-18')!

    expect(f.rate).toBe(300)
    expect(forecastLabel(f)!.late).toBe(false)
  })

  it('sin aportes recientes no inventa una fecha', () => {
    const f = goalForecast(goal(), [aporte('2026-05-10', 450)], '2026-11-18')!

    expect(f.arrival).toBeNull()
    expect(forecastLabel(f)).toBeNull()
  })

  it('arma lo ahorrado al cierre de cada mes', () => {
    expect(goalForecast(goal(), laptop, '2026-11-18')!.history).toEqual([
      { month: '2026-05', total: 450 },
      { month: '2026-08', total: 650 },
      { month: '2026-09', total: 900 },
      { month: '2026-10', total: 1150 },
      { month: '2026-11', total: 1400 },
    ])
  })

  it('una meta cumplida no tiene pronostico', () => {
    expect(goalForecast(goal({ status: 'COMPLETED' }), laptop)).toBeNull()
  })
})
