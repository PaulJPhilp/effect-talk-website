"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Label } from "@/components/ui/label"

export default function PreferencesPage() {
  const [theme, setTheme] = useState<"light" | "dark" | "system">("system")
  const [isSaving, setIsSaving] = useState(false)
  const [message, setMessage] = useState<string | null>(null)

  async function handleSave() {
    setIsSaving(true)
    setMessage(null)

    try {
      const res = await fetch("/api/preferences", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ preferences: { theme } }),
      })

      if (res.ok) {
        setMessage("Preferences saved.")
      } else {
        setMessage("Failed to save preferences.")
      }
    } catch {
      setMessage("Failed to save preferences.")
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Preferences</CardTitle>
        <CardDescription>Customize your EffectTalk experience.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label>Theme</Label>
          <div className="flex gap-2">
            {(["light", "dark", "system"] as const).map((t) => (
              <Button
                key={t}
                variant={theme === t ? "default" : "outline"}
                size="sm"
                onClick={() => setTheme(t)}
                type="button"
              >
                {t.charAt(0).toUpperCase() + t.slice(1)}
              </Button>
            ))}
          </div>
        </div>
        {message && (
          <p className="text-sm text-muted-foreground">{message}</p>
        )}
        <Button onClick={handleSave} disabled={isSaving}>
          {isSaving ? "Saving..." : "Save Preferences"}
        </Button>
      </CardContent>
    </Card>
  )
}
