import { http } from '@/api/client'
import { isSolo } from '@/lib/soloPlay'
import { portfolioGameService } from './portfolioGameService'
import { raceService } from './raceService'
import { updownService } from './updownService'

vi.mock('@/api/client', () => ({ http: { post: vi.fn() } }))

const post = vi.mocked(http.post)

describe('jugar solo', () => {
  beforeEach(() => {
    post.mockReset()
    post.mockResolvedValue({ data: { code: 'KX7Q2M' } })
  })

  it('¿Sube o baja?: crea la sala, entra y la empieza, en ese orden', async () => {
    await updownService.playSolo()

    expect(post.mock.calls.map(([url]) => url)).toEqual(['/updown-rooms', '/updown-rooms/KX7Q2M/join', '/updown-rooms/KX7Q2M/start'])
  })

  it('Arma tu portafolio: crea y entra; empieza cuando el portafolio esta listo', async () => {
    await portfolioGameService.playSolo()

    expect(post.mock.calls.map(([url]) => url)).toEqual(['/portfolio-rooms', '/portfolio-rooms/KX7Q2M/join'])
  })

  it('Carrera: gratis, entra y empieza', async () => {
    await raceService.playSolo()

    expect(post.mock.calls[0]).toEqual(['/race-rooms', { entryFee: 0 }])
    expect(post.mock.calls.slice(1).map(([url]) => url)).toEqual(['/race-rooms/KX7Q2M/join', '/race-rooms/KX7Q2M/start'])
  })

  it('es solo si la sala es tuya, entraste y no hay nadie mas', () => {
    expect(isSolo({ host: true, joined: true, ranking: [1] })).toBe(true)
    expect(isSolo({ host: true, joined: true, ranking: [1, 2] })).toBe(false)
    expect(isSolo({ host: true, joined: false, ranking: [] })).toBe(false)
    expect(isSolo({ host: false, joined: true, ranking: [1] })).toBe(false)
  })
})
