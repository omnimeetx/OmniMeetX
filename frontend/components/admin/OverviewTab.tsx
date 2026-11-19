"use client"

import { AlertCircle, CheckCircle2, Clock, CreditCard, FileText, Inbox, Loader2, Users, type LucideIcon } from "lucide-react"
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts"
import StatTile from "@/components/app/StatTile"
import { Skeleton } from "@/components/ui/skeleton"
import { useMotionEnabled } from "@/lib/motion"
import { LoadError } from "./AdminBits"
import { useAdminData } from "./adminApi"

interface DayCount {
  date: string
  count: number
}

interface Overview {
  totals: {
    users: number
    verified_users: number
    paid_users: number
    meetings: number
    minutes_recorded: number
    feedback_new: number
    feature_requests_open: number
  }
  plans: Record<string, number>
  meeting_statuses: Record<string, number>
  languages: { language: string; count: number }[]
  meetings_by_day: DayCount[]
  signups_by_day: DayCount[]
}

const shortDate = (iso: string) => new Date(`${iso}T00:00:00`).toLocaleDateString(undefined, { day: "numeric", month: "short" })

function DayTooltip({ active, payload, label, unit }: { active?: boolean; payload?: { value: number }[]; label?: string; unit: string }) {
  if (!active || !payload?.length || !label) return null
  return (
    <div className="rounded-[10px] border border-line-strong bg-panel-3 px-3 py-2 text-xs">
      <p className="text-bone-dim">{shortDate(label)}</p>
      <p className="mt-0.5 font-mono text-sm tabular-nums">
        {payload[0].value} {unit}
      </p>
    </div>
  )
}

/** One series, so the title names it and there is no legend box. The table underneath carries every value. */
function DailyChart({ title, unit, data, testId }: { title: string; unit: string; data: DayCount[]; testId: string }) {
  const animate = useMotionEnabled()
  const total = data.reduce((sum, day) => sum + day.count, 0)

  return (
    <section className="spot-card p-5" aria-label={title} data-testid={testId}>
      <div className="flex items-baseline justify-between gap-3">
        <h3 className="label-mono !text-bone-muted">{title}</h3>
        <p className="text-xs text-bone-dim">Last 30 days</p>
      </div>
      <p className="mt-3 font-mono text-3xl tracking-[-0.05em] tabular-nums">{total.toLocaleString()}</p>

      <div className="mt-4 h-52">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 4, right: 0, bottom: 0, left: -28 }} barCategoryGap={2}>
            <CartesianGrid vertical={false} stroke="var(--line)" />
            <XAxis
              dataKey="date"
              tickFormatter={shortDate}
              interval="preserveStartEnd"
              minTickGap={56}
              axisLine={{ stroke: "var(--line-strong)" }}
              tickLine={false}
              tick={{ fill: "var(--text-dim)", fontSize: 11 }}
            />
            <YAxis allowDecimals={false} axisLine={false} tickLine={false} tick={{ fill: "var(--text-dim)", fontSize: 11 }} />
            <Tooltip cursor={{ fill: "rgba(var(--text-rgb),0.05)" }} content={<DayTooltip unit={unit} />} />
            <Bar dataKey="count" fill="var(--brand)" radius={[4, 4, 0, 0]} maxBarSize={24} isAnimationActive={animate} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <details className="mt-3 text-xs text-bone-dim">
        <summary className="cursor-pointer rounded transition-colors duration-200 hover:text-bone-muted">See the numbers</summary>
        <div className="mt-2 max-h-48 overflow-y-auto">
          <table className="w-full">
            <caption className="sr-only">{title}, by day</caption>
            <tbody>
              {data
                .filter((day) => day.count > 0)
                .map((day) => (
                  <tr key={day.date} className="border-t border-line">
                    <td className="py-1.5">{shortDate(day.date)}</td>
                    <td className="py-1.5 text-right font-mono text-bone-muted">{day.count}</td>
                  </tr>
                ))}
              {total === 0 && (
                <tr>
                  <td className="py-1.5">Nothing in the last 30 days.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </details>
    </section>
  )
}

