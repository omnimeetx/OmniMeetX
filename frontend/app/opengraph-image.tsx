import { ImageResponse } from "next/og"
import { BRAND } from "@/lib/brand"

// The picture shown when a link to the site is shared (WhatsApp, LinkedIn, X, Slack...).
// Edge runtime: next/og's bundled font loads reliably there (the Node build trips on Windows paths).
export const runtime = "edge"
export const alt = `${BRAND.name}: ${BRAND.tagline}`
export const size = { width: 1200, height: 630 }
export const contentType = "image/png"

const INK = "#12140f"
const CANVAS = "#fbfbf8"
const FOREST = "#1f7a3a"
const MUTED = "#5b5f55"

function Mark({ px }: { px: number }) {
  const u = px / 32
  const bar = (x: number, y: number, h: number) => (
    <div style={{ position: "absolute", left: x * u, top: y * u, width: 3.5 * u, height: h * u, borderRadius: 1.75 * u, background: "#ffffff" }} />
  )
  return (
    <div style={{ position: "relative", display: "flex", width: px, height: px, borderRadius: 9 * u, background: FOREST }}>
      {bar(8, 12, 8)}
      {bar(14.25, 7, 18)}
      {bar(20.5, 10.5, 11)}
    </div>
  )
}

export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", justifyContent: "space-between", background: CANVAS, padding: "72px 80px", color: INK }}>
        <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
          <Mark px={64} />
          <div style={{ fontSize: 40, fontWeight: 600, letterSpacing: "-0.03em" }}>{BRAND.name}</div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
          <div style={{ fontSize: 76, fontWeight: 600, lineHeight: 1.05, letterSpacing: "-0.04em", maxWidth: 980 }}>{BRAND.tagline}</div>
          <div style={{ fontSize: 30, color: MUTED, maxWidth: 900, lineHeight: 1.35 }}>
            Transcripts, summaries and action items from your recordings, in Urdu, English and 96 more languages.
          </div>
        </div>
        <div style={{ display: "flex", height: 8, width: 160, borderRadius: 4, background: FOREST }} />
      </div>
    ),
    size,
  )
}
