// otp/VerifyOtpContent.tsx
"use client";
import { API_URL } from "@/lib/config"

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { REGEXP_ONLY_DIGITS } from "input-otp";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { Label } from "@/components/ui/label";
import { Loader2 } from "lucide-react";
import { AuthHeading } from "@/components/auth/AuthShell";
import { authService } from "@/lib/auth";

export default function VerifyOtpContent() {
  const [code, setCode] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [email, setEmail] = useState("");
  const [timeLeft, setTimeLeft] = useState(300); // 5 minutes in seconds
  const [canResend, setCanResend] = useState(false);

  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const emailParam = searchParams.get("email");
    if (emailParam) {
      setEmail(decodeURIComponent(emailParam));
    } else {
      router.push("/signup");
    }
  }, [searchParams, router]);

  useEffect(() => {
    if (timeLeft <= 0) {
      setCanResend(true);
      return;
    }

    const timer = setInterval(() => {
      setTimeLeft((prev) => prev - 1);
    }, 1000);

    return () => clearInterval(timer);
  }, [timeLeft]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const handleCodeChange = (value: string) => {
    setCode(value);
    setError("");
    setSuccess("");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (code.length !== 6) return;
    setIsLoading(true);
    setError("");
    setSuccess("");

    try {
      const result = await authService.verifyOtp(email, code);

      if (result.success) {
        setSuccess("You're verified. Taking you to your dashboard...");
        setTimeout(() => router.push("/dashboard"), 1200);
      } else {
        setError(result.error || "Verification failed");
        setCode("");
      }
    } catch (err) {
      setError("Network error. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleResendOtp = async () => {
    setIsLoading(true);
    setError("");
    setSuccess("");
    try {
      const response = await fetch(`${API_URL}/api/auth/resend-otp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await response.json();
      if (response.ok) {
        setSuccess("New code sent. Check your email.");
        setTimeLeft(300); // Reset timer to 5 minutes
        setCanResend(false);
      } else {
        setError(data.error || "Failed to resend the code");
      }
    } catch (err) {
      setError("Network error. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <AuthHeading title="Check your email" description={<>Enter the 6-digit code we sent to <span className="text-bone">{email || "your email"}</span>.</>} />

      <div aria-live="polite">
        {error && (
          <Alert className="mb-6 border-destructive/50 bg-destructive/10">
            <AlertDescription className="text-destructive">{error}</AlertDescription>
          </Alert>
        )}
        {success && (
          <Alert className="mb-6 border-brand/40 bg-brand/10">
            <AlertDescription className="text-brand-light">{success}</AlertDescription>
          </Alert>
        )}
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="space-y-3">
          <Label htmlFor="emailOtp">Verification code</Label>
          <InputOTP
            id="emailOtp"
            data-testid="otp-input"
            maxLength={6}
            pattern={REGEXP_ONLY_DIGITS}
            value={code}
            onChange={handleCodeChange}
            inputMode="numeric"
            autoComplete="one-time-code"
            autoFocus
            containerClassName="w-full"
          >
            <InputOTPGroup className="grid w-full grid-cols-6 gap-2">
              {[0, 1, 2, 3, 4, 5].map((index) => (
                <InputOTPSlot
                  key={index}
                  index={index}
                  className="h-14 w-full rounded-[12px] border border-line-strong bg-white/[0.03] font-mono text-xl first:rounded-[12px] first:border last:rounded-[12px] data-[active=true]:border-brand-light data-[active=true]:ring-0"
                />
              ))}
            </InputOTPGroup>
          </InputOTP>
        </div>

        <Button type="submit" disabled={isLoading || code.length !== 6} className="btn-primary w-full" data-testid="otp-submit">
          {isLoading ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Checking...
            </>
          ) : (
            "Verify"
          )}
        </Button>
      </form>

      <p className="mt-6 text-center text-sm text-bone-muted">
        Didn't get it?{" "}
        <Button variant="link" className="h-auto p-0" onClick={handleResendOtp} disabled={isLoading || !canResend}>
          {canResend ? "Send a new code" : `Send again in ${formatTime(timeLeft)}`}
        </Button>
      </p>
    </>
  );
}
