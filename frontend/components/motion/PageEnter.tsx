import type { ReactNode } from "react"

/** Used by route templates so each new page fades in while shared layouts stay put. */
export default function PageEnter({ children }: { children: ReactNode }) {
  return <div className="page-enter">{children}</div>
}
