"use client"
import { API_URL } from "@/lib/config"

import type React from "react"

import { useState } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { AuthHeading } from "@/components/auth/AuthShell"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Mail, ArrowLeft, Loader2, CheckCircle2, AlertCircle, Info, XCircle } from "lucide-react"
import { useEffect } from "react"

export default function ForgotPasswordPage() {
    const [email, setEmail] = useState("")
    const [isLoading, setIsLoading] = useState(false)
    const [isSubmitted, setIsSubmitted] = useState(false)
    const [error, setError] = useState("")

    // Validation states
    const [emailValid, setEmailValid] = useState(false)
    const [emailErrorMsg, setEmailErrorMsg] = useState("")
    const [emailVerified, setEmailVerified] = useState<boolean | null>(null)
    const [isVerifying, setIsVerifying] = useState(false)

    const validateEmail = (email: string) => {
        if (!email) {
            setEmailErrorMsg("")
            return false
        }

        if (!email.includes("@")) {
            setEmailErrorMsg("Missing '@' symbol")
            return false
        }

        const parts = email.split("@")
        if (parts.length > 2) {
            setEmailErrorMsg("Only one '@' allowed")
            return false
        }

        const domain = parts[1]
        if (!domain) {
            setEmailErrorMsg("Missing domain after '@'")
            return false
        }

        if (!domain.includes(".")) {
            setEmailErrorMsg("Domain must include a '.' (e.g. gmail.com)")
            return false
        }

        const lastPart = domain.split(".").pop()
        if (!lastPart || lastPart.length < 2) {
            setEmailErrorMsg("Incomplete domain extension")
            return false
        }

        const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
        const isValid = re.test(email)

        if (isValid) {
            setEmailErrorMsg("")
        } else {
            setEmailErrorMsg("Invalid email format")
        }

        return isValid
    }

    // Live verification effect
    useEffect(() => {
        const isValidFormat = validateEmail(email)
        setEmailValid(isValidFormat)

        if (!isValidFormat) {
            setEmailVerified(null)
            return
        }

        const verifyEmail = async () => {
            setIsVerifying(true)
            try {
                const response = await fetch(`${API_URL}/api/auth/verify-credentials`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ email }),
                })

                if (response.ok) {
                    const data = await response.json()
                    setEmailVerified(data.email_exists)
                }
            } catch (err) {
                console.error("Verification failed", err)
            } finally {
                setIsVerifying(false)
            }
        }

        const timer = setTimeout(() => {
            if (isValidFormat) {
                verifyEmail()
            }
        }, 500)

        return () => clearTimeout(timer)
    }, [email])

    const handleEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setEmail(e.target.value)
        setError("")
        setEmailVerified(null)
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setIsLoading(true)
        setError("")

        try {
            const response = await fetch(`${API_URL}/api/auth/forgot-password`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email }),
            })

            if (response.ok) {
                setIsSubmitted(true)
            } else {
                const data = await response.json()
                setError(data.error || "Something went wrong. Please try again.")
            }
        } catch (err) {
            setError("Network error. Please check your connection.")
        } finally {
            setIsLoading(false)
        }
    }

    return (
        <div>

            <section>
                <div>
                    <Card className="gap-0 rounded-none border-0 bg-transparent py-0 shadow-none">
                        <AuthHeading title="Reset your password" description="Enter your email and we'll send you a link to set a new one." />
                        <CardContent className="px-0">
                            {isSubmitted ? (
                                <div className="text-center space-y-6 py-4 animate-in fade-in zoom-in duration-300">
                                    <div className="tile-accent w-16 h-16 rounded-full flex items-center justify-center mx-auto">
                                        <CheckCircle2 className="w-8 h-8" />
                                    </div>
                                    <div className="space-y-2">
                                        <h3 className="text-lg font-medium">Check your email</h3>
                                        <p className="text-muted-foreground text-sm">
                                            We have sent a password reset link to <strong>{email}</strong>
                                        </p>
                                    </div>
                                    <Button asChild className="w-full glass-button" variant="outline">
                                        <Link href="/login">Back to Sign In</Link>
                                    </Button>
                                </div>
                            ) : (
                                <>
                                    {error && (
                                        <Alert className="mb-6 border-destructive/50 bg-destructive/10">
                                            <AlertDescription className="text-destructive flex items-center gap-2">
                                                <AlertCircle className="h-4 w-4" />
                                                {error}
                                            </AlertDescription>
                                        </Alert>
                                    )}

                                    <form onSubmit={handleSubmit} className="space-y-6">
                                        <div className="space-y-2">
                                            <Label htmlFor="email">Email</Label>
                                            <div className="relative">
                                                <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                                                <Input
                                                    id="email"
                                                    type="email"
                                                    required
                                                    value={email}
                                                    onChange={handleEmailChange}
                                                    className={`glass pl-10 pr-10 
                                                        ${emailVerified === false ? "border-red-500/50" : ""} 
                                                        ${emailVerified === true ? "border-green-500/50" : ""}
                                                    `}
                                                    placeholder="Enter your email"
                                                />
                                                {email && (
                                                    <div className="absolute right-3 top-3">
                                                        {isVerifying ? (
                                                            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                                                        ) : emailVerified === true ? (
                                                            <CheckCircle2 className="h-4 w-4 text-green-500" />
                                                        ) : emailVerified === false ? (
                                                            <XCircle className="h-4 w-4 text-red-500" />
                                                        ) : emailValid ? (
                                                            <CheckCircle2 className="h-4 w-4 text-muted-foreground/50" />
                                                        ) : (
                                                            <XCircle className="h-4 w-4 text-red-500" />
                                                        )}
                                                    </div>
                                                )}
                                            </div>
                                            {/* Email Format Errors */}
                                            {email && !emailValid && emailErrorMsg && (
                                                <p className="text-xs text-red-500 flex items-center gap-1 mt-1 animate-in fade-in slide-in-from-top-1">
                                                    <Info className="h-3 w-3" /> {emailErrorMsg}
                                                </p>
                                            )}
                                            {/* Backend Verification Errors/Success */}
                                            {emailVerified === false && (
                                                <p className="text-xs text-red-500 flex items-center gap-1 mt-1 animate-in fade-in slide-in-from-top-1">
                                                    <XCircle className="h-3 w-3" /> Email not registered
                                                </p>
                                            )}
                                            {emailVerified === true && (
                                                <p className="text-xs text-green-500 flex items-center gap-1 mt-1 animate-in fade-in slide-in-from-top-1">
                                                    <CheckCircle2 className="h-3 w-3" /> Email found
                                                </p>
                                            )}
                                        </div>

                                        <Button
                                            type="submit"
                                            disabled={isLoading || !emailVerified}
                                            className="btn-primary w-full"
                                        >
                                            {isLoading ? (
                                                <>
                                                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                                    Sending Link...
                                                </>
                                            ) : (
                                                "Send Reset Link"
                                            )}
                                        </Button>
                                    </form>
                                </>
                            )}

                            <div className="mt-6 text-center">
                                <Link
                                    href="/login"
                                    className="text-sm text-muted-foreground hover:text-primary flex items-center justify-center gap-2 smooth-transition"
                                >
                                    <ArrowLeft className="w-4 h-4" />
                                    Back to Sign In
                                </Link>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </section>

        </div>
    )
}
