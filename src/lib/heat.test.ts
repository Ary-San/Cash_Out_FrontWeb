import type { DaySummary } from './monthOverview'
import { heatLevels } from './heat'

const day = (date: string, spent: number): DaySummary => ({ date, spent, earned: 0, movements: [] })

describe('heatLevels', () => {
  it('reparte los dias en cinco tonos por lo que se gasto, del menor al mayor', () => {
    const days = Array.from({ length: 10 }, (_, i) => day(`2026-11-${String(i + 1).padStart(2, '0')}`, 20 + i))
    const levels = heatLevels(days)

    expect(levels.get('2026-11-01')).toBe(1)
    expect(levels.get('2026-11-10')).toBe(5)
    expect(new Set(levels.values()).size).toBe(5)
  })

  it('un dia sin gasto no lleva tono', () => {
    const levels = heatLevels([day('2026-11-01', 0), day('2026-11-02', 15)])

    expect(levels.has('2026-11-01')).toBe(false)
    expect(levels.get('2026-11-02')).toBe(1)
  })
})
