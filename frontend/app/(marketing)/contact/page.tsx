"use client"
import { API_URL } from "@/lib/config"

import type React from "react"
import { useState, useEffect } from "react"
import { AnimatePresence, motion } from "framer-motion"
import { CheckCircle, Clock, Loader2, Mail, MapPin, Phone, Send } from "lucide-react"
import Reveal from "@/components/motion/Reveal"
import SplitHeadline from "@/components/motion/SplitHeadline"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { authService } from "@/lib/auth"
import { BRAND } from "@/lib/brand"
import { toast } from "sonner"

const DETAILS = [
  { icon: Mail, label: "Email", value: BRAND.supportEmail, href: `mailto:${BRAND.supportEmail}` },
  { icon: Phone, label: "Phone", value: "+92 304 2278844", href: "tel:+923042278844" },
  { icon: MapPin, label: "Office", value: "Metro Star Gate, Karachi, Pakistan" },
]

const HOURS = [
  ["Monday to Friday", "9:00 to 18:00 PKT"],
  ["Saturday", "10:00 to 16:00 PKT"],
  ["Sunday", "Closed"],
]

export default function ContactPage() {
  const [formData, setFormData] = useState({ name: "", email: "", subject: "", message: "" })
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [sent, setSent] = useState(false)
  const [signedIn, setSignedIn] = useState(false)

  useEffect(() => {
    const fetchUser = async () => {
      if (authService.isAuthenticated()) {
        setSignedIn(true)
        const { success, user } = await authService.getProfile()
        if (success && user) {
          setFormData((prev) => ({ ...prev, name: user.full_name, email: user.email }))
        }
      }
    }
    fetchUser()
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    try {
      const res = await fetch(`${API_URL}/api/contact`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${authService.getToken() || ""}` },
        body: JSON.stringify(formData),
      })
      const data = await res.json()
      if (res.ok) {
        setFormData((prev) => ({ ...prev, subject: "", message: "" }))
        setSent(true)
      } else {
        toast.error(data.error || "Failed to send message")
      }
    } catch {
      toast.error("Network error. Please try again.")
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }))

  return (
    <section className="page-gutter pb-16 pt-36 md:pt-44">
      <div className="page-width">
        <p className="label-mono">Contact</p>
        <SplitHeadline as="h1" play="scroll" className="display-xl mt-5 max-w-3xl">
          Talk to the people <span className="font-accent whitespace-nowrap text-brand-light">who built it.</span>
        </SplitHeadline>

        <Reveal className="mt-14 grid gap-4 lg:grid-cols-[1.4fr_1fr]">
          <div className="spot-card p-6 md:p-8">
            <AnimatePresence mode="wait" initial={false}>
              {sent ? (
                <motion.div
                  key="sent"
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className="flex min-h-[24rem] flex-col items-start justify-center"
                  role="status"
                >
                  <span className="tile-accent flex h-12 w-12 items-center justify-center rounded-full">
                    <CheckCircle className="h-6 w-6" />
                  </span>
                  <h2 className="display-md mt-6">Message sent.</h2>
                  <p className="mt-3 text-bone-muted">We read every message and reply by email.</p>
                  <button type="button" onClick={() => setSent(false)} className="btn btn-ghost btn-sm mt-6">
                    Send another
                  </button>
                </motion.div>
              ) : (
                <motion.form key="form" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onSubmit={handleSubmit} className="space-y-5" data-testid="contact-form">
                  <div className="grid gap-5 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="name">Name</Label>
                      <Input id="name" name="name" type="text" required value={formData.name} onChange={handleChange} placeholder="Your name" disabled={signedIn} />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="email">Email</Label>
                      <Input id="email" name="email" type="email" required value={formData.email} onChange={handleChange} placeholder="you@example.com" disabled={signedIn} />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="subject">Subject</Label>
                    <Input id="subject" name="subject" type="text" required value={formData.subject} onChange={handleChange} placeholder="What's this about?" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="message">Message</Label>
                    <Textarea id="message" name="message" required value={formData.message} onChange={handleChange} className="min-h-40" placeholder="Tell us a bit more..." />
                  </div>
                  <Button type="submit" disabled={isSubmitting} className="btn-primary w-full sm:w-auto">
                    {isSubmitting ? <Loader2 className="animate-spin" /> : <Send />}
                    {isSubmitting ? "Sending..." : "Send message"}
                  </Button>
                </motion.form>
              )}
            </AnimatePresence>
          </div>

          <div className="flex flex-col gap-4">
            <ul className="spot-card divide-y divide-line">
              {DETAILS.map(({ icon: Icon, label, value, href }) => (
                <li key={label} className="flex items-start gap-4 p-5">
                  <Icon className="mt-0.5 h-4 w-4 shrink-0 text-brand-light" />
                  <div className="min-w-0">
                    <p className="label-mono">{label}</p>
                    {href ? (
                      <a href={href} className="mt-1 block break-words text-[0.9375rem] transition-colors duration-200 hover:text-brand-light">
                        {value}
                      </a>
                    ) : (
                      <p className="mt-1 text-[0.9375rem]">{value}</p>
                    )}
                  </div>
                </li>
              ))}
            </ul>

            <div className="spot-card p-5">
              <div className="flex items-center gap-2.5">
                <Clock className="h-4 w-4 text-brand-light" />
                <p className="label-mono">Hours</p>
              </div>
              <dl className="mt-4 space-y-2 text-sm">
                {HOURS.map(([day, hours]) => (
                  <div key={day} className="flex justify-between gap-4">
                    <dt className="text-bone-muted">{day}</dt>
                    <dd className="font-mono text-xs leading-5">{hours}</dd>
                  </div>
                ))}
              </dl>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  )
}
