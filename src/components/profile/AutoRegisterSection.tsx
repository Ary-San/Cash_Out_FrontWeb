import { useState } from 'react'
import { Check, Copy, KeyRound, RefreshCw, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { toApiError, userMessage } from '@/api/errors'
import { useApiQuery } from '@/hooks/useApiQuery'
import { formatDateTime } from '@/lib/format'
import { detectedService } from '@/services/detectedService'
import { Button } from '@/components/ui/button'
import { SettingsSection } from './SettingsSection'

/** La direccion publica del backend para el atajo: la API vive bajo /api/v1 del mismo sitio. */
const INGEST_URL = `${window.location.origin}/api/v1/ingest`

/**
 * El token personal para que un atajo de iPhone registre los pagos con Apple Pay.
 * Se muestra una sola vez al crearlo; cambiarlo invalida el anterior.
 */
export function AutoRegisterSection() {
  const [reload, setReload] = useState(0)
  const status = useApiQuery(['ingest-token', reload], (signal) => detectedService.tokenStatus(signal))
  const [fresh, setFresh] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const [busy, setBusy] = useState(false)
  const active = status.data?.active ?? false

  const run = async (action: () => Promise<void>) => {
    setBusy(true)
    try {
      await action()
      setReload((n) => n + 1)
    } catch (err) {
      toast.error(userMessage(toApiError(err)))
    } finally {
      setBusy(false)
    }
  }
  const create = () =>
    run(async () => {
      setFresh((await detectedService.newToken()).token)
      setCopied(false)
    })
  const revoke = () =>
    run(async () => {
      await detectedService.revokeToken()
      setFresh(null)
      toast.success('Token revocado: el atajo ya no puede registrar pagos.')
    })
  const copy = async () => {
    if (!fresh) return
    try {
      await navigator.clipboard.writeText(fresh)
      setCopied(true)
    } catch {
      toast.error('No pudimos copiarlo: selecciónalo y cópialo a mano.')
    }
  }

  return (
    <SettingsSection
      id="perfil-registro-automatico"
      title="Registro automático"
      description="Cuando pagas con Apple Pay, un atajo de iPhone avisa a Cash-Out y el pago aparece en Movimientos para que lo confirmes."
      footer={
        <>
          <span className="text-xs text-muted-foreground">
            {active && status.data?.createdAt
              ? `Token creado el ${formatDateTime(status.data.createdAt)}${status.data.lastUsedAt ? ` · último aviso ${formatDateTime(status.data.lastUsedAt)}` : ' · todavía sin avisos'}`
              : 'Sin token: nadie puede registrar pagos por ti.'}
          </span>
          <span className="flex gap-2">
            {active && (
              <Button variant="outline" size="sm" disabled={busy} onClick={() => void revoke()}>
                <Trash2 aria-hidden="true" />
                Revocar
              </Button>
            )}
            <Button size="sm" disabled={busy || status.isLoading} onClick={() => void create()}>
              {active ? <RefreshCw aria-hidden="true" /> : <KeyRound aria-hidden="true" />}
              {active ? 'Cambiar token' : 'Crear token'}
            </Button>
          </span>
        </>
      }
    >
      {fresh && (
        <div className="space-y-2 px-4 py-3.5">
          <p className="text-sm font-medium">Tu token (cópialo ahora: no lo volveremos a mostrar)</p>
          <div className="flex items-center gap-2">
            <code className="min-w-0 flex-1 truncate rounded-lg bg-muted px-3 py-2 font-mono text-[13px]">{fresh}</code>
            <Button variant="outline" size="sm" onClick={() => void copy()}>
              {copied ? <Check aria-hidden="true" /> : <Copy aria-hidden="true" />}
              {copied ? 'Copiado' : 'Copiar'}
            </Button>
          </div>
        </div>
      )}
      <ol className="list-decimal space-y-1.5 px-4 py-3.5 pl-9 text-sm text-muted-foreground">
        <li>En el iPhone, abre Atajos → Automatización → nueva → <b className="text-foreground">Transacción</b> (Wallet) y elige tus tarjetas.</li>
        <li>
          Agrega la acción <b className="text-foreground">Obtener contenido de URL</b> con método POST a <code className="font-mono text-[12.5px] text-foreground">{INGEST_URL}</code>.
        </li>
        <li>
          Encabezado <code className="font-mono text-[12.5px] text-foreground">X-Cashout-Token</code> con tu token, y cuerpo JSON:{' '}
          <code className="font-mono text-[12.5px] text-foreground">source</code> = SHORTCUT,{' '}
          <code className="font-mono text-[12.5px] text-foreground">text</code> = “Comercio Monto con tarjeta”,{' '}
          <code className="font-mono text-[12.5px] text-foreground">externalId</code> = la fecha actual en segundos.
        </li>
        <li>Desactiva “Preguntar antes de ejecutar”. Desde ahí, cada pago con Apple Pay llega a Movimientos.</li>
      </ol>
    </SettingsSection>
  )
}
