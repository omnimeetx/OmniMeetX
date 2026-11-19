"use client"

import Link from "next/link"
import { AnimatePresence, motion } from "framer-motion"
import { AlertCircle, Check, Upload } from "lucide-react"
import TypingDots from "@/components/motion/TypingDots"

export interface PipelineMeeting {
  id: number
  title: string
  status: string
  has_transcription: boolean
  has_notes: boolean
}

const STAGES = ["Uploaded", "Transcript", "Notes", "Ready"]

/** Which stage is running, worked out only from what the server has actually reported. */
function activeStage(meeting: PipelineMeeting) {
  if (meeting.status === "completed") return 4
  if (meeting.has_notes) return 3
  if (meeting.has_transcription) return 2
  return 1
}

function PipelineRow({ meeting }: { meeting: PipelineMeeting }) {
  const failed = meeting.status === "failed"
  const stage = activeStage(meeting)

  return (
    <motion.li
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.98 }}
      transition={{ duration: 0.3, ease: [0.19, 1, 0.22, 1] }}
    >
      <Link href={`/processing/${meeting.id}`} className="block rounded-[14px] border border-line p-4 transition-colors duration-200 hover:border-line-strong">
        <div className="flex items-center justify-between gap-3">
          <p className="truncate text-sm">{meeting.title}</p>
          {failed ? (
            <span className="inline-flex shrink-0 items-center gap-1.5 text-xs text-danger">
              <AlertCircle className="h-3.5 w-3.5" /> Failed
            </span>
          ) : (
            <TypingDots label={`${meeting.title} is processing`} className="shrink-0 text-warn" />
          )}
        </div>

        <ol className="mt-3 grid grid-cols-4 gap-1.5">
          {STAGES.map((name, index) => {
            const done = index < stage
            const running = index === stage && !failed
            return (
              <li key={name}>
                <span className="block h-1 overflow-hidden rounded-full bg-white/10">
                  {done && <motion.span layoutId={`bar-${meeting.id}-${index}`} className="block h-full w-full rounded-full bg-brand" />}
                  {running && <span className="animate-shimmer block h-full w-full rounded-full bg-warn/60" />}
                </span>
                <span className={`mt-1.5 flex items-center gap-1 text-[11px] ${done ? "text-bone-muted" : running ? "text-warn" : "text-bone-dim"}`}>
                  {done && <Check className="h-3 w-3 text-brand-light" />}
                  {name}
                </span>
              </li>
            )
          })}
        </ol>
      </Link>
    </motion.li>
  )
}

/** Meetings being worked on right now. Announces changes to screen readers. */
export default function LivePipeline({ meetings }: { meetings: PipelineMeeting[] }) {
  return (
    <section aria-labelledby="pipeline-title" className="spot-card p-5" data-testid="live-pipeline">
      <div className="flex items-center gap-2.5">
        <span className={`h-1.5 w-1.5 rounded-full ${meetings.length ? "dot-live bg-warn" : "bg-bone-dim"}`} />
        <h2 id="pipeline-title" className="label-mono !text-bone-muted">
          Live pipeline
        </h2>
      </div>

      <div aria-live="polite" className="mt-4">
        {meetings.length === 0 ? (
          <div className="flex flex-col items-start gap-3 py-2">
            <p className="text-sm text-bone-muted">Nothing is processing right now.</p>
            <Link href="/upload" className="btn btn-ghost btn-sm">
              <Upload />
              Upload a recording
            </Link>
          </div>
        ) : (
          <ul className="space-y-2.5">
            <AnimatePresence initial={false} mode="popLayout">
              {meetings.map((meeting) => (
                <PipelineRow key={meeting.id} meeting={meeting} />
              ))}
            </AnimatePresence>
          </ul>
        )}
      </div>
    </section>
  )
}
