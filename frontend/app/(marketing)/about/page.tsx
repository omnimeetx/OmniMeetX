import type { Metadata } from "next"
import Link from "next/link"
import { ArrowRight, Check, Minus } from "lucide-react"
import { Principles } from "@/components/landing/Closing"
import Reveal from "@/components/motion/Reveal"
import SplitHeadline from "@/components/motion/SplitHeadline"
import { BRAND } from "@/lib/brand"

export const metadata: Metadata = {
  title: "About",
  description: `Why ${BRAND.name} exists, what it does today and what it doesn't do yet.`,
  alternates: { canonical: "/about" },
}

const DOES = [
  "Transcripts from uploaded audio and video",
  "Summaries, decisions and action items",
  "Notes in any of 98 languages, whatever language was spoken",
  "Export to PDF or Word",
]

const DOES_NOT = [
  "Join your Zoom or Google Meet calls for you",
  "Host video calls",
  "Sync with your calendar",
  "Promise an accuracy number we haven't measured",
]

export default function AboutPage() {
  return (
    <>
      <section className="page-gutter pb-16 pt-36 md:pt-44">
        <div className="page-width">
          <p className="label-mono">About</p>
          <SplitHeadline as="h1" play="scroll" className="display-xl mt-5 max-w-5xl">
            Meetings happen in more than one language. <span className="font-accent whitespace-nowrap text-brand-light">Notes should too.</span>
          </SplitHeadline>
        </div>
      </section>

      <section className="page-gutter py-16">
        <Reveal className="page-width grid gap-10 lg:grid-cols-[1fr_1.6fr]">
          <p className="label-mono">Why this exists</p>
          <div className="max-w-2xl space-y-5 text-lg leading-relaxed text-bone-muted">
            <p>
              Most meeting tools are built for English first. In Pakistan and across South Asia, a normal meeting moves between Urdu and English,
              sometimes in the same sentence.
            </p>
            <p>
              Those meetings often come back as garbled text, or as Urdu written in Roman letters that nobody wants to read. So we route each language to
              the speech engine that handles it best, and we let you choose the language your notes are written in.
            </p>
            <p>{BRAND.name} is built in Karachi.</p>
          </div>
        </Reveal>
      </section>

      <section className="page-gutter py-16">
        <Reveal className="page-width grid gap-4 md:grid-cols-2">
          <article className="spot-card p-6 md:p-8">
            <h2 className="text-xl tracking-[-0.02em]">What it does today</h2>
            <ul className="mt-6 space-y-3.5">
              {DOES.map((item) => (
                <li key={item} className="flex items-start gap-3 text-[0.9375rem] leading-relaxed">
                  <Check className="mt-1 h-4 w-4 shrink-0 text-brand-light" />
                  {item}
                </li>
              ))}
            </ul>
          </article>

          <article className="spot-card p-6 md:p-8">
            <h2 className="text-xl tracking-[-0.02em]">What it doesn't do yet</h2>
            <ul className="mt-6 space-y-3.5">
              {DOES_NOT.map((item) => (
                <li key={item} className="flex items-start gap-3 text-[0.9375rem] leading-relaxed text-bone-muted">
                  <Minus className="mt-1 h-4 w-4 shrink-0 text-bone-dim" />
                  {item}
                </li>
              ))}
            </ul>
            <Link href="/feedback" className="btn btn-ghost btn-sm mt-8">
              Tell us what to build next
              <ArrowRight />
            </Link>
          </article>
        </Reveal>
      </section>

      <Principles />
    </>
  )
}
