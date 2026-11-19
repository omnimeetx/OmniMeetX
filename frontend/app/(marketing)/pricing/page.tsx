"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { Check } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"
import NumberTicker from "@/components/motion/NumberTicker"
import Reveal from "@/components/motion/Reveal"
import SplitHeadline from "@/components/motion/SplitHeadline"
import { motion } from "framer-motion"
import { toast } from "sonner"
import { useBilling, type BillingStatus } from "@/hooks/useBilling"
import { getPaddle } from "@/lib/paddle"

function subscriptionLabel(status: BillingStatus) {
    if (status.cancel_at) return `Cancels on ${new Date(status.cancel_at).toLocaleDateString()}`
    switch (status.subscription_status) {
        case "active": return "Active"
        case "trialing": return "Trial"
        case "past_due": return "Payment failed, please update your card"
        case "paused": return "Paused"
        default: return "Free plan"
    }
}

// Every plan has every feature (nothing in the backend is gated by plan), so plans differ only in minutes.
const EVERY_PLAN = [
    "Upload audio and video",
    "Transcripts and notes in 98 languages",
    "Summaries, decisions and action items",
    "Export to PDF and Word",
]

// What can be bought today: Pro, monthly. To sell another price, create it in Paddle, put its
// ID in backend/.env, then add the plan here (Premium was $29/month or $290/year, 3,000 minutes)
// or turn on SELLING_YEARLY. Clicking a plan with no price ID only shows an error.
const SELLING_YEARLY = false

const PLANS = [
    { id: "free", name: "Starter", blurb: "Try it on real meetings.", monthly: 0, yearly: 0, minutes: 60, cta: "Start free" },
    { id: "pro", name: "Pro", blurb: "For people in meetings most days.", monthly: 12, yearly: 120, minutes: 1200, cta: "Upgrade to Pro", popular: true },
    { id: "enterprise", name: "Enterprise", blurb: "For a lot of minutes, priced with you.", monthly: null, yearly: null, minutes: 12000, cta: "Talk to us" },
]

const FAQ = [
    { q: "What happens if I run out of minutes?", a: "You can't process new recordings until your minutes refill next month, or until you upgrade. Everything you've already processed stays where it is." },
    { q: "Can I cancel any time?", a: "Yes. Use Manage subscription below. You keep your plan until the end of the period you paid for, then you move to the free plan." },
    { q: "Can I get a refund?", a: <>Yes. Ask within 14 days of a payment and you get the full amount back, no reason needed. Our <Link href="/refund-policy" className="text-brand-light underline underline-offset-4">refund policy</Link> explains how.</> },
    { q: "Who handles the payment?", a: "Paddle.com is our online reseller and the Merchant of Record for all our orders. They process your card and handle sales tax, and we never see your card number." },
]

