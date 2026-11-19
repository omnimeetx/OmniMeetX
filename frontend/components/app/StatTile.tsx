import type { LucideIcon } from "lucide-react"
import NumberTicker from "@/components/motion/NumberTicker"

interface StatTileProps {
  label: string
  value: number
  suffix?: string
  icon: LucideIcon
  hint?: string
}

export default function StatTile({ label, value, suffix, icon: Icon, hint }: StatTileProps) {
  return (
    <div className="spot-card p-5">
      <div className="flex items-center justify-between gap-2">
        <p className="label-mono">{label}</p>
        <Icon className="h-4 w-4 shrink-0 text-bone-dim" />
      </div>
      <p className="mt-4 font-mono text-3xl tracking-[-0.05em] sm:text-4xl">
        <NumberTicker value={value} suffix={suffix} />
      </p>
      {hint && <p className="mt-1.5 text-xs text-bone-dim">{hint}</p>}
    </div>
  )
}
