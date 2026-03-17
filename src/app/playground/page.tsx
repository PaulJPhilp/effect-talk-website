import { ArrowRight } from "lucide-react";
import Link from "next/link";
import { ComingSoon } from "@/components/ComingSoon";
import { TabsBar } from "@/components/TabsBar";
import { Button } from "@/components/ui/button";
import { WaitlistForm } from "@/components/WaitlistForm";
import { buildMetadata } from "@/lib/seo";

export const metadata = buildMetadata({
  title: "EffectPatterns Playground",
  description:
    "Interactive playground for experimenting with Effect.ts patterns. Coming soon — join the waitlist.",
});

export default function PlaygroundPage() {
  return (
    <>
      <TabsBar />
      <div className="container px-4 py-10 md:px-6">
        <ComingSoon
          description="An interactive playground where you can experiment with Effect.ts patterns in the browser. Write, run, and share code snippets — no setup required."
          title="EffectPatterns Playground"
        />
        <div className="mt-8 rounded-lg border bg-muted/50 p-6">
          <h3 className="mb-2 font-semibold text-lg">
            Try the Interactive Tour
          </h3>
          <p className="mb-4 text-muted-foreground text-sm">
            While you wait for the playground, check out our interactive tour
            where you can learn Effect.ts patterns step-by-step with hands-on
            exercises.
          </p>
          <Link href="/tour">
            <Button>
              Explore the Tour
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </Link>
        </div>
        <div className="mt-8">
          <WaitlistForm source="playground" />
        </div>
      </div>
    </>
  );
}
