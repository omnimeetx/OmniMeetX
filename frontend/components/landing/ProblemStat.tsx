"use client"

import { Fragment, useState } from "react"
import Reveal from "@/components/motion/Reveal"
import SplitHeadline from "@/components/motion/SplitHeadline"

function formatHours(totalMinutes: number) {
  const hours = Math.floor(totalMinutes / 60)
  const minutes = totalMinutes % 60
  if (!hours) return [`${minutes}m`]
  return minutes ? [`${hours}h`, `${minutes}m`] : [`${hours}h`]
}

function Slider({ id, label, value, min, max, step, unit, onChange }: { id: string; label: string; value: number; min: number; max: number; step: number; unit: string; onChange: (value: number) => void }) {
  const filled = ((value - min) / (max - min)) * 100
  return (
    <div>
      <div className="flex items-baseline justify-between gap-4">
        <label htmlFor={id} className="text-sm text-bone-muted">
          {label}
        </label>
        <output htmlFor={id} className="font-mono text-sm tabular-nums text-bone">
          {value} {unit}
        </output>
      </div>
      <input
        id={id}
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
        className="range-input mt-3 w-full"
        style={{ "--filled": `${filled}%` } as React.CSSProperties}
      />
    </div>
  )
}

/** The headline number is the reader's own estimate, so it needs no outside statistic to back it up. */
export default function ProblemStat() {
  const [meetings, setMeetings] = useState(5)
  const [writeUp, setWriteUp] = useState(45)
  const weekly = meetings * writeUp

  return (
    <section aria-labelledby="problem-title" className="page-gutter py-20 md:py-28">
      <div className="page-width grid items-end gap-12 lg:grid-cols-[1.25fr_1fr]">
        <div>
          <p className="label-mono">The problem</p>
          <SplitHeadline id="problem-title" className="display-lg mt-4 max-w-2xl">
            Writing up meetings is the job nobody put on the calendar.
          </SplitHeadline>
          <div
            aria-live="polite"
            data-testid="problem-total"
            className="mt-10 font-mono text-[clamp(4rem,12vw,9rem)] leading-none tracking-[-0.06em] text-brand-light tabular-nums"
          >
            {formatHours(weekly).map((part, i) => (
              <Fragment key={i}>
                {/* A monospace space is a full digit wide; at this size that reads as a hole. */}
                {i > 0 && <span className="text-[0.3em]"> </span>}
                {part}
              </Fragment>
            ))}
          </div>
          <p className="mt-4 text-bone-muted">a week, by your own numbers. Move the sliders.</p>
        </div>

        <Reveal className="spot-card space-y-8 p-6 md:p-8">
          <Slider id="meetings-per-week" label="Meetings a week" value={meetings} min={1} max={25} step={1} unit="meetings" onChange={setMeetings} />
          <Slider id="write-up-minutes" label="Time to write up each one" value={writeUp} min={5} max={90} step={5} unit="min" onChange={setWriteUp} />
        </Reveal>
      </div>
    </section>
  )
}
