import type { ReactNode } from 'react'
import { Loader2 } from 'lucide-react'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'

interface ConfirmDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  description: ReactNode
  confirmLabel: string
  pendingLabel?: string
  onConfirm: () => void
  pending?: boolean
  /** Algo mas que pedir antes de confirmar, como escribir una palabra. */
  children?: ReactNode
  /** Mientras sea true, el boton de confirmar no se puede usar. */
  confirmDisabled?: boolean
  /** Texto del boton que cierra sin confirmar. */
  cancelLabel?: string
  /** 'default' para una pregunta que no borra nada. */
  tone?: 'destructive' | 'default'
}

/** Confirmacion para acciones destructivas. Queda abierto mientras la accion corre. */
export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel,
  pendingLabel = 'Eliminando…',
  onConfirm,
  pending = false,
  children,
  confirmDisabled = false,
  cancelLabel = 'Cancelar',
  tone = 'destructive',
}: ConfirmDialogProps) {
  return (
    <AlertDialog open={open} onOpenChange={(next) => !pending && onOpenChange(next)}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription>{description}</AlertDialogDescription>
        </AlertDialogHeader>
        {children}
        <AlertDialogFooter>
          <AlertDialogCancel disabled={pending}>{cancelLabel}</AlertDialogCancel>
          <AlertDialogAction
            variant={tone}
            disabled={pending || confirmDisabled}
            onClick={(event) => {
              // Radix cierra el dialogo al hacer clic; se cierra recien cuando la accion termina bien.
              event.preventDefault()
              onConfirm()
            }}
          >
            {pending && <Loader2 className="animate-spin" aria-hidden="true" />}
            {pending ? pendingLabel : confirmLabel}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
