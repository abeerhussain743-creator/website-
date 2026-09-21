"use client";

import { Moon, Sun, Search } from "lucide-react";
import { useTheme } from "next-themes";
import { Button } from "@maxtrone/ui";

export function TopBar({
  userName,
  onOpenCommand,
}: {
  userName: string;
  onOpenCommand: () => void;
}) {
  const { theme, setTheme } = useTheme();

  return (
    <header className="sticky top-0 z-20 flex h-14 items-center justify-between border-b border-[var(--border)] bg-[var(--background)]/90 px-4 backdrop-blur md:px-6">
      <button
        type="button"
        onClick={onOpenCommand}
        className="flex h-9 w-full max-w-md items-center gap-2 rounded-[12px] border border-[var(--border)] bg-[var(--card)] px-3 text-sm text-[var(--muted-foreground)] transition-colors hover:bg-[var(--muted)]"
      >
        <Search className="h-4 w-4" />
        <span className="flex-1 text-left">Search or jump…</span>
        <kbd className="hidden rounded border border-[var(--border)] px-1.5 py-0.5 text-[10px] md:inline">
          ⌘K
        </kbd>
      </button>
      <div className="ml-3 flex items-center gap-2">
        <Button
          variant="ghost"
          size="icon"
          aria-label="Toggle theme"
          onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
        >
          <Sun className="h-4 w-4 dark:hidden" />
          <Moon className="hidden h-4 w-4 dark:block" />
        </Button>
        <div className="hidden text-right sm:block">
          <p className="text-sm font-medium leading-none">{userName}</p>
          <p className="mt-1 text-[11px] text-[var(--muted-foreground)]">Staff</p>
        </div>
      </div>
    </header>
  );
}
