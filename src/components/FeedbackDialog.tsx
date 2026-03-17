"use client";

import { useState } from "react";
import { FeedbackForm } from "@/components/FeedbackForm";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

interface FeedbackDialogProps {
  /** Custom trigger element. Defaults to a "Send Feedback" text button. */
  trigger?: React.ReactNode;
}

export function FeedbackDialog({ trigger }: FeedbackDialogProps) {
  const [open, setOpen] = useState(false);

  function handleSuccess() {
    setOpen(false);
  }

  return (
    <Dialog onOpenChange={setOpen} open={open}>
      <DialogTrigger asChild>
        {trigger ?? (
          <button
            className="text-muted-foreground text-sm underline underline-offset-4 hover:text-foreground"
            type="button"
          >
            Send Feedback
          </button>
        )}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Send Feedback</DialogTitle>
          <DialogDescription>
            Share feedback, report a bug, or suggest an improvement. We read
            every message.
          </DialogDescription>
        </DialogHeader>
        <FeedbackForm embedded onSuccess={handleSuccess} />
      </DialogContent>
    </Dialog>
  );
}
