import type { Metadata } from "next"
import type { ReactNode } from "react"
import AppShell from "@/components/app/AppShell"
import AppAuthGate from "@/components/auth/AppAuthGate"

// Signed-in pages are private: keep them out of search results.
export const metadata: Metadata = { robots: { index: false, follow: false } }

export default function AppLayout({ children }: { children: ReactNode }) {
  return (
    <AppShell>
      <AppAuthGate>{children}</AppAuthGate>
    </AppShell>
  )
}
