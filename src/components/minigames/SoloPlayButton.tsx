import { useNavigate } from 'react-router'
import { Loader2, User } from 'lucide-react'
import { toast } from 'sonner'
import { toApiError, userMessage } from '@/api/errors'
import { useAsyncAction } from '@/hooks/useAsyncAction'
import { Button } from '@/components/ui/button'

interface SoloPlayButtonProps {
  /** Crea la sala propia, se une y la deja lista para jugar. */
  play: () => Promise<{ code: string }>
  /** La ruta del jugador, como "/minijuegos/sube-o-baja". */
  basePath: string
  label?: string
  variant?: 'outline' | 'default'
  className?: string
}

/** Jugar sin clase ni proyector: la sala es tuya y avanzas a tu ritmo. */
export function SoloPlayButton({ play, basePath, label = 'Jugar solo', variant = 'outline', className }: SoloPlayButtonProps) {
  const navigate = useNavigate()
  const start = useAsyncAction(async () => {
    try {
      const room = await play()
      navigate(`${basePath}/${room.code}`)
    } catch (error) {
      toast.error(userMessage(toApiError(error)))
    }
  })

  return (
    <Button variant={variant} className={className} onClick={() => start.run()} disabled={start.isPending}>
      {start.isPending ? <Loader2 className="animate-spin" aria-hidden="true" /> : <User aria-hidden="true" />}
      {label}
    </Button>
  )
}
