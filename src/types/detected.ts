import type { DraftWarning } from '@/types/assistant'
import type { ExpenseCategory } from '@/types/movements'

export type DetectedSource = 'SHORTCUT' | 'EMAIL' | 'NOTIFICATION'

/** DetectedResponse: un pago que llego solo y espera que el usuario lo confirme. */
export interface DetectedMovement {
  id: number
  source: DetectedSource
  status: 'PENDING' | 'CONFIRMED' | 'DISCARDED' | 'MERGED'
  kind: 'INCOME' | 'EXPENSE'
  description: string | null
  amount: number | null
  currency: 'PEN' | 'USD'
  /** LocalDateTime de Lima, sin zona. */
  occurredAt: string
  paymentMethod: 'YAPE' | 'PLIN' | 'CARD' | 'CASH' | 'TRANSFER' | null
  category: ExpenseCategory | null
  confidence: number
  warnings: DraftWarning[]
  /** La otra fuente que aviso del mismo pago. */
  alsoFrom: DetectedSource | null
  /** Si fue en dolares: su equivalente en soles con el tipo oficial del BCRP. */
  amountPen: number | null
  exchangeRate: number | null
  /** yyyy-MM-dd del tipo de cambio usado (el ultimo publicado hasta el dia del pago). */
  rateDate: string | null
}

/** El estado de la conexion con Gmail para leer los correos del banco. */
/** Resultado de leer el mes: correos del banco reconocidos y movimientos nuevos en la bandeja. */
export interface GmailScanResult {
  read: number
  added: number
}

export interface GmailStatus {
  /** false si el servidor no tiene configurado el cliente de Google. */
  available: boolean
  connected: boolean
  email: string | null
  /** EXPIRED: Google ya no acepta el permiso; hay que reconectar. */
  status: 'ACTIVE' | 'EXPIRED' | null
  lastCheckedAt: string | null
}

export interface IngestTokenStatus {
  active: boolean
  createdAt: string | null
  lastUsedAt: string | null
}

export interface NewIngestToken {
  /** Se muestra una sola vez: el backend solo guarda su huella. */
  token: string
  createdAt: string
}
