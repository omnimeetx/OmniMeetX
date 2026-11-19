import type { ReactNode } from "react"
import PageEnter from "@/components/motion/PageEnter"

export default function AuthTemplate({ children }: { children: ReactNode }) {
  return <PageEnter>{children}</PageEnter>
}
