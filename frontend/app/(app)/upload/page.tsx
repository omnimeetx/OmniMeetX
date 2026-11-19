"use client"
import { API_URL } from "@/lib/config"
import { refreshCredits } from "@/lib/credits"

import type React from "react"
import { useState, useCallback, useEffect, useRef } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  Upload,
  FileAudio,
  FileVideo,
  X,
  CheckCircle,
  AlertCircle,
  Loader2,
  Mic,
  Play,
  Pause,
  Square,
  Volume2,
  LinkIcon,
  Download as DownloadIcon,
  Languages
} from "lucide-react"
import dynamic from "next/dynamic"
import { motion, AnimatePresence } from "framer-motion"



interface UploadedFile {
  file: File
  preview?: string
  duration?: number
  isRecorded?: boolean
}

interface UploadBody {
  title: string;
  language: string;
  transcript_language: string;
  filename?: string;
  url?: string;
  source_url?: string;
}

interface DownloadProgress {
  status: string;
  progress?: number;
  downloaded_bytes?: number;
  total_bytes?: number;
  filename?: string;
  error?: string;
}

const TRANSCRIPT_LANGUAGES = [
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
  { code: "zh", name: "Chinese (Simplified)" },
  { code: "zh-tw", name: "Chinese (Traditional)" },
  { code: "co", name: "Corsican" },
  { code: "hr", name: "Croatian" },
  { code: "cs", name: "Czech" },
  { code: "da", name: "Danish" },
  { code: "nl", name: "Dutch" },
  { code: "en", name: "English" },
  { code: "eo", name: "Esperanto" },
  { code: "et", name: "Estonian" },
  { code: "fil", name: "Filipino" },
  { code: "fi", name: "Finnish" },
  { code: "fr", name: "French" },
  { code: "gl", name: "Galician" },
  { code: "ka", name: "Georgian" },
  { code: "de", name: "German" },
  { code: "el", name: "Greek" },
  { code: "gu", name: "Gujarati" },
  { code: "ht", name: "Haitian Creole" },
  { code: "ha", name: "Hausa" },
  { code: "he", name: "Hebrew" },
  { code: "hi", name: "Hindi" },
  { code: "hu", name: "Hungarian" },
  { code: "is", name: "Icelandic" },
  { code: "ig", name: "Igbo" },
  { code: "id", name: "Indonesian" },
  { code: "ga", name: "Irish" },
  { code: "it", name: "Italian" },
  { code: "ja", name: "Japanese" },
  { code: "jv", name: "Javanese" },
  { code: "kn", name: "Kannada" },
  { code: "kk", name: "Kazakh" },
  { code: "km", name: "Khmer" },
  { code: "ko", name: "Korean" },
  { code: "ku", name: "Kurdish" },
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
  { code: "sr", name: "Serbian" },
  { code: "st", name: "Sesotho" },
  { code: "si", name: "Sinhala" },
  { code: "sk", name: "Slovak" },
  { code: "sl", name: "Slovenian" },
  { code: "so", name: "Somali" },
  { code: "es", name: "Spanish" },
  { code: "su", name: "Sundanese" },
  { code: "sw", name: "Swahili" },
  { code: "sv", name: "Swedish" },
  { code: "ta", name: "Tamil" },
  { code: "te", name: "Telugu" },
  { code: "th", name: "Thai" },
  { code: "tr", name: "Turkish" },
  { code: "tk", name: "Turkmen" },
  { code: "uk", name: "Ukrainian" },
  { code: "ur", name: "Urdu" },
  { code: "uz", name: "Uzbek" },
  { code: "vi", name: "Vietnamese" },
  { code: "cy", name: "Welsh" },
  { code: "xh", name: "Xhosa" },
  { code: "yi", name: "Yiddish" },
  { code: "yo", name: "Yoruba" },
  { code: "zu", name: "Zulu" }
];


