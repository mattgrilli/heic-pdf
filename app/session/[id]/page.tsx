import { redirect } from "next/navigation"

// Sessions are no longer used — the converter is fully browser-based and
// lives on the homepage. Redirect old bookmarked session URLs.
export default function SessionRedirect() {
  redirect("/")
}
