"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

interface FeedbackFormProps {
  /** When true, form is rendered without the Card wrapper (e.g. inside FeedbackDialog). */
  embedded?: boolean;
  /** When provided, called on success instead of redirecting (e.g. for dialog use). */
  onSuccess?: () => void;
}

export function FeedbackForm({
  onSuccess,
  embedded = false,
}: FeedbackFormProps) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    const formData = new FormData(e.currentTarget);

    try {
      const res = await fetch("/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: formData.get("name") || undefined,
          email: formData.get("email"),
          message: formData.get("message"),
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error ?? "Something went wrong");
      }

      if (onSuccess) {
        onSuccess();
      } else {
        router.push("/thanks");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
      setIsSubmitting(false);
    }
  }

  const formContent = (
    <form className="space-y-4" onSubmit={handleSubmit}>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="feedback-name">Name</Label>
          <Input
            id="feedback-name"
            name="name"
            placeholder="Your name (optional)"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="feedback-email">Email *</Label>
          <Input
            id="feedback-email"
            name="email"
            placeholder="you@example.com"
            required
            type="email"
          />
        </div>
      </div>
      <div className="space-y-2">
        <Label htmlFor="feedback-message">Message *</Label>
        <Textarea
          id="feedback-message"
          name="message"
          placeholder="Share your feedback, bug report, or suggestion..."
          required
          rows={5}
        />
      </div>
      {error && <p className="text-destructive text-sm">{error}</p>}
      <Button className="w-full" disabled={isSubmitting} type="submit">
        {isSubmitting ? "Sending..." : "Send Feedback"}
      </Button>
    </form>
  );

  if (embedded) {
    return formContent;
  }

  return (
    <Card className="mx-auto w-full max-w-lg">
      <CardHeader>
        <CardTitle>Send Feedback</CardTitle>
      </CardHeader>
      <CardContent>{formContent}</CardContent>
    </Card>
  );
}
