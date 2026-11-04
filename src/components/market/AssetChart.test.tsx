import { fireEvent, render, screen } from '@testing-library/react'
import type { PricePoint } from '@/types/market'
import { AssetChart } from './AssetChart'

vi.mock('@/services/marketService', () => ({ marketService: { searchAssets: vi.fn() } }))

// Cierres diarios del 1 al 31 de octubre: el indice coincide con el dia menos uno.
const points: PricePoint[] = Array.from({ length: 31 }, (_, i) => ({
  date: `2026-10-${String(i + 1).padStart(2, '0')}`,
  closePrice: 100 + i,
}))

// El grafico mide 1056 px y la linea se dibuja en los primeros 1000: los otros 56 son la columna de precios.
function mockSizes() {
  vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockImplementation(function (this: HTMLElement) {
    const width = this.getAttribute('role') === 'img' ? 1056 : 1000
    return { left: 0, top: 0, width, height: 288, right: width, bottom: 288, x: 0, y: 0, toJSON: () => ({}) } as DOMRect
  })
}

// La comparacion empieza a cotizar el 11 de octubre y sube 1 por dia desde 200.
const other: PricePoint[] = Array.from({ length: 21 }, (_, i) => ({
  date: `2026-10-${String(i + 11).padStart(2, '0')}`,
  closePrice: 200 + i,
}))

function renderComparing(ownScale = false) {
  render(
    <AssetChart
      symbol="AAPL"
      points={points}
      range="1M"
      onRangeChange={vi.fn()}
      comparable
      compareWith="TSLA"
      comparison={{ symbol: 'TSLA', points: other }}
      onCompareChange={vi.fn()}
      ownScale={ownScale}
      onOwnScaleChange={vi.fn()}
    />,
  )
  return screen.getByRole('img')
}

function renderChart() {
  render(<AssetChart symbol="AAPL" points={points} range="1M" onRangeChange={vi.fn()} />)
  return screen.getByRole('img')
}

describe('AssetChart', () => {
  beforeEach(mockSizes)
  afterEach(() => vi.restoreAllMocks())

  it('en el borde derecho de la linea muestra el ultimo cierre, no uno de dias antes', () => {
    fireEvent.pointerMove(renderChart(), { clientX: 1000 })

    expect(screen.getByText(/^31 .*2026/)).toBeInTheDocument()
    expect(screen.getByText(/130\.00/)).toBeInTheDocument()
  })

  it('en el medio muestra el cierre de la mitad del mes', () => {
    fireEvent.pointerMove(renderChart(), { clientX: 500 })

    expect(screen.getByText(/^16 .*2026/)).toBeInTheDocument()
  })

  it('sobre la columna de precios se queda en el ultimo cierre', () => {
    fireEvent.pointerMove(renderChart(), { clientX: 1040 })

    expect(screen.getByText(/^31 .*2026/)).toBeInTheDocument()
  })

  it('compara contra cualquier accion, desde el dia en que cotizan las dos', () => {
    renderComparing()

    expect(screen.getByRole('heading', { name: 'AAPL frente a TSLA' })).toBeInTheDocument()
    // Desde el 11 oct: AAPL va de 110 a 130 y TSLA de 200 a 220.
    expect(screen.getByText(/TSLA \+10\.00 %/)).toBeInTheDocument()
    fireEvent.pointerMove(screen.getByRole('img'), { clientX: 1000 })
    expect(screen.getByText('TSLA')).toBeInTheDocument()
    expect(screen.getByText(/220\.00/)).toBeInTheDocument()
  })

  it('con cada uno en su escala muestra el eje de la comparacion y el aviso', () => {
    renderComparing(true)

    expect(screen.getByRole('button', { name: 'Ver cada uno en su escala' })).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByText(/compara los %, no la altura/)).toBeInTheDocument()
  })
})
