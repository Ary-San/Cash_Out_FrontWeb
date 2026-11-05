import { useState } from 'react'
import { Outlet } from 'react-router'
import { useAuth } from '@/hooks/useAuth'
import { cn } from '@/lib/utils'
import { homePathFor } from '@/routes/navigation'
import { Breadcrumbs } from '@/components/navigation/Breadcrumbs'
import { NavigationProgress } from '@/components/navigation/NavigationProgress'
import { Logo } from './Logo'
import { BottomBar, MobileNav } from './MainNav'
import { Sidebar } from './Sidebar'
import { ThemeToggle } from './ThemeToggle'
import { UserMenu } from './UserMenu'

const RAIL_KEY = 'cashout-menu-riel'

function readRail(): boolean {
  try {
    return localStorage.getItem(RAIL_KEY) === '1'
  } catch {
    return false
  }
}

export function AppShell() {
  const { user } = useAuth()
  const homePath = homePathFor(user)
  const student = user?.roles.some((role) => role === 'USER' || role === 'GUEST') ?? false
  // Contraer el menu es una preferencia de este navegador.
  const [rail, setRail] = useState(readRail)
  const changeRail = (next: boolean) => {
    setRail(next)
    try {
      localStorage.setItem(RAIL_KEY, next ? '1' : '0')
    } catch {
      // Sin almacenamiento el menu igual se contrae; solo no se recuerda.
    }
  }

  return (
    <div className="flex min-h-svh bg-background">
      <NavigationProgress />
      <a
        href="#contenido"
        className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-50 focus:rounded-md focus:bg-background focus:px-3 focus:py-2 focus:text-sm focus:shadow"
      >
        Saltar al contenido
      </a>
      <Sidebar homePath={homePath} rail={rail} onRailChange={changeRail} />
      <div className="min-w-0 flex-1">
        <header className="sticky top-0 z-40 border-b bg-background/95 backdrop-blur supports-backdrop-filter:bg-background/80 md:hidden">
          <div className="flex h-14 items-center gap-2 px-4">
            <MobileNav homePath={homePath} />
            <Logo to={homePath} />
            <div className="ml-auto flex items-center gap-1">
              <ThemeToggle />
              <UserMenu />
            </div>
          </div>
        </header>
        <main id="contenido" tabIndex={-1} className={cn('mx-auto max-w-6xl space-y-6 px-4 py-6 outline-none sm:py-8 md:px-8', student && 'pb-28 md:pb-8')}>
          <Breadcrumbs />
          <Outlet />
        </main>
      </div>
      {student && <BottomBar />}
    </div>
  )
}
