import { requireAuth } from "@/services/Auth"
import { SettingsNav } from "@/components/SettingsNav"

export default async function SettingsLayout({
  children,
}: {
  children: React.ReactNode
}) {
  // Auth guard: redirect to sign-in if not logged in
  await requireAuth()

  return (
    <div className="w-full px-4 md:px-6 lg:px-8 py-10">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
        <p className="text-muted-foreground mt-1">
          Manage your account and preferences.
        </p>
      </div>
      <div className="flex flex-col md:flex-row gap-8">
        <aside className="w-full md:w-56 shrink-0">
          <SettingsNav />
        </aside>
        <div className="flex-1 min-w-0">{children}</div>
      </div>
    </div>
  )
}
