"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

export default function ProfilePage() {
  const [name, setName] = useState("")
  const [isSaving, setIsSaving] = useState(false)
  const [message, setMessage] = useState<string | null>(null)

  // NOTE: In a more complete implementation, we'd fetch the current user data
  // from an API endpoint. For v1, the form saves directly.

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    setIsSaving(true)
    setMessage(null)

    try {
      const res = await fetch("/api/profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      })

      if (res.ok) {
        setMessage("Profile updated successfully.")
      } else {
        setMessage("Failed to update profile.")
      }
    } catch {
      setMessage("Failed to update profile.")
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Profile</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSave} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Display Name</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Your name"
            />
          </div>
          {message && (
            <p className="text-sm text-muted-foreground">{message}</p>
          )}
          <Button type="submit" disabled={isSaving}>
            {isSaving ? "Saving..." : "Save"}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}
