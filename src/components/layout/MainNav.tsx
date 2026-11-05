import { useState } from 'react'
import { Link, useLocation } from 'react-router'
import { ArrowLeftRight, ChartCandlestick, LayoutDashboard, Menu, Plus, Target } from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import { cn } from '@/lib/utils'
import { activeNavPath, NAV_GROUPS, navItemsFor } from '@/routes/navigation'
import { Button } from '@/components/ui/button'
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet'
import { Logo } from './Logo'

/** En el celular: todas las secciones en un panel lateral, con los mismos grupos que el menu de escritorio. */
export function MobileNav({ homePath }: { homePath: string }) {
  const { user } = useAuth()
  const { pathname } = useLocation()
  const items = navItemsFor(user)
  const active = activeNavPath(items, pathname)
  const [open, setOpen] = useState(false)

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" className="md:hidden" aria-label="Abrir menú">
          <Menu aria-hidden="true" />
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="w-72">
        <SheetHeader>
          <SheetTitle asChild>
            <div>
              <Logo to={homePath} />
            </div>
          </SheetTitle>
          <SheetDescription className="sr-only">Secciones de Cash-Out</SheetDescription>
        </SheetHeader>
        <div className="grid gap-5 px-4">
          {NAV_GROUPS.map((group) => {
            const links = items.filter((item) => item.group === group.key)
            if (links.length === 0) return null
            return (
              <nav key={group.key} aria-label={group.label.split(' · ')[0]} className="grid gap-0.5">
                <span className={cn('px-3 pb-1 text-[11px] font-semibold tracking-widest uppercase', group.key === 'simulador' ? 'text-accent-ink' : 'text-muted-foreground')}>
                  {group.label}
                </span>
                {links.map(({ to, label, icon: Icon }) => (
                  <Link
                    key={to}
                    to={to}
                    aria-current={active === to ? 'page' : undefined}
                    onClick={() => setOpen(false)}
                    className={cn(
                      'flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium outline-none focus-visible:ring-2 focus-visible:ring-ring',
                      active === to ? 'bg-accent text-foreground' : 'text-muted-foreground hover:bg-muted hover:text-foreground',
                    )}
                  >
                    <Icon className="size-4" aria-hidden="true" />
                    {label}
                  </Link>
                ))}
              </nav>
            )
          })}
        </div>
      </SheetContent>
    </Sheet>
  )
}

const TABS = [
  { to: '/resumen', label: 'Resumen', icon: LayoutDashboard },
  { to: '/movimientos', label: 'Movimientos', icon: ArrowLeftRight },
  { to: '/metas', label: 'Metas', icon: Target },
  { to: '/portafolio', label: 'Simulador', icon: ChartCandlestick },
]

/** Barra inferior del celular: lo mas usado a un toque y registrar en el centro. */
export function BottomBar() {
  const { pathname } = useLocation()
  const tab = (t: (typeof TABS)[number]) => {
    const current = pathname === t.to || pathname.startsWith(`${t.to}/`)
    return (
      <Link
        key={t.to}
        to={t.to}
        aria-current={current ? 'page' : undefined}
        className={cn('grid min-h-12 justify-items-center gap-0.5 py-1.5 text-[11px] outline-none focus-visible:ring-2 focus-visible:ring-ring', current ? 'font-semibold text-foreground' : 'text-muted-foreground')}
      >
        <t.icon className="size-5" aria-hidden="true" />
        {t.label}
      </Link>
    )
  }
  return (
    <nav aria-label="Accesos rápidos" className="fixed inset-x-0 bottom-0 z-40 grid grid-cols-5 border-t bg-card px-1.5 pt-1.5 pb-[calc(6px+env(safe-area-inset-bottom))] md:hidden">
      {TABS.slice(0, 2).map(tab)}
      <Link
        to="/movimientos?nuevo=gasto"
        aria-label="Registrar un movimiento"
        className="-mt-4.5 grid size-13 place-items-center self-center justify-self-center rounded-2xl bg-primary text-primary-foreground shadow-[0_6px_18px_rgb(63_64_88/0.35)] outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <Plus className="size-6" aria-hidden="true" />
      </Link>
      {TABS.slice(2).map(tab)}
    </nav>
  )
}
