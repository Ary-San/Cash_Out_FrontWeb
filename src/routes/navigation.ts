import {
  ArrowLeftRight,
  ArrowUpDown,
  Calculator,
  ChartCandlestick,
  Gamepad2,
  LayoutDashboard,
  LayoutGrid,
  Newspaper,
  TrendingUp,
  Target,
  Users,
  type LucideIcon,
} from 'lucide-react'
import type { Role, User } from '@/types/auth'

/** Solo las secciones ya construidas: un enlace a una pantalla pendiente parece un error. */
export type NavGroup = 'finanzas' | 'simulador' | 'aprende' | 'admin'

/** Los grupos del menu lateral: lo que es dinero real va separado de lo que es con fichas. */
export const NAV_GROUPS: { key: NavGroup; label: string }[] = [
  { key: 'finanzas', label: 'Mis finanzas · S/' },
  { key: 'simulador', label: 'Simulador · fichas' },
  { key: 'aprende', label: 'Aprende y gana' },
  { key: 'admin', label: 'Administración' },
]

export interface NavItem {
  to: string
  label: string
  icon: LucideIcon
  roles: Role[]
  group: NavGroup
  /** Activo solo en la ruta exacta, no en sus hijas. */
  end?: boolean
}

export const NAV_ITEMS: NavItem[] = [
  { to: '/resumen', label: 'Resumen', icon: LayoutDashboard, roles: ['USER', 'GUEST'], group: 'finanzas' },
  { to: '/movimientos', label: 'Movimientos', icon: ArrowLeftRight, roles: ['USER', 'GUEST'], group: 'finanzas' },
  { to: '/metas', label: 'Metas', icon: Target, roles: ['USER', 'GUEST'], group: 'finanzas' },
  { to: '/proyeccion', label: 'Proyección', icon: Calculator, roles: ['USER', 'GUEST'], group: 'finanzas' },
  { to: '/portafolio', label: 'Portafolio', icon: ChartCandlestick, roles: ['USER', 'GUEST'], group: 'simulador' },
  { to: '/portafolio/mercado', label: 'Mercado', icon: TrendingUp, roles: ['USER', 'GUEST'], group: 'simulador' },
  { to: '/portafolio/noticias', label: 'Noticias', icon: Newspaper, roles: ['USER', 'GUEST'], group: 'simulador' },
  { to: '/minijuegos', label: 'Minijuegos', icon: Gamepad2, roles: ['USER', 'GUEST'], group: 'aprende' },
  { to: '/admin', label: 'Panel', icon: LayoutGrid, roles: ['ADMIN'], group: 'admin', end: true },
  { to: '/admin/usuarios', label: 'Usuarios', icon: Users, roles: ['ADMIN'], group: 'admin' },
  { to: '/admin/minijuegos', label: 'Minijuegos', icon: Gamepad2, roles: ['ADMIN'], group: 'admin' },
  { to: '/admin/sube-o-baja', label: 'Sube o baja', icon: ArrowUpDown, roles: ['ADMIN'], group: 'admin' },
  { to: '/admin/activos', label: 'Activos', icon: ChartCandlestick, roles: ['ADMIN'], group: 'admin' },
]

export function navItemsFor(user: User | null): NavItem[] {
  if (!user) return []
  return NAV_ITEMS.filter((item) => item.roles.some((role) => user.roles.includes(role)))
}

/** El item activo es el de ruta mas larga que contiene a la actual: en /portafolio/mercado/7 gana Mercado, no Portafolio. */
export function activeNavPath(items: readonly NavItem[], pathname: string): string | undefined {
  return items
    .filter((item) => (item.end ? pathname === item.to : pathname === item.to || pathname.startsWith(`${item.to}/`)))
    .sort((a, b) => b.to.length - a.to.length)[0]?.to
}

export function homePathFor(user: User | null): string {
  return navItemsFor(user)[0]?.to ?? '/resumen'
}

export interface RouteHandle {
  crumb?: string
  /** Vale el de la ruta activa mas profunda. */
  title?: string
}
