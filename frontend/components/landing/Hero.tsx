"use client"

import { useRef } from "react"
import Link from "next/link"
import { ArrowRight } from "lucide-react"
import Magnetic from "@/components/motion/Magnetic"
import SplitHeadline from "@/components/motion/SplitHeadline"
import { gsap } from "@/lib/motion"
import { useMotionGsap } from "@/hooks/useMotionGsap"
import HeroScene from "./HeroScene"
import { useIntro } from "./Intro"

export default function Hero() {
  const { done } = useIntro()
  const root = useRef<HTMLElement>(null)
  const glow = useRef<HTMLDivElement>(null)

  useMotionGsap(
    () => {
      if (!done || !root.current) return
      gsap.fromTo(
        root.current.querySelectorAll("[data-hero-item]"),
        { y: 22, autoAlpha: 0 },
        { y: 0, autoAlpha: 1, duration: 0.95, ease: "power3.out", stagger: 0.09, delay: 0.42, clearProps: "transform" },
      )
      gsap.fromTo(
        glow.current,
        { yPercent: 0 },
        { yPercent: 26, ease: "none", scrollTrigger: { trigger: root.current, start: "top top", end: "bottom top", scrub: true } },
      )
    },
    { scope: root, dependencies: [done] },
  )

  return (
    <section ref={root} className="page-gutter relative overflow-hidden pb-20 pt-32 lg:flex lg:min-h-[100svh] lg:items-center lg:pb-24 lg:pt-28">
      <div
        ref={glow}
        aria-hidden="true"
        className="pointer-events-none absolute -top-40 right-[-10%] h-[46rem] w-[60rem] max-w-[140vw]"
        style={{ background: "radial-gradient(closest-side, rgba(var(--lime-rgb), 0.32), rgba(var(--brand-rgb), 0.06) 55%, transparent)" }}
      />
      {/* A quiet dot grid instead of a WebGL scene: no download, no GPU work, same depth. */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 [background-image:radial-gradient(rgba(var(--text-rgb),0.08)_1px,transparent_1.2px)] [background-size:24px_24px] [mask-image:radial-gradient(60%_55%_at_72%_42%,black,transparent)]"
      />

      <div className="page-width relative grid items-center gap-16 lg:grid-cols-[1.08fr_1fr] lg:gap-10">
        <div>
          <p data-hero-item data-intro className="label-mono mb-6 flex items-center gap-2">
            <span className="h-1.5 w-1.5 rounded-full bg-brand" />
            AI meeting notes
          </p>

          <SplitHeadline as="h1" play="load" ready={done} delay={0.08} className="display-xl">
            Every meeting, written up <span className="font-accent whitespace-nowrap text-brand-light">in your language.</span>
          </SplitHeadline>

          <p data-hero-item data-intro className="lede mt-7 max-w-[34rem]">
            Upload a recording of your meeting. You get a transcript, a summary and a list of who does what, even when
            the meeting was in Urdu.
          </p>

          <div data-hero-item data-intro className="mt-9 flex flex-col gap-3 sm:flex-row sm:items-center">
            <Magnetic>
              <Link href="/signup" className="btn btn-primary w-full sm:w-auto" data-testid="hero-cta">
                Start free
                <ArrowRight />
              </Link>
            </Magnetic>
            <Link href="/how-it-works" className="btn btn-ghost w-full sm:w-auto">
              See how it works
            </Link>
          </div>

          <p data-hero-item data-intro className="mt-5 text-sm text-bone-dim">
            60 free minutes every month. No card needed.
          </p>
        </div>

        <HeroScene ready={done} />
      </div>
    </section>
  )
}
