"use client"

import { useEffect, useRef } from "react"

/** The 11-character video id from any common YouTube link, or null. */
export function youTubeId(url?: string | null): string | null {
  if (!url) return null
  const match = url.match(/(?:youtube\.com\/(?:watch\?(?:.*&)?v=|embed\/|shorts\/|live\/|v\/)|youtu\.be\/)([A-Za-z0-9_-]{11})/)
  return match ? match[1] : null
}

interface YTPlayer {
  getCurrentTime(): number
  getDuration(): number
  getPlaybackRate(): number
  seekTo(seconds: number, allowSeekAhead: boolean): void
  setPlaybackRate(rate: number): void
  playVideo(): void
  pauseVideo(): void
  destroy(): void
}

/**
 * YouTube's player dressed as an <audio>/<video> element: currentTime, duration,
 * playbackRate, play(), pause(), and "timeupdate" / "loadedmetadata" events.
 * The notes page's seek buttons, speed buttons, timer and highlighted transcript
 * all work through this without knowing it's YouTube.
 */
export class YouTubeMedia extends EventTarget {
  constructor(private player: YTPlayer) {
    super()
  }
  get currentTime() {
    return this.player.getCurrentTime() || 0
  }
  set currentTime(seconds: number) {
    this.player.seekTo(Math.max(0, seconds), true)
    this.dispatchEvent(new Event("timeupdate"))
  }
  get duration() {
    return this.player.getDuration() || 0
  }
  get playbackRate() {
    return this.player.getPlaybackRate()
  }
  set playbackRate(rate: number) {
    this.player.setPlaybackRate(rate)
  }
  play() {
    this.player.playVideo()
    return Promise.resolve()
  }
  pause() {
    this.player.pauseVideo()
  }
}

type YTNamespace = { Player: new (el: HTMLElement, options: object) => YTPlayer; PlayerState: { PLAYING: number } }
type YTWindow = Window & { YT?: YTNamespace; onYouTubeIframeAPIReady?: () => void }

let apiPromise: Promise<YTNamespace> | null = null
function loadYouTubeApi(): Promise<YTNamespace> {
  const w = window as YTWindow
  if (w.YT?.Player) return Promise.resolve(w.YT)
  if (!apiPromise) {
    apiPromise = new Promise((resolve) => {
      const previous = w.onYouTubeIframeAPIReady
      w.onYouTubeIframeAPIReady = () => {
        previous?.()
        resolve(w.YT as YTNamespace)
      }
      const script = document.createElement("script")
      script.src = "https://www.youtube.com/iframe_api"
      script.async = true
      document.head.appendChild(script)
    })
  }
  return apiPromise
}

export default function YouTubePlayer({
  videoId,
  onReady,
  onPlayingChange,
  onRateChange,
}: {
  videoId: string
  onReady: (media: YouTubeMedia) => void
  onPlayingChange: (playing: boolean) => void
  onRateChange?: (rate: number) => void
}) {
  const host = useRef<HTMLDivElement>(null)

  useEffect(() => {
    let cancelled = false
    let player: YTPlayer | null = null
    let ticker: ReturnType<typeof setInterval> | undefined
    let media: YouTubeMedia | null = null

    loadYouTubeApi().then((YT) => {
      if (cancelled || !host.current) return
      // YouTube replaces the element it is given, so hand it a child React doesn't track.
      const mount = document.createElement("div")
      host.current.appendChild(mount)
      player = new YT.Player(mount, {
        videoId,
        width: "100%",
        height: "100%",
        host: "https://www.youtube-nocookie.com",
        playerVars: { rel: 0, playsinline: 1, modestbranding: 1 },
        events: {
          onReady: () => {
            if (cancelled || !player) return
            media = new YouTubeMedia(player)
            onReady(media)
            media.dispatchEvent(new Event("loadedmetadata"))
          },
          onStateChange: (event: { data: number }) => {
            const playing = event.data === YT.PlayerState.PLAYING
            onPlayingChange(playing)
            clearInterval(ticker)
            if (playing) ticker = setInterval(() => media?.dispatchEvent(new Event("timeupdate")), 250)
          },
          onPlaybackRateChange: (event: { data: number }) => onRateChange?.(event.data),
        },
      })
    })

    return () => {
      cancelled = true
      clearInterval(ticker)
      try {
        player?.destroy()
      } catch {
        // already gone
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [videoId])

  return <div ref={host} className="aspect-video w-full bg-black [&_iframe]:h-full [&_iframe]:w-full" data-testid="youtube-player" />
}
