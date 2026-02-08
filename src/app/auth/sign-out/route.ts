import { signOut } from "@workos-inc/authkit-nextjs"
import { clearSessionCookie } from "@/services/Auth"

/**
 * Sign out: clear our session cookie and use WorkOS AuthKit signOut to clear SDK session and redirect.
 */
export async function GET() {
  await clearSessionCookie()
  const appBaseUrl = process.env.APP_BASE_URL ?? "http://localhost:3000"
  return signOut({ returnTo: appBaseUrl })
}
