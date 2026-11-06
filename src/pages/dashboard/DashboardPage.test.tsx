import { render, screen, within } from '@testing-library/react'
import { createMemoryRouter, RouterProvider } from 'react-router'
import type { SavingsGoal } from '@/types/goals'
import type { Portfolio, Position } from '@/types/market'
import type { Movement, MonthlyFlows } from '@/types/movements'
import { currentMonth } from '@/lib/monthOverview'
import { goalService } from '@/services/goalService'
import { movementService } from '@/services/movementService'
import { portfolioService } from '@/services/portfolioService'
import { savingsService } from '@/services/savingsService'
import { walletService } from '@/services/walletService'
import DashboardPage from './DashboardPage'

vi.mock('@/hooks/useAuth', () => ({ useAuth: () => ({ user: { name: 'Valeria Ríos' } }) }))
// jsdom no tiene matchMedia; sin animaciones, la actividad se despliega de una vez.
vi.mock('@/hooks/useReducedMotion', () => ({ useReducedMotion: () => true }))
vi.mock('@/services/movementService', () => ({ movementService: { list: vi.fn(), monthly: vi.fn(), month: vi.fn() } }))
vi.mock('@/services/savingsService', () => ({ savingsService: { get: vi.fn() } }))
vi.mock('@/services/walletService', () => ({ walletService: { get: vi.fn(), transactions: vi.fn() } }))
vi.mock('@/services/goalService', () => ({ goalService: { list: vi.fn(), contributions: vi.fn().mockResolvedValue([]) } }))
vi.mock('@/services/portfolioService', () => ({ portfolioService: { get: vi.fn(), listOrders: vi.fn() } }))
vi.mock('@/services/marketService', () => ({ marketService: { searchAssets: vi.fn(), getPriceHistory: vi.fn() } }))

const list = vi.mocked(movementService.list)
const monthly = vi.mocked(movementService.monthly)

// Tres meses bastan para cualquier rango: el grafico y los haces dibujan los que lleguen.
const flows: MonthlyFlows = {
  from: '2026-08',
  to: '2026-10',
  months: [
    { month: '2026-08', income: 1200, expense: 1110, net: 90 },
    { month: '2026-09', income: 1250, expense: 1060, net: 190 },
    { month: '2026-10', income: 1200, expense: 760, net: 440 },
  ],
  totalIncome: 3650,
  totalExpense: 2930,
  totalNet: 720,
}

// El dia 1 existe en cualquier mes: la prueba no depende de la fecha en que corra.
const move = (month: string, kind: Movement['kind'], amount: number, category: Movement['category'] = null): Movement => ({
  id: amount,
  kind,
  label: null,
  category,
  amount,
  date: `${month}-01`,
  createdAt: `${month}-01T12:00:00`,
})

const goal = (overrides: Partial<SavingsGoal>): SavingsGoal => ({
  id: 1,
  name: 'Laptop para la U',
  targetAmount: 2400,
  accumulatedAmount: 120,
  progressPercent: 5,
  deadline: '2030-12-31',
  status: 'IN_PROGRESS',
  completedAt: null,
  createdAt: '2020-01-01T15:00:00',
  ...overrides,
})

const position = (symbol: string, marketValue: number, averageCost: number): Position => ({
  id: 1,
  assetId: 7,
  symbol,
  assetName: symbol === 'SPY' ? 'S&P 500' : 'Apple',
  quantity: 1,
  averageCost,
  currentPrice: marketValue,
  marketValue,
  unrealizedPnl: marketValue - averageCost,
})

const portfolio = (positions: Position[]): Portfolio => ({
  id: 1,
  investedTokens: positions.reduce((sum, p) => sum + p.averageCost, 0),
  simulatedValue: positions.reduce((sum, p) => sum + (p.marketValue ?? 0), 0),
  unrealizedPnl: positions.reduce((sum, p) => sum + (p.unrealizedPnl ?? 0), 0),
  realizedPnl: 0,
  positions,
  updatedAt: '2026-10-19T14:00:00',
})

