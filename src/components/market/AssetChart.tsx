import { useId, useMemo, useRef, useState, type KeyboardEvent, type PointerEvent, type ReactNode } from 'react'
import { changeOf, inRange } from '@/lib/assetStats'
import { CHART_RANGES, rangeLabel, type ChartRange } from '@/lib/chartRanges'
import { parseIsoDate } from '@/lib/dates'
import { formatSignedPercent, formatUsd } from '@/lib/market'
import { cn } from '@/lib/utils'
import type { PricePoint } from '@/types/market'
import { SegmentButton, Segmented } from '@/components/filters/Segmented'
import { BENCHMARK, ComparePicker } from './ComparePicker'

const MAX_POINTS = 260
const fullDate = new Intl.DateTimeFormat('es-PE', { day: 'numeric', month: 'short', year: 'numeric' })
const dayMonth = new Intl.DateTimeFormat('es-PE', { day: 'numeric', month: 'short' })
const monthYear = new Intl.DateTimeFormat('es-PE', { month: 'short', year: 'numeric' })

interface AssetChartProps {
  symbol: string
  points: PricePoint[]
  range: ChartRange
  onRangeChange(range: ChartRange): void
  /** Si se ofrece comparar (no para la cripto). */
  comparable?: boolean
  /** El activo contra el que se compara y sus cierres; null si no se compara. */
  comparison?: { symbol: string; points: PricePoint[] } | null
  /** El simbolo elegido, aunque sus cierres todavia no lleguen. */
  compareWith?: string | null
  onCompareChange?(symbol: string | null): void
  /** Cada linea con su propio eje, para que la que se mueve poco no quede aplastada. */
  ownScale?: boolean
  onOwnScaleChange?(next: boolean): void
  /** Costo promedio del usuario: se dibuja como referencia si cae dentro del grafico. */
  costBasis?: number | null
  /** Para la cripto: "En vivo" como una opcion mas del selector. */
  live?: { active: boolean; onSelect(): void; content: ReactNode }
}

function thin(points: PricePoint[]): PricePoint[] {
  if (points.length <= MAX_POINTS) return points
  const step = Math.ceil(points.length / MAX_POINTS)
  const out = points.filter((_, i) => i % step === 0)
  return out.at(-1) === points.at(-1) ? out : [...out, points.at(-1)!]
}

