import type { Metadata } from "next"
import type { ReactNode } from "react"
import { BRAND } from "@/lib/brand"

export const metadata: Metadata = {
  title: "Terms of Service",
  description: `The terms for using ${BRAND.name}, including subscriptions, refunds and payments through Paddle, our Merchant of Record.`,
  alternates: { canonical: "/terms" },
}

export default function TermsLayout({ children }: { children: ReactNode }) {
  return children
}
