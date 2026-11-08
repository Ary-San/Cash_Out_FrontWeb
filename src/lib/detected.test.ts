import { describe, expect, it } from 'vitest'
import type { DetectedMovement } from '@/types/detected'
import { confirmRequest, formFromDraft, isConverted, visibleWarnings } from './assistant'
import { draftFromDetected } from './detected'

const blizzard: DetectedMovement = {
  id: 1,
  source: 'EMAIL',
  status: 'PENDING',
  kind: 'EXPENSE',
  description: 'Blizzard Entertainment',
  amount: 80.97,
  currency: 'USD',
  occurredAt: '2026-11-05T19:00:42',
  paymentMethod: 'CARD',
  category: 'LEISURE',
  confidence: 0.6,
  warnings: ['FOREIGN_CURRENCY'],
  alsoFrom: null,
  amountPen: 279.51,
  exchangeRate: 3.452,
  rateDate: '2026-11-05',
}

describe('pago en dolares con tipo del BCRP', () => {
  it('la tarjeta se llena en soles y ya no pide convertir a mano', () => {
    const draft = draftFromDetected(blizzard)

    expect(isConverted(draft)).toBe(true)
    expect(formFromDraft(draft).amount).toBe('279.51')
    expect(visibleWarnings(draft)).not.toContain('FOREIGN_CURRENCY')
  })

  it('al confirmar manda el monto en soles y lo pagado en dolares', () => {
    const draft = draftFromDetected(blizzard)
    const request = confirmRequest(draft, formFromDraft(draft))

    expect(request.amount).toBe(279.51)
    expect(request.originalCurrency).toBe('USD')
    expect(request.originalAmount).toBe(80.97)
  })

  it('sin tipo de cambio queda en dolares y pide convertirlo a mano', () => {
    const draft = draftFromDetected({ ...blizzard, amountPen: null, exchangeRate: null, rateDate: null })

    expect(isConverted(draft)).toBe(false)
    expect(formFromDraft(draft).amount).toBe('80.97')
    expect(visibleWarnings(draft)).toContain('FOREIGN_CURRENCY')
    expect(confirmRequest(draft, formFromDraft(draft)).originalCurrency).toBeUndefined()
  })

  it('un pago en soles no cambia', () => {
    const draft = draftFromDetected({ ...blizzard, currency: 'PEN', amount: 35.9, amountPen: null, warnings: [] })
    expect(isConverted(draft)).toBe(false)
    expect(formFromDraft(draft).amount).toBe('35.90')
  })
})
