/** Sala propia con un solo jugador: ese jugador tambien maneja lo que haria el anfitrion. */
export function isSolo(view: { host: boolean; joined: boolean; ranking: unknown[] }): boolean {
  return view.host && view.joined && view.ranking.length <= 1
}