function renderAt(url = '/resumen') {
  const router = createMemoryRouter([{ path: '/resumen', element: <DashboardPage /> }], { initialEntries: [url] })
  render(<RouterProvider router={router} />)
  return router
}

describe('DashboardPage', () => {
  beforeEach(() => {
    list.mockReset()
    monthly.mockReset()
    list.mockResolvedValue({
      content: [
        { id: 3, kind: 'EXPENSE', label: 'Plaza Vea', category: 'FOOD', amount: 84.5, date: '2026-10-18', createdAt: '2026-10-18T20:00:00' },
        { id: 9, kind: 'INCOME', label: 'Prácticas', category: null, amount: 1200, date: '2026-10-15', createdAt: '2026-10-15T14:00:00' },
      ],
      page: 0,
      size: 5,
      totalElements: 14,
      totalPages: 3,
    })
    monthly.mockResolvedValue(flows)
    vi.mocked(movementService.month).mockImplementation(async (month) =>
      month === currentMonth() ? [move(month, 'INCOME', 1000), move(month, 'EXPENSE', 300, 'FOOD')] : [move(month, 'EXPENSE', 200, 'FOOD')],
    )
    vi.mocked(savingsService.get).mockResolvedValue({
      id: 1,
      currentBalance: 2030,
      committedAmount: 720,
      availableBalance: 1310,
      updatedAt: '2026-10-19T14:00:00',
    })
    vi.mocked(walletService.get).mockResolvedValue({ id: 1, tokenBalance: 645.9, updatedAt: '2026-10-19T14:00:00' })
    vi.mocked(walletService.transactions).mockResolvedValue({
      content: [{ id: 5, amount: 18, reason: 'RACE_PRIZE', referenceId: 2, balanceAfter: 645.9, createdAt: '2026-10-19T12:00:00' }],
      page: 0,
      size: 3,
      totalElements: 1,
      totalPages: 1,
    })
    vi.mocked(goalService.list).mockResolvedValue([goal({}), goal({ id: 2, name: 'Viaje', status: 'COMPLETED' })])
    vi.mocked(portfolioService.get).mockResolvedValue(portfolio([]))
  })

  it('la actividad reciente lista los ultimos movimientos con su signo', async () => {
    renderAt()

    const card = (await screen.findByRole('heading', { name: 'Actividad reciente' })).closest('section')!
    expect(await within(card).findByText('Plaza Vea')).toBeInTheDocument()
    expect(within(card).getByText(/^−S\/\s?84\.50$/)).toBeInTheDocument()
    expect(within(card).getByText(/^\+S\/\s?1,200\.00$/)).toBeInTheDocument()
  })

  it('las metas en curso dicen cuanto llevan frente a lo que deberian llevar', async () => {
    renderAt()

    const card = await screen.findByRole('region', { name: /^Metas/ })
    expect(await within(card).findByText('Laptop para la U')).toBeInTheDocument()
    expect(within(card).getByText('Atrasada')).toBeInTheDocument()
    expect(within(card).queryByText('Viaje')).not.toBeInTheDocument()
    expect(within(card).getByText(/^5 % · deberías llevar \d+ %$/)).toBeInTheDocument()
  })

  it('sin inversiones el simulador muestra las fichas libres e invita al mercado', async () => {
    renderAt()

    const sim = await screen.findByRole('region', { name: 'Tu portafolio de práctica' })
    expect(await within(sim).findByText('645.90')).toBeInTheDocument()
    expect(within(sim).getByText('Todavía no inviertes tus fichas.')).toBeInTheDocument()
    expect(within(sim).getByRole('link', { name: 'Ir al mercado' })).toHaveAttribute('href', '/portafolio/mercado')
  })

  it('con inversiones el simulador dice cuanto vale y cuanto cambio desde que empezo', async () => {
    vi.mocked(portfolioService.get).mockResolvedValue(portfolio([position('SPY', 198.46, 195), position('AAPL', 68.55, 66.7)]))
    renderAt()

    const sim = await screen.findByRole('region', { name: 'Tu portafolio de práctica' })
    expect(await within(sim).findByText('267.01')).toBeInTheDocument()
    expect(within(sim).getByText('+2.03 % desde que empezaste')).toBeInTheDocument()
    expect(within(sim).getByRole('link', { name: 'Ir al portafolio' })).toHaveAttribute('href', '/portafolio')
  })

  it('una cuenta sin movimientos ve los primeros pasos en vez del mes', async () => {
    list.mockResolvedValue({ content: [], page: 0, size: 5, totalElements: 0, totalPages: 0 })
    renderAt()

    expect(await screen.findByRole('heading', { name: 'Tu cuenta está lista.' })).toBeInTheDocument()
    expect(screen.queryByRole('region', { name: /hasta hoy/ })).not.toBeInTheDocument()
    expect(screen.getByText('Aún no hay movimientos')).toBeInTheDocument()
  })

  it('el mes dice cuanto queda y compara con el mes pasado a la misma altura', async () => {
    renderAt()

    const card = await screen.findByRole('region', { name: /hasta hoy/ })
    expect(await within(card).findByText(/S\/\s?700\.00/)).toBeInTheDocument()
    expect(within(card).getByText('te quedan este mes')).toBeInTheDocument()
    expect(within(card).getByText(/↑ 50\.0 % de gasto/)).toBeInTheDocument()
  })

  it('avisa la categoria que mas crecio y lleva a esos gastos', async () => {
    renderAt()

    const alerts = await screen.findByRole('region', { name: 'Avisos' })
    expect(await within(alerts).findByText('Comida subió 50 %')).toBeInTheDocument()
    expect(within(alerts).getByRole('link', { name: 'Ver gastos de comida' })).toHaveAttribute('href', '/movimientos/gastos?category=FOOD')
  })

  it('lo simulado va en su propio bloque con la etiqueta de fichas', async () => {
    renderAt()

    const sim = await screen.findByRole('region', { name: 'Tu portafolio de práctica' })
    expect(within(sim).getByText('Simulador · fichas, no dinero real')).toBeInTheDocument()
    expect(within(sim).getByText(/Precios reales del mercado de EE\. UU\./)).toBeInTheDocument()
  })

  it('con aportes recientes, el aviso de la meta dice cuando llega y cuanto aportar', async () => {
    // Al 18 de noviembre: S/ 250 al mes desde setiembre y faltan S/ 1,650 para marzo.
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(new Date(2026, 10, 18, 12))
    vi.mocked(goalService.list).mockResolvedValue([
      goal({ accumulatedAmount: 1850, targetAmount: 3500, progressPercent: 52.86, deadline: '2027-03-31', createdAt: '2026-05-10T15:00:00' }),
    ])
    vi.mocked(goalService.contributions).mockResolvedValue(
      ['2026-09-15', '2026-10-14', '2026-11-15'].map((date, i) => ({ id: i + 1, amount: 250, source: 'MANUAL' as const, createdAt: `${date}T15:00:00` })),
    )
    renderAt()

    const alerts = await screen.findByRole('region', { name: 'Avisos' })
    expect(await within(alerts).findByText(/llegas en junio de 2027, 3 meses después del 31 mar.? 2027/)).toBeInTheDocument()
    expect(within(alerts).getByRole('link', { name: /^Aportar S\/\s415\.00$/ })).toHaveAttribute('href', '/metas/1')
    const card = await screen.findByRole('region', { name: /^Metas/ })
    expect(within(card).getByText('Llegas en jun · 3 meses tarde')).toBeInTheDocument()
    vi.useRealTimers()
  })
})

