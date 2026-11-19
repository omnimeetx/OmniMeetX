"use client"

import { useEffect, useState, type ReactNode } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { motion } from "framer-motion"
import {
  CreditCard,
  History,
  LayoutDashboard,
  Lightbulb,
  LogOut,
  Menu,
  Settings,
  ShieldCheck,
  Star,
  Upload,
  type LucideIcon,
} from "lucide-react"
import { Logo } from "@/components/brand/Logo"
import { Sheet, SheetContent, SheetDescription, SheetTitle } from "@/components/ui/sheet"
import { useAccount } from "@/hooks/useAccount"

interface NavItem {
  href: string
  label: string
  icon: LucideIcon
  /** Other routes that belong to this item, like a meeting's notes under History. */
  matches?: string[]
}

const GROUPS: { label: string; items: NavItem[] }[] = [
  {
    label: "Workspace",
    items: [
      { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
      { href: "/upload", label: "Upload", icon: Upload },
      { href: "/history", label: "History", icon: History, matches: ["/meeting-notes", "/processing"] },
      { href: "/favorite", label: "Favorites", icon: Star },
    ],
  },
  {
    label: "Community",
    items: [
      { href: "/feedback", label: "Feature requests", icon: Lightbulb },
    ],
  },
  {
    label: "Account",
    items: [
      { href: "/pricing", label: "Plans and billing", icon: CreditCard },
      { href: "/profile", label: "Settings", icon: Settings },
    ],
  },
]

const ADMIN_ITEM: NavItem = { href: "/admin", label: "Admin", icon: ShieldCheck, matches: ["/users"] }

function isCurrent(pathname: string, item: NavItem) {
  return [item.href, ...(item.matches ?? [])].some((route) => pathname === route || pathname.startsWith(`${route}/`))
}

function NavLink({ item, pathname, indicatorId, onNavigate }: { item: NavItem; pathname: string; indicatorId: string; onNavigate?: () => void }) {
  const current = isCurrent(pathname, item)
  const Icon = item.icon

  return (
    <li className="relative">
      {current && (
        <motion.span
          layoutId={indicatorId}
          className="absolute inset-0 rounded-[10px] bg-white/[0.07]"
          transition={{ type: "spring", stiffness: 460, damping: 38 }}
        />
      )}
      <Link
        href={item.href}
        onClick={onNavigate}
        aria-current={current ? "page" : undefined}
        className={`relative flex items-center gap-3 rounded-[10px] px-3 py-2 text-sm transition-colors duration-200 ${current ? "text-bone" : "text-bone-muted hover:text-bone"}`}
      >
        <Icon className={`h-4 w-4 shrink-0 transition-colors duration-200 ${current ? "text-brand-light" : "text-bone-dim"}`} />
        {item.label}
      </Link>
    </li>
  )
}

function MinutesMeter() {
  const { minutes } = useAccount()
  if (!minutes) return null

  const share = minutes.total > 0 ? minutes.remaining / minutes.total : 0
  const barColor = share > 0.2 ? "var(--brand)" : share > 0.05 ? "var(--warn)" : "var(--danger)"

  return (
    <Link href="/pricing" className="block rounded-[12px] border border-line p-3 transition-colors duration-200 hover:border-line-strong" data-testid="minutes-meter">
      <div className="flex items-baseline justify-between gap-2">
        <span className="label-mono">{minutes.planName}</span>
        <span className="font-mono text-xs tabular-nums text-bone-muted">{minutes.remaining.toLocaleString()} min</span>
      </div>
      <div
        role="progressbar"
        aria-label="Minutes left this month"
        aria-valuemin={0}
        aria-valuemax={minutes.total}
        aria-valuenow={minutes.remaining}
        className="mt-2.5 h-1 overflow-hidden rounded-full bg-white/10"
      >
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${Math.max(2, share * 100)}%` }}
          transition={{ duration: 0.9, ease: [0.19, 1, 0.22, 1] }}
          className="h-full rounded-full"
          style={{ backgroundColor: barColor }}
        />
      </div>
    </Link>
  )
}

function SidebarContent({ indicatorId, onNavigate }: { indicatorId: string; onNavigate?: () => void }) {
  const pathname = usePathname() || "/"
  const { isLoggedIn, isAdmin, displayName, email, initials, imageUrl, logout } = useAccount()

  return (
    <div className="flex h-full flex-col">
      <div className="flex h-16 shrink-0 items-center px-4">
        <Link href="/" onClick={onNavigate} className="rounded-lg" aria-label="OmniMeetX home">
          <Logo />
        </Link>
      </div>

      <nav aria-label="App" className="flex-1 space-y-6 overflow-y-auto px-3 py-3">
        {GROUPS.map((group) => (
          <div key={group.label}>
            <p className="label-mono mb-2 px-3">{group.label}</p>
            <ul className="space-y-0.5">
              {group.items.map((item) => (
                <NavLink key={item.href} item={item} pathname={pathname} indicatorId={indicatorId} onNavigate={onNavigate} />
              ))}
            </ul>
          </div>
        ))}
        {isAdmin && (
          <ul className="space-y-0.5">
            <NavLink item={ADMIN_ITEM} pathname={pathname} indicatorId={indicatorId} onNavigate={onNavigate} />
          </ul>
        )}
      </nav>

      <div className="shrink-0 space-y-3 border-t border-line p-3">
        <MinutesMeter />
        {isLoggedIn ? (
          <div className="flex items-center gap-3 px-1">
            {imageUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={imageUrl} alt="" className="h-8 w-8 shrink-0 rounded-full object-cover" />
            ) : (
              <span className="tile-accent flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-medium">{initials}</span>
            )}
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm">{displayName}</p>
              <p className="truncate text-xs text-bone-dim">{email}</p>
            </div>
            <button
              type="button"
              onClick={logout}
              aria-label="Log out"
              title="Log out"
              data-testid="logout"
              className="shrink-0 rounded-lg p-2 text-bone-dim transition-colors duration-200 hover:bg-white/5 hover:text-danger"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        ) : (
          <Link href="/login" onClick={onNavigate} className="btn btn-ghost btn-sm w-full">
            Log in
          </Link>
        )}
      </div>
    </div>
  )
}

/** Sidebar on desktop, slide-in drawer on phones. Lives in the layout, so it never remounts between pages. */
export default function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname()
  const [drawerOpen, setDrawerOpen] = useState(false)

  useEffect(() => setDrawerOpen(false), [pathname])

  return (
    <div className="min-h-screen lg:pl-60">
      <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-3 focus:z-50 focus:rounded-lg focus:bg-panel-3 focus:px-3 focus:py-2 focus:text-sm">
        Skip to content
      </a>

      <aside className="fixed inset-y-0 left-0 z-40 hidden w-60 border-r border-line bg-panel lg:block" data-testid="app-sidebar">
        <SidebarContent indicatorId="sidebar-active" />
      </aside>

      <header className="glass-nav sticky top-0 z-40 flex h-14 items-center justify-between px-4 lg:hidden">
        <Link href="/" className="rounded-lg" aria-label="OmniMeetX home">
          <Logo size={24} />
        </Link>
        <button
          type="button"
          onClick={() => setDrawerOpen(true)}
          aria-label="Open menu"
          aria-expanded={drawerOpen}
          data-testid="app-menu"
          className="btn btn-ghost btn-sm !px-2.5"
        >
          <Menu />
        </button>
      </header>

      <Sheet open={drawerOpen} onOpenChange={setDrawerOpen}>
        <SheetContent side="left" className="w-72 border-line bg-panel p-0">
          <SheetTitle className="sr-only">Menu</SheetTitle>
          <SheetDescription className="sr-only">Move around your workspace</SheetDescription>
          <SidebarContent indicatorId="drawer-active" onNavigate={() => setDrawerOpen(false)} />
        </SheetContent>
      </Sheet>

      <main id="main">{children}</main>
    </div>
  )
}
