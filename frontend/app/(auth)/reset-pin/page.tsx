"use client"

import { useState, useRef, useEffect, Suspense } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Shield, Lock, CheckCircle2, Loader2, AlertCircle, ArrowLeft, Key } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { authService } from "@/lib/auth"
import { toast } from "sonner"

function ResetPinForm() {
    const router = useRouter()
    const searchParams = useSearchParams()
    const token = searchParams.get("token")

    const [pinDigits, setPinDigits] = useState(["", "", "", "", "", ""])
    const [confirmPinDigits, setConfirmPinDigits] = useState(["", "", "", "", "", ""])
    const [isLoading, setIsLoading] = useState(false)
    const [error, setError] = useState("")
    const [success, setSuccess] = useState(false)

    const pinRefs = useRef<(HTMLInputElement | null)[]>([])
    const confirmPinRefs = useRef<(HTMLInputElement | null)[]>([])

    useEffect(() => {
        if (!token) {
            setError("Invalid or missing reset token. Please request a new PIN reset email.")
        }
    }, [token])

    const handlePinChange = (idx: number, val: string, isConfirm: boolean) => {
        const cleanVal = val.replace(/\D/g, "").slice(0, 1)
        if (cleanVal) {
            if (isConfirm) {
                const newDigits = [...confirmPinDigits]
                newDigits[idx] = cleanVal
                setConfirmPinDigits(newDigits)
                if (idx < 5) confirmPinRefs.current[idx + 1]?.focus()
            } else {
                const newDigits = [...pinDigits]
                newDigits[idx] = cleanVal
                setPinDigits(newDigits)
                if (idx < 5) pinRefs.current[idx + 1]?.focus()
            }
        }
    }

    const handleKeyDown = (idx: number, e: React.KeyboardEvent, isConfirm: boolean) => {
        if (e.key === "Backspace") {
            if (isConfirm) {
                if (!confirmPinDigits[idx] && idx > 0) {
                    confirmPinRefs.current[idx - 1]?.focus()
                } else {
                    const newDigits = [...confirmPinDigits]
                    newDigits[idx] = ""
                    setConfirmPinDigits(newDigits)
                }
            } else {
                if (!pinDigits[idx] && idx > 0) {
                    pinRefs.current[idx - 1]?.focus()
                } else {
                    const newDigits = [...pinDigits]
                    newDigits[idx] = ""
                    setPinDigits(newDigits)
                }
            }
        }
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        const pin = pinDigits.join("")
        const confirm = confirmPinDigits.join("")

        if (pin.length !== 6 || confirm.length !== 6) {
            setError("Please fill all 6 digits for both PIN and confirmation.")
            return
        }

        if (pin !== confirm) {
            setError("PINs do not match. Please ensure both match perfectly.")
            return
        }

        if (!token) return

        setIsLoading(true)
        setError("")

        try {
            const result = await authService.resetPin(token, pin)
            if (result.success) {
                setSuccess(true)
                toast.success("Security PIN successfully reset!")
                setTimeout(() => router.push("/login"), 3000)
            } else {
                setError(result.error || "Failed to reset PIN. The token may be expired.")
            }
        } catch (err) {
            setError("A network error occurred. Please try again.")
        } finally {
            setIsLoading(false)
        }
    }

    if (success) {
        return (
            <Card className="glass-card animate-in fade-in zoom-in-95">
                <CardContent className="pt-10 pb-10 text-center">
                    <div className="w-16 h-16 bg-green-500/10 rounded-full flex items-center justify-center mx-auto mb-6 border border-green-500/20">
                        <CheckCircle2 className="w-8 h-8 text-green-500" />
                    </div>
                    <h2 className="text-2xl font-bold mb-4">PIN Reset Complete</h2>
                    <p className="text-gray-400 mb-8">
                        Your security PIN has been updated successfully. 2FA has been enabled for your account.
                        You will be redirected to the login page shortly.
                    </p>
                    <Button
                        onClick={() => router.push("/login")}
                        className="w-full bg-primary hover:bg-primary/90"
                    >
                        Go to Login Now
                    </Button>
                </CardContent>
            </Card>
        )
    }

    return (
        <Card className="glass-card overflow-hidden transition-all duration-300">
            <CardHeader className="text-center pb-2">
                <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center border border-primary/20 mx-auto mb-4">
                    <Key className="w-6 h-6 text-primary" />
                </div>
                <CardTitle className="text-2xl">Reset Security PIN</CardTitle>
                <p className="text-sm text-gray-400">Set a new 6-digit PIN for your account</p>
            </CardHeader>
            <CardContent>
                {error && (
                    <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-xl flex items-start gap-3 text-red-400 animate-in shake duration-300">
                        <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
                        <span className="text-sm">{error}</span>
                    </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-8">
                    <div className="space-y-4">
                        <label className="text-xs font-semibold uppercase tracking-widest text-gray-500 flex items-center gap-2">
                            <Lock className="w-3 h-3" /> New Security PIN
                        </label>
                        <div className="flex justify-between gap-2">
                            {pinDigits.map((digit, idx) => (
                                <input
                                    key={`new-pin-${idx}`}
                                    ref={(el) => { pinRefs.current[idx] = el; }}
                                    type="password"
                                    inputMode="numeric"
                                    maxLength={1}
                                    value={digit}
                                    onChange={(e) => handlePinChange(idx, e.target.value, false)}
                                    onKeyDown={(e) => handleKeyDown(idx, e, false)}
                                    className="w-full h-14 bg-white/[0.03] border border-line rounded-xl text-center text-2xl font-bold text-white focus:border-primary focus:bg-primary/5 focus:ring-4 focus:ring-primary/20 transition-all outline-none"
                                />
                            ))}
                        </div>
                    </div>

                    <div className="space-y-4">
                        <label className="text-xs font-semibold uppercase tracking-widest text-gray-500 flex items-center gap-2">
                            <Shield className="w-3 h-3" /> Confirm New PIN
                        </label>
                        <div className="flex justify-between gap-2">
                            {confirmPinDigits.map((digit, idx) => (
                                <input
                                    key={`confirm-pin-${idx}`}
                                    ref={(el) => { confirmPinRefs.current[idx] = el; }}
                                    type="password"
                                    inputMode="numeric"
                                    maxLength={1}
                                    value={digit}
                                    onChange={(e) => handlePinChange(idx, e.target.value, true)}
                                    onKeyDown={(e) => handleKeyDown(idx, e, true)}
                                    className="w-full h-14 bg-white/[0.03] border border-line rounded-xl text-center text-2xl font-bold text-white focus:border-accent focus:bg-accent/5 focus:ring-4 focus:ring-accent/20 transition-all outline-none"
                                />
                            ))}
                        </div>
                    </div>

                    <Button
                        type="submit"
                        disabled={isLoading || !token || pinDigits.some(d => !d) || confirmPinDigits.some(d => !d)}
                        className="w-full h-12 bg-primary hover:bg-primary/90 text-white font-bold shadow-lg shadow-primary/20 transition-all active:scale-95"
                    >
                        {isLoading ? (
                            <>
                                <Loader2 className="w-5 h-5 mr-3 animate-spin" />
                                Updating PIN...
                            </>
                        ) : (
                            "Reset Security PIN"
                        )}
                    </Button>

                    <Button
                        type="button"
                        variant="ghost"
                        onClick={() => router.push("/login")}
                        className="w-full text-gray-500 hover:text-white"
                    >
                        <ArrowLeft className="w-4 h-4 mr-2" /> Back to Login
                    </Button>
                </form>
            </CardContent>
        </Card>
    )
}

export default function ResetPinPage() {
    return (
        <div className="bg-panel text-white flex flex-col">
            <main className="flex-grow flex items-center justify-center p-4 py-0">
                <div className="max-w-md w-full relative">

                    <Suspense fallback={
                        <div className="flex flex-col items-center justify-center p-12 bg-white/5 rounded-3xl border border-line">
                            <Loader2 className="w-8 h-8 text-primary animate-spin mb-4" />
                            <p className="text-gray-400">Loading secure reset form...</p>
                        </div>
                    }>
                        <ResetPinForm />
                    </Suspense>
                </div>
            </main>
        </div>
    )
}
