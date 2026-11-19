/**
 * Ask the sidebar's minutes meter to reload just its numbers (no page refresh).
 * Call it whenever minutes may have changed: a meeting was processed, a plan changed.
 */
export const refreshCredits = () => {
  if (typeof window !== "undefined") window.dispatchEvent(new Event("credits-changed"))
}