/** El precio del activo en el rango elegido, con cursor, comparacion contra el S&P 500 y tu costo. */
export function AssetChart({
  symbol,
  points,
  range,
  onRangeChange,
  comparable = false,
  comparison,
  compareWith = null,
  onCompareChange,
  ownScale = false,
  onOwnScaleChange,
  costBasis,
  live,
}: AssetChartProps) {
  const gradientId = useId()
  const [hover, setHover] = useState<number | null>(null)
  const plotRef = useRef<HTMLDivElement>(null)
  const liveActive = live?.active ?? false

  const chart = useMemo(() => {
    let visible = thin(inRange(points, range))
    let bench = comparison ? thin(inRange(comparison.points, range)) : []
    // Las dos lineas arrancan el mismo dia: si una empezo a cotizar despues, ese dia es el inicio de ambas.
    if (visible.length > 1 && bench.length > 1) {
      const start = visible[0].date > bench[0].date ? visible[0].date : bench[0].date
      visible = visible.filter((p) => p.date >= start)
      bench = bench.filter((p) => p.date >= start)
    }
    const comparing = Boolean(comparison) && bench.length > 1
    if (visible.length < 2) return null
    const time = (date: string) => parseIsoDate(date).getTime()
    const t0 = time(visible[0].date)
    const t1 = time(visible.at(-1)!.date)
    const x = (date: string) => ((time(date) - t0) / Math.max(1, t1 - t0)) * 1000
    const base = visible[0].closePrice
    const benchBase = bench[0]?.closePrice ?? 1
    const value = (point: PricePoint) => (comparing ? (point.closePrice / base - 1) * 100 : point.closePrice)
    const benchValue = (point: PricePoint) => (point.closePrice / benchBase - 1) * 100

    const scale = (list: number[]) => {
      let lo = Math.min(...list)
      let hi = Math.max(...list)
      const pad = (hi - lo) * 0.08 || Math.abs(hi) * 0.02 || 1
      lo -= pad
      hi += pad
      return {
        y: (v: number) => 300 - ((v - lo) / (hi - lo)) * 300,
        ticks: [0, 1, 2, 3].map((k) => hi - ((hi - lo) * (k + 0.5)) / 4),
      }
    }
    const values = visible.map(value)
    const benchValues = bench.map(benchValue)
    const separate = comparing && ownScale
    const own = [...values]
    const showCost = !comparing && costBasis != null && costBasis > Math.min(...values) * 0.8 && costBasis < Math.max(...values) * 1.2
    if (showCost) own.push(costBasis)
    if (comparing && !separate) own.push(...benchValues)
    const main = scale(own)
    const other = separate ? scale(benchValues) : main
    const path = (list: PricePoint[], get: (p: PricePoint) => number, y: (v: number) => number) =>
      list.map((p, i) => `${i ? 'L' : 'M'}${x(p.date).toFixed(1)} ${y(get(p)).toFixed(1)}`).join(' ')
    // El cierre de la comparacion ese dia, o el ultimo antes (las bolsas no siempre cierran los mismos dias).
    const benchAt = (date: string) => {
      let found: PricePoint | undefined
      for (const p of bench) {
        if (p.date > date) break
        found = p
      }
      return found ? { price: found.closePrice, change: benchValue(found) } : null
    }

    return {
      visible,
      values,
      x,
      y: main.y,
      comparing,
      separate,
      benchAt,
      line: path(visible, value, main.y),
      benchLine: comparing ? path(bench, benchValue, other.y) : null,
      costY: showCost ? main.y(costBasis) : null,
      ticks: main.ticks,
      benchTicks: separate ? other.ticks : null,
      change: changeOf(visible),
      benchChange: comparing ? changeOf(bench) : null,
    }
  }, [points, range, comparison, ownScale, costBasis])

  const up = (chart?.change ?? 0) >= 0
  const color = up ? 'var(--signal-up)' : 'var(--signal-down)'
  const longRange = range === '1A' || range === '5A' || range === 'MAX'
  const index = hover === null || !chart ? null : Math.min(chart.visible.length - 1, Math.max(0, hover))
  const point = index === null || !chart ? null : chart.visible[index]
  const benchPoint = point && chart?.comparing ? chart.benchAt(point.date) : null

  const move = (event: PointerEvent<HTMLDivElement>) => {
    if (!chart || !plotRef.current) return
    // Se mide contra el area de la linea, no contra todo el grafico: la columna de precios de la derecha corria el cursor a fechas anteriores.
    const box = plotRef.current.getBoundingClientRect()
    const ratio = Math.min(1, Math.max(0, (event.clientX - box.left) / box.width)) * 1000
    let best = 0
    chart.visible.forEach((p, i) => {
      if (Math.abs(chart.x(p.date) - ratio) < Math.abs(chart.x(chart.visible[best].date) - ratio)) best = i
    })
    setHover(best)
  }
  const keys = (event: KeyboardEvent<HTMLDivElement>) => {
    if (!chart || (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight')) return
    event.preventDefault()
    const current = index ?? chart.visible.length - 1
    setHover(Math.min(chart.visible.length - 1, Math.max(0, current + (event.key === 'ArrowRight' ? 1 : -1))))
  }

  const otherLabel = comparison ? (comparison.symbol === BENCHMARK ? 'S&P 500' : comparison.symbol) : ''
  const title = liveActive ? 'Precio en vivo' : chart?.comparing ? `${symbol} frente a ${otherLabel}` : `Precio de ${symbol}`
  const description = CHART_RANGES.find((r) => r.key === range)?.description

  return (
    <section aria-labelledby="activo-grafico" className="rounded-2xl border bg-card px-5 pt-4 pb-3.5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 id="activo-grafico" className="text-xs tracking-wider text-muted-foreground uppercase">
            {title}
          </h2>
          {!liveActive && chart && (
            <p className="mt-1 text-[22px] font-semibold tracking-tight">
              <span className={up ? 'text-gain' : 'text-loss'}>{formatSignedPercent(chart.change)}</span>{' '}
              <span className="text-[13px] font-normal text-muted-foreground">
                {chart.comparing ? `${symbol} · ${otherLabel} ${formatSignedPercent(chart.benchChange)}` : description}
              </span>
            </p>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {comparable && !liveActive && onCompareChange && (
            <ComparePicker symbol={symbol} selected={compareWith} onChange={onCompareChange} />
          )}
          {chart?.comparing && !liveActive && onOwnScaleChange && (
            <button
              type="button"
              aria-pressed={ownScale}
              onClick={() => onOwnScaleChange(!ownScale)}
              className={cn(
                'inline-flex h-7.5 items-center rounded-lg border px-2.5 text-[12.5px] outline-none hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring',
                ownScale && 'border-accent-ink bg-accent hover:bg-accent',
              )}
            >
              Ver cada uno en su escala
            </button>
          )}
          <Segmented label="Rango del gráfico">
            {live && (
              <SegmentButton pressed={liveActive} onClick={live.onSelect}>
                En vivo
              </SegmentButton>
            )}
            {CHART_RANGES.map(({ key }) => (
              <SegmentButton key={key} pressed={!liveActive && range === key} onClick={() => onRangeChange(key)}>
                {rangeLabel(key)}
              </SegmentButton>
            ))}
          </Segmented>
        </div>
      </div>

      {liveActive ? (
        <div className="mt-4">{live?.content}</div>
      ) : !chart ? (
        <p className="py-20 text-center text-sm text-muted-foreground">Todavía no hay cierres suficientes para este rango.</p>
      ) : (
        <>
          <div
            role="img"
            tabIndex={0}
            aria-label={`${title}: ${formatSignedPercent(chart.change)} ${description}. Usa las flechas para recorrer los cierres.`}
            onPointerMove={move}
            onPointerLeave={() => setHover(null)}
            onKeyDown={keys}
            onBlur={() => setHover(null)}
            className="relative mt-4 h-72 rounded-lg outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <div ref={plotRef} className="absolute inset-y-0 right-14 left-0">
              {chart.ticks.map((_, k) => (
                <div key={k} aria-hidden="true" className="absolute inset-x-0 border-t border-border/60" style={{ top: `${((k + 0.5) / 4) * 100}%` }} />
              ))}
              <svg viewBox="0 0 1000 300" preserveAspectRatio="none" className="absolute inset-0 size-full overflow-visible" aria-hidden="true">
                <defs>
                  <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0" stopColor={color} stopOpacity={0.22} />
                    <stop offset="1" stopColor={color} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <path d={`${chart.line} L1000 300 L0 300 Z`} fill={`url(#${gradientId})`} />
                {chart.benchLine && (
                  <path d={chart.benchLine} fill="none" stroke="var(--income)" strokeWidth={1.6} strokeDasharray="5 5" vectorEffect="non-scaling-stroke" />
                )}
                <path d={chart.line} fill="none" stroke={color} strokeWidth={2.2} strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
                {chart.costY !== null && (
                  <path
                    d={`M0 ${chart.costY} L1000 ${chart.costY}`}
                    stroke="var(--accent-ink)"
                    strokeWidth={1}
                    strokeDasharray="2 4"
                    vectorEffect="non-scaling-stroke"
                  />
                )}
              </svg>
              {chart.costY !== null && costBasis != null && (
                <span
                  className="absolute left-1.5 -translate-y-[120%] rounded-full border border-accent-ink bg-card px-2 py-px text-[11px] text-accent-ink"
                  style={{ top: `${(chart.costY / 300) * 100}%` }}
                >
                  Tu costo {formatUsd(costBasis)}
                </span>
              )}
              {point && index !== null && (
                <>
                  <div aria-hidden="true" className="absolute inset-y-0 border-l border-dashed border-muted-foreground" style={{ left: `${chart.x(point.date) / 10}%` }} />
                  <div
                    aria-hidden="true"
                    className="absolute -mt-1.5 -ml-1.5 size-3 rounded-full ring-4 ring-card"
                    style={{ left: `${chart.x(point.date) / 10}%`, top: `${(chart.y(chart.values[index]) / 300) * 100}%`, background: color }}
                  />
                  <div
                    aria-hidden="true"
                    className={cn(
                      'pointer-events-none absolute top-2 rounded-xl border bg-card px-2.5 py-2 text-xs whitespace-nowrap shadow-lg',
                      chart.x(point.date) > 700 ? '-translate-x-[calc(100%+12px)]' : 'translate-x-3',
                    )}
                    style={{ left: `${chart.x(point.date) / 10}%` }}
                  >
                    <p className="text-muted-foreground">{fullDate.format(parseIsoDate(point.date))}</p>
                    <p className="mt-0.5 font-mono text-sm font-medium">{formatUsd(point.closePrice)}</p>
                    <p className={point.closePrice >= chart.visible[0].closePrice ? 'text-gain' : 'text-loss'}>
                      {formatSignedPercent((point.closePrice / chart.visible[0].closePrice - 1) * 100)} desde el inicio
                    </p>
                    {benchPoint && (
                      <p className="mt-1.5 border-t pt-1.5">
                        <span className="text-muted-foreground">{otherLabel}</span> <span className="font-mono">{formatUsd(benchPoint.price)}</span>{' '}
                        <span className={benchPoint.change >= 0 ? 'text-gain' : 'text-loss'}>{formatSignedPercent(benchPoint.change)}</span>
                      </p>
                    )}
                  </div>
                </>
              )}
            </div>
            {chart.benchTicks?.map((tick, k) => (
              <span
                key={`b${k}`}
                aria-hidden="true"
                className="absolute left-1 -translate-y-1/2 font-mono text-[11px] text-income"
                style={{ top: `${((k + 0.5) / 4) * 100}%` }}
              >
                {formatSignedPercent(tick)}
              </span>
            ))}
            {chart.ticks.map((tick, k) => (
              <span
                key={k}
                aria-hidden="true"
                className="absolute right-0 -translate-y-1/2 font-mono text-[11px] text-muted-foreground"
                style={{ top: `${((k + 0.5) / 4) * 100}%` }}
              >
                {chart.comparing ? formatSignedPercent(tick) : `$${Math.round(tick).toLocaleString('es-PE')}`}
              </span>
            ))}
          </div>
          {chart.separate && (
            <p className="mt-1 text-[11.5px] text-muted-foreground">
              Cada línea tiene su propia escala (la de {otherLabel}, a la izquierda): compara los %, no la altura de las líneas.
            </p>
          )}
          <div aria-hidden="true" className="mt-1.5 mr-14 flex justify-between text-[11px] text-muted-foreground">
            {[0, 1, 2, 3].map((k) => {
              const p = chart.visible[Math.round((k / 3) * (chart.visible.length - 1))]
              return <span key={k}>{(longRange ? monthYear : dayMonth).format(parseIsoDate(p.date))}</span>
            })}
          </div>
        </>
      )}
    </section>
  )
}
