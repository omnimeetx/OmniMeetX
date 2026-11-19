import type { ReactNode } from "react"
import PageEnter from "@/components/motion/PageEnter"

export default function MarketingTemplate({ children }: { children: ReactNode }) {
  return <PageEnter>{children}</PageEnter>
}
