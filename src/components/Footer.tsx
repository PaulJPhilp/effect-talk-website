import Link from "next/link"

export function Footer() {
  return (
    <footer className="border-t py-6 md:py-8">
      <div className="container flex flex-col items-center gap-4 px-4 md:flex-row md:justify-between md:px-6">
        <p className="text-sm text-muted-foreground">
          &copy; {new Date().getFullYear()} EffectTalk. Built with Effect.ts.
        </p>
        <nav className="flex items-center gap-4 text-sm text-muted-foreground">
          <Link href="/patterns" className="hover:text-foreground transition-colors">
            Patterns
          </Link>
          <Link href="/rules" className="hover:text-foreground transition-colors">
            Rules
          </Link>
          <Link href="/cli" className="hover:text-foreground transition-colors">
            CLI
          </Link>
          <Link href="/consulting" className="hover:text-foreground transition-colors">
            Consulting
          </Link>
        </nav>
      </div>
    </footer>
  )
}
