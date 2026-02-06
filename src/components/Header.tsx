import Link from "next/link"
import { Button } from "@/components/ui/button"
import { SearchInput } from "./SearchInput"
import { AvatarMenu } from "./AvatarMenu"
import { getCurrentUser } from "@/services/Auth"

export async function Header() {
  const user = await getCurrentUser()

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-backdrop-filter:bg-background/60">
      <div className="container flex h-14 items-center gap-4 px-4 md:px-6">
        {/* Brand */}
        <Link href="/" className="flex items-center gap-2 font-bold text-lg">
          <span className="bg-primary text-primary-foreground px-2 py-0.5 rounded text-sm font-mono">
            Effect
          </span>
          <span>Talk</span>
        </Link>

        {/* Search */}
        <div className="flex-1 flex justify-center">
          <SearchInput />
        </div>

        {/* Right side */}
        <div className="flex items-center gap-3">
          <Button variant="outline" size="sm" asChild className="hidden sm:inline-flex">
            <Link href="/consulting">Consulting</Link>
          </Button>
          <AvatarMenu user={user} />
        </div>
      </div>
    </header>
  )
}
