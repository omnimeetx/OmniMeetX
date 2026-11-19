"use client"

import { useRef, type ElementType, type ReactNode } from "react"
import { gsap } from "@/lib/motion"
import { useMotionGsap } from "@/hooks/useMotionGsap"

interface RevealProps {
  children: ReactNode
  as?: ElementType
  className?: string
  stagger?: number
  delay?: number
  id?: string
}

/** Direct children rise 28px and fade in, one after another, when the block scrolls into view. */
export default function Reveal({ children, as: Tag = "div", className, stagger = 0.08, delay = 0, id }: RevealProps) {
  const ref = useRef<HTMLElement>(null)

  useMotionGsap(
    () => {
      if (!ref.current) return
      gsap.fromTo(
        Array.from(ref.current.children),
        { y: 28, autoAlpha: 0 },
        {
          y: 0,
          autoAlpha: 1,
          duration: 0.9,
          ease: "power3.out",
          stagger,
          delay,
          clearProps: "transform",
          scrollTrigger: { trigger: ref.current, start: "top 88%", once: true },
        },
      )
    },
    { scope: ref },
  )

  return (
    <Tag ref={ref} id={id} data-reveal className={className}>
      {children}
    </Tag>
  )
}
