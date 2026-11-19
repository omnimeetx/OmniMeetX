/** Three bouncing dots for "the AI is working". Announced once to screen readers. */
export default function TypingDots({ label = "Working", className }: { label?: string; className?: string }) {
  return (
    <span role="status" aria-label={label} className={`typing-dots ${className ?? ""}`}>
      <span />
      <span />
      <span />
    </span>
  )
}
