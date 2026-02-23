import { requireAuth } from "@/services/Auth"
import { buildMetadata } from "@/lib/seo"

export const metadata = buildMetadata({
  title: "Settings",
  noIndex: true,
})

export default async function SettingsPage() {
  await requireAuth()

  return (
    <p className="text-muted-foreground">Select a section from the sidebar.</p>
  )
}
