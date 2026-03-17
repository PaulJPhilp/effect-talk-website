import { Github } from "lucide-react";
import Link from "next/link";
import { AvatarMenu } from "@/components/AvatarMenu";
import { PostHogIdentify } from "@/components/PostHogIdentify";
import { ThemeToggle } from "@/components/ThemeToggle";
import { Button } from "@/components/ui/button";
import { getCurrentUser } from "@/services/Auth";
import { EFFECT_PATTERNS_GITHUB_URL } from "@/types/constants";

export async function Header() {
  const user = await getCurrentUser();

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-backdrop-filter:bg-background/60">
      <PostHogIdentify userId={user?.id ?? null} />
      <div className="flex h-14 w-full items-center px-4 md:px-6 lg:px-8">
        <Link className="flex items-center gap-2 font-bold text-lg" href="/">
          <span className="rounded bg-primary px-2 py-0.5 font-mono text-primary-foreground text-sm">
            Effect
          </span>
          <span>Talk</span>
        </Link>

        <div className="ml-auto flex items-center gap-3">
          <Button
            asChild
            className="hidden sm:inline-flex"
            size="sm"
            variant="ghost"
          >
            <a
              className="inline-flex items-center gap-1.5"
              href={EFFECT_PATTERNS_GITHUB_URL}
              rel="noopener noreferrer"
              target="_blank"
            >
              <Github className="h-3.5 w-3.5" />
              <span>Effect Patterns</span>
            </a>
          </Button>
          <ThemeToggle />
          <Button
            asChild
            className="hidden sm:inline-flex"
            size="sm"
            variant="ghost"
          >
            <Link href="/blog">Blog</Link>
          </Button>
          <Button
            asChild
            className="hidden sm:inline-flex"
            size="sm"
            variant="outline"
          >
            <Link href="/consulting">Consulting</Link>
          </Button>
          <AvatarMenu user={user} />
        </div>
      </div>
    </header>
  );
}
