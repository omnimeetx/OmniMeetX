"use client"

import { useRef } from "react"
import { gsap } from "@/lib/motion"
import { useMotionGsap } from "@/hooks/useMotionGsap"

interface NumberTickerProps {
  value: number
  prefix?: string
  suffix?: string
  className?: string
}

/** Renders the real number on the server, then counts up to it when scrolled into view. */
export default function NumberTicker({ value, prefix = "", suffix = "", className }: NumberTickerProps) {
  const ref = useRef<HTMLSpanElement>(null)
  const format = (n: number) => `${prefix}${Math.round(n).toLocaleString("en-US")}${suffix}`

  useMotionGsap(
    () => {
      if (!ref.current) return
      const el = ref.current
      const counter = { n: 0 }
      gsap.fromTo(
        counter,
        { n: 0 },
        {
          n: value,
          duration: 1.6,
          ease: "power3.out",
          onUpdate: () => {
            el.textContent = format(counter.n)
          },
          scrollTrigger: { trigger: el, start: "top 92%", once: true },
        },
      )
      return () => {
        el.textContent = format(value)
      }
    },
    { scope: ref, dependencies: [value] },
  )

  return (
    <span ref={ref} className={`tabular-nums ${className ?? ""}`}>
      {format(value)}
    </span>
  )
}
