"use client"
import { API_URL, SOCKET_URL } from "@/lib/config"
import { displayFileName } from "@/lib/files"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line } from "recharts"
import { toast } from "sonner"
import {
  Upload,
  FileText,
  Clock,
  CheckCircle,
  AlertCircle,
  TrendingUp,
  Calendar,
  Users,
  Zap,
  Plus,
  ArrowRight,
  Activity,
  Download,
  Trophy,
  Target,
  BarChart3,
  Lightbulb,
  TrendingDown,
  Crown,
  Award,
  Star,
  Clock4,
  Languages,
  PieChart as PieChartIcon,
} from "lucide-react"
import { io } from "socket.io-client"
import { motion } from "framer-motion"
import LivePipeline from "@/components/app/LivePipeline"
import PageHeader from "@/components/app/PageHeader"
import StatTile from "@/components/app/StatTile"
import { Skeleton } from "@/components/ui/skeleton"

interface Meeting {
  id: number
  title: string
  filename: string
  upload_date: string
  status: string
  has_transcription: boolean
  has_notes: boolean
}

interface DashboardStats {
  total_meetings: number
  completed_meetings: number
  processing_meetings: number
  total_duration: number
  this_week_meetings: number
}

interface Activity {
  id: number
  type: 'upload' | 'processing' | 'completed' | 'export' | 'share' | 'failed'
  title: string
  description: string
  timestamp: string
  meeting_id?: number
  metadata: Record<string, any>
}

interface UsageIntensity {
  active_days: number
  uploads_count: number
  avg_activities_per_day: string
  peak_hours: Array<{ hour: number; count: number }>
  period: string
}

interface ProcessingPerformance {
  success_rate: number
  total_processed: number
  completed: number
  processing: number
  failed: number
  language_distribution: Array<{ language: string; count: number }>
  average_processing_time: number
}

interface MeetingInsights {
  total_meetings_analyzed: number
  top_topics: Array<{ topic: string; frequency: number }>
  upload_patterns: Array<{ day: string; count: number }>
  average_meetings_per_week: number
  most_active_day: { day: string; count: number } | null
}

interface ProductivityMetrics {
  estimated_time_saved_minutes: number
  estimated_time_saved_hours: number
  total_action_items_generated: number
  average_action_items_per_meeting: number
  exports_count: number
  productivity_score: number
}

interface LeaderboardUser {
  rank: number
  full_name: string
  score: number
  completed_meetings: number
  total_meetings: number
  is_current_user: boolean
}

interface Leaderboard {
  leaderboard: LeaderboardUser[]
  period: string
  updated_at: string
}

const FAILED_VISIBLE_MS = 24 * 60 * 60 * 1000

/** Work in progress, plus failures from the last day. Old failures belong in History, not on a "live" panel. */
function isInPipeline(meeting: Meeting) {
  if (["processing", "uploaded", "recording"].includes(meeting.status)) return true
  if (meeting.status !== "failed") return false
  const stamp = meeting.upload_date.endsWith("Z") ? meeting.upload_date : `${meeting.upload_date}Z`
  return Date.now() - new Date(stamp).getTime() < FAILED_VISIBLE_MS
}

