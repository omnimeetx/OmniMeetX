"use client"

import { useEffect, type ReactNode } from "react"
import { usePathname } from "next/navigation"
import { ReactLenis, useLenis } from "lenis/react"
import { gsap, ScrollTrigger, useMotionEnabled } from "@/lib/motion"

// App screens scroll natively: smooth inertia suits the marketing pages but makes a dashboard feel slow.
const NATIVE_SCROLL = ["/meeting", "/dashboard", "/upload", "/history", "/favorite", "/feedback", "/profile", "/processing", "/admin", "/users", "/meeting-notes"]
const nativeScrollHere = () => NATIVE_SCROLL.some((p) => window.location.pathname.startsWith(p))

/** One animation loop: GSAP's ticker drives Lenis, and Lenis tells ScrollTrigger when it moved. */
function LenisBridge() {
  const lenis = useLenis()
  const pathname = usePathname()

  useEffect(() => {
    if (!lenis) return
    const tick = (time: number) => lenis.raf(time * 1000)
    const onScroll = () => ScrollTrigger.update()
    gsap.ticker.add(tick)
    gsap.ticker.lagSmoothing(0)
    lenis.on("scroll", onScroll)
    return () => {
      gsap.ticker.remove(tick)
      lenis.off("scroll", onScroll)
    }
  }, [lenis])

  useEffect(() => {
    if (!lenis || window.location.hash) return
    lenis.scrollTo(0, { immediate: true, force: true })
  }, [lenis, pathname])

  return null
}

export default function SmoothScroll({ children }: { children: ReactNode }) {
  const enabled = useMotionEnabled()

  return (
    <ReactLenis
      root
      options={{
        autoRaf: false,
        lerp: 0.11,
        smoothWheel: enabled,
        anchors: true,
        allowNestedScroll: true,
        stopInertiaOnNavigate: true,
        // App screens (and the meeting room) keep native scrolling.
        prevent: nativeScrollHere,
      }}
    >
      <LenisBridge />
      {children}
    </ReactLenis>
  )
}
