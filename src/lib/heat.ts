import type { DaySummary } from './monthOverview'

/**
 * Nivel de 1 a 5 de cada dia con gasto, por posicion: los dias se ordenan por lo gastado y se
 * reparten en quintos. Contra el dia mas caro casi todos caerian en dos o tres tonos, porque se
 * gasta parecido casi todos los dias; asi siempre se ven los cinco.
 */
export function heatLevels(days: Iterable<DaySummary>): Map<string, number> {
  const spending = [...days].filter((day) => day.spent > 0).sort((a, b) => a.spent - b.spent)
  return new Map(spending.map((day, i) => [day.date, 1 + Math.floor((i * 5) / spending.length)]))
}
