import { redirect } from "next/navigation"

// The user directory now lives in the admin area, which guards itself.
export default function UsersPage() {
  redirect("/admin?tab=users")
}
