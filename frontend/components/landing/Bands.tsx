"use client"

import { useEffect, useState } from "react"
import NumberTicker from "@/components/motion/NumberTicker"
import Reveal from "@/components/motion/Reveal"
import VelocityMarquee from "@/components/motion/VelocityMarquee"
import { API_URL } from "@/lib/config"

const LANGUAGES = [
  { label: "English", lang: "en" },
  { label: "اردو", lang: "ur" },
  { label: "हिन्दी", lang: "hi" },
  { label: "العربية", lang: "ar" },
  { label: "Español", lang: "es" },
  { label: "বাংলা", lang: "bn" },
  { label: "Français", lang: "fr" },
  { label: "ਪੰਜਾਬੀ", lang: "pa" },
  { label: "فارسی", lang: "fa" },
  { label: "Türkçe", lang: "tr" },
  { label: "پښتو", lang: "ps" },
  { label: "中文", lang: "zh" },
  { label: "தமிழ்", lang: "ta" },
]

export function LanguageBand() {
  return (
    <section aria-label="Some of the languages OmniMeetX writes notes in" className="border-y border-line py-6">
      <VelocityMarquee>
        {LANGUAGES.map((language) => (
          <span key={language.lang} className="flex items-center">
            <span lang={language.lang} className="whitespace-nowrap px-7 text-2xl tracking-[-0.02em] text-bone-muted md:text-3xl">
              {language.label}
            </span>
            <span aria-hidden="true" className="h-1 w-1 rounded-full bg-bone-dim" />
          </span>
        ))}
      </VelocityMarquee>
    </section>
  )
}

type ServiceState = "checking" | "online" | "degraded" | "offline"

const SERVICE_COPY: Record<ServiceState, { label: string; note: string; dot: string }> = {
  checking: { label: "Checking", note: "Asking the server right now", dot: "bg-bone-dim" },
  online: { label: "Online", note: "Live check of our servers", dot: "bg-brand-light dot-live" },
  degraded: { label: "Slow", note: "Some parts are having trouble", dot: "bg-warn dot-live" },
  offline: { label: "Offline", note: "We can't reach the server", dot: "bg-danger" },
}

/** Asks the real health endpoint, so this tile can't claim uptime we don't have. */
function ServiceStatus() {
  const [state, setState] = useState<ServiceState>("checking")

  useEffect(() => {
    let alive = true
    const check = async () => {
      try {
        const res = await fetch(`${API_URL}/health`)
        const data = await res.json()
        if (alive) setState(res.ok && data.status === "healthy" ? "online" : "degraded")
      } catch {
        if (alive) setState("offline")
      }
    }
    check()
    const timer = setInterval(check, 60000)
    return () => {
      alive = false
      clearInterval(timer)
    }
  }, [])

  const copy = SERVICE_COPY[state]

  return (
    <div className="bg-canvas p-6 md:p-8">
      <div aria-live="polite" className="flex items-center gap-3 text-4xl tracking-[-0.04em] md:text-5xl">
        <span aria-hidden="true" className={`h-3 w-3 rounded-full ${copy.dot}`} />
        {copy.label}
      </div>
      <p className="mt-3 text-sm text-bone-muted">{copy.note}</p>
    </div>
  )
}

const FACTS = [
  { value: 60, label: "free minutes, every month" },
  { value: 98, label: "languages for transcripts and notes" },
  { value: 1200, label: "minutes a month on Pro, for $12" },
]

export function StatsBand() {
  return (
    <section aria-label="OmniMeetX at a glance" className="page-gutter py-20 md:py-28">
      <Reveal className="page-width grid grid-cols-1 gap-px overflow-hidden rounded-[18px] border border-line bg-line sm:grid-cols-2 lg:grid-cols-4">
        {FACTS.map((fact) => (
          <div key={fact.label} className="bg-canvas p-6 md:p-8">
            <div className="font-mono text-4xl tracking-[-0.05em] md:text-5xl">
              <NumberTicker value={fact.value} />
            </div>
            <p className="mt-3 text-sm text-bone-muted">{fact.label}</p>
          </div>
        ))}
        <ServiceStatus />
      </Reveal>
    </section>
  )
}