export default function PricingPage() {
    const { status, openCheckout, manageSubscription, refresh } = useBilling()
    const [isYearly, setIsYearly] = useState(false)

    // This page is Paddle's default payment link. Its emails (like "update your card" after a failed
    // renewal) land here with ?_ptxn=..., and Paddle.js opens that checkout as soon as it loads.
    useEffect(() => {
        if (new URLSearchParams(window.location.search).has("_ptxn")) getPaddle()
    }, [])

    // Back from Paddle checkout (?upgraded=pro): the payment webhook can take a
    // few seconds, so poll until the new plan shows up.
    useEffect(() => {
        const upgraded = new URLSearchParams(window.location.search).get("upgraded")
        if (!upgraded) return
        window.history.replaceState(null, "", "/pricing")
        const waiting = toast.loading("Payment received. Activating your plan...")
        let attempts = 0
        const timer = setInterval(async () => {
            attempts += 1
            const latest = await refresh()
            if (latest?.plan === upgraded) {
                clearInterval(timer)
                toast.success(`You're on ${latest.plan_name} now. Enjoy!`, { id: waiting })
            } else if (attempts >= 15) {
                clearInterval(timer)
                toast.info("Your payment is being processed. Your plan will update in a minute.", { id: waiting })
            }
        }, 2000)
        return () => clearInterval(timer)
    }, [refresh])

    const currentPlan = status?.plan || "free"

    const handlePlanClick = (planId: string) => {
        if (planId === "free") {
            window.location.href = "/signup"
            return
        }
        if (planId === "enterprise") {
            window.location.href = "/contact"
            return
        }
        if (planId === currentPlan) return
        openCheckout(planId, isYearly ? "year" : "month")
    }

    return (
        <div className="page-gutter pb-16 pt-28 md:pt-32">
            <div className="page-width">
                <p className="label-mono">Pricing</p>
                <SplitHeadline as="h1" play="scroll" className="display-lg mt-5 max-w-4xl">
                    Same product on every plan. <span className="font-accent text-brand-light">You just buy more minutes.</span>
                </SplitHeadline>
                <p className="lede mt-5 max-w-2xl">One credit is one minute of audio. Start with 60 free minutes a month and upgrade when you run out.</p>

                {SELLING_YEARLY && <div role="group" aria-label="Billing period" className="mt-8 inline-flex gap-1 rounded-[14px] border border-line p-1">
                    {[
                        { yearly: false, label: "Monthly" },
                        { yearly: true, label: "Yearly, 2 months free" },
                    ].map((option) => {
                        const selected = isYearly === option.yearly
                        return (
                            <button
                                key={option.label}
                                type="button"
                                aria-pressed={selected}
                                onClick={() => setIsYearly(option.yearly)}
                                className={`relative rounded-[10px] px-4 py-2 text-sm transition-colors duration-200 ${selected ? "text-bone" : "text-bone-dim hover:text-bone-muted"}`}
                            >
                                {selected && (
                                    <motion.span
                                        layoutId="billing-period"
                                        className="absolute inset-0 rounded-[10px] bg-white/[0.07]"
                                        transition={{ type: "spring", stiffness: 420, damping: 36 }}
                                    />
                                )}
                                <span className="relative">{option.label}</span>
                            </button>
                        )
                    })}
                </div>}

                <Reveal className="mt-8 grid gap-4 md:grid-cols-3">
                    {PLANS.map((plan) => {
                        const isCurrent = plan.id === currentPlan && Boolean(status)
                        const price = isYearly ? plan.yearly : plan.monthly
                        return (
                            <article
                                key={plan.id}
                                data-testid={`plan-${plan.id}`}
                                className={`spot-card flex flex-col p-6 ${plan.popular ? "!border-brand/40" : ""}`}
                            >
                                <div className="flex items-center justify-between gap-2">
                                    <h2 className="text-lg tracking-[-0.02em]">{plan.name}</h2>
                                    {plan.popular && <span className="glass-badge">Most popular</span>}
                                </div>
                                <p className="mt-2 text-sm text-bone-muted">{plan.blurb}</p>

                                <p className="mt-6 flex items-baseline gap-1.5">
                                    <span className="font-mono text-4xl tracking-[-0.05em] tabular-nums">{price === null ? "Custom" : `$${price}`}</span>
                                    {price !== null && price > 0 && <span className="text-sm text-bone-dim">/{isYearly ? "year" : "month"}</span>}
                                </p>
                                {isYearly && plan.monthly ? (
                                    <p className="mt-1 text-xs text-brand-light">Save ${plan.monthly * 12 - (plan.yearly ?? 0)} a year</p>
                                ) : (
                                    <p className="mt-1 text-xs text-transparent" aria-hidden="true">
                                        &nbsp;
                                    </p>
                                )}

                                <p className="mt-6 border-t border-line pt-5 text-sm">
                                    <span className="font-mono tabular-nums">{plan.minutes.toLocaleString("en-US")}{plan.id === "enterprise" ? "+" : ""}</span> minutes a month
                                </p>

                                <Button
                                    onClick={() => handlePlanClick(plan.id)}
                                    disabled={isCurrent}
                                    variant={plan.popular ? "default" : "outline"}
                                    className={`mt-6 w-full ${plan.popular ? "btn-primary" : ""}`}
                                >
                                    {isCurrent ? "Current plan" : plan.cta}
                                </Button>
                            </article>
                        )
                    })}
                </Reveal>

                <Reveal className="spot-card mt-4 grid gap-6 p-6 md:grid-cols-[1fr_2fr] md:p-8">
                    <h2 className="text-lg tracking-[-0.02em]">Included in every plan</h2>
                    <ul className="grid gap-3 sm:grid-cols-2">
                        {EVERY_PLAN.map((feature) => (
                            <li key={feature} className="flex items-start gap-2.5 text-[0.9375rem]">
                                <Check className="mt-1 h-4 w-4 shrink-0 text-brand-light" />
                                {feature}
                            </li>
                        ))}
                    </ul>
                </Reveal>

                {status && (
                    <section aria-labelledby="usage-title" className="spot-card mt-4 p-6 md:p-8" data-testid="usage-card">
                        <h2 id="usage-title" className="label-mono">Your usage this month</h2>
                        <p className="mt-4 font-mono text-5xl tracking-[-0.05em]">
                            <NumberTicker value={status.credits_remaining} />
                        </p>
                        <p className="mt-1 text-sm text-bone-muted">of {status.credits_total.toLocaleString()} minutes left</p>
                        <div className="mt-4 h-1.5 max-w-xl overflow-hidden rounded-full bg-white/10">
                            <div
                                className={`h-full rounded-full ${status.credits_remaining / status.credits_total > 0.2 ? "bg-brand" : "bg-danger"}`}
                                style={{ width: `${Math.max(2, (status.credits_remaining / status.credits_total) * 100)}%` }}
                            />
                        </div>
                        <p className="mt-3 text-xs text-bone-dim">{status.plan_name} plan. {subscriptionLabel(status)}</p>
                        {status.can_manage_subscription && (
                            <Button onClick={manageSubscription} variant="outline" className="mt-6">
                                Manage subscription
                            </Button>
                        )}
                    </section>
                )}

                <div className="mt-24 grid gap-10 lg:grid-cols-[1fr_1.6fr]">
                    <SplitHeadline className="display-md">Questions about paying</SplitHeadline>
                    <Reveal>
                        <Accordion type="single" collapsible>
                            {FAQ.map((item) => (
                                <AccordionItem key={item.q} value={item.q} className="border-line">
                                    <AccordionTrigger className="py-5 text-left text-base font-normal tracking-[-0.01em] hover:no-underline">{item.q}</AccordionTrigger>
                                    <AccordionContent className="pb-5 text-[0.9375rem] leading-relaxed text-bone-muted">{item.a}</AccordionContent>
                                </AccordionItem>
                            ))}
                        </Accordion>
                    </Reveal>
                </div>
            </div>
        </div>
    )
}
