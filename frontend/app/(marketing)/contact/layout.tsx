import type { Metadata } from "next"
import type { ReactNode } from "react"
import { BRAND } from "@/lib/brand"

export const metadata: Metadata = {
  title: "Contact",
  description: `Questions about ${BRAND.name}, help with your account or a plan with more minutes: send us a message.`,
  alternates: { canonical: "/contact" },
}

export default function ContactLayout({ children }: { children: ReactNode }) {
  return children
}
