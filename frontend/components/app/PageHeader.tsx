import type { ReactNode } from "react"

/** Title block at the top of app pages. */
export default function PageHeader({ eyebrow, title, description, actions }: { eyebrow?: string; title: ReactNode; description?: ReactNode; actions?: ReactNode }) {
  return (
    <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div className="min-w-0">
        {eyebrow && <p className="label-mono mb-3">{eyebrow}</p>}
        <h1 className="display-md break-words">{title}</h1>
        {description && <p className="mt-2 text-[0.9375rem] text-bone-muted">{description}</p>}
      </div>
      {actions && <div className="flex shrink-0 flex-wrap gap-2">{actions}</div>}
    </div>
  )
}
