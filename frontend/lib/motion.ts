"use client"

/**
 * Motion preference plus GSAP setup, shared by everything in components/motion.
 *
 * Three states, because Windows often has animations switched off without
 * people knowing, and browsers report that as "reduce":
 *   auto  follow the OS setting (default)
 *   on    the visitor flipped the footer switch on, so animate regardless
 *   off   the visitor flipped it off, so never animate
 */
import { useSyncExternalStore } from "react"
import gsap from "gsap"
import { ScrollTrigger } from "gsap/ScrollTrigger"
import { SplitText } from "gsap/SplitText"
import { useGSAP } from "@gsap/react"

gsap.registerPlugin(ScrollTrigger, SplitText, useGSAP)

export { gsap, ScrollTrigger, SplitText, useGSAP }

export type MotionPref = "auto" | "on" | "off"

export const MOTION_STORAGE_KEY = "omnimeet:animations"
export const INTRO_STORAGE_KEY = "omnimeet:intro-seen"

const REDUCE_QUERY = "(prefers-reduced-motion: reduce)"
const listeners = new Set<() => void>()
let cachedPref: MotionPref | null = null

function readPref(): MotionPref {
  if (cachedPref) return cachedPref
  try {
    const stored = localStorage.getItem(MOTION_STORAGE_KEY)
    cachedPref = stored === "on" || stored === "off" ? stored : "auto"
  } catch {
    cachedPref = "auto"
  }
  return cachedPref
}

function osReducesMotion() {
  return window.matchMedia(REDUCE_QUERY).matches
}

function subscribe(listener: () => void) {
  listeners.add(listener)
  const media = window.matchMedia(REDUCE_QUERY)
  media.addEventListener("change", listener)
  return () => {
    listeners.delete(listener)
    media.removeEventListener("change", listener)
  }
}

function resolveEnabled(pref: MotionPref) {
  return pref === "on" || (pref === "auto" && !osReducesMotion())
}

export function applyMotionAttribute() {
  document.documentElement.dataset.motion = resolveEnabled(readPref()) ? "on" : "off"
}

export function setMotionEnabled(enabled: boolean) {
  cachedPref = enabled ? "on" : "off"
  try {
    localStorage.setItem(MOTION_STORAGE_KEY, cachedPref)
  } catch {
    // Private mode: the choice still holds for this page view.
  }
  applyMotionAttribute()
  listeners.forEach((listener) => listener())
}

export function useMotionPref(): MotionPref {
  return useSyncExternalStore(subscribe, readPref, () => "auto")
}

export function useMotionEnabled(): boolean {
  return useSyncExternalStore(
    subscribe,
    () => resolveEnabled(readPref()),
    () => true,
  )
}

/** The media query string gsap.matchMedia should gate on for a given preference. */
export function motionQuery(pref: MotionPref) {
  if (pref === "on") return "all"
  if (pref === "off") return "not all"
  return "(prefers-reduced-motion: no-preference)"
}
