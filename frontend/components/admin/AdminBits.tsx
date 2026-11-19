"use client"

import type { ReactNode } from "react"
import { AlertCircle, RefreshCw } from "lucide-react"
import { Skeleton } from "@/components/ui/skeleton"

export function LoadError({ what, onRetry }: { what: string; onRetry: () => void }) {
  return (
    <div role="alert" className="spot-card flex flex-col items-start gap-3 p-6">
      <p className="flex items-center gap-2 text-sm text-danger">
        <AlertCircle className="h-4 w-4" />
        Couldn't load {what}.
      </p>
      <button type="button" onClick={onRetry} className="btn btn-ghost btn-sm">
        <RefreshCw />
        Try again
      </button>
    </div>
  )
}

export function TableSkeleton({ rows = 6 }: { rows?: number }) {
  return (
    <div role="status" aria-label="Loading" className="spot-card space-y-3 p-5">
      {Array.from({ length: rows }).map((_, index) => (
        <Skeleton key={index} className="h-10" />
      ))}
    </div>
  )
}

export function TableFrame({ children, label }: { children: ReactNode; label: string }) {
  return (
    <div className="spot-card overflow-hidden">
      <div className="overflow-x-auto" tabIndex={0} role="region" aria-label={label}>
        <table className="w-full min-w-[40rem] text-left text-sm">{children}</table>
      </div>
    </div>
  )
}

export function Th({ children, className }: { children?: ReactNode; className?: string }) {
  return (
    <th scope="col" className={`label-mono whitespace-nowrap border-b border-line px-5 py-3 !font-medium ${className ?? ""}`}>
      {children}
    </th>
  )
}

export function Td({ children, className }: { children?: ReactNode; className?: string }) {
  return <td className={`border-b border-line px-5 py-3.5 align-middle ${className ?? ""}`}>{children}</td>
}

export function EmptyRow({ columns, children }: { columns: number; children: ReactNode }) {
  return (
    <tr>
      <td colSpan={columns} className="px-5 py-12 text-center text-bone-dim">
        {children}
      </td>
    </tr>
  )
}

const STATUS_STYLES: Record<string, string> = {
  good: "text-brand-light",
  warn: "text-warn",
  bad: "text-danger",
  neutral: "text-bone-muted",
}

/** Status is never colour alone: the word is always there. */
export function StatusText({ tone, children }: { tone: keyof typeof STATUS_STYLES; children: ReactNode }) {
  return (
    <span className={`inline-flex items-center gap-1.5 whitespace-nowrap text-xs ${STATUS_STYLES[tone]}`}>
      <span className="h-1.5 w-1.5 rounded-full bg-current" />
      {children}
    </span>
  )
}
