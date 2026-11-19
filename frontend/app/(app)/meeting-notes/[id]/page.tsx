"use client"
import { API_URL } from "@/lib/config"
import { refreshCredits } from "@/lib/credits"

import type React from "react"
import { useState, useEffect, useRef } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { displayFileName } from "@/lib/files"
import YouTubePlayer, { youTubeId } from "@/components/media/YouTubePlayer"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import {
  FileText,
  AudioLines,
  Download,
  Share,
  Calendar,
  CheckSquare,
  Lightbulb,
  TrendingUp,
  ArrowLeft,
  Copy,
  Loader2,
  AlertCircle,
  Check,
  X,
  Languages,
  Mail,
  Upload,
  RefreshCw,
  Volume2,
  Star,
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Gauge,
} from "lucide-react"

const animationStyles = `
/* 🌈💎 ENHANCED MULTI-COLOR GLOW PULSE (for cards, buttons, containers) */
@keyframes glow-pulse {
  0%, 100% { box-shadow: 0 0 0 0 rgba(var(--brand-rgb), 0.18); }
  50% { box-shadow: 0 0 0 6px rgba(var(--brand-rgb), 0.06); }
}

.animate-glow-pulse {
  animation: glow-pulse 3.5s ease-in-out infinite;
  border-radius: 1rem;
  transition: transform 0.3s ease, box-shadow 0.3s ease;
}


/* 🌈✨ GRADIENT SHIMMERING TEXT GLOW */
@keyframes text-glow {
  0% {
    background: linear-gradient(90deg, var(--brand), var(--sand), var(--sand));
    -webkit-background-clip: text;
    color: transparent;
    filter: drop-shadow(0 0 8px var(--brand));
  }
  25% {
    background: linear-gradient(90deg, var(--sand), var(--sand), var(--brand));
    -webkit-background-clip: text;
    color: transparent;
    filter: drop-shadow(0 0 10px var(--sand));
  }
  50% {
    background: linear-gradient(90deg, var(--sand), var(--brand), var(--brand));
    -webkit-background-clip: text;
    color: transparent;
    filter: drop-shadow(0 0 12px var(--brand));
  }
  75% {
    background: linear-gradient(90deg, var(--brand), var(--brand), var(--sand));
    -webkit-background-clip: text;
    color: transparent;
    filter: drop-shadow(0 0 10px var(--brand));
  }
  100% {
    background: linear-gradient(90deg, var(--brand), var(--sand), var(--sand));
    -webkit-background-clip: text;
    color: transparent;
    filter: drop-shadow(0 0 8px var(--sand));
  }
}

.animate-text-glow {
  animation: text-glow 3s linear infinite;
  background-size: 200% auto;
  font-weight: 700;
}


/* 💫 ICON GLOW WITH SOFT PULSE AND HUE SHIFT */
@keyframes icon-glow {
  0% {
    transform: scale(1);
    filter: hue-rotate(0deg)
            drop-shadow(0 0 8px var(--brand))
            drop-shadow(0 0 15px var(--sand));
  }
  50% {
    transform: scale(1.1);
    filter: hue-rotate(90deg)
            drop-shadow(0 0 12px var(--sand))
            drop-shadow(0 0 20px var(--brand));
  }
  100% {
    transform: scale(1);
    filter: hue-rotate(360deg)
            drop-shadow(0 0 8px var(--brand))
            drop-shadow(0 0 15px var(--sand));
  }
}

.animate-icon-glow {
  animation: icon-glow 2.8s ease-in-out infinite;
  transition: transform 0.3s ease;
}


/* 🚀 SMOOTH FADE-IN & SLIDE-UP ENTRY */
@keyframes slide-in-smooth {
  0% {
    opacity: 0;
    transform: translateY(15px) scale(0.98);
    filter: blur(2px);
  }
  100% {
    opacity: 1;
    transform: translateY(0) scale(1);
    filter: blur(0);
  }
}

@keyframes word-highlight {
  0% { background-color: rgba(var(--lime-rgb), 0.45); }
  100% { background-color: rgba(var(--lime-rgb), 0.65); }
}

.animate-word-highlight {
  animation: word-highlight 0.5s ease-in-out alternate infinite;
  color: var(--text) !important;
  font-weight: 600 !important;
  border-radius: 4px;
  z-index: 10;
  display: inline-block;
}

.animate-slide-in-smooth {
  animation: slide-in-smooth 0.6s ease-out;
}
`;


// Define interfaces
interface MeetingData {
  id: number
  title: string
  filename: string
  upload_date: string
  status: string
  transcript_language?: string
  transcription: {
    raw: string
    translated: string
    optimized: string
    utterances?: Array<{
      speaker: string
      text: string
      start: number
      end: number
      words?: Array<{
        text: string
        start: number
        end: number
      }>
    }>
  }
  notes: {
    summary: string
    key_points: string | string[]
    action_items: string | string[]
    decisions: string | string[]
    sentiment: string
  }
  is_favorite: boolean
  /** Read from the file by the backend; older meetings don't have it yet. */
  media_kind?: "audio" | "video" | null
  /** The link it was imported from; YouTube links are shown with YouTube's own player. */
  source_url?: string | null
}

interface EmailForm {
  to: string
  from: string
  subject: string
  body: string
}

interface Language {
  code: string
  name: string
}

interface SpeakerControlsProps {
  text: string
  copyKey: string
  copiedStates: Record<string, boolean>
  onCopy: (text: string, key: string) => void
  onSpeakingChange?: (speaking: boolean, wordIndex: number) => void
}

const detectLanguage = (text: string): string => {
  if (/[\u0600-\u06FF]/.test(text)) {
    const urduSpecific = /[\u0679\u067E\u0686\u0688\u0691\u0698\u06A9\u06AF\u06BA\u06BE\u06C1\u06C3]/
    if (urduSpecific.test(text)) {
      return "ur-PK"
    }
    const persianSpecific = /[\u06CC\u067E\u0686\u06AF]/
    if (persianSpecific.test(text)) {
      return "fa-IR"
    }
    return "ar-SA"
  }

  const langPatterns: Record<string, RegExp> = {
    "zh-CN": /[\u4E00-\u9FFF]/,
    "ja-JP": /[\u3040-\u30FF\u31F0-\u31FF]/,
    "ko-KR": /[\uAC00-\uD7AF]/,
    "hi-IN": /[\u0900-\u097F]/,
  }

  for (const [lang, pattern] of Object.entries(langPatterns)) {
    if (pattern.test(text)) {
      return lang
    }
  }

  return "en-US"
}

const SpeakerControls: React.FC<SpeakerControlsProps> = ({ text, copyKey, copiedStates, onCopy, onSpeakingChange }) => {
  const [isSpeaking, setIsSpeaking] = useState<boolean>(false)
  const [isPaused, setIsPaused] = useState<boolean>(false)
  const [currentWordIndex, setCurrentWordIndex] = useState<number>(-1)
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null)
  const wordsRef = useRef<string[]>([])
  const currentPositionRef = useRef<number>(0)

  useEffect(() => {
    const detectedLang = detectLanguage(text)
    const isCharacterBased = ['ja-JP', 'ko-KR', 'zh-CN'].includes(detectedLang)
    wordsRef.current = isCharacterBased ? text.split('') : text.split(/\s+/).filter((word) => word.trim().length > 0)

    if ("speechSynthesis" in window) {
      speechSynthesis.getVoices()
      window.speechSynthesis.onvoiceschanged = () => {
        speechSynthesis.getVoices()
      }
    }

    return () => {
      if (utteranceRef.current) {
        speechSynthesis.cancel()
      }
    }
  }, [text])

  useEffect(() => {
    if (onSpeakingChange) {
      onSpeakingChange(isSpeaking, currentWordIndex)
    }
  }, [isSpeaking, currentWordIndex, onSpeakingChange])

  const handleSpeak = () => {
    if ("speechSynthesis" in window) {
      if (isSpeaking && !isPaused) {
        speechSynthesis.pause()
        setIsPaused(true)
        return
      }

      if (isPaused) {
        speechSynthesis.resume()
        setIsPaused(false)
        return
      }

      const detectedLang = detectLanguage(text)

      const textToSpeak =
        currentPositionRef.current > 0 ? wordsRef.current.slice(currentPositionRef.current).join(detectedLang in ['ja-JP', 'ko-KR', 'zh-CN'] ? '' : ' ') : text

      const utterance = new SpeechSynthesisUtterance(textToSpeak)
      utterance.lang = detectedLang

      const voices = speechSynthesis.getVoices()

      if (detectedLang.startsWith("ur")) {
        const urduVoice = voices.find(
          (voice) =>
            voice.lang.includes("ur") ||
            voice.name.toLowerCase().includes("urdu") ||
            voice.name.toLowerCase().includes("pakistani"),
        )
        if (urduVoice) {
          utterance.voice = urduVoice
        }
      } else {
        const languageCode = detectedLang.split("-")[0]
        const languageVoice = voices.find((voice) => voice.lang.startsWith(languageCode))
        if (languageVoice) {
          utterance.voice = languageVoice
        }
      }

      utterance.rate = 0.9
      utterance.pitch = 1.0

      // Calculate average word duration for fallback
      const words = wordsRef.current
      const totalDuration = (text.length / utterance.rate) * 0.06 // Approximate duration
      const avgWordDuration = totalDuration / words.length

      let wordHighlightInterval: NodeJS.Timeout | null = null

      utterance.onstart = () => {
        let currentIndex = currentPositionRef.current

        // Fallback word highlighting using timer (works for all languages)
        wordHighlightInterval = setInterval(() => {
          if (currentIndex < words.length && !isPaused) {
            setCurrentWordIndex(currentIndex)
            currentIndex++
          } else if (currentIndex >= words.length) {
            if (wordHighlightInterval) clearInterval(wordHighlightInterval)
          }
        }, avgWordDuration * 1000)
      }

      utterance.onboundary = (event) => {
        // Primary method: Use boundary events when available (works better for Latin scripts)
        if (event.name === "word" && event.charIndex !== undefined) {
          const spokenChars = event.charIndex
          const currentText = textToSpeak.substring(0, spokenChars)
          const spokenWords = currentText.split(/\s+/).length - 1
          const absoluteWordIndex = currentPositionRef.current + spokenWords

          // Clear interval if boundary events are working
          if (wordHighlightInterval) {
            clearInterval(wordHighlightInterval)
            wordHighlightInterval = null
          }

          setCurrentWordIndex(absoluteWordIndex)
        }
      }

      utterance.onend = () => {
        if (wordHighlightInterval) clearInterval(wordHighlightInterval)
        setIsSpeaking(false)
        setIsPaused(false)
        setCurrentWordIndex(-1)
        currentPositionRef.current = 0
      }

      utterance.onerror = (error) => {
        console.error("Speech error:", error)
        if (wordHighlightInterval) clearInterval(wordHighlightInterval)
        setIsSpeaking(false)
        setIsPaused(false)
        setCurrentWordIndex(-1)
      }

      speechSynthesis.speak(utterance)
      setIsSpeaking(true)
      setIsPaused(false)
      utteranceRef.current = utterance
    } else {
      alert("Your browser does not support text-to-speech")
    }
  }

  const handleStop = () => {
    if (speechSynthesis.speaking) {
      speechSynthesis.cancel()
      setIsSpeaking(false)
      setIsPaused(false)
      setCurrentWordIndex(-1)
      currentPositionRef.current = 0
    }
  }

  // Store interval ref
  const intervalRef = useRef<NodeJS.Timeout | null>(null)

  // Clean up interval on unmount
  useEffect(() => {
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
      }
    }
  }, [])

  return (
    <div className="flex items-center gap-2 animate-slide-in-smooth">
      <Button
        variant="ghost"
        size="sm"
        className={`h-9 w-9 p-0 transition-all duration-300 hover:scale-110 ${isSpeaking ? "animate-icon-glow" : "opacity-70 hover:opacity-100"
          }`}
        onClick={handleSpeak}
        title={isSpeaking && !isPaused ? "Pause speaking" : isPaused ? "Resume speaking" : "Read aloud"}
      >
        {isSpeaking && !isPaused ? (
          <Pause className="w-4 h-4 text-primary animate-pulse" />
        ) : isPaused ? (
          <Play className="w-4 h-4 text-primary" />
        ) : (
          <Volume2 className="w-4 h-4" />
        )}
      </Button>

      {(isSpeaking || isPaused) && (
        <Button
          variant="ghost"
          size="sm"
          className="h-9 w-9 p-0 opacity-70 hover:opacity-100 transition-all duration-300 hover:scale-110 animate-slide-in-smooth"
          onClick={handleStop}
          title="Stop speaking"
        >
          <X className="w-4 h-4 text-destructive" />
        </Button>
      )}

      <Button
        variant="ghost"
        size="sm"
        className="h-9 w-9 p-0 opacity-70 hover:opacity-100 transition-all duration-300 hover:scale-110"
        onClick={() => onCopy(text, copyKey)}
        title="Copy to clipboard"
      >
        {copiedStates[copyKey] ? (
          <Check className="w-4 h-4 text-green-500 animate-bounce" />
        ) : (
          <Copy className="w-4 h-4" />
        )}
      </Button>
    </div>
  )
}

