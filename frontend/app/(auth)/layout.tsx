import type { Metadata } from "next"
import type { ReactNode } from "react"
import AuthShell from "@/components/auth/AuthShell"

// Login and sign-up forms don't belong in search results; the home page does that job.
export const metadata: Metadata = { robots: { index: false, follow: true } }

export default function AuthLayout({ children }: { children: ReactNode }) {
  return <AuthShell>{children}</AuthShell>
}
