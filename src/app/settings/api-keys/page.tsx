"use client";

import { Copy, Plus, Trash2 } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";

interface ApiKey {
  created_at: string;
  id: string;
  key_prefix: string;
  name: string;
  revoked_at: string | null;
}

export default function ApiKeysPage() {
  const [keys, setKeys] = useState<ApiKey[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [newKeyName, setNewKeyName] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const [createdKey, setCreatedKey] = useState<string | null>(null);
  const [showDialog, setShowDialog] = useState(false);

  const fetchKeys = useCallback(async () => {
    try {
      const res = await fetch("/api/api-keys");
      if (res.ok) {
        const data = await res.json();
        setKeys(data.keys);
      }
    } catch {
      // Silently fail
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchKeys();
  }, [fetchKeys]);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!newKeyName.trim()) {
      return;
    }
    setIsCreating(true);

    try {
      const res = await fetch("/api/api-keys", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newKeyName }),
      });

      if (res.ok) {
        const data = await res.json();
        setCreatedKey(data.plaintext);
        setShowDialog(true);
        setNewKeyName("");
        fetchKeys();
      }
    } catch {
      // Silently fail
    } finally {
      setIsCreating(false);
    }
  }

  async function handleRevoke(keyId: string) {
    try {
      const res = await fetch(`/api/api-keys/${keyId}`, {
        method: "POST",
      });
      if (res.ok) {
        fetchKeys();
      }
    } catch {
      // Silently fail
    }
  }

  function handleCopy() {
    if (createdKey) {
      navigator.clipboard.writeText(createdKey);
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
          <form className="flex gap-2" onSubmit={handleCreate}>
            <Input
              className="flex-1"
              onChange={(e) => setNewKeyName(e.target.value)}
              placeholder="Key name (e.g. 'CLI', 'Cursor MCP')"
              value={newKeyName}
            />
            <Button disabled={isCreating} size="sm" type="submit">
              <Plus className="mr-1.5 h-4 w-4" />
              {isCreating ? "Creating..." : "Create Key"}
            </Button>
          </form>

          {/* Keys list */}
          {isLoading ? (
            <p className="text-muted-foreground text-sm">Loading keys...</p>
          ) : keys.length === 0 ? (
            <p className="text-muted-foreground text-sm">
              No API keys yet. Create one above.
            </p>
          ) : (
            <div className="space-y-2">
              {keys.map((key) => (
                <div
                  className="flex items-center justify-between rounded-md border px-4 py-3"
                  key={key.id}
                >
                  <div className="flex items-center gap-3">
                    <div>
                      <p className="font-medium text-sm">{key.name}</p>
                      <p className="font-mono text-muted-foreground text-xs">
                        {key.key_prefix}...
                      </p>
                    </div>
                    {key.revoked_at ? (
                      <Badge className="text-xs" variant="destructive">
                        Revoked
                      </Badge>
                    ) : (
                      <Badge className="text-xs" variant="secondary">
                        Active
                      </Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-muted-foreground text-xs">
                      {new Date(key.created_at).toLocaleDateString()}
                    </span>
                    {!key.revoked_at && (
                      <Button
                        onClick={() => handleRevoke(key.id)}
                        size="sm"
                        variant="ghost"
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
      <Dialog onOpenChange={setShowDialog} open={showDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>API Key Created</DialogTitle>
            <DialogDescription>
              Copy your API key now. You won&apos;t be able to see it again.
            </DialogDescription>
          </DialogHeader>
          <div className="mt-4 flex items-center gap-2">
            <code className="flex-1 break-all rounded bg-muted px-3 py-2 font-mono text-sm">
              {createdKey}
            </code>
            <Button onClick={handleCopy} size="sm" variant="outline">
              <Copy className="h-4 w-4" />
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
