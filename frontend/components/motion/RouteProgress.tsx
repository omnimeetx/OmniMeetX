"use client"

import { useEffect, useRef } from "react"
import { usePathname, useSearchParams } from "next/navigation"
import { gsap } from "@/lib/motion"

/** Thin top bar: starts when an internal link is clicked, finishes when the route changes. */
export default function RouteProgress() {
  const pathname = usePathname()
  const search = useSearchParams()
  const bar = useRef<HTMLDivElement>(null)
  const running = useRef(false)
  const timeout = useRef<ReturnType<typeof setTimeout>>()

  const finish = () => {
    if (!running.current || !bar.current) return
    running.current = false
    clearTimeout(timeout.current)
    gsap.killTweensOf(bar.current)
    gsap.to(bar.current, {
      scaleX: 1,
      duration: 0.22,
      ease: "power2.out",
      onComplete: () => {
        gsap.to(bar.current, { autoAlpha: 0, duration: 0.25 })
      },
    })
  }

  useEffect(() => {
    finish()
  }, [pathname, search])

  useEffect(() => {
    const onClick = (event: MouseEvent) => {
      if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return
      const anchor = (event.target as Element | null)?.closest?.("a")
      if (!anchor || !anchor.href || anchor.target === "_blank" || anchor.hasAttribute("download")) return
      const url = new URL(anchor.href, window.location.href)
      if (url.origin !== window.location.origin) return
      if (url.pathname === window.location.pathname && url.search === window.location.search) return
      if (!bar.current) return

      running.current = true
      gsap.killTweensOf(bar.current)
      gsap.set(bar.current, { autoAlpha: 1, scaleX: 0 })
      gsap.to(bar.current, { scaleX: 0.82, duration: 1.4, ease: "power3.out" })
      clearTimeout(timeout.current)
      timeout.current = setTimeout(finish, 8000)
    }
    // Capture phase: next/link calls preventDefault on the same click, and we must see it first.
    document.addEventListener("click", onClick, true)
    return () => {
      document.removeEventListener("click", onClick, true)
      clearTimeout(timeout.current)
    }
  }, [])

  return <div ref={bar} aria-hidden="true" className="route-progress" style={{ opacity: 0, visibility: "hidden", transform: "scaleX(0)" }} />
}
