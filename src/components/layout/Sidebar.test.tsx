import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useState } from 'react'
import { createMemoryRouter, RouterProvider } from 'react-router'
import { TooltipProvider } from '@/components/ui/tooltip'
import { Sidebar } from './Sidebar'

vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({ user: { name: 'Valeria Ríos', email: 'valeria@checkout.test', roles: ['USER'] }, logout: vi.fn() }),
}))
vi.mock('@/hooks/useReducedMotion', () => ({ useReducedMotion: () => true }))
vi.mock('@/hooks/useTheme', () => ({ useTheme: () => ({ resolvedTheme: 'light', setTheme: vi.fn() }) }))
vi.mock('@/services/walletService', () => ({ walletService: { get: vi.fn().mockResolvedValue({ id: 1, tokenBalance: 597.62, updatedAt: '2026-11-05T12:00:00' }) } }))

function Shell() {
  const [rail, setRail] = useState(false)
  return <Sidebar homePath="/resumen" rail={rail} onRailChange={setRail} />
}

function renderAt(path: string) {
  const router = createMemoryRouter([{ path: '*', element: <Shell /> }], { initialEntries: [path] })
  render(
    <TooltipProvider>
      <RouterProvider router={router} />
    </TooltipProvider>,
  )
}

describe('Sidebar', () => {
  it('separa las finanzas del simulador y marca la seccion actual', () => {
    renderAt('/portafolio/mercado/7')

    const sim = screen.getByRole('navigation', { name: 'Simulador' })
    expect(within(sim).getByRole('link', { name: 'Mercado' })).toHaveAttribute('aria-current', 'page')
    expect(within(sim).getByRole('link', { name: 'Portafolio' })).not.toHaveAttribute('aria-current')
    expect(within(screen.getByRole('navigation', { name: 'Mis finanzas' })).getByRole('link', { name: 'Movimientos' })).toBeInTheDocument()
  })

  it('muestra las fichas del usuario abajo', async () => {
    renderAt('/resumen')

    expect(await screen.findByText('597.62 fichas')).toBeInTheDocument()
  })

  it('se contrae a solo iconos y los nombres siguen disponibles para lectores de pantalla', async () => {
    renderAt('/resumen')

    await userEvent.click(screen.getByRole('button', { name: 'Contraer el menú' }))
    expect(screen.getByRole('button', { name: 'Expandir el menú' })).toHaveAttribute('aria-expanded', 'false')
    expect(screen.getByRole('link', { name: 'Resumen' })).toHaveAttribute('aria-current', 'page')
    expect(screen.queryByText('597.62 fichas')).not.toBeInTheDocument()
  })
})
