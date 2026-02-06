"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import { User, Settings, Mail, Key } from "lucide-react"

const navItems = [
  { label: "Overview", href: "/settings", icon: Settings },
  { label: "Profile", href: "/settings/profile", icon: User },
  { label: "Preferences", href: "/settings/preferences", icon: Settings },
  { label: "Email", href: "/settings/email", icon: Mail },
  { label: "API Keys", href: "/settings/api-keys", icon: Key },
] as const

export function SettingsNav() {
  const pathname = usePathname()

  return (
    <nav className="flex flex-col gap-1">
      {navItems.map((item) => {
        const isActive = pathname === item.href
        const Icon = item.icon
        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "flex items-center gap-2 rounded-md px-3 py-2 text-sm transition-colors",
              isActive
                ? "bg-muted font-medium text-foreground"
                : "text-muted-foreground hover:bg-muted hover:text-foreground"
            )}
          >
            <Icon className="h-4 w-4" />
            {item.label}
          </Link>
        )
      })}
    </nav>
  )
}
