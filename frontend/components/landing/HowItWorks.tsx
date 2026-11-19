"use client"

import { useRef, useState } from "react"
import { AnimatePresence, motion } from "framer-motion"
import { Check, FileAudio, Languages, Loader2, Star, Video } from "lucide-react"
import { useLenis } from "lenis/react"
import SplitHeadline from "@/components/motion/SplitHeadline"
import { ScrollTrigger } from "@/lib/motion"
import { useMotionGsap } from "@/hooks/useMotionGsap"

export const STEPS = [
  {
    title: "Bring the conversation",
    body: "Upload audio or video you already have, from Zoom, Meet, your phone or anywhere else.",
  },
  {
    title: "Say which languages",
    body: "Tell us what people spoke and what you want to read. They can be different, and we can detect the spoken one for you.",
  },
  {
    title: "We write it up",
    body: "Speech becomes a transcript, then a summary, decisions and action items. You can watch each step as it runs.",
  },
  {
    title: "Use it",
    body: "Find it later in your history, star what matters, and export to PDF or Word when someone else needs it.",
  },
]

function Frame({ children, label }: { children: React.ReactNode; label: string }) {
  return (
    <div className="flex h-full flex-col rounded-[18px] border border-line-strong bg-panel-2 p-6">
      <p className="label-mono">{label}</p>
      <div className="mt-5 flex flex-1 flex-col justify-center gap-3">{children}</div>
    </div>
  )
}

export function StepVisual({ step }: { step: number }) {
  if (step === 0) {
    return (
      <Frame label="Audio or video">
        <div className="flex items-center gap-4 rounded-[14px] border border-line p-4">
          <span className="tile-accent flex h-10 w-10 shrink-0 items-center justify-center rounded-[10px]">
            <FileAudio className="h-5 w-5" />
          </span>
          <div>
            <p className="text-sm font-medium">client-call.mp3</p>
            <p className="font-mono text-xs text-bone-dim">Uploaded, 42 min</p>
          </div>
        </div>
        <div className="flex items-center gap-4 rounded-[14px] border border-line p-4">
          <span className="tile-accent flex h-10 w-10 shrink-0 items-center justify-center rounded-[10px]">
            <Video className="h-5 w-5" />
          </span>
          <div>
            <p className="text-sm font-medium">weekly-sync.mp4</p>
            <p className="font-mono text-xs text-bone-dim">Recorded in Zoom, 18 min</p>
          </div>
        </div>
      </Frame>
    )
  }

  if (step === 1) {
    return (
      <Frame label="Languages">
        <div className="rounded-[14px] border border-line p-4">
          <p className="text-xs text-bone-dim">Spoken in the recording</p>
          <p className="mt-1 flex items-center gap-2 text-sm font-medium">
            <Languages className="h-4 w-4 text-brand-light" /> Urdu
          </p>
        </div>
        <div className="rounded-[14px] border border-line p-4">
          <p className="text-xs text-bone-dim">Write my notes in</p>
          <p className="mt-1 flex items-center gap-2 text-sm font-medium">
            <Languages className="h-4 w-4 text-brand-light" /> English
          </p>
        </div>
      </Frame>
    )
  }

  if (step === 2) {
    const rows = [
      { label: "Transcribing the audio", state: "done" },
      { label: "Writing the summary", state: "done" },
      { label: "Pulling out action items", state: "active" },
      { label: "Ready to read", state: "waiting" },
    ]
    return (
      <Frame label="Processing">
        {rows.map((row) => (
          <div key={row.label} className="flex items-center gap-3 rounded-[12px] border border-line p-3.5">
            {row.state === "done" && <Check className="h-4 w-4 text-brand-light" />}
            {row.state === "active" && <Loader2 className="h-4 w-4 animate-spin text-warn" />}
            {row.state === "waiting" && <span className="mx-[3px] h-2.5 w-2.5 rounded-full border border-line-strong" />}
            <span className={`text-sm ${row.state === "waiting" ? "text-bone-dim" : "text-bone"}`}>{row.label}</span>
          </div>
        ))}
      </Frame>
    )
  }

  return (
    <Frame label="Your history">
      {[
        { title: "Weekly sync", meta: "PDF, Word", starred: true },
        { title: "Client call", meta: "PDF", starred: false },
        { title: "Design review", meta: "Word", starred: false },
      ].map((row) => (
        <div key={row.title} className="flex items-center justify-between rounded-[12px] border border-line p-3.5">
          <span className="text-sm">{row.title}</span>
          <span className="flex items-center gap-3">
            <span className="font-mono text-xs text-bone-dim">{row.meta}</span>
            <Star className={`h-4 w-4 ${row.starred ? "fill-sand text-sand" : "text-bone-dim"}`} />
          </span>
        </div>
      ))}
    </Frame>
  )
}

