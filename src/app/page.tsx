import {
  ArrowRight,
  ArrowRightLeft,
  BookOpen,
  Cpu,
  FileSearch,
  MessageSquare,
  Terminal,
} from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { buildMetadata } from "@/lib/seo";

export const metadata = buildMetadata({
  description:
    "Production-ready Effect.ts patterns, tools, and consulting for TypeScript teams. Browse 300+ patterns and rules.",
});

export default function HomePage() {
  return (
    <div className="flex w-full flex-col">
      {/* Hero — full viewport width with padding, content centered */}
      <section className="flex w-full flex-col items-center justify-center px-4 py-16 text-center md:px-6 md:py-24 lg:px-8">
        <div className="mx-auto flex w-full max-w-3xl flex-col items-center justify-center">
          <h1 className="text-center font-bold text-4xl tracking-tight md:text-5xl">
            Master Effect.ts with
            <span className="text-primary"> production-ready patterns</span>
          </h1>
          <p className="mt-4 max-w-2xl text-center text-lg text-muted-foreground">
            Browse 300+ curated patterns and rules. Use the CLI. Connect your AI
            assistant. Get expert consulting.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Button asChild size="lg">
              <Link href="/patterns">
                Browse Patterns
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
            <Button asChild size="lg" variant="outline">
              <Link href="/tour">
                Start Tour
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Features — full viewport width with padding */}
      <section className="w-full px-4 pb-16 md:px-6 md:pb-24 lg:px-8">
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          <Link href="/patterns">
            <Card className="h-full transition-colors hover:bg-muted/50">
              <CardHeader>
                <BookOpen className="mb-2 h-8 w-8 text-primary" />
                <CardTitle>Patterns Library</CardTitle>
                <CardDescription>
                  300+ Effect.ts patterns — searchable, categorized, and
                  production-tested.
                </CardDescription>
              </CardHeader>
            </Card>
          </Link>

          <Link href="/cli">
            <Card className="h-full transition-colors hover:bg-muted/50">
              <CardHeader>
                <Terminal className="mb-2 h-8 w-8 text-primary" />
                <CardTitle>CLI Tool</CardTitle>
                <CardDescription>
                  Install EffectPatterns locally. Search, browse, and apply
                  patterns from your terminal.
                </CardDescription>
              </CardHeader>
            </Card>
          </Link>

          <div className="pointer-events-none relative h-full">
            <span className="absolute top-3 right-3 z-10 rounded bg-muted px-2 py-0.5 font-medium text-muted-foreground text-xs">
              Coming soon
            </span>
            <Card className="h-full cursor-not-allowed opacity-60 grayscale">
              <CardHeader>
                <Cpu className="mb-2 h-8 w-8 text-muted-foreground" />
                <CardTitle className="text-muted-foreground">
                  MCP Server
                </CardTitle>
                <CardDescription>
                  Connect Cursor, Claude, or any MCP-compatible AI to the full
                  patterns library.
                </CardDescription>
              </CardHeader>
            </Card>
          </div>

          <Link href="/consulting">
            <Card className="h-full transition-colors hover:bg-muted/50">
              <CardHeader>
                <MessageSquare className="mb-2 h-8 w-8 text-primary" />
                <CardTitle>Consulting</CardTitle>
                <CardDescription>
                  Effect assessments, migration strategy, and developer training
                  for your team.
                </CardDescription>
              </CardHeader>
            </Card>
          </Link>

          {/* Placeholder so row 2 aligns: Code Review under CLI, V3 under MCP */}
          <div aria-hidden className="hidden lg:block" />

          <div className="pointer-events-none relative h-full">
            <span className="absolute top-3 right-3 z-10 rounded bg-muted px-2 py-0.5 font-medium text-muted-foreground text-xs">
              Coming soon
            </span>
            <Card className="h-full cursor-not-allowed opacity-60 grayscale">
              <CardHeader>
                <FileSearch className="mb-2 h-8 w-8 text-muted-foreground" />
                <CardTitle className="text-muted-foreground">
                  Code Review and Refactoring
                </CardTitle>
                <CardDescription>
                  AI-powered code review and refactoring for Effect.ts
                  applications.
                </CardDescription>
              </CardHeader>
            </Card>
          </div>

          <div className="pointer-events-none relative h-full">
            <span className="absolute top-3 right-3 z-10 rounded bg-muted px-2 py-0.5 font-medium text-muted-foreground text-xs">
              Coming soon
            </span>
            <Card className="h-full cursor-not-allowed opacity-60 grayscale">
              <CardHeader>
                <ArrowRightLeft className="mb-2 h-8 w-8 text-muted-foreground" />
                <CardTitle className="text-muted-foreground">
                  V3 to V4 Migration
                </CardTitle>
                <CardDescription>
                  Guided migration from Effect v3 to v4 — patterns, tooling, and
                  best practices.
                </CardDescription>
              </CardHeader>
            </Card>
          </div>
        </div>
      </section>
    </div>
  );
}
