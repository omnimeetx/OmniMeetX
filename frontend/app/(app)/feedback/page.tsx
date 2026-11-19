"use client"

import { useCallback, useEffect, useState } from "react"
import { motion } from "framer-motion"
import { ChevronUp, Lightbulb, Loader2, Trash2 } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { authService } from "@/lib/auth"
import { API_URL } from "@/lib/config"

interface FeatureRequest {
  id: number
  title: string
  description: string
  status: string
  votes: number
  has_voted: boolean
  is_mine: boolean
  author: string
  created_at: string | null
}

const STATUS_STYLES: Record<string, { label: string; className: string }> = {
  open: { label: "Under review", className: "bg-white/10 text-white/70 border-white/15" },
  planned: { label: "Planned", className: "bg-sky-500/15 text-sky-300 border-sky-400/30" },
  in_progress: { label: "In progress", className: "bg-amber-500/15 text-amber-300 border-amber-400/30" },
  done: { label: "Shipped", className: "bg-emerald-500/15 text-emerald-300 border-emerald-400/30" },
  declined: { label: "Not planned", className: "bg-red-500/10 text-red-300/80 border-red-400/20" },
}

const FILTERS = [
  { id: "top", label: "Most wanted" },
  { id: "new", label: "Newest" },
  { id: "planned", label: "Planned" },
  { id: "done", label: "Shipped" },
]

const authHeaders = () => ({ "Content-Type": "application/json", Authorization: `Bearer ${authService.getToken()}` })

