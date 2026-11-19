"use client"

import { useMemo, useState } from "react"
import { AnimatePresence, motion } from "framer-motion"
import { Calendar, CheckSquare, Gavel, RotateCcw } from "lucide-react"
import Reveal from "@/components/motion/Reveal"
import SplitHeadline from "@/components/motion/SplitHeadline"

const SAMPLE = `Ali: We should launch the pricing page by Friday.
Sara: I will send the contract to the client today.
Ali: We decided to keep the free plan at 60 minutes.
Sara: Hina needs to review the Urdu transcript by Monday.`

const ACTION = /\b(will|i'll|we'll|should|must|need to|needs to|has to|have to|going to|let's)\b|کریں گے|کرنا ہے|کرے گا|کرے گی/i
const DECISION = /\b(decided|decision|agreed|we're going with|final call|settled on)\b|فیصلہ/i
const DATE = /\b(today|tomorrow|tonight|next week|next month|monday|tuesday|wednesday|thursday|friday|saturday|sunday|january|february|march|april|may|june|july|august|september|october|november|december)\b|\b\d{1,2}(st|nd|rd|th)\b|آج|کل|جمعہ|پیر/gi

/** Deliberately simple rules. This is a taste of the idea, not the real pipeline, and the copy says so. */
function readNotes(text: string) {
  const sentences = text
    .split(/\n|(?<=[.!?۔])\s+/)
    .map((line) => line.replace(/^[^:\n]{1,24}:\s*/, "").trim())
    .filter(Boolean)

  const decisions = sentences.filter((line) => DECISION.test(line))
  const actions = sentences.filter((line) => ACTION.test(line) && !DECISION.test(line))
  const dates = Array.from(new Set((text.match(DATE) ?? []).map((date) => date.charAt(0).toUpperCase() + date.slice(1).toLowerCase())))

  return { actions, decisions, dates }
}

function NoteList({ title, icon: Icon, items, empty }: { title: string; icon: typeof Gavel; items: string[]; empty: string }) {
  return (
    <div className="spot-card p-5">
      <div className="flex items-center gap-2">
        <Icon className="h-4 w-4 text-brand-light" />
        <h3 className="label-mono !text-bone-muted">
          {title} <span className="text-bone-dim">{items.length}</span>
        </h3>
      </div>
      <ul className="mt-4 space-y-2.5">
        <AnimatePresence mode="popLayout" initial={false}>
          {items.length === 0 ? (
            <motion.li key="empty" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="text-sm text-bone-dim">
              {empty}
            </motion.li>
          ) : (
            items.map((item) => (
              <motion.li
                key={item}
                layout
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.97 }}
                transition={{ duration: 0.28, ease: [0.19, 1, 0.22, 1] }}
                className="text-sm leading-relaxed text-bone"
              >
                {item}
              </motion.li>
            ))
          )}
        </AnimatePresence>
      </ul>
    </div>
  )
}

export default function TryIt() {
  const [text, setText] = useState(SAMPLE)
  const notes = useMemo(() => readNotes(text), [text])

  return (
    <section id="try-it" aria-labelledby="try-it-title" className="page-gutter py-20 md:py-28">
      <div className="page-width">
        <p className="label-mono">Try it</p>
        <SplitHeadline id="try-it-title" className="display-lg mt-4 max-w-3xl">
          Type a few lines from a meeting. <span className="font-accent text-brand-light">Watch them sort themselves.</span>
        </SplitHeadline>

        <Reveal className="mt-12 grid gap-4 lg:grid-cols-2">
          <div className="flex flex-col">
            <div className="flex items-center justify-between">
              <label htmlFor="try-it-input" className="text-sm text-bone-muted">
                What was said
              </label>
              <button
                type="button"
                onClick={() => setText(SAMPLE)}
                className="inline-flex items-center gap-1.5 rounded-md text-xs text-bone-dim transition-colors duration-200 hover:text-bone"
              >
                <RotateCcw className="h-3 w-3" />
                Reset
              </button>
            </div>
            <textarea
              id="try-it-input"
              data-testid="try-it-input"
              value={text}
              onChange={(event) => setText(event.target.value)}
              rows={9}
              maxLength={1500}
              className="mt-3 w-full flex-1 resize-none rounded-[16px] border border-line-strong bg-panel p-5 text-[0.9375rem] leading-relaxed text-bone placeholder:text-bone-dim focus-visible:outline-brand-light"
              placeholder="Paste or type a few lines..."
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-1" aria-live="polite">
            <NoteList title="Action items" icon={CheckSquare} items={notes.actions} empty="Try a line with “will” or “need to”." />
            <div className="grid gap-4 sm:grid-cols-1 lg:grid-cols-2">
              <NoteList title="Decisions" icon={Gavel} items={notes.decisions} empty="Try “we decided…”." />
              <NoteList title="Dates" icon={Calendar} items={notes.dates} empty="Try “by Friday”." />
            </div>
          </div>
        </Reveal>

        <p className="mt-5 max-w-2xl text-sm text-bone-dim">
          This preview runs in your browser with a few simple rules, and nothing you type leaves the page. Real meetings go through speech
          recognition and an AI model, so they get much more than this.
        </p>
      </div>
    </section>
  )
}
