"use client";

import { AuthenticateWithRedirectCallback } from "@clerk/nextjs";
import { LogoMark } from "@/components/brand/Logo";

/**
 * Google sends people back here through Clerk. It looks exactly like the
 * "Signing you in" screen the dashboard shows next, so the two read as one step.
 */
export default function SSOCallbackCatchAllPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-canvas" role="status" aria-live="polite">
      <div className="flex flex-col items-center gap-5 text-center">
        <LogoMark size={40} />
        <span className="h-8 w-8 animate-spin rounded-full border-2 border-line-strong border-t-brand" aria-hidden="true" />
        <p className="text-sm text-bone-muted">Signing you in…</p>
      </div>
      <AuthenticateWithRedirectCallback
        signInForceRedirectUrl="/dashboard"
        signUpForceRedirectUrl="/dashboard"
        signInFallbackRedirectUrl="/dashboard"
        signUpFallbackRedirectUrl="/dashboard"
        continueSignUpUrl="/dashboard"
      />
    </div>
  );
}
