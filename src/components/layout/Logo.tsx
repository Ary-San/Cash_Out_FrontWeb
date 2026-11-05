import { Link } from 'react-router'
import { cn } from '@/lib/utils'

/** CASH-OUT con la ficha como O. `compact` deja solo la ficha, para el menu contraido. */
export function Logo({ to = '/', className, compact = false }: { to?: string; className?: string; compact?: boolean }) {
  return (
    <Link
      to={to}
      aria-label="Cash-Out, ir al inicio"
      className={cn('group/logo flex items-center gap-0.5 rounded-md font-bold tracking-tight outline-none focus-visible:ring-2 focus-visible:ring-ring', className)}
    >
      {!compact && <span className="font-[Radio_Canada_Big,Geist_Variable,ui-sans-serif,sans-serif]">CASH-</span>}
      <img
        src="/cashout-chip.svg"
        alt=""
        aria-hidden="true"
        className="size-7 shrink-0 transition-transform duration-500 ease-[cubic-bezier(.34,1.56,.64,1)] group-hover/logo:rotate-360 motion-reduce:transition-none"
      />
      {!compact && <span className="font-[Radio_Canada_Big,Geist_Variable,ui-sans-serif,sans-serif]">UT</span>}
    </Link>
  )
}
