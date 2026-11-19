"use client"

import { useEffect, useState } from "react"
import { motion } from "framer-motion"
import { BarChart3, Inbox, Table2, Users, type LucideIcon } from "lucide-react"
import DataTab from "@/components/admin/DataTab"
import FeedbackTab from "@/components/admin/FeedbackTab"
import OverviewTab from "@/components/admin/OverviewTab"
import UsersTab from "@/components/admin/UsersTab"
import PageHeader from "@/components/app/PageHeader"

type TabId = "overview" | "users" | "data" | "feedback"

const TABS: { id: TabId; label: string; icon: LucideIcon }[] = [
  { id: "overview", label: "Overview", icon: BarChart3 },
  { id: "users", label: "Users", icon: Users },
  { id: "data", label: "Data", icon: Table2 },
  { id: "feedback", label: "Feedback", icon: Inbox },
]

export default function AdminPage() {
  const [tab, setTab] = useState<TabId>("overview")

  // /users redirects here with ?tab=users, and a tab stays put through a refresh.
  useEffect(() => {
    const requested = new URLSearchParams(window.location.search).get("tab")
    if (TABS.some((item) => item.id === requested)) setTab(requested as TabId)
  }, [])

  const choose = (id: TabId) => {
    setTab(id)
    window.history.replaceState(null, "", id === "overview" ? "/admin" : `/admin?tab=${id}`)
  }

  const onKeyDown = (event: React.KeyboardEvent, index: number) => {
    const offset = event.key === "ArrowRight" ? 1 : event.key === "ArrowLeft" ? -1 : 0
    if (!offset) return
    event.preventDefault()
    const next = TABS[(index + offset + TABS.length) % TABS.length]
    choose(next.id)
    document.getElementById(`admin-tab-${next.id}`)?.focus()
  }

  return (
    <div className="px-4 pb-20 pt-8 sm:px-6 lg:px-8 lg:pt-10">
      <div className="mx-auto max-w-7xl">
        <PageHeader eyebrow="Admin" title="How the product is doing" description="Real numbers from your database. Only admins can see this page." />

        <div role="tablist" aria-label="Admin sections" className="mb-6 inline-flex max-w-full flex-wrap gap-1 rounded-[14px] border border-line p-1">
          {TABS.map(({ id, label, icon: Icon }, index) => {
            const selected = tab === id
            return (
              <button
                key={id}
                id={`admin-tab-${id}`}
                type="button"
                role="tab"
                aria-selected={selected}
                aria-controls="admin-panel"
                tabIndex={selected ? 0 : -1}
                onClick={() => choose(id)}
                onKeyDown={(event) => onKeyDown(event, index)}
                data-testid={`admin-tab-${id}`}
                className={`relative flex items-center gap-2 rounded-[10px] px-4 py-2 text-sm transition-colors duration-200 ${selected ? "text-bone" : "text-bone-dim hover:text-bone-muted"}`}
              >
                {selected && (
                  <motion.span
                    layoutId="admin-tab"
                    className="absolute inset-0 rounded-[10px] bg-white/[0.07]"
                    transition={{ type: "spring", stiffness: 420, damping: 36 }}
                  />
                )}
                <Icon className={`relative h-4 w-4 ${selected ? "text-brand-light" : ""}`} />
                <span className="relative">{label}</span>
              </button>
            )
          })}
        </div>

        <div id="admin-panel" role="tabpanel" aria-labelledby={`admin-tab-${tab}`} className="page-enter" key={tab}>
          {tab === "overview" && <OverviewTab />}
          {tab === "users" && <UsersTab />}
          {tab === "data" && <DataTab />}
          {tab === "feedback" && <FeedbackTab />}
        </div>
      </div>
    </div>
  )
}
