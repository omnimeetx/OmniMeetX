import { redirect } from "next/navigation"

/**
 * Video meetings are hidden until after launch. The code is kept in ../_create-meeting
 * and app/_meeting, which Next does not serve. To bring them back, delete this file and
 * app/meeting, rename _create-meeting to create-meeting and app/_meeting to app/meeting,
 * then add the sidebar item back in components/app/AppShell.tsx and the footer link in
 * components/site/SiteFooter.tsx.
 */
export default function CreateMeetingPage() {
  redirect("/dashboard")
}
