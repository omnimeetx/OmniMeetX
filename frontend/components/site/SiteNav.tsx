"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { AnimatePresence, motion } from "framer-motion"
import { ArrowUpRight, Menu, X } from "lucide-react"
import { useLenis } from "lenis/react"
import { Logo } from "@/components/brand/Logo"
import { useAccount } from "@/hooks/useAccount"

const LINKS = [
  { href: "/how-it-works", label: "How it works" },
  { href: "/pricing", label: "Pricing" },
  { href: "/about", label: "About" },
  { href: "/contact", label: "Contact" },
]

export default function SiteNav() {
  const pathname = usePathname()
  const { isLoggedIn } = useAccount()
  const [scrolled, setScrolled] = useState(false)
  const [open, setOpen] = useState(false)
  const lenis = useLenis()

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12)
    onScroll()
    window.addEventListener("scroll", onScroll, { passive: true })
    return () => window.removeEventListener("scroll", onScroll)
  }, [])

  useEffect(() => setOpen(false), [pathname])

  // The open menu covers the page, so hold the page still behind it.
  useEffect(() => {
    if (open) lenis?.stop()
    else lenis?.start()
    document.documentElement.style.overflow = open ? "hidden" : ""
    if (!open) return
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false)
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [open, lenis])

  return (
    <header className={`fixed inset-x-0 top-0 z-50 transition-colors duration-300 ${scrolled || open ? "glass-nav" : "border-b border-transparent"}`}>
      <a href="#main" className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-3 focus:z-50 focus:rounded-lg focus:bg-panel-3 focus:px-3 focus:py-2 focus:text-sm">
        Skip to content
      </a>
      <div className="page-gutter">
        <nav aria-label="Main" className="page-width flex h-16 items-center justify-between gap-6">
          <Link href="/" aria-label="OmniMeetX home" className="rounded-lg">
            <Logo />
          </Link>

          <ul className="hidden items-center gap-1 md:flex">
            {LINKS.map((link) => {
              const active = pathname === link.href
              return (
                <li key={link.href} className="relative">
                  <Link
                    href={link.href}
                    aria-current={active ? "page" : undefined}
                    className={`relative z-10 block rounded-lg px-3.5 py-2 text-sm transition-colors duration-200 ${active ? "text-bone" : "text-bone-muted hover:text-bone"}`}
                  >
                    {link.label}
                  </Link>
                  {active && (
                    <motion.span
                      layoutId="site-nav-active"
                      className="absolute inset-0 rounded-lg bg-white/[0.06]"
                      transition={{ type: "spring", stiffness: 420, damping: 36 }}
                    />
                  )}
                </li>
              )
            })}
          </ul>

          <div className="hidden items-center gap-2 md:flex">
            {isLoggedIn ? (
              <Link href="/dashboard" className="btn btn-primary btn-sm" data-testid="nav-dashboard">
                Open dashboard
                <ArrowUpRight />
              </Link>
            ) : (
              <>
                <Link href="/login" className="rounded-lg px-3 py-2 text-sm text-bone-muted transition-colors duration-200 hover:text-bone">
                  Log in
                </Link>
                <Link href="/signup" className="btn btn-primary btn-sm" data-testid="nav-signup">
                  Start free
                </Link>
              </>
            )}
          </div>

          <button
            type="button"
            onClick={() => setOpen((value) => !value)}
            aria-expanded={open}
            aria-controls="site-menu"
            aria-label={open ? "Close menu" : "Open menu"}
            className="btn btn-ghost btn-sm !px-2.5 md:hidden"
          >
            {open ? <X /> : <Menu />}
          </button>
        </nav>
      </div>

      <AnimatePresence>
        {open && (
          <motion.div
            id="site-menu"
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.22, ease: [0.19, 1, 0.22, 1] }}
            className="page-gutter h-[calc(100dvh-4rem)] overflow-y-auto bg-canvas pb-10 pt-4 md:hidden"
          >
            <ul className="flex flex-col">
              {LINKS.map((link) => (
                <li key={link.href} className="border-b border-line">
                  <Link href={link.href} className="flex items-center justify-between py-4 text-2xl tracking-[-0.03em]">
                    {link.label}
                    <ArrowUpRight className="h-5 w-5 text-bone-dim" />
                  </Link>
                </li>
              ))}
            </ul>
            <div className="mt-8 flex flex-col gap-3">
              {isLoggedIn ? (
                <Link href="/dashboard" className="btn btn-primary">
                  Open dashboard
                </Link>
              ) : (
                <>
                  <Link href="/signup" className="btn btn-primary">
                    Start free
                  </Link>
                  <Link href="/login" className="btn btn-ghost">
                    Log in
                  </Link>
                </>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  )
}
