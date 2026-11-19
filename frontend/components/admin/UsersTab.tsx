"use client"

import { useMemo, useState } from "react"
import { CheckCircle2, RefreshCw, Search } from "lucide-react"
import { Input } from "@/components/ui/input"
import { EmptyRow, LoadError, StatusText, TableFrame, TableSkeleton, Td, Th } from "./AdminBits"
import { formatDate, useAdminData } from "./adminApi"

interface UserRecord {
  id: number
  full_name: string
  email: string
  plan: string
  credits_remaining: number
  credits_total: number
  is_verified: boolean
  is_active: boolean
  subscription_status: string
  created_at: string | null
}

const PLAN_FILTERS = [
  { id: "all", label: "All plans" },
  { id: "free", label: "Starter" },
  { id: "pro", label: "Pro" },
  { id: "premium", label: "Premium" },
  { id: "enterprise", label: "Enterprise" },
]

const PLAN_NAMES: Record<string, string> = { free: "Starter", pro: "Pro", premium: "Premium", enterprise: "Enterprise" }

export default function UsersTab() {
  const { data, loading, error, reload } = useAdminData<{ users: UserRecord[] }>("/api/auth/users")
  const [search, setSearch] = useState("")
  const [plan, setPlan] = useState("all")

  const users = useMemo(() => {
    const term = search.trim().toLowerCase()
    return (data?.users ?? []).filter((user) => {
      const matchesText = !term || user.full_name?.toLowerCase().includes(term) || user.email?.toLowerCase().includes(term)
      return matchesText && (plan === "all" || user.plan === plan)
    })
  }, [data, search, plan])

  if (error) return <LoadError what="users" onRetry={reload} />

  return (
    <div className="space-y-4" data-testid="admin-users">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-3 h-4 w-4 text-bone-dim" />
          <Input
            aria-label="Search users by name or email"
            placeholder="Search by name or email..."
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            className="pl-9"
          />
        </div>
        <div className="flex flex-wrap items-center gap-1.5">
          {PLAN_FILTERS.map((filter) => (
            <button
              key={filter.id}
              type="button"
              aria-pressed={plan === filter.id}
              onClick={() => setPlan(filter.id)}
              className={`rounded-[10px] border px-3 py-1.5 text-xs transition-colors duration-200 ${plan === filter.id ? "border-line-strong bg-white/[0.07] text-bone" : "border-line text-bone-dim hover:text-bone-muted"}`}
            >
              {filter.label}
            </button>
          ))}
          <button type="button" onClick={reload} disabled={loading} aria-label="Refresh users" className="btn btn-ghost btn-sm !px-2.5">
            <RefreshCw className={loading ? "animate-spin" : ""} />
          </button>
        </div>
      </div>

      {loading && !data ? (
        <TableSkeleton />
      ) : (
        <TableFrame label="Users">
          <thead>
            <tr>
              <Th>User</Th>
              <Th>Plan</Th>
              <Th>Minutes left</Th>
              <Th>Joined</Th>
              <Th>Account</Th>
            </tr>
          </thead>
          <tbody>
            {users.length === 0 ? (
              <EmptyRow columns={5}>No users match that.</EmptyRow>
            ) : (
              users.map((user) => (
                <tr key={user.id} className="transition-colors duration-150 hover:bg-white/[0.02]">
                  <Td>
                    <div className="flex items-center gap-3">
                      <span className="tile-accent flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs uppercase">
                        {(user.full_name || user.email).slice(0, 2)}
                      </span>
                      <div className="min-w-0">
                        <p className="flex items-center gap-1.5 truncate">
                          {user.full_name || "No name"}
                          {user.is_verified && <CheckCircle2 aria-label="Verified email" className="h-3.5 w-3.5 shrink-0 text-brand-light" />}
                        </p>
                        <p className="truncate text-xs text-bone-dim">{user.email}</p>
                      </div>
                    </div>
                  </Td>
                  <Td>{PLAN_NAMES[user.plan] ?? user.plan}</Td>
                  <Td className="font-mono text-xs tabular-nums text-bone-muted">
                    {user.credits_remaining.toLocaleString()} / {user.credits_total.toLocaleString()}
                  </Td>
                  <Td className="whitespace-nowrap text-xs text-bone-muted">{formatDate(user.created_at)}</Td>
                  <Td>{user.is_active ? <StatusText tone="good">Active</StatusText> : <StatusText tone="bad">Deactivated</StatusText>}</Td>
                </tr>
              ))
            )}
          </tbody>
        </TableFrame>
      )}
    </div>
  )
}
