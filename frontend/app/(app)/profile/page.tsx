"use client"
import { API_URL } from "@/lib/config"

import { useState, useEffect, useRef } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import {
    User,
    Mail,
    Lock,
    Trash2,
    ArrowLeft,
    Save,
    Loader2,
    CheckCircle2,
    AlertCircle,
    Eye,
    EyeOff,
    TextQuote,
    FileText,
    Phone,
    Camera,
    Link as LinkIcon,
    Globe,
    Shield,
    ShieldCheck,
    Bell,
    History,
    Calendar,
    Download,
    ExternalLink,
    MapPin,
    Key,
    Smartphone,
    X,
    Check,
    Instagram,
    Twitter,
    Linkedin,
    Github,
    Facebook,
    Youtube
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Progress } from "@/components/ui/progress"
import { Switch } from "@/components/ui/switch"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { authService, type User as UserType } from "@/lib/auth"
import { toast } from "sonner"

type ActivityType = 'meeting' | 'transcription' | 'export' | 'login' | 'profile_update'
interface Activity {
    id: string
    type: ActivityType
    title: string
    description: string
    timestamp: Date
    metadata?: Record<string, any>
}

interface SocialLink {
    platform: string
    url: string
    icon: React.ReactNode
}

function formatTimeAgo(date: Date): string {
    const now = new Date()
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000)

    if (diffInSeconds < 60) return "just now"

    const units: { [key: string]: number } = {
        year: 31536000,
        month: 2592000,
        week: 604800,
        day: 86400,
        hour: 3600,
        minute: 60
    }

    for (const unit in units) {
        const interval = Math.floor(diffInSeconds / units[unit])
        if (interval >= 1) {
            return `${interval} ${unit}${interval === 1 ? "" : "s"} ago`
        }
    }

    return "just now"
}