function Breakdown({ title, rows }: { title: string; rows: { key: string; label: string; count: number; color?: string; icon?: LucideIcon }[] }) {
  const max = Math.max(1, ...rows.map((row) => row.count))
  return (
    <section className="spot-card p-5" aria-label={title}>
      <h3 className="label-mono !text-bone-muted">{title}</h3>
      {rows.length === 0 ? (
        <p className="mt-5 text-sm text-bone-dim">No data yet.</p>
      ) : (
        <ul className="mt-5 space-y-4">
          {rows.map((row) => {
            const Icon = row.icon
            return (
              <li key={row.key}>
                <div className="flex items-baseline justify-between gap-3 text-sm">
                  <span className="flex min-w-0 items-center gap-2 truncate capitalize">
                    {Icon && <Icon className="h-3.5 w-3.5 shrink-0" style={{ color: row.color }} />}
                    {row.label}
                  </span>
                  <span className="font-mono text-xs tabular-nums text-bone-muted">{row.count.toLocaleString()}</span>
                </div>
                <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-white/[0.06]">
                  <div className="h-full rounded-full" style={{ width: `${Math.max(row.count ? 2 : 0, (row.count / max) * 100)}%`, backgroundColor: row.color ?? "var(--brand)" }} />
                </div>
              </li>
            )
          })}
        </ul>
      )}
    </section>
  )
}

function languageName(code: string) {
  if (code === "auto") return "Auto-detected"
  try {
    return new Intl.DisplayNames(["en"], { type: "language" }).of(code) ?? code
  } catch {
    return code
  }
}

const PLAN_ORDER = ["free", "pro", "premium", "enterprise"]
const PLAN_NAMES: Record<string, string> = { free: "Starter", pro: "Pro", premium: "Premium", enterprise: "Enterprise" }

const STATUS_ROWS: { key: string; label: string; color: string; icon: LucideIcon }[] = [
  { key: "completed", label: "Completed", color: "var(--brand-light)", icon: CheckCircle2 },
  { key: "processing", label: "Processing", color: "var(--warn)", icon: Loader2 },
  { key: "uploaded", label: "Waiting", color: "var(--sand)", icon: Clock },
  { key: "failed", label: "Failed", color: "var(--danger)", icon: AlertCircle },
]

export default function OverviewTab() {
  const { data, loading, error, reload } = useAdminData<Overview>("/api/admin/overview")

  if (error) return <LoadError what="the overview" onRetry={reload} />

  if (loading || !data) {
    return (
      <div role="status" aria-label="Loading overview" className="space-y-4">
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          <Skeleton className="h-32" />
          <Skeleton className="h-32" />
          <Skeleton className="h-32" />
          <Skeleton className="h-32" />
        </div>
        <Skeleton className="h-80" />
      </div>
    )
  }

  const { totals } = data
  const plans = PLAN_ORDER.filter((plan) => data.plans[plan]).map((plan) => ({ key: plan, label: PLAN_NAMES[plan], count: data.plans[plan] }))
  const statuses = STATUS_ROWS.map((row) => ({ ...row, count: data.meeting_statuses[row.key] ?? 0 }))
  const languages = data.languages.map((row) => ({ key: row.language, label: languageName(row.language), count: row.count }))

  return (
    <div className="space-y-4" data-testid="admin-overview">
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatTile label="Users" value={totals.users} icon={Users} hint={`${totals.verified_users.toLocaleString()} verified`} />
        <StatTile label="Paying" value={totals.paid_users} icon={CreditCard} />
        <StatTile label="Meetings" value={totals.meetings} icon={FileText} hint={totals.minutes_recorded ? `${totals.minutes_recorded.toLocaleString()} minutes recorded` : undefined} />
        <StatTile label="New feedback" value={totals.feedback_new} icon={Inbox} hint={`${totals.feature_requests_open.toLocaleString()} open ideas`} />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <DailyChart title="New signups" unit="signups" data={data.signups_by_day} testId="chart-signups" />
        <DailyChart title="Meetings processed" unit="meetings" data={data.meetings_by_day} testId="chart-meetings" />
      </div>
      <p className="text-xs text-bone-dim">Accounts made before signup dates were recorded aren't in the signups chart.</p>

      <div className="grid gap-4 md:grid-cols-3">
        <Breakdown title="Plans" rows={plans} />
        <Breakdown title="Meeting status" rows={statuses} />
        <Breakdown title="Spoken languages" rows={languages} />
      </div>
    </div>
  )
}
