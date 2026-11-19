import type { ReactNode } from "react"
import Link from "next/link"
import { Logo } from "@/components/brand/Logo"

const SAMPLE_ACTIONS = ["Publish the pricing page by Friday", "Send the client a price breakdown"]

/** Heading used at the top of each auth form. */
export function AuthHeading({ title, description }: { title: ReactNode; description?: ReactNode }) {
  return (
    <div className="mb-8">
      <h1 className="display-md">{title}</h1>
      {description && <p className="mt-3 text-[0.9375rem] leading-relaxed text-bone-muted">{description}</p>}
    </div>
  )
}

/** Form on one side, a quiet picture of the product on the other. Phones get the form alone. */
export default function AuthShell({ children }: { children: ReactNode }) {
  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      <div className="page-gutter flex min-h-screen flex-col py-6">
        <Link href="/" className="self-start rounded-lg" aria-label="OmniMeetX home">
          <Logo />
        </Link>

        <main id="main" className="flex flex-1 items-center justify-center py-10">
          <div className="w-full max-w-[26rem]">{children}</div>
        </main>

        <nav aria-label="Legal" className="flex gap-5 text-xs text-bone-dim">
          <Link href="/terms" className="transition-colors duration-200 hover:text-bone">
            Terms
          </Link>
          <Link href="/privacy" className="transition-colors duration-200 hover:text-bone">
            Privacy
          </Link>
          <Link href="/contact" className="transition-colors duration-200 hover:text-bone">
            Contact
          </Link>
        </nav>
      </div>

      <aside
        aria-hidden="true"
        className="relative hidden flex-col justify-end overflow-hidden border-l border-line bg-panel p-12 lg:flex"
        style={{ backgroundImage: "radial-gradient(60% 50% at 70% 20%, rgba(var(--brand-rgb), 0.14), transparent)" }}
      >
        <p className="display-lg max-w-lg">
          Every meeting, written up <span className="font-accent whitespace-nowrap text-brand-light">in your language.</span>
        </p>

        <div className="mt-10 max-w-md rounded-[18px] border border-line-strong bg-panel-2 p-5">
          <p className="label-mono">Example notes</p>
          <p className="mt-3 text-sm leading-relaxed text-bone-muted">Pricing goes live Friday. The client asked for a full price breakdown.</p>
          <ul className="mt-4 space-y-2 border-t border-line pt-4">
            {SAMPLE_ACTIONS.map((action) => (
              <li key={action} className="flex items-center gap-2.5 text-sm">
                <span className="h-1.5 w-1.5 rounded-full bg-brand" />
                {action}
              </li>
            ))}
          </ul>
        </div>
      </aside>
    </div>
  )
}