export default function FeatureRequestsPage() {
  const [requests, setRequests] = useState<FeatureRequest[]>([])
  const [isAdmin, setIsAdmin] = useState(false)
  const [filter, setFilter] = useState("top")
  const [loading, setLoading] = useState(true)
  const [title, setTitle] = useState("")
  const [description, setDescription] = useState("")
  const [submitting, setSubmitting] = useState(false)

  const load = useCallback(async () => {
    const params = filter === "top" || filter === "new" ? `sort=${filter}` : `sort=top&status=${filter}`
    try {
      const res = await fetch(`${API_URL}/api/feature-requests?${params}`, { headers: authHeaders() })
      const data = await res.json()
      if (res.ok) {
        setRequests(data.requests)
        setIsAdmin(data.is_admin)
      }
    } catch {
      toast.error("Couldn't load feature requests.")
    } finally {
      setLoading(false)
    }
  }, [filter])

  useEffect(() => {
    load()
  }, [load])

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (title.trim().length < 5) {
      toast.error("Give your idea a short title (at least 5 characters).")
      return
    }
    setSubmitting(true)
    try {
      const res = await fetch(`${API_URL}/api/feature-requests`, {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify({ title: title.trim(), description: description.trim() }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      toast.success(data.duplicate ? "Someone already asked for this — we added your vote." : "Thanks! Your idea is on the board.")
      setTitle("")
      setDescription("")
      load()
    } catch (err) {
      toast.error((err as Error).message || "Couldn't post your idea.")
    } finally {
      setSubmitting(false)
    }
  }

  const vote = async (req: FeatureRequest) => {
    // Optimistic: flip immediately, reconcile with the server's count.
    setRequests((prev) => prev.map((r) => (r.id === req.id ? { ...r, has_voted: !r.has_voted, votes: r.votes + (r.has_voted ? -1 : 1) } : r)))
    try {
      const res = await fetch(`${API_URL}/api/feature-requests/${req.id}/vote`, { method: "POST", headers: authHeaders() })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setRequests((prev) => prev.map((r) => (r.id === req.id ? { ...r, has_voted: data.voted, votes: data.votes } : r)))
    } catch {
      toast.error("Couldn't save your vote.")
      load()
    }
  }

  const setStatus = async (req: FeatureRequest, status: string) => {
    const res = await fetch(`${API_URL}/api/feature-requests/${req.id}`, {
      method: "PATCH",
      headers: authHeaders(),
      body: JSON.stringify({ status }),
    })
    if (res.ok) {
      setRequests((prev) => prev.map((r) => (r.id === req.id ? { ...r, status } : r)))
    } else {
      toast.error("Couldn't update status.")
    }
  }

  const remove = async (req: FeatureRequest) => {
    if (!window.confirm(`Delete "${req.title}"?`)) return
    const res = await fetch(`${API_URL}/api/feature-requests/${req.id}`, { method: "DELETE", headers: authHeaders() })
    if (res.ok) setRequests((prev) => prev.filter((r) => r.id !== req.id))
  }

  return (
    <div className="min-h-screen bg-canvas">

      <main className="pt-8 lg:pt-10 pb-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-3xl mx-auto">
          <div className="text-center mb-12">
            <h1 className="text-4xl md:text-5xl font-extrabold gradient-text mb-4">Feature Requests</h1>
            <p className="text-white/60 max-w-xl mx-auto">
              Tell us what to build next and vote for the ideas you want most. The most-wanted features get built first.
            </p>
          </div>

          <Card className="glass-card border-primary/20 mb-10">
            <CardContent className="p-6">
              <form onSubmit={submit} className="space-y-3">
                <div className="flex items-center gap-2 text-white font-semibold">
                  <Lightbulb className="h-4 w-4 text-primary" /> Suggest a feature
                </div>
                <Input
                  data-testid="feature-title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  maxLength={120}
                  placeholder="e.g. Join my Zoom calls and take notes automatically"
                  className="glass"
                />
                <Textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  maxLength={2000}
                  rows={3}
                  placeholder="Why would this help you? (optional)"
                  className="glass resize-none"
                />
                <div className="flex justify-end">
                  <Button
                    data-testid="feature-submit"
                    type="submit"
                    disabled={submitting}
                    className="btn-primary"
                  >
                    {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Post idea
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>

          <div className="flex flex-wrap gap-2 mb-6">
            {FILTERS.map((f) => (
              <button
                key={f.id}
                type="button"
                onClick={() => setFilter(f.id)}
                className={`rounded-full border px-4 py-1.5 text-xs font-semibold transition-all ${
                  filter === f.id ? "border-primary/60 bg-primary/20 text-white" : "border-line bg-white/5 text-white/60 hover:bg-white/10"
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>

          {loading ? (
            <div className="flex justify-center py-16">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
          ) : requests.length === 0 ? (
            <p className="text-center text-white/50 py-16">No ideas here yet — be the first to suggest one.</p>
          ) : (
            <div className="space-y-3">
              {requests.map((req, i) => {
                const status = STATUS_STYLES[req.status] || STATUS_STYLES.open
                return (
                  <motion.div key={req.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: Math.min(i, 10) * 0.03 }}>
                    <Card className="glass-card border-line">
                      <CardContent className="p-4 flex gap-4">
                        <button
                          type="button"
                          data-testid={`vote-${req.id}`}
                          onClick={() => vote(req)}
                          aria-pressed={req.has_voted}
                          className={`flex h-16 w-14 shrink-0 flex-col items-center justify-center rounded-xl border transition-all ${
                            req.has_voted
                              ? "border-primary/60 bg-primary/20 text-white"
                              : "border-line bg-white/5 text-white/60 hover:border-primary/40 hover:text-white"
                          }`}
                        >
                          <ChevronUp className="h-5 w-5" />
                          <span className="text-sm font-bold">{req.votes}</span>
                        </button>
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-start justify-between gap-2">
                            <h3 className="font-body tracking-normal font-semibold text-white break-words">{req.title}</h3>
                            <span className={`shrink-0 rounded-full border px-2.5 py-0.5 text-[11px] font-semibold ${status.className}`}>
                              {status.label}
                            </span>
                          </div>
                          {req.description && <p className="mt-1 text-sm text-white/60 whitespace-pre-wrap break-words">{req.description}</p>}
                          <p className="mt-2 text-[11px] text-white/35">
                            {req.author ? `Suggested by ${req.author}` : "Suggested"}
                            {req.is_mine ? " (you)" : ""}
                            {req.created_at ? ` · ${new Date(req.created_at.endsWith("Z") ? req.created_at : req.created_at + "Z").toLocaleDateString()}` : ""}
                          </p>
                          {isAdmin && (
                            <div className="mt-3 flex items-center gap-2">
                              <select
                                value={req.status}
                                onChange={(e) => setStatus(req, e.target.value)}
                                className="rounded-md border border-white/15 bg-panel px-2 py-1 text-xs text-white"
                              >
                                {Object.entries(STATUS_STYLES).map(([id, s]) => (
                                  <option key={id} value={id}>{s.label}</option>
                                ))}
                              </select>
                              <button type="button" onClick={() => remove(req)} className="text-white/40 hover:text-red-400" aria-label="Delete">
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </div>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                )
              })}
            </div>
          )}
        </div>
      </main>

    </div>
  )
}
