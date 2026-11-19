"use client"

import { useEffect, useState, type ReactNode } from "react"
import { useRouter } from "next/navigation"
import { useClerk } from "@clerk/nextjs"
import { toast } from "sonner"
import { authService } from "@/lib/auth"
import { exchangeClerkSession } from "@/lib/clerkSession"
import { keepSessionFresh, sessionExpired } from "@/lib/session"

// If Clerk can't load (offline, blocked script), don't leave someone on a spinner.
const CLERK_WAIT_MS = 8000
const CHECK_EVERY_MS = 120

/**
 * Every signed-in page sits behind this gate, so no page runs its own
 * "no token, go to login" check before sign-in has finished.
 *
 * - Our token exists: show the page immediately.
 * - Only a Clerk (Google) session exists, e.g. straight after Google: swap it
 *   for our token first, then show the page. This is what used to bounce
 *   between /dashboard and /login until a refresh.
 * - Neither: go to login.
 *
 * It asks the Clerk browser script directly. The React hooks start with a
 * server-rendered "loaded, signed out" state before that script has read the
 * session, and trusting it sent people to /login for a moment.
 */
export default function AppAuthGate({ children }: { children: ReactNode }) {
  const router = useRouter()
  const clerk = useClerk()
  const [ready, setReady] = useState(false)

  // Renew the session while the app is in use; 7 days without use and it ends.
  useEffect(() => {
    if (!ready) return
    keepSessionFresh()
    const timer = setInterval(keepSessionFresh, 30 * 60 * 1000)
    const onVisible = () => document.visibilityState === "visible" && keepSessionFresh()
    document.addEventListener("visibilitychange", onVisible)
    return () => {
      clearInterval(timer)
      document.removeEventListener("visibilitychange", onVisible)
    }
  }, [ready])

  useEffect(() => {
    // 7 days without activity: end both sessions, or Clerk would quietly sign them back in.
    if (sessionExpired()) {
      authService.logout()
      toast.info("You were signed out after 7 days away. Please log in again.", { id: "session-expired" })
      let stop = false
      ;(async () => {
        // Wait for Clerk's script, or the sign-out is a no-op and the login page sends them straight back.
        const started = Date.now()
        while (!clerk.loaded && Date.now() - started < CLERK_WAIT_MS && !stop) {
          await new Promise((resolve) => setTimeout(resolve, CHECK_EVERY_MS))
        }
        if (clerk.session) await clerk.signOut().catch(() => {})
        if (!stop) router.replace("/login")
      })()
      return () => {
        stop = true
      }
    }
    if (authService.isAuthenticated()) {
      setReady(true)
      return
    }

    let cancelled = false
    let settled = false

    const settle = (): boolean => {
      if (settled || cancelled) return true
      if (authService.isAuthenticated()) {
        settled = true
        setReady(true)
        return true
      }
      if (!clerk.loaded) return false // the browser script hasn't read the session yet
      settled = true
      const session = clerk.session
      if (!session) {
        router.replace("/login")
        return true
      }
      exchangeClerkSession(() => session.getToken())
        .then(() => {
          if (!cancelled) setReady(true)
        })
        .catch(async (err: Error) => {
          if (cancelled) return
          toast.error(err.message, { id: "google-sign-in" })
          // End the Clerk session too, or the login page would send them straight back here.
          await clerk.signOut().catch(() => {})
          router.replace("/login")
        })
      return true
    }

    if (settle()) {
      return () => {
        cancelled = true
      }
    }

    const started = Date.now()
    const timer = setInterval(() => {
      if (settle()) {
        clearInterval(timer)
      } else if (Date.now() - started > CLERK_WAIT_MS) {
        clearInterval(timer)
        settled = true
        if (!cancelled) router.replace("/login")
      }
    }, CHECK_EVERY_MS)

    return () => {
      cancelled = true
      clearInterval(timer)
    }
  }, [clerk, router])

  if (!ready) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center" role="status" aria-live="polite" data-testid="auth-gate">
        <div className="flex flex-col items-center gap-4 text-center">
          <span className="h-9 w-9 animate-spin rounded-full border-2 border-line-strong border-t-brand" aria-hidden="true" />
          <p className="text-sm text-bone-muted">Signing you in…</p>
        </div>
      </div>
    )
  }

  return <>{children}</>
}
