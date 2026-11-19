// otp/page.tsx
"use client";

import { Suspense } from "react";
import { Loader2 } from "lucide-react";
import VerifyOtpContent from "./VerifyOtpContent"; // We'll extract the logic

export default function VerifyOtpPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin" /></div>}>
      <VerifyOtpContent />
    </Suspense>
  );
}