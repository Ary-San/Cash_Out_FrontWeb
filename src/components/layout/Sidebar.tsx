import { useRef, useState, type PointerEvent } from 'react'
import { Link, useLocation } from 'react-router'
import { PanelLeftClose } from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import { useApiQuery } from '@/hooks/useApiQuery'
import { cn } from '@/lib/utils'
import { activeNavPath, NAV_GROUPS, navItemsFor } from '@/routes/navigation'
import { walletService } from '@/services/walletService'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { Logo } from './Logo'
import { ThemeToggle } from './ThemeToggle'
import { UserMenu } from './UserMenu'

const tokens = new Intl.NumberFormat('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

interface SidebarProps {
  homePath: string
  rail: boolean
  onRailChange(rail: boolean): void
}

/**
 * Menu lateral agrupado: lo que es dinero real separado de lo que es con fichas.
 * Los efectos (foco que sigue al cursor, pildora con resorte, iconos que reaccionan)
 * toman la idea de los menus de React Bits Pro, hechos a mano.
 */
export function Sidebar({ homePath, rail, onRailChange }: SidebarProps) {
  const { user } = useAuth()
  const { pathname } = useLocation()
  const items = navItemsFor(user)
  const active = activeNavPath(items, pathname)
  const student = user?.roles.includes('USER') ?? false
  const wallet = useApiQuery(['token-wallet', student], (signal) => (student ? walletService.get(signal) : Promise.resolve(null)))
  const aside = useRef<HTMLElement>(null)
  const [pill, setPill] = useState<number | null>(null)

  const spotlight = (event: PointerEvent<HTMLElement>) => {
    const box = event.currentTarget.getBoundingClientRect()
    event.currentTarget.style.setProperty('--sx', `${event.clientX - box.left}px`)
    event.currentTarget.style.setProperty('--sy', `${event.clientY - box.top}px`)
  }
  const pointAt = (el: HTMLElement) => {
    if (aside.current) setPill(el.getBoundingClientRect().top - aside.current.getBoundingClientRect().top)
  }

  return (
    <aside
      ref={aside}
      aria-label="Navegación"
      onPointerMove={spotlight}
      onPointerLeave={() => setPill(null)}
      className={cn(
        'group/side sticky top-0 hidden h-svh flex-col gap-5 overflow-hidden border-r bg-[linear-gradient(180deg,color-mix(in_srgb,var(--accent)_35%,var(--background)),var(--background)_42%)] py-5 md:flex',
        rail ? 'w-19 px-3' : 'w-63 px-3.5',
      )}
    >
      {/* Foco de luz que sigue al cursor */}
      <span
        aria-hidden="true"
        className="pointer-events-none absolute top-[calc(var(--sy,-400px)-130px)] left-[calc(var(--sx,-400px)-130px)] size-65 rounded-full bg-[radial-gradient(circle,color-mix(in_srgb,var(--accent-ink)_18%,transparent),transparent_65%)] opacity-0 transition-opacity duration-300 group-hover/side:opacity-100"
      />
      {/* Pildora que salta con resorte al item que apuntas */}
      <span
        aria-hidden="true"
        className={cn(
          'pointer-events-none absolute top-0 h-9.5 rounded-[10px] border border-accent-ink/25 bg-foreground/[.06] transition-[transform,opacity] duration-500 ease-[cubic-bezier(.34,1.56,.64,1)] motion-reduce:transition-none',
          rail ? 'inset-x-3' : 'inset-x-3.5',
          pill === null ? 'opacity-0' : 'opacity-100',
        )}
        style={{ transform: `translateY(${pill ?? 0}px)` }}
      />

      <div className={cn('relative flex items-center justify-between gap-2', rail && 'flex-col')}>
        {rail ? <Logo to={homePath} compact /> : <Logo to={homePath} />}
        <button
          type="button"
          onClick={() => onRailChange(!rail)}
          aria-label={rail ? 'Expandir el menú' : 'Contraer el menú'}
          aria-expanded={!rail}
          className="grid size-8 flex-none place-items-center rounded-lg border border-transparent text-muted-foreground outline-none hover:border-border hover:bg-card hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
        >
          <PanelLeftClose className={cn('size-4.5 transition-transform duration-300', rail && '-scale-x-100')} aria-hidden="true" />
        </button>
      </div>

      {NAV_GROUPS.map((group) => {
        const links = items.filter((item) => item.group === group.key)
        if (links.length === 0) return null
        const sim = group.key === 'simulador'
        return (
          <nav key={group.key} aria-label={group.label.split(' · ')[0]} className="relative grid gap-0.5">
            <span
              className={cn(
                'flex h-5.5 items-end pb-1.5 text-[11px] font-semibold tracking-widest whitespace-nowrap uppercase',
                sim ? 'text-accent-ink' : 'text-muted-foreground',
                rail ? 'justify-center' : 'px-2.5',
              )}
            >
              {sim && <span aria-hidden="true" className={cn('mb-1 size-1.5 rounded-full bg-accent-ink ring-3 ring-accent-ink/20', !rail && 'mr-2')} />}
              {rail ? !sim && <span aria-hidden="true" className="mb-1.5 w-4 border-t" /> : group.label}
            </span>
            {links.map(({ to, label, icon: Icon }) => {
              const current = active === to
              const link = (
                <Link
                  to={to}
                  aria-current={current ? 'page' : undefined}
                  onPointerEnter={(e) => pointAt(e.currentTarget)}
                  onFocus={(e) => pointAt(e.currentTarget)}
                  className={cn(
                    'group/link relative flex h-9.5 items-center gap-3 rounded-[10px] text-sm font-medium whitespace-nowrap text-muted-foreground transition-colors outline-none hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring',
                    rail ? 'justify-center' : 'px-3',
                    current && 'bg-card text-foreground shadow-[0_1px_2px_rgb(24_25_40/0.06),0_0_0_1px_var(--border)]',
                  )}
                >
                  {current && <span aria-hidden="true" className={cn('absolute top-2.5 bottom-2.5 w-[3px] rounded-r bg-accent-ink', rail ? '-left-3' : '-left-3.5')} />}
                  <Icon
                    aria-hidden="true"
                    className="size-4.5 flex-none transition-transform duration-300 ease-[cubic-bezier(.34,1.56,.64,1)] group-hover/link:scale-115 group-hover/link:-rotate-6 motion-reduce:transition-none"
                  />
                  {rail ? <span className="sr-only">{label}</span> : label}
                </Link>
              )
              return rail ? (
                <Tooltip key={to}>
                  <TooltipTrigger asChild>{link}</TooltipTrigger>
                  <TooltipContent side="right">{label}</TooltipContent>
                </Tooltip>
              ) : (
                <div key={to}>{link}</div>
              )
            })}
          </nav>
        )
      })}

      <div className={cn('relative mt-auto flex items-center gap-2 rounded-xl', rail ? 'flex-col' : 'border bg-card p-2')}>
        <UserMenu />
        {!rail && user && (
          <div className="grid min-w-0 flex-1 text-[13px]">
            <strong className="truncate font-semibold">{user.name}</strong>
            {student && wallet.data && (
              <span className="inline-flex items-center gap-1 font-mono text-xs text-accent-ink">
                <img src="/cashout-chip.svg" alt="" className="size-3.5" />
                {tokens.format(wallet.data.tokenBalance)} fichas
              </span>
            )}
          </div>
        )}
        <ThemeToggle />
      </div>
    </aside>
  )
}
