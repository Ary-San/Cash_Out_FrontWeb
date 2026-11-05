import { useState, type PointerEvent } from 'react'
import { formatSoles } from '@/lib/format'
import type { MonthPace } from '@/lib/monthPace'
import { cn } from '@/lib/utils'
import { ErrorState } from '@/components/feedback/ErrorState'
import { Skeleton } from '@/components/ui/skeleton'

// La flecha ya dice si subio o bajo: el porcentaje va sin signo.
const oneDecimal = new Intl.NumberFormat('es-PE', { minimumFractionDigits: 1, maximumFractionDigits: 1 })
const W = 520
const H = 230
const PAD = { l: 8, r: 56, t: 10, b: 24 }
const monthName = (month: string) => new Intl.DateTimeFormat('es-PE', { month: 'long' }).format(new Date(`${month}-15T12:00:00`))

/** La frase que responde "como voy": lo que dicen los numeros, en palabras. */
function verdict(p: MonthPace, previousName: string): string {
  if (p.spent === 0) return 'Todavía no registras gastos este mes.'
  const less = p.change !== null && p.change < 0 ? `Gastas menos que en ${previousName}, pero a` : 'A'
  if (p.earned > 0 && p.projected > p.earned) return `${less} este ritmo cerrarías el mes con ${formatSoles(p.projected - p.earned)} en contra.`
  if (p.earned === 0) return 'Este mes todavía no registras ingresos: lo que gastes sale de tu ahorro.'
  return `Vas bien: a este ritmo terminarías el mes con ${formatSoles(p.earned - p.projected)} a favor.`
}

interface MonthPaceCardProps {
  month: string
  previousMonth: string
  pace: MonthPace | undefined
  error: Parameters<typeof ErrorState>[0]['error'] | null
  onRetry(): void
}

