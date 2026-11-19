// page.tsx (Modified Signup page)
"use client"
import { API_URL } from "@/lib/config"

import type React from "react"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { AuthHeading } from "@/components/auth/AuthShell"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Mic, Mail, Lock, User, Eye, EyeOff, Loader2, CheckCircle2, XCircle, AlertCircle, Info } from "lucide-react"
import { Progress } from "@/components/ui/progress"
import { authService } from "@/lib/auth"
// Import Checkbox from UI (assuming it exists or using standard input)
import { Checkbox } from "@/components/ui/checkbox"
import { useSignUp, useUser } from "@clerk/nextjs"
import { toast } from "sonner"

export default function SignupPage() {
  const [formData, setFormData] = useState({
    full_name: "",
    email: "",
    password: "",
    confirmPassword: "",
  })
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState("")

  // Validation states
  const [emailValid, setEmailValid] = useState(false)
  const [emailErrorMsg, setEmailErrorMsg] = useState("")
  const [emailTaken, setEmailTaken] = useState<boolean | null>(null) // null=unchecked
  const [isVerifyingEmail, setIsVerifyingEmail] = useState(false)

  const [passwordStrength, setPasswordStrength] = useState(0)
  const [passwordCriteria, setPasswordCriteria] = useState({
    length: false,
    uppercase: false,
    lowercase: false,
    number: false,
    special: false,
  })
  const [passwordsMatch, setPasswordsMatch] = useState(true)
  const [isPasswordFocused, setIsPasswordFocused] = useState(false)

  // Terms state
  const [acceptedTerms, setAcceptedTerms] = useState(false)
  const [showTermsError, setShowTermsError] = useState(false)

  const router = useRouter()
  const { signUp, isLoaded: isClerkLoaded } = useSignUp()
  const { isLoaded: isUserLoaded, isSignedIn: isClerkSignedIn } = useUser()
  const [isGoogleLoading, setIsGoogleLoading] = useState(false)

  const handleGoogleSignUp = async () => {
    if (!isClerkLoaded) return
    setIsGoogleLoading(true)
    try {
      await signUp.authenticateWithRedirect({
        strategy: "oauth_google",
        redirectUrl: "/sso-callback",
        redirectUrlComplete: "/dashboard",
      })
    } catch (err: any) {
      console.error("Google sign up error:", err)
      toast.error(err?.errors?.[0]?.message || "Failed to initiate Google Sign Up")
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
    const isValidFormat = validateEmail(formData.email)
    setEmailValid(isValidFormat)

    // Reset taken state if invalid
    if (!isValidFormat) {
      setEmailTaken(null)
      return
    }

    // Debounce check for availability
    const timer = setTimeout(async () => {
      setIsVerifyingEmail(true)
      try {
        const response = await fetch(`${API_URL}/api/auth/verify-credentials`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email: formData.email }),
        })
        if (response.ok) {
          const data = await response.json()
          setEmailTaken(data.email_exists)
        }
      } catch (error) {
        console.error(error)
      } finally {
        setIsVerifyingEmail(false)
      }
    }, 500)

    return () => clearTimeout(timer)
  }, [formData.email])

  useEffect(() => {
    checkPasswordStrength(formData.password)
    if (formData.confirmPassword) {
      setPasswordsMatch(formData.password === formData.confirmPassword)
    }
  }, [formData.password, formData.confirmPassword])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;

    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }))
    setError("")
    if (name === 'email') setEmailTaken(null) // Reset checks
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

    if (!emailValid) {
      setError("Please enter a valid email address")
      return
    }

    if (emailTaken) {
      setError("Email is already registered. Please sign in instead.")
      return
    }

    if (passwordStrength < 60) {
      setError("Please choose a stronger password")
      return
    }

    if (formData.password !== formData.confirmPassword) {
      setError("Passwords do not match")
      return
    }

    if (!acceptedTerms) {
      setError("Please accept the Terms and Conditions to continue")
      setShowTermsError(true)
      // Scroll to terms checkbox
      const termsEl = document.getElementById('terms-container')
      termsEl?.scrollIntoView({ behavior: 'smooth', block: 'center' })
      return
    }

    setIsLoading(true)
    setError("")

    try {
      const result = await authService.signup(
        formData.full_name,
        formData.email,
        formData.password
      )

      if (result.success) {
        router.push(`/otp?email=${encodeURIComponent(formData.email)}`)
      } else {
        setError(result.error || "Registration failed")
      }
    } catch (err) {
      setError("Network error. Please check if the backend server is running.")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div>

      <section>
        <div>
          <AuthHeading title="Create your account" description="60 free minutes every month. No card needed." />

          <Card className="gap-0 rounded-none border-0 bg-transparent py-0 shadow-none">
            <CardContent className="px-0">
              {/* Google OAuth Button */}
              <div className="mb-6">
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleGoogleSignUp}
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
                  <span>Sign up with Google</span>
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
                  <Label htmlFor="full_name">Full Name</Label>
                  <div className="relative">
                    <User className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="full_name"
                      name="full_name"
                      type="text"
                      required
                      value={formData.full_name}
                      onChange={handleChange}
                      className="glass pl-10"
                      placeholder="Enter your full name"
                    />
                  </div>
                </div>

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
                        ${formData.email && !emailValid || emailTaken ? "border-red-500/50" : ""} 
                        ${formData.email && emailValid && emailTaken === false ? "border-green-500/50" : ""}
                      `}
                      placeholder="Enter your email"
                    />
                    {formData.email && (
                      <div className="absolute right-3 top-3">
                        {isVerifyingEmail ? (
                          <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                        ) : emailTaken ? (
                          <XCircle className="h-4 w-4 text-red-500" />
                        ) : emailValid ? (
                          <CheckCircle2 className="h-4 w-4 text-green-500" />
                        ) : (
                          <XCircle className="h-4 w-4 text-red-500" />
                        )}
                      </div>
                    )}
                  </div>
                  {formData.email && !emailValid && emailErrorMsg && (
                    <p className="text-xs text-red-500 flex items-center gap-1 mt-1 animate-in fade-in slide-in-from-top-1">
                      <Info className="h-3 w-3" /> {emailErrorMsg}
                    </p>
                  )}
                  {emailTaken && (
                    <p className="text-xs text-red-500 flex items-center gap-1 mt-1 animate-in fade-in slide-in-from-top-1">
                      <XCircle className="h-3 w-3" /> Email already registered
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="password">Password</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="password"
                      name="password"
                      type={showPassword ? "text" : "password"}
                      required
                      value={formData.password}
                      onChange={handleChange}
                      onFocus={() => setIsPasswordFocused(true)}
                      className="glass pl-10 pr-10"
                      placeholder="Create a strong password"
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
                  {formData.password && (
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
                      type={showConfirmPassword ? "text" : "password"}
                      required
                      value={formData.confirmPassword}
                      onChange={handleChange}
                      className={`glass pl-10 pr-10 ${formData.confirmPassword && !passwordsMatch ? "border-red-500/50" : formData.confirmPassword && passwordsMatch ? "border-green-500/50" : ""}`}
                      placeholder="Confirm your password"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    >
                      {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </Button>
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

                <div
                  id="terms-container"
                  className={`space-y-3 p-3 rounded-lg transition-all duration-300 ${showTermsError ? "bg-destructive/10 border border-destructive/50 animate-in fade-in zoom-in-95" : "bg-transparent"}`}
                >
                  {showTermsError && (
                    <div className="flex items-center gap-2 text-destructive font-bold text-sm mb-2">
                      <AlertCircle className="h-4 w-4" />
                      Attention: Please click the box below to accept terms
                    </div>
                  )}
                  <div className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id="terms"
                      checked={acceptedTerms}
                      onChange={(e) => {
                        setAcceptedTerms(e.target.checked)
                        if (e.target.checked) setShowTermsError(false)
                      }}
                      className={`h-5 w-5 rounded border-gray-300 text-primary focus:ring-primary cursor-pointer transition-transform ${showTermsError ? "scale-110 ring-2 ring-destructive" : ""}`}
                    />
                    <label
                      htmlFor="terms"
                      className="text-sm font-medium leading-none cursor-pointer text-muted-foreground"
                    >
                      I accept the <Link href="/terms" className="text-primary hover:underline">Terms and Conditions</Link>
                    </label>
                  </div>
                </div>

                <Button
                  type="submit"
                  disabled={isLoading || !emailValid || emailTaken === true || passwordStrength < 60 || !passwordsMatch}
                  className="btn-primary w-full"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Creating Account...
                    </>
                  ) : (
                    "Create Account"
                  )}
                </Button>
              </form>

              <div className="mt-6 text-center">
                <p className="text-muted-foreground">
                  Already have an account?{" "}
                  <Link href="/login" className="text-primary hover:text-accent smooth-transition">
                    Log in
                  </Link>
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>

    </div>
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