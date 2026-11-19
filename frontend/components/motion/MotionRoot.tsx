"use client"

import { useEffect, useLayoutEffect, type ReactNode } from "react"
import { MotionConfig } from "framer-motion"
import { applyMotionAttribute, useMotionEnabled, useMotionPref } from "@/lib/motion"

const useIsoLayoutEffect = typeof window === "undefined" ? useEffect : useLayoutEffect

/**
 * Sits at the top of the app. Keeps html[data-motion] current, releases
 * elements hidden while waiting for GSAP, and runs one set of pointer listeners
 * for the whole app: the card spotlight and the button fill origin.
 */
export default function MotionRoot({ children }: { children: ReactNode }) {
  const enabled = useMotionEnabled()
  const pref = useMotionPref()

  // Parent layout effects run after children's, so GSAP has already set its start states.
  useIsoLayoutEffect(() => {
    document.documentElement.dataset.motionReady = "true"
  }, [])

  useEffect(() => {
    applyMotionAttribute()
  }, [enabled, pref])

  useEffect(() => {
    let frame = 0
    let pending: { el: HTMLElement; x: number; y: number } | null = null

    const flush = () => {
      frame = 0
      if (!pending) return
      pending.el.style.setProperty("--mx", `${pending.x}px`)
      pending.el.style.setProperty("--my", `${pending.y}px`)
      pending = null
    }

    const onMove = (event: PointerEvent) => {
      const target = event.target as Element | null
      const card = target?.closest?.<HTMLElement>(".glass-card, .spot-card")
      if (!card) return
      const rect = card.getBoundingClientRect()
      pending = { el: card, x: event.clientX - rect.left, y: event.clientY - rect.top }
      if (!frame) frame = requestAnimationFrame(flush)
    }

    const onOver = (event: PointerEvent) => {
      const target = event.target as Element | null
      const button = target?.closest?.<HTMLElement>('[data-slot="button"], .btn')
      if (!button) return
      const related = event.relatedTarget as Node | null
      if (related && button.contains(related)) return
      const rect = button.getBoundingClientRect()
      button.style.setProperty("--fx", `${event.clientX - rect.left}px`)
      button.style.setProperty("--fy", `${event.clientY - rect.top}px`)
    }

    document.addEventListener("pointermove", onMove, { passive: true })
    document.addEventListener("pointerover", onOver, { passive: true })
    return () => {
      document.removeEventListener("pointermove", onMove)
      document.removeEventListener("pointerover", onOver)
      if (frame) cancelAnimationFrame(frame)
    }
  }, [])

  return <MotionConfig reducedMotion={enabled ? "never" : "always"}>{children}</MotionConfig>
}
