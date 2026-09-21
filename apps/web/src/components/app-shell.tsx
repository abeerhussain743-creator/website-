"use client";

import * as React from "react";
import { Sidebar } from "@/components/sidebar";
import { TopBar } from "@/components/top-bar";
import { CommandPalette } from "@/components/command-palette";

export function AppShell({
  institutionName,
  terminology,
  userName,
  children,
}: {
  institutionName: string;
  terminology: { learner: string; group: string; subgroup: string; term: string; guardian: string };
  userName: string;
  children: React.ReactNode;
}) {
  const [commandOpen, setCommandOpen] = React.useState(false);

  return (
    <div className="flex min-h-screen bg-[var(--background)]">
      <Sidebar institutionName={institutionName} terminology={terminology} />
      <div className="flex min-w-0 flex-1 flex-col">
        <TopBar userName={userName} onOpenCommand={() => setCommandOpen(true)} />
        <main className="flex-1 px-4 py-6 md:px-8">{children}</main>
      </div>
      <CommandPalette open={commandOpen} onOpenChange={setCommandOpen} />
    </div>
  );
}
