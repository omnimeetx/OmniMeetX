"use client"

import { useState } from "react"
import { AnimatePresence, motion } from "framer-motion"
import { Bug, Check, Lightbulb, MessageSquare, RotateCcw } from "lucide-react"
import { toast } from "sonner"
import { API_URL } from "@/lib/config"
import { LoadError, TableSkeleton } from "./AdminBits"
import { adminHeaders, formatDate, useAdminData } from "./adminApi"

interface FeedbackItem {
  id: number
  kind: string
  message: string
  page_url: string | null
  status: string
  user_email: string | null
  created_at: string | null
}

const KINDS: Record<string, { label: string; icon: typeof Bug; className: string }> = {
  bug: { label: "Problem", icon: Bug, className: "text-danger" },
  idea: { label: "Idea", icon: Lightbulb, className: "text-sand" },
  other: { label: "Other", icon: MessageSquare, className: "text-bone-muted" },
}

/** The private messages from the Feedback button. They used to reach only your email. */
export default function FeedbackTab() {
  const { data, setData, loading, error, reload } = useAdminData<{ feedback: FeedbackItem[] }>("/api/feedback")
  const [view, setView] = useState<"new" | "all">("new")

  const setStatus = async (item: FeedbackItem, status: string) => {
    const previous = data
    setData((current) => (current ? { feedback: current.feedback.map((row) => (row.id === item.id ? { ...row, status } : row)) } : current))
    try {
      const res = await fetch(`${API_URL}/api/feedback/${item.id}`, { method: "PATCH", headers: adminHeaders(), body: JSON.stringify({ status }) })
      if (!res.ok) throw new Error(String(res.status))
    } catch {
      setData(previous)
      toast.error("Couldn't update that message.")
    }
  }

  if (error) return <LoadError what="feedback" onRetry={reload} />
  if (loading && !data) return <TableSkeleton rows={4} />

  const items = data?.feedback ?? []
  const newCount = items.filter((item) => item.status === "new").length
  const visible = view === "new" ? items.filter((item) => item.status === "new") : items

  return (
    <div className="space-y-4" data-testid="admin-feedback">
      <div className="flex gap-1.5">
        {[
          { id: "new" as const, label: `New (${newCount})` },
          { id: "all" as const, label: `All (${items.length})` },
        ].map((option) => (
          <button
            key={option.id}
            type="button"
            aria-pressed={view === option.id}
            onClick={() => setView(option.id)}
            className={`rounded-[10px] border px-3 py-1.5 text-xs transition-colors duration-200 ${view === option.id ? "border-line-strong bg-white/[0.07] text-bone" : "border-line text-bone-dim hover:text-bone-muted"}`}
          >
            {option.label}
          </button>
        ))}
      </div>

      <div aria-live="polite">
        {visible.length === 0 ? (
          <div className="spot-card px-5 py-14 text-center text-sm text-bone-dim">{view === "new" ? "You're all caught up." : "No feedback yet."}</div>
        ) : (
          <ul className="space-y-2.5">
            <AnimatePresence initial={false} mode="popLayout">
              {visible.map((item) => {
                const kind = KINDS[item.kind] ?? KINDS.other
                const Icon = kind.icon
                const isNew = item.status === "new"
                return (
                  <motion.li
                    key={item.id}
                    layout
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.98 }}
                    transition={{ duration: 0.26, ease: [0.19, 1, 0.22, 1] }}
                    className="spot-card p-5"
                    data-testid="feedback-item"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className={`inline-flex items-center gap-1.5 text-xs ${kind.className}`}>
                        <Icon className="h-3.5 w-3.5" />
                        {kind.label}
                      </span>
                      <button
                        type="button"
                        onClick={() => setStatus(item, isNew ? "reviewed" : "new")}
                        className="btn btn-ghost btn-sm"
                        data-testid="feedback-toggle"
                      >
                        {isNew ? <Check /> : <RotateCcw />}
                        {isNew ? "Mark as read" : "Mark as new"}
                      </button>
                    </div>
                    <p className="mt-3 whitespace-pre-wrap break-words text-[0.9375rem] leading-relaxed">{item.message}</p>
                    <p className="mt-3 flex flex-wrap gap-x-3 gap-y-1 text-xs text-bone-dim">
                      <span className="break-all">{item.user_email ?? "Deleted user"}</span>
                      {item.page_url && <span className="font-mono">{item.page_url}</span>}
                      <span>{formatDate(item.created_at)}</span>
                    </p>
                  </motion.li>
                )
              })}
            </AnimatePresence>
          </ul>
        )}
      </div>
    </div>
  )
}
