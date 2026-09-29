"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

const PLATFORMS = ["INSTAGRAM", "FACEBOOK", "LINKEDIN", "X", "TIKTOK"] as const;

export function ConnectedAccounts({
  workspaceId,
  initial,
}: {
  workspaceId: string;
  initial: Array<{
    id: string;
    platform: string;
    status: string;
    username: string | null;
    displayName: string | null;
  }>;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function connect(platform: (typeof PLATFORMS)[number]) {
    setError(null);
    start(async () => {
      const res = await fetch("/api/social", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          workspaceId,
          platform,
          action: "connect_demo",
        }),
      });
      const json = await res.json();
      if (!res.ok) setError(json.error || "Failed");
      router.refresh();
    });
  }

  function disconnect(socialAccountId: string) {
    start(async () => {
      await fetch("/api/social", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          workspaceId,
          platform: "INSTAGRAM",
          action: "disconnect",
          socialAccountId,
        }),
      });
      router.refresh();
    });
  }

  return (
    <div className="space-y-4">
      <ul className="space-y-2 text-sm">
        {initial.length === 0 ? (
          <li className="text-[var(--muted)]">No accounts connected yet.</li>
        ) : (
          initial.map((a) => (
            <li
              key={a.id}
              className="flex items-center justify-between rounded-xl border border-[var(--border)] px-3 py-2"
            >
              <span>
                {a.platform} · @{a.username || a.displayName || "account"}{" "}
                <span className="text-[var(--muted)]">({a.status})</span>
              </span>
              <Button
                size="sm"
                variant="ghost"
                disabled={pending}
                onClick={() => disconnect(a.id)}
              >
                Disconnect
              </Button>
            </li>
          ))
        )}
      </ul>
      <div className="flex flex-wrap gap-2">
        {PLATFORMS.map((p) => (
          <Button
            key={p}
            size="sm"
            variant="secondary"
            disabled={pending}
            onClick={() => connect(p)}
          >
            Connect {p} (demo)
          </Button>
        ))}
      </div>
      {error ? <p className="text-sm text-red-600">{error}</p> : null}
      <p className="text-xs text-[var(--muted)]">
        Demo OAuth stores encrypted tokens locally. Live Meta/LinkedIn/X/TikTok
        apps are documented in docs/PLATFORM_SETUP.md.
      </p>
    </div>
  );
}

export function BillingControls({
  workspaceId,
  planCode,
}: {
  workspaceId: string;
  planCode: string;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();

  function upgrade(code: string) {
    start(async () => {
      await fetch("/api/billing", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          workspaceId,
          action: "upgrade_demo",
          planCode: code,
        }),
      });
      router.refresh();
    });
  }

  function setWhiteLabel() {
    start(async () => {
      await fetch("/api/billing", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          workspaceId,
          action: "set_white_label",
          whiteLabelColor: "#0F3D3E",
          whiteLabelLogo: null,
        }),
      });
      router.refresh();
    });
  }

  return (
    <div className="mt-4 space-y-3">
      <p className="text-xs text-[var(--muted)]">Current plan: {planCode}</p>
      <div className="flex flex-wrap gap-2">
        {["STARTER", "PRO", "AGENCY"].map((p) => (
          <Button
            key={p}
            size="sm"
            variant={p === planCode ? "primary" : "secondary"}
            disabled={pending}
            onClick={() => upgrade(p)}
          >
            {p}
          </Button>
        ))}
        <Button size="sm" variant="ghost" disabled={pending} onClick={setWhiteLabel}>
          Enable white-label
        </Button>
      </div>
    </div>
  );
}
