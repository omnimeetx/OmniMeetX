"use client"
import { API_URL } from "@/lib/config"

import type React from "react"

import { useState, Suspense } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Lock, Eye, EyeOff, Loader2, CheckCircle2, AlertCircle, XCircle } from "lucide-react"
import { Progress } from "@/components/ui/progress"

// Separate component for search params logic
function ResetPasswordForm() {
    const [formData, setFormData] = useState({
        newPassword: "",
        confirmPassword: "",
    })
    const [showPassword, setShowPassword] = useState(false)
    const [isLoading, setIsLoading] = useState(false)
    const [isSuccess, setIsSuccess] = useState(false)
    const [error, setError] = useState("")
    const [passwordStrength, setPasswordStrength] = useState(0)
    const [passwordCriteria, setPasswordCriteria] = useState({
        length: false,
        uppercase: false,
        lowercase: false,
        number: false,
        special: false,
    })
    const [passwordsMatch, setPasswordsMatch] = useState(true)

    const router = useRouter()
    const searchParams = useSearchParams()
    const token = searchParams.get("token")

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target
        setFormData((prev) => ({
            ...prev,
            [name]: value,
        }))
        setError("")

        if (name === "newPassword") {
            checkPasswordStrength(value)
        }
    }

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

    const getStrengthColor = (score: number) => {
        if (score <= 20) return "bg-red-500"
        if (score <= 40) return "bg-orange-500"
        if (score <= 60) return "bg-yellow-500"
        if (score <= 80) return "bg-blue-500"
        return "bg-green-500"
    }

    const getStrengthLabel = (score: number) => {
        if (score === 0) return ""
        if (score <= 20) return "Very Weak"
        if (score <= 40) return "Weak"
        if (score <= 60) return "Medium"
        if (score <= 80) return "Strong"
        return "Very Strong"
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()

        if (!token) {
            setError("Invalid or missing reset token.")
            return
        }

        if (formData.newPassword !== formData.confirmPassword) {
            setError("Passwords do not match.")
            return
        }

        if (passwordStrength < 60) {
            setError("Please choose a stronger password.")
            return
        }

        setIsLoading(true)
        setError("")

        try {
            const response = await fetch(`${API_URL}/api/auth/reset-password`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    token,
                    new_password: formData.newPassword,
                }),
            })

            const data = await response.json()

            if (response.ok) {
                setIsSuccess(true)
                setTimeout(() => {
                    router.push("/login")
                }, 3000)
            } else {
                setError(data.error || "Failed to reset password.")
            }
        } catch (err) {
            setError("Network error. Please try again.")
        } finally {
            setIsLoading(false)
        }
    }

    if (isSuccess) {
        return (
            <div className="text-center space-y-6 py-4 animate-in fade-in zoom-in duration-300">
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto text-green-600">
                    <CheckCircle2 className="w-8 h-8" />
                </div>
                <div className="space-y-2">
                    <h3 className="text-lg font-medium">Password Reset Successful</h3>
                    <p className="text-muted-foreground text-sm">
                        Your password has been updated. Redirecting to login...
                    </p>
                </div>
                <Button asChild className="w-full glass-button" variant="outline">
                    <Link href="/login">Sign In Now</Link>
                </Button>
            </div>
        )
    }

    return (
        <>
            {error && (
                <Alert className="mb-6 border-destructive/50 bg-destructive/10">
                    <AlertDescription className="text-destructive flex items-center gap-2">
                        <AlertCircle className="h-4 w-4" />
                        {error}
                    </AlertDescription>
                </Alert>
            )}

            {/* Show error if token is missing initially */}
            {!token && !error && (
                <Alert className="mb-6 border-destructive/50 bg-destructive/10">
                    <AlertDescription className="text-destructive flex items-center gap-2">
                        <AlertCircle className="h-4 w-4" />
                        Invalid link. Please check your email or try requesting a new reset link.
                    </AlertDescription>
                </Alert>
            )}

            <form onSubmit={handleSubmit} className="space-y-6">
                <div className="space-y-2">
                    <Label htmlFor="newPassword">New Password</Label>
                    <div className="relative">
                        <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                        <Input
                            id="newPassword"
                            name="newPassword"
                            type={showPassword ? "text" : "password"}
                            required
                            value={formData.newPassword}
                            onChange={handleChange}
                            className="glass pl-10 pr-10"
                            placeholder="Enter new password"
                        />
                        <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                            onClick={() => setShowPassword(!showPassword)}
                        >
                            {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </Button>
                    </div>

                    {/* Password Strength Indicator */}
                    {formData.newPassword && (
                        <div className="space-y-2 mt-2 transition-all duration-300">
                            <div className="flex justify-between items-center text-xs">
                                <span className="text-muted-foreground">Strength: {getStrengthLabel(passwordStrength)}</span>
                                <span>{passwordStrength}%</span>
                            </div>
                            <Progress value={passwordStrength} className="h-1.5" indicatorClassName={getStrengthColor(passwordStrength)} />

                            <div className="grid grid-cols-2 gap-2 mt-2">
                                <RequirementItem met={passwordCriteria.length} text="8+ characters" />
                                <RequirementItem met={passwordCriteria.uppercase} text="Uppercase" />
                                <RequirementItem met={passwordCriteria.lowercase} text="Lowercase" />
                                <RequirementItem met={passwordCriteria.number} text="Number" />
                                <RequirementItem met={passwordCriteria.special} text="Special char" />
                            </div>
                        </div>
                    )}
                </div>

                <div className="space-y-2">
                    <Label htmlFor="confirmPassword">Confirm Password</Label>
                    <div className="relative">
                        <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                        <Input
                            id="confirmPassword"
                            name="confirmPassword"
                            type={showPassword ? "text" : "password"}
                            required
                            value={formData.confirmPassword}
                            onChange={(e) => {
                                handleChange(e)
                                setPasswordsMatch(formData.newPassword === e.target.value)
                            }}
                            className={`glass pl-10 ${formData.confirmPassword && !passwordsMatch ? "border-red-500/50" : formData.confirmPassword && passwordsMatch ? "border-green-500/50" : ""}`}
                            placeholder="Confirm new password"
                        />
                    </div>
                    {formData.confirmPassword && !passwordsMatch && (
                        <p className="text-xs text-red-500 flex items-center gap-1 mt-1">
                            <XCircle className="h-3 w-3" /> Passwords don't match
                        </p>
                    )}
                    {formData.confirmPassword && passwordsMatch && (
                        <p className="text-xs text-green-500 flex items-center gap-1 mt-1">
                            <CheckCircle2 className="h-3 w-3" /> Passwords match
                        </p>
                    )}
                </div>

                <Button
                    type="submit"
                    disabled={isLoading || !token || passwordStrength < 60 || !passwordsMatch}
                    className="btn-primary w-full"
                >
                    {isLoading ? (
                        <>
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            Resetting Password...
                        </>
                    ) : (
                        "Reset Password"
                    )}
                </Button>
            </form>
        </>
    )
}

function RequirementItem({ met, text }: { met: boolean; text: string }) {
    return (
        <div className={`flex items-center gap-1.5 text-[10px] sm:text-xs transition-colors duration-300 ${met ? "text-green-500" : "text-muted-foreground"}`}>
            {met ? <CheckCircle2 className="h-3 w-3" /> : <div className="h-3 w-3 rounded-full border border-muted-foreground/30" />}
            {text}
        </div>
    )
}

export default function ResetPasswordPage() {
    return (
        <div>

            <section>
                <div>
                    <Card className="glass-card overflow-hidden">
                        <CardHeader>
                            <CardTitle>Set New Password</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <Suspense fallback={<div className="flex justify-center p-8"><Loader2 className="animate-spin" /></div>}>
                                <ResetPasswordForm />
                            </Suspense>
                        </CardContent>
                    </Card>
                </div>
            </section>

        </div>
    )
}
