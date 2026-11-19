/**
 * The product's name and one-liners, used by the titles and the footer.
 * Page copy and backend emails also spell the name out, so a rename means a
 * search for "OmniMeetX" across frontend/ and backend/.
 */
export const BRAND = {
  name: "OmniMeetX",
  /** Who customers contract with, named in the Terms and Privacy Policy. Paddle checks this,
   *  so set it to the registered business or legal name on your Paddle account. */
  legalName: "OmniMeetX",
  /** Public support inbox (contact page). After the domain: support@<domain> via Cloudflare Email Routing. */
  supportEmail: "omnimeetx@gmail.com",
  tagline: "Meeting notes in the language you actually speak.",
  description:
    "Upload a meeting recording. OmniMeetX gives you a transcript, a summary and action items in 98 languages, including Urdu.",
} as const
