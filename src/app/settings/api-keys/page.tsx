"use client"

import { useState, useEffect, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"
import { Copy, Plus, Trash2 } from "lucide-react"

interface ApiKey {
  id: string
  name: string
  key_prefix: string
  created_at: string
  revoked_at: string | null
}

export default function ApiKeysPage() {
  const [keys, setKeys] = useState<ApiKey[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [newKeyName, setNewKeyName] = useState("")
  const [isCreating, setIsCreating] = useState(false)
  const [createdKey, setCreatedKey] = useState<string | null>(null)
  const [showDialog, setShowDialog] = useState(false)

  const fetchKeys = useCallback(async () => {
    try {
      const res = await fetch("/api/api-keys")
      if (res.ok) {
        const data = await res.json()
        setKeys(data.keys)
      }
    } catch {
      // Silently fail
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchKeys()
  }, [fetchKeys])

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    if (!newKeyName.trim()) return
    setIsCreating(true)

    try {
      const res = await fetch("/api/api-keys", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newKeyName }),
      })

      if (res.ok) {
        const data = await res.json()
        setCreatedKey(data.plaintext)
        setShowDialog(true)
        setNewKeyName("")
        fetchKeys()
      }
    } catch {
      // Silently fail
    } finally {
      setIsCreating(false)
    }
  }

  async function handleRevoke(keyId: string) {
    try {
      const res = await fetch(`/api/api-keys/${keyId}`, {
        method: "POST",
      })
      if (res.ok) {
        fetchKeys()
      }
    } catch {
      // Silently fail
    }
  }

  function handleCopy() {
    if (createdKey) {
      navigator.clipboard.writeText(createdKey)
    }
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>API Keys</CardTitle>
          <CardDescription>
            Create and manage API keys for the CLI and MCP server.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Create form */}
          <form onSubmit={handleCreate} className="flex gap-2">
            <Input
              value={newKeyName}
              onChange={(e) => setNewKeyName(e.target.value)}
              placeholder="Key name (e.g. 'CLI', 'Cursor MCP')"
              className="flex-1"
            />
            <Button type="submit" disabled={isCreating} size="sm">
              <Plus className="mr-1.5 h-4 w-4" />
              {isCreating ? "Creating..." : "Create Key"}
            </Button>
          </form>

          {/* Keys list */}
          {isLoading ? (
            <p className="text-sm text-muted-foreground">Loading keys...</p>
          ) : keys.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No API keys yet. Create one above.
            </p>
          ) : (
            <div className="space-y-2">
              {keys.map((key) => (
                <div
                  key={key.id}
                  className="flex items-center justify-between rounded-md border px-4 py-3"
                >
                  <div className="flex items-center gap-3">
                    <div>
                      <p className="text-sm font-medium">{key.name}</p>
                      <p className="text-xs text-muted-foreground font-mono">
                        {key.key_prefix}...
                      </p>
                    </div>
                    {key.revoked_at ? (
                      <Badge variant="destructive" className="text-xs">
                        Revoked
                      </Badge>
                    ) : (
                      <Badge variant="secondary" className="text-xs">
                        Active
                      </Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground">
                      {new Date(key.created_at).toLocaleDateString()}
                    </span>
                    {!key.revoked_at && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleRevoke(key.id)}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Show plaintext key dialog */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>API Key Created</DialogTitle>
            <DialogDescription>
              Copy your API key now. You won&apos;t be able to see it again.
            </DialogDescription>
          </DialogHeader>
          <div className="flex items-center gap-2 mt-4">
            <code className="flex-1 bg-muted rounded px-3 py-2 text-sm font-mono break-all">
              {createdKey}
            </code>
            <Button variant="outline" size="sm" onClick={handleCopy}>
              <Copy className="h-4 w-4" />
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