/** El mes en curso: cuanto queda, a que ritmo se gasta y como va contra el mes pasado. */
export function MonthPaceCard({ month, previousMonth, pace, error, onRetry }: MonthPaceCardProps) {
  const [hover, setHover] = useState<number | null>(null)
  if (error && !pace) return <ErrorState error={error} onRetry={onRetry} title="No pudimos calcular tu mes" />
  if (!pace) return <Skeleton className="h-80 w-full rounded-2xl" />

  const name = monthName(month)
  const previousName = monthName(previousMonth)
  const projection = Array.from({ length: pace.days - pace.day + 1 }, (_, k) => pace.spent + pace.pace * k)
  const top = Math.max(pace.earned, pace.projected, ...pace.previousCumulative, 1) * 1.08
  const x = (d: number) => PAD.l + ((d - 1) / Math.max(pace.days - 1, 1)) * (W - PAD.l - PAD.r)
  const y = (v: number) => PAD.t + (1 - v / top) * (H - PAD.t - PAD.b)
  const line = (list: number[], from = 1) => list.map((v, i) => `${x(from + i).toFixed(1)},${y(v).toFixed(1)}`).join(' ')
  const ticks = [0, 1, 2, 3].map((k) => Math.round((top / 1.08) * (k / 3)))
  const over = pace.projected > pace.earned && pace.earned > 0

  const move = (event: PointerEvent<SVGSVGElement>) => {
    const box = event.currentTarget.getBoundingClientRect()
    const vx = ((event.clientX - box.left) / box.width) * W
    setHover(Math.min(pace.days, Math.max(1, Math.round(1 + ((vx - PAD.l) / (W - PAD.l - PAD.r)) * (pace.days - 1)))))
  }
  const hoverValue = hover === null ? null : hover <= pace.day ? pace.cumulative[hover - 1] : projection[hover - pace.day]

  return (
    <section aria-labelledby="resumen-mes" className="grid gap-7 rounded-2xl border bg-card p-5 sm:p-6 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,1fr)]">
      <div>
        <h2 id="resumen-mes" className="text-xs font-semibold tracking-wider text-muted-foreground uppercase">
          <span className="capitalize">{name}</span>, hasta hoy
        </h2>
        <p className="mt-2.5 mb-4 max-w-[34ch] font-display text-2xl leading-snug text-pretty">{verdict(pace, previousName)}</p>
        <p className="font-mono text-[2.6rem] leading-none font-medium tracking-tight tabular-nums">
          {formatSoles(pace.remaining)}
          <span className="ml-1.5 font-sans text-base font-medium tracking-normal text-muted-foreground">
            {pace.remaining >= 0 ? 'te quedan este mes' : 'por encima de lo que entró'}
          </span>
        </p>
        {pace.allowance !== null && (
          <p className="mt-3.5 flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
            <span className={cn('rounded-full border px-2 py-px font-medium', pace.pace > pace.allowance ? 'border-warning text-warning' : 'border-gain text-gain')}>
              {formatSoles(pace.allowance)} al día
            </span>
            es lo que puedes gastar hasta el {pace.days} para no pasarte. Hoy vas en {formatSoles(pace.pace)} al día.
          </p>
        )}
        <dl className="mt-4.5 grid grid-cols-2 gap-3 border-t pt-4 sm:grid-cols-3">
          <div>
            <dt className="text-xs text-muted-foreground">Entró</dt>
            <dd className="font-mono font-medium text-income tabular-nums">{formatSoles(pace.earned)}</dd>
          </div>
          <div>
            <dt className="text-xs text-muted-foreground">Salió</dt>
            <dd className="font-mono font-medium tabular-nums">{formatSoles(pace.spent)}</dd>
          </div>
          {pace.change !== null && (
            <div className="col-span-2 sm:col-span-1">
              <dt className="text-xs text-muted-foreground">
                Frente al {Math.min(pace.day, pace.previousCumulative.length)} de {previousName}
              </dt>
              <dd className={cn('text-sm font-medium', pace.change <= 0 ? 'text-gain' : 'text-loss')}>
                {pace.change <= 0 ? '↓' : '↑'} {oneDecimal.format(Math.abs(pace.change))} % de gasto
              </dd>
            </div>
          )}
        </dl>
      </div>

      <div className="grid content-start gap-2">
        <h3 className="text-xs font-semibold tracking-wider text-muted-foreground uppercase">Gasto acumulado del mes</h3>
        <svg
          viewBox={`0 0 ${W} ${H}`}
          className="h-56 w-full overflow-visible"
          role="img"
          aria-label={`Gasto acumulado: ${formatSoles(pace.spent)} al día ${pace.day}. En ${previousName}, al mismo día, ${formatSoles(pace.previousToDate)}. A este ritmo llegarías a ${formatSoles(pace.projected)} el día ${pace.days}.`}
          onPointerMove={move}
          onPointerLeave={() => setHover(null)}
        >
          {ticks.map((v) => (
            <g key={v}>
              <line x1={PAD.l} x2={W - PAD.r} y1={y(v)} y2={y(v)} stroke="var(--border)" />
              <text x={W - PAD.r + 8} y={y(v) + 4} fontSize="11" fill="var(--muted-foreground)" fontFamily="var(--font-mono)">
                S/ {v.toLocaleString('es-PE')}
              </text>
            </g>
          ))}
          {[1, Math.ceil(pace.days / 3), pace.day, pace.days].map((d, i) => (
            <text key={`${d}-${i}`} x={x(d)} y={H - 4} fontSize="11" fill="var(--muted-foreground)" textAnchor="middle">
              {d}
            </text>
          ))}
          {pace.earned > 0 && <line x1={PAD.l} x2={W - PAD.r} y1={y(pace.earned)} y2={y(pace.earned)} stroke="var(--income)" strokeWidth="2" />}
          <polyline points={line(pace.previousCumulative)} fill="none" stroke="var(--muted-foreground)" strokeWidth="1.5" strokeDasharray="4 4" opacity=".8" />
          <polygon points={`${x(1)},${y(0)} ${line(pace.cumulative)} ${x(pace.day)},${y(0)}`} fill="var(--accent-ink)" opacity=".14" />
          <polyline points={line(projection, pace.day)} fill="none" stroke="var(--accent-ink)" strokeWidth="2" strokeDasharray="5 5" />
          <polyline points={line(pace.cumulative)} fill="none" stroke="var(--accent-ink)" strokeWidth="2.6" strokeLinejoin="round" strokeLinecap="round" />
          <circle cx={x(pace.day)} cy={y(pace.spent)} r="5" fill="var(--accent-ink)" stroke="var(--card)" strokeWidth="2" />
          <circle cx={x(pace.days)} cy={y(pace.projected)} r="4" fill="var(--card)" stroke={over ? 'var(--loss)' : 'var(--accent-ink)'} strokeWidth="2" />
          {hover !== null && <line x1={x(hover)} x2={x(hover)} y1={PAD.t} y2={H - PAD.b} stroke="var(--muted-foreground)" strokeDasharray="3 3" />}
        </svg>
        <ul className="flex flex-wrap gap-x-3.5 gap-y-1 text-xs text-muted-foreground" aria-hidden="true">
          <li><span className="mr-1.5 inline-block w-4 border-t-2 border-accent-ink align-middle" />Este mes</li>
          <li><span className="mr-1.5 inline-block w-4 border-t-2 border-dashed border-accent-ink align-middle" />A tu ritmo</li>
          <li><span className="mr-1.5 inline-block w-4 border-t-2 border-dashed border-muted-foreground align-middle" /><span className="capitalize">{previousName}</span></li>
          {pace.earned > 0 && <li><span className="mr-1.5 inline-block w-4 border-t-2 border-income align-middle" />Lo que entró</li>}
        </ul>
        <p className="min-h-5 text-xs text-muted-foreground" aria-live="polite">
          {hover === null || hoverValue === undefined
            ? 'Pasa el mouse por el gráfico para ver cada día.'
            : `Día ${hover}: ${formatSoles(hoverValue)}${hover > pace.day ? ' si sigues a este ritmo' : ''} · ${previousName} ${formatSoles(pace.previousCumulative[Math.min(hover, pace.previousCumulative.length) - 1] ?? 0)}`}
        </p>
      </div>
    </section>
  )
}
