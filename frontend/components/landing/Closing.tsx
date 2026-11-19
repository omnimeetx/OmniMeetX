"use client"

import { useState } from "react"
import Link from "next/link"
import { AnimatePresence, motion } from "framer-motion"
import { ArrowRight } from "lucide-react"
import Magnetic from "@/components/motion/Magnetic"
import Reveal from "@/components/motion/Reveal"
import SplitHeadline from "@/components/motion/SplitHeadline"

export const PRINCIPLES = [
  { title: "Languages come first", body: "Most tools are built for English and treat everything else as an extra. We put real work into Urdu and the languages around it." },
  { title: "You pay for minutes", body: "One credit is one minute of audio. Every plan has every feature, so you never pay to unlock a button." },
  { title: "No numbers we can't prove", body: "You won't find an accuracy percentage or a customer count here until we have measured it. Try it on your own recordings instead." },
  { title: "Leaving is easy", body: "Cancel from your account whenever you like, and export your notes to PDF or Word first." },
]

export function Principles() {
  return (
    <section aria-labelledby="principles-title" className="page-gutter py-20 md:py-28">
      <div className="page-width grid gap-12 lg:grid-cols-[1fr_1.5fr]">
        <div>
          <p className="label-mono">How we work</p>
          <SplitHeadline id="principles-title" className="display-md mt-4">
            A few things we won't change.
          </SplitHeadline>
        </div>
        <Reveal as="ul">
          {PRINCIPLES.map((principle, index) => (
            <li key={principle.title} className="grid gap-2 border-t border-line py-6 md:grid-cols-[3rem_1fr_1.4fr] md:gap-6">
              <span className="font-mono text-sm text-bone-dim">0{index + 1}</span>
              <h3 className="text-lg tracking-[-0.02em]">{principle.title}</h3>
              <p className="text-[0.9375rem] leading-relaxed text-bone-muted">{principle.body}</p>
            </li>
          ))}
        </Reveal>
      </div>
    </section>
  )
}

const EXAMPLES = [
  {
    id: "standup",
    label: "Team standup",
    meta: "Spoken in Urdu, notes in English",
    said: "ٹیم نے کل کا کام مکمل کر لیا۔ آج حنا لاگ ان کا مسئلہ ٹھیک کرے گی۔",
    urdu: true,
    summary: "The team finished yesterday's work. Hina is fixing the login problem today.",
    actions: ["Hina: fix the login problem today"],
  },
  {
    id: "client",
    label: "Client call",
    meta: "Spoken in English, notes in English",
    said: "They liked the design, but they want the launch moved to March and a quote for the mobile app.",
    urdu: false,
    summary: "The client approved the design. They want a March launch and a quote for a mobile app.",
    actions: ["Move the launch plan to March", "Send a quote for the mobile app"],
  },
  {
    id: "lecture",
    label: "University lecture",
    meta: "Spoken in English, notes in Urdu",
    said: "Supply goes down, demand stays the same, and the price goes up. Read chapter four before Tuesday.",
    urdu: false,
    summary: "رسد کم ہو اور طلب وہی رہے تو قیمت بڑھ جاتی ہے۔",
    summaryUrdu: true,
    actions: ["منگل سے پہلے چوتھا باب پڑھیں"],
  },
]

export function Examples() {
  const [activeId, setActiveId] = useState(EXAMPLES[0].id)
  const example = EXAMPLES.find((item) => item.id === activeId) ?? EXAMPLES[0]

  return (
    <section aria-labelledby="examples-title" className="page-gutter py-20 md:py-28">
      <div className="page-width">
        <p className="label-mono">Examples</p>
        <SplitHeadline id="examples-title" className="display-lg mt-4 max-w-3xl">
          The same idea, for very different meetings.
        </SplitHeadline>

        <Reveal className="mt-10">
          <div>
            <div role="tablist" aria-label="Example meetings" className="grid w-full grid-cols-3 gap-1 rounded-[14px] border border-line p-1 sm:inline-flex sm:w-auto">
              {EXAMPLES.map((item) => {
                const selected = item.id === activeId
                return (
                  <button
                    key={item.id}
                    type="button"
                    role="tab"
                    aria-selected={selected}
                    onClick={() => setActiveId(item.id)}
                    className={`relative rounded-[10px] px-2 py-2 text-sm leading-tight transition-colors duration-200 sm:px-4 ${selected ? "text-bone" : "text-bone-dim hover:text-bone-muted"}`}
                  >
                    {selected && (
                      <motion.span
                        layoutId="example-tab"
                        className="absolute inset-0 rounded-[10px] bg-white/[0.07]"
                        transition={{ type: "spring", stiffness: 420, damping: 36 }}
                      />
                    )}
                    <span className="relative">{item.label}</span>
                  </button>
                )
              })}
            </div>

            <AnimatePresence mode="wait" initial={false}>
              <motion.div
                key={example.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ duration: 0.24, ease: [0.19, 1, 0.22, 1] }}
                className="mt-4 grid gap-4 md:grid-cols-2"
              >
                <div className="spot-card p-6">
                  <p className="label-mono">What was said</p>
                  {example.urdu ? (
                    <p lang="ur" dir="rtl" className="font-urdu mt-4 text-lg leading-[1.9]">
                      {example.said}
                    </p>
                  ) : (
                    <p className="mt-4 text-lg leading-relaxed tracking-[-0.01em]">{example.said}</p>
                  )}
                  <p className="mt-6 font-mono text-xs text-bone-dim">{example.meta}</p>
                </div>
                <div className="spot-card p-6" dir={example.summaryUrdu ? "rtl" : undefined}>
                  <p className="label-mono">Sample output</p>
                  <p lang={example.summaryUrdu ? "ur" : undefined} className={`mt-4 text-lg ${example.summaryUrdu ? "font-urdu leading-[1.9]" : "leading-relaxed tracking-[-0.01em]"}`}>
                    {example.summary}
                  </p>
                  <ul className="mt-5 space-y-2 border-t border-line pt-4">
                    {example.actions.map((action) => (
                      <li key={action} lang={example.summaryUrdu ? "ur" : undefined} className={`text-sm text-bone-muted ${example.summaryUrdu ? "font-urdu" : ""}`}>
                        {action}
                      </li>
                    ))}
                  </ul>
                </div>
              </motion.div>
            </AnimatePresence>
          </div>
        </Reveal>
      </div>
    </section>
  )
}

export function FinalCta() {
  return (
    <section aria-labelledby="cta-title" className="page-gutter py-20 md:py-28">
      <div
        className="page-width overflow-hidden rounded-[20px] border border-line px-6 py-16 text-center md:px-12 md:py-24"
        style={{ background: "radial-gradient(70% 90% at 50% 0%, rgba(var(--brand-rgb), 0.12), transparent), var(--panel)" }}
      >
        <SplitHeadline id="cta-title" className="display-lg mx-auto max-w-3xl">
          Upload one recording. <span className="font-accent text-brand-light">See if the notes are good enough.</span>
        </SplitHeadline>
        <p className="lede mx-auto mt-6 max-w-xl">That is the whole pitch. 60 free minutes a month, no card needed.</p>
        <div className="mt-9 flex flex-col justify-center gap-3 sm:flex-row sm:items-center">
          <Magnetic>
            <Link href="/signup" className="btn btn-primary w-full sm:w-auto">
              Start free
              <ArrowRight />
            </Link>
          </Magnetic>
          <Link href="/pricing" className="btn btn-ghost w-full sm:w-auto">
            See pricing
          </Link>
        </div>
      </div>
    </section>
  )
}
