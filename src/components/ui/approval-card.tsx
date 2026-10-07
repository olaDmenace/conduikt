"use client";

import * as React from "react";
import { Badge } from "@/src/components/ui/badge";
import { Button } from "@/src/components/ui/button";

// docs/DESIGN.md §Components · Approval card. Shows the real draft text,
// never a summary of it. "The user approves, the agents do": Approve,
// Edit, Try again. Buttons grow from 30px to 40px under 768px for touch.
export function ApprovalCard({
  channel,
  when,
  text,
  onApprove,
  onEdit,
  onTryAgain,
  busy,
}: {
  channel: string;
  when: string;
  text: string;
  onApprove: () => void;
  onEdit: () => void;
  onTryAgain: () => void;
  busy?: boolean;
}) {
  const btn = "h-10 text-xs md:h-[30px]";
  return (
    <div className="space-y-3 rounded-md border border-line bg-ground p-3">
      <div className="flex items-center justify-between gap-2">
        <Badge variant="secondary">{channel}</Badge>
        <span className="font-mono text-xs text-text-3">{when}</span>
      </div>
      <p className="whitespace-pre-wrap text-body text-text">{text}</p>
      <div className="flex flex-wrap gap-2">
        <Button size="sm" className={btn} onClick={onApprove} disabled={busy}>
          Approve
        </Button>
        <Button size="sm" variant="quiet" className={btn} onClick={onEdit} disabled={busy}>
          Edit
        </Button>
        <Button size="sm" variant="quiet" className={btn} onClick={onTryAgain} disabled={busy}>
          Try again
        </Button>
      </div>
    </div>
  );
}
