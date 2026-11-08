import { amountField, amountToField } from '@/lib/amount'
import { todayIso } from '@/lib/dates'
import type { ConfirmDraftRequest, Draft, DraftKind, DraftWarning } from '@/types/assistant'
import type { ExpenseCategory } from '@/types/movements'

/** Lo que el usuario puede cambiar en una tarjeta antes de guardarla. */
export interface DraftForm {
  kind: DraftKind
  description: string
  amount: string
  date: string
  category: ExpenseCategory | null
}

export const WARNING_TEXT: Record<DraftWarning, string> = {
  MISSING_AMOUNT: 'No dijiste el monto: complétalo.',
  FOREIGN_CURRENCY: 'Está en dólares y la app guarda soles: conviértelo antes de guardar.',
  NOT_SPLIT: 'Es el total: no se dividió entre las personas.',
  LONG_DESCRIPTION: 'La descripción es larga: revísala.',
  HIGH_AMOUNT: 'El monto es muy alto: revísalo.',
  DUPLICATE_RECEIPT: 'Ya registraste esta boleta.',
  CREDIT_NOTE: 'Es una nota de crédito: entra como ingreso.',
  POSSIBLE_SAME_PAYMENT: 'Llegaron otros avisos con el mismo monto a la misma hora: revisa que no sea el mismo pago.',
  POSSIBLE_MANUAL_DUPLICATE: 'Ya registraste un movimiento con este monto hoy: puede ser el mismo.',
}

export const PAYMENT_LABEL: Record<NonNullable<Draft['paymentMethod']>, string> = {
  YAPE: 'Yape',
  PLIN: 'Plin',
  CARD: 'Tarjeta',
  CASH: 'Efectivo',
  TRANSFER: 'Transferencia',
}

/** Debajo de esto la sugerencia es una adivinanza: la tarjeta lo dice y destaca las alternativas. */
export const CONFIDENT = 0.5

/** Un monto en dolares que ya tiene su equivalente en soles (tipo oficial del BCRP). */
export function isConverted(draft: Draft): boolean {
  return draft.currency === 'USD' && draft.amount != null && draft.amountPen != null
}

/** Lo que la tarjeta avisa: si ya se convirtio, sobra pedir que se convierta a mano. */
export function visibleWarnings(draft: Draft): Draft['warnings'] {
  return isConverted(draft) ? draft.warnings.filter((w) => w !== 'FOREIGN_CURRENCY') : draft.warnings
}

export function formFromDraft(draft: Draft): DraftForm {
  // La app guarda soles: un monto en dolares ya convertido entra a la tarjeta en soles.
  const amount = isConverted(draft) ? draft.amountPen! : draft.amount
  return {
    kind: draft.kind,
    description: draft.description ?? '',
    amount: amount == null ? '' : amountToField(amount),
    date: draft.date,
    category: draft.category,
  }
}

/** El primer problema que impide guardar, o null si la tarjeta esta lista. */
export function formProblem(form: DraftForm, today: string = todayIso()): string | null {
  const amount = amountField.safeParse(form.amount)
  if (!amount.success) return amount.error.issues[0].message
  if (!form.date) return 'Elige la fecha.'
  if (form.date > today) return 'La fecha no puede ser futura.'
  if (form.kind === 'EXPENSE' && !form.category) return 'Elige una categoría.'
  return null
}

/**
 * Lo que se manda al confirmar. Se aprende solo si el usuario cambio el tipo o
 * la categoria: confirmar lo sugerido no ensena nada nuevo.
 */
export function confirmRequest(draft: Draft, form: DraftForm): ConfirmDraftRequest {
  const income = form.kind === 'INCOME'
  const description = form.description.trim()
  return {
    kind: form.kind,
    amount: amountField.parse(form.amount),
    date: form.date,
    description: description || undefined,
    category: income ? undefined : (form.category ?? undefined),
    ruc: draft.ruc ?? undefined,
    receiptRef: draft.receiptRef ?? undefined,
    learn: form.kind !== draft.kind || (!income && form.category !== draft.category),
    ...(!income && isConverted(draft) && { originalCurrency: 'USD' as const, originalAmount: draft.amount! }),
  }
}
