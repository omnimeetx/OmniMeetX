"use client"

import { useRef, type ReactNode } from "react"
import { gsap, ScrollTrigger } from "@/lib/motion"
import { useMotionGsap } from "@/hooks/useMotionGsap"

/** Endless band that speeds up with scrolling and follows the scroll direction. */
export default function VelocityMarquee({ children, speed = 38, className }: { children: ReactNode; speed?: number; className?: string }) {
  const root = useRef<HTMLDivElement>(null)
  const track = useRef<HTMLDivElement>(null)

  useMotionGsap(
    () => {
      if (!track.current || !root.current) return
      const el = track.current
      let x = 0
      let direction = -1
      let boost = 0
      let visible = false

      const trigger = ScrollTrigger.create({
        trigger: root.current,
        start: "top bottom",
        end: "bottom top",
        onToggle: (self) => {
          visible = self.isActive
        },
        onUpdate: (self) => {
          boost = Math.min(Math.abs(self.getVelocity()) / 160, 9)
          if (self.direction) direction = self.direction > 0 ? -1 : 1
        },
      })
      visible = trigger.isActive

      const setX = gsap.quickSetter(el, "x", "px")
      const tick = (_time: number, deltaMs: number) => {
        boost *= 0.94
        if (!visible) return
        const half = el.scrollWidth / 2
        if (!half) return
        x += direction * speed * (1 + boost) * (deltaMs / 1000)
        if (x <= -half) x += half
        if (x > 0) x -= half
        setX(x)
      }
      gsap.ticker.add(tick)
      return () => {
        gsap.ticker.remove(tick)
        trigger.kill()
      }
    },
    { scope: root, dependencies: [speed] },
  )

  return (
    <div ref={root} className={`overflow-hidden ${className ?? ""}`}>
      <div ref={track} className="flex w-max items-center will-change-transform">
        <div className="flex shrink-0 items-center">{children}</div>
        <div className="flex shrink-0 items-center" aria-hidden="true">
          {children}
        </div>
      </div>
    </div>
  )
}
