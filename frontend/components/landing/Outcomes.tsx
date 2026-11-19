"use client"

import { Activity, Check, FileDown, ListChecks, MessageSquareText, Search } from "lucide-react"
import Reveal from "@/components/motion/Reveal"
import SplitHeadline from "@/components/motion/SplitHeadline"

const TIMELINE = [
  { time: "00:12", text: "Let's start with the launch date." },
  { time: "03:48", text: "Pricing page has to go first." },
  { time: "09:31", text: "Agreed, Friday it is." },
]

export default function Outcomes() {
  return (
    <section aria-labelledby="outcomes-title" className="page-gutter py-20 md:py-28">
      <div className="page-width">
        <p className="label-mono">What you walk away with</p>
        <SplitHeadline id="outcomes-title" className="display-lg mt-4 max-w-3xl">
          One meeting in. <span className="font-accent text-brand-light">Everything you need out.</span>
        </SplitHeadline>

        <Reveal className="mt-12 grid gap-4 md:auto-rows-fr md:grid-cols-6">
          <article className="spot-card flex flex-col p-6 md:col-span-4">
            <div className="flex items-center gap-2.5">
              <MessageSquareText className="h-4 w-4 text-brand-light" />
              <h3 className="text-lg tracking-[-0.02em]">A transcript you can read</h3>
            </div>
            <p className="mt-2 max-w-md text-sm leading-relaxed text-bone-muted">Timestamped, so you can jump back to the moment something was said.</p>
            <ul className="mt-6 space-y-2.5">
              {TIMELINE.map((row) => (
                <li key={row.time} className="flex gap-4 border-t border-line pt-2.5 text-sm">
                  <span className="font-mono text-xs leading-5 text-bone-dim">{row.time}</span>
                  <span>{row.text}</span>
                </li>
              ))}
            </ul>
          </article>

          <article className="spot-card flex flex-col p-6 md:col-span-2">
            <div className="flex items-center gap-2.5">
              <ListChecks className="h-4 w-4 text-brand-light" />
              <h3 className="text-lg tracking-[-0.02em]">Action items</h3>
            </div>
            <ul className="mt-5 space-y-3">
              {["Publish pricing", "Send the contract", "Review the transcript"].map((item) => (
                <li key={item} className="flex items-center gap-2.5 text-sm">
                  <span className="tile-accent flex h-4 w-4 items-center justify-center rounded-[5px]">
                    <Check className="h-3 w-3" strokeWidth={3} />
                  </span>
                  {item}
                </li>
              ))}
            </ul>
          </article>

          <article className="spot-card flex flex-col justify-between gap-6 p-6 md:col-span-2">
            <FileDown className="h-4 w-4 text-brand-light" />
            <div>
              <h3 className="text-lg tracking-[-0.02em]">PDF and Word</h3>
              <p className="mt-2 text-sm leading-relaxed text-bone-muted">Send notes to people who weren't there, in a file they can open.</p>
            </div>
          </article>

          <article className="spot-card flex flex-col justify-between gap-6 p-6 md:col-span-2">
            <Activity className="h-4 w-4 text-brand-light" />
            <div>
              <h3 className="text-lg tracking-[-0.02em]">Watch it work</h3>
              <p className="mt-2 text-sm leading-relaxed text-bone-muted">See each step as it runs, from transcript to summary to action items.</p>
            </div>
          </article>

          <article className="spot-card flex flex-col justify-between gap-6 p-6 md:col-span-2">
            <Search className="h-4 w-4 text-brand-light" />
            <div>
              <h3 className="text-lg tracking-[-0.02em]">All in one place</h3>
              <p className="mt-2 text-sm leading-relaxed text-bone-muted">Every meeting stays in your history. Star the ones you come back to.</p>
            </div>
          </article>
        </Reveal>
      </div>
    </section>
  )
}
