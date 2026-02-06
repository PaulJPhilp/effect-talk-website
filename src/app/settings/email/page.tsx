"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"

export default function EmailPage() {
  const [email, setEmail] = useState("")
  const [isSaving, setIsSaving] = useState(false)
  const [message, setMessage] = useState<string | null>(null)

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    setIsSaving(true)
    setMessage(null)

    try {
      const res = await fetch("/api/profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      })

      if (res.ok) {
        setMessage("Email updated successfully.")
      } else {
        setMessage("Failed to update email.")
      }
    } catch {
      setMessage("Failed to update email.")
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Email</CardTitle>
        <CardDescription>
          Update the email associated with your account.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSave} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">Email Address</Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
            />
          </div>
          {message && (
            <p className="text-sm text-muted-foreground">{message}</p>
          )}
          <Button type="submit" disabled={isSaving}>
            {isSaving ? "Saving..." : "Update Email"}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}
