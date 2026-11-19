"use client"

import { useRef } from "react"
import { Check } from "lucide-react"
import { gsap } from "@/lib/motion"
import { useMotionGsap } from "@/hooks/useMotionGsap"

const LINES = [
  { time: "12:04", text: "We need the pricing page live before Friday." },
  { time: "12:11", text: "کلائنٹ کو قیمت کی تفصیل چاہیے۔", urdu: true },
  { time: "12:19", text: "Sara will send the contract today." },
]

const TASKS = ["Publish the pricing page by Friday", "Send the price details to the client", "Sara sends the contract today"]

const BAR_DELAYS = [0, 0.14, 0.32, 0.08, 0.26, 0.44, 0.18, 0.36, 0.05, 0.22, 0.4, 0.12]

/**
 * The hero's "product in action": a meeting turning into notes, on CSS 3D layers
 * and one GSAP timeline that plays once and stays finished, so no card is ever left
 * empty. With motion off, the finished state simply shows.
 */
export default function HeroScene({ ready }: { ready: boolean }) {
  const root = useRef<HTMLDivElement>(null)
  const stage = useRef<HTMLDivElement>(null)

  useMotionGsap(
    ({ desktop, finePointer }) => {
      if (!ready || !root.current || !stage.current) return
      const q = gsap.utils.selector(root.current)

      if (desktop) {
        gsap.fromTo(
          stage.current,
          { autoAlpha: 0, rotateX: 20, rotateY: -26, z: -160 },
          { autoAlpha: 1, rotateX: 7, rotateY: -13, z: 0, duration: 1.5, ease: "power4.out", delay: 0.2 },
        )
      } else {
        gsap.fromTo(stage.current, { autoAlpha: 0, y: 24 }, { autoAlpha: 1, y: 0, duration: 1, ease: "power3.out", delay: 0.4 })
      }

      gsap
        .timeline({ delay: 0.9, defaults: { ease: "power3.out" } })
        .fromTo(q("[data-scene-line]"), { autoAlpha: 0, y: 10 }, { autoAlpha: 1, y: 0, duration: 0.55, stagger: 0.6 })
        .fromTo(q("[data-scene-summary]"), { autoAlpha: 0, y: 12 }, { autoAlpha: 1, y: 0, duration: 0.6 }, "-=0.1")
        .fromTo(q("[data-scene-tasks]"), { autoAlpha: 0, y: 12 }, { autoAlpha: 1, y: 0, duration: 0.6 }, "-=0.3")
        .fromTo(q("[data-scene-task]"), { autoAlpha: 0, x: 12 }, { autoAlpha: 1, x: 0, duration: 0.45, stagger: 0.32 }, "-=0.25")
        .fromTo(
          q("[data-scene-check]"),
          { scale: 0 },
          { scale: 1, duration: 0.4, stagger: 0.32, ease: "back.out(2.2)" },
          "<0.1",
        )

      if (!desktop || !finePointer) return

      const rotateY = gsap.quickTo(stage.current, "rotateY", { duration: 1.1, ease: "power3.out" })
      const rotateX = gsap.quickTo(stage.current, "rotateX", { duration: 1.1, ease: "power3.out" })
      const onMove = (event: PointerEvent) => {
        const nx = event.clientX / window.innerWidth - 0.5
        const ny = event.clientY / window.innerHeight - 0.5
        rotateY(-13 + nx * 9)
        rotateX(7 - ny * 7)
      }
      window.addEventListener("pointermove", onMove, { passive: true })
      return () => window.removeEventListener("pointermove", onMove)
    },
    { scope: root, dependencies: [ready] },
  )

  return (
    <div ref={root} data-intro className="w-full lg:[perspective:1500px]" aria-label="Example: a meeting turning into notes" role="img">
      <div ref={stage} className="relative mx-auto w-full max-w-[32rem] lg:[transform-style:preserve-3d] lg:[transform:rotateX(7deg)_rotateY(-13deg)]">
        {/* Live transcript */}
        <div className="rounded-[18px] border border-line-strong bg-panel p-5 shadow-[var(--shadow-float)] lg:pb-16">
          <div className="flex items-center justify-between gap-3 lg:justify-start">
            <div className="flex items-center gap-2.5">
              <span className="dot-live h-2 w-2 rounded-full bg-danger" />
              <span className="text-sm font-medium">Weekly sync</span>
            </div>
            <span className="label-mono">Example</span>
          </div>

          <div className="wave-bars mt-4 flex h-8 items-center gap-[5px] text-brand-light/70" aria-hidden="true">
            {BAR_DELAYS.concat(BAR_DELAYS).map((delay, i) => (
              <span key={i} style={{ animationDelay: `${delay}s` }} />
            ))}
          </div>

          <ul className="mt-5 space-y-3">
            {LINES.map((line) => (
              <li key={line.time} data-scene-line className="flex items-baseline gap-3">
                <span className="shrink-0 font-mono text-[11px] text-bone-dim">{line.time}</span>
                {line.urdu ? (
                  <span lang="ur" dir="rtl" className="font-urdu flex-1 text-[0.9375rem] leading-relaxed text-bone">
                    {line.text}
                  </span>
                ) : (
                  <span className="text-sm leading-relaxed text-bone">{line.text}</span>
                )}
              </li>
            ))}
          </ul>
        </div>

        {/* Summary */}
        <div
          data-scene-summary
          className="mt-3 rounded-[16px] border border-line-strong bg-panel p-4 lg:absolute lg:-bottom-14 lg:-left-12 lg:mt-0 lg:w-[17rem] lg:[transform:translateZ(70px)] lg:shadow-[var(--shadow-float)]"
        >
          <p className="label-mono">Summary</p>
          <p className="mt-2 text-[0.8125rem] leading-relaxed text-bone-muted">
            Pricing goes live Friday. The client asked for a full price breakdown.
          </p>
        </div>

        {/* Action items */}
        <div
          data-scene-tasks
          className="mt-3 rounded-[16px] border border-line-strong bg-panel p-4 lg:absolute lg:-right-8 lg:-top-36 lg:mt-0 lg:w-[18.5rem] lg:[transform:translateZ(110px)] lg:shadow-[var(--shadow-float)]">
          <p className="label-mono">Action items</p>
          <ul className="mt-3 space-y-2.5">
            {TASKS.map((task) => (
              <li key={task} data-scene-task className="flex items-start gap-2.5">
                <span data-scene-check className="tile-accent mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-[5px]">
                  <Check className="h-3 w-3" strokeWidth={3} />
                </span>
                <span className="text-[0.8125rem] leading-snug text-bone">{task}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  )
}
