import type { Metadata } from "next"
import type { ReactNode } from "react"
import Link from "next/link"
import Reveal from "@/components/motion/Reveal"
import SplitHeadline from "@/components/motion/SplitHeadline"
import { BRAND } from "@/lib/brand"

export const metadata: Metadata = {
  title: "Refund Policy",
  description: `Ask within 14 days of a payment and ${BRAND.name} gives you the full amount back. Here's how it works.`,
  alternates: { canonical: "/refund-policy" },
}

const LINK = "text-brand-light underline underline-offset-4 transition-colors duration-200 hover:text-bone"

const SECTIONS: { title: string; body: ReactNode }[] = [
  {
    title: "What's covered",
    body: (
      <>
        <p>
          Every payment for a paid plan, monthly or yearly, first payment or renewal. Ask within 14 days of the payment date and you get the full amount of
          that payment back. You don't have to give a reason.
        </p>
        <p>The free plan doesn't involve a payment, so there's nothing to refund.</p>
      </>
    ),
  },
  {
    title: "How to ask",
    body: (
      <>
        <p>
          Go to{" "}
          <a href="https://paddle.net" target="_blank" rel="noopener noreferrer" className={LINK}>
            paddle.net
          </a>{" "}
          and choose Request refund, or use the support link in your receipt email.
        </p>
        <p>
          You can also message us through the{" "}
          <Link href="/contact" className={LINK}>
            contact page
          </Link>
          . Use the email on your account so we can find your payment.
        </p>
      </>
    ),
  },
  {
    title: "Who sends the money back",
    body: (
      <>
        <p>
          Our order process is conducted by our online reseller Paddle.com. Paddle.com is the Merchant of Record for all our orders, so your receipt and the
          charge on your statement come from Paddle.
        </p>
        <p>Paddle returns the money to the payment method you used, where possible, within 14 days of approving the refund. Your bank may take a little longer to show it.</p>
      </>
    ),
  },
  {
    title: "What happens to your account",
    body: (
      <p>
        A refund ends that subscription. Your account moves to the free plan and you won't be charged again. Your transcripts and notes stay in your account, and
        you can still export them to PDF or Word.
      </p>
    ),
  },
  {
    title: "Cancelling without a refund",
    body: (
      <p>
        You can cancel whenever you like from Manage subscription on the{" "}
        <Link href="/pricing" className={LINK}>
          pricing page
        </Link>
        . You keep your plan until the end of the period you paid for, then you move to the free plan. Cancelling doesn't refund a payment on its own, so ask for a
        refund as well if you're within the 14 days.
      </p>
    ),
  },
  {
    title: "If a recording fails",
    body: <p>If a recording fails to process on our side, the minutes it used go back to your balance automatically. You don't need to ask. This returns minutes, not money.</p>,
  },
  {
    title: "After 14 days",
    body: (
      <p>
        Payments more than 14 days old aren't refundable. If we charged you by mistake or charged you twice, tell us and we'll put it right, whenever you notice.
        Nothing here takes away any rights you have under the law where you live.
      </p>
    ),
  },
  {
    title: "Questions",
    body: (
      <p>
        Send us a message through the{" "}
        <Link href="/contact" className={LINK}>
          contact page
        </Link>{" "}
        and we'll reply by email.
      </p>
    ),
  },
]

export default function RefundPolicyPage() {
  return (
    <>
      <section className="page-gutter pb-12 pt-36 md:pt-44">
        <div className="page-width">
          <p className="label-mono">Refund policy</p>
          <SplitHeadline as="h1" play="scroll" className="display-xl mt-5 max-w-4xl">
            14 days to <span className="font-accent text-brand-light">change your mind.</span>
          </SplitHeadline>
          <p className="lede mt-6 max-w-2xl">If {BRAND.name} isn't right for you, ask within 14 days of your payment and you get all of it back.</p>
          <p className="mt-4 text-sm text-bone-dim">Last updated November 5, 2026</p>
        </div>
      </section>

      <section className="page-gutter pb-24">
        <div className="page-width">
          {SECTIONS.map((section) => (
            <Reveal key={section.title} className="grid gap-4 border-t border-line py-10 lg:grid-cols-[1fr_1.6fr] lg:gap-10">
              <h2 className="text-xl tracking-[-0.02em] text-bone">{section.title}</h2>
              <div className="max-w-2xl space-y-4 text-lg leading-relaxed text-bone-muted">{section.body}</div>
            </Reveal>
          ))}
        </div>
      </section>
    </>
  )
}
