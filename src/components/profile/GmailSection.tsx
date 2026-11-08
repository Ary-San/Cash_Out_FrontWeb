import { useCallback, useEffect, useState } from 'react'
import { useSearchParams } from 'react-router'
import { Mail, RefreshCw, Unplug } from 'lucide-react'
import { toast } from 'sonner'
import { toApiError, userMessage } from '@/api/errors'
import { useApiQuery } from '@/hooks/useApiQuery'
import { formatDateTime } from '@/lib/format'
import { cn } from '@/lib/utils'
import { detectedService } from '@/services/detectedService'
import { ConfirmDialog } from '@/components/feedback/ConfirmDialog'
import { Button } from '@/components/ui/button'
import type { GmailScanResult } from '@/types/detected'
import { SettingsSection } from './SettingsSection'

const FAILED: Record<string, string> = {
  cancelado: 'No diste el permiso: Gmail sigue sin conectar.',
  error: 'No pudimos conectar Gmail. Inténtalo de nuevo.',
}

function scanMessage({ read, added }: GmailScanResult): string {
  if (read === 0) return 'No encontramos correos de consumo del BCP este mes.'
  const mails = `Revisamos ${read} ${read === 1 ? 'correo' : 'correos'} del BCP de este mes`
  if (added === 0) return `${mails}: no hay movimientos nuevos.`
  return `${mails}: ${added} ${added === 1 ? 'movimiento nuevo' : 'movimientos nuevos'} en tu bandeja de Movimientos.`
}

/**
 * Conectar Gmail (solo lectura) para que los correos de consumo del banco lleguen solos a
 * Movimientos. Solo se leen los remitentes de los bancos; el correo no se guarda.
 */
export function GmailSection() {
  const [searchParams, setSearchParams] = useSearchParams()
  const [reload, setReload] = useState(0)
  const [busy, setBusy] = useState(false)
  const [confirmRescan, setConfirmRescan] = useState(false)
  const [scanning, setScanning] = useState(false)
  const status = useApiQuery(['gmail', reload], (signal) => detectedService.gmailStatus(signal))
  const data = status.data
  const expired = data?.status === 'EXPIRED'

  // Google vuelve a Perfil con ?gmail=...: si conecto, la pregunta por el mes queda abierta
  // mientras siga en la direccion; si fallo, se avisa una vez y se limpia.
  const result = searchParams.get('gmail')
  const askMonth = result === 'conectado'
  const clearResult = useCallback(
    () =>
      setSearchParams(
        (prev) => {
          const next = new URLSearchParams(prev)
          next.delete('gmail')
          return next
        },
        { replace: true },
      ),
    [setSearchParams],
  )
  useEffect(() => {
    if (!result || result === 'conectado') return
    if (FAILED[result]) toast.error(FAILED[result])
    clearResult()
  }, [result, clearResult])

  const connect = async () => {
    setBusy(true)
    try {
      window.location.assign(await detectedService.gmailConnectUrl())
    } catch (err) {
      toast.error(userMessage(toApiError(err)))
      setBusy(false)
    }
  }
  const scan = async (again: boolean) => {
    setScanning(true)
    try {
      toast.success(scanMessage(await detectedService.scanGmailMonth(again)))
      setReload((n) => n + 1)
    } catch (err) {
      toast.error(userMessage(toApiError(err)))
    } finally {
      setScanning(false)
      if (askMonth) clearResult()
      setConfirmRescan(false)
    }
  }
  const disconnect = async () => {
    setBusy(true)
    try {
      await detectedService.disconnectGmail()
      toast.success('Gmail desconectado: ya no leemos tus correos.')
      setReload((n) => n + 1)
    } catch (err) {
      toast.error(userMessage(toApiError(err)))
    } finally {
      setBusy(false)
    }
  }

  return (
    <SettingsSection
      id="perfil-gmail"
      title="Correos del banco"
      description="Conecta tu Gmail y cada consumo que te avise el BCP aparecerá en Movimientos para que lo confirmes."
      footer={
        <>
          <span className={cn('text-xs', expired ? 'text-warning' : 'text-muted-foreground')}>
            {!data
              ? ' '
              : !data.available
                ? 'La conexión con Gmail no está disponible en este servidor por ahora.'
                : !data.connected
                  ? 'Sin conectar.'
                  : expired
                    ? `El permiso de ${data.email} venció: vuelve a conectar.`
                    : `Conectado como ${data.email}${data.lastCheckedAt ? ` · última lectura ${formatDateTime(data.lastCheckedAt)}` : ' · primera lectura en unos minutos'}`}
          </span>
          <span className="flex gap-2">
            {data?.connected && !expired && (
              <Button variant="outline" size="sm" disabled={busy || scanning} onClick={() => setConfirmRescan(true)}>
                <RefreshCw aria-hidden="true" />
                Volver a revisar el mes
              </Button>
            )}
            {data?.connected && (
              <Button variant="outline" size="sm" disabled={busy || scanning} onClick={() => void disconnect()}>
                <Unplug aria-hidden="true" />
                Desconectar
              </Button>
            )}
            {(!data?.connected || expired) && (
              <Button size="sm" disabled={busy || !data?.available} onClick={() => void connect()}>
                <Mail aria-hidden="true" />
                {expired ? 'Reconectar Gmail' : 'Conectar Gmail'}
              </Button>
            )}
          </span>
        </>
      }
    >
      <ul className="list-disc space-y-1.5 px-4 py-3.5 pl-9 text-sm text-muted-foreground">
        <li>Solo leemos los correos de los bancos, nunca el resto de tu bandeja.</li>
        <li>No guardamos el correo: solo el monto, el comercio y la hora del consumo.</li>
        <li>Puedes desconectarlo aquí o desde tu cuenta de Google cuando quieras.</li>
        <li>¿Tus avisos llegan a otro correo? Cámbialo a tu Gmail en la app de tu banco.</li>
      </ul>
      <ConfirmDialog
        open={askMonth}
        onOpenChange={(open) => !open && clearResult()}
        tone="default"
        title="¿Traemos tus movimientos de este mes?"
        description="Gmail quedó conectado. Podemos leer los correos de consumo del BCP desde el día 1 para que tengas el mes completo, o empezar solo con lo que llegue desde ahora. Igual los confirmas tú en Movimientos."
        confirmLabel="Traer este mes"
        pendingLabel="Leyendo tus correos…"
        cancelLabel="Solo desde ahora"
        onConfirm={() => void scan(false)}
        pending={scanning}
      />
      <ConfirmDialog
        open={confirmRescan}
        onOpenChange={setConfirmRescan}
        tone="default"
        title="¿Volver a revisar el mes?"
        description="Leemos otra vez los correos del BCP desde el día 1. Lo que descartaste este mes vuelve a la bandeja de Movimientos; lo que ya confirmaste no se repite."
        confirmLabel="Revisar el mes"
        pendingLabel="Leyendo tus correos…"
        onConfirm={() => void scan(true)}
        pending={scanning}
      />
    </SettingsSection>
  )
}
