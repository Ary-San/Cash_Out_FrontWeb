import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { createMemoryRouter, RouterProvider } from 'react-router'
import type { Movement } from '@/types/movements'
import { expenseService } from '@/services/expenseService'
import { movementService } from '@/services/movementService'
import AllMovementsPage from './AllMovementsPage'
import MovementsLayout from './MovementsLayout'

const media = vi.hoisted(() => ({ wide: false }))
vi.mock('@/hooks/useMediaQuery', () => ({ useMediaQuery: () => media.wide }))
vi.mock('@/hooks/useReducedMotion', () => ({ useReducedMotion: () => true }))
vi.mock('@/services/movementService', () => ({ movementService: { list: vi.fn(), month: vi.fn() } }))
vi.mock('@/services/expenseService', () => ({ expenseService: { get: vi.fn(), remove: vi.fn() } }))
vi.mock('@/services/savingsService', () => ({
  savingsService: { get: vi.fn().mockResolvedValue({ availableBalance: 500 }) },
}))

const list = vi.mocked(movementService.list)
const month = vi.mocked(movementService.month)
const getExpense = vi.mocked(expenseService.get)

function movement(overrides: Partial<Movement>): Movement {
  return {
    id: 1,
    kind: 'EXPENSE',
    label: 'Algo',
    category: 'FOOD',
    amount: 10,
    date: '2026-09-18',
    createdAt: '2026-09-18T15:00:00',
    ...overrides,
  }
}

const beca = movement({ id: 1, kind: 'INCOME', label: 'Beca', category: null, amount: 800, date: '2026-09-13' })
const menu = movement({ id: 2, label: 'Menú', amount: 12, date: '2026-09-18' })
const taxi = movement({ id: 3, label: 'Taxi', category: 'TRANSPORT', amount: 13.5, date: '2026-09-18' })
const pan = movement({ id: 4, label: 'Pan', amount: 4.5, date: '2026-09-20' })

function renderAt(url: string) {
  const router = createMemoryRouter(
    [
      {
        path: '/movimientos',
        element: <MovementsLayout />,
        children: [
          { path: 'todos', element: <AllMovementsPage /> },
          { path: 'gastos/:id', element: <p>detalle del gasto</p> },
        ],
      },
    ],
    { initialEntries: [url] },
  )
  render(<RouterProvider router={router} />)
  return router
}

describe('MovementsLayout', () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(new Date(2026, 9, 20, 12))
    media.wide = false
    month.mockReset()
    month.mockResolvedValue([pan, menu, taxi, beca])
    list.mockReset()
    list.mockResolvedValue({ content: [pan, menu, taxi, beca], page: 0, size: 10, totalElements: 4, totalPages: 1 })
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('resume el mes de la URL', async () => {
    renderAt('/movimientos/todos?mes=2026-09')

    expect(await screen.findByText(/entraron/)).toHaveTextContent(
      /^Setiembre de 2026 · entraron S\/\s?800\.00 y gastaste S\/\s?30\.00$/,
    )
    expect(month).toHaveBeenCalledWith('2026-09', expect.any(AbortSignal))
    expect(screen.getByRole('button', { name: /^viernes, 18 de setiembre: gastaste S\/\s25\.50$/ })).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: /^domingo, 13 de setiembre: sin gastos, entraron S\/\s800\.00$/ }),
    ).toBeInTheDocument()
  })

  it('cada categoria de la dona lleva a esos gastos del mes', async () => {
    renderAt('/movimientos/todos?mes=2026-09')

    expect(await screen.findByRole('link', { name: /^Comida: S\/\s?16\.50, 55 %/ })).toHaveAttribute(
      'href',
      '/movimientos/gastos?category=FOOD&from=2026-09-01&to=2026-09-30&mes=2026-09',
    )
  })

  it('un dia del mapa filtra la lista por esa fecha', async () => {
    const router = renderAt('/movimientos/todos?mes=2026-09')

    await userEvent.click(await screen.findByRole('button', { name: /^viernes, 18 de setiembre/ }))
    expect(screen.getByText('Taxi', { selector: 'li span' })).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Ver en la lista' }))
    expect(router.state.location.search).toBe('?mes=2026-09&from=2026-09-18&to=2026-09-18')
  })

  it('no deja pasar al mes que viene y vuelve al anterior', async () => {
    const router = renderAt('/movimientos/todos')

    await screen.findByText(/^Octubre de 2026 ·/)
    expect(screen.getByRole('button', { name: 'Mes siguiente' })).toBeDisabled()
    await userEvent.click(screen.getByRole('button', { name: 'Mes anterior' }))
    expect(router.state.location.search).toBe('?mes=2026-09')
  })

  it('registrar un gasto abre su formulario sin salir de Todos', async () => {
    const router = renderAt('/movimientos/todos')

    await userEvent.click(await screen.findByRole('button', { name: 'Registrar gasto' }))
    expect(router.state.location.pathname).toBe('/movimientos/todos')
    expect(await screen.findByRole('dialog', { name: 'Registrar gasto' })).toBeInTheDocument()
  })

  it('el detalle del panel compara el gasto con su mes', async () => {
    media.wide = true
    getExpense.mockResolvedValue({ ...pan, category: 'FOOD', description: 'Pan' })
    renderAt('/movimientos/todos?mes=2026-09')

    const panel = await screen.findByRole('complementary', { name: 'Pan' })
    expect(await within(panel).findByText(/^En setiembre llevas S\/\s?16\.50 en comida \(2 gastos\)\.$/)).toBeInTheDocument()
  })

  it('el detalle de un movimiento va sin el resumen del mes', async () => {
    renderAt('/movimientos/gastos/4')

    expect(await screen.findByText('detalle del gasto')).toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: 'Tus movimientos' })).not.toBeInTheDocument()
    expect(month).not.toHaveBeenCalled()
  })

  it('encuentra los gastos fijos de los dos meses anteriores y dice si ya se pagaron', async () => {
    const gym = (date: string, id: number) => movement({ id, label: 'Gimnasio', category: 'OTHER', amount: 35, date })
    month.mockImplementation(async (m) =>
      m === '2026-10' ? [gym('2026-10-03', 10), menu] : m === '2026-09' ? [gym('2026-09-03', 11)] : [gym('2026-08-03', 12)],
    )
    renderAt('/movimientos/todos')

    const card = (await screen.findByText('Se repiten cada mes')).closest('section')!
    expect(await within(card).findByText('Gimnasio')).toBeInTheDocument()
    expect(within(card).getByText('Pagado')).toBeInTheDocument()
    expect(within(card).getByText(/^Día 3 · Otros$/)).toBeInTheDocument()
  })

  it('al final resume el mes contra el anterior y las cifras se abren con Mostrar mas', async () => {
    month.mockImplementation(async (m) => (m === '2026-10' ? [menu, beca].map((x) => ({ ...x, date: x.date.replace('2026-09', '2026-10') })) : [taxi]))
    renderAt('/movimientos/todos')

    const card = (await screen.findByRole('heading', { name: /al día 20/ })).closest('section')!
    expect(within(card).getByText(/Gastaste S\/\s?1\.50 menos que a esta altura de setiembre/)).toBeInTheDocument()
    const more = within(card).getByRole('button', { name: /Mostrar más/ })
    expect(more).toHaveAttribute('aria-expanded', 'false')
    await userEvent.click(more)
    expect(within(card).getByRole('button', { name: /Mostrar menos/ })).toHaveAttribute('aria-expanded', 'true')
  })
})