interface MeetingNotesPageProps {
  params: { id: string }
}

const MeetingNotesPage: React.FC<MeetingNotesPageProps> = ({ params }) => {
  const [meeting, setMeeting] = useState<MeetingData | null>(null)
  const [isLoading, setIsLoading] = useState<boolean>(true)
  const [error, setError] = useState<string>("")
  const [activeTab, setActiveTab] = useState<string>("summary")
  const [copiedStates, setCopiedStates] = useState<Record<string, boolean>>({})
  const [shareModalOpen, setShareModalOpen] = useState<boolean>(false)
  const [emailModalOpen, setEmailModalOpen] = useState<boolean>(false)
  const [downloadModalOpen, setDownloadModalOpen] = useState<boolean>(false)
  const [translationText, setTranslationText] = useState<string>("")
  const [translatedText, setTranslatedText] = useState<string>("")
  const [selectedLanguage, setSelectedLanguage] = useState<string>("es")
  const [isTranslating, setIsTranslating] = useState<boolean>(false)
  const [downloadingPdf, setDownloadingPdf] = useState<boolean>(false)
  const [downloadingWord, setDownloadingWord] = useState<boolean>(false)
  const [isSendingEmail, setIsSendingEmail] = useState<boolean>(false)
  const [pdfFile, setPdfFile] = useState<File | null>(null)
  const [generatingPdf, setGeneratingPdf] = useState<boolean>(false)
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false)
  const [isPlaying, setIsPlaying] = useState<boolean>(false)
  const [playbackRate, setPlaybackRate] = useState<number>(1)
  // Bumped when a player that loads later (YouTube) becomes ready, so the time/transcript sync attaches to it.
  const [mediaVersion, setMediaVersion] = useState(0)
  const [mediaCurrentTime, setMediaCurrentTime] = useState<number>(0)
  const [mediaDuration, setMediaDuration] = useState<number>(0)
  const [emailForm, setEmailForm] = useState<EmailForm>({
    to: "",
    from: "",
    subject: "",
    body: "",
  })

  // States for summary
  const [summaryIsSpeaking, setSummaryIsSpeaking] = useState<boolean>(false)
  const [summaryCurrentWordIndex, setSummaryCurrentWordIndex] = useState<number>(-1)
  const summaryWordsRef = useRef<string[]>([])
  const summaryIsCharBasedRef = useRef<boolean>(false)

  // States for key points
  const [keyPointsIsSpeaking, setKeyPointsIsSpeaking] = useState<boolean>(false)
  const [keyPointsCurrentWordIndex, setKeyPointsCurrentWordIndex] = useState<number>(-1)
  const keyPointsWordsRef = useRef<string[]>([])
  const keyPointsPointsWordsRef = useRef<string[][]>([])
  const keyPointsCumulativeRef = useRef<number[]>([])
  const keyPointsIsCharBasedRef = useRef<boolean>(false)

  // States for action items
  const [actionItemsIsSpeaking, setActionItemsIsSpeaking] = useState<boolean>(false)
  const [actionItemsCurrentWordIndex, setActionItemsCurrentWordIndex] = useState<number>(-1)
  const actionItemsWordsRef = useRef<string[]>([])
  const actionItemsPointsWordsRef = useRef<string[][]>([])
  const actionItemsCumulativeRef = useRef<number[]>([])
  const actionItemsIsCharBasedRef = useRef<boolean>(false)

  // States for decisions in summary tab
  const [summaryDecisionsIsSpeaking, setSummaryDecisionsIsSpeaking] = useState<boolean>(false)
  const [summaryDecisionsCurrentWordIndex, setSummaryDecisionsCurrentWordIndex] = useState<number>(-1)
  const summaryDecisionsWordsRef = useRef<string[]>([])
  const summaryDecisionsPointsWordsRef = useRef<string[][]>([])
  const summaryDecisionsCumulativeRef = useRef<number[]>([])
  const summaryDecisionsIsCharBasedRef = useRef<boolean>(false)

  // States for transcript
  const [transcriptIsSpeaking, setTranscriptIsSpeaking] = useState<boolean>(false)
  const [transcriptCurrentWordIndex, setTranscriptCurrentWordIndex] = useState<number>(-1)
  const transcriptWordsRef = useRef<string[]>([])
  const transcriptIsCharBasedRef = useRef<boolean>(false)

  // States for translation result
  const [translationIsSpeaking, setTranslationIsSpeaking] = useState<boolean>(false)
  const [translationCurrentWordIndex, setTranslationCurrentWordIndex] = useState<number>(-1)
  const translationWordsRef = useRef<string[]>([])
  const translationIsCharBasedRef = useRef<boolean>(false)

  // States for decisions in actions tab
  const [actionsDecisionsIsSpeaking, setActionsDecisionsIsSpeaking] = useState<boolean>(false)
  const [actionsDecisionsCurrentWordIndex, setActionsDecisionsCurrentWordIndex] = useState<number>(-1)
  const actionsDecisionsWordsRef = useRef<string[]>([])
  const actionsDecisionsPointsWordsRef = useRef<string[][]>([])
  const actionsDecisionsCumulativeRef = useRef<number[]>([])
  const actionsDecisionsIsCharBasedRef = useRef<boolean>(false)

  const router = useRouter()
  const meetingId = params.id
  const audioVideoRef = useRef<HTMLAudioElement | HTMLVideoElement | null>(null)

  const [actionSuccess, setActionSuccess] = useState(false)
  const [actionType, setActionType] = useState<"pdf" | "word" | "email" | null>(null)

  // Auto-dismiss success popup
  useEffect(() => {
    if (actionSuccess) {
      const timer = setTimeout(() => {
        setActionSuccess(false)
        setActionType(null)
      }, 3000)
      return () => clearTimeout(timer)
    }
  }, [actionSuccess])

  const triggerSuccess = (type: "pdf" | "word" | "email") => {
    setActionType(type)
    setActionSuccess(true)
  }

  const languages: Language[] = [
    { code: "auto", name: "Auto Detect" },
    { code: "af", name: "Afrikaans" },
    { code: "sq", name: "Albanian" },
    { code: "am", name: "Amharic" },
    { code: "ar", name: "Arabic" },
    { code: "hy", name: "Armenian" },
    { code: "az", name: "Azerbaijani" },
    { code: "eu", name: "Basque" },
    { code: "be", name: "Belarusian" },
    { code: "bn", name: "Bengali" },
    { code: "bs", name: "Bosnian" },
    { code: "bg", name: "Bulgarian" },
    { code: "my", name: "Burmese" },
    { code: "ca", name: "Catalan" },
    { code: "ceb", name: "Cebuano" },
    { code: "ny", name: "Chichewa" },
    { code: "zh-cn", name: "Chinese (Simplified)" },
    { code: "zh-tw", name: "Chinese (Traditional)" },
    { code: "co", name: "Corsican" },
    { code: "hr", name: "Croatian" },
    { code: "cs", name: "Czech" },
    { code: "da", name: "Danish" },
    { code: "nl", name: "Dutch" },
    { code: "en", name: "English" },
    { code: "eo", name: "Esperanto" },
    { code: "et", name: "Estonian" },
    { code: "tl", name: "Filipino" },
    { code: "fi", name: "Finnish" },
    { code: "fr", name: "French" },
    { code: "fy", name: "Frisian" },
    { code: "gl", name: "Galician" },
    { code: "ka", name: "Georgian" },
    { code: "de", name: "German" },
    { code: "el", name: "Greek" },
    { code: "gu", name: "Gujarati" },
    { code: "ht", name: "Haitian Creole" },
    { code: "ha", name: "Hausa" },
    { code: "haw", name: "Hawaiian" },
    { code: "he", name: "Hebrew" },
    { code: "hi", name: "Hindi" },
    { code: "hmn", name: "Hmong" },
    { code: "hu", name: "Hungarian" },
    { code: "is", name: "Icelandic" },
    { code: "ig", name: "Igbo" },
    { code: "id", name: "Indonesian" },
    { code: "ga", name: "Irish" },
    { code: "it", name: "Italian" },
    { code: "ja", name: "Japanese" },
    { code: "jw", name: "Javanese" },
    { code: "kn", name: "Kannada" },
    { code: "kk", name: "Kazakh" },
    { code: "km", name: "Khmer" },
    { code: "rw", name: "Kinyarwanda" },
    { code: "ko", name: "Korean" },
    { code: "ku", name: "Kurdish (Kurmanji)" },
    { code: "ky", name: "Kyrgyz" },
    { code: "lo", name: "Lao" },
    { code: "la", name: "Latin" },
    { code: "lv", name: "Latvian" },
    { code: "lt", name: "Lithuanian" },
    { code: "lb", name: "Luxembourgish" },
    { code: "mk", name: "Macedonian" },
    { code: "mg", name: "Malagasy" },
    { code: "ms", name: "Malay" },
    { code: "ml", name: "Malayalam" },
    { code: "mt", name: "Maltese" },
    { code: "mi", name: "Maori" },
    { code: "mr", name: "Marathi" },
    { code: "mn", name: "Mongolian" },
    { code: "ne", name: "Nepali" },
    { code: "no", name: "Norwegian" },
    { code: "or", name: "Odia (Oriya)" },
    { code: "ps", name: "Pashto" },
    { code: "fa", name: "Persian" },
    { code: "pl", name: "Polish" },
    { code: "pt", name: "Portuguese" },
    { code: "pa", name: "Punjabi" },
    { code: "ro", name: "Romanian" },
    { code: "ru", name: "Russian" },
    { code: "sm", name: "Samoan" },
    { code: "gd", name: "Scots Gaelic" },
    { code: "sr", name: "Serbian" },
    { code: "st", name: "Sesotho" },
    { code: "sn", name: "Shona" },
    { code: "sd", name: "Sindhi" },
    { code: "si", name: "Sinhala" },
    { code: "sk", name: "Slovak" },
    { code: "sl", name: "Slovenian" },
    { code: "so", name: "Somali" },
    { code: "es", name: "Spanish" },
    { code: "su", name: "Sundanese" },
    { code: "sw", name: "Swahili" },
    { code: "sv", name: "Swedish" },
    { code: "tg", name: "Tajik" },
    { code: "ta", name: "Tamil" },
    { code: "tt", name: "Tatar" },
    { code: "te", name: "Telugu" },
    { code: "th", name: "Thai" },
    { code: "tr", name: "Turkish" },
    { code: "tk", name: "Turkmen" },
    { code: "uk", name: "Ukrainian" },
    { code: "ur", name: "Urdu" },
    { code: "ug", name: "Uyghur" },
    { code: "uz", name: "Uzbek" },
    { code: "vi", name: "Vietnamese" },
    { code: "cy", name: "Welsh" },
    { code: "xh", name: "Xhosa" },
    { code: "yi", name: "Yiddish" },
    { code: "yo", name: "Yoruba" },
    { code: "zu", name: "Zulu" }
  ];

  useEffect(() => {
    const videoElement = audioVideoRef.current
    if (!videoElement) return

    let lastActiveIdx = -1
    const handleTimeUpdate = () => {
      const currentTime = videoElement.currentTime
      setMediaCurrentTime(currentTime)
      if (videoElement.duration) {
        setMediaDuration(videoElement.duration)
      }

      // Auto-scroll to active utterance
      if (meeting?.transcription?.utterances) {
        const activeIdx = meeting.transcription.utterances.findIndex(
          u => currentTime >= u.start && currentTime <= u.end
        )
        if (activeIdx !== -1 && activeIdx !== lastActiveIdx) {
          lastActiveIdx = activeIdx
          const element = document.getElementById(`utterance-${activeIdx}`)
          if (element) {
            element.scrollIntoView({ behavior: "smooth", block: "start" })
          }
        }
      }
    }

    // Length is known once metadata loads, before anyone presses play.
    const handleMetadata = () => {
      if (Number.isFinite(videoElement.duration)) setMediaDuration(videoElement.duration)
    }
    handleMetadata()
    videoElement.addEventListener("loadedmetadata", handleMetadata)
    videoElement.addEventListener("timeupdate", handleTimeUpdate)
    return () => {
      videoElement.removeEventListener("loadedmetadata", handleMetadata)
      videoElement.removeEventListener("timeupdate", handleTimeUpdate)
    }
  }, [isLoading, meeting, mediaVersion])


  const refreshTokenIfNeeded = async (): Promise<boolean> => {
    try {
      const token = localStorage.getItem("token")
      if (!token) return false

      const validateResponse = await fetch(`${API_URL}/api/auth/validate`, {
        headers: { Authorization: `Bearer ${token}` },
      })

      if (validateResponse.ok) return true

      const refreshResponse = await fetch(`${API_URL}/api/auth/refresh`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      })

      if (refreshResponse.ok) {
        const data = await refreshResponse.json()
        localStorage.setItem("token", data.access_token)
        return true
      }

      return false
    } catch (error) {
      console.error("Token refresh error:", error)
      return false
    }
  }

  const makeAuthenticatedRequest = async (url: string, options: RequestInit = {}): Promise<Response> => {
    const tokenValid = await refreshTokenIfNeeded()
    if (!tokenValid) {
      router.push("/login")
      throw new Error("Authentication failed")
    }

    const token = localStorage.getItem("token")
    const headers = {
      ...options.headers,
      Authorization: `Bearer ${token}`,
    }

    const response = await fetch(url, { ...options, headers })

    if (response.status === 401) {
      localStorage.removeItem("token")
      router.push("/login")
      throw new Error("Authentication expired")
    }

    return response
  }

  useEffect(() => {
    const token = localStorage.getItem("token")
    if (!token) {
      router.push("/login")
      return
    }

    fetchMeetingDetails()
  }, [meetingId, router])

  // In the useEffect that pre-populates email form, update the body text:
  useEffect(() => {
    // Pre-populate email form when meeting data is available
    if (meeting) {
      setEmailForm(prev => ({
        ...prev,
        subject: `Meeting Notes: ${meeting.title}`,
        body: `Dear Recipient,

I hope this email finds you well. Please find attached the meeting notes from "${meeting.title}" held on ${new Date(meeting.upload_date).toLocaleDateString()}.

The attached PDF contains:
- Executive Summary
- Key Discussion Points  
- Action Items
- Decisions Made
- Full Transcript

Please review the document and let me know if you have any questions or need clarification on any points discussed.

Best regards`
      }))
    }
  }, [meeting])

  useEffect(() => {
    if (meeting) {
      // For summary
      const summaryText = meeting.notes.summary || "No summary available"
      const summaryLang = detectLanguage(summaryText)
      summaryIsCharBasedRef.current = ['ja-JP', 'ko-KR', 'zh-CN'].includes(summaryLang)
      summaryWordsRef.current = summaryIsCharBasedRef.current ? summaryText.split('') : summaryText.split(/\s+/).filter(w => w.trim())

      // For key points
      const keyPoints = parseJsonField(meeting.notes.key_points)
      const keyPointsText = keyPoints.join('\n\n')
      const keyPointsLang = detectLanguage(keyPointsText)
      keyPointsIsCharBasedRef.current = ['ja-JP', 'ko-KR', 'zh-CN'].includes(keyPointsLang)
      keyPointsPointsWordsRef.current = keyPoints.map(p => keyPointsIsCharBasedRef.current ? p.split('') : p.split(/\s+/).filter(w => w.trim()))
      keyPointsWordsRef.current = keyPointsPointsWordsRef.current.flat()
      keyPointsCumulativeRef.current = [0]
      let sum = 0
      for (let pw of keyPointsPointsWordsRef.current) {
        sum += pw.length
        keyPointsCumulativeRef.current.push(sum)
      }

      // For action items
      const actionItems = parseJsonField(meeting.notes.action_items)
      const actionItemsText = actionItems.join('\n\n')
      const actionItemsLang = detectLanguage(actionItemsText)
      actionItemsIsCharBasedRef.current = ['ja-JP', 'ko-KR', 'zh-CN'].includes(actionItemsLang)
      actionItemsPointsWordsRef.current = actionItems.map(p => actionItemsIsCharBasedRef.current ? p.split('') : p.split(/\s+/).filter(w => w.trim()))
      actionItemsWordsRef.current = actionItemsPointsWordsRef.current.flat()
      actionItemsCumulativeRef.current = [0]
      sum = 0
      for (let pw of actionItemsPointsWordsRef.current) {
        sum += pw.length
        actionItemsCumulativeRef.current.push(sum)
      }

      // For decisions (used in both tabs)
      const decisions = parseJsonField(meeting.notes.decisions)
      const decisionsText = decisions.join('\n\n')
      const decisionsLang = detectLanguage(decisionsText)
      const decisionsIsCharBased = ['ja-JP', 'ko-KR', 'zh-CN'].includes(decisionsLang)
      const decisionsPointsWords = decisions.map(p => decisionsIsCharBased ? p.split('') : p.split(/\s+/).filter(w => w.trim()))
      const decisionsWords = decisionsPointsWords.flat()
      const decisionsCumulative = [0]
      sum = 0
      for (let pw of decisionsPointsWords) {
        sum += pw.length
        decisionsCumulative.push(sum)
      }
      summaryDecisionsIsCharBasedRef.current = decisionsIsCharBased
      summaryDecisionsPointsWordsRef.current = decisionsPointsWords
      summaryDecisionsWordsRef.current = decisionsWords
      summaryDecisionsCumulativeRef.current = decisionsCumulative
      actionsDecisionsIsCharBasedRef.current = decisionsIsCharBased
      actionsDecisionsPointsWordsRef.current = decisionsPointsWords
      actionsDecisionsWordsRef.current = decisionsWords
      actionsDecisionsCumulativeRef.current = decisionsCumulative

      // For transcript
      const transcriptText = meeting.transcription.optimized || meeting.transcription.translated || meeting.transcription.raw || "No transcript available"
      const transcriptLang = detectLanguage(transcriptText)
      transcriptIsCharBasedRef.current = ['ja-JP', 'ko-KR', 'zh-CN'].includes(transcriptLang)
      transcriptWordsRef.current = transcriptIsCharBasedRef.current ? transcriptText.split('') : transcriptText.split(/\s+/).filter(w => w.trim())
    }
  }, [meeting])

  useEffect(() => {
    // For translation result
    if (translatedText) {
      const lang = detectLanguage(translatedText)
      translationIsCharBasedRef.current = ['ja-JP', 'ko-KR', 'zh-CN'].includes(lang)
      translationWordsRef.current = translationIsCharBasedRef.current ? translatedText.split('') : translatedText.split(/\s+/).filter(w => w.trim())
    }
  }, [translatedText])

  const fetchMeetingDetails = async () => {
    try {
      setIsRefreshing(true)
      const tokenValid = await refreshTokenIfNeeded()
      if (!tokenValid) {
        router.push("/login")
        return
      }

      const token = localStorage.getItem("token")
      if (!token) return

      const response = await fetch(`${API_URL}/api/meetings/${meetingId}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })

      if (response.status === 401) {
        localStorage.removeItem("token")
        router.push("/login")
        return
      }

      if (response.ok) {
        const data: { meeting: MeetingData } = await response.json()
        setMeeting(data.meeting)
        refreshCredits() // processing used minutes: update the sidebar meter without a reload
      } else {
        setError("Failed to load meeting details")
      }
    } catch (err) {
      console.error("Fetch error:", err)
      setError("Network error occurred")
    } finally {
      setIsLoading(false)
      setIsRefreshing(false)
    }
  }

  const toggleFavorite = async (meetingId: number, currentFavorite: boolean) => {
    try {
      const response = await makeAuthenticatedRequest(
        `${API_URL}/api/meetings/${meetingId}/favorite`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ is_favorite: !currentFavorite }),
        },
      )

      if (response.ok) {
        setMeeting((prev) => (prev ? { ...prev, is_favorite: !currentFavorite } : null))
      }
    } catch (error) {
      console.error("Error toggling favorite:", error)
    }
  }

  // AI models sometimes return a list item as an object, e.g. an action item
  // {task, owner, deadline}. Show it as "Owner: task (deadline)" instead of crashing.
  const itemToText = (item: unknown): string => {
    if (item == null) return ""
    if (typeof item === "string") return item.trim()
    if (typeof item === "number" || typeof item === "boolean") return String(item)
    if (Array.isArray(item)) return item.map(itemToText).filter(Boolean).join(" ")
    if (typeof item === "object") {
      const o = item as Record<string, unknown>
      const pick = (keys: string[]) => {
        for (const k of keys) {
          const v = o[k]
          if ((typeof v === "string" || typeof v === "number") && !/^(|n\/a|na|none|null|not specified|unspecified|tbd|unknown|-)$/i.test(String(v).trim())) return String(v).trim()
        }
        return ""
      }
      const main = pick(["task", "action", "item", "text", "point", "decision", "description", "title", "content"])
      if (!main) return Object.values(o).filter((v) => typeof v === "string" || typeof v === "number").map(String).filter((v) => v.trim()).join(" · ")
      const owner = pick(["owner", "assignee", "responsible", "who", "person"])
      const deadline = pick(["deadline", "due", "due_date", "when", "by"])
      const text = owner ? `${owner}: ${main}` : main
      return deadline ? `${text} (${deadline})` : text
    }
    return ""
  }

  const parseJsonField = (field: unknown): string[] => {
    if (!field || field === "" || field === "[]" || field === "{}") {
      return []
    }

    if (Array.isArray(field)) {
      return field.map(itemToText).filter(Boolean)
    }

    if (typeof field === "string") {
      try {
        const parsed = JSON.parse(field)
        if (Array.isArray(parsed)) {
          return parsed.map(itemToText).filter(Boolean)
        }
        return [itemToText(parsed)].filter(Boolean)
      } catch {
        if (field.startsWith("[") && field.endsWith("]")) {
          try {
            const items = field
              .slice(1, -1)
              .split('","')
              .map((item) => item.replace(/^"/, "").replace(/"$/, "").trim())
            return items.filter((item) => item && item !== "")
          } catch {
            return [field]
          }
        }

        if (field.includes("\n")) {
          return field.split("\n").filter((item) => item.trim() !== "")
        }

        return [field]
      }
    }

    return []
  }

  const copyToClipboard = async (text: string, key: string) => {
    try {
      await navigator.clipboard.writeText(text)
      setCopiedStates((prev) => ({ ...prev, [key]: true }))
      setTimeout(() => {
        setCopiedStates((prev) => ({ ...prev, [key]: false }))
      }, 2000)
    } catch (err) {
      console.error("Failed to copy text: ", err)
    }
  }

  const downloadPDF = async () => {
    if (!meeting) return

    setDownloadingPdf(true)
    try {
      const response = await makeAuthenticatedRequest(`${API_URL}/api/export/${meeting.id}/pdf`)

      if (response.ok) {
        const blob = await response.blob()
        const url = window.URL.createObjectURL(blob)
        const link = document.createElement("a")
        link.href = url
        link.download = `meeting-notes-${meeting.title.replace(/[^a-zA-Z0-9]/g, "-")}.pdf`
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
        window.URL.revokeObjectURL(url)
        setDownloadModalOpen(false)
        triggerSuccess("pdf")
      } else {
        alert("Failed to generate PDF")
      }
    } catch (error) {
      console.error("PDF download error:", error)
      alert("Error downloading PDF")
    } finally {
      setDownloadingPdf(false)
    }
  }

  const downloadWord = async () => {
    if (!meeting) return

    setDownloadingWord(true)
    try {
      const response = await makeAuthenticatedRequest(
        `${API_URL}/api/export/${meeting.id}/word`,
      )

      if (response.ok) {
        const blob = await response.blob()
        const url = window.URL.createObjectURL(blob)
        const link = document.createElement("a")
        link.href = url
        link.download = `meeting-notes-${meeting.title.replace(/[^a-zA-Z0-9]/g, "-")}.docx`
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
        window.URL.revokeObjectURL(url)
        setDownloadModalOpen(false)
        triggerSuccess("word")
      } else {
        alert("Failed to generate Word document")
      }
    } catch (error) {
      console.error("Word download error:", error)
      alert("Error downloading Word document")
    } finally {
      setDownloadingWord(false)
    }
  }

  const generatePdfForEmail = async () => {
    if (!meeting) return

    setGeneratingPdf(true)
    try {
      const response = await makeAuthenticatedRequest(`${API_URL}/api/export/${meeting.id}/pdf`)

      if (response.ok) {
        const blob = await response.blob()
        const file = new File([blob], `meeting-notes-${meeting.id}.pdf`, { type: "application/pdf" })
        setPdfFile(file)
      } else {
        alert("Failed to generate PDF")
      }
    } catch (error) {
      console.error("PDF generation error:", error)
      alert("Error generating PDF")
    } finally {
      setGeneratingPdf(false)
    }
  }

  const sendEmail = async () => {
    if (!meeting || !emailForm.to || !emailForm.subject) {
      alert("Please fill in all required fields")
      return
    }

    if (!pdfFile) {
      alert("Please generate PDF first")
      return
    }

    setIsSendingEmail(true)
    try {
      const formData = new FormData()
      formData.append("meeting_id", meeting.id.toString())
      formData.append("to_email", emailForm.to)
      formData.append("subject", emailForm.subject)
      formData.append("body", emailForm.body)
      formData.append("pdf_file", pdfFile)

      const response = await makeAuthenticatedRequest(`${API_URL}/api/send-email`, {
        method: "POST",
        body: formData,
      })

      const result = await response.json()

      if (response.ok) {
        // Removed alert, using animated popup instead
        triggerSuccess("email")
        setEmailModalOpen(false)
        setPdfFile(null)
        setEmailForm((prev) => ({
          ...prev,
          to: "",
          body: prev.body,
        }))
      } else {
        console.error("Email send error:", result)
        alert(`Failed to send email: ${result.details || result.error || "Unknown error"}`)
      }
    } catch (error) {
      console.error("Email sending error:", error)
      alert("Error sending email. Please check your connection and try again.")
    } finally {
      setIsSendingEmail(false)
    }
  }

  const translateText = async () => {
    if (!translationText.trim()) {
      alert("Please enter text to translate")
      return
    }

    setIsTranslating(true)
    try {
      const response = await makeAuthenticatedRequest(`${API_URL}/api/translate`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          text: translationText,
          target_language: selectedLanguage,
        }),
      })

      if (response.ok) {
        const data: { translated_text: string } = await response.json()
        setTranslatedText(data.translated_text)
      } else {
        const error = await response.json()
        alert(`Translation failed: ${error.error || "Unknown error"}`)
      }
    } catch (error) {
      console.error("Translation error:", error)
      alert("Translation error occurred")
    } finally {
      setIsTranslating(false)
    }
  }

  const getSentimentColor = (sentiment: string): string => {
    switch (sentiment?.toLowerCase()) {
      case "positive":
        return "text-accent"
      case "negative":
        return "text-destructive"
      default:
        return "text-muted-foreground"
    }
  }

  const getSentimentIcon = (sentiment: string): string => {
    switch (sentiment?.toLowerCase()) {
      case "positive":
        return "😊"
      case "negative":
        return "😟"
      default:
        return "😐"
    }
  }

  // FIX 1: Restored from old working code — default returns "video" instead of "audio"
  const getFileType = (filename: string): "audio" | "video" => {
    const audioExtensions = [".mp3", ".wav", ".m4a", ".flac", ".ogg", ".aac"]
    const videoExtensions = [".mp4", ".avi", ".mov", ".webm", ".mkv"]

    const ext = filename.toLowerCase().substring(filename.lastIndexOf("."))

    // Check video first because webm can be both but we prefer video player for it
    if (videoExtensions.includes(ext)) return "video"
    if (audioExtensions.includes(ext)) return "audio"

    // Default to video for screen recordings (restored from old working code)
    return "video"
  }

  const formatTimestamp = (seconds: number) => {
    const min = Math.floor(seconds / 60)
    const sec = Math.floor(seconds % 60)
    return `${min.toString().padStart(2, "0")}:${sec.toString().padStart(2, "0")}`
  }

  const seekTo = (seconds: number) => {
    if (audioVideoRef.current) {
      audioVideoRef.current.currentTime = seconds
      audioVideoRef.current.play().catch(e => console.error("Auto-play failed:", e))
      setIsPlaying(true)

      // If we are in another tab, maybe switch to media? 
      // User didn't ask but it's helpful. For now just seek.
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen">
        <div className="pt-8 lg:pt-10 pb-20 px-4 sm:px-6 lg:px-8">
          <div className="max-w-4xl mx-auto text-center">
            <Loader2 className="w-12 h-12 mx-auto mb-4 animate-spin text-primary" />
            <p className="text-muted-foreground animate-pulse">Loading meeting notes...</p>
          </div>
        </div>
      </div>
    )
  }

  if (error || !meeting) {
    return (
      <div className="min-h-screen">
        <div className="pt-8 lg:pt-10 pb-20 px-4 sm:px-6 lg:px-8">
          <div className="max-w-4xl mx-auto">
            <Alert className="border-destructive/50 bg-destructive/10 animate-in fade-in duration-300">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription className="text-destructive">{error || "Meeting not found"}</AlertDescription>
            </Alert>
            <div className="mt-4 flex justify-center">
              <Button
                onClick={() => fetchMeetingDetails()}
                disabled={isRefreshing}
                className="transition-all duration-200"
              >
                {isRefreshing ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <RefreshCw className="w-4 h-4 mr-2" />
                )}
                Retry
              </Button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  const keyPoints = parseJsonField(meeting.notes.key_points)
  const actionItems = parseJsonField(meeting.notes.action_items)
  const decisions = parseJsonField(meeting.notes.decisions)
  // Video player only for real video; voice recordings and audio files get the audio player.
  const fileType = meeting.media_kind ?? getFileType(meeting.filename)

  const token = localStorage.getItem("token")
  // Always use /uploads/ — the backend /uploads/ route already has a fallback
  // that checks the /recordings/ folder too, so this works for both manual uploads
  // and auto-recorded meeting videos
  const fileUrl = `${API_URL}/uploads/${meeting.filename}${token ? `?token=${token}` : ""}`
  const youTubeVideoId = youTubeId(meeting.source_url)

  return (
    <div className="min-h-screen">
      <style>{animationStyles}</style>


      <section className="pt-8 lg:pt-10 pb-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-6xl mx-auto">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-8 gap-4 animate-in fade-in slide-in-from-top duration-500">
            <Button
              onClick={() => router.back()}
              variant="outline"
              className="glass-button bg-transparent transition-all duration-200 hover:scale-105"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back
            </Button>
            <div className="flex flex-wrap items-center gap-2">
              <Button
                onClick={() => toggleFavorite(meeting.id, meeting.is_favorite)}
                variant="outline"
                size="sm"
                className="glass-button bg-transparent transition-all duration-200 hover:scale-105"
              >
                <Star
                  className={`w-4 h-4 mr-2 transition-all duration-300 ${meeting.is_favorite ? "text-yellow-500 fill-yellow-500 scale-110" : "text-muted-foreground"
                    }`}
                />
                {meeting.is_favorite ? "Unfavorite" : "Favorite"}
              </Button>
              <Button
                onClick={() => setShareModalOpen(true)}
                variant="outline"
                size="sm"
                className="glass-button bg-transparent transition-all duration-200 hover:scale-105"
              >
                <Share className="w-4 h-4 mr-2" />
                Share
              </Button>
              <Button
                onClick={() => setDownloadModalOpen(true)}
                className="btn-primary transition-all duration-200"
              >
                <Download className="w-4 h-4 mr-2" />
                Download Notes
              </Button>
            </div>
          </div>

          <Dialog open={shareModalOpen} onOpenChange={setShareModalOpen}>
            <DialogContent className="glass-card sm:max-w-md animate-in fade-in zoom-in duration-300">
              <DialogHeader>
                <DialogTitle>Share Meeting Notes</DialogTitle>
                <DialogDescription>Send your meeting notes via email</DialogDescription>
              </DialogHeader>
              <div className="flex flex-col space-y-4 py-4">
                <Button
                  onClick={() => {
                    setShareModalOpen(false)
                    setEmailModalOpen(true)
                  }}
                  className="btn-primary flex items-center justify-center space-x-3 p-6 border transition-all duration-200"
                >
                  <Mail className="w-6 h-6 text-primary" />
                  <span className="font-medium">Send via Email</span>
                </Button>
              </div>
            </DialogContent>
          </Dialog>

          <Dialog open={downloadModalOpen} onOpenChange={setDownloadModalOpen}>
            <DialogContent className="glass-card sm:max-w-md animate-in fade-in zoom-in duration-300">
              <DialogHeader>
                <DialogTitle>Download Meeting Notes</DialogTitle>
                <DialogDescription>Choose your preferred format to download</DialogDescription>
              </DialogHeader>
              <div className="flex flex-col space-y-4 py-4">
                <Button
                  onClick={downloadPDF}
                  disabled={downloadingPdf}
                  className="flex items-center justify-center space-x-3 p-6 glass-button bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 text-left transition-all duration-200 hover:scale-105 disabled:opacity-50"
                >
                  {downloadingPdf ? (
                    <Loader2 className="w-6 h-6 text-red-500 animate-spin" />
                  ) : (
                    <FileText className="w-6 h-6 text-red-500" />
                  )}
                  <div className="flex flex-col">
                    <span className="font-medium text-red-500">Download as PDF</span>
                    <span className="text-xs text-muted-foreground">Portable Document Format</span>
                  </div>
                </Button>
                <Button
                  onClick={downloadWord}
                  disabled={downloadingWord}
                  className="flex items-center justify-center space-x-3 p-6 glass-button bg-blue-500/10 hover:bg-blue-500/20 border border-blue-500/30 text-left transition-all duration-200 hover:scale-105 disabled:opacity-50"
                >
                  {downloadingWord ? (
                    <Loader2 className="w-6 h-6 text-blue-500 animate-spin" />
                  ) : (
                    <FileText className="w-6 h-6 text-blue-500" />
                  )}
                  <div className="flex flex-col">
                    <span className="font-medium text-blue-500">Download as Word</span>
                    <span className="text-xs text-muted-foreground">Opens in Microsoft Word</span>
                  </div>
                </Button>
              </div>
            </DialogContent>
          </Dialog>

          <Dialog open={emailModalOpen} onOpenChange={setEmailModalOpen}>
            <DialogContent className="glass-card max-w-2xl max-h-[90vh] overflow-y-auto sm:max-w-3xl animate-in fade-in zoom-in duration-300">
              <DialogHeader>
                <DialogTitle>Compose Email</DialogTitle>
                <DialogDescription>Send the meeting notes PDF via email</DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div className="grid grid-cols-1 gap-4">
                  <div className="animate-in fade-in slide-in-from-left duration-300">
                    <Label htmlFor="email-to">To *</Label>
                    <Input
                      id="email-to"
                      type="email"
                      placeholder="recipient@example.com"
                      value={emailForm.to}
                      onChange={(e) => setEmailForm((prev) => ({ ...prev, to: e.target.value }))}
                      className="mt-1 transition-all duration-200 focus:scale-105"
                      required
                    />
                  </div>
                </div>
                <div className="animate-in fade-in slide-in-from-left duration-300 delay-100">
                  <Label htmlFor="email-subject">Subject *</Label>
                  <Input
                    id="email-subject"
                    type="text"
                    value={emailForm.subject}
                    onChange={(e) => setEmailForm((prev) => ({ ...prev, subject: e.target.value }))}
                    className="mt-1 transition-all duration-200 focus:scale-105"
                    required
                  />
                </div>
                <div className="animate-in fade-in slide-in-from-left duration-300 delay-200">
                  <Label htmlFor="email-body">Message</Label>
                  <Textarea
                    id="email-body"
                    value={emailForm.body}
                    onChange={(e) => setEmailForm((prev) => ({ ...prev, body: e.target.value }))}
                    className="mt-1 min-h-[100px] resize-none transition-all duration-200 focus:scale-105"
                    placeholder="Enter your message..."
                  />
                </div>

                <div className="border border-dashed border-muted-foreground/30 rounded-lg p-4 animate-in fade-in slide-in-from-left duration-300 delay-300 transition-all duration-200 hover:border-primary/50">
                  <div className="flex flex-col items-center space-y-2">
                    <Upload className="w-8 h-8 text-muted-foreground transition-all duration-200" />
                    <div className="text-center">
                      <p className="text-sm text-muted-foreground mb-2">PDF Attachment</p>
                      {!pdfFile ? (
                        <Button
                          onClick={generatePdfForEmail}
                          disabled={generatingPdf}
                          variant="outline"
                          size="sm"
                          className="transition-all duration-200 hover:scale-105 bg-transparent"
                        >
                          {generatingPdf ? (
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          ) : (
                            <FileText className="w-4 h-4 mr-2" />
                          )}
                          Generate PDF
                        </Button>
                      ) : (
                        <div className="flex items-center space-x-2 text-sm text-green-600 animate-in fade-in duration-300">
                          <Check className="w-4 h-4" />
                          <span>{pdfFile.name}</span>
                          <Button
                            onClick={() => setPdfFile(null)}
                            variant="ghost"
                            size="sm"
                            className="h-6 w-6 p-0 text-red-500 hover:text-red-700 transition-all duration-200"
                          >
                            <X className="w-4 h-4" />
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row justify-end space-y-2 sm:space-y-0 sm:space-x-2 pt-4 animate-in fade-in slide-in-from-bottom duration-300 delay-400">
                  <Button
                    variant="outline"
                    onClick={() => setEmailModalOpen(false)}
                    className="transition-all duration-200 hover:scale-105"
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={sendEmail}
                    disabled={isSendingEmail || !pdfFile}
                    className="transition-all duration-200 hover:scale-105 disabled:opacity-50"
                  >
                    {isSendingEmail ? (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                      <Mail className="w-4 h-4 mr-2" />
                    )}
                    Send Email
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>

          <Card className="glass-card mb-8 animate-in fade-in slide-in-from-top duration-500 delay-100">
            <CardHeader>
              <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between">
                <div>
                  <CardTitle className="text-xl sm:text-2xl lg:text-3xl mb-2 text-white break-words">
                    {meeting.title}
                  </CardTitle>
                  <div className="flex flex-wrap items-center gap-2 sm:gap-4 text-sm sm:text-base text-muted-foreground">
                    <div className="flex items-center space-x-1 transition-all duration-200 hover:text-primary">
                      <Calendar className="w-4 h-4" />
                      <span>{new Date(meeting.upload_date).toLocaleDateString()}</span>
                    </div>
                    <div className="flex items-center space-x-1 transition-all duration-200 hover:text-primary">
                      <FileText className="w-4 h-4" />
                      <span className="truncate max-w-[150px] sm:max-w-none">{displayFileName(meeting.filename)}</span>
                    </div>
                    <div className="flex items-center space-x-1 transition-all duration-200 hover:text-primary">
                      <TrendingUp className="w-4 h-4" />
                      <span className={`${getSentimentColor(meeting.notes.sentiment)} sm:text-justify`}>
                        {getSentimentIcon(meeting.notes.sentiment)} {meeting.notes.sentiment || "Neutral"}
                      </span>
                    </div>
                  </div>
                </div>
                <Badge
                  variant="secondary"
                  className="bg-accent/20 text-accent border-accent/30 mt-4 lg:mt-0 self-start transition-all duration-200 hover:scale-110"
                >
                  Completed
                </Badge>
              </div>
            </CardHeader>
          </Card>

          <div className="grid grid-cols-1 xl:grid-cols-4 gap-8">
            <div className="xl:col-span-1 animate-in fade-in slide-in-from-left duration-500 delay-200">
              <Card className="glass-card xl:sticky xl:top-6 transition-all duration-300 hover:shadow-2xl overflow-hidden border-0 bg-transparent shadow-none sm:border sm:bg-card/50 sm:shadow-lg">
                <CardHeader className="p-4 pb-2">
                  <CardTitle className="text-lg font-medium flex items-center gap-2">
                    <FileText className="w-5 h-5 text-primary" />
                    <span>Media Preview</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-0 sm:p-2">
                  <div className="space-y-2">
                    {/* Media Container with Glow Effect - Restored */}
                    <div className={`relative rounded-xl transition-all duration-500 ${isPlaying ? "tile-accent p-[2px] scale-[1.01]" : "p-0"}`}>
                      <div className="bg-panel-2 border border-line relative group rounded-xl overflow-hidden">
                        {youTubeVideoId ? (
                          <YouTubePlayer
                            videoId={youTubeVideoId}
                            onReady={(media) => {
                              audioVideoRef.current = media as unknown as HTMLVideoElement
                              setMediaVersion((v) => v + 1)
                            }}
                            onPlayingChange={setIsPlaying}
                            onRateChange={setPlaybackRate}
                          />
                        ) : fileType === "video" ? (
                          <video
                            ref={audioVideoRef as React.RefObject<HTMLVideoElement>}
                            className="w-full h-[240px] object-contain transition-all duration-300"
                            controls
                            playsInline
                            preload="metadata"
                            onPlay={() => setIsPlaying(true)}
                            onPause={() => setIsPlaying(false)}
                            onRateChange={(e) => setPlaybackRate((e.target as HTMLVideoElement).playbackRate)}
                          >
                            {/* No type attribute: the browser reads the file itself (".m4a" isn't a real MIME type and made it skip the source). */}
                            <source src={fileUrl} />
                            Your browser does not support the video element.
                          </video>
                        ) : (
                          <div className="p-6 flex flex-col items-center justify-center space-y-4 bg-gradient-to-b from-white/5 to-transparent">
                            <div className={`w-24 h-24 rounded-full flex items-center justify-center transition-all duration-1000 ${isPlaying ? "bg-primary/20 animate-pulse" : "bg-white/5"}`}>
                              <AudioLines className={`w-10 h-10 transition-all duration-300 ${isPlaying ? "text-primary scale-110" : "text-muted-foreground"}`} />
                            </div>
                            <audio
                              ref={audioVideoRef as React.RefObject<HTMLAudioElement>}
                              className="w-full mt-4"
                              controls
                              preload="metadata"
                              onPlay={() => setIsPlaying(true)}
                              onPause={() => setIsPlaying(false)}
                              onRateChange={(e) => setPlaybackRate((e.target as HTMLAudioElement).playbackRate)}
                            >
                              <source src={fileUrl} />
                              Your browser does not support the audio element.
                            </audio>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Timer Display & Controls */}
                    <div className="flex flex-col gap-2 animate-in fade-in slide-in-from-bottom duration-500 delay-100">
                      {/* Timer */}
                      <div className="flex justify-center">
                        <div className="bg-panel-2 px-3 py-1 rounded-full border border-line text-xs font-mono text-primary">
                          {formatTimestamp(mediaCurrentTime)} / {formatTimestamp(mediaDuration || 0)}
                        </div>
                      </div>

                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="flex items-center space-x-2 flex-1 min-w-[120px]">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              if (audioVideoRef.current) audioVideoRef.current.currentTime -= 10
                            }}
                            className="btn-primary flex-1 h-8 bg-white/5 hover:border-primary/50 text-xs transition-all duration-300 group"
                            title="Rewind 10s"
                          >
                            <SkipBack className="w-3 h-3 mr-1 group-hover:-translate-x-1 transition-transform" />
                            -10s
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              if (audioVideoRef.current) audioVideoRef.current.currentTime += 10
                            }}
                            className="btn-primary flex-1 h-8 bg-white/5 hover:border-primary/50 text-xs transition-all duration-300 group"
                            title="Forward 10s"
                          >
                            <SkipForward className="w-3 h-3 mr-1 group-hover:translate-x-1 transition-transform" />
                            +10s
                          </Button>
                        </div>

                        <div className="flex items-center space-x-1 bg-white/5 rounded-lg p-1 border border-line flex-shrink-0 overflow-x-auto max-w-full">
                          <Gauge className="w-3 h-3 sm:w-4 sm:h-4 text-muted-foreground ml-1" />
                          <div className="flex items-center gap-1">
                            {[0.75, 1, 1.5, 2].map((rate) => (
                              <button
                                key={rate}
                                onClick={() => {
                                  if (audioVideoRef.current) {
                                    audioVideoRef.current.playbackRate = rate
                                    setPlaybackRate(rate)
                                  }
                                }}
                                className={`text-[10px] sm:text-xs px-2 sm:px-3 py-1 sm:py-1.5 rounded-lg transition-all duration-300 font-medium ${playbackRate === rate
                                  ? "tile-accent text-white shadow-lg shadow-primary/20 scale-105"
                                  : "text-muted-foreground hover:text-white hover:bg-white/10"
                                  }`}
                              >
                                {rate}x
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>

                      <div className="space-y-3 pt-4 border-t border-line">
                        <div className="flex items-center justify-between text-sm p-2 rounded-lg hover:bg-white/5 transition-colors duration-200 cursor-pointer group">
                          <span className="text-muted-foreground group-hover:text-primary transition-colors">Key Points</span>
                          <Badge
                            variant="outline"
                            className="bg-primary/10 border-primary/20 text-primary group-hover:scale-110 transition-all duration-200"
                          >
                            {keyPoints.length}
                          </Badge>
                        </div>
                        <div className="flex items-center justify-between text-sm p-2 rounded-lg hover:bg-white/5 transition-colors duration-200 cursor-pointer group">
                          <span className="text-muted-foreground group-hover:text-accent transition-colors">Action Items</span>
                          <Badge
                            variant="outline"
                            className="bg-accent/10 border-accent/20 text-accent group-hover:scale-110 transition-all duration-200"
                          >
                            {actionItems.length}
                          </Badge>
                        </div>
                        <div className="flex items-center justify-between text-sm p-2 rounded-lg hover:bg-white/5 transition-colors duration-200 cursor-pointer group">
                          <span className="text-muted-foreground group-hover:text-white transition-colors">Decisions</span>
                          <Badge
                            variant="outline"
                            className="bg-white/5 border-line text-muted-foreground group-hover:text-white group-hover:scale-110 transition-all duration-200"
                          >
                            {decisions.length}
                          </Badge>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            <div className="xl:col-span-3 animate-in fade-in slide-in-from-right duration-500 delay-200">
              <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
                <div className="overflow-x-auto p-1">
                  <TabsList className="glass w-full flex-wrap justify-start transition-all duration-300 gap-2 bg-white/5 border border-line p-1.5 h-auto sm:min-w-max sm:flex-nowrap">
                    {[
                      { value: "summary", label: "Summary", icon: Lightbulb },
                      { value: "key-points", label: `Key Points (${keyPoints.length})`, icon: FileText },
                      { value: "actions", label: `Actions (${actionItems.length})`, icon: CheckSquare },
                      { value: "transcript", label: "Transcript", icon: FileText },
                      { value: "translate", label: "Translate", icon: Languages }
                    ].map((tab) => {
                      const isActive = activeTab === tab.value;
                      const Icon = tab.icon;
                      return (
                        <TabsTrigger
                          key={tab.value}
                          value={tab.value}
                          className={`relative flex items-center space-x-2 px-6 py-2.5 rounded-xl transition-all duration-300 overflow-hidden group ${isActive
                            ? 'bg-primary/10 border border-accent/40 text-white scale-105 outline-none'
                            : 'text-white/60 hover:text-white hover:bg-white/10 hover:scale-105'
                            }`}
                        >
                          {/* Active Background Glow */}
                          {isActive && (
                            <div className="absolute inset-0 bg-primary/10 blur-xl opacity-70"></div>
                          )}

                          <Icon className={`w-4 h-4 transition-all duration-300 relative z-10 ${isActive ? 'text-accent scale-110' : 'group-hover:text-primary'}`} />
                          <span className="text-sm font-medium relative z-10 whitespace-nowrap">{tab.label}</span>

                          {/* Bottom active indicator */}
                          {isActive && (
                            <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-2 h-2 rounded-full bg-accent blur-[2px] z-20" />
                          )}
                        </TabsTrigger>
                      );
                    })}
                  </TabsList>
                </div>

                <TabsContent value="summary" className="space-y-6 animate-in fade-in duration-300">
                  <Card className="glass-card transition-all duration-300 hover:shadow-lg">
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <CardTitle>Meeting Summary</CardTitle>
                        <SpeakerControls
                          text={meeting.notes.summary || "No summary available"}
                          copyKey="summary"
                          copiedStates={copiedStates}
                          onCopy={copyToClipboard}
                          onSpeakingChange={(speaking, index) => {
                            setSummaryIsSpeaking(speaking)
                            setSummaryCurrentWordIndex(index)
                          }}
                        />
                      </div>
                    </CardHeader>
                    <CardContent>
                      <p className="text-foreground leading-relaxed sm:text-justify whitespace-pre-wrap">
                        {summaryIsSpeaking ? (
                          <span>
                            {summaryWordsRef.current.map((word, index) => (
                              <span
                                key={index}
                                className={`inline transition-all duration-100 ${summaryCurrentWordIndex === index ? "animate-text-glow" : ""}`}
                              >
                                {word}{summaryIsCharBasedRef.current ? "" : " "}
                              </span>
                            ))}
                          </span>
                        ) : (
                          meeting.notes.summary || "No summary available"
                        )}
                      </p>
                    </CardContent>
                  </Card>

                  {decisions.length > 0 && (
                    <Card className="glass-card transition-all duration-300 hover:shadow-lg animate-in fade-in duration-300 delay-100">
                      <CardHeader>
                        <div className="flex items-center justify-between">
                          <CardTitle className="flex items-center space-x-2">
                            <CheckSquare className="w-5 h-5" />
                            <span>Key Decisions</span>
                          </CardTitle>
                          <SpeakerControls
                            text={decisions.join("\n\n")}
                            copyKey="decisions"
                            copiedStates={copiedStates}
                            onCopy={copyToClipboard}
                            onSpeakingChange={(speaking, index) => {
                              setSummaryDecisionsIsSpeaking(speaking)
                              setSummaryDecisionsCurrentWordIndex(index)
                            }}
                          />
                        </div>
                      </CardHeader>
                      <CardContent>
                        {summaryDecisionsIsSpeaking ? (
                          <ul className="space-y-3">
                            {summaryDecisionsPointsWordsRef.current.map((pointWords, pointIndex) => {
                              let isCurrentPoint = false
                              let localIndex = -1
                              if (summaryDecisionsCurrentWordIndex >= summaryDecisionsCumulativeRef.current[pointIndex] && summaryDecisionsCurrentWordIndex < summaryDecisionsCumulativeRef.current[pointIndex + 1]) {
                                isCurrentPoint = true
                                localIndex = summaryDecisionsCurrentWordIndex - summaryDecisionsCumulativeRef.current[pointIndex]
                              }
                              return (
                                <li
                                  key={pointIndex}
                                  className="flex items-start space-x-3 transition-all duration-200 hover:translate-x-1"
                                >
                                  <div className="w-2 h-2 bg-accent rounded-full mt-2 flex-shrink-0"></div>
                                  <span className="text-foreground sm:text-justify">
                                    {isCurrentPoint ? (
                                      <span>
                                        {pointWords.map((word, wordIndex) => (
                                          <span
                                            key={wordIndex}
                                            className={`inline transition-all duration-100 ${localIndex === wordIndex ? "animate-text-glow" : ""}`}
                                          >
                                            {word}{summaryDecisionsIsCharBasedRef.current ? "" : " "}
                                          </span>
                                        ))}
                                      </span>
                                    ) : (
                                      pointWords.join(summaryDecisionsIsCharBasedRef.current ? "" : " ")
                                    )}
                                  </span>
                                </li>
                              )
                            })}
                          </ul>
                        ) : (
                          <ul className="space-y-3">
                            {decisions.map((decision: string, index: number) => (
                              <li
                                key={index}
                                className="flex items-start space-x-3 transition-all duration-200 hover:translate-x-1"
                              >
                                <div className="w-2 h-2 bg-accent rounded-full mt-2 flex-shrink-0"></div>
                                <span className="text-foreground sm:text-justify">{decision}</span>
                              </li>
                            ))}
                          </ul>
                        )}
                      </CardContent>
                    </Card>
                  )}
                </TabsContent>

                <TabsContent value="key-points" className="space-y-6 animate-in fade-in duration-300">
                  <Card className="glass-card transition-all duration-300 hover:shadow-lg">
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <CardTitle className="flex items-center space-x-2">
                          <span>Key Discussion Points</span>
                          <Badge
                            variant="outline"
                            className="border-primary/30 text-primary transition-all duration-200 hover:scale-110"
                          >
                            {keyPoints.length} points
                          </Badge>
                        </CardTitle>
                        {keyPoints.length > 0 && (
                          <SpeakerControls
                            text={keyPoints.join("\n\n")}
                            copyKey="keyPoints"
                            copiedStates={copiedStates}
                            onCopy={copyToClipboard}
                            onSpeakingChange={(speaking, index) => {
                              setKeyPointsIsSpeaking(speaking)
                              setKeyPointsCurrentWordIndex(index)
                            }}
                          />
                        )}
                      </div>
                    </CardHeader>
                    <CardContent>
                      {keyPoints.length > 0 ? (
                        keyPointsIsSpeaking ? (
                          <ul className="space-y-4">
                            {keyPointsPointsWordsRef.current.map((pointWords, pointIndex) => {
                              let isCurrentPoint = false
                              let localIndex = -1
                              if (keyPointsCurrentWordIndex >= keyPointsCumulativeRef.current[pointIndex] && keyPointsCurrentWordIndex < keyPointsCumulativeRef.current[pointIndex + 1]) {
                                isCurrentPoint = true
                                localIndex = keyPointsCurrentWordIndex - keyPointsCumulativeRef.current[pointIndex]
                              }
                              return (
                                <li
                                  key={pointIndex}
                                  className="flex items-start space-x-3 transition-all duration-200 hover:translate-x-1"
                                >
                                  <div className="w-6 h-6 tile-accent rounded-full flex items-center justify-center text-white text-sm font-medium flex-shrink-0 mt-0.5 transition-all duration-200 hover:scale-110">
                                    {pointIndex + 1}
                                  </div>
                                  <span className="text-foreground leading-relaxed sm:text-justify flex-1">
                                    {isCurrentPoint ? (
                                      <span>
                                        {pointWords.map((word, wordIndex) => (
                                          <span
                                            key={wordIndex}
                                            className={`inline transition-all duration-100 ${localIndex === wordIndex ? "animate-text-glow" : ""}`}
                                          >
                                            {word}{keyPointsIsCharBasedRef.current ? "" : " "}
                                          </span>
                                        ))}
                                      </span>
                                    ) : (
                                      pointWords.join(keyPointsIsCharBasedRef.current ? "" : " ")
                                    )}
                                  </span>
                                </li>
                              )
                            })}
                          </ul>
                        ) : (
                          <ul className="space-y-4">
                            {keyPoints.map((point: string, index: number) => (
                              <li
                                key={index}
                                className="flex items-start space-x-3 transition-all duration-200 hover:translate-x-1"
                              >
                                <div className="w-6 h-6 tile-accent rounded-full flex items-center justify-center text-white text-sm font-medium flex-shrink-0 mt-0.5 transition-all duration-200 hover:scale-110">
                                  {index + 1}
                                </div>
                                <span className="text-foreground leading-relaxed sm:text-justify flex-1">{point}</span>
                              </li>
                            ))}
                          </ul>
                        )
                      ) : (
                        <div className="text-center py-8 animate-in fade-in duration-300">
                          <FileText className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                          <p className="text-muted-foreground">
                            No key points were extracted from this meeting.
                            <br />
                            <span className="text-sm">This might happen with very short or unclear audio.</span>
                          </p>
                          <Button
                            onClick={() => fetchMeetingDetails()}
                            variant="outline"
                            size="sm"
                            className="mt-4 transition-all duration-200 hover:scale-105"
                            disabled={isRefreshing}
                          >
                            {isRefreshing ? (
                              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            ) : (
                              <RefreshCw className="w-4 h-4 mr-2" />
                            )}
                            Refresh Data
                          </Button>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </TabsContent>

                <TabsContent value="actions" className="space-y-6 animate-in fade-in duration-300">
                  <Card className="glass-card transition-all duration-300 hover:shadow-lg">
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <CardTitle className="flex items-center space-x-2">
                          <CheckSquare className="w-5 h-5" />
                          <span>Action Items</span>
                        </CardTitle>
                        {actionItems.length > 0 && (
                          <SpeakerControls
                            text={actionItems.join("\n\n")}
                            copyKey="actionItems"
                            copiedStates={copiedStates}
                            onCopy={copyToClipboard}
                            onSpeakingChange={(speaking, index) => {
                              setActionItemsIsSpeaking(speaking)
                              setActionItemsCurrentWordIndex(index)
                            }}
                          />
                        )}
                      </div>
                    </CardHeader>
                    <CardContent>
                      {actionItems.length > 0 ? (
                        actionItemsIsSpeaking ? (
                          <ul className="space-y-4">
                            {actionItemsPointsWordsRef.current.map((pointWords, pointIndex) => {
                              let isCurrentPoint = false
                              let localIndex = -1
                              if (actionItemsCurrentWordIndex >= actionItemsCumulativeRef.current[pointIndex] && actionItemsCurrentWordIndex < actionItemsCumulativeRef.current[pointIndex + 1]) {
                                isCurrentPoint = true
                                localIndex = actionItemsCurrentWordIndex - actionItemsCumulativeRef.current[pointIndex]
                              }
                              return (
                                <li
                                  key={pointIndex}
                                  className="flex items-start space-x-3 p-3 glass rounded-lg transition-all duration-200 hover:bg-primary/10 hover:translate-x-1"
                                >
                                  <CheckSquare className="w-5 h-5 text-accent mt-0.5 flex-shrink-0 transition-all duration-200" />
                                  <span className="text-foreground leading-relaxed sm:text-justify flex-1">
                                    {isCurrentPoint ? (
                                      <span>
                                        {pointWords.map((word, wordIndex) => (
                                          <span
                                            key={wordIndex}
                                            className={`inline transition-all duration-100 ${localIndex === wordIndex ? "animate-text-glow" : ""}`}
                                          >
                                            {word}{actionItemsIsCharBasedRef.current ? "" : " "}
                                          </span>
                                        ))}
                                      </span>
                                    ) : (
                                      pointWords.join(actionItemsIsCharBasedRef.current ? "" : " ")
                                    )}
                                  </span>
                                </li>
                              )
                            })}
                          </ul>
                        ) : (
                          <ul className="space-y-4">
                            {actionItems.map((action: string, index: number) => (
                              <li
                                key={index}
                                className="flex items-start space-x-3 p-3 glass rounded-lg transition-all duration-200 hover:bg-primary/10 hover:translate-x-1"
                              >
                                <CheckSquare className="w-5 h-5 text-accent mt-0.5 flex-shrink-0 transition-all duration-200" />
                                <span className="text-foreground leading-relaxed sm:text-justify flex-1">{action}</span>
                              </li>
                            ))}
                          </ul>
                        )
                      ) : (
                        <p className="text-muted-foreground sm:text-justify">No action items identified</p>
                      )}
                    </CardContent>
                  </Card>

                  {decisions.length > 0 && (
                    <Card className="glass-card transition-all duration-300 hover:shadow-lg animate-in fade-in duration-300 delay-100">
                      <CardHeader>
                        <div className="flex items-center justify-between">
                          <CardTitle>Decisions Made</CardTitle>
                          <SpeakerControls
                            text={decisions.join("\n\n")}
                            copyKey="decisionsTab"
                            copiedStates={copiedStates}
                            onCopy={copyToClipboard}
                            onSpeakingChange={(speaking, index) => {
                              setActionsDecisionsIsSpeaking(speaking)
                              setActionsDecisionsCurrentWordIndex(index)
                            }}
                          />
                        </div>
                      </CardHeader>
                      <CardContent>
                        {actionsDecisionsIsSpeaking ? (
                          <ul className="space-y-3">
                            {actionsDecisionsPointsWordsRef.current.map((pointWords, pointIndex) => {
                              let isCurrentPoint = false
                              let localIndex = -1
                              if (actionsDecisionsCurrentWordIndex >= actionsDecisionsCumulativeRef.current[pointIndex] && actionsDecisionsCurrentWordIndex < actionsDecisionsCumulativeRef.current[pointIndex + 1]) {
                                isCurrentPoint = true
                                localIndex = actionsDecisionsCurrentWordIndex - actionsDecisionsCumulativeRef.current[pointIndex]
                              }
                              return (
                                <li
                                  key={pointIndex}
                                  className="flex items-start space-x-3 p-3 glass rounded-lg transition-all duration-200 hover:bg-primary/10 hover:translate-x-1"
                                >
                                  <div className="w-2 h-2 bg-primary rounded-full mt-2 flex-shrink-0"></div>
                                  <span className="text-foreground sm:text-justify flex-1">
                                    {isCurrentPoint ? (
                                      <span>
                                        {pointWords.map((word, wordIndex) => (
                                          <span
                                            key={wordIndex}
                                            className={`inline transition-all duration-100 ${localIndex === wordIndex ? "animate-text-glow" : ""}`}
                                          >
                                            {word}{actionsDecisionsIsCharBasedRef.current ? "" : " "}
                                          </span>
                                        ))}
                                      </span>
                                    ) : (
                                      pointWords.join(actionsDecisionsIsCharBasedRef.current ? "" : " ")
                                    )}
                                  </span>
                                </li>
                              )
                            })}
                          </ul>
                        ) : (
                          <ul className="space-y-3">
                            {decisions.map((decision: string, index: number) => (
                              <li
                                key={index}
                                className="flex items-start space-x-3 p-3 glass rounded-lg transition-all duration-200 hover:bg-primary/10 hover:translate-x-1"
                              >
                                <div className="w-2 h-2 bg-primary rounded-full mt-2 flex-shrink-0"></div>
                                <span className="text-foreground sm:text-justify flex-1">{decision}</span>
                              </li>
                            ))}
                          </ul>
                        )}
                      </CardContent>
                    </Card>
                  )}
                </TabsContent>

                <TabsContent value="transcript" className="space-y-6 animate-in fade-in duration-300">
                  <Card className="glass-card transition-all duration-300 hover:shadow-lg">
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <CardTitle>Full Transcript</CardTitle>
                        <SpeakerControls
                          text={
                            meeting.transcription.optimized ||
                            meeting.transcription.translated ||
                            meeting.transcription.raw ||
                            "No transcript available"
                          }
                          copyKey="transcript"
                          copiedStates={copiedStates}
                          onCopy={copyToClipboard}
                          onSpeakingChange={(speaking, index) => {
                            setTranscriptIsSpeaking(speaking)
                            setTranscriptCurrentWordIndex(index)
                          }}
                        />
                      </div>
                    </CardHeader>
                    <CardContent className="p-0">
                      <div className="premium-bg min-h-[500px] rounded-xl border border-line overflow-hidden relative group">
                        {/* Background Decorative Glows */}
                        <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 blur-3xl rounded-full translate-x-1/2 -translate-y-1/2 transition-opacity duration-500 group-hover:opacity-100 opacity-50"></div>
                        <div className="absolute bottom-0 left-0 w-64 h-64 bg-accent/5 blur-3xl rounded-full -translate-x-1/2 translate-y-1/2 transition-opacity duration-500 group-hover:opacity-100 opacity-50"></div>

                        <div className="relative z-10 p-8">
                          <div className="prose prose-invert max-w-none">
                            <div className="text-white/90 leading-relaxed space-y-6 text-lg tracking-wide sm:text-justify">
                              {transcriptIsSpeaking ? (
                                <div className="animate-in fade-in duration-300 sm:text-justify">
                                  {transcriptWordsRef.current.map((word, index) => (
                                    <span
                                      key={index}
                                      className={`inline transition-all duration-100 ${transcriptCurrentWordIndex === index ? "text-accent font-bold scale-110 shadow-accent animate-text-glow" : "text-white/70"}`}
                                    >
                                      {word}{transcriptIsCharBasedRef.current ? "" : " "}
                                    </span>
                                  ))}
                                </div>
                              ) : meeting.transcription.utterances && meeting.transcription.utterances.length > 0 ? (
                                <div className="space-y-6">
                                  {meeting.transcription.utterances.map((utterance, idx) => {
                                    const isActive = mediaCurrentTime >= utterance.start && mediaCurrentTime <= utterance.end;

                                    return (
                                      <div
                                        key={idx}
                                        id={`utterance-${idx}`}
                                        className={`group/utterance flex flex-col sm:flex-row sm:space-x-4 border-l-2 pl-4 scroll-mt-32 transition-all duration-300 py-3 relative ${isActive
                                          ? "border-primary bg-primary/5 scale-[1.02] shadow-sm rounded-r-lg"
                                          : "border-primary/20 hover:border-primary/50"
                                          }`}
                                      >
                                        <div className={`flex items-center justify-between sm:flex-col sm:items-start sm:justify-start ${utterance.speaker ? 'min-w-[140px]' : 'min-w-[80px]'} mb-2 sm:mb-0`}>
                                          {utterance.speaker && (
                                            <span className={`font-bold text-sm uppercase tracking-wider transition-colors duration-300 ${isActive ? "text-primary opacity-100" : "text-accent opacity-80"
                                              }`}>
                                              {utterance.speaker}
                                            </span>
                                          )}
                                          <div className="flex items-center space-x-2 mt-1">
                                            <Button
                                              variant="ghost"
                                              size="sm"
                                              onClick={() => seekTo(utterance.start)}
                                              className={`h-7 px-2 text-xs font-mono glass-button bg-transparent transition-all duration-300 ${isActive ? "text-primary border-primary/40 bg-primary/10" : "text-muted-foreground hover:text-primary"
                                                }`}
                                            >
                                              <Play className={`w-3 h-3 mr-1 ${isActive ? "fill-primary text-primary" : ""}`} />
                                              {formatTimestamp(utterance.start)}
                                            </Button>
                                          </div>
                                        </div>
                                        <div className={`mt-1 flex-1 transition-colors duration-300 ${isActive ? "text-foreground" : "text-muted-foreground group-hover/utterance:text-foreground"
                                          }`}>
                                          <div className="text-sm sm:text-base leading-relaxed sm:text-justify whitespace-pre-wrap">
                                            {utterance.words && utterance.words.length > 0 ? (
                                              utterance.words.map((word, wIdx) => {
                                                const isWordActive = mediaCurrentTime >= word.start && mediaCurrentTime <= word.end;
                                                return (
                                                  <span
                                                    key={wIdx}
                                                    className={`inline-block mr-1 px-0.5 rounded transition-all duration-200 ${isWordActive
                                                      ? "animate-word-highlight"
                                                      : "hover:bg-primary/5"
                                                      }`}
                                                  >
                                                    {word.text}
                                                  </span>
                                                )
                                              })
                                            ) : (
                                              utterance.text
                                            )}
                                          </div>
                                        </div>
                                        {isActive && (
                                          <div className="absolute -left-[2px] top-0 bottom-0 w-1 bg-primary animate-pulse" />
                                        )}
                                      </div>
                                    )
                                  })}
                                </div>
                              ) : (() => {
                                const text = meeting.transcription.optimized ||
                                  meeting.transcription.translated ||
                                  meeting.transcription.raw ||
                                  "No transcript available";

                                // Split by newlines and handle speaker bolding
                                return text.split('\n').map((line, idx) => {
                                  if (!line.trim()) return <br key={idx} />;

                                  // Check for Speaker pattern (e.g., "Speaker 1:", "John Doe:", "AI Assistant:")
                                  const speakerMatch = line.match(/^([^:]+):/);
                                  if (speakerMatch) {
                                    const speaker = speakerMatch[1];
                                    const content = line.substring(speakerMatch[0].length);
                                    return (
                                      <div key={idx} className="mb-4 flex flex-col sm:flex-row sm:space-x-4 border-l-2 border-primary/20 pl-4 hover:border-primary/50 transition-colors duration-300 py-2">
                                        <span className="text-accent font-bold min-w-[120px] text-sm uppercase tracking-wider mb-1 sm:mb-0 opacity-80 decoration-accent/30 underline-offset-4 underline">
                                          {speaker}
                                        </span>
                                        <span className="text-white/80 flex-1 sm:text-justify leading-relaxed">
                                          {content}
                                        </span>
                                      </div>
                                    );
                                  }

                                  return <p key={idx} className="mb-4 text-white/80 sm:text-justify leading-relaxed">{line}</p>;
                                });
                              })()}
                            </div>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>

                <TabsContent value="translate" className="space-y-6 animate-in fade-in duration-300">
                  <Card className="glass-card transition-all duration-300 hover:shadow-lg">
                    <CardHeader>
                      <CardTitle className="flex items-center space-x-2">
                        <Languages className="w-5 h-5" />
                        <span>Text Translation</span>
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="animate-in fade-in slide-in-from-left duration-300">
                        <Label htmlFor="translate-text">Text to Translate</Label>
                        <Textarea
                          id="translate-text"
                          placeholder="Enter text to translate..."
                          value={translationText}
                          onChange={(e) => setTranslationText(e.target.value)}
                          className="min-h-[100px] mt-1 resize-none sm:text-justify transition-all duration-200 focus:scale-105"
                        />
                      </div>

                      <div className="animate-in fade-in slide-in-from-left duration-300 delay-100">
                        <Label htmlFor="target-language">Target Language</Label>
                        <Select value={selectedLanguage} onValueChange={setSelectedLanguage}>
                          <SelectTrigger className="mt-1 bg-background border-input transition-all duration-200 hover:border-primary">
                            <SelectValue placeholder="Select language" />
                          </SelectTrigger>
                          <SelectContent className="bg-background border-input">
                            {languages.map((lang) => (
                              <SelectItem
                                key={lang.code}
                                value={lang.code}
                                className="text-foreground hover:bg-muted focus:bg-muted transition-all duration-200"
                              >
                                {lang.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <Button
                        onClick={translateText}
                        disabled={isTranslating || !translationText.trim()}
                        className="w-full transition-all duration-200 hover:scale-105 disabled:opacity-50 animate-in fade-in slide-in-from-left duration-300 delay-200"
                      >
                        {isTranslating ? (
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        ) : (
                          <Languages className="w-4 h-4 mr-2" />
                        )}
                        Translate
                      </Button>

                      {translatedText && (
                        <div className="space-y-2 animate-in fade-in slide-in-from-bottom duration-300">
                          <div className="flex items-center justify-between">
                            <Label>Translation Result</Label>
                            <SpeakerControls
                              text={translatedText}
                              copyKey="translation"
                              copiedStates={copiedStates}
                              onCopy={copyToClipboard}
                              onSpeakingChange={(speaking, index) => {
                                setTranslationIsSpeaking(speaking)
                                setTranslationCurrentWordIndex(index)
                              }}
                            />
                          </div>
                          <div className="relative">
                            <div className="min-h-[100px] bg-muted/50 p-2 rounded-md text-foreground sm:text-justify">
                              {translationIsSpeaking ? (
                                <span>
                                  {translationWordsRef.current.map((word, index) => (
                                    <span
                                      key={index}
                                      className={`inline transition-all duration-100 ${translationCurrentWordIndex === index ? "animate-text-glow" : ""}`}
                                    >
                                      {word}{translationIsCharBasedRef.current ? "" : " "}
                                    </span>
                                  ))}
                                </span>
                              ) : (
                                translatedText
                              )}
                            </div>
                          </div>
                        </div>
                      )}

                      <div className="p-4 bg-muted/20 rounded-lg border border-muted/20 transition-all duration-300 hover:border-primary/30">
                        <h4 className="font-medium mb-3 flex items-center space-x-2">
                          <Lightbulb className="w-4 h-4" />
                          <span>Quick Actions</span>
                        </h4>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setTranslationText(meeting.notes.summary || "")}
                            className="justify-start text-left h-auto py-2 px-3 transition-all duration-300 hover:scale-105 hover:bg-gradient-to-r hover:from-primary/30 hover:to-accent/30 hover:border-accent/40 hover:text-white"
                          >
                            <span className="truncate">Translate Summary</span>
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setTranslationText(keyPoints.join("\n"))}
                            className="justify-start text-left h-auto py-2 px-3 transition-all duration-300 hover:scale-105 hover:bg-gradient-to-r hover:from-primary/30 hover:to-accent/30 hover:border-accent/40 hover:text-white"
                          >
                            <span className="truncate">Translate Key Points</span>
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setTranslationText(actionItems.join("\n"))}
                            className="justify-start text-left h-auto py-2 px-3 transition-all duration-300 hover:scale-105 hover:bg-gradient-to-r hover:from-primary/30 hover:to-accent/30 hover:border-accent/40 hover:text-white"
                          >
                            <span className="truncate">Translate Actions</span>
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() =>
                              setTranslationText(
                                meeting.transcription.optimized ||
                                meeting.transcription.translated ||
                                meeting.transcription.raw ||
                                "",
                              )
                            }
                            className="justify-start text-left h-auto py-2 px-3 transition-all duration-300 hover:scale-105 hover:bg-gradient-to-r hover:from-primary/30 hover:to-accent/30 hover:border-accent/40 hover:text-white"
                          >
                            <span className="truncate">Translate Transcript</span>
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>
              </Tabs>
            </div>
          </div>
        </div>
      </section>

      {/* Animated Success Popup */}
      {actionSuccess && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center pointer-events-none">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300" />
          <div className="relative bg-panel border border-line p-8 rounded-3xl flex flex-col items-center space-y-4 animate-in zoom-in-95 slide-in-from-bottom-10 duration-500 overflow-hidden">
            {/* Background Effects */}
            <div className="absolute inset-0 bg-primary/10"></div>
            <div className="absolute top-0 left-0 w-full h-1 tile-accent animate-shimmer background-size-200"></div>

            {/* Animated Icon */}
            <div className="relative w-20 h-20 flex items-center justify-center">
              <div className="absolute inset-0 bg-accent/20 rounded-full animate-ping opacity-70"></div>
              <div className="absolute inset-0 bg-accent/10 rounded-full animate-pulse"></div>
              <div className="relative bg-gradient-to-br from-accent to-emerald-600 w-16 h-16 rounded-full flex items-center justify-center">
                <Check className="w-8 h-8 text-white stroke-[3] animate-in zoom-in duration-300 delay-150" />
              </div>
            </div>

            {/* Text Content */}
            <div className="text-center space-y-1 relative z-10">
              <h3 className="text-2xl font-bold text-white tracking-tight animate-in slide-in-from-bottom-2 duration-300 delay-100">
                {actionType === "email" ? "Email Sent!" : "Download Started!"}
              </h3>
              <p className="text-white/60 text-sm animate-in slide-in-from-bottom-2 duration-300 delay-200">
                {actionType === "email"
                  ? "Your notes are on the way."
                  : `Your ${actionType === "pdf" ? "PDF" : "Word"} file is ready.`}
              </p>
            </div>
          </div>
        </div>
      )}

    </div>
  )
}

export default MeetingNotesPage