export default function UploadPage() {
  const [uploadedFile, setUploadedFile] = useState<UploadedFile | null>(null)
  const [uploadedUrl, setUploadedUrl] = useState<string>("")
  const [urlPreview, setUrlPreview] = useState<string | null>(null)
  const [downloadedFilename, setDownloadedFilename] = useState<string | null>(null)
  const [isDownloading, setIsDownloading] = useState(false)
  const [downloadProgress, setDownloadProgress] = useState<DownloadProgress | null>(null)
  const [title, setTitle] = useState("")
  const [spokenLanguage, setSpokenLanguage] = useState<string>("auto")
  const [transcriptLanguage, setTranscriptLanguage] = useState<string>("en")
  const [isUploading, setIsUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [progressStage, setProgressStage] = useState<"downloading" | "uploading" | null>(null)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")
  const [dragActive, setDragActive] = useState(false)
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [isRecording, setIsRecording] = useState(false)
  const [recordingTime, setRecordingTime] = useState(0)
  const [isPlaying, setIsPlaying] = useState(false)
  const [showRecordingSuccess, setShowRecordingSuccess] = useState(false)
  const [shouldAutoUpload, setShouldAutoUpload] = useState(false)

  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const recordingIntervalRef = useRef<NodeJS.Timeout | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const eventSourceRef = useRef<EventSource | null>(null)

  const router = useRouter()

  useEffect(() => {
    const token = localStorage.getItem("token")
    if (!token) {
      router.push("/login")
    } else {
      setIsAuthenticated(true)
    }
  }, [router])

  // Cleanup EventSource on unmount
  useEffect(() => {
    return () => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close()
      }
    }
  }, [])

  // Auto-upload after download completes
  useEffect(() => {
    if (shouldAutoUpload && downloadedFilename) {
      handleUpload()
    }
  }, [shouldAutoUpload, downloadedFilename])

  const supportedFormats = [".mp3", ".wav", ".mp4", ".avi", ".mov", ".m4a", ".flac", ".webm", ".ogg"]

  const startRecording = async () => {
    try {
      // Voice only: the microphone, never the camera.
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        }
      })

      streamRef.current = stream

      // Opus in WebM on Chrome, Edge and Firefox; AAC in MP4 on Safari.
      const mimeType = ["audio/webm;codecs=opus", "audio/webm", "audio/mp4"].find((t) => MediaRecorder.isTypeSupported(t)) || ""

      const mediaRecorder = new MediaRecorder(stream, {
        ...(mimeType ? { mimeType } : {}),
        audioBitsPerSecond: 64000, // plenty for speech, about 0.5 MB a minute
      })

      const chunks: BlobPart[] = []

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunks.push(event.data)
        }
      }

      mediaRecorder.onstop = () => {
        const type = mediaRecorder.mimeType || mimeType || "audio/webm"
        const blob = new Blob(chunks, { type })

        const fileExtension = type.includes("mp4") ? ".m4a" : ".webm"
        const recordedFile = new File([blob], `voice-recording-${Date.now()}${fileExtension}`, { type })

        const preview = URL.createObjectURL(blob)

        setUploadedFile({
          file: recordedFile,
          preview,
          isRecorded: true
        })
        setUploadedUrl("")
        setUrlPreview(null)
        setDownloadedFilename(null)

        if (!title) {
          const now = new Date()
          const timestamp = now.toLocaleString()
          setTitle(`Voice recording - ${timestamp}`)
        }

        setShowRecordingSuccess(true)
        setTimeout(() => setShowRecordingSuccess(false), 3000)

        stream.getTracks().forEach(track => track.stop())
      }

      mediaRecorder.start()
      mediaRecorderRef.current = mediaRecorder
      setIsRecording(true)
      setRecordingTime(0)

      recordingIntervalRef.current = setInterval(() => {
        setRecordingTime(prev => prev + 1)
      }, 1000)

    } catch (err) {
      console.error("Error accessing the microphone:", err)
      setError("Couldn't use your microphone. Please allow microphone access and try again.")
    }
  }

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop()
    }

    if (recordingIntervalRef.current) {
      clearInterval(recordingIntervalRef.current)
    }

    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop())
    }

    setIsRecording(false)
  }

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true)
    } else if (e.type === "dragleave") {
      setDragActive(false)
    }
  }, [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)

    const files = Array.from(e.dataTransfer.files)
    if (files.length > 0) {
      handleFileSelection(files[0])
    }
  }, [])

  const handleFileSelection = (file: File) => {
    setError("")
    setSuccess("")
    setUploadedUrl("")
    setUrlPreview(null)
    setDownloadedFilename(null)
    setDownloadProgress(null)

    const fileExtension = "." + file.name.split(".").pop()?.toLowerCase()
    if (!supportedFormats.includes(fileExtension)) {
      setError(`Unsupported file format. Please use: ${supportedFormats.join(", ")}`)
      return
    }

    const maxSize = 100 * 1024 * 1024
    if (file.size > maxSize) {
      setError("File size too large. Maximum size is 100MB.")
      return
    }

    const preview = URL.createObjectURL(file)

    setUploadedFile({
      file,
      preview,
      isRecorded: false
    })

    if (!title) {
      const nameWithoutExtension = file.name.replace(/\.[^/.]+$/, "")
      setTitle(nameWithoutExtension)
    }
  }

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (files && files.length > 0) {
      handleFileSelection(files[0])
    }
  }

  const handleUrlInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const url = e.target.value.trim()
    setError("")
    setUploadedUrl(url)
    setUploadedFile(null)
    setDownloadedFilename(null)
    setDownloadProgress(null)
    setShowRecordingSuccess(false)

    let previewUrl: string | null = null;

    if (url) {
      // YouTube
      const ytRegex = /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?|shorts)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/
      const ytMatch = url.match(ytRegex)
      if (ytMatch) {
        previewUrl = `https://www.youtube.com/embed/${ytMatch[1]}`
      }
      // Instagram
      else if (url.includes('instagram.com')) {
        const igPostRegex = /instagram\.com\/(?:p|reel)\/([a-zA-Z0-9_-]+)\/?/
        const igMatch = url.match(igPostRegex)
        if (igMatch) {
          const type = url.includes('/reel/') ? 'reel' : 'p'
          previewUrl = `https://www.instagram.com/${type}/${igMatch[1]}/embed/`
        }
      }
      // Facebook
      else if (url.includes('facebook.com')) {
        previewUrl = `https://www.facebook.com/plugins/video.php?href=${encodeURIComponent(url)}&show_text=false&width=560`
      }
      // Twitter/X
      else if (url.includes('twitter.com') || url.includes('x.com')) {
        const twitterRegex = /(?:twitter\.com|x\.com)\/[^\/]+\/status\/(\d+)/
        const twitterMatch = url.match(twitterRegex)
        if (twitterMatch) {
          previewUrl = `https://twitframe.com/show?url=${encodeURIComponent(url)}`
        }
      }
      // TikTok
      else if (url.includes('tiktok.com')) {
        const tiktokRegex = /tiktok\.com\/@[^\/]+\/video\/(\d+)/
        const tiktokMatch = url.match(tiktokRegex)
        if (tiktokMatch) {
          previewUrl = `https://www.tiktok.com/embed/v2/${tiktokMatch[1]}`
        }
      }
      // Vimeo
      else if (url.includes('vimeo.com')) {
        const vimeoRegex = /vimeo\.com\/(?:video\/)?(\d+)/
        const vimeoMatch = url.match(vimeoRegex)
        if (vimeoMatch) {
          previewUrl = `https://player.vimeo.com/video/${vimeoMatch[1]}`
        }
      }
      // Dailymotion
      else if (url.includes('dailymotion.com') || url.includes('dai.ly')) {
        const dailymotionRegex = /(?:dailymotion\.com\/video\/|dai\.ly\/)([a-zA-Z0-9]+)/
        const dailymotionMatch = url.match(dailymotionRegex)
        if (dailymotionMatch) {
          previewUrl = `https://www.dailymotion.com/embed/video/${dailymotionMatch[1]}`
        }
      }
      // SoundCloud
      else if (url.includes('soundcloud.com')) {
        previewUrl = `https://w.soundcloud.com/player/?url=${encodeURIComponent(url)}&color=%23ff5500&auto_play=false&hide_related=true&show_comments=false&show_user=true&show_reposts=false`
      }
      // Google Drive (for Google Meet recordings)
      else if (url.includes('drive.google.com')) {
        const driveRegex = /drive\.google\.com\/file\/d\/([a-zA-Z0-9_-]+)\/(?:view|preview|edit)?/
        const driveMatch = url.match(driveRegex)
        if (driveMatch) {
          previewUrl = `https://drive.google.com/file/d/${driveMatch[1]}/preview`
        }
      }
      // Microsoft Stream (for Microsoft Teams recordings)
      else if (url.includes('microsoftstream.com') || url.includes('stream.office.com')) {
        const streamRegex = /(?:web\.microsoftstream\.com|stream\.office\.com)\/video\/([a-zA-Z0-9_-]+)/
        const streamMatch = url.match(streamRegex)
        if (streamMatch) {
          previewUrl = `https://web.microsoftstream.com/embed/video/${streamMatch[1]}?autoplay=false&showinfo=true`
        }
      }
      // Google Meet Recordings (direct from Google Meet)
      else if (url.includes('meet.google.com') && (url.includes('/rec') || url.includes('recordings'))) {
        // Google Meet recording links - these are the actual recording URLs
        const meetRecordingRegex = /meet\.google\.com\/(?:rec\/)?([a-z-]+)(?:\/recordings)?/
        const meetMatch = url.match(meetRecordingRegex)
        if (meetMatch) {
          // Google Meet recordings are stored in Google Drive, so we redirect to the Drive preview
          // Note: This might require the user to have access to the recording
          previewUrl = `https://drive.google.com/file/d/${meetMatch[1]}/preview`
          setError("Google Meet recording detected. Preview may require Google Drive access.")
        }
      }
      // Zoom Cloud Recordings
      else if (url.includes('zoom.us/rec') || url.includes('zoom.us/recording') || url.includes('zoom.us/rec/share')) {
        // Zoom cloud recording links
        const zoomRegex = /zoom\.us\/rec(?:\/share)?\/(?:play\/)?([a-zA-Z0-9_-]+)/
        const zoomMatch = url.match(zoomRegex)
        if (zoomMatch) {
          const recordingId = zoomMatch[1]
          previewUrl = `https://zoom.us/rec/play/${recordingId}?autoplay=false`
        }
      }
      // Zoom Share Links (alternative format)
      else if (url.includes('zoom.us/recording/share') || url.includes('zoom.us/s/')) {
        const zoomShareRegex = /zoom\.us\/(?:recording\/share|s)\/([a-zA-Z0-9_-]+)/
        const zoomShareMatch = url.match(zoomShareRegex)
        if (zoomShareMatch) {
          const shareId = zoomShareMatch[1]
          previewUrl = `https://zoom.us/rec/share/${shareId}?autoplay=false`
        }
      }
      // Zoom Play Links (direct playback)
      else if (url.includes('zoom.us/rec/play')) {
        // Already a direct Zoom playback link
        previewUrl = `${url}?autoplay=false`
      }
      // Microsoft Teams recording links (often redirect to Stream, but handle direct if possible)
      else if (url.includes('teams.microsoft.com')) {
        // Teams recording links typically contain a thread or message ID, but for simplicity, assume it's a share link to Stream
        // If it's a direct Teams link, might need to extract the video ID or warn user to use the Stream share link
        setError("For Microsoft Teams, please use the share link from Microsoft Stream. Direct Teams links may not preview correctly, but download might still work.")
      }
      // Add more platforms as needed
      else {
        // Allow downloading from other platforms even without preview
        setUrlPreview(null)
      }
    }

    setUrlPreview(previewUrl)

    if (url && !title) {
      setTitle(`Media from URL - ${new Date().toLocaleString()}`)
    }
  }

  const removeFile = () => {
    if (uploadedFile?.preview) {
      URL.revokeObjectURL(uploadedFile.preview)
    }
    setUploadedFile(null)
    setTitle("")
    setShowRecordingSuccess(false)
  }

  const removeUrl = () => {
    setUploadedUrl("")
    setUrlPreview(null)
    setDownloadedFilename(null)
    setDownloadProgress(null)
    setTitle("")
  }

  const handleDownloadVideo = async () => {
    if (!uploadedUrl) return

    setIsDownloading(true)
    setIsUploading(true) // Start unified progress
    setProgressStage("downloading")
    setUploadProgress(0)
    setDownloadProgress({ status: "starting" })
    setError("")
    setSuccess("")

    try {
      const token = localStorage.getItem("token")

      // Close any existing EventSource
      if (eventSourceRef.current) {
        eventSourceRef.current.close()
      }

      // Create new EventSource for real-time progress
      const eventSource = new EventSource(
        `${API_URL}/api/download_video?url=${encodeURIComponent(uploadedUrl)}&token=${token}`
      )

      eventSourceRef.current = eventSource

      eventSource.onmessage = (event) => {
        try {
          const data: DownloadProgress = JSON.parse(event.data)
          setDownloadProgress(data)

          // Map download progress to 0-50%
          if (data.status === "downloading" && data.progress) {
            setUploadProgress(data.progress)
          }

          if (data.status === "finished" && data.filename) {
            setDownloadedFilename(data.filename)
            setUploadProgress(100) // Download complete
            setSuccess("Media downloaded successfully!")
            eventSource.close()
            setIsDownloading(false)

            if (!title) {
              setTitle(`Media from URL - ${new Date().toLocaleString()}`)
            }

            // Auto-trigger upload
            setShouldAutoUpload(true)
          } else if (data.status === "error") {
            setError(data.error || "Download failed")
            eventSource.close()
            setIsDownloading(false)
            setIsUploading(false)
            setProgressStage(null)
          }
        } catch (err) {
          console.error("Error parsing SSE data:", err)
        }
      }

      eventSource.onerror = (err) => {
        console.error("EventSource error:", err)
        setError("Download connection failed")
        eventSource.close()
        setIsDownloading(false)
        setIsUploading(false)
        setProgressStage(null)
      }

    } catch (err) {
      console.error("Download error:", err)
      setError(
        err && typeof err === "object" && "message" in err
          ? (err as { message: string }).message
          : "Failed to download media from URL. Please try again."
      )
      setIsDownloading(false)
      setIsUploading(false)
      setProgressStage(null)
    }
  }

  const handleUpload = async () => {
    if (!uploadedFile && !downloadedFilename && !uploadedUrl) {
      setError("Choose a file or paste a link first")
      return
    }
    // The title is optional: a file is named after itself, a link after when it was added.
    const finalTitle =
      title.trim() ||
      (uploadedFile ? uploadedFile.file.name.replace(/\.[^.]+$/, "") : `Media from link - ${new Date().toLocaleString()}`)

    // If URL is provided but not downloaded yet, trigger download first
    if (uploadedUrl && !downloadedFilename && !isDownloading) {
      handleDownloadVideo()
      return
    }

    // Only set these if not already in downloading stage
    if (!progressStage) {
      setIsUploading(true)
      setUploadProgress(0)
    }

    setProgressStage("uploading")
    setError("")

    try {
      const token = localStorage.getItem("token")

      let response

      if (uploadedFile) {
        const formData = new FormData()
        formData.append("title", finalTitle)
        formData.append("language", spokenLanguage)
        formData.append("transcript_language", transcriptLanguage)
        formData.append("file", uploadedFile.file)

        const xhr = new XMLHttpRequest()
        xhr.open('POST', `${API_URL}/api/upload`)
        xhr.setRequestHeader('Authorization', `Bearer ${token}`)

        xhr.upload.onprogress = (event) => {
          if (event.lengthComputable) {
            const progress = Math.round((event.loaded / event.total) * 100)
            setUploadProgress(progress)
          }
        }

        const promise = new Promise((resolve, reject) => {
          xhr.onload = () => {
            if (xhr.status >= 200 && xhr.status < 300) {
              resolve(JSON.parse(xhr.responseText))
            } else {
              reject(new Error(`Upload failed with status ${xhr.status}`))
            }
          }
          xhr.onerror = reject
        })

        xhr.send(formData)

        const data = await promise
        response = { ok: true, json: async () => data }

      } else if (downloadedFilename) {
        // For downloaded files, upload with filename
        const bodyData: UploadBody = {
          title: finalTitle,
          language: spokenLanguage,
          transcript_language: transcriptLanguage,
          filename: downloadedFilename,
          // Saved with the meeting so the notes page can show the original video.
          source_url: uploadedUrl || undefined,
        }

        // For downloaded files, we already have it, so progress is 100%
        setUploadProgress(100)

        response = await fetch(`${API_URL}/api/upload`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json"
          },
          body: JSON.stringify(bodyData),
        })

        // Upload metadata complete
        setUploadProgress(100)
      } else {
        setError("No file or downloaded media available")
        setProgressStage(null)
        return
      }

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        setError(errorData.error || "Upload failed")
        setProgressStage(null)
        return
      }

      const data = await response.json()

      setSuccess("Upload successful!")
      refreshCredits()
      setUploadProgress(100)
      setProgressStage(null)

      setTimeout(() => {
        router.push(`/processing/${data.recording_id}`)
      }, 1000)

    } catch (err) {
      console.error("Upload failed:", err)
      setError("Network error during upload")
      setProgressStage(null)
    } finally {
      setIsUploading(false)
      setShouldAutoUpload(false)
    }
  }

  // Calculate download progress percentage
  const getDownloadProgressPercentage = () => {
    if (!downloadProgress || !downloadProgress.downloaded_bytes || !downloadProgress.total_bytes) {
      return 0
    }
    return Math.round((downloadProgress.downloaded_bytes / downloadProgress.total_bytes) * 100)
  }

  return (
    <div className="min-h-screen relative overflow-hidden">

      <section className="pt-8 lg:pt-10 pb-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Left Column - Upload Area */}
            <Card className="glass-card">
              <CardHeader>
                <CardTitle>Upload Meeting Recording</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* File Upload */}
                <div
                  onDragEnter={handleDrag}
                  onDragLeave={handleDrag}
                  onDragOver={handleDrag}
                  onDrop={handleDrop}
                  className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors ${dragActive ? "border-primary bg-primary/5" : "border-input"
                    }`}
                >
                  {uploadedFile ? (
                    <div className="space-y-2">
                      <Badge variant="secondary" className="mb-2">
                        {uploadedFile.isRecorded ? "Recorded Audio" : "Uploaded File"}
                      </Badge>
                      <p className="font-medium">{uploadedFile.file.name}</p>
                      <Button variant="destructive" size="sm" onClick={removeFile}>
                        <X className="w-4 h-4 mr-2" /> Remove
                      </Button>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <Upload className="w-8 h-8 mx-auto text-muted-foreground" />
                      <p className="text-muted-foreground">
                        Drag and drop audio/video file here, or
                      </p>
                      <Input
                        type="file"
                        accept={supportedFormats.join(",")}
                        onChange={handleFileInput}
                        className="hidden"
                        id="file-upload"
                      />
                      <Button asChild variant="outline" className="glass-button bg-transparent">
                        <label htmlFor="file-upload" className="cursor-pointer">
                          Choose File
                        </label>
                      </Button>
                      <p className="text-xs text-muted-foreground">
                        Supported formats: {supportedFormats.join(", ")}
                        <br />
                        Maximum size: 100MB
                      </p>
                    </div>
                  )}
                </div>

                {/* OR Divider */}
                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <span className="w-full border-t" />
                  </div>
                  <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-background px-2 text-muted-foreground">Or</span>
                  </div>
                </div>

                {/* URL Input */}
                <div className="space-y-2">
                  <Label htmlFor="video-url">Paste Media Link (YouTube, Facebook, Instagram, Twitter/X, TikTok, Vimeo, Google Meet/Drive, Microsoft Teams/Stream, etc.)</Label>
                  <Input
                    id="video-url"
                    value={uploadedUrl}
                    placeholder="https://www.youtube.com/watch?v=..."
                    onChange={handleUrlInput}
                    className="glass"
                  />

                  {downloadedFilename && (
                    <div className="mt-2 p-2 bg-green-100 rounded text-green-800">
                      <CheckCircle className="w-4 h-4 inline mr-2" />
                      Downloaded: {downloadedFilename}
                    </div>
                  )}
                </div>

                {urlPreview && (
                  <div className="glass p-4 rounded-lg">
                    <Label className="text-sm font-medium mb-2 block">Media Preview</Label>
                    <iframe
                      src={urlPreview}
                      className="w-full h-48 rounded"
                      allowFullScreen
                      title="Media Preview"
                      allow="autoplay; encrypted-media"
                    />
                  </div>
                )}

                {/* OR Divider */}
                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <span className="w-full border-t" />
                  </div>
                  <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-background px-2 text-muted-foreground">Or</span>
                  </div>
                </div>

                {/* Voice Recording */}
                <Card className="glass-card border-dashed border-primary/30 bg-primary/5">
                  <CardContent className="p-6 text-center">
                    <div className="space-y-4">
                      <motion.div
                        whileHover={{ scale: isRecording ? 1 : 1.05 }}
                        whileTap={{ scale: isRecording ? 1 : 0.95 }}
                      >
                        <Button
                          onClick={isRecording ? stopRecording : startRecording}
                          disabled={isUploading}
                          className={`w-20 h-20 rounded-full glass-button ${isRecording
                            ? 'bg-destructive/20 border-destructive/30 hover:bg-destructive/30 text-destructive'
                            : 'bg-primary/20 border-primary/30 hover:bg-primary/30 text-primary'
                            } transition-all duration-300`}
                        >
                          {isRecording ? (
                            <Square className="w-8 h-8" />
                          ) : (
                            <Mic className="w-8 h-8" />
                          )}
                        </Button>
                      </motion.div>

                      <div>
                        <p className="font-medium">
                          {isRecording ? "Recording in progress..." : "Record Voice"}
                        </p>
                        {isRecording && (
                          <div className="mt-2">
                            <p className="text-2xl font-mono text-primary">
                              {formatTime(recordingTime)}
                            </p>
                            <div className="flex justify-center mt-2">
                              <motion.div
                                animate={{ scale: [1, 1.2, 1] }}
                                transition={{ repeat: Infinity, duration: 1 }}
                                className="w-3 h-3 bg-destructive rounded-full"
                              />
                            </div>
                          </div>
                        )}
                        <p className="text-xs text-muted-foreground mt-1">
                          Click the microphone to start recording
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* File Preview */}
                {uploadedFile?.preview && (
                  <div className="glass p-4 rounded-lg">
                    <Label className="text-sm font-medium mb-2 block">{uploadedFile.isRecorded ? "Your recording" : "Preview"}</Label>
                    {uploadedFile.isRecorded || uploadedFile.file.type.startsWith("audio/") ? (
                      <audio controls className="w-full">
                        <source src={uploadedFile.preview} type={uploadedFile.file.type} />
                        Your browser does not support the audio element.
                      </audio>
                    ) : (
                      <video controls className="w-full max-h-48 rounded">
                        <source src={uploadedFile.preview} type={uploadedFile.file.type} />
                        Your browser does not support the video element.
                      </video>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Right Column - Meeting Details */}
            <Card className="glass-card">
              <CardHeader>
                <CardTitle>Meeting Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="title">Meeting Title</Label>
                  <Input
                    id="title"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="Enter meeting title"
                    className="glass"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="spoken-language" className="flex items-center space-x-2">
                    <Languages className="w-4 h-4" />
                    <span>Spoken Language</span>
                  </Label>
                  <Select value={spokenLanguage} onValueChange={setSpokenLanguage}>
                    <SelectTrigger id="spoken-language" className="glass">
                      <SelectValue placeholder="Select spoken language" />
                    </SelectTrigger>
                    <SelectContent className="bg-background border-input max-h-[300px]">
                      <SelectItem value="auto" className="text-foreground hover:bg-muted focus:bg-muted">
                        Auto-detect
                      </SelectItem>
                      {TRANSCRIPT_LANGUAGES.map((lang) => (
                        <SelectItem
                          key={lang.code}
                          value={lang.code}
                          className="text-foreground hover:bg-muted focus:bg-muted"
                        >
                          {lang.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">
                    The language people speak in the recording. Choosing it (e.g. Urdu) is the most accurate.
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="transcript-language" className="flex items-center space-x-2">
                    <Languages className="w-4 h-4" />
                    <span>Transcript Language</span>
                  </Label>
                  <Select value={transcriptLanguage} onValueChange={setTranscriptLanguage}>
                    <SelectTrigger id="transcript-language" className="glass">
                      <SelectValue placeholder="Select transcript language" />
                    </SelectTrigger>
                    <SelectContent className="bg-background border-input max-h-[300px]">
                      {TRANSCRIPT_LANGUAGES.map((lang) => (
                        <SelectItem
                          key={lang.code}
                          value={lang.code}
                          className="text-foreground hover:bg-muted focus:bg-muted"
                        >
                          {lang.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">
                    The transcript, summary and notes are written in this language (translated if needed).
                  </p>
                </div>

                <div className="glass p-4 rounded-lg">
                  <h3 className="font-medium mb-2">What happens next?</h3>
                  <ul className="text-sm text-muted-foreground space-y-1">
                    <li>• AI transcription in selected language</li>
                    <li>• Automatic language detection</li>
                    <li>• Text optimization and cleaning</li>
                    <li>• Intelligent meeting notes generation</li>
                    <li>• Structured summary with action items</li>
                  </ul>
                </div>

                {/* Unified Progress Bar */}
                {(isDownloading || isUploading) && (
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">
                          {progressStage === "downloading" ? "Downloading from URL..." : "Uploading to server..."}
                        </span>
                        <span className="text-sm text-muted-foreground">{uploadProgress}%</span>
                      </div>
                      <Progress value={uploadProgress} className="h-2" />
                    </div>
                  </div>
                )}

                {error && (
                  <Alert className="border-destructive/50 bg-destructive/10">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription className="text-destructive">{error}</AlertDescription>
                  </Alert>
                )}

                {success && (
                  <Alert className="border-accent/50 bg-accent/10">
                    <CheckCircle className="h-4 w-4" />
                    <AlertDescription className="text-accent">{success}</AlertDescription>
                  </Alert>
                )}

                <Button
                  onClick={handleUpload}
                  disabled={(!uploadedFile && !downloadedFilename && !uploadedUrl) || isUploading || isDownloading}
                  className="btn-primary w-full disabled:opacity-50"
                >
                  {isUploading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Processing...
                    </>
                  ) : (
                    <>
                      <Upload className="w-4 h-4 mr-2" />
                      Upload & Process
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </section >

      <AnimatePresence>
        {showRecordingSuccess && (
          <>
            <motion.div
              className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            />

            <motion.div
              className="fixed left-1/2 top-1/2 z-50 w-full max-w-md mx-4 -translate-x-1/2 -translate-y-1/2 rounded-2xl bg-white/90 backdrop-blur-md shadow-2xl text-center"
              initial={{ scale: 0.8, opacity: 0, y: -50 }}
              animate={{
                scale: 1,
                opacity: 1,
                y: 0,
                transition: {
                  type: "spring",
                  stiffness: 300,
                  damping: 25
                }
              }}
              exit={{
                scale: 0.8,
                opacity: 0,
                transition: { duration: 0.2 }
              }}
            >
              <div className="p-6">
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{
                    scale: 1,
                    transition: {
                      type: "spring",
                      stiffness: 200,
                      delay: 0.1
                    }
                  }}
                  className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-accent/20"
                >
                  <CheckCircle className="h-6 w-6 text-accent" />
                </motion.div>

                <motion.h2
                  className="text-xl sm:text-2xl font-bold text-gray-900 mb-2"
                  initial={{ y: 10, opacity: 0 }}
                  animate={{
                    y: 0,
                    opacity: 1,
                    transition: { delay: 0.2 }
                  }}
                >
                  Recording Successful!
                </motion.h2>

                <motion.p
                  className="text-gray-700 text-sm sm:text-base"
                  initial={{ y: 10, opacity: 0 }}
                  animate={{
                    y: 0,
                    opacity: 1,
                    transition: { delay: 0.3 }
                  }}
                >
                  Your audio has been recorded successfully and is ready for processing.
                </motion.p>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

    </div >
  )
}