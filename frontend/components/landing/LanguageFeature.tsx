"use client"

import { useState } from "react"
import { AnimatePresence, motion } from "framer-motion"
import { ArrowRight } from "lucide-react"
import Reveal from "@/components/motion/Reveal"
import SplitHeadline from "@/components/motion/SplitHeadline"

const SPOKEN = "اگلے ہفتے تک نئی ویب سائٹ لائیو ہو جائے گی۔ علی ڈیزائن مکمل کرے گا اور سارہ کلائنٹ سے بات کرے گی۔"

const OUTPUTS = [
  { id: "en", label: "English", lang: "en", dir: "ltr", text: "The new website goes live by next week. Ali finishes the design. Sara talks to the client." },
  { id: "ur", label: "اردو", lang: "ur", dir: "rtl", text: "نئی ویب سائٹ اگلے ہفتے تک لائیو ہوگی۔ علی ڈیزائن مکمل کرے گا۔ سارہ کلائنٹ سے بات کرے گی۔" },
  { id: "ar", label: "العربية", lang: "ar", dir: "rtl", text: "سيتم إطلاق الموقع الجديد بحلول الأسبوع المقبل. يُنهي علي التصميم. وتتحدث سارة مع العميل." },
  { id: "es", label: "Español", lang: "es", dir: "ltr", text: "El nuevo sitio web estará en línea la próxima semana. Ali termina el diseño. Sara habla con el cliente." },
]

/** The thing that sets the product apart: spoken language and notes language are separate choices. */
export default function LanguageFeature() {
  const [output, setOutput] = useState(OUTPUTS[0])
  const isRtl = output.dir === "rtl"

  return (
    <section aria-labelledby="language-title" className="page-gutter py-20 md:py-28">
      <div className="page-width">
        <p className="label-mono">Languages</p>
        <SplitHeadline id="language-title" className="display-lg mt-4 max-w-4xl">
          Said in one language. <span className="font-accent text-brand-light">Read in another.</span>
        </SplitHeadline>
        <p className="lede mt-6 max-w-2xl">
          Urdu is why we rebuilt our speech pipeline. English goes to one engine and Urdu to another that handles it better, so the transcript
          comes back in the right script instead of a Roman guess.
        </p>

        <Reveal className="mt-12 grid items-stretch gap-4 lg:grid-cols-[1fr_auto_1fr]">
          <div className="spot-card flex flex-col p-6">
            <p className="label-mono">What was said</p>
            <p lang="ur" dir="rtl" className="font-urdu mt-5 flex-1 text-xl leading-[1.9]">
              {SPOKEN}
            </p>
            <p className="mt-5 font-mono text-xs text-bone-dim">Spoken in Urdu. Example text.</p>
          </div>

          <div aria-hidden="true" className="hidden items-center lg:flex">
            <span className="tile-accent flex h-10 w-10 items-center justify-center rounded-full">
              <ArrowRight className="h-4 w-4" />
            </span>
          </div>

          <div className="spot-card flex flex-col p-6">
            <div className="flex flex-wrap items-center gap-1" role="tablist" aria-label="Notes language">
              {OUTPUTS.map((option) => {
                const selected = option.id === output.id
                return (
                  <button
                    key={option.id}
                    type="button"
                    role="tab"
                    aria-selected={selected}
                    onClick={() => setOutput(option)}
                    className={`relative rounded-lg px-3 py-1.5 text-sm transition-colors duration-200 ${selected ? "text-bone" : "text-bone-dim hover:text-bone-muted"}`}
                  >
                    {selected && (
                      <motion.span
                        layoutId="language-tab"
                        className="absolute inset-0 rounded-lg bg-white/[0.07]"
                        transition={{ type: "spring", stiffness: 420, damping: 36 }}
                      />
                    )}
                    <span lang={option.lang} className="relative">
                      {option.label}
                    </span>
                  </button>
                )
              })}
            </div>

            <div className="mt-5 flex-1" aria-live="polite">
              <AnimatePresence mode="wait" initial={false}>
                <motion.p
                  key={output.id}
                  lang={output.lang}
                  dir={output.dir}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -6 }}
                  transition={{ duration: 0.22, ease: [0.19, 1, 0.22, 1] }}
                  className={isRtl ? "font-urdu text-xl leading-[1.9]" : "text-xl leading-relaxed tracking-[-0.01em]"}
                >
                  {output.text}
                </motion.p>
              </AnimatePresence>
            </div>
            <p className="mt-5 font-mono text-xs text-bone-dim">Your notes, in any of 98 languages. Example text.</p>
          </div>
        </Reveal>
      </div>
    </section>
  )
}
