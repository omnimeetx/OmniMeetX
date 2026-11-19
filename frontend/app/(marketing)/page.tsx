import { LanguageBand, StatsBand } from "@/components/landing/Bands"
import { Examples, FinalCta, Principles } from "@/components/landing/Closing"
import Hero from "@/components/landing/Hero"
import HowItWorks from "@/components/landing/HowItWorks"
import { IntroProvider, Preloader } from "@/components/landing/Intro"
import LanguageFeature from "@/components/landing/LanguageFeature"
import Outcomes from "@/components/landing/Outcomes"
import ProblemStat from "@/components/landing/ProblemStat"
import TryIt from "@/components/landing/TryIt"
import type { Metadata } from "next"
import { BRAND } from "@/lib/brand"
import { SITE_URL } from "@/lib/site"

export const metadata: Metadata = {
  title: { absolute: `${BRAND.name}: AI meeting notes and transcripts, including Urdu` },
  description: BRAND.description,
  alternates: { canonical: "/" },
}

// Tells search engines what this site is and what it costs (only what the pricing page really offers).
const structuredData = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Organization",
      "@id": `${SITE_URL}/#organization`,
      name: BRAND.name,
      url: SITE_URL,
      logo: `${SITE_URL}/icon.svg`,
    },
    {
      "@type": "WebSite",
      "@id": `${SITE_URL}/#website`,
      name: BRAND.name,
      url: SITE_URL,
      publisher: { "@id": `${SITE_URL}/#organization` },
    },
    {
      "@type": "SoftwareApplication",
      name: BRAND.name,
      url: SITE_URL,
      description: BRAND.description,
      applicationCategory: "BusinessApplication",
      operatingSystem: "Web",
      publisher: { "@id": `${SITE_URL}/#organization` },
      offers: [
        { "@type": "Offer", name: "Starter", price: "0", priceCurrency: "USD", url: `${SITE_URL}/pricing` },
        { "@type": "Offer", name: "Pro", price: "12", priceCurrency: "USD", url: `${SITE_URL}/pricing` },
      ],
    },
  ],
}

export default function HomePage() {
  return (
    <IntroProvider>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }} />
      <Preloader />
      <Hero />
      <LanguageBand />
      <StatsBand />
      <TryIt />
      <ProblemStat />
      <HowItWorks />
      <LanguageFeature />
      <Outcomes />
      <Principles />
      <Examples />
      <FinalCta />
    </IntroProvider>
  )
}
