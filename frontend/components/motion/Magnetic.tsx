"use client"

import { useRef, type ReactNode } from "react"
import { gsap } from "@/lib/motion"
import { useMotionGsap } from "@/hooks/useMotionGsap"

/** Pulls its child gently toward the cursor. Mouse only, never on touch. */
export default function Magnetic({ children, strength = 0.28, className }: { children: ReactNode; strength?: number; className?: string }) {
  const ref = useRef<HTMLSpanElement>(null)

  useMotionGsap(
    ({ finePointer }) => {
      if (!ref.current || !finePointer) return
      const el = ref.current
      const xTo = gsap.quickTo(el, "x", { duration: 0.55, ease: "power3.out" })
      const yTo = gsap.quickTo(el, "y", { duration: 0.55, ease: "power3.out" })

      const move = (event: PointerEvent) => {
        const rect = el.getBoundingClientRect()
        xTo((event.clientX - rect.left - rect.width / 2) * strength)
        yTo((event.clientY - rect.top - rect.height / 2) * strength)
      }
      const leave = () => {
        xTo(0)
        yTo(0)
      }
      el.addEventListener("pointermove", move)
      el.addEventListener("pointerleave", leave)
      return () => {
        el.removeEventListener("pointermove", move)
        el.removeEventListener("pointerleave", leave)
      }
    },
    { scope: ref, dependencies: [strength] },
  )

  return (
    <span ref={ref} className={`inline-block ${className ?? ""}`}>
      {children}
    </span>
  )
}
