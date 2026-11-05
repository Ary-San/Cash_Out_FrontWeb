import { Link } from 'react-router'
import { Info, TriangleAlert } from 'lucide-react'
import type { DashboardAlert } from '@/lib/dashboardAlerts'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'

export function DashboardAlerts({ alerts }: { alerts: DashboardAlert[] }) {
  if (alerts.length === 0) return null
  return (
    <section aria-label="Avisos" className="grid gap-4 md:grid-cols-2">
      {alerts.map((alert) => {
        const Icon = alert.tone === 'warning' ? TriangleAlert : Info
        return (
          <article
            key={alert.key}
            className={cn('grid grid-cols-[auto_1fr] gap-x-3.5 gap-y-1 rounded-2xl border border-l-[3px] bg-card p-4', alert.tone === 'warning' ? 'border-l-warning' : 'border-l-info')}
          >
            <span
              aria-hidden="true"
              className={cn('row-span-3 grid size-9 place-items-center rounded-lg', alert.tone === 'warning' ? 'bg-warning/15 text-warning' : 'bg-info/15 text-info')}
            >
              <Icon className="size-4.5" />
            </span>
            <h3 className="text-[15px] font-semibold">{alert.title}</h3>
            <p className="text-sm text-muted-foreground">{alert.text}</p>
            <Button asChild variant="outline" size="sm" className="mt-2 justify-self-start">
              <Link to={alert.action.to}>{alert.action.label}</Link>
            </Button>
          </article>
        )
      })}
    </section>
  )
}
