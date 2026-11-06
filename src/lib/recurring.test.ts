import type { Movement } from '@/types/movements'
import { recurringExpenses } from './recurring'

let id = 0
const expense = (date: string, label: string, amount: number, category: Movement['category'] = 'OTHER'): Movement => ({
  id: ++id,
  kind: 'EXPENSE',
  label,
  category,
  amount,
  date,
  createdAt: `${date}T12:00:00`,
})

describe('recurringExpenses', () => {
  const september = [expense('2026-09-03', 'Gimnasio de la U', 35), expense('2026-09-05', 'Spotify', 19.9, 'LEISURE'), expense('2026-09-22', 'Plan de celular', 29.9), expense('2026-09-10', 'Chifa', 30, 'FOOD')]
  const october = [expense('2026-10-03', 'Gimnasio de la U', 35), expense('2026-10-05', 'spotify ', 19.9, 'LEISURE'), expense('2026-10-22', 'Plan de celular', 29.9), expense('2026-10-11', 'Chifa', 42, 'FOOD')]
  const november = [expense('2026-11-03', 'Gimnasio de la U', 35), expense('2026-11-05', 'Spotify', 19.9, 'LEISURE')]

  it('encuentra lo que se repite con el mismo nombre y monto, sin importar mayusculas ni espacios', () => {
    const found = recurringExpenses(november, october, september, 18)

    expect(found.map((r) => r.label)).toEqual(['Gimnasio de la U', 'spotify', 'Plan de celular'])
    expect(found.find((r) => r.label === 'Chifa')).toBeUndefined()
  })

  it('dice si ya se pago este mes o cuantos dias faltan', () => {
    const [gym, spotify, phone] = recurringExpenses(november, october, september, 18)

    expect(gym.status).toBe('paid')
    expect(spotify.status).toBe('paid')
    expect(phone).toMatchObject({ status: 'upcoming', day: 22, daysLeft: 4 })
  })

  it('si ya paso su dia y no aparece, queda pendiente', () => {
    const [, , phone] = recurringExpenses(november, october, september, 25)

    expect(phone.status).toBe('late')
  })
})
