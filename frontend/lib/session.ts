import { API_URL } from "@/lib/config"
import { authService } from "@/lib/auth"

// Renew at most twice a day while the app is in use. The token itself lasts 7 days,
// so someone who doesn't open the app for 7 days is signed out.
const RENEW_AFTER_MS = 12 * 60 * 60 * 1000

function payloadOf(token: string): { exp?: number; iat?: number } | null {
  try {
    const part = token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/")
    return JSON.parse(atob(part.padEnd(part.length + ((4 - (part.length % 4)) % 4), "=")))
  } catch {
    return null
  }
}

/** True when we hold a token that is past its expiry (as opposed to having none). */
export function sessionExpired(): boolean {
  const token = authService.getToken()
  const exp = token ? payloadOf(token)?.exp : undefined
  return Boolean(exp && exp * 1000 <= Date.now())
}

let renewing = false

/** Swap the token for a fresh 7-day one if it is more than 12 hours old. */
export async function keepSessionFresh(): Promise<void> {
  const token = authService.getToken()
  if (!token || renewing || sessionExpired()) return
  const issuedAt = (payloadOf(token)?.iat ?? 0) * 1000
  if (Date.now() - issuedAt < RENEW_AFTER_MS) return
  renewing = true
  try {
    const res = await fetch(`${API_URL}/api/auth/refresh`, { method: "POST", headers: { Authorization: `Bearer ${token}` } })
    if (res.ok) {
      const data = await res.json()
      if (data.access_token) authService.setToken(data.access_token)
    }
  } catch {
    // Offline: try again on the next check.
  } finally {
    renewing = false
  }
}
