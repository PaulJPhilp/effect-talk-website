import { requireAuth } from "@/services/Auth"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar"
import { ProfileForm } from "@/components/ProfileForm"
import { buildMetadata } from "@/lib/seo"

export const metadata = buildMetadata({
  title: "Profile",
  noIndex: true,
})

export default async function SettingsPage() {
  const user = await requireAuth()

  const initials = user.name
    ? user.name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2)
    : user.email[0].toUpperCase()

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-4">
          <Avatar className="h-16 w-16">
            <AvatarImage src={user.avatar_url ?? undefined} alt={user.name ?? user.email} />
            <AvatarFallback className="text-lg">{initials}</AvatarFallback>
          </Avatar>
          <div>
            <CardTitle className="text-2xl">{user.name || "User"}</CardTitle>
            <p className="text-muted-foreground mt-1">{user.email}</p>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <ProfileForm initialName={user.name} initialEmail={user.email} />
      </CardContent>
    </Card>
  )
}
