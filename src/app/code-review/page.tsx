import { TabsBar } from "@/components/TabsBar"
import { ComingSoon } from "@/components/ComingSoon"
import { WaitlistForm } from "@/components/WaitlistForm"
import { buildMetadata } from "@/lib/seo"

export const metadata = buildMetadata({
  title: "EffectTalk Code Review",
  description: "AI-powered code review for Effect.ts applications. Coming soon — join the waitlist.",
})

export default function CodeReviewPage() {
  return (
    <>
      <TabsBar />
      <div className="container px-4 md:px-6 py-10">
        <ComingSoon
          title="EffectTalk Code Review"
          description="AI-powered code review purpose-built for Effect.ts. Get actionable feedback on your Effect services, error handling, and layer composition."
        />
        <WaitlistForm source="code_review" />
      </div>
    </>
  )
}
