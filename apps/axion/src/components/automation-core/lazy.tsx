"use client";

import dynamic from "next/dynamic";
import { useEffect, useState } from "react";

const AutomationCore = dynamic(
  () =>
    import("./automation-core").then((m) => m.AutomationCore),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-full w-full items-center justify-center">
        <div className="h-32 w-32 animate-pulse rounded-full bg-accent/10 blur-xl" />
      </div>
    ),
  },
);

export function AutomationCoreLazy({
  scrollProgress = 0,
  className,
  interactive = true,
}: {
  scrollProgress?: number;
  className?: string;
  interactive?: boolean;
}) {
  const [lite, setLite] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia("(max-width: 768px)");
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setLite(mq.matches || reduce.matches);
    update();
    mq.addEventListener("change", update);
    reduce.addEventListener("change", update);
    return () => {
      mq.removeEventListener("change", update);
      reduce.removeEventListener("change", update);
    };
  }, []);

  return (
    <AutomationCore
      scrollProgress={scrollProgress}
      className={className}
      interactive={interactive && !lite}
      density={lite ? "lite" : "full"}
    />
  );
}
