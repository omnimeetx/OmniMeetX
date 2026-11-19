import type { Metadata } from "next"
import type { ReactNode } from "react"
import { BRAND } from "@/lib/brand"

export const metadata: Metadata = {
  title: "Privacy Policy",
  description: `What ${BRAND.name} collects, why, who processes it, how long it is kept and how to delete your recordings and transcripts.`,
  alternates: { canonical: "/privacy" },
}

export default function PrivacyLayout({ children }: { children: ReactNode }) {
  return children
}
