import { Suspense } from 'react';
import type { Metadata, Viewport } from 'next';
import { GeistSans } from 'geist/font/sans';
import { GeistMono } from 'geist/font/mono';
import { Instrument_Serif, Noto_Naskh_Arabic } from 'next/font/google';
import { ClerkProvider } from '@clerk/nextjs';
import './globals.css';
import MotionRoot from '@/components/motion/MotionRoot';
import SmoothScroll from '@/components/motion/SmoothScroll';
import RouteProgress from '@/components/motion/RouteProgress';
import ClerkAuthSync from '@/components/auth/ClerkAuthSync';
import Toasters from '@/components/providers/Toasters';
import FeedbackButton from '@/components/feedback/FeedbackButton';
import { BRAND } from '@/lib/brand';
import { SITE_URL } from '@/lib/site';

const instrumentSerif = Instrument_Serif({
  weight: '400',
  style: 'italic',
  subsets: ['latin'],
  variable: '--font-instrument-serif',
  display: 'swap',
});

// Sample Urdu and Arabic on the marketing pages. Only downloaded when that text is on screen.
const notoNaskh = Noto_Naskh_Arabic({
  subsets: ['arabic'],
  variable: '--font-noto-naskh',
  display: 'swap',
  preload: false,
});

// Each public page sets its own canonical address (alternates.canonical); never set one here,
// or every page would inherit it and tell Google it is a copy of the home page.
export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: `${BRAND.name}: ${BRAND.tagline}`,
    template: `%s | ${BRAND.name}`,
  },
  description: BRAND.description,
  applicationName: BRAND.name,
  keywords: ['AI meeting notes', 'meeting transcription', 'Urdu transcription', 'meeting summary', 'action items', 'transcribe audio to text', BRAND.name],
  creator: BRAND.name,
  publisher: BRAND.name,
  formatDetection: { telephone: false, email: false, address: false },
  openGraph: {
    siteName: BRAND.name,
    title: `${BRAND.name}: ${BRAND.tagline}`,
    description: BRAND.description,
    type: 'website',
    locale: 'en_US',
  },
  twitter: {
    card: 'summary_large_image',
    title: `${BRAND.name}: ${BRAND.tagline}`,
    description: BRAND.description,
  },
  robots: { index: true, follow: true },
  // Paste the code from Google Search Console / Bing Webmaster Tools into these host variables.
  verification: {
    google: process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION || undefined,
    other: process.env.NEXT_PUBLIC_BING_SITE_VERIFICATION
      ? { 'msvalidate.01': process.env.NEXT_PUBLIC_BING_SITE_VERIFICATION }
      : undefined,
  },
};

export const viewport: Viewport = {
  themeColor: '#fbfbf8',
};

/* Runs before first paint so the page never flashes the wrong motion state or a repeat preloader. */
const motionBootScript = `(function(){var h=document.documentElement;try{var p=localStorage.getItem('omnimeet:animations');var r=window.matchMedia('(prefers-reduced-motion: reduce)').matches;h.dataset.motion=(p==='on'||(p!=='off'&&!r))?'on':'off';if(sessionStorage.getItem('omnimeet:intro-seen'))h.dataset.skipIntro='true';}catch(e){}})();`;

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <ClerkProvider
      signInUrl="/login"
      signUpUrl="/signup"
      signInFallbackRedirectUrl="/dashboard"
      signUpFallbackRedirectUrl="/dashboard"
      appearance={{
        variables: {
          colorPrimary: '#1f7a3a',
          colorBackground: '#ffffff',
          colorInputBackground: '#ffffff',
          colorText: '#12140f',
          colorTextSecondary: '#4e5249',
        },
      }}
    >
      <html
        lang="en"
        data-motion="on"
        suppressHydrationWarning
        className={`${GeistSans.variable} ${GeistMono.variable} ${instrumentSerif.variable} ${notoNaskh.variable}`}
      >
        <head>
          <script dangerouslySetInnerHTML={{ __html: motionBootScript }} />
          <noscript>
            <style>{`[data-reveal],[data-intro]{opacity:1!important;animation:none!important}.preloader{display:none!important}`}</style>
          </noscript>
        </head>
        <body className="antialiased">
          <MotionRoot>
            <ClerkAuthSync />
            <Toasters />
            <Suspense fallback={null}>
              <RouteProgress />
            </Suspense>
            <div className="grain-overlay" aria-hidden="true" />
            <SmoothScroll>
              {children}
              <FeedbackButton />
            </SmoothScroll>
          </MotionRoot>
        </body>
      </html>
    </ClerkProvider>
  );
}
