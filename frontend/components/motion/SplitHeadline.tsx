"use client"

import { useRef, type ElementType, type ReactNode } from "react"
import { gsap, SplitText } from "@/lib/motion"
import { useMotionGsap } from "@/hooks/useMotionGsap"

interface SplitHeadlineProps {
  children: ReactNode
  as?: ElementType
  className?: string
  /** "load" plays when `ready` turns true, "scroll" plays when the headline enters the viewport. */
  play?: "load" | "scroll"
  ready?: boolean
  delay?: number
  id?: string
}

/** Headline lines slide up from behind a mask. Re-splits itself when fonts load or the width changes. */
export default function SplitHeadline({ children, as: Tag = "h2", className, play = "scroll", ready = true, delay = 0, id }: SplitHeadlineProps) {
  const ref = useRef<HTMLElement>(null)

  useMotionGsap(
    () => {
      if (!ref.current || !ready) return
      const el = ref.current
      SplitText.create(el, {
        type: "lines",
        mask: "lines",
        linesClass: "split-line",
        autoSplit: true,
        onSplit(self) {
          return gsap.fromTo(
            self.lines,
            { yPercent: 112 },
            {
              yPercent: 0,
              duration: 1.1,
              ease: "power4.out",
              stagger: 0.09,
              delay,
              scrollTrigger: play === "scroll" ? { trigger: el, start: "top 88%", once: true } : undefined,
            },
          )
        },
      })
    },
    { scope: ref, dependencies: [ready] },
  )

  return (
    <Tag ref={ref} id={id} data-intro className={className}>
      {children}
    </Tag>
  )
}
