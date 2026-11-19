import { API_URL } from "@/lib/config"
import { authService } from "@/lib/auth"

let pending: Promise<void> | null = null

/**
 * Swap a Clerk (Google) session for an OmniMeetX token.
 *
 * After Google, Clerk has a session but our own token doesn't exist yet. Every
 * caller that needs the token (the app gate, the background sync) shares this
 * one request, so the backend is asked once and nobody acts on a half-finished
 * sign-in. Throws with a message to show when the backend refuses.
 */
export function exchangeClerkSession(getToken: () => Promise<string | null>): Promise<void> {
  if (authService.isAuthenticated()) return Promise.resolve()
  if (!pending) {
    pending = (async () => {
      try {
        // The backend verifies this signed Clerk session and reads the email from
        // Clerk itself; a self-reported email would let anyone log in as anyone.
        const clerkToken = await getToken()
        if (!clerkToken) throw new Error("Your Google session has ended. Please sign in again.")
        const res = await fetch(`${API_URL}/api/auth/clerk-sync`, {
          method: "POST",
          headers: { Authorization: `Bearer ${clerkToken}` },
        })
        const data = await res.json().catch(() => ({}))
        if (!res.ok || !data.access_token) {
          throw new Error(data.error || "Google sign-in could not be completed")
        }
        authService.setToken(data.access_token)
        if (data.user) authService.setUser(data.user)
        // Let the sidebar and nav pick up the new account straight away.
        window.dispatchEvent(new Event("storage"))
        window.dispatchEvent(new CustomEvent("auth-changed", { detail: data.user }))
      } finally {
        pending = null
      }
    })()
  }
  return pending
}