/** Pinned on desktop: scrolling walks through the steps. On phones, a plain stack. */
export default function HowItWorks() {
  const [active, setActive] = useState(0)
  const pinArea = useRef<HTMLDivElement>(null)
  const trigger = useRef<ScrollTrigger | null>(null)
  const lenis = useLenis()

  useMotionGsap(
    ({ desktop }) => {
      if (!desktop || !pinArea.current) return
      // Very short windows can't hold the steps and a nav bar, so they scroll normally.
      if (window.innerHeight < pinArea.current.offsetHeight + 104) return
      trigger.current = ScrollTrigger.create({
        trigger: pinArea.current,
        // Centred in the space below the 64px nav, never closer than 96px to the top.
        start: () => `top ${Math.max(96, Math.round((window.innerHeight + 64 - (pinArea.current?.offsetHeight ?? 0)) / 2))}px`,
        invalidateOnRefresh: true,
        end: `+=${STEPS.length * 70}%`,
        pin: true,
        anticipatePin: 1,
        onUpdate: (self) => {
          setActive(Math.min(STEPS.length - 1, Math.floor(self.progress * STEPS.length)))
        },
      })
      return () => {
        trigger.current = null
      }
    },
    { scope: pinArea },
  )

  const goTo = (index: number) => {
    setActive(index)
    const pin = trigger.current
    if (pin) lenis?.scrollTo(pin.start + ((pin.end - pin.start) * (index + 0.1)) / STEPS.length)
  }

  return (
    <section aria-labelledby="how-title" className="py-20 md:py-28">
      <div className="page-gutter">
        <div className="page-width">
          <p className="label-mono">How it works</p>
          <SplitHeadline id="how-title" className="display-lg mt-4 max-w-3xl">
            Four steps, and you only do <span className="font-accent text-brand-light">the first two.</span>
          </SplitHeadline>

          <div ref={pinArea} className="mt-12 grid gap-10 lg:grid-cols-[1fr_1.1fr] lg:gap-16">
            <ol className="space-y-1">
              {STEPS.map((step, index) => {
                const isActive = active === index
                return (
                  <li key={step.title}>
                    <button
                      type="button"
                      onClick={() => goTo(index)}
                      aria-current={isActive ? "step" : undefined}
                      className="relative w-full rounded-[14px] px-5 py-4 text-left"
                    >
                      {isActive && (
                        <motion.span
                          layoutId="how-step-active"
                          className="absolute inset-0 hidden rounded-[14px] border border-line-strong bg-white/[0.03] lg:block"
                          transition={{ type: "spring", stiffness: 340, damping: 34 }}
                        />
                      )}
                      <span className="relative flex gap-5">
                        <span className={`font-mono text-sm transition-colors duration-300 ${isActive ? "text-brand-light" : "text-bone-dim"}`}>
                          0{index + 1}
                        </span>
                        <span>
                          <span className="block text-xl tracking-[-0.02em]">{step.title}</span>
                          <span className={`mt-2 block text-[0.9375rem] leading-relaxed transition-colors duration-300 ${isActive ? "text-bone-muted" : "text-bone-muted lg:text-bone-dim"}`}>
                            {step.body}
                          </span>
                        </span>
                      </span>
                    </button>
                    <div className="mt-2 px-5 pb-4 lg:hidden">
                      <StepVisual step={index} />
                    </div>
                  </li>
                )
              })}
            </ol>

            <div className="relative hidden h-[25rem] lg:block">
              <AnimatePresence mode="wait" initial={false}>
                <motion.div
                  key={active}
                  initial={{ opacity: 0, y: 14, scale: 0.985 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -10, scale: 0.985 }}
                  transition={{ duration: 0.28, ease: [0.19, 1, 0.22, 1] }}
                  className="absolute inset-0"
                >
                  <StepVisual step={active} />
                </motion.div>
              </AnimatePresence>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
