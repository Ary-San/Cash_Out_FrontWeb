import { http } from '@/api/client'
import type { ConfirmDraftRequest, ConfirmDraftResponse } from '@/types/assistant'
import type { DetectedMovement, GmailScanResult, GmailStatus, IngestTokenStatus, NewIngestToken } from '@/types/detected'

/** El registro automatico: la bandeja de pagos detectados y el token para el atajo. */
export const detectedService = {
  async pending(signal?: AbortSignal): Promise<DetectedMovement[]> {
    const { data } = await http.get<DetectedMovement[]>('/detected', { signal })
    return data
  },

  /** Crea el gasto o el ingreso con lo que el usuario dejo en la tarjeta. */
  async confirm(id: number, request: ConfirmDraftRequest): Promise<ConfirmDraftResponse> {
    const { data } = await http.post<ConfirmDraftResponse>(`/detected/${id}/confirm`, request)
    return data
  },

  async discard(id: number): Promise<void> {
    await http.post(`/detected/${id}/discard`)
  },

  async tokenStatus(signal?: AbortSignal): Promise<IngestTokenStatus> {
    const { data } = await http.get<IngestTokenStatus>('/ingest-token', { signal })
    return data
  },

  /** Crea el token o lo cambia: el anterior deja de funcionar. */
  async newToken(): Promise<NewIngestToken> {
    const { data } = await http.post<NewIngestToken>('/ingest-token')
    return data
  },

  async revokeToken(): Promise<void> {
    await http.delete('/ingest-token')
  },

  async gmailStatus(signal?: AbortSignal): Promise<GmailStatus> {
    const { data } = await http.get<GmailStatus>('/gmail', { signal })
    return data
  },

  /** La direccion de Google para dar el permiso de solo lectura; al volver, el backend redirige a Perfil. */
  async gmailConnectUrl(): Promise<string> {
    const { data } = await http.post<{ url: string }>('/gmail/connect')
    return data.url
  },

  /** Lee los correos del banco del mes; again=true devuelve tambien lo descartado del mes. */
  async scanGmailMonth(again: boolean): Promise<GmailScanResult> {
    const { data } = await http.post<GmailScanResult>('/gmail/scan', null, { params: { again } })
    return data
  },

  async disconnectGmail(): Promise<void> {
    await http.delete('/gmail')
  },
}
