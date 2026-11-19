/**
 * The website's public address (https://omnimeetx.com in production).
 * Canonical links, sitemap.xml, robots.txt and social previews are built from it,
 * so set NEXT_PUBLIC_SITE_URL on the host before building.
 */
export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000").replace(/\/+$/, "")

/** Public pages search engines should list, with how often they change. */
export const PUBLIC_PAGES: { path: string; priority: number; changeFrequency: "weekly" | "monthly" | "yearly" }[] = [
  { path: "/", priority: 1, changeFrequency: "weekly" },
  { path: "/pricing", priority: 0.9, changeFrequency: "monthly" },
  { path: "/how-it-works", priority: 0.8, changeFrequency: "monthly" },
  { path: "/about", priority: 0.6, changeFrequency: "monthly" },
  { path: "/contact", priority: 0.5, changeFrequency: "yearly" },
  { path: "/terms", priority: 0.3, changeFrequency: "yearly" },
  { path: "/privacy", priority: 0.3, changeFrequency: "yearly" },
  { path: "/refund-policy", priority: 0.3, changeFrequency: "yearly" },
]

/** Signed-in areas: nothing there is useful to a search engine, and it would only see a login wall. */
export const PRIVATE_PATHS = [
  "/dashboard", "/upload", "/history", "/favorite", "/feedback", "/profile", "/processing",
  "/meeting-notes", "/meeting", "/create-meeting", "/friends", "/admin", "/users",
  "/login", "/otp", "/forgot-password", "/reset-password", "/reset-pin", "/sso-callback", "/monitoring",
]
