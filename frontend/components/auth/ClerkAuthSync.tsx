"use client"

import { useEffect } from "react"
import { useAuth } from "@clerk/nextjs"
import { toast } from "sonner"
import { authService } from "@/lib/auth"
import { exchangeClerkSession } from "@/lib/clerkSession"

/**
 * Background half of Google sign-in: whenever Clerk has a session and we have no
 * token yet, swap it for one. Signed-in pages wait for the same request through
 * AppAuthGate, so the two never race.
 */
export default function ClerkAuthSync() {
  const { isLoaded, isSignedIn, getToken } = useAuth()

  useEffect(() => {
    if (!isLoaded || !isSignedIn || authService.isAuthenticated()) return
    exchangeClerkSession(getToken).catch((err: Error) => {
      toast.error(err.message, { id: "google-sign-in" })
    })
  }, [isLoaded, isSignedIn, getToken])

  return null
}
