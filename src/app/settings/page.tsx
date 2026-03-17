import { ProfileForm } from "@/components/ProfileForm";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { buildMetadata } from "@/lib/seo";
import { requireAuth } from "@/services/Auth";

export const metadata = buildMetadata({
  title: "Profile",
  noIndex: true,
});

export default async function SettingsPage() {
  const user = await requireAuth();

  const initials = user.name
    ? user.name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2)
    : user.email[0].toUpperCase();

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-4">
          <Avatar className="h-16 w-16">
            <AvatarImage
              alt={user.name ?? user.email}
              src={user.avatar_url ?? undefined}
            />
            <AvatarFallback className="text-lg">{initials}</AvatarFallback>
          </Avatar>
          <div>
            <CardTitle className="text-2xl">{user.name || "User"}</CardTitle>
            <p className="mt-1 text-muted-foreground">{user.email}</p>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <ProfileForm initialEmail={user.email} initialName={user.name} />
      </CardContent>
    </Card>
  );
}
