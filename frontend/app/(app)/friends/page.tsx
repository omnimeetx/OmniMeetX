import { redirect } from "next/navigation"

/**
 * Friends is hidden until it has a real backend: the page only shows hard-coded
 * demo chats. The code is kept in ../_friends, which Next does not serve.
 * To bring it back, delete this file, rename _friends to friends and add the
 * sidebar item back in components/app/AppShell.tsx.
 */
export default function FriendsPage() {
  redirect("/dashboard")
}