export default function DashboardPage() {
  const [meetings, setMeetings] = useState<Meeting[]>([])
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [user, setUser] = useState<any>(null)
  const [view, setView] = useState<'weekly' | 'monthly' | 'yearly' | 'all-time'>('weekly')
  const [selectedPeriod, setSelectedPeriod] = useState<string | null>(null)
  const [filteredMeetings, setFilteredMeetings] = useState<Meeting[]>([])
  const [selectedMeetingIds, setSelectedMeetingIds] = useState<number[]>([])

  // New state for enhanced features
  const [activities, setActivities] = useState<Activity[]>([])
  const [usageIntensity, setUsageIntensity] = useState<UsageIntensity | null>(null)
  const [processingPerformance, setProcessingPerformance] = useState<ProcessingPerformance | null>(null)
  const [meetingInsights, setMeetingInsights] = useState<MeetingInsights | null>(null)
  const [productivityMetrics, setProductivityMetrics] = useState<ProductivityMetrics | null>(null)
  const [leaderboard, setLeaderboard] = useState<Leaderboard | null>(null)
  const [activeTab, setActiveTab] = useState('overview')
  const [analyticsPeriod, setAnalyticsPeriod] = useState<'weekly' | 'monthly' | 'yearly'>('weekly')

  const router = useRouter()

  // Socket.IO for Real-Time Updates
  useEffect(() => {
    const token = localStorage.getItem("token")
    if (!token) return

    const socket = io(SOCKET_URL)

    socket.on("connect", () => {
      console.log("Dashboard connected to socket")
    })

    socket.on("activity_update", (data: any) => {
      console.log("Activity update received:", data)
      fetchEnhancedAnalytics(token)

      // Toast notification
      if (['completed', 'failed', 'upload'].includes(data.type)) {
        toast(data.type === 'completed' ? "Process Completed" : data.title, {
          description: data.description || "Activity updated",
          action: {
            label: "View",
            onClick: () => {
              if (data.type === 'completed' && data.meeting_id) {
                router.push(`/meeting-notes/${data.meeting_id}`)
              } else {
                setActiveTab("activities")
              }
            }
          },
        })
      }
    })

    return () => {
      socket.disconnect()
    }
  }, [])

  useEffect(() => {
    const token = localStorage.getItem("token")
    const userData = localStorage.getItem("user")

    if (!token) {
      router.push("/login")
      return
    }

    if (userData) {
      setUser(JSON.parse(userData))
    }

    fetchDashboardData()
    // Analytics load from the analyticsPeriod effect below, which also runs on the first render.
  }, [router])

  const fetchDashboardData = async () => {
    try {
      const token = localStorage.getItem("token")

      // Fetch meetings
      const meetingsResponse = await fetch(`${API_URL}/api/meetings?limit=10000000`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })

      if (meetingsResponse.ok) {
        const meetingsData = await meetingsResponse.json()
        setMeetings(meetingsData.meetings)

        // Calculate stats from meetings data
        const totalMeetings = meetingsData.meetings.length
        const completedMeetings = meetingsData.meetings.filter((m: Meeting) => m.status === "completed").length
        const processingMeetings = meetingsData.meetings.filter((m: Meeting) => m.status === "processing").length

        // Calculate this week's meetings
        const oneWeekAgo = new Date()
        oneWeekAgo.setDate(oneWeekAgo.getDate() - 7)
        const thisWeekMeetings = meetingsData.meetings.filter((m: Meeting) => {
          const uploadDate = new Date(m.upload_date)
          return uploadDate >= oneWeekAgo
        }).length

        setStats({
          total_meetings: totalMeetings,
          completed_meetings: completedMeetings,
          processing_meetings: processingMeetings,
          total_duration: 0,
          this_week_meetings: thisWeekMeetings,
        })
      }

    } catch (error) {
      console.error("Error fetching dashboard data:", error)
    } finally {
      // Show the page as soon as the meeting list is in; the charts fill in on their own.
      setIsLoading(false)
    }
  }

  const fetchEnhancedAnalytics = async (token: string) => {
    const headers = { Authorization: `Bearer ${token}` }
    // All at once: each one fills its own part of the page when it arrives.
    const load = (path: string, apply: (data: any) => void) =>
      fetch(`${API_URL}${path}`, { headers })
        .then((res) => (res.ok ? res.json() : null))
        .then((data) => { if (data) apply(data) })
        .catch((error) => console.error(`Dashboard: ${path} failed`, error))

    await Promise.all([
      load("/api/activities?limit=10", (d) => setActivities(d.activities)),
      load(`/api/analytics/usage-intensity?period=${analyticsPeriod}`, setUsageIntensity),
      load("/api/analytics/processing-performance", setProcessingPerformance),
      load("/api/analytics/meeting-insights", setMeetingInsights),
      load("/api/analytics/productivity", setProductivityMetrics),
      load("/api/leaderboard", setLeaderboard),
    ])
  }

  const getWeeklyData = () => {
    if (!meetings || meetings.length === 0) {
      return [
        { day: "Mon", meetings: 0 },
        { day: "Tue", meetings: 0 },
        { day: "Wed", meetings: 0 },
        { day: "Thu", meetings: 0 },
        { day: "Fri", meetings: 0 },
        { day: "Sat", meetings: 0 },
        { day: "Sun", meetings: 0 },
      ]
    }

    const today = new Date()
    const daysAhead = today.getDay()
    const startOfWeek = new Date(today)
    startOfWeek.setDate(today.getDate() - (daysAhead === 0 ? 6 : daysAhead - 1))
    startOfWeek.setHours(0, 0, 0, 0)

    const endOfWeek = new Date(startOfWeek)
    endOfWeek.setDate(startOfWeek.getDate() + 6)
    endOfWeek.setHours(23, 59, 59, 999)

    const daysOfWeek = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
    const dailyCounts: Record<string, number> = { Mon: 0, Tue: 0, Wed: 0, Thu: 0, Fri: 0, Sat: 0, Sun: 0 }

    meetings.forEach((meeting: Meeting) => {
      const uploadDate = new Date(meeting.upload_date)
      if (uploadDate >= startOfWeek && uploadDate <= endOfWeek) {
        const dayIndex = uploadDate.getDay()
        const dayKey = daysOfWeek[dayIndex === 0 ? 6 : dayIndex - 1]
        dailyCounts[dayKey] += 1
      }
    })

    return daysOfWeek.map(day => ({ day, meetings: dailyCounts[day] }))
  }

  const getMonthlyData = () => {
    const today = new Date()
    const firstDay = new Date(today.getFullYear(), today.getMonth(), 1)
    const lastDay = new Date(today.getFullYear(), today.getMonth() + 1, 0)
    const daysInMonth = lastDay.getDate()

    const dailyCounts = Array.from({ length: daysInMonth }, (_, i) => ({
      day: (i + 1).toString(),
      meetings: 0
    }))

    meetings.forEach((meeting: Meeting) => {
      const uploadDate = new Date(meeting.upload_date)
      if (
        uploadDate.getFullYear() === today.getFullYear() &&
        uploadDate.getMonth() === today.getMonth()
      ) {
        const day = uploadDate.getDate()
        dailyCounts[day - 1].meetings += 1
      }
    })

    return dailyCounts
  }

  const getYearlyData = () => {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
    const monthlyCounts = months.map(month => ({ month, meetings: 0 }))

    const today = new Date()
    meetings.forEach((meeting: Meeting) => {
      const uploadDate = new Date(meeting.upload_date)
      if (uploadDate.getFullYear() === today.getFullYear()) {
        const monthIndex = uploadDate.getMonth()
        monthlyCounts[monthIndex].meetings += 1
      }
    })

    return monthlyCounts
  }

  const getAllTimeData = () => {
    if (!meetings || meetings.length === 0) return []

    const yearlyCounts: Record<string, number> = {}
    const currentYear = new Date().getFullYear()
    let minYear = currentYear
    let maxYear = currentYear

    meetings.forEach((meeting: Meeting) => {
      const uploadDate = new Date(meeting.upload_date)
      const year = uploadDate.getFullYear()
      if (year < minYear) minYear = year
      if (year > maxYear) maxYear = year
      yearlyCounts[year.toString()] = (yearlyCounts[year.toString()] || 0) + 1
    })

    // If all meetings are in one year, show a 5-year range ending in that year
    // otherwise show range from minYear to maxYear
    const startYear = (minYear === maxYear) ? maxYear - 4 : minYear
    const result = []

    for (let y = startYear; y <= maxYear; y++) {
      result.push({
        year: y.toString(),
        meetings: yearlyCounts[y.toString()] || 0
      })
    }
    return result
  }

  const getFilteredMeetings = () => {
    const today = new Date()
    let startDate: Date, endDate: Date

    if (view === 'weekly') {
      const daysAhead = today.getDay()
      startDate = new Date(today)
      startDate.setDate(today.getDate() - (daysAhead === 0 ? 6 : daysAhead - 1))
      startDate.setHours(0, 0, 0, 0)
      endDate = new Date(startDate)
      endDate.setDate(startDate.getDate() + 6)
      endDate.setHours(23, 59, 59, 999)
    } else if (view === 'monthly') {
      startDate = new Date(today.getFullYear(), today.getMonth(), 1)
      endDate = new Date(today.getFullYear(), today.getMonth() + 1, 0)
      endDate.setHours(23, 59, 59, 999)
    } else if (view === 'yearly') {
      startDate = new Date(today.getFullYear(), 0, 1)
      endDate = new Date(today.getFullYear(), 11, 31)
      endDate.setHours(23, 59, 59, 999)
    } else {
      // All Time - return everything
      return meetings
    }

    return meetings.filter((meeting: Meeting) => {
      const uploadDate = new Date(meeting.upload_date)
      return uploadDate >= startDate && uploadDate <= endDate
    })
  }

  const chartData = view === 'weekly'
    ? getWeeklyData()
    : view === 'monthly'
      ? getMonthlyData()
      : view === 'yearly'
        ? getYearlyData()
        : getAllTimeData()

  const handleBarClick = (data: any) => {
    const period = view === 'yearly' ? data.month : view === 'all-time' ? data.year : data.day
    setSelectedPeriod(period)
    filterMeetings(view, period)
    setSelectedMeetingIds([])
  }

  const filterMeetings = (view: 'weekly' | 'monthly' | 'yearly' | 'all-time', period: string) => {
    let filtered: Meeting[] = []
    const today = new Date()

    if (view === 'weekly') {
      const daysOfWeek = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
      const targetDayIndex = daysOfWeek.indexOf(period)

      const daysAhead = today.getDay()
      const startOfWeek = new Date(today)
      startOfWeek.setDate(today.getDate() - (daysAhead === 0 ? 6 : daysAhead - 1))
      startOfWeek.setHours(0, 0, 0, 0)

      const endOfWeek = new Date(startOfWeek)
      endOfWeek.setDate(startOfWeek.getDate() + 6)
      endOfWeek.setHours(23, 59, 59, 999)

      filtered = meetings.filter((meeting: Meeting) => {
        const uploadDate = new Date(meeting.upload_date)
        if (uploadDate >= startOfWeek && uploadDate <= endOfWeek) {
          const dayIndex = uploadDate.getDay()
          const adjusted = dayIndex === 0 ? 6 : dayIndex - 1
          return adjusted === targetDayIndex
        }
        return false
      })
    } else if (view === 'monthly') {
      const targetDay = parseInt(period)
      filtered = meetings.filter((meeting: Meeting) => {
        const uploadDate = new Date(meeting.upload_date)
        return (
          uploadDate.getFullYear() === today.getFullYear() &&
          uploadDate.getMonth() === today.getMonth() &&
          uploadDate.getDate() === targetDay
        )
      })
    } else if (view === 'yearly') {
      const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
      const targetMonth = months.indexOf(period)
      filtered = meetings.filter((meeting: Meeting) => {
        const uploadDate = new Date(meeting.upload_date)
        return (
          uploadDate.getFullYear() === today.getFullYear() &&
          uploadDate.getMonth() === targetMonth
        )
      })
    } else if (view === 'all-time') {
      const targetYear = parseInt(period)
      filtered = meetings.filter((meeting: Meeting) => {
        const uploadDate = new Date(meeting.upload_date)
        return uploadDate.getFullYear() === targetYear
      })
    }

    setFilteredMeetings(filtered)
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "completed":
        return <CheckCircle className="w-4 h-4 text-accent" />
      case "processing":
        return <Clock className="w-4 h-4 text-primary animate-pulse" />
      case "failed":
        return <AlertCircle className="w-4 h-4 text-destructive" />
      default:
        return <Clock className="w-4 h-4 text-muted-foreground" />
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "completed":
        return (
          <Badge variant="secondary" className="bg-accent/20 text-accent border-accent/30">
            Completed
          </Badge>
        )
      case "processing":
        return (
          <Badge variant="secondary" className="bg-primary/20 text-primary border-primary/30">
            Processing
          </Badge>
        )
      case "failed":
        return (
          <Badge variant="secondary" className="bg-destructive/20 text-destructive border-destructive/30">
            Failed
          </Badge>
        )
      default:
        return (
          <Badge variant="secondary" className="bg-muted/20 text-muted-foreground border-muted/30">
            Uploaded
          </Badge>
        )
    }
  }

  const getStatusData = () => {
    const meetingsToUse = selectedPeriod ? filteredMeetings : getFilteredMeetings()
    const completed = meetingsToUse.filter(m => m.status === "completed").length
    const processing = meetingsToUse.filter(m => m.status === "processing").length
    const failed = meetingsToUse.filter(m => m.status === "failed").length

    return [
      { name: "Completed", value: completed, color: "var(--brand)" },
      { name: "Processing", value: processing, color: "var(--warn)" },
      { name: "Failed", value: failed, color: "var(--danger)" },
    ]
  }

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedMeetingIds(filteredMeetings.map(m => m.id))
    } else {
      setSelectedMeetingIds([])
    }
  }

  const handleSelectMeeting = (id: number, checked: boolean) => {
    if (checked) {
      setSelectedMeetingIds(prev => [...prev, id])
    } else {
      setSelectedMeetingIds(prev => prev.filter(selectedId => selectedId !== id))
    }
  }

  const handleDownloadSelected = async () => {
    const token = localStorage.getItem("token")
    if (!token) return

    for (const id of selectedMeetingIds) {
      try {
        const response = await fetch(`${API_URL}/api/export/${id}/pdf`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        })

        if (response.ok) {
          const blob = await response.blob()
          const url = window.URL.createObjectURL(blob)
          const a = document.createElement('a')
          a.style.display = 'none'
          a.href = url
          a.download = `meeting_notes_${id}.pdf`
          document.body.appendChild(a)
          a.click()
          window.URL.revokeObjectURL(url)
          document.body.removeChild(a)
        } else {
          console.error(`Failed to download PDF for meeting ${id}`)
          toast.error(`Failed to download PDF for meeting ${id}`)
        }
      } catch (error) {
        console.error(`Error downloading PDF for meeting ${id}:`, error)
        toast.error(`Error downloading PDF for meeting ${id}`)
      }
    }
  }

  const handleRetry = async (meetingId: number) => {
    try {
      const token = localStorage.getItem("token")
      const response = await fetch(`${API_URL}/api/meetings/${meetingId}/retry`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` }
      })
      if (response.ok) {
        toast.success("Retry started successfully")
        router.push(`/processing/${meetingId}`)
      } else {
        toast.error("Failed to start retry")
      }
    } catch (error) {
      toast.error("Network error while retrying")
    }
  }

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'upload':
        return <Upload className="w-4 h-4 text-blue-500" />
      case 'processing':
        return <Clock className="w-4 h-4 text-orange-500 animate-pulse" />
      case 'completed':
        return <CheckCircle className="w-4 h-4 text-green-500" />
      case 'export':
        return <Download className="w-4 h-4 text-purple-500" />
      case 'share':
        return <Users className="w-4 h-4 text-indigo-500" />
      case 'failed':
        return <AlertCircle className="w-4 h-4 text-red-500" />
      default:
        return <Activity className="w-4 h-4 text-gray-500" />
    }
  }

  const formatTimeAgo = (timestamp: string) => {
    const now = new Date()
    // If timestamp doesn't end with 'Z', add it to indicate UTC
    const utcTimestamp = timestamp.endsWith('Z') ? timestamp : timestamp + 'Z'
    const time = new Date(utcTimestamp)
    const diffInMinutes = Math.floor((now.getTime() - time.getTime()) / 60000)

    if (diffInMinutes < 1) return 'Just now'
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`
    if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)}h ago`
    return `${Math.floor(diffInMinutes / 1440)}d ago`
  }

  const formatActualTime = (timestamp: string) => {
    const utcTimestamp = timestamp.endsWith('Z') ? timestamp : timestamp + 'Z'
    const date = new Date(utcTimestamp)
    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    })
  }

  const getRankIcon = (rank: number) => {
    if (rank === 1) return <Crown className="w-4 h-4 text-yellow-500" />
    if (rank === 2) return <Award className="w-4 h-4 text-gray-400" />
    if (rank === 3) return <Award className="w-4 h-4 text-orange-500" />
    return <Star className="w-4 h-4 text-blue-500" />
  }

  useEffect(() => {
    setSelectedPeriod(null)
    setFilteredMeetings([])
    setSelectedMeetingIds([])
  }, [view])

  // While something is processing, keep the pipeline panel current.
  const hasActiveWork = meetings.some((m) => ["processing", "uploaded", "recording"].includes(m.status))
  useEffect(() => {
    if (!hasActiveWork) return
    const timer = setInterval(fetchDashboardData, 8000)
    return () => clearInterval(timer)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasActiveWork])

  // Re-fetch analytics when period changes
  useEffect(() => {
    const token = localStorage.getItem("token")
    if (token) {
      fetchEnhancedAnalytics(token)
    }
  }, [analyticsPeriod])

  if (isLoading) {
    return (
      <div className="px-4 pb-12 pt-8 sm:px-6 lg:px-8 lg:pt-10" role="status" aria-label="Loading your dashboard">
        <div className="mx-auto max-w-7xl space-y-5">
          <Skeleton className="h-10 w-72" />
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            <Skeleton className="h-32" />
            <Skeleton className="h-32" />
            <Skeleton className="h-32" />
            <Skeleton className="h-32" />
          </div>
          <Skeleton className="h-80" />
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen">

      <section className="pt-8 lg:pt-10 pb-12 sm:pb-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <PageHeader
            eyebrow="Dashboard"
            title={<>Welcome back, <span className="font-accent text-brand-light">{(user?.full_name || user?.email || "there").split(" ")[0]}</span></>}
            description="Here's what's happening with your meetings."
            actions={
              <Link href="/upload" className="btn btn-primary btn-sm">
                <Plus />
                Upload a meeting
              </Link>
            }
          />

          {/* Enhanced Tabs */}
          <Tabs value={activeTab} onValueChange={setActiveTab} className="mb-8">
            <TabsList className="inline-flex h-auto w-full max-w-full flex-wrap justify-start gap-1 rounded-[14px] border border-line bg-transparent p-1 sm:w-auto">
              {[
                { value: 'overview', icon: BarChart3, label: 'Overview' },
                { value: 'analytics', icon: TrendingUp, label: 'Analytics' },
                { value: 'activities', icon: Activity, label: 'Activities' },
                { value: 'leaderboard', icon: Trophy, label: 'Leaderboard' }
              ].map((tab) => {
                const isActive = activeTab === tab.value;
                const Icon = tab.icon;

                return (
                  <TabsTrigger
                    key={tab.value}
                    value={tab.value}
                    className={`relative flex flex-1 items-center justify-center gap-2 rounded-[10px] bg-transparent px-4 py-2 text-sm font-normal shadow-none transition-colors duration-200 data-[state=active]:bg-transparent sm:flex-none ${isActive ? 'text-bone' : 'text-bone-dim hover:text-bone-muted'}`}
                  >
                    {isActive && (
                      <motion.span
                        layoutId="dashboard-tab"
                        className="absolute inset-0 rounded-[10px] bg-white/[0.07]"
                        transition={{ type: "spring", stiffness: 420, damping: 36 }}
                      />
                    )}
                    <Icon className={`relative h-4 w-4 ${isActive ? 'text-brand-light' : ''}`} />
                    <span className="relative">{tab.label}</span>
                  </TabsTrigger>
                );
              })}
            </TabsList>

            {/* Overview Tab */}
            <TabsContent value="overview" className="mt-6 space-y-6">
              {/* Stat tiles */}
              <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
                <StatTile label="Total meetings" value={stats?.total_meetings || 0} icon={FileText} />
                <StatTile label="Completed" value={stats?.completed_meetings || 0} icon={CheckCircle} />
                <StatTile label="This week" value={stats?.this_week_meetings || 0} icon={TrendingUp} />
                <StatTile label="Processing" value={stats?.processing_meetings || 0} icon={Activity} />
              </div>

              {/* Live pipeline: meetings being worked on right now */}
              <LivePipeline meetings={meetings.filter(isInPipeline).slice(0, 4)} />

              {/* Charts Section */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 sm:gap-8">
                {/* Activity Chart */}
                <Card className="glass-card">
                  <CardHeader>
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                      <CardTitle className="flex items-center space-x-2">
                        <Calendar className="w-4 h-4 sm:w-5 sm:h-5" />
                        <span className="text-sm sm:text-base">Activity Overview</span>
                      </CardTitle>
                      <div className="flex space-x-2 bg-white/5 p-1 rounded-lg border border-line">
                        {[
                          { id: 'weekly', label: 'Weekly' },
                          { id: 'monthly', label: 'Monthly' },
                          { id: 'yearly', label: 'Yearly' },
                          { id: 'all-time', label: 'All Time' }
                        ].map((period) => {
                          const isActive = view === period.id;
                          return (
                            <Button
                              key={period.id}
                              variant={isActive ? 'default' : 'outline'}
                              size="sm"
                              onClick={() => setView(period.id as any)}
                              className={`relative overflow-hidden transition-all duration-300 px-3 ${isActive
                                ? 'bg-primary/10 border-accent/40 text-white scale-105 outline-none'
                                : 'glass-button bg-transparent border-line text-white/60 hover:text-white hover:scale-105'
                                }`}
                            >
                              {isActive && (
                                <div className="absolute inset-0 bg-primary/10 blur-md opacity-70"></div>
                              )}
                              <span className="relative z-10">{period.label}</span>
                            </Button>
                          );
                        })}
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={250} className="sm:h-[300px]">
                      <BarChart data={chartData}>
                        <CartesianGrid vertical={false} stroke="var(--line)" />
                        <XAxis
                          dataKey={view === 'yearly' ? 'month' : view === 'all-time' ? 'year' : 'day'}
                          axisLine={{ stroke: "var(--line-strong)" }}
                          tickLine={false}
                          tick={{ fill: "var(--text-dim)", fontSize: 11 }}
                        />
                        <YAxis allowDecimals={false} axisLine={false} tickLine={false} tick={{ fill: "var(--text-dim)", fontSize: 11 }} />
                        <Tooltip
                          contentStyle={{
                            backgroundColor: "var(--panel-3)",
                            border: "1px solid var(--line-strong)",
                            borderRadius: "10px",
                            color: "var(--text)",
                          }}
                        />
                        <Bar
                          dataKey="meetings"
                          fill="var(--brand)"
                          radius={[4, 4, 0, 0]}
                          maxBarSize={24}
                          onClick={handleBarClick}
                          className="cursor-pointer"
                        />
                      </BarChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>

                {/* Status Distribution */}
                <Card className="glass-card">
                  <CardHeader>
                    <CardTitle className="flex items-center space-x-2">
                      <Zap className="w-4 h-4 sm:w-5 sm:h-5" />
                      <span className="text-sm sm:text-base">
                        Processing Status {selectedPeriod ? `(${selectedPeriod})` : `(${view.charAt(0).toUpperCase() + view.slice(1)})`}
                      </span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {getStatusData().every((entry) => entry.value === 0) && (
                      <p className="py-2 text-sm text-bone-dim">No meetings in this period yet.</p>
                    )}
                    <ResponsiveContainer width="100%" height={250} className="sm:h-[300px]">
                      <PieChart>
                        <Pie
                          data={getStatusData()}
                          cx="50%"
                          cy="50%"
                          innerRadius={40}
                          outerRadius={80}
                          paddingAngle={5}
                          dataKey="value"
                          className="sm:inner-radius-60 sm:outer-radius-120"
                        >
                          {getStatusData().map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip
                          contentStyle={{
                            backgroundColor: "var(--panel-3)",
                            border: "1px solid var(--line-strong)",
                            borderRadius: "10px",
                            color: "var(--text)",
                          }}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                    <div className="flex flex-wrap justify-center gap-2 sm:gap-4 mt-4">
                      {getStatusData().map((entry, index) => (
                        <div key={index} className="flex items-center space-x-1 sm:space-x-2">
                          <div className="w-2 h-2 sm:w-3 sm:h-3 rounded-full" style={{ backgroundColor: entry.color }}></div>
                          <span className="text-xs sm:text-sm text-muted-foreground">
                            {entry.name}: {entry.value}
                          </span>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Selected Period Meetings */}
              {selectedPeriod && (
                <Card className="glass-card">
                  <CardHeader>
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                      <CardTitle className="flex items-center space-x-2">
                        <FileText className="w-4 h-4 sm:w-5 sm:h-5" />
                        <span className="text-sm sm:text-base">Meetings for {selectedPeriod}</span>
                      </CardTitle>
                      <div className="flex items-center space-x-4">
                        <div className="flex items-center space-x-2">
                          <Checkbox
                            id="select-all"
                            checked={selectedMeetingIds.length === filteredMeetings.length && filteredMeetings.length > 0}
                            onCheckedChange={handleSelectAll}
                          />
                          <label htmlFor="select-all" className="text-sm text-muted-foreground">Select All</label>
                        </div>
                        {selectedMeetingIds.length > 0 && (
                          <Button
                            size="sm"
                            onClick={handleDownloadSelected}
                            className="btn-primary"
                          >
                            <Download className="w-4 h-4 mr-2" />
                            Download Selected ({selectedMeetingIds.length})
                          </Button>
                        )}
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    {filteredMeetings.length === 0 ? (
                      <div className="text-center py-8 sm:py-12">
                        <p className="text-sm sm:text-base text-muted-foreground">No meetings found for this period</p>
                      </div>
                    ) : (
                      <div className="space-y-3 sm:space-y-4">
                        {filteredMeetings.map((meeting) => (
                          <div
                            key={meeting.id}
                            className="flex flex-col sm:flex-row sm:items-center justify-between p-3 sm:p-4 glass rounded-lg smooth-transition hover:bg-white/10 gap-3 sm:gap-0"
                          >
                            <div className="flex items-center space-x-3 sm:space-x-4 min-w-0 flex-1">
                              <Checkbox
                                checked={selectedMeetingIds.includes(meeting.id)}
                                onCheckedChange={(checked) => handleSelectMeeting(meeting.id, checked === true)}
                              />
                              {getStatusIcon(meeting.status)}
                              <div className="min-w-0">
                                <h4 className="font-medium text-sm sm:text-base truncate">{meeting.title}</h4>
                                <p className="text-xs sm:text-sm text-muted-foreground truncate">
                                  {new Date(meeting.upload_date).toLocaleDateString()} • {displayFileName(meeting.filename)}
                                </p>
                              </div>
                            </div>
                            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-3">
                              {getStatusBadge(meeting.status)}
                              {meeting.has_notes && meeting.status === "completed" ? (
                                <Link href={`/meeting-notes/${meeting.id}`} className="w-full sm:w-auto">
                                  <Button size="sm" className="glass-button bg-accent/20 border-accent/30 hover:bg-accent/30 w-full sm:w-auto">
                                    View Notes
                                  </Button>
                                </Link>
                              ) : meeting.status === "processing" ? (
                                <Link href={`/processing/${meeting.id}`} className="w-full sm:w-auto">
                                  <Button
                                    size="sm"
                                    className="btn-primary w-full sm:w-auto"
                                  >
                                    View Status
                                  </Button>
                                </Link>
                              ) : (
                                <Button size="sm" variant="outline" className="glass-button bg-transparent w-full sm:w-auto" disabled>
                                  Pending
                                </Button>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}

              {/* Recent Meetings */}
              <Card className="glass-card">
                <CardHeader>
                  <CardTitle className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex items-center space-x-2">
                      <FileText className="w-4 h-4 sm:w-5 sm:h-5" />
                      <span className="text-sm sm:text-base">Recent Meetings</span>
                    </div>
                    <Link href="/history">
                      <Button variant="outline" size="sm" className="glass-button bg-transparent w-full sm:w-auto">
                        View All
                        <ArrowRight className="w-4 h-4 ml-2" />
                      </Button>
                    </Link>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {meetings.length === 0 ? (
                    <div className="text-center py-8 sm:py-12">
                      <Upload className="w-10 h-10 sm:w-12 sm:h-12 mx-auto mb-3 sm:mb-4 text-muted-foreground" />
                      <h3 className="text-base sm:text-lg font-semibold mb-2">No meetings yet</h3>
                      <p className="text-sm sm:text-base text-muted-foreground mb-4">Upload your first meeting recording to get started</p>
                      <Link href="/upload">
                        <Button className="btn-primary">
                          <Plus className="w-4 h-4 mr-2" />
                          Upload Meeting
                        </Button>
                      </Link>
                    </div>
                  ) : (
                    <div className="space-y-3 sm:space-y-4">
                      {meetings.slice(0, 5).map((meeting) => (
                        <div
                          key={meeting.id}
                          className="flex flex-col sm:flex-row sm:items-center justify-between p-3 sm:p-4 glass rounded-lg smooth-transition hover:bg-white/10 gap-3 sm:gap-0"
                        >
                          <div className="flex items-center space-x-3 sm:space-x-4 min-w-0 flex-1">
                            {getStatusIcon(meeting.status)}
                            <div className="min-w-0">
                              <h4 className="font-medium text-sm sm:text-base truncate">{meeting.title}</h4>
                              <p className="text-xs sm:text-sm text-muted-foreground truncate">
                                {new Date(meeting.upload_date).toLocaleDateString()} • {displayFileName(meeting.filename)}
                              </p>
                            </div>
                          </div>
                          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-3">
                            {getStatusBadge(meeting.status)}
                            {meeting.has_notes && meeting.status === "completed" ? (
                              <Link href={`/meeting-notes/${meeting.id}`} className="w-full sm:w-auto">
                                <Button size="sm" className="glass-button bg-accent/20 border-accent/30 hover:bg-accent/30 w-full sm:w-auto">
                                  View Notes
                                </Button>
                              </Link>
                            ) : meeting.status === "processing" ? (
                              <Link href={`/processing/${meeting.id}`} className="w-full sm:w-auto">
                                <Button
                                  size="sm"
                                  className="btn-primary w-full sm:w-auto"
                                >
                                  View Status
                                </Button>
                              </Link>
                            ) : (
                              <Button size="sm" variant="outline" className="glass-button bg-transparent w-full sm:w-auto" disabled>
                                Pending
                              </Button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Analytics Tab */}
            <TabsContent value="analytics" className="mt-6 space-y-6">
              {/* Analytics Period Selector */}
              <div className="flex justify-center">
                <div className="flex space-x-2 glass p-1 rounded-lg border border-line">
                  {[
                    { id: 'weekly', label: 'Weekly' },
                    { id: 'monthly', label: 'Monthly' },
                    { id: 'yearly', label: 'Yearly' }
                  ].map((period) => {
                    const isActive = analyticsPeriod === period.id;
                    return (
                      <Button
                        key={period.id}
                        variant={isActive ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setAnalyticsPeriod(period.id as any)}
                        className={`relative overflow-hidden transition-all duration-300 px-3 ${isActive
                          ? 'bg-primary/10 border-accent/40 text-white scale-105 outline-none'
                          : 'glass-button bg-transparent border-line text-white/60 hover:text-white hover:scale-105'
                          }`}
                      >
                        {isActive && (
                          <div className="absolute inset-0 bg-primary/10 blur-md opacity-70"></div>
                        )}
                        <span className="relative z-10">{period.label}</span>
                      </Button>
                    );
                  })}
                </div>
              </div>

              {/* Usage Intensity */}
              <Card className="glass-card">
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <Activity className="w-4 h-4 sm:w-5 sm:h-5" />
                    <span>Usage Intensity ({analyticsPeriod})</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {usageIntensity ? (
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div className="text-center p-4 glass rounded-lg">
                        <p className="text-2xl font-bold text-primary">{usageIntensity.active_days}</p>
                        <p className="text-sm text-muted-foreground">Active Days</p>
                      </div>
                      <div className="text-center p-4 glass rounded-lg">
                        <p className="text-2xl font-bold text-accent">{usageIntensity.uploads_count}</p>
                        <p className="text-sm text-muted-foreground">Uploads</p>
                      </div>
                      <div className="text-center p-4 glass rounded-lg">
                        <p className="text-2xl font-bold text-green-500">{usageIntensity.avg_activities_per_day}</p>
                        <p className="text-sm text-muted-foreground">Avg Duration/Day</p>
                      </div>
                      <div className="text-center p-4 glass rounded-lg">
                        <p className="text-2xl font-bold text-purple-500">
                          {usageIntensity.peak_hours[0]?.hour || 0}:00
                        </p>
                        <p className="text-sm text-muted-foreground">Peak Hour</p>
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <p className="text-muted-foreground">Loading usage data...</p>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Processing Performance */}
              <Card className="glass-card">
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <Zap className="w-4 h-4 sm:w-5 sm:h-5" />
                    <span>Processing Performance</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {processingPerformance ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-4">
                        <div className="flex justify-between items-center">
                          <span>Success Rate</span>
                          <Badge variant="secondary" className={processingPerformance.success_rate > 90 ? "bg-green-500/20 text-green-500" : "bg-yellow-500/20 text-yellow-500"}>
                            {processingPerformance.success_rate}%
                          </Badge>
                        </div>
                        <div className="flex justify-between items-center">
                          <span>Average Processing Time</span>
                          <Badge variant="secondary">
                            {processingPerformance.average_processing_time}s
                          </Badge>
                        </div>
                        <div className="grid grid-cols-3 gap-2 text-center">
                          <div className="p-3 glass rounded-lg">
                            <p className="text-lg font-bold text-green-500">{processingPerformance.completed}</p>
                            <p className="text-xs text-muted-foreground">Completed</p>
                          </div>
                          <div className="p-3 glass rounded-lg">
                            <p className="text-lg font-bold text-blue-500">{processingPerformance.processing}</p>
                            <p className="text-xs text-muted-foreground">Processing</p>
                          </div>
                          <div className="p-3 glass rounded-lg">
                            <p className="text-lg font-bold text-red-500">{processingPerformance.failed}</p>
                            <p className="text-xs text-muted-foreground">Failed</p>
                          </div>
                        </div>
                      </div>
                      <div>
                        <h4 className="font-semibold mb-3">Language Distribution</h4>
                        <div className="space-y-2">
                          {processingPerformance.language_distribution.slice(0, 5).map((item, index) => (
                            <div key={index} className="flex justify-between items-center">
                              <span className="flex items-center space-x-2">
                                <Languages className="w-4 h-4" />
                                <span>{item.language.toUpperCase()}</span>
                              </span>
                              <Badge variant="outline">{item.count}</Badge>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <p className="text-muted-foreground">Loading processing data...</p>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Meeting Insights */}
              <Card className="glass-card">
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <Lightbulb className="w-4 h-4 sm:w-5 sm:h-5" />
                    <span>Meeting Insights</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {meetingInsights ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <h4 className="font-semibold mb-3">Top Topics</h4>
                        <div className="space-y-2">
                          {meetingInsights.top_topics.slice(0, 5).map((topic, index) => (
                            <div key={index} className="flex justify-between items-center p-2 glass rounded">
                              <span className="capitalize">{topic.topic}</span>
                              <Badge variant="secondary">{topic.frequency}</Badge>
                            </div>
                          ))}
                        </div>
                      </div>
                      <div>
                        <h4 className="font-semibold mb-3">Upload Patterns</h4>
                        <div className="space-y-2">
                          {meetingInsights.upload_patterns.map((pattern, index) => (
                            <div key={index} className="flex justify-between items-center">
                              <span>{pattern.day}</span>
                              <div className="flex items-center space-x-2">
                                <div className="w-16 bg-gray-200 rounded-full h-2">
                                  <div
                                    className="bg-primary rounded-full h-2"
                                    style={{ width: `${(pattern.count / Math.max(...meetingInsights.upload_patterns.map(p => p.count))) * 100}%` }}
                                  ></div>
                                </div>
                                <span className="text-sm w-6 text-right">{pattern.count}</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <p className="text-muted-foreground">Loading insights...</p>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Productivity Metrics */}
              <Card className="glass-card">
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <Target className="w-4 h-4 sm:w-5 sm:h-5" />
                    <span>Productivity Metrics</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {productivityMetrics ? (
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div className="text-center p-4 glass rounded-lg">
                        <Clock4 className="w-8 h-8 mx-auto mb-2 text-green-500" />
                        <p className="text-xl font-bold">{productivityMetrics.estimated_time_saved_hours}h</p>
                        <p className="text-sm text-muted-foreground">Time Saved</p>
                      </div>
                      <div className="text-center p-4 glass rounded-lg">
                        <FileText className="w-8 h-8 mx-auto mb-2 text-blue-500" />
                        <p className="text-xl font-bold">{productivityMetrics.total_action_items_generated}</p>
                        <p className="text-sm text-muted-foreground">Action Items</p>
                      </div>
                      <div className="text-center p-4 glass rounded-lg">
                        <Download className="w-8 h-8 mx-auto mb-2 text-purple-500" />
                        <p className="text-xl font-bold">{productivityMetrics.exports_count}</p>
                        <p className="text-sm text-muted-foreground">Exports</p>
                      </div>
                      <div className="text-center p-4 glass rounded-lg">
                        <TrendingUp className="w-8 h-8 mx-auto mb-2 text-orange-500" />
                        <p className="text-xl font-bold">{productivityMetrics.productivity_score}</p>
                        <p className="text-sm text-muted-foreground">Productivity Score</p>
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <p className="text-muted-foreground">Loading productivity data...</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Activities Tab */}
            <TabsContent value="activities" className="mt-6">
              <Card className="glass-card">
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <Activity className="w-4 h-4 sm:w-5 sm:h-5" />
                    <span>Real-Time Activity Feed</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {activities.length > 0 ? (
                    <div className="space-y-4">
                      {activities.map((activity) => (
                        <div key={activity.id} className="flex items-start space-x-4 p-4 glass rounded-lg smooth-transition hover:bg-white/5">
                          <div className="flex-shrink-0">
                            {getActivityIcon(activity.type)}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-sm sm:text-base">{activity.title}</p>
                            <p className="text-sm text-muted-foreground">{activity.description}</p>
                            <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                              <span>{formatTimeAgo(activity.timestamp)}</span>
                              <span>•</span>
                              <span>{formatActualTime(activity.timestamp)}</span>
                            </div>
                          </div>
                          {activity.type === 'failed' && activity.meeting_id ? (
                            <Button
                              size="sm"
                              variant="outline"
                              className="glass-button text-red-400 border-red-500/30 hover:bg-red-500/10"
                              onClick={() => activity.meeting_id && handleRetry(activity.meeting_id)}
                            >
                              Retry
                            </Button>
                          ) : activity.meeting_id ? (
                            <Link href={`/meeting-notes/${activity.meeting_id}`}>
                              <Button size="sm" variant="outline" className="glass-button">
                                View
                              </Button>
                            </Link>
                          ) : null}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-12">
                      <Activity className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                      <h3 className="text-lg font-semibold mb-2">No activities yet</h3>
                      <p className="text-muted-foreground mb-4">Your activities will appear here as you use the platform</p>
                      <Link href="/upload">
                        <Button className="btn-primary">
                          <Upload className="w-4 h-4 mr-2" />
                          Start Uploading
                        </Button>
                      </Link>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Leaderboard Tab */}
            <TabsContent value="leaderboard" className="mt-6">
              <Card className="glass-card">
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <Trophy className="w-4 h-4 sm:w-5 sm:h-5" />
                    <span>Monthly Leaderboard (Top 5)</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {leaderboard ? (
                    <div className="space-y-4">
                      {/* Top 3 */}
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                        {leaderboard.leaderboard.slice(0, 3).map((user, index) => (
                          <div key={user.rank} className={`text-center p-6 rounded-lg glass smooth-transition scale-hover ${user.is_current_user ? 'ring-2 ring-accent' : ''
                            } ${index === 0 ? 'bg-yellow-500/10' : index === 1 ? 'bg-gray-400/10' : 'bg-orange-500/10'}`}>
                            <div className="flex justify-center mb-2">
                              {getRankIcon(user.rank)}
                            </div>
                            <div className="text-2xl font-bold mb-1">#{user.rank}</div>
                            <div className="font-semibold truncate">{user.full_name}</div>
                            <div className="text-sm text-muted-foreground mb-2">{user.score} points</div>
                            <div className="text-xs text-muted-foreground">
                              {user.completed_meetings} meetings
                            </div>
                            {user.is_current_user && (
                              <Badge variant="secondary" className="mt-2 bg-accent/20 text-accent">
                                You
                              </Badge>
                            )}
                          </div>
                        ))}
                      </div>

                      {/* Rest of leaderboard */}
                      <div className="space-y-2">
                        {leaderboard.leaderboard.slice(3).map((user) => (
                          <div key={user.rank} className={`flex items-center justify-between p-4 glass rounded-lg smooth-transition hover:bg-white/5 ${user.is_current_user ? 'ring-1 ring-accent' : ''
                            }`}>
                            <div className="flex items-center space-x-4">
                              <div className="flex items-center space-x-2">
                                <span className="font-bold w-6 text-right">#{user.rank}</span>
                                {getRankIcon(user.rank)}
                              </div>
                              <div>
                                <div className="font-medium">{user.full_name}</div>
                                <div className="text-sm text-muted-foreground">
                                  {user.completed_meetings} completed meetings
                                </div>
                              </div>
                            </div>
                            <div className="text-right">
                              <div className="font-bold text-accent">{user.score}</div>
                              <div className="text-xs text-muted-foreground">points</div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-12">
                      <Trophy className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                      <h3 className="text-lg font-semibold mb-2">Leaderboard loading...</h3>
                      <p className="text-muted-foreground">Competitive analytics coming soon</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>

          {/* Quick Actions */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6 mt-8 sm:mt-12">
            <Card className="glass-card smooth-transition scale-hover">
              <CardContent className="p-4 sm:p-6 text-center">
                <div className="w-10 h-10 sm:w-12 sm:h-12 tile-accent rounded-lg flex items-center justify-center mx-auto mb-3 sm:mb-4 glow">
                  <Upload className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
                </div>
                <h3 className="text-base sm:text-lg font-semibold mb-2">Upload New Meeting</h3>
                <p className="text-sm sm:text-base text-muted-foreground mb-4">
                  Upload audio or video files from your meetings for AI analysis
                </p>
                <Link href="/upload">
                  <Button className="btn-primary w-full sm:w-auto">
                    Get Started
                  </Button>
                </Link>
              </CardContent>
            </Card>

            <Card className="glass-card smooth-transition scale-hover">
              <CardContent className="p-4 sm:p-6 text-center">
                <div className="w-10 h-10 sm:w-12 sm:h-12 tile-accent rounded-lg flex items-center justify-center mx-auto mb-3 sm:mb-4 glow-green">
                  <FileText className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
                </div>
                <h3 className="text-base sm:text-lg font-semibold mb-2">View All Meetings</h3>
                <p className="text-sm sm:text-base text-muted-foreground mb-4">Browse your complete meeting history and notes</p>
                <Link href="/history">
                  <Button className="glass-button bg-accent/20 border-accent/30 hover:bg-accent/30 w-full sm:w-auto">
                    Browse History
                  </Button>
                </Link>
              </CardContent>
            </Card>

            <Card className="glass-card smooth-transition scale-hover">
              <CardContent className="p-4 sm:p-6 text-center">
                <div className="w-10 h-10 sm:w-12 sm:h-12 tile-accent rounded-lg flex items-center justify-center mx-auto mb-3 sm:mb-4 glow">
                  <Users className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
                </div>
                <h3 className="text-base sm:text-lg font-semibold mb-2">Learn More</h3>
                <p className="text-sm sm:text-base text-muted-foreground mb-4">Discover advanced features and best practices</p>
                <Link href="/about">
                  <Button variant="outline" className="glass-button bg-transparent w-full sm:w-auto">
                    Learn More
                  </Button>
                </Link>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

    </div>
  )
}