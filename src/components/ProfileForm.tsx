"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface ProfileFormProps {
  readonly initialEmail: string;
  readonly initialName: string | null;
}

export function ProfileForm({ initialName, initialEmail }: ProfileFormProps) {
  const [name, setName] = useState(initialName ?? "");
  const [email, setEmail] = useState(initialEmail);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const router = useRouter();

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setIsSaving(true);
    setMessage(null);

    try {
      const res = await fetch("/api/profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name || null, email }),
      });

      if (res.ok) {
        setMessage("Profile updated successfully.");
        router.refresh();
      } else {
        const data = await res.json();
        setMessage(data.error || "Failed to update profile.");
      }
    } catch {
      setMessage("Failed to update profile.");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <form className="space-y-4" onSubmit={handleSave}>
      <div className="space-y-2">
        <Label htmlFor="name">Display Name</Label>
        <Input
          id="name"
          onChange={(e) => setName(e.target.value)}
          placeholder="Your name"
          value={name}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="email">Email Address</Label>
        <Input
          id="email"
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@example.com"
          type="email"
          value={email}
        />
      </div>
      {message && (
        <p
          className={`text-sm ${message.includes("successfully") ? "text-green-600 dark:text-green-400" : "text-destructive"}`}
        >
          {message}
        </p>
      )}
      <Button disabled={isSaving} type="submit">
        {isSaving ? "Saving..." : "Save Changes"}
      </Button>
    </form>
  );
}
