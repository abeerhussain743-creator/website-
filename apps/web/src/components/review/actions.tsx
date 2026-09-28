"use client";

import { useTransition } from "react";
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

  function act(action: string) {
    start(async () => {
      await fetch("/api/approvals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          workspaceId,
          contentPlanId,
          plannedPostId,
          action,
        }),
      });
      router.refresh();
    });
  }

  return (
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
            onClick={() => act("request_changes")}
          >
            Request changes
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
  );
}
