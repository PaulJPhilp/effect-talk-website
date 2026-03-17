"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export function ConsultingForm() {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    const formData = new FormData(e.currentTarget);

    try {
      const res = await fetch("/api/consulting", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: formData.get("name"),
          email: formData.get("email"),
          role: formData.get("role"),
          company: formData.get("company"),
          description: formData.get("description"),
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error ?? "Something went wrong");
      }

      router.push("/thanks");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
      setIsSubmitting(false);
    }
  }

  return (
    <Card className="mx-auto w-full max-w-lg">
      <CardHeader>
        <CardTitle>Get in Touch</CardTitle>
      </CardHeader>
      <CardContent>
        <form className="space-y-4" onSubmit={handleSubmit}>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="name">Name *</Label>
              <Input id="name" name="name" placeholder="Your name" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email *</Label>
              <Input
                id="email"
                name="email"
                placeholder="you@example.com"
                required
                type="email"
              />
            </div>
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="role">Role</Label>
              <Input id="role" name="role" placeholder="e.g. CTO" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="company">Company</Label>
              <Input id="company" name="company" placeholder="Acme Corp" />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="description">Tell us about your project *</Label>
            <Textarea
              id="description"
              name="description"
              placeholder="Describe your project, challenges, and what you're looking for..."
              required
              rows={5}
            />
          </div>
          {error && <p className="text-destructive text-sm">{error}</p>}
          <Button className="w-full" disabled={isSubmitting} type="submit">
            {isSubmitting ? "Sending..." : "Submit Inquiry"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
