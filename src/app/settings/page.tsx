import { requireAuth } from "@/services/Auth"
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import Link from "next/link"
import { User, Settings, Mail, Key } from "lucide-react"
import { buildMetadata } from "@/lib/seo"

export const metadata = buildMetadata({
  title: "Settings",
  noIndex: true,
})

export default async function SettingsPage() {
  const user = await requireAuth()

  const sections = [
    {
      title: "Profile",
      description: "Update your name and profile info.",
      href: "/settings/profile",
      icon: User,
    },
    {
      title: "Preferences",
      description: "Customize your experience.",
      href: "/settings/preferences",
      icon: Settings,
    },
    {
      title: "Email",
      description: "Manage your email address.",
      href: "/settings/email",
      icon: Mail,
    },
    {
      title: "API Keys",
      description: "Create and manage API keys.",
      href: "/settings/api-keys",
      icon: Key,
    },
  ] as const

  return (
    <div>
      <p className="text-muted-foreground mb-6">
        Signed in as <span className="font-medium text-foreground">{user.email}</span>
      </p>
      <div className="grid gap-4 sm:grid-cols-2">
        {sections.map((section) => {
          const Icon = section.icon
          return (
            <Link key={section.href} href={section.href}>
              <Card className="h-full hover:bg-muted/50 transition-colors">
                <CardHeader>
                  <Icon className="h-5 w-5 mb-1 text-muted-foreground" />
                  <CardTitle className="text-base">{section.title}</CardTitle>
                  <CardDescription>{section.description}</CardDescription>
                </CardHeader>
              </Card>
            </Link>
          )
        })}
      </div>
    </div>
  )
}
