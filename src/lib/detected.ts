import type { Draft } from '@/types/assistant'
import type { DetectedMovement, DetectedSource } from '@/types/detected'

export const SOURCE_LABEL: Record<DetectedSource, string> = {
  SHORTCUT: 'Atajo de iPhone',
  EMAIL: 'Correo del banco',
  NOTIFICATION: 'Notificación',
}

/**
 * Un pago detectado como tarjeta del asistente: se revisa y se guarda igual que una frase.
 * Si fue en dolares, la tarjeta lo muestra convertido con el tipo del BCRP, como una frase.
 */
export function draftFromDetected(d: DetectedMovement): Draft {
  return {
    kind: d.kind,
    description: d.description,
    amount: d.amount,
    currency: d.currency,
    date: d.occurredAt.slice(0, 10),
    paymentMethod: d.paymentMethod,
    category: d.category,
    confidence: d.confidence,
    alternatives: [],
    source: 'KEYWORDS',
    warnings: d.warnings,
    ruc: null,
    receiptRef: null,
    alreadyRegisteredAt: null,
    amountPen: d.amountPen,
    exchangeRate: d.exchangeRate,
    rateDate: d.rateDate,
  }
}
