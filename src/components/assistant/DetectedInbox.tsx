import { useState } from 'react'
import { Inbox } from 'lucide-react'
import { toast } from 'sonner'
import { toApiError, userMessage } from '@/api/errors'
import { useApiQuery } from '@/hooks/useApiQuery'
import { confirmRequest, formFromDraft, type DraftForm } from '@/lib/assistant'
import { draftFromDetected, SOURCE_LABEL } from '@/lib/detected'
import { formatSoles } from '@/lib/format'
import { detectedService } from '@/services/detectedService'
import type { DetectedMovement } from '@/types/detected'
import { DraftCard } from './DraftCard'

const time = new Intl.DateTimeFormat('es-PE', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })

interface CardState {
  form: DraftForm
  saving: boolean
  error: string | null
}

/**
 * Los pagos que llegaron solos (atajo de iPhone, correo del banco) esperando confirmacion.
 * Cada uno es una tarjeta del asistente: se revisa, se corrige y se guarda igual que una frase.
 * Si no hay ninguno, no ocupa lugar.
 */
export function DetectedInbox({ version, onSaved }: { version: number; onSaved: () => void }) {
  const [reload, setReload] = useState(0)
  const query = useApiQuery(['detected', version, reload], (signal) => detectedService.pending(signal))
  const [cards, setCards] = useState<Record<number, CardState>>({})
  const items = query.data ?? []
  if (items.length === 0) return null

  const stateOf = (d: DetectedMovement): CardState => cards[d.id] ?? { form: formFromDraft(draftFromDetected(d)), saving: false, error: null }
  const update = (id: number, change: Partial<CardState>, d: DetectedMovement) =>
    setCards((current) => ({ ...current, [id]: { ...stateOf(d), ...current[id], ...change } }))

  const save = async (d: DetectedMovement) => {
    const card = stateOf(d)
    update(d.id, { saving: true, error: null }, d)
    try {
      const result = await detectedService.confirm(d.id, confirmRequest(draftFromDetected(d), card.form))
      const what = `${result.kind === 'EXPENSE' ? 'Gasto' : 'Ingreso'} guardado: ${formatSoles(Number(card.form.amount.replace(',', '.')))}`
      toast.success(result.learned ? `${what}. La próxima vez lo sugerimos así.` : what)
      setReload((n) => n + 1)
      onSaved()
    } catch (err) {
      update(d.id, { saving: false, error: userMessage(toApiError(err)) }, d)
    }
  }

  const discard = async (d: DetectedMovement) => {
    try {
      await detectedService.discard(d.id)
      setReload((n) => n + 1)
    } catch (err) {
      toast.error(userMessage(toApiError(err)))
    }
  }

  return (
    <section aria-labelledby="detectados-titulo" className="rounded-2xl border border-info/40 bg-info/5 p-5">
      <h2 id="detectados-titulo" className="flex items-center gap-2 font-semibold">
        <Inbox className="size-4 text-info" aria-hidden="true" />
        {items.length === 1 ? '1 pago detectado' : `${items.length} pagos detectados`}
      </h2>
      <p className="mt-1 text-sm text-muted-foreground">Llegaron solos. Revísalos y guárdalos, o descártalos si no son tuyos.</p>
      <ul className="mt-4 space-y-3">
        {items.map((d) => {
          const card = stateOf(d)
          return (
            <li key={d.id} className="space-y-1.5">
              <p className="px-1 text-xs text-muted-foreground">
                {SOURCE_LABEL[d.source]} · {time.format(new Date(d.occurredAt))}
                {d.alsoFrom && <span className="text-info"> · también llegó por {SOURCE_LABEL[d.alsoFrom].toLowerCase()}</span>}
              </p>
              <ul>
                <DraftCard
                  draft={draftFromDetected(d)}
                  form={card.form}
                  onChange={(form) => update(d.id, { form }, d)}
                  onSave={() => void save(d)}
                  onDiscard={() => void discard(d)}
                  saving={card.saving}
                  error={card.error}
                />
              </ul>
            </li>
          )
        })}
      </ul>
    </section>
  )
}
