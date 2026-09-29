"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

export function ReviewActions({
  workspaceId,
  contentPlanId,
  plannedPostId,
}: {
  workspaceId: string;
  contentPlanId: string;
  plannedPostId?: string;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [feedback, setFeedback] = useState("");
  const [showFeedback, setShowFeedback] = useState(false);

  function act(action: string, extra?: { feedback?: string }) {
    start(async () => {
      await fetch("/api/approvals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          workspaceId,
          contentPlanId,
          plannedPostId,
          action,
          feedback: extra?.feedback,
        }),
      });
      setShowFeedback(false);
      setFeedback("");
      router.refresh();
    });
  }

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-2">
        {plannedPostId ? (
          <>
            <Button size="sm" disabled={pending} onClick={() => act("approve")}>
              Approve
            </Button>
            <Button
              size="sm"
              variant="secondary"
              disabled={pending}
              onClick={() => act("publish_now")}
            >
              Publish now
            </Button>
            <Button
              size="sm"
              variant="ghost"
              disabled={pending}
              onClick={() => setShowFeedback((v) => !v)}
            >
              Request changes
            </Button>
            <Button
              size="sm"
              variant="ghost"
              disabled={pending}
              onClick={() => act("regenerate")}
            >
              Regenerate
            </Button>
          </>
        ) : (
          <>
            <Button size="sm" disabled={pending} onClick={() => act("approve_all")}>
              Bulk approve week
            </Button>
            <Button
              size="sm"
              variant="secondary"
              disabled={pending}
              onClick={() => act("schedule")}
            >
              Schedule approved
            </Button>
          </>
        )}
      </div>
      {showFeedback && plannedPostId ? (
        <div className="flex flex-col gap-2">
          <textarea
            className="min-h-[72px] w-full rounded-xl border border-[var(--border)] bg-transparent px-3 py-2 text-sm"
            placeholder="What should change?"
            value={feedback}
            onChange={(e) => setFeedback(e.target.value)}
          />
          <Button
            size="sm"
            disabled={pending || !feedback.trim()}
            onClick={() => act("request_changes", { feedback })}
          >
            Submit feedback & rewrite
          </Button>
        </div>
      ) : null}
    </div>
  );
}
