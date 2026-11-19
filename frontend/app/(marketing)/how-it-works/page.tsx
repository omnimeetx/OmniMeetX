import type { Metadata } from "next"
import Link from "next/link"
import { ArrowRight } from "lucide-react"
import HowItWorks from "@/components/landing/HowItWorks"
import Magnetic from "@/components/motion/Magnetic"
import Reveal from "@/components/motion/Reveal"
import SplitHeadline from "@/components/motion/SplitHeadline"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"
import { BRAND } from "@/lib/brand"

export const metadata: Metadata = {
  title: "How it works",
  description: `From a recording to a transcript, a summary and action items in ${BRAND.name}.`,
  alternates: { canonical: "/how-it-works" },
}

const FAQ = [
  {
    question: "What counts as a minute?",
    answer: "One credit is one minute of audio. A 42-minute recording uses 42 credits. The free plan refills to 60 minutes every month.",
  },
  {
    question: "Which languages can it handle?",
    answer:
      "Notes and transcripts can be written in any of 98 languages. How well speech is recognised depends on the language and the audio, which is why we send languages like Urdu to a different engine than English. If you can, tell us the spoken language when you upload, since that gives the best result.",
  },
  {
    question: "How accurate is it?",
    answer:
      "It depends on your audio: background noise, how many people talk over each other, and the language. We haven't published a percentage because we haven't measured one we'd stand behind. The free minutes are there so you can test it on your own recordings.",
  },
  {
    question: "Can it join my Zoom or Google Meet?",
    answer: "Not yet. Record the call in Zoom or Meet, then upload the file here. If you want this, add your vote on the feature requests board.",
  },
  {
    question: "Can I cancel?",
    answer: "Yes, from your account at any time. You keep your plan until the end of the period you paid for, then you move to the free plan.",
  },
]

export default function HowItWorksPage() {
  return (
    <>
      <section className="page-gutter pb-4 pt-36 md:pt-44">
        <div className="page-width">
          <SplitHeadline as="h1" play="scroll" className="display-xl max-w-4xl">
            From a conversation to notes <span className="font-accent text-brand-light">you'd actually send.</span>
          </SplitHeadline>
        </div>
      </section>

      <HowItWorks />

      <section aria-labelledby="faq-title" className="page-gutter py-20 md:py-28">
        <div className="page-width grid gap-10 lg:grid-cols-[1fr_1.6fr]">
          <SplitHeadline id="faq-title" className="display-md">
            Questions people ask first
          </SplitHeadline>
          <Reveal>
            <Accordion type="single" collapsible>
              {FAQ.map((item) => (
                <AccordionItem key={item.question} value={item.question} className="border-line">
                  <AccordionTrigger className="py-5 text-left text-base font-normal tracking-[-0.01em] hover:no-underline">{item.question}</AccordionTrigger>
                  <AccordionContent className="pb-5 text-[0.9375rem] leading-relaxed text-bone-muted">{item.answer}</AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </Reveal>
        </div>
      </section>

      <section className="page-gutter pb-16 text-center">
        <Magnetic>
          <Link href="/signup" className="btn btn-primary">
            Try it on your next meeting
            <ArrowRight />
          </Link>
        </Magnetic>
      </section>
    </>
  )
}
