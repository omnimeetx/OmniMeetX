"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { Bug, Lightbulb, Loader2, MessageSquare, MessageSquarePlus } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { authService } from "@/lib/auth"
import { API_URL } from "@/lib/config"

const KINDS = [
  { id: "bug", label: "Something's broken", icon: Bug },
  { id: "idea", label: "I have an idea", icon: Lightbulb },
  { id: "other", label: "Other", icon: MessageSquare },
] as const

// Pages where a floating button would be in the way.
const HIDDEN_ON = ["/friends", "/login", "/signup", "/otp", "/forgot-password", "/reset-password", "/reset-pin", "/sso-callback"]

/** Floating "Feedback" button: bug reports and ideas go straight to the team's inbox. */
export default function FeedbackButton() {
  const pathname = usePathname() || "/"
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const [open, setOpen] = useState(false)
  const [kind, setKind] = useState<(typeof KINDS)[number]["id"]>("idea")
  const [message, setMessage] = useState("")
  const [sending, setSending] = useState(false)

  useEffect(() => {
    const check = () => setIsLoggedIn(authService.isAuthenticated())
    check()
    window.addEventListener("storage", check)
    window.addEventListener("auth-changed", check)
    return () => {
      window.removeEventListener("storage", check)
      window.removeEventListener("auth-changed", check)
    }
  }, [])

  const hidden = !isLoggedIn || pathname.startsWith("/meeting/") || HIDDEN_ON.some((p) => pathname.startsWith(p))
  if (hidden) return null

  const submit = async () => {
    if (message.trim().length < 3) {
      toast.error("Please write a few words first.")
      return
    }
    setSending(true)
    try {
      const res = await fetch(`${API_URL}/api/feedback`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${authService.getToken()}` },
        body: JSON.stringify({ kind, message: message.trim(), page_url: pathname }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      toast.success("Thank you! We read every message.")
      setMessage("")
      setOpen(false)
    } catch (err) {
      toast.error((err as Error).message || "Couldn't send feedback. Please try again.")
    } finally {
      setSending(false)
    }
  }

  return (
    <>
      <button
        type="button"
        data-testid="feedback-button"
        aria-label="Send feedback"
        onClick={() => setOpen(true)}
        className="btn btn-ghost fixed bottom-5 right-5 z-40 !rounded-full !bg-panel-2 !px-4 !py-2.5 text-sm"
      >
        <MessageSquarePlus className="h-4 w-4" />
        <span className="hidden sm:inline">Feedback</span>
      </button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="glass-card border-line bg-panel/95 text-white sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="font-body tracking-normal text-lg">Help us improve OmniMeetX</DialogTitle>
            <DialogDescription className="text-white/60">
              Report a problem or tell us what you'd like next. It goes straight to the founders.
            </DialogDescription>
          </DialogHeader>

          <div className="grid grid-cols-3 gap-2">
            {KINDS.map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                type="button"
                onClick={() => setKind(id)}
                className={`flex flex-col items-center gap-1.5 rounded-xl border px-2 py-3 text-xs transition-all ${
                  kind === id
                    ? "border-primary/60 bg-primary/20 text-white"
                    : "border-line bg-white/5 text-white/60 hover:bg-white/10"
                }`}
              >
                <Icon className="h-4 w-4" />
                {label}
              </button>
            ))}
          </div>

          <Textarea
            data-testid="feedback-message"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            maxLength={5000}
            rows={5}
            placeholder={kind === "bug" ? "What happened, and what did you expect?" : "Tell us what would make OmniMeetX more useful..."}
            className="glass min-h-28 resize-none"
          />

          <div className="flex items-center justify-between gap-3">
            <Link href="/feedback" onClick={() => setOpen(false)} className="text-xs text-primary hover:text-accent">
              See & vote on feature ideas →
            </Link>
            <Button
              data-testid="feedback-send"
              onClick={submit}
              disabled={sending}
              className="btn-primary"
            >
              {sending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Send
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