export default function ProfilePage() {
    const router = useRouter()
    const [user, setUser] = useState<UserType | null>(null)
    const [loading, setLoading] = useState(true)
    const [updatingProfile, setUpdatingProfile] = useState(false)
    const [changingPassword, setChangingPassword] = useState(false)
    const [deletingAccount, setDeletingAccount] = useState(false)

    // 2FA PIN States
    const [showPinInput, setShowPinInput] = useState(false)
    const [isPinUpdating, setIsPinUpdating] = useState(false)
    const [currentPinDigits, setCurrentPinDigits] = useState(["", "", "", "", "", ""])
    const [pinDigits, setPinDigits] = useState(["", "", "", "", "", ""])
    const [confirmPinDigits, setConfirmPinDigits] = useState(["", "", "", "", "", ""])
    const [isCurrentPinVerified, setIsCurrentPinVerified] = useState(false)
    const [verifyingCurrentPin, setVerifyingCurrentPin] = useState(false)
    const [currentPinError, setCurrentPinError] = useState("")
    const currentPinRefs = useRef<(HTMLInputElement | null)[]>([])
    const pinRefs = useRef<(HTMLInputElement | null)[]>([])
    const confirmPinRefs = useRef<(HTMLInputElement | null)[]>([])

    const [uploadingAvatar, setUploadingAvatar] = useState(false)

    const fileInputRef = useRef<HTMLInputElement>(null)

    // Visibility states
    const [showCurrentPassword, setShowCurrentPassword] = useState(false)
    const [showNewPassword, setShowNewPassword] = useState(false)
    const [showConfirmPassword, setShowConfirmPassword] = useState(false)
    const [showDeletePassword, setShowDeletePassword] = useState(false)

    // Profile Form states
    const [fullName, setFullName] = useState("")
    const [phoneNumber, setPhoneNumber] = useState("")
    const [bio, setBio] = useState("")
    const [location, setLocation] = useState("")
    const [website, setWebsite] = useState("")
    const [socialLinks, setSocialLinks] = useState<SocialLink[]>([
        { platform: 'twitter', url: '', icon: <Twitter className="w-4 h-4" /> },
        { platform: 'linkedin', url: '', icon: <Linkedin className="w-4 h-4" /> },
        { platform: 'github', url: '', icon: <Github className="w-4 h-4" /> },
        { platform: 'instagram', url: '', icon: <Instagram className="w-4 h-4" /> },
    ])

    // Security Form states
    const [passwords, setPasswords] = useState({
        current: "",
        new: "",
        confirm: ""
    })
    const [passwordError, setPasswordError] = useState<string | null>(null)
    const [isCurrentPasswordCorrect, setIsCurrentPasswordCorrect] = useState<boolean | null>(null)

    // Deactivation states
    const [deletePassword, setDeletePassword] = useState("")
    const [isDeletePasswordCorrect, setIsDeletePasswordCorrect] = useState<boolean | null>(null)
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false)

    // Password Validation states
    const [passwordStrength, setPasswordStrength] = useState(0)
    const [passwordCriteria, setPasswordCriteria] = useState({
        length: false,
        uppercase: false,
        lowercase: false,
        number: false,
        special: false,
    })
    const [passwordsMatch, setPasswordsMatch] = useState(true)

    // Privacy Settings (simplified to only Two-Factor Auth)
    const [privacySettings, setPrivacySettings] = useState({
        twoFactorAuth: false
    })

    // Activity History
    const [activities, setActivities] = useState<Activity[]>([
        {
            id: '1',
            type: 'meeting',
            title: 'Team Sync Meeting',
            description: 'Created a new meeting',
            timestamp: new Date(Date.now() - 3600000),
            metadata: { duration: '45m', participants: 5 }
        },
        {
            id: '2',
            type: 'transcription',
            title: 'Client Call Transcription',
            description: 'Transcribed 1200 words',
            timestamp: new Date(Date.now() - 86400000),
            metadata: { words: 1200, accuracy: '98%' }
        },
        {
            id: '3',
            type: 'export',
            title: 'Meeting Notes Export',
            description: 'Exported as PDF',
            timestamp: new Date(Date.now() - 172800000),
            metadata: { format: 'PDF', pages: 3 }
        },
        {
            id: '4',
            type: 'login',
            title: 'New Device Login',
            description: 'Logged in from Chrome on Windows',
            timestamp: new Date(Date.now() - 259200000),
            metadata: { browser: 'Chrome', os: 'Windows' }
        }
    ])

    // Stats
    const [userStats, setUserStats] = useState({
        totalMeetings: 24,
        totalMinutes: 1245,
        transcriptions: 18,
        storageUsed: '2.4 GB',
        memberSince: '2023-10-15'
    })

    useEffect(() => {
        const checkAuth = async () => {
            if (!authService.isAuthenticated()) {
                router.push("/login")
                return
            }

            const result = await authService.getProfile()
            if (result.success && result.user) {
                setUser(result.user)
                setFullName(result.user.full_name)
                setPhoneNumber(result.user.phone_number || "")
                setBio(result.user.bio || "")
                setLocation(result.user.location || "")
                setWebsite(result.user.website || "")

                // Load social links if available
                if (result.user.social_links) {
                    setSocialLinks(prev => prev.map(link => ({
                        ...link,
                        url: result.user!.social_links?.[link.platform] || ''
                    })))
                }

                // Load privacy settings (Two-Factor Auth)
                setPrivacySettings({
                    twoFactorAuth: result.user.two_factor_enabled || false
                })
            } else {
                authService.logout()
                router.push("/login")
            }
            setLoading(false)
        }
        checkAuth()
    }, [router])

    // Real-time Current PIN Verification (Debounced)
    useEffect(() => {
        const currentPin = currentPinDigits.join("")
        if (currentPin.length !== 6 || !user?.has_2fa_pin) {
            setIsCurrentPinVerified(false)
            setCurrentPinError("")
            return
        }

        const timer = setTimeout(async () => {
            setVerifyingCurrentPin(true)
            setCurrentPinError("")

            try {
                const result = await authService.verify2faPin(currentPin)
                if (result.success) {
                    setIsCurrentPinVerified(true)
                } else {
                    setIsCurrentPinVerified(false)
                    setCurrentPinError(result.error || "Incorrect PIN")
                }
            } catch (err) {
                setCurrentPinError("Verification failed")
            } finally {
                setVerifyingCurrentPin(false)
            }
        }, 500)

        return () => clearTimeout(timer)
    }, [currentPinDigits, user?.has_2fa_pin])

    // Live Current Password Verification
    useEffect(() => {
        if (!passwords.current) {
            setIsCurrentPasswordCorrect(null)
            return
        }

        const timer = setTimeout(async () => {
            try {
                const result = await authService.verifyCredentials(user?.email || "", passwords.current)
                setIsCurrentPasswordCorrect(result.password_correct)
            } catch (err) {
                console.error("Verification error:", err)
            }
        }, 500)

        return () => clearTimeout(timer)
    }, [passwords.current, user?.email])

    // Live Delete Password Verification
    useEffect(() => {
        if (!deletePassword) {
            setIsDeletePasswordCorrect(null)
            return
        }

        const timer = setTimeout(async () => {
            try {
                const result = await authService.verifyCredentials(user?.email || "", deletePassword)
                setIsDeletePasswordCorrect(result.password_correct)
            } catch (err) {
                console.error("Verification error:", err)
            }
        }, 500)

        return () => clearTimeout(timer)
    }, [deletePassword, user?.email])

    // Password Strength Logic
    const checkPasswordStrength = (pass: string) => {
        const criteria = {
            length: pass.length >= 8,
            uppercase: /[A-Z]/.test(pass),
            lowercase: /[a-z]/.test(pass),
            number: /[0-9]/.test(pass),
            special: /[^A-Za-z0-9]/.test(pass),
        }
        setPasswordCriteria(criteria)

        let score = 0
        if (criteria.length) score += 20
        if (criteria.uppercase) score += 20
        if (criteria.lowercase) score += 20
        if (criteria.number) score += 20
        if (criteria.special) score += 20

        setPasswordStrength(score)
    }

    useEffect(() => {
        if (passwords.new || passwords.confirm) {
            setPasswordsMatch(passwords.new === passwords.confirm)
        } else {
            setPasswordsMatch(true)
        }
    }, [passwords.new, passwords.confirm])

    const handleAvatarUpload = async (file: File) => {
        setUploadingAvatar(true)

        try {
            const formData = new FormData()
            formData.append('avatar', file)

            const response = await fetch(`${API_URL}/api/auth/avatar`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${authService.getToken()}`
                },
                body: formData
            })

            const data = await response.json()

            if (response.ok) {
                setUser(data.user)
                toast.success("Profile picture updated successfully!")
            } else {
                toast.error(data.error || "Failed to upload avatar")
            }
        } catch (err) {
            toast.error("Network error while uploading avatar")
        } finally {
            setUploadingAvatar(false)
        }
    }

    const handleUpdateProfile = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!fullName.trim()) return

        setUpdatingProfile(true)

        try {
            const socialLinksObj: Record<string, string> = {}
            socialLinks.forEach(link => {
                if (link.url.trim()) {
                    socialLinksObj[link.platform] = link.url.trim()
                }
            })

            const result = await authService.updateProfile(fullName, bio, {
                phone_number: phoneNumber,
                location,
                website,
                social_links: socialLinksObj,
                privacy_settings: { twoFactorAuth: privacySettings.twoFactorAuth }
            })

            if (result.success) {
                setUser(result.user || null)
                toast.success("Profile updated successfully!")
            } else {
                toast.error(result.error || "Failed to update profile")
            }
        } catch (err) {
            toast.error("Network error while updating profile")
        } finally {
            setUpdatingProfile(false)
        }
    }

    const handleChangePassword = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!isCurrentPasswordCorrect) return

        if (passwords.new !== passwords.confirm) {
            toast.error("Passwords do not match")
            return
        }

        if (passwordStrength < 60) {
            toast.error("New password is too weak. Please include at least 8 characters, uppercase, lowercase, numbers, or symbols.")
            return
        }

        setChangingPassword(true)
        setPasswordError(null)

        try {
            const result = await authService.changePassword(passwords.current, passwords.new)

            if (result.success) {
                toast.success(result.message || "Password updated successfully!")
                setPasswords({ current: "", new: "", confirm: "" })
                setPasswordStrength(0)
                setIsCurrentPasswordCorrect(null)

                // Refresh profile to get updated password_updated_at
                const profileResult = await authService.getProfile()
                if (profileResult.success && profileResult.user) {
                    setUser(profileResult.user)
                }
            } else {
                if (result.error === "password old") {
                    const timeAgo = user?.password_updated_at ? formatTimeAgo(new Date(user.password_updated_at)) : ""
                    const msg = `New password cannot be the same as your current password (set ${timeAgo})`
                    setPasswordError(msg)
                    toast.error(msg)
                } else {
                    toast.error(result.error || "Failed to change password")
                }
            }
        } catch (err) {
            toast.error("Network error while changing password")
        } finally {
            setChangingPassword(false)
        }
    }

    const handleDeleteAccount = async () => {
        setDeletingAccount(true)

        try {
            const token = authService.getToken()
            const response = await fetch(`${API_URL}/api/auth/profile`, {
                method: "DELETE",
                headers: {
                    "Authorization": `Bearer ${token}`
                }
            })

            if (response.ok) {
                authService.logout()
                router.push("/")
                toast.success("Account deactivated. You have 30 days to log back in if you wish to reactivate your account.")
            } else {
                const data = await response.json()
                toast.error(data.error || "Failed to deactivate account")
                setDeletingAccount(false)
                setIsDeleteModalOpen(false)
            }
        } catch (err) {
            toast.error("Network error while deactivating account")
            setDeletingAccount(false)
            setIsDeleteModalOpen(false)
        }
    }

    const handleUpdatePrivacySettings = async (checked: boolean) => {
        try {
            // If enabling 2FA but no PIN is set, show PIN input
            if (checked && !user?.has_2fa_pin) {
                setShowPinInput(true)
                return
            }

            // If disabling 2FA, just update
            if (!checked) {
                setPrivacySettings({ ...privacySettings, twoFactorAuth: checked })
                const result = await authService.updatePrivacySettings({ twoFactorAuth: checked })

                if (result.success) {
                    toast.success("Two-factor authentication disabled")
                    // Update local user state to sync with backend
                    if (user) {
                        setUser({ ...user, two_factor_enabled: checked })
                    }
                } else {
                    toast.error(result.error || "Failed to update 2FA settings")
                }
                return
            }

            // If enabling and PIN exists, just update
            setPrivacySettings({ ...privacySettings, twoFactorAuth: checked })
            const result = await authService.updatePrivacySettings({ twoFactorAuth: checked })

            if (result.success) {
                toast.success("Two-factor authentication enabled")
                // Update local user state to sync with backend
                if (user) {
                    setUser({ ...user, two_factor_enabled: checked })
                }
            } else {
                setPrivacySettings({ ...privacySettings, twoFactorAuth: !checked })
                toast.error(result.error || "Failed to update 2FA settings")
            }
        } catch (err) {
            toast.error("Network error updating settings")
        }
    }

    const handleSetPin = async () => {
        const currentPin = currentPinDigits.join("")
        const pin = pinDigits.join("")
        const confirm = confirmPinDigits.join("")

        if (user?.has_2fa_pin && currentPin.length !== 6) {
            toast.error("Please enter your current 6-digit PIN")
            return
        }

        if (pin.length !== 6) {
            toast.error("Please fill all 6 digits for the new PIN")
            return
        }
        if (pin !== confirm) {
            toast.error("The new PINs you entered do not match")
            return
        }

        setIsPinUpdating(true)
        const result = await authService.set2faPin(pin, user?.has_2fa_pin ? currentPin : undefined)
        if (result.success) {
            toast.success(user?.has_2fa_pin ? "2FA PIN successfully updated!" : "2FA PIN successfully saved!")

            if (user) {
                const updatedUser = { ...user, has_2fa_pin: true, two_factor_enabled: true }
                setUser(updatedUser)
                localStorage.setItem("user", JSON.stringify(updatedUser))
            }

            // Automatically enable 2FA after setting PIN by calling the update API
            setPrivacySettings({ ...privacySettings, twoFactorAuth: true })
            await authService.updatePrivacySettings({ twoFactorAuth: true })

            setShowPinInput(false)
            setCurrentPinDigits(["", "", "", "", "", ""])
            setPinDigits(["", "", "", "", "", ""])
            setConfirmPinDigits(["", "", "", "", "", ""])
        } else {
            toast.error(result.error || "Failed to save PIN")
        }
        setIsPinUpdating(false)
    }

    const getStrengthColor = (score: number) => {
        if (score < 40) return "bg-red-500"
        if (score < 60) return "bg-orange-500"
        if (score < 80) return "bg-yellow-500"
        return "bg-green-500"
    }

    const getStrengthText = (score: number) => {
        if (score === 0) return ""
        if (score < 40) return "Very Weak"
        if (score < 60) return "Weak"
        if (score < 80) return "Good"
        return "Strong"
    }

    const getActivityIcon = (type: ActivityType) => {
        switch (type) {
            case 'meeting': return <Calendar className="w-4 h-4" />
            case 'transcription': return <FileText className="w-4 h-4" />
            case 'export': return <Download className="w-4 h-4" />
            case 'login': return <User className="w-4 h-4" />
            case 'profile_update': return <Check className="w-4 h-4" />
            default: return <History className="w-4 h-4" />
        }
    }

    if (loading) {
        return (
            <div className="min-h-screen bg-panel flex items-center justify-center">
                <Loader2 className="w-8 h-8 text-primary animate-spin" />
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-panel text-white selection:bg-primary/30 flex flex-col">

            <main className="flex-grow max-w-6xl mx-auto px-4 pt-8 lg:pt-10 pb-12 w-full">
                {/* Simplified Header */}
                <div className="mb-8 md:mb-10 text-center md:text-left">
                    <div className="flex flex-col md:flex-row items-center justify-between mb-6">
                        <div>
                            <h1 className="text-3xl md:text-4xl lg:text-5xl font-extrabold gradient-text mb-2">Profile Settings</h1>
                            <p className="text-gray-400 text-sm md:text-lg">Manage your personal information and account security</p>
                        </div>
                    </div>
                </div>

                {/* Profile Section */}
                <section className="glass-card p-5 md:p-8 rounded-3xl border border-line relative overflow-hidden group mb-8">
                    <div className="flex flex-col items-center space-y-4 md:space-y-6">
                        <div className="relative group">
                            <div className="w-24 h-24 md:w-32 md:h-32 rounded-full bg-primary/10 border-4 border-line overflow-hidden shadow-2xl">
                                {user?.avatar_url ? (
                                    <img
                                        src={user.avatar_url}
                                        alt={fullName}
                                        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                                    />
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center">
                                        <User className="w-10 h-10 md:w-16 md:h-16 text-white/50" />
                                    </div>
                                )}
                            </div>
                            <button
                                onClick={() => fileInputRef.current?.click()}
                                className="absolute bottom-1 right-1 md:bottom-2 md:right-2 w-8 h-8 md:w-10 md:h-10 bg-primary rounded-full flex items-center justify-center border-2 border-white/20 hover:scale-110 transition-transform shadow-lg"
                                disabled={uploadingAvatar}
                            >
                                {uploadingAvatar ? (
                                    <Loader2 className="w-4 h-4 md:w-5 md:h-5 animate-spin" />
                                ) : (
                                    <Camera className="w-4 h-4 md:w-5 md:h-5" />
                                )}
                            </button>
                            <input
                                ref={fileInputRef}
                                type="file"
                                accept="image/*"
                                className="hidden"
                                onChange={(e) => {
                                    const file = e.target.files?.[0]
                                    if (file) handleAvatarUpload(file)
                                }}
                            />
                        </div>

                        <div className="text-center">
                            <h2 className="text-xl md:text-2xl font-bold">{fullName}</h2>
                            <p className="text-gray-400 text-sm md:text-base">{user?.email}</p>
                            {location && <p className="text-xs md:text-sm text-gray-500 mt-1">{location}</p>}
                        </div>
                    </div>
                </section>

                {/* Profile Details Form */}
                <section className="glass-card p-5 md:p-8 rounded-3xl border border-line relative overflow-hidden group mb-8">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full blur-3xl -mr-16 -mt-16 group-hover:bg-primary/10 transition-colors duration-500"></div>

                    <div className="flex items-center space-x-4 mb-6 md:mb-8">
                        <div className="w-10 h-10 md:w-12 md:h-12 bg-primary/20 rounded-2xl flex items-center justify-center border border-primary/30">
                            <User className="w-5 h-5 md:w-6 md:h-6 text-primary" />
                        </div>
                        <div>
                            <h2 className="text-xl md:text-2xl font-bold">Profile Details</h2>
                            <p className="text-xs md:text-sm text-gray-400">Your public identity on the platform</p>
                        </div>
                    </div>

                    <form onSubmit={handleUpdateProfile} className="space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-gray-300">Email Address</label>
                                <div className="relative">
                                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                                    <Input
                                        disabled
                                        value={user?.email || ""}
                                        className="pl-10 bg-white/5 border-line text-gray-500 cursor-not-allowed h-11"
                                    />
                                </div>
                                <p className="text-[10px] text-gray-500 ml-1">Email cannot be changed for security</p>
                            </div>

                            {user?.phone_number && (
                                <div className="space-y-2">
                                    <label className="text-sm font-medium text-gray-300">Phone Number</label>
                                    <div className="relative">
                                        <Smartphone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                                        <Input
                                            disabled
                                            value={user.phone_number}
                                            className="pl-10 bg-white/5 border-line text-gray-500 cursor-not-allowed h-11"
                                        />
                                    </div>
                                    <p className="text-[10px] text-gray-500 ml-1">Phone number cannot be changed for security</p>
                                </div>
                            )}

                            <div className="space-y-2">
                                <label className="text-sm font-medium text-gray-300">Full Name *</label>
                                <div className="relative">
                                    <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-primary/70" />
                                    <Input
                                        value={fullName}
                                        onChange={(e) => setFullName(e.target.value)}
                                        placeholder="Edit your name"
                                        required
                                        className="pl-10 bg-white/5 border-line focus:border-primary/50 transition-all h-11 focus:ring-1 focus:ring-primary/20"
                                    />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label className="text-sm font-medium text-gray-300">Location</label>
                                <div className="relative">
                                    <Globe className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                                    <Input
                                        value={location}
                                        onChange={(e) => setLocation(e.target.value)}
                                        placeholder="City, Country"
                                        className="pl-10 bg-white/5 border-line h-11 focus:border-primary/50 transition-all focus:ring-1 focus:ring-primary/20"
                                    />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label className="text-sm font-medium text-gray-300">Website</label>
                                <div className="relative">
                                    <LinkIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                                    <Input
                                        value={website}
                                        onChange={(e) => setWebsite(e.target.value)}
                                        placeholder="https://yourwebsite.com"
                                        className="pl-10 bg-white/5 border-line h-11 focus:border-primary/50 transition-all focus:ring-1 focus:ring-primary/20"
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-medium text-gray-300">Bio / About Me</label>
                            <div className="relative">
                                <TextQuote className="absolute left-3 top-3 w-4 h-4 text-primary/70" />
                                <textarea
                                    value={bio}
                                    onChange={(e) => setBio(e.target.value)}
                                    placeholder="Tell us a bit about yourself..."
                                    rows={4}
                                    className="w-full pl-10 pr-4 py-3 bg-white/5 border border-line rounded-xl focus:border-primary/50 focus:ring-1 focus:ring-primary/20 transition-all outline-none text-sm resize-none"
                                />
                            </div>
                            <p className="text-[10px] text-gray-500 ml-1">Max 500 characters</p>
                        </div>

                        {/* Social Links */}
                        <div className="space-y-4">
                            <label className="text-sm font-medium text-gray-300">Social Links</label>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                {socialLinks.map((link, index) => (
                                    <div key={link.platform} className="space-y-2">
                                        <div className="flex items-center space-x-2">
                                            <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center">
                                                {link.icon}
                                            </div>
                                            <span className="text-sm font-medium capitalize">{link.platform}</span>
                                        </div>
                                        <Input
                                            value={link.url}
                                            onChange={(e) => {
                                                const newLinks = [...socialLinks]
                                                newLinks[index].url = e.target.value
                                                setSocialLinks(newLinks)
                                            }}
                                            placeholder={`https://${link.platform}.com/username`}
                                            className="bg-white/5 border-line h-9 text-sm focus:border-primary/50 transition-all focus:ring-1 focus:ring-primary/20"
                                        />
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className="flex flex-col-reverse sm:flex-row justify-between items-center pt-4 gap-4 sm:gap-0">
                            <Button
                                type="button"
                                variant="ghost"
                                onClick={() => {
                                    setFullName(user?.full_name || "")
                                    setBio(user?.bio || "")
                                    setLocation(user?.location || "")
                                    setWebsite(user?.website || "")
                                }}
                                className="text-gray-400 hover:text-white w-full sm:w-auto"
                            >
                                Reset Changes
                            </Button>
                            <Button
                                type="submit"
                                disabled={updatingProfile || !fullName.trim()}
                                className="bg-primary/20 border border-primary/30 hover:bg-primary/30 text-white px-8 h-11 rounded-xl shadow-lg shadow-primary/5 w-full sm:w-auto"
                            >
                                {updatingProfile ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />}
                                Save Profile
                            </Button>
                        </div>
                    </form>
                </section>

                {/* Security Section */}
                <section className="glass-card p-5 md:p-8 rounded-3xl border border-line relative overflow-hidden group mb-8">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-accent/5 rounded-full blur-3xl -mr-16 -mt-16 group-hover:bg-accent/10 transition-colors duration-500"></div>

                    <div className="flex items-center space-x-4 mb-6 md:mb-8">
                        <div className="w-10 h-10 md:w-12 md:h-12 bg-accent/20 rounded-2xl flex items-center justify-center border border-accent/30">
                            <Lock className="w-5 h-5 md:w-6 md:h-6 text-accent" />
                        </div>
                        <div>
                            <h2 className="text-xl md:text-2xl font-bold">Change Password</h2>
                            {user?.password_updated_at && (
                                <p className="text-xs text-primary font-medium">
                                    Last changed {formatTimeAgo(new Date(user.password_updated_at))}
                                </p>
                            )}
                            <p className="text-xs md:text-sm text-gray-400">Update your password to keep your account safe</p>
                        </div>
                    </div>

                    <form onSubmit={handleChangePassword} className="space-y-6">
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-gray-300">Current Password</label>
                            <div className="relative">
                                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                                <Input
                                    type={showCurrentPassword ? "text" : "password"}
                                    value={passwords.current}
                                    onChange={(e) => setPasswords({ ...passwords, current: e.target.value })}
                                    placeholder="••••••••"
                                    className={`pl-10 pr-20 bg-white/5 border-line h-11 focus:border-accent/50 transition-all focus:ring-1 focus:ring-accent/20 ${isCurrentPasswordCorrect === true ? "border-green-500/50" :
                                        isCurrentPasswordCorrect === false ? "border-red-500/50" : ""
                                        }`}
                                />
                                <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center space-x-2">
                                    {isCurrentPasswordCorrect === true && <CheckCircle2 className="w-4 h-4 text-green-500" />}
                                    {isCurrentPasswordCorrect === false && <AlertCircle className="w-4 h-4 text-red-500" />}
                                    <button
                                        type="button"
                                        onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                                        className="text-gray-500 hover:text-white transition-colors p-1"
                                    >
                                        {showCurrentPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                    </button>
                                </div>
                            </div>
                            {isCurrentPasswordCorrect === false && (
                                <p className="text-[10px] text-red-400 ml-1">Incorrect current password</p>
                            )}
                            {passwordError && (
                                <p className="text-[10px] text-red-400 ml-1 font-bold animate-pulse">{passwordError}</p>
                            )}
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-gray-300">New Password</label>
                                <div className="relative">
                                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-accent/70" />
                                    <Input
                                        type={showNewPassword ? "text" : "password"}
                                        disabled={isCurrentPasswordCorrect !== true}
                                        value={passwords.new}
                                        onChange={(e) => {
                                            setPasswords({ ...passwords, new: e.target.value })
                                            checkPasswordStrength(e.target.value)
                                        }}
                                        placeholder="••••••••"
                                        className="pl-10 pr-10 bg-white/5 border-line h-11 disabled:opacity-50 disabled:cursor-not-allowed focus:border-accent/50 transition-all focus:ring-1 focus:ring-accent/20"
                                    />
                                    <button
                                        type="button"
                                        disabled={isCurrentPasswordCorrect !== true}
                                        onClick={() => setShowNewPassword(!showNewPassword)}
                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white transition-colors disabled:opacity-0 p-1"
                                    >
                                        {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                    </button>
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label className="text-sm font-medium text-gray-300">Confirm New Password</label>
                                <div className="relative">
                                    <CheckCircle2 className={`absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 ${passwordsMatch ? 'text-green-500/70' : 'text-red-500/70'}`} />
                                    <Input
                                        type={showConfirmPassword ? "text" : "password"}
                                        disabled={isCurrentPasswordCorrect !== true}
                                        value={passwords.confirm}
                                        onChange={(e) => setPasswords({ ...passwords, confirm: e.target.value })}
                                        placeholder="••••••••"
                                        className={`pl-10 pr-10 bg-white/5 border-line h-11 disabled:opacity-50 disabled:cursor-not-allowed focus:border-accent/50 transition-all focus:ring-1 focus:ring-accent/20 ${!passwordsMatch && passwords.confirm ? 'border-red-500/50 focus:border-red-500' : ''}`}
                                    />
                                    <button
                                        type="button"
                                        disabled={isCurrentPasswordCorrect !== true}
                                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white transition-colors disabled:opacity-0 p-1"
                                    >
                                        {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                    </button>
                                </div>
                                {!passwordsMatch && passwords.confirm && (
                                    <p className="text-[10px] text-red-400 ml-1">Passwords do not match</p>
                                )}
                            </div>
                        </div>

                        {/* Strength Meter */}
                        {passwords.new && isCurrentPasswordCorrect === true && (
                            <div className="space-y-3 p-4 bg-white/5 rounded-2xl border border-line">
                                <div className="flex justify-between items-center mb-1">
                                    <span className="text-xs font-medium text-gray-400">Password Strength:</span>
                                    <span className={`text-xs font-bold ${getStrengthColor(passwordStrength).replace('bg-', 'text-')}`}>
                                        {getStrengthText(passwordStrength)}
                                    </span>
                                </div>
                                <Progress
                                    value={passwordStrength}
                                    className="h-1.5 bg-white/10"
                                    indicatorClassName={`${getStrengthColor(passwordStrength)} transition-all duration-500`}
                                />
                                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mt-2">
                                    {[
                                        { label: "8+ chars", met: passwordCriteria.length },
                                        { label: "Uppercase", met: passwordCriteria.uppercase },
                                        { label: "Lowercase", met: passwordCriteria.lowercase },
                                        { label: "Number", met: passwordCriteria.number },
                                        { label: "Special symbol", met: passwordCriteria.special },
                                    ].map((c) => (
                                        <div key={c.label} className="flex items-center space-x-2 text-[10px]">
                                            {c.met ? <CheckCircle2 className="w-3 h-3 text-green-500" /> : <div className="w-3 h-3 rounded-full border border-gray-600" />}
                                            <span className={c.met ? "text-gray-300" : "text-gray-500"}>{c.label}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        <div className="flex justify-end">
                            <Button
                                type="submit"
                                disabled={changingPassword || !passwords.current || passwordStrength < 60 || !passwordsMatch}
                                className="bg-accent/20 border border-accent/30 hover:bg-accent/30 text-white px-8 h-11 rounded-xl shadow-lg shadow-accent/5 w-full sm:w-auto"
                            >
                                {changingPassword ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />}
                                Update Password
                            </Button>
                        </div>
                    </form>
                </section>

                {/* Two-Factor Authentication Section */}
                <section className="glass-card p-5 md:p-8 rounded-3xl border border-line mb-8 relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/5 rounded-full blur-3xl -mr-16 -mt-16"></div>

                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                        <div className="flex items-center space-x-4">
                            <div className="w-10 h-10 md:w-12 md:h-12 bg-blue-500/20 rounded-2xl flex items-center justify-center border border-blue-500/30 flex-shrink-0">
                                <Shield className="w-5 h-5 md:w-6 md:h-6 text-blue-500" />
                            </div>
                            <div>
                                <h2 className="text-lg md:text-2xl font-bold">Two-Factor Authentication</h2>
                                <p className="text-xs md:text-sm text-gray-400">
                                    {privacySettings.twoFactorAuth
                                        ? "Account protected with 2FA PIN"
                                        : "Add an extra layer of security with a custom PIN"}
                                </p>
                            </div>
                        </div>
                        <div className="flex items-center space-x-4">
                            <Button
                                variant="outline"
                                onClick={() => setShowPinInput(!showPinInput)}
                                className="bg-white/5 border-line hover:bg-white/10 text-xs h-9"
                            >
                                <Key className="w-3 h-3 mr-2" />
                                {showPinInput ? "Cancel" : user?.has_2fa_pin ? "Change PIN" : "Set 2FA PIN"}
                            </Button>
                            <Switch
                                checked={privacySettings.twoFactorAuth}
                                onCheckedChange={handleUpdatePrivacySettings}
                                className="data-[state=checked]:bg-blue-500"
                            />
                        </div>
                    </div>

                    <p className="text-xs md:text-sm text-gray-500 mb-6 leading-relaxed">
                        When enabled, you'll need to enter your 6-digit PIN whenever you sign in with your password. This ensures that only you can access your account even if someone knows your password.
                    </p>

                    {/* PIN Input Section - Shows below when toggled */}
                    {showPinInput && (
                        <div className="mt-6 p-4 md:p-6 bg-white/5 rounded-2xl border border-line space-y-6 animate-in slide-in-from-top-4 duration-500">
                            {/* Current PIN Section - Only if user has a PIN */}
                            {user?.has_2fa_pin && (
                                <div className="space-y-4 pb-6 border-b border-line">
                                    <div className="text-center">
                                        <div className="flex items-center justify-center gap-2 mb-1">
                                            <span className="text-sm font-medium text-orange-400">Current Security PIN</span>
                                            {verifyingCurrentPin ? (
                                                <Loader2 className="w-3 h-3 animate-spin text-orange-400" />
                                            ) : isCurrentPinVerified ? (
                                                <div className="flex items-center text-[10px] text-green-500 bg-green-500/10 px-2 py-0.5 rounded-full border border-green-500/20">
                                                    <CheckCircle2 className="w-2.5 h-2.5 mr-1" />
                                                    Verified
                                                </div>
                                            ) : currentPinError ? (
                                                <div className="flex items-center text-[10px] text-red-500 bg-red-500/10 px-2 py-0.5 rounded-full border border-red-500/20">
                                                    <AlertCircle className="w-2.5 h-2.5 mr-1" />
                                                    Incorrect
                                                </div>
                                            ) : (
                                                currentPinDigits.join("").length === 6 && (
                                                    <div className="flex items-center text-[10px] text-orange-400 bg-orange-400/10 px-2 py-0.5 rounded-full border border-orange-400/20">
                                                        <ShieldCheck className="w-2.5 h-2.5 mr-1" />
                                                        Entered
                                                    </div>
                                                )
                                            )}
                                        </div>
                                        <p className="text-xs text-gray-500">Verify your identity before changing your PIN</p>
                                    </div>
                                    <div className="flex justify-center gap-1 md:gap-3">
                                        {currentPinDigits.map((digit, idx) => (
                                            <input
                                                key={`current-${idx}`}
                                                ref={el => { currentPinRefs.current[idx] = el }}
                                                type="password"
                                                inputMode="numeric"
                                                maxLength={1}
                                                value={digit}
                                                onChange={(e) => {
                                                    const val = e.target.value.replace(/\D/g, "")
                                                    if (val) {
                                                        const newDigits = [...currentPinDigits]
                                                        newDigits[idx] = val
                                                        setCurrentPinDigits(newDigits)

                                                        // Reset verification states when user types
                                                        setIsCurrentPinVerified(false)
                                                        setCurrentPinError("")

                                                        if (idx < 5) currentPinRefs.current[idx + 1]?.focus()
                                                    }
                                                }}
                                                onKeyDown={(e) => {
                                                    if (e.key === "Backspace") {
                                                        if (!currentPinDigits[idx] && idx > 0) {
                                                            const newDigits = [...currentPinDigits]
                                                            newDigits[idx - 1] = ""
                                                            setCurrentPinDigits(newDigits)

                                                            // Reset verification states on backspace
                                                            setIsCurrentPinVerified(false)
                                                            setCurrentPinError("")

                                                            currentPinRefs.current[idx - 1]?.focus()
                                                        } else {
                                                            const newDigits = [...currentPinDigits]
                                                            newDigits[idx] = ""
                                                            setCurrentPinDigits(newDigits)

                                                            // Reset verification states on backspace
                                                            setIsCurrentPinVerified(false)
                                                            setCurrentPinError("")
                                                        }
                                                    }
                                                }}
                                                className={`w-10 h-14 md:w-12 md:h-16 bg-white/5 border-2 rounded-xl text-center text-lg md:text-2xl font-bold text-white transition-all outline-none
                                                    ${isCurrentPinVerified ? 'border-green-500/50 bg-green-500/10' :
                                                        currentPinError ? 'border-red-500/50 bg-red-500/10' :
                                                            'border-line focus:border-orange-500 focus:bg-orange-500/10 focus:ring-2 focus:ring-orange-500/20'}`}
                                            />
                                        ))}
                                    </div>
                                    <div className="flex justify-center mt-3 h-8 items-center space-x-2">
                                        {verifyingCurrentPin && <Loader2 className="w-4 h-4 animate-spin text-orange-400" />}
                                        {isCurrentPinVerified && <CheckCircle2 className="w-5 h-5 text-green-500" />}
                                        {currentPinError && <AlertCircle className="w-5 h-5 text-red-500" />}
                                    </div>
                                    {currentPinError && (
                                        <div className="text-center mt-1 animate-in fade-in slide-in-from-top-1 duration-300">
                                            <span className="text-[10px] font-medium text-red-400 ml-1">
                                                Incorrect current security PIN
                                            </span>
                                        </div>
                                    )}
                                    {isCurrentPinVerified && (
                                        <div className="text-center mt-1 animate-in fade-in slide-in-from-top-1 duration-300">
                                            <span className="text-[10px] font-medium text-green-400 ml-1">
                                                PIN verified. You can now set your new PIN below.
                                            </span>
                                        </div>
                                    )}
                                </div>
                            )}

                            <div className={`space-y-4 transition-all duration-300 ${user?.has_2fa_pin && !isCurrentPinVerified ? 'opacity-40 pointer-events-none' : 'opacity-100'}`}>
                                <div className="text-center">
                                    <div className="flex items-center justify-center gap-2 mb-1">
                                        <span className="text-sm font-medium text-blue-400">
                                            {user?.has_2fa_pin ? "New 6-Digit PIN" : "Enter New PIN"}
                                        </span>
                                        {isCurrentPinVerified && (
                                            <div className="flex items-center text-[10px] text-green-500 bg-green-500/10 px-2 py-0.5 rounded-full border border-green-500/20">
                                                <CheckCircle2 className="w-2.5 h-2.5 mr-1" />
                                                Ready
                                            </div>
                                        )}
                                    </div>
                                    <p className="text-xs text-gray-500">Type 6 digits (0-9 only)</p>
                                </div>
                                <div className="flex justify-center gap-1 md:gap-3">
                                    {pinDigits.map((digit, idx) => (
                                        <input
                                            key={`pin-${idx}`}
                                            ref={el => { pinRefs.current[idx] = el }}
                                            type="password"
                                            inputMode="numeric"
                                            maxLength={1}
                                            value={digit}
                                            disabled={user?.has_2fa_pin && !isCurrentPinVerified}
                                            onChange={(e) => {
                                                const val = e.target.value.replace(/\D/g, "")
                                                if (val) {
                                                    const newDigits = [...pinDigits]
                                                    newDigits[idx] = val
                                                    setPinDigits(newDigits)
                                                    if (idx < 5) pinRefs.current[idx + 1]?.focus()
                                                }
                                            }}
                                            onKeyDown={(e) => {
                                                if (e.key === "Backspace") {
                                                    if (!pinDigits[idx] && idx > 0) {
                                                        const newDigits = [...pinDigits]
                                                        newDigits[idx - 1] = ""
                                                        setPinDigits(newDigits)
                                                        pinRefs.current[idx - 1]?.focus()
                                                    } else {
                                                        const newDigits = [...pinDigits]
                                                        newDigits[idx] = ""
                                                        setPinDigits(newDigits)
                                                    }
                                                }
                                            }}
                                            className="w-10 h-14 md:w-12 md:h-16 bg-white/5 border-2 border-line rounded-xl text-center text-lg md:text-2xl font-bold text-white focus:border-accent/50 focus:bg-accent/10 focus:ring-2 focus:ring-accent/20 transition-all outline-none"
                                        />
                                    ))}
                                </div>
                            </div>

                            <div className={`space-y-4 transition-all duration-300 ${pinDigits.join("").length !== 6 ? 'opacity-40 pointer-events-none' : 'opacity-100'}`}>
                                <div className="text-center">
                                    <span className="text-sm font-medium text-blue-400">Confirm {user?.has_2fa_pin ? "New" : ""} PIN</span>
                                    <p className="text-xs text-gray-500 mt-1">Re-enter the same 6 digits</p>
                                </div>
                                <div className="flex justify-center gap-1 md:gap-3">
                                    {confirmPinDigits.map((digit, idx) => (
                                        <input
                                            key={`confirm-${idx}`}
                                            ref={el => { confirmPinRefs.current[idx] = el }}
                                            type="password"
                                            inputMode="numeric"
                                            maxLength={1}
                                            value={digit}
                                            disabled={pinDigits.join("").length !== 6}
                                            onChange={(e) => {
                                                const val = e.target.value.replace(/\D/g, "")
                                                if (val) {
                                                    const newDigits = [...confirmPinDigits]
                                                    newDigits[idx] = val
                                                    setConfirmPinDigits(newDigits)
                                                    if (idx < 5) confirmPinRefs.current[idx + 1]?.focus()
                                                }
                                            }}
                                            onKeyDown={(e) => {
                                                if (e.key === "Backspace") {
                                                    if (!confirmPinDigits[idx] && idx > 0) {
                                                        const newDigits = [...confirmPinDigits]
                                                        newDigits[idx - 1] = ""
                                                        setConfirmPinDigits(newDigits)
                                                        confirmPinRefs.current[idx - 1]?.focus()
                                                    } else {
                                                        const newDigits = [...confirmPinDigits]
                                                        newDigits[idx] = ""
                                                        setConfirmPinDigits(newDigits)
                                                    }
                                                }
                                            }}
                                            className="w-10 h-14 md:w-12 md:h-16 bg-white/5 border-2 border-line rounded-xl text-center text-lg md:text-2xl font-bold text-white focus:border-accent/50 focus:bg-accent/10 focus:ring-2 focus:ring-accent/20 transition-all outline-none"
                                        />
                                    ))}
                                </div>
                            </div>

                            {/* PIN Status Display */}
                            {pinDigits.join("").length === 6 && confirmPinDigits.join("").length === 6 && (
                                <div className={`text-center text-sm font-medium p-3 rounded-lg ${pinDigits.join("") === confirmPinDigits.join("") ? 'bg-green-500/5 text-green-400 border border-green-500/20' : 'bg-red-500/5 text-red-400 border border-red-500/20'}`}>
                                    {pinDigits.join("") === confirmPinDigits.join("") ? (
                                        <div className="flex items-center justify-center gap-2">
                                            <CheckCircle2 className="w-4 h-4" />
                                            PINs match
                                        </div>
                                    ) : (
                                        <div className="flex items-center justify-center gap-2">
                                            <AlertCircle className="w-4 h-4" />
                                            PINs don't match
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* Action Buttons */}
                            <div className="flex flex-col sm:flex-row gap-3 pt-4">
                                <Button
                                    variant="outline"
                                    onClick={() => {
                                        setShowPinInput(false)
                                        setCurrentPinDigits(["", "", "", "", "", ""])
                                        setPinDigits(["", "", "", "", "", ""])
                                        setConfirmPinDigits(["", "", "", "", "", ""])
                                    }}
                                    className="flex-1 h-12 bg-white/5 border-line hover:bg-white/10 text-gray-300 rounded-xl"
                                >
                                    Cancel
                                </Button>
                                <Button
                                    onClick={handleSetPin}
                                    disabled={
                                        isPinUpdating ||
                                        pinDigits.join("").length !== 6 ||
                                        confirmPinDigits.join("").length !== 6 ||
                                        pinDigits.join("") !== confirmPinDigits.join("") ||
                                        (user?.has_2fa_pin && !isCurrentPinVerified)
                                    }
                                    className="flex-1 h-12 bg-accent hover:bg-accent/90 text-white rounded-xl font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    {isPinUpdating ? (
                                        <div className="flex items-center justify-center gap-2">
                                            <Loader2 className="w-4 h-4 animate-spin" />
                                            Saving...
                                        </div>
                                    ) : (
                                        <div className="flex items-center justify-center gap-2">
                                            {user?.has_2fa_pin ? "Confirm & Update PIN" : "Set PIN & Enable 2FA"}
                                        </div>
                                    )}
                                </Button>
                            </div>
                        </div>
                    )}
                </section>

                {/* Danger Zone - Always Visible */}
                <section className="glass-card p-5 md:p-8 rounded-3xl border border-red-500/20 bg-red-500/[0.02] relative overflow-hidden">
                    <div className="absolute -bottom-10 -left-10 w-40 h-40 bg-red-500/[0.03] rounded-full blur-3xl"></div>

                    <div className="flex flex-col space-y-6">
                        <div className="space-y-2">
                            <div className="flex items-center space-x-3">
                                <Shield className="w-5 h-5 text-red-400" />
                                <h2 className="text-lg md:text-xl font-bold text-red-500">Deactivate Account</h2>
                            </div>
                            <p className="text-xs md:text-sm text-gray-400 max-w-lg leading-relaxed">
                                Deactivating your account will hide your profile and data. You have <span className="text-green-400 font-semibold">30 days</span> to log back in to reactivate your account. After 30 days, the deactivation becomes permanent.
                            </p>
                        </div>

                        <div className="space-y-4 w-full">
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-gray-300">Confirm Password to Deactivate</label>
                                <div className="relative">
                                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                                    <Input
                                        type={showDeletePassword ? "text" : "password"}
                                        value={deletePassword}
                                        onChange={(e) => setDeletePassword(e.target.value)}
                                        placeholder="Enter password to confirm"
                                        className={`pl-10 pr-20 bg-white/5 border-line h-11 transition-all focus:border-red-500/50 focus:ring-1 focus:ring-red-500/20 ${isDeletePasswordCorrect === true ? "border-green-500/50" :
                                            isDeletePasswordCorrect === false ? "border-red-500/50" : ""
                                            }`}
                                    />
                                    <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center space-x-2">
                                        {isDeletePasswordCorrect === true && <CheckCircle2 className="w-4 h-4 text-green-500" />}
                                        {isDeletePasswordCorrect === false && <AlertCircle className="w-4 h-4 text-red-500" />}
                                        <button
                                            type="button"
                                            onClick={() => setShowDeletePassword(!showDeletePassword)}
                                            className="text-gray-500 hover:text-white transition-colors p-1"
                                        >
                                            {showDeletePassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                        </button>
                                    </div>
                                </div>
                                {isDeletePasswordCorrect === false && (
                                    <p className="text-[10px] text-red-400 ml-1">Incorrect password</p>
                                )}
                            </div>

                            <div className="flex justify-end pt-2">
                                <Button
                                    onClick={() => setIsDeleteModalOpen(true)}
                                    disabled={deletingAccount || isDeletePasswordCorrect !== true}
                                    className="bg-red-500/10 border border-red-500/20 text-red-400 hover:bg-red-500/20 h-11 px-8 rounded-xl transition-all hover:scale-[1.02] active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-red-500/5 w-full sm:w-auto"
                                >
                                    {deletingAccount ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Shield className="w-4 h-4 mr-2" />}
                                    Deactivate My Account
                                </Button>
                            </div>
                        </div>
                    </div>
                </section>
            </main>


            {/* Delete Account Modal */}
            {isDeleteModalOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-300">
                    <div className="glass-card max-w-md w-full p-6 md:p-8 rounded-3xl border border-red-500/30 bg-panel shadow-2xl relative overflow-hidden animate-in zoom-in-95 duration-300">
                        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-32 h-32 bg-red-500/10 blur-3xl -mt-16"></div>

                        <div className="text-center space-y-6 relative z-10">
                            <div className="w-16 h-16 md:w-20 md:h-20 bg-red-500/20 rounded-full flex items-center justify-center mx-auto border border-red-500/30 animate-pulse">
                                <Shield className="w-8 h-8 md:w-10 md:h-10 text-red-500" />
                            </div>

                            <div className="space-y-2">
                                <h2 className="text-2xl md:text-3xl font-bold text-white">Deactivate Account?</h2>
                                <p className="text-gray-400 leading-relaxed text-sm md:text-base">
                                    Your profile will be hidden. You can <span className="text-green-400 font-bold uppercase">reactivate within 30 days</span> by logging back in. After that, deactivation is permanent.
                                </p>
                            </div>

                            <div className="grid grid-cols-2 gap-4 pt-4">
                                <Button
                                    variant="ghost"
                                    onClick={() => setIsDeleteModalOpen(false)}
                                    className="bg-white/5 border border-line hover:bg-white/10 h-12 rounded-2xl"
                                >
                                    Cancel
                                </Button>
                                <Button
                                    onClick={handleDeleteAccount}
                                    disabled={deletingAccount}
                                    className="bg-red-500 hover:bg-red-600 text-white h-12 rounded-2xl shadow-lg shadow-red-500/20"
                                >
                                    {deletingAccount ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : "Deactivate Now"}
                                </Button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}