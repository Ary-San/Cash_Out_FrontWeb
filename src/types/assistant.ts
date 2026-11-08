import type { ExpenseCategory } from '@/types/movements'

export type DraftKind = 'INCOME' | 'EXPENSE'

export type DraftWarning =
  | 'MISSING_AMOUNT'
  | 'FOREIGN_CURRENCY'
  | 'NOT_SPLIT'
  | 'LONG_DESCRIPTION'
  | 'HIGH_AMOUNT'
  | 'DUPLICATE_RECEIPT'
  | 'CREDIT_NOTE'
  | 'POSSIBLE_SAME_PAYMENT'
  | 'POSSIBLE_MANUAL_DUPLICATE'

/** Draft: una tarjeta para confirmar. Nada esta guardado todavia. */
export interface Draft {
  kind: DraftKind
  description: string | null
  /** null si el mensaje no lo decia. */
  amount: number | null
  currency: 'PEN' | 'USD'
  /** yyyy-MM-dd */
  date: string
  paymentMethod: 'YAPE' | 'PLIN' | 'CARD' | 'CASH' | 'TRANSFER' | null
  /** null en un ingreso. */
  category: ExpenseCategory | null
  /** De 0 a 1. */
  confidence: number
  alternatives: { category: ExpenseCategory; probability: number }[]
  source: 'USER_RULE' | 'JEV' | 'KEYWORDS'
  warnings: DraftWarning[]
  /** RUC del comercio, si vino de una boleta. */
  ruc: string | null
  /** Huella de la boleta, para no registrarla dos veces. */
  receiptRef: string | null
  alreadyRegisteredAt: string | null
  /** Si el monto esta en dolares: su equivalente en soles con el tipo oficial del BCRP. */
  amountPen?: number | null
  exchangeRate?: number | null
  /** yyyy-MM-dd del tipo usado (el ultimo publicado hasta la fecha del gasto). */
  rateDate?: string | null
}

export interface ConfirmDraftRequest {
  kind: DraftKind
  amount: number
  date: string
  description?: string
  category?: ExpenseCategory
  ruc?: string
  receiptRef?: string
  /** El usuario cambio el tipo o la categoria sugeridos: la proxima vez saldra sola. */
  learn: boolean
  /** Pagado en dolares: amount ya va en soles y esto es lo pagado. */
  originalCurrency?: 'USD'
  originalAmount?: number
}

export interface ConfirmDraftResponse {
  kind: DraftKind
  id: number
  learned: boolean
}
