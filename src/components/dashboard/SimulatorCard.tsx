import type { ReactNode } from 'react'
import { Link } from 'react-router'
import type { ApiQuery } from '@/hooks/useApiQuery'
import { formatSignedPercent } from '@/lib/market'
import { cn } from '@/lib/utils'
import type { TokenWallet } from '@/types/finance'
import type { Portfolio } from '@/types/market'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'

const tokens = new Intl.NumberFormat('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

interface SimulatorCardProps {
  wallet: ApiQuery<TokenWallet>
  portfolio: ApiQuery<Portfolio>
}

/** Lo simulado en otra superficie y con su etiqueta: fichas, nunca dinero real. */
export function SimulatorCard({ wallet, portfolio }: SimulatorCardProps) {
  const p = portfolio.data
  const invested = (p?.positions.length ?? 0) > 0
  const change = p && p.investedTokens > 0 ? (p.simulatedValue / p.investedTokens - 1) * 100 : null
  const stat = (label: string, value: string, extra?: ReactNode, tone?: string) => (
    <div className="grid content-start gap-1 rounded-xl border bg-card p-3.5">
      <span className="text-xs text-muted-foreground">{label}</span>
      <b className={cn('font-mono text-xl font-medium tabular-nums', tone)}>
        {value} <small className="font-sans text-xs font-medium text-muted-foreground">fichas</small>
      </b>
      {extra}
    </div>
  )

  return (
    <section aria-labelledby="resumen-simulador" className="grid gap-4 rounded-3xl border-[1.5px] border-dashed border-accent-ink/45 bg-accent/35 p-4 sm:p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-accent-ink bg-card py-0.5 pr-2.5 pl-1 text-xs font-semibold text-accent-ink">
            <img src="/cashout-chip.svg" alt="" className="size-4.5" />
            Simulador · fichas, no dinero real
          </span>
          <h2 id="resumen-simulador" className="text-[15px] font-semibold">
            Tu portafolio de práctica
          </h2>
        </div>
        <Button asChild variant="outline" size="sm">
          <Link to={invested ? '/portafolio' : '/portafolio/mercado'}>{invested ? 'Ir al portafolio' : 'Ir al mercado'}</Link>
        </Button>
      </div>
      {!wallet.data || !p ? (
        <Skeleton className="h-24 w-full rounded-xl" />
      ) : (
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {stat('Fichas libres', tokens.format(wallet.data.tokenBalance))}
          {stat(
            'Invertido',
            tokens.format(p.investedTokens),
            !invested && <span className="text-xs text-muted-foreground">Todavía no inviertes tus fichas.</span>,
          )}
          {stat(
            'Vale hoy',
            tokens.format(p.simulatedValue),
            change !== null && (
              <span className={cn('justify-self-start rounded-full border px-2 text-xs font-medium', change >= 0 ? 'border-gain text-gain' : 'border-loss text-loss')}>
                {formatSignedPercent(change)} desde que empezaste
              </span>
            ),
            change === null ? undefined : change >= 0 ? 'text-gain' : 'text-loss',
          )}
          {stat('Ganancia de tus ventas', tokens.format(p.realizedPnl))}
        </div>
      )}
      <div className="flex flex-wrap items-center justify-between gap-2 px-1 text-xs text-muted-foreground">
        <span>Precios reales del mercado de EE. UU. (Alpaca). Las compras y ventas son con fichas. 1 ficha = 1 US$.</span>
        <Link to="/minijuegos" className="font-medium text-accent-ink underline-offset-4 hover:underline">
          Gana fichas en los minijuegos →
        </Link>
      </div>
    </section>
  )
}
