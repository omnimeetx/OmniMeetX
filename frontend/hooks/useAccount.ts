"use client"

import { useCallback, useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { useClerk, useUser } from "@clerk/nextjs"
import { authService, type User } from "@/lib/auth"
import { API_URL } from "@/lib/config"

export interface MinutesInfo {
  remaining: number
  total: number
  plan: string
  planName: string
}

// Several parts of the page use this hook at once; they share one request per reload.
let shared: { key: string; promise: Promise<any> } | null = null
function loadBillingStatus(token: string, tick: number) {
  const key = `${token}:${tick}`
  if (!shared || shared.key !== key) {
    shared = {
      key,
      promise: fetch(`${API_URL}/api/billing/status`, { headers: { Authorization: `Bearer ${token}` } })
        .then((res) => (res.ok ? res.json() : null))
        .catch(() => null),
    }
  }
  return shared.promise
}

/** Who is signed in and how many minutes they have left, for the nav and the sidebar. */
export function useAccount() {
  const router = useRouter()
  const { user: clerkUser, isSignedIn: isClerkSignedIn } = useUser()
  const { signOut } = useClerk()
  const [user, setUser] = useState<User | null>(null)
  const [hasSession, setHasSession] = useState(false)
  const [isAdmin, setIsAdmin] = useState(false)
  const [minutes, setMinutes] = useState<MinutesInfo | null>(null)

  useEffect(() => {
    const check = () => {
      setUser(authService.getCurrentUser())
      setHasSession(authService.isAuthenticated())
      setIsAdmin(authService.isAdmin())
    }
    check()
    window.addEventListener("storage", check)
    window.addEventListener("auth-changed", check)
    return () => {
      window.removeEventListener("storage", check)
      window.removeEventListener("auth-changed", check)
    }
  }, [])

  const isLoggedIn = hasSession || Boolean(isClerkSignedIn)

  // Reload only the minutes when something may have changed them, or when the tab comes back into view.
  const [minutesTick, setMinutesTick] = useState(0)
  useEffect(() => {
    const reload = () => setMinutesTick((n) => n + 1)
    const onVisible = () => {
      if (document.visibilityState === "visible") reload()
    }
    window.addEventListener("credits-changed", reload)
    document.addEventListener("visibilitychange", onVisible)
    return () => {
      window.removeEventListener("credits-changed", reload)
      document.removeEventListener("visibilitychange", onVisible)
    }
  }, [])

  // Keyed on our own token, not on "logged in": straight after Google, Clerk counts as
  // signed in before our token exists, and the meter used to give up and never retry.
  useEffect(() => {
    const token = hasSession ? authService.getToken() : null
    if (!token) {
      setMinutes(null)
      return
    }
    let cancelled = false
    loadBillingStatus(token, minutesTick)
      .then((data) => {
        if (data && !cancelled) {
          setMinutes({
            remaining: data.credits_remaining,
            total: data.credits_total,
            plan: data.plan,
            planName: data.plan_name || data.plan,
          })
        }
      })
      .catch(() => {})
    return () => {
      cancelled = true
    }
  }, [hasSession, user?.id, minutesTick])

  const displayName =
    user?.full_name?.trim() ||
    clerkUser?.fullName?.trim() ||
    user?.email?.split("@")[0] ||
    clerkUser?.primaryEmailAddress?.emailAddress?.split("@")[0] ||
    "You"

  const email = user?.email || clerkUser?.primaryEmailAddress?.emailAddress || ""

  const initials =
    displayName
      .split(" ")
      .filter(Boolean)
      .map((word) => word[0])
      .join("")
      .slice(0, 2)
      .toUpperCase() || "U"

  const logout = useCallback(async () => {
    authService.logout()
    if (isClerkSignedIn) {
      try {
        await signOut()
      } catch (err) {
        console.error("Clerk sign out error:", err)
      }
    }
    setUser(null)
    setHasSession(false)
    window.dispatchEvent(new Event("storage"))
    window.dispatchEvent(new CustomEvent("auth-changed", { detail: null }))
    router.push("/")
  }, [isClerkSignedIn, router, signOut])

  return {
    isLoggedIn,
    isAdmin,
    displayName,
    email,
    initials,
    imageUrl: clerkUser?.imageUrl,
    minutes,
    logout,
  }
}
