import { useId, useState } from 'react'
import { Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { toApiError, userMessage } from '@/api/errors'
import { useAsyncAction } from '@/hooks/useAsyncAction'
import { useAuth } from '@/hooks/useAuth'
import { userService } from '@/services/userService'
import { ConfirmDialog } from '@/components/feedback/ConfirmDialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { SettingsRow, SettingsSection } from '@/components/profile/SettingsSection'

/** Lo que hay que escribir para confirmar: un clic suelto no borra una cuenta entera. */
const WORD = 'ELIMINAR'

export function DeactivateAccount() {
  const { logout } = useAuth()
  const inputId = useId()
  const [confirming, setConfirming] = useState(false)
  const [typed, setTyped] = useState('')

  const remove = useAsyncAction(async () => {
    try {
      await userService.deleteMe()
    } catch (err) {
      setConfirming(false)
      toast.error(userMessage(toApiError(err)))
      return
    }
    toast.success('Eliminamos tu cuenta y todos tus datos.')
    await logout()
  })

  const open = (next: boolean) => {
    setConfirming(next)
    if (!next) setTyped('')
  }

  return (
    <SettingsSection
      id="perfil-baja"
      title="Zona de riesgo"
      description="Lo que hagas aquí no se puede deshacer."
      className="border-destructive/30"
    >
      <SettingsRow
        label="Eliminar la cuenta"
        description="Se borran tu cuenta y todos tus datos: movimientos, metas, ahorro, fichas, portafolio y la conexión con Gmail. Después puedes registrarte de nuevo con este correo, desde cero."
      >
        <div className="flex md:justify-end">
          <Button
            variant="outline"
            className="text-destructive hover:text-destructive max-sm:w-full"
            onClick={() => open(true)}
          >
            <Trash2 aria-hidden="true" />
            Eliminar mi cuenta
          </Button>
        </div>
      </SettingsRow>
      <ConfirmDialog
        open={confirming}
        onOpenChange={open}
        title="¿Eliminar tu cuenta?"
        description="Se borra todo y no se puede recuperar. Si solo quieres salir, usa «Cerrar sesión»."
        confirmLabel="Eliminar todo"
        pendingLabel="Eliminando…"
        onConfirm={() => void remove.run()}
        pending={remove.isPending}
        confirmDisabled={typed.trim().toUpperCase() !== WORD}
      >
        <div className="grid gap-1.5">
          <label htmlFor={inputId} className="text-sm">
            Escribe <b>{WORD}</b> para confirmar
          </label>
          <Input id={inputId} value={typed} onChange={(e) => setTyped(e.target.value)} autoComplete="off" disabled={remove.isPending} />
        </div>
      </ConfirmDialog>
    </SettingsSection>
  )
}
