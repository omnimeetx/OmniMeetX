"use client"

import { useState } from "react"
import Link from "next/link"
import { ArrowUpRight, ChevronUp } from "lucide-react"
import { EmptyRow, LoadError, StatusText, TableFrame, TableSkeleton, Td, Th } from "./AdminBits"
import { formatDate, useAdminData } from "./adminApi"

interface MeetingRow {
  id: number
  title: string
  user_email: string | null
  status: string
  language: string | null
  source: string | null
  minutes: number
  upload_date: string | null
}

interface IdeaRow {
  id: number
  title: string
  status: string
  votes: number
  author: string
  created_at: string | null
}

const MEETING_TONES: Record<string, "good" | "warn" | "bad" | "neutral"> = { completed: "good", processing: "warn", failed: "bad" }

const IDEA_STATUS: Record<string, { label: string; tone: "good" | "warn" | "bad" | "neutral" }> = {
  open: { label: "Under review", tone: "neutral" },
  planned: { label: "Planned", tone: "warn" },
  in_progress: { label: "In progress", tone: "warn" },
  done: { label: "Shipped", tone: "good" },
  declined: { label: "Not planned", tone: "bad" },
}

function MeetingsTable() {
  const { data, loading, error, reload } = useAdminData<{ meetings: MeetingRow[] }>("/api/admin/meetings")
  if (error) return <LoadError what="meetings" onRetry={reload} />
  if (loading && !data) return <TableSkeleton />

  const rows = data?.meetings ?? []
  return (
    <TableFrame label="Meetings">
      <thead>
        <tr>
          <Th>Meeting</Th>
          <Th>Owner</Th>
          <Th>Status</Th>
          <Th>Language</Th>
          <Th className="text-right">Minutes</Th>
          <Th>Date</Th>
        </tr>
      </thead>
      <tbody>
        {rows.length === 0 ? (
          <EmptyRow columns={6}>No meetings yet.</EmptyRow>
        ) : (
          rows.map((meeting) => (
            <tr key={meeting.id} className="transition-colors duration-150 hover:bg-white/[0.02]">
              <Td className="max-w-[16rem] truncate">{meeting.title}</Td>
              <Td className="max-w-[14rem] truncate text-xs text-bone-muted">{meeting.user_email ?? "Deleted user"}</Td>
              <Td>
                <StatusText tone={MEETING_TONES[meeting.status] ?? "neutral"}>{meeting.status}</StatusText>
              </Td>
              <Td className="font-mono text-xs text-bone-muted">{meeting.language ?? "auto"}</Td>
              <Td className="text-right font-mono text-xs tabular-nums text-bone-muted">{meeting.minutes ? meeting.minutes.toLocaleString() : "-"}</Td>
              <Td className="whitespace-nowrap text-xs text-bone-muted">{formatDate(meeting.upload_date)}</Td>
            </tr>
          ))
        )}
      </tbody>
    </TableFrame>
  )
}

function IdeasTable() {
  const { data, loading, error, reload } = useAdminData<{ requests: IdeaRow[] }>("/api/feature-requests?sort=top")
  if (error) return <LoadError what="feature requests" onRetry={reload} />
  if (loading && !data) return <TableSkeleton />

  const rows = data?.requests ?? []
  return (
    <TableFrame label="Feature requests">
      <thead>
        <tr>
          <Th>Votes</Th>
          <Th>Idea</Th>
          <Th>Status</Th>
          <Th>Suggested by</Th>
          <Th>Date</Th>
        </tr>
      </thead>
      <tbody>
        {rows.length === 0 ? (
          <EmptyRow columns={5}>No ideas yet.</EmptyRow>
        ) : (
          rows.map((idea) => {
            const status = IDEA_STATUS[idea.status] ?? IDEA_STATUS.open
            return (
              <tr key={idea.id} className="transition-colors duration-150 hover:bg-white/[0.02]">
                <Td className="font-mono text-xs tabular-nums">
                  <span className="inline-flex items-center gap-1">
                    <ChevronUp className="h-3.5 w-3.5 text-bone-dim" />
                    {idea.votes}
                  </span>
                </Td>
                <Td className="max-w-[24rem] truncate">{idea.title}</Td>
                <Td>
                  <StatusText tone={status.tone}>{status.label}</StatusText>
                </Td>
                <Td className="text-xs text-bone-muted">{idea.author || "Unknown"}</Td>
                <Td className="whitespace-nowrap text-xs text-bone-muted">{formatDate(idea.created_at)}</Td>
              </tr>
            )
          })
        )}
      </tbody>
    </TableFrame>
  )
}

export default function DataTab() {
  const [table, setTable] = useState<"meetings" | "ideas">("meetings")

  return (
    <div className="space-y-4" data-testid="admin-data">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex gap-1.5">
          {[
            { id: "meetings" as const, label: "Meetings" },
            { id: "ideas" as const, label: "Feature requests" },
          ].map((option) => (
            <button
              key={option.id}
              type="button"
              aria-pressed={table === option.id}
              onClick={() => setTable(option.id)}
              className={`rounded-[10px] border px-3 py-1.5 text-xs transition-colors duration-200 ${table === option.id ? "border-line-strong bg-white/[0.07] text-bone" : "border-line text-bone-dim hover:text-bone-muted"}`}
            >
              {option.label}
            </button>
          ))}
        </div>
        {table === "ideas" && (
          <Link href="/feedback" className="inline-flex items-center gap-1 text-xs text-bone-muted transition-colors duration-200 hover:text-bone">
            Change statuses on the board
            <ArrowUpRight className="h-3.5 w-3.5" />
          </Link>
        )}
      </div>
      {table === "meetings" ? <MeetingsTable /> : <IdeasTable />}
    </div>
  )
}
