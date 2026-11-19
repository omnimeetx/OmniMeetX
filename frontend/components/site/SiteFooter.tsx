import Link from "next/link"
import { Logo } from "@/components/brand/Logo"
import AnimationsSwitch from "@/components/motion/AnimationsSwitch"
import { BRAND } from "@/lib/brand"

const COLUMNS = [
  {
    title: "Product",
    links: [
      { href: "/how-it-works", label: "How it works" },
      { href: "/pricing", label: "Pricing" },
      { href: "/upload", label: "Upload a recording" },
    ],
  },
  {
    title: "Your account",
    links: [
      { href: "/dashboard", label: "Dashboard" },
      { href: "/history", label: "History" },
      { href: "/feedback", label: "Feature requests" },
      { href: "/login", label: "Log in" },
    ],
  },
  {
    title: "Company",
    links: [
      { href: "/about", label: "About" },
      { href: "/contact", label: "Contact" },
      { href: "/privacy", label: "Privacy" },
      { href: "/terms", label: "Terms" },
      { href: "/refund-policy", label: "Refund policy" },
    ],
  },
]

export default function SiteFooter() {
  return (
    <footer className="page-gutter mt-8 border-t border-line pb-10 pt-16">
      <div className="page-width">
        <div className="grid gap-12 md:grid-cols-[1.4fr_repeat(3,1fr)]">
          <div className="max-w-xs">
            <Link href="/" aria-label={`${BRAND.name} home`} className="inline-block rounded-lg">
              <Logo />
            </Link>
            <p className="mt-4 text-sm leading-relaxed text-bone-muted">{BRAND.tagline}</p>
          </div>

          {COLUMNS.map((column) => (
            <nav key={column.title} aria-label={column.title}>
              <h3 className="label-mono !font-medium">{column.title}</h3>
              <ul className="mt-4 space-y-2.5">
                {column.links.map((link) => (
                  <li key={link.href}>
                    <Link href={link.href} className="text-sm text-bone-muted transition-colors duration-200 hover:text-bone">
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
          ))}
        </div>

        <div className="mt-14 flex flex-col gap-4 border-t border-line pt-6 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs text-bone-dim">
            &copy; {new Date().getFullYear()} {BRAND.name}. Built in Karachi.
          </p>
          <AnimationsSwitch />
        </div>
      </div>
    </footer>
  )
}
