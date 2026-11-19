import type { Metadata } from "next"
import type { ReactNode } from "react"
import { BRAND } from "@/lib/brand"

// The page itself is interactive (client component), so its title and description live here.
export const metadata: Metadata = {
  title: "Pricing",
  description: `Start free with 60 minutes a month. ${BRAND.name} Pro is $12 a month for 1,200 minutes of transcripts, summaries and action items. Refunds within 14 days.`,
  alternates: { canonical: "/pricing" },
}

export default function PricingLayout({ children }: { children: ReactNode }) {
  return children
}
