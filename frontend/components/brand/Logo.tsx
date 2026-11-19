import { BRAND } from "@/lib/brand"

/** Three voice bars inside a rounded square: a meeting becoming text. */
export function LogoMark({ size = 28, className }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none" aria-hidden="true" className={className}>
      <rect width="32" height="32" rx="9" fill="var(--brand)" />
      <rect x="8" y="12" width="3.5" height="8" rx="1.75" fill="var(--on-brand)" />
      <rect x="14.25" y="7" width="3.5" height="18" rx="1.75" fill="var(--on-brand)" />
      <rect x="20.5" y="10.5" width="3.5" height="11" rx="1.75" fill="var(--on-brand)" />
    </svg>
  )
}

export function Logo({ size = 28, className }: { size?: number; className?: string }) {
  return (
    <span className={`inline-flex items-center gap-2.5 ${className ?? ""}`}>
      <LogoMark size={size} />
      <span className="text-[1.0625rem] font-medium tracking-[-0.03em] text-bone">{BRAND.name}</span>
    </span>
  )
}
