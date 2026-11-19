"use client"

import { createContext, useContext, useEffect, useLayoutEffect, useRef, useState, type ReactNode } from "react"
import { useLenis } from "lenis/react"
import { LogoMark } from "@/components/brand/Logo"
import { BRAND } from "@/lib/brand"
import { gsap, INTRO_STORAGE_KEY } from "@/lib/motion"

const useIsoLayoutEffect = typeof window === "undefined" ? useEffect : useLayoutEffect

const IntroContext = createContext({ done: false, finish: () => {} })

export const useIntro = () => useContext(IntroContext)

/** Holds smooth scrolling until the preloader is done, then lets the hero start. */
export function IntroProvider({ children }: { children: ReactNode }) {
  const [done, setDone] = useState(false)
  const lenis = useLenis()

  useEffect(() => {
    if (done) lenis?.start()
    else lenis?.stop()
  }, [done, lenis])

  return <IntroContext.Provider value={{ done, finish: () => setDone(true) }}>{children}</IntroContext.Provider>
}

/** Brand mark and animated dots. Shown once per visit, and never when animations are off. */
export function Preloader() {
  const { finish } = useIntro()
  const root = useRef<HTMLDivElement>(null)
  const [gone, setGone] = useState(false)

  useIsoLayoutEffect(() => {
    const html = document.documentElement
    if (html.dataset.skipIntro || html.dataset.motion === "off") {
      finish()
      setGone(true)
      return
    }

    const el = root.current
    if (!el) return
    const inner = el.querySelector("[data-preloader-inner]")
    html.style.overflow = "hidden"

    const ctx = gsap.context(() => {
      gsap.fromTo(inner, { autoAlpha: 0, y: 10 }, { autoAlpha: 1, y: 0, duration: 0.5, ease: "power3.out" })
    }, el)

    let cancelled = false
    const leave = () => {
      if (cancelled) return
      try {
        sessionStorage.setItem(INTRO_STORAGE_KEY, "true")
      } catch {
        // Private mode just means the preloader shows again next time.
      }
      finish()
      html.style.overflow = ""
      ctx.add(() => {
        gsap.fromTo(inner, { autoAlpha: 1, y: 0 }, { autoAlpha: 0, y: -8, duration: 0.3, ease: "power2.in" })
        gsap.fromTo(
          el,
          { autoAlpha: 1 },
          { autoAlpha: 0, duration: 0.55, delay: 0.15, ease: "power2.inOut", onComplete: () => setGone(true) },
        )
      })
    }

    // Long enough to register, never long enough to wait for. Fonts get a short chance to arrive.
    const minimum = new Promise((resolve) => setTimeout(resolve, 400))
    const fonts = Promise.race([document.fonts?.ready ?? Promise.resolve(), new Promise((resolve) => setTimeout(resolve, 1000))])
    Promise.all([minimum, fonts]).then(leave)

    return () => {
      cancelled = true
      html.style.overflow = ""
      ctx.revert()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  if (gone) return null

  return (
    <div ref={root} className="preloader" role="status" aria-label={`Loading ${BRAND.name}`}>
      <div data-preloader-inner className="flex flex-col items-center gap-5">
        <LogoMark size={44} />
        <span className="typing-dots text-bone-dim" aria-hidden="true">
          <span />
          <span />
          <span />
        </span>
      </div>
    </div>
  )
}
