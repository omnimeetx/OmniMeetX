import { redirect } from "next/navigation"

/** Video meetings are hidden until after launch; see app/(app)/create-meeting/page.tsx. */
export default function MeetingRoomPage() {
  redirect("/dashboard")
}