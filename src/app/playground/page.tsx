import { TabsBar } from "@/components/TabsBar"
import { ComingSoon } from "@/components/ComingSoon"
import { WaitlistForm } from "@/components/WaitlistForm"
import { buildMetadata } from "@/lib/seo"

export const metadata = buildMetadata({
  title: "EffectPatterns Playground",
  description: "Interactive playground for experimenting with Effect.ts patterns. Coming soon — join the waitlist.",
})

export default function PlaygroundPage() {
  return (
    <>
      <TabsBar />
      <div className="container px-4 md:px-6 py-10">
        <ComingSoon
          title="EffectPatterns Playground"
          description="An interactive playground where you can experiment with Effect.ts patterns in the browser. Write, run, and share code snippets — no setup required."
        />
        <WaitlistForm source="playground" />
      </div>
    </>
  )
}
