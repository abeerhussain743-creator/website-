"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

export function RegenerateDnaButton({ workspaceId }: { workspaceId: string }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  return (
    <Button
      variant="secondary"
      disabled={pending}
      onClick={() =>
        start(async () => {
          await fetch("/api/brand-dna", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ workspaceId }),
          });
          router.refresh();
        })
      }
    >
      {pending ? "Generating…" : "Regenerate Brand DNA"}
    </Button>
  );
}
