import type { ReactNode } from 'react'

interface PageHeaderProps {
  title: string
  description?: string
  actions?: ReactNode
}

/** Titulo de pagina de la marca: serif, con la ultima palabra en cursiva malva ("Hola, *Valeria*"). */
export function PageHeader({ title, description, actions }: PageHeaderProps) {
  const words = title.split(' ')
  // Un numero o una sigla corta no van en cursiva: queda raro en "Series 1".
  const accent = words.length > 1 && /^\p{L}[\p{L}.]{2,}$/u.test(words.at(-1)!)

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div className="space-y-1.5">
        <h1 className="font-display text-4xl leading-none text-balance sm:text-[2.6rem]">
          {accent ? (
            <>
              {words.slice(0, -1).join(' ')} <em className="text-accent-ink">{words.at(-1)}</em>
            </>
          ) : (
            title
          )}
        </h1>
        {description && <p className="text-sm text-muted-foreground">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  )
}
