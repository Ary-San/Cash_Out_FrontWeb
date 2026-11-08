import { http } from '@/api/client'
import type { RaceSide, RaceView } from '@/types/race'

export const raceService = {
  /** Abre una sala con un escenario al azar; quien la crea es el anfitrion. */
  async create(entryFee: number): Promise<RaceView> {
    const { data } = await http.post<RaceView>('/race-rooms', { entryFee })
    return data
  },

  async get(code: string, signal?: AbortSignal): Promise<RaceView> {
    const { data } = await http.get<RaceView>(`/race-rooms/${code}`, { signal })
    return data
  },

  /** Cobra la cuota. Entrar dos veces no cobra dos veces. */
  async join(code: string): Promise<RaceView> {
    const { data } = await http.post<RaceView>(`/race-rooms/${code}/join`)
    return data
  },

  async start(code: string): Promise<RaceView> {
    const { data } = await http.post<RaceView>(`/race-rooms/${code}/start`)
    return data
  },

  /** Solo antes de empezar; devuelve las cuotas. */
  async cancel(code: string): Promise<void> {
    await http.post(`/race-rooms/${code}/cancel`)
  },

  /** Gratis: con menos de 3 jugadores no hay pozo que ganar. */
  async playSolo(): Promise<RaceView> {
    const room = await raceService.create(0)
    await raceService.join(room.code)
    return raceService.start(room.code)
  },

  async trade(code: string, side: RaceSide, fraction: number): Promise<RaceView> {
    const { data } = await http.post<RaceView>(`/race-rooms/${code}/trades`, { side, fraction })
    return data
  },
}
