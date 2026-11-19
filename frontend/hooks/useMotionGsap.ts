"use client"

import type { RefObject } from "react"
import { gsap, motionQuery, useGSAP, useMotionPref } from "@/lib/motion"

interface MotionConditions {
  desktop: boolean
  finePointer: boolean
}

/**
 * useGSAP gated by the motion preference. `setup` only runs when motion is
 * allowed, re-runs when a condition changes, and everything it creates is
 * reverted on cleanup, so elements fall back to their real, visible state.
 */
export function useMotionGsap(
  setup: (conditions: MotionConditions) => void | (() => void),
  { scope, dependencies = [] }: { scope?: RefObject<Element>; dependencies?: unknown[] } = {},
) {
  const pref = useMotionPref()

  useGSAP(
    () => {
      const mm = gsap.matchMedia()
      mm.add(
        {
          motion: motionQuery(pref),
          desktop: "(min-width: 1024px)",
          finePointer: "(hover: hover) and (pointer: fine)",
        },
        (context) => {
          const { motion, desktop, finePointer } = context.conditions as Record<string, boolean>
          if (!motion) return
          return setup({ desktop, finePointer })
        },
        scope?.current ?? undefined,
      )
      return () => mm.revert()
    },
    { scope, dependencies: [pref, ...dependencies], revertOnUpdate: true },
  )
}
