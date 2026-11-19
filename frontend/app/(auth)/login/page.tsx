// page.tsx
"use client"
import { API_URL } from "@/lib/config"

import type React from "react"

import { useState, useEffect, useRef } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { AuthHeading } from "@/components/auth/AuthShell"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Mic, Mail, Lock, Eye, EyeOff, Loader2, CheckCircle2, XCircle, Info, AlertCircle, Smartphone, Key, Shield } from "lucide-react"
import { authService } from "@/lib/auth"
import { toast } from "sonner"
import { useSignIn, useUser } from "@clerk/nextjs"

export default function LoginPage() {
  const [formData, setFormData] = useState({
    email: "",
    password: "",
  })
  const [showPassword, setShowPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState("")

  // Validation states
  const [emailValid, setEmailValid] = useState(false)
  const [emailErrorMsg, setEmailErrorMsg] = useState("")

  // 2FA States
  const [isPinRequired, setIsPinRequired] = useState(false)
  const [pinDigits, setPinDigits] = useState<string[]>(["", "", "", "", "", ""])
  const [isPinLoading, setIsPinLoading] = useState(false)
  const pinRefs = useRef<(HTMLInputElement | null)[]>([])
  // Live backend verification states
  const [emailVerified, setEmailVerified] = useState<boolean | null>(null) // null=unchecked, true=exists, false=not found
  const [passwordVerified, setPasswordVerified] = useState<boolean | null>(null) // null=unchecked, true=correct, false=incorrect
  const [isVerifying, setIsVerifying] = useState(false)
  const [accountVerified, setAccountVerified] = useState<boolean | null>(null)
  const [isPinEmailSent, setIsPinEmailSent] = useState(false)

  const router = useRouter()
  const { signIn, isLoaded: isClerkLoaded } = useSignIn()
  const { isLoaded: isUserLoaded, isSignedIn: isClerkSignedIn } = useUser()
  const [isGoogleLoading, setIsGoogleLoading] = useState(false)

  const handleGoogleSignIn = async () => {
    if (!isClerkLoaded) return
    setIsGoogleLoading(true)
    try {
      await signIn.authenticateWithRedirect({
        strategy: "oauth_google",
        redirectUrl: "/sso-callback",
        redirectUrlComplete: "/dashboard",
      })
    } catch (err: any) {
      console.error("Google sign in error:", err)
      toast.error(err?.errors?.[0]?.message || "Failed to initiate Google Sign In")
      setIsGoogleLoading(false)
    }
  }

  // Redirect if already authenticated
  useEffect(() => {
    if (authService.isAuthenticated() || (isUserLoaded && isClerkSignedIn)) {
      router.replace("/dashboard")
    }
  }, [router, isUserLoaded, isClerkSignedIn])

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
    const isValidFormat = validateEmail(formData.email)
    setEmailValid(isValidFormat)

    // Reset verification states when input changes
    if (!isValidFormat) {
      setEmailVerified(null)
      setPasswordVerified(null)
      return
    }

    const verifyCredentials = async () => {
      setIsVerifying(true)
      try {
        const response = await fetch(`${API_URL}/api/auth/verify-credentials`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            email: formData.email,
            password: formData.password || undefined // Only send password if exists
          }),
        })

        if (response.ok) {
          const data = await response.json()

          // Verify Email
          if (data.email_exists) {
            setEmailVerified(true)
            setAccountVerified(data.is_verified)
            // The password is checked when they press Log in, never while typing.
            setPasswordVerified(null)
          } else {
            setEmailVerified(false)
            setAccountVerified(null)
            setPasswordVerified(null)
          }
        }
      } catch (err) {
        console.error("Verification failed", err)
      } finally {
        setIsVerifying(false)
      }
    }

    // Debounce verification
    const timer = setTimeout(() => {
      if (isValidFormat) {
        verifyCredentials()
      }
    }, 500) // 500ms debounce

    return () => clearTimeout(timer)

  }, [formData.email, formData.password])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData((prev) => ({
      ...prev,
      [e.target.name]: e.target.value,
    }))
    setError("")
    // Reset specific states immediately on typing
    if (e.target.name === 'password') setPasswordVerified(null)
    if (e.target.name === 'email') setEmailVerified(null)
  }

  const handleVerifyAccount = async () => {
    setIsLoading(true)
    try {
      // Trigger OTP resend
      await fetch(`${API_URL}/api/auth/resend-otp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: formData.email }),
      });
      router.push(`/otp?email=${encodeURIComponent(formData.email)}`)
    } catch (err) {
      setError("Failed to trigger verification. Please try again.")
    } finally {
      setIsLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    // Check the format right now: the emailValid flag updates a moment after typing,
    // so pasting both fields and pressing Enter used to do nothing at all.
    if (!validateEmail(formData.email)) {
      setEmailValid(false)
      setError("Please enter a valid email address")
      return
    }

    setIsLoading(true)
    setError("")

    try {
      const response = await fetch(`${API_URL}/api/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      })

      const data = await response.json()

      if (response.ok) {
        if (data.status === "2fa_required") {
          setIsPinRequired(true)
          return
        }
        localStorage.setItem("token", data.access_token)
        localStorage.setItem("user", JSON.stringify(data.user))
        window.dispatchEvent(new CustomEvent("auth-changed", { detail: data.user }))
        router.replace("/dashboard")

      } else {
        if (data.code === "not_verified" || data.error === "Account not verified") {
          setError("Account not verified")
        } else {
          setError(data.error || "Login failed")
        }
      }
    } catch (err) {
      setError("Network error. Please check backend.")
    } finally {
      setIsLoading(false)
    }
  }

  const handlePinSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const pin = pinDigits.join("")

    if (pin.length !== 6) {
      setError("Please fill all 6 digits of your security PIN")
      return
    }

    setIsPinLoading(true)
    setError("")

    try {
      const result = await authService.loginWith2fa(formData.email, formData.password, pin)
      if (result.success) {
        toast.success("Identity verified. Welcome back!")
        window.dispatchEvent(new CustomEvent("auth-changed", { detail: authService.getCurrentUser() }))
        router.replace("/dashboard")

      } else {
        setError(result.error || "Incorrect 2FA PIN. Please try again.")
        // Reset PIN entry on failure
        setPinDigits(["", "", "", "", "", ""])
        pinRefs.current[0]?.focus()
      }
    } catch (err) {
      setError("An unexpected error occurred. Please try again.")
    } finally {
      setIsPinLoading(false)
    }
  }

  return (
    <div>

      <section>
        <div>
          <AuthHeading title="Welcome back" description="Log in to your OmniMeetX account." />

          <Card className="gap-0 rounded-none border-0 bg-transparent py-0 shadow-none">
            <CardContent className="px-0">
              {/* Google OAuth Button */}
              <div className="mb-6">
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleGoogleSignIn}
                  disabled={isGoogleLoading || !isClerkLoaded}
                  className="w-full py-5 bg-white/5 border-line hover:bg-white/10 text-white font-medium flex items-center justify-center gap-3 transition-all duration-300 group hover:border-primary/40 shadow-sm"
                >
                  {isGoogleLoading ? (
                    <Loader2 className="w-5 h-5 animate-spin text-primary" />
                  ) : (
                    <svg className="w-5 h-5 group-hover:scale-110 transition-transform duration-300" viewBox="0 0 24 24">
                      <path
                        fill="#4285F4"
                        d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17z"
                      />
                      <path
                        fill="#34A853"
                        d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.33 24 12 24z"
                      />
                      <path
                        fill="#FBBC05"
                        d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.25C.45 8.18 0 9.98 0 12s.45 3.82 1.25 5.42l4.03-3.15z"
                      />
                      <path
                        fill="#EA4335"
                        d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.33 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98z"
                      />
                    </svg>
                  )}
                  <span>Continue with Google</span>
                </Button>

                <div className="relative my-6 text-center">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-line"></div>
                  </div>
                  <span className="label-mono relative bg-canvas px-4">
                    Or use your email
                  </span>
                </div>
              </div>

              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="email"
                      name="email"
                      type="email"
                      required
                      value={formData.email}
                      onChange={handleChange}
                      className={`glass pl-10 pr-10 
                        ${emailVerified === false ? "border-red-500/50" : ""} 
                        ${emailVerified === true ? "border-green-500/50" : ""}
                      `}
                      placeholder="Enter your email"
                    />
                    {formData.email && (
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
                  {formData.email && !emailValid && emailErrorMsg && (
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

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="password">Password</Label>
                    <Link
                      href="/forgot-password"
                      className="text-sm font-medium text-primary hover:text-accent smooth-transition underline-offset-4 hover:underline"
                    >
                      Forgot password?
                    </Link>
                  </div>
                  <div className="relative">
                    <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="password"
                      name="password"
                      type={showPassword ? "text" : "password"}
                      required
                      value={formData.password}
                      onChange={handleChange}
                      className={`glass pl-10 pr-10 
                        ${passwordVerified === false ? "border-red-500/50" : ""}
                        ${passwordVerified === true ? "border-green-500/50" : ""}
                      `}
                      placeholder="Enter your password"
                    />
                    <div className="absolute right-10 top-3">
                      {passwordVerified === true && <CheckCircle2 className="h-4 w-4 text-green-500" />}
                      {passwordVerified === false && <XCircle className="h-4 w-4 text-red-500" />}
                    </div>
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
                  {passwordVerified === false && (
                    <p className="text-xs text-red-500 flex items-center gap-1 mt-1 animate-in fade-in slide-in-from-top-1">
                      <XCircle className="h-3 w-3" /> Incorrect password
                    </p>
                  )}
                  {passwordVerified === true && (
                    <p className="text-xs text-green-500 flex items-center gap-1 mt-1 animate-in fade-in slide-in-from-top-1">
                      <CheckCircle2 className="h-3 w-3" /> Password correct
                    </p>
                  )}
                </div>

                <Button
                  type="submit"
                  disabled={isLoading || !formData.email.trim() || !formData.password}
                  className="btn-primary w-full"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Logging in...
                    </>
                  ) : (
                    "Log in"
                  )}
                </Button>
              </form>

              {error && (
                <div className="mt-6 space-y-4">
                  <Alert className="border-destructive/50 bg-destructive/10">
                    <AlertDescription className="text-destructive flex items-center gap-2">
                      <AlertCircle className="h-4 w-4" />
                      {error}
                    </AlertDescription>
                  </Alert>

                  {error === "Account not verified" && (
                    <div className="glass p-4 rounded-xl border border-primary/20 space-y-3 animate-in fade-in slide-in-from-top-2">
                      <div className="flex items-center gap-2 text-primary">
                        <Info className="h-4 w-4" />
                        <span className="text-sm font-medium">Verification Required</span>
                      </div>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground p-2 bg-white/5 rounded-lg border border-line">
                        <Mail className="h-3 w-3" />
                        <span>We'll email a 6-digit code to {formData.email}</span>
                      </div>
                      <Button
                        type="button"
                        onClick={handleVerifyAccount}
                        className="btn-primary w-full text-xs py-1 h-9"
                      >
                        Send Verification Code
                      </Button>
                    </div>
                  )}
                </div>
              )}

              <div className="mt-6 text-center">
                <p className="text-muted-foreground">
                  Don't have an account?{" "}
                  <Link href="/signup" className="text-primary hover:text-accent smooth-transition">
                    Sign up
                  </Link>
                </p>
              </div>
            </CardContent>
          </Card>

          {/* 2FA PIN Modal Overlay */}

          {isPinRequired && (
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-300">
              <div className="w-full max-w-sm bg-panel rounded-2xl border border-line p-6 shadow-xl animate-in zoom-in-95 duration-200 relative overflow-hidden">
                {/* Decorative Gradient Orbs */}
                <div className="absolute top-0 right-0 w-40 h-40 bg-primary/5 rounded-full blur-[60px] -mr-20 -mt-20"></div>
                <div className="absolute bottom-0 left-0 w-40 h-40 bg-primary/5 rounded-full blur-[60px] -ml-20 -mb-20"></div>

                <div className="text-center mb-6 relative z-10">
                  <div className="w-14 h-14 bg-primary/10 rounded-xl flex items-center justify-center border border-primary/20 mx-auto mb-4 shadow-inner">
                    <Shield className="w-7 h-7 text-primary" />
                  </div>
                  <h3 className="text-xl font-bold text-white mb-2">Identity Check</h3>
                  <p className="text-gray-400 text-sm">
                    {isPinEmailSent ? "Check your email for the reset link" : "Enter your 6-digit security PIN"}
                  </p>
                </div>

                {isPinEmailSent ? (
                  <div className="relative z-10 text-center space-y-6">
                    <div className="bg-green-500/10 border border-green-500/20 rounded-xl p-4 text-green-400 text-sm">
                      We've sent a secure PIN reset link to <br />
                      <span className="font-bold text-white">{formData.email}</span>
                    </div>
                    <p className="text-xs text-gray-500 italic">
                      Please check your inbox and spam folder. The link will expire in 1 hour.
                    </p>
                    <Button
                      type="button"
                      onClick={() => {
                        setIsPinRequired(false)
                        setIsPinEmailSent(false)
                      }}
                      className="w-full h-11 bg-white/5 hover:bg-white/10 text-white rounded-lg border border-line"
                    >
                      Back to Sign In
                    </Button>
                  </div>
                ) : (
                  <>
                    {error && (
                      <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 rounded-lg flex items-center justify-center gap-2 text-red-400 text-sm font-medium animate-in shake duration-200 relative z-10">
                        <AlertCircle className="w-4 h-4 flex-shrink-0" />
                        <span>{error}</span>
                      </div>
                    )}

                    <form onSubmit={handlePinSubmit} className="relative z-10">
                      <div className="space-y-4 mb-6">
                        <div className="flex items-center justify-center gap-1">
                          <span className="text-xs font-medium uppercase tracking-wider text-primary">SECURITY PIN</span>
                        </div>

                        <div className="flex justify-center gap-2">
                          {pinDigits.map((digit, idx) => (
                            <input
                              key={`pin-${idx}`}
                              ref={(el) => { pinRefs.current[idx] = el; }}
                              type="password"
                              inputMode="numeric"
                              maxLength={1}
                              value={digit}
                              autoFocus={idx === 0}
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
                                    pinRefs.current[idx - 1]?.focus()
                                  } else {
                                    const newDigits = [...pinDigits]
                                    newDigits[idx] = ""
                                    setPinDigits(newDigits)
                                  }
                                }
                              }}
                              className="w-10 h-12 bg-white/[0.03] border border-white/15 rounded-lg text-center text-xl font-semibold text-white focus:border-primary focus:bg-primary/10 focus:ring-2 focus:ring-primary/30 transition-all outline-none"
                            />
                          ))}
                        </div>
                        <div className="text-center">
                          <button
                            type="button"
                            onClick={async () => {
                              const result = await authService.forgotPin(formData.email)
                              if (result.success) {
                                toast.success("A PIN reset link has been sent to your email.")
                                setIsPinEmailSent(true)
                              } else {
                                toast.error(result.error || "Failed to send reset link")
                              }
                            }}
                            className="text-xs text-primary hover:text-accent hover:underline transition-all"
                          >
                            Forgot PIN?
                          </button>
                        </div>
                      </div>

                      <div className="flex gap-3">
                        <Button
                          type="submit"
                          disabled={isPinLoading || pinDigits.some(d => !d)}
                          className="flex-1 h-11 bg-primary hover:bg-primary/90 text-white rounded-lg text-sm font-semibold shadow-md transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                        >
                          {isPinLoading ? (
                            <>
                              <Loader2 className="w-4 h-4 animate-spin" />
                              Verifying...
                            </>
                          ) : (
                            <>
                              <CheckCircle2 className="w-4 h-4" />
                              Verify
                            </>
                          )}
                        </Button>

                        <Button
                          type="button"
                          variant="ghost"
                          onClick={() => {
                            setIsPinRequired(false)
                            setPinDigits(["", "", "", "", "", ""])
                            setError("")
                            setIsPinEmailSent(false)
                          }}
                          className="flex-1 h-11 rounded-lg text-gray-400 hover:text-white hover:bg-white/5 transition-all text-sm font-medium border border-line"
                        >
                          Cancel
                        </Button>
                      </div>
                    </form>
                  </>
                )}
              </div>
            </div>
          )}
        </div>
      </section>

    </div>
  )
}