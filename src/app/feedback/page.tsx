import { FeedbackForm } from "@/components/FeedbackForm";
import { buildMetadata } from "@/lib/seo";

export const metadata = buildMetadata({
  title: "Feedback",
  description:
    "Send feedback, report a bug, or suggest an improvement for EffectTalk.",
});

export default function FeedbackPage() {
  return (
    <div className="container flex flex-col items-center px-4 py-20 md:px-6">
      <h1 className="mb-3 font-bold text-3xl tracking-tight">Send Feedback</h1>
      <p className="mb-8 max-w-md text-center text-muted-foreground">
        Share feedback, report a bug, or suggest an improvement. We read every
        message.
      </p>
      <FeedbackForm />
    </div>
  );
}
