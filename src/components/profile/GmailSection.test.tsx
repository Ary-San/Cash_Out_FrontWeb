import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, useLocation } from 'react-router'
import { toast } from 'sonner'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { detectedService } from '@/services/detectedService'
import { GmailSection } from './GmailSection'

vi.mock('@/services/detectedService', () => ({
  detectedService: {
    gmailStatus: vi.fn(),
    gmailConnectUrl: vi.fn(),
    disconnectGmail: vi.fn(),
    scanGmailMonth: vi.fn(),
  },
}))
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }))

function Search() {
  return <output data-testid="search">{useLocation().search}</output>
}

function renderAt(url: string) {
  return render(
    <MemoryRouter initialEntries={[url]}>
      <GmailSection />
      <Search />
    </MemoryRouter>,
  )
}

describe('GmailSection', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(detectedService.gmailStatus).mockResolvedValue({
      available: true,
      connected: true,
      email: 'ana@gmail.com',
      status: 'ACTIVE',
      lastCheckedAt: null,
    })
  })

  it('al volver de Google pregunta por el mes y "Traer este mes" lee desde el dia 1', async () => {
    vi.mocked(detectedService.scanGmailMonth).mockResolvedValue({ read: 4, added: 3 })
    renderAt('/perfil?gmail=conectado')

    const dialog = await screen.findByRole('alertdialog', { name: '¿Traemos tus movimientos de este mes?' })
    await userEvent.click(within(dialog).getByRole('button', { name: 'Traer este mes' }))

    await waitFor(() => expect(detectedService.scanGmailMonth).toHaveBeenCalledWith(false))
    await waitFor(() =>
      expect(toast.success).toHaveBeenCalledWith('Revisamos 4 correos del BCP de este mes: 3 movimientos nuevos en tu bandeja de Movimientos.'),
    )
    await waitFor(() => expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument())
    expect(screen.getByTestId('search')).toHaveTextContent('')
  })

  it('"Solo desde ahora" cierra la pregunta sin leer nada', async () => {
    renderAt('/perfil?gmail=conectado')

    const dialog = await screen.findByRole('alertdialog')
    await userEvent.click(within(dialog).getByRole('button', { name: 'Solo desde ahora' }))

    await waitFor(() => expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument())
    expect(detectedService.scanGmailMonth).not.toHaveBeenCalled()
  })

  it('"Volver a revisar el mes" pide confirmacion y trae tambien lo descartado', async () => {
    vi.mocked(detectedService.scanGmailMonth).mockResolvedValue({ read: 2, added: 0 })
    renderAt('/perfil')

    await userEvent.click(await screen.findByRole('button', { name: 'Volver a revisar el mes' }))
    const dialog = await screen.findByRole('alertdialog', { name: '¿Volver a revisar el mes?' })
    expect(detectedService.scanGmailMonth).not.toHaveBeenCalled()
    await userEvent.click(within(dialog).getByRole('button', { name: 'Revisar el mes' }))

    await waitFor(() => expect(detectedService.scanGmailMonth).toHaveBeenCalledWith(true))
    await waitFor(() => expect(toast.success).toHaveBeenCalledWith('Revisamos 2 correos del BCP de este mes: no hay movimientos nuevos.'))
  })

  it('sin Gmail conectado no ofrece revisar el mes', async () => {
    vi.mocked(detectedService.gmailStatus).mockResolvedValue({
      available: true,
      connected: false,
      email: null,
      status: null,
      lastCheckedAt: null,
    })
    renderAt('/perfil')

    expect(await screen.findByRole('button', { name: 'Conectar Gmail' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Volver a revisar el mes' })).not.toBeInTheDocument()
  })
})
