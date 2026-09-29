"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input, Label, Textarea } from "@/components/ui/field";
import { GOAL_OPTIONS } from "@postpilot/shared";

type StepKey =
  | "BUSINESS"
  | "AUDIENCE"
  | "TONE"
  | "BRAND_KIT"
  | "SOCIAL"
  | "REVIEW"
  | "COMPLETE";

const STEPS: { key: StepKey; title: string; blurb: string }[] = [
  {
    key: "BUSINESS",
    title: "Business",
    blurb: "Who you are and what you sell.",
  },
  {
    key: "AUDIENCE",
    title: "Audience",
    blurb: "Who you speak to and why they care.",
  },
  {
    key: "TONE",
    title: "Tone",
    blurb: "Voice sliders and language preferences.",
  },
  {
    key: "BRAND_KIT",
    title: "Brand kit",
    blurb: "Colors, fonts, and logo.",
  },
  {
    key: "SOCIAL",
    title: "Social",
    blurb: "Connect accounts in Phase 4 — skip for now.",
  },
  {
    key: "REVIEW",
    title: "Review",
    blurb: "Confirm and finish setup.",
  },
];

export type WizardInitialData = {
  business: Record<string, string>;
  audience: {
    audience: {
      demographics?: string;
      pains?: string;
      desires?: string;
    };
    goals: string[];
  };
  tone: {
    toneSliders: {
      formalCasual: number;
      seriousPlayful: number;
      boldSubtle: number;
    };
    wordsToUse: string[];
    wordsToAvoid: string[];
    contentLanguages: string[];
  };
  brandKit: {
    primaryColor?: string;
    secondaryColor?: string;
    accentColor?: string;
    backgroundColor?: string;
    textColor?: string;
    fontHeading?: string;
    fontBody?: string;
    logoMediaId?: string;
  };
};

export function OnboardingWizard({
  workspaceId,
  initialStep,
  initialData,
}: {
  workspaceId: string;
  initialStep: string;
  initialData: WizardInitialData;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const startIndex = Math.max(
    0,
    STEPS.findIndex((s) => s.key === initialStep),
  );
  const [index, setIndex] = useState(startIndex === -1 ? 0 : startIndex);
  const [error, setError] = useState<string | null>(null);
  const [business, setBusiness] = useState(initialData.business);
  const [audience, setAudience] = useState(initialData.audience);
  const [tone, setTone] = useState(initialData.tone);
  const [brandKit, setBrandKit] = useState(initialData.brandKit);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);

  const step = STEPS[index]!;
  const progress = useMemo(
    () => ((index + 1) / STEPS.length) * 100,
    [index],
  );

  async function save(nextStep: StepKey, complete = false) {
    setError(null);
    let logoMediaId = brandKit.logoMediaId;

    if (logoFile && step.key === "BRAND_KIT") {
      const body = new FormData();
      body.set("workspaceId", workspaceId);
      body.set("file", logoFile);
      const upload = await fetch("/api/media/upload", {
        method: "POST",
        body,
      });
      if (!upload.ok) {
        const payload = await upload.json().catch(() => ({}));
        throw new Error(payload.error ?? "Logo upload failed");
      }
      const json = (await upload.json()) as { id: string; url: string };
      logoMediaId = json.id;
      setBrandKit((prev) => ({ ...prev, logoMediaId }));
      setLogoPreview(json.url);
    }

    const res = await fetch("/api/onboarding", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        workspaceId,
        step: step.key,
        nextStep,
        complete,
        data: {
          business,
          audience,
          tone,
          brandKit: { ...brandKit, logoMediaId },
        },
      }),
    });
    if (!res.ok) {
      const payload = await res.json().catch(() => ({}));
      throw new Error(payload.error ?? "Could not save step");
    }
  }

  function onNext() {
    startTransition(async () => {
      try {
        const isLast = index >= STEPS.length - 1;
        const next = isLast ? "COMPLETE" : STEPS[index + 1]!.key;
        await save(next, isLast);
        if (isLast) {
          router.push("/app");
          router.refresh();
          return;
        }
        setIndex((v) => v + 1);
        router.refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Save failed");
      }
    });
  }

  function onBack() {
    setIndex((v) => Math.max(0, v - 1));
  }

  return (
    <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6 shadow-soft">
      <div className="mb-6">
        <div className="mb-2 flex items-center justify-between text-xs text-[var(--muted)]">
          <span>
            Step {index + 1} of {STEPS.length}
          </span>
          <span>{step.title}</span>
        </div>
        <div className="h-2 overflow-hidden rounded-full bg-ink-100 dark:bg-ink-800">
          <motion.div
            className="h-full bg-ember-500"
            animate={{ width: `${progress}%` }}
            transition={{ type: "spring", stiffness: 120, damping: 20 }}
          />
        </div>
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={step.key}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.2 }}
          className="space-y-4"
        >
          <div>
            <h2 className="font-display text-3xl tracking-tight">
              {step.title}
            </h2>
            <p className="mt-1 text-sm text-[var(--muted)]">{step.blurb}</p>
          </div>

          {step.key === "BUSINESS" ? (
            <div className="grid gap-3 md:grid-cols-2">
              {(
                [
                  ["businessName", "Business name", true],
                  ["websiteUrl", "Website URL", false],
                  ["industry", "Industry", false],
                  ["niche", "Niche", false],
                  ["location", "Location", false],
                  ["market", "Market", false],
                  ["pricePositioning", "Price positioning", false],
                ] as const
              ).map(([key, label, required]) => (
                <div key={key} className={key === "websiteUrl" ? "md:col-span-2" : ""}>
                  <Label htmlFor={key}>{label}</Label>
                  <Input
                    id={key}
                    required={required}
                    value={business[key] ?? ""}
                    onChange={(e) =>
                      setBusiness((prev) => ({
                        ...prev,
                        [key]: e.target.value,
                      }))
                    }
                  />
                </div>
              ))}
              <div className="md:col-span-2">
                <Label htmlFor="productsServices">Products / services</Label>
                <Textarea
                  id="productsServices"
                  value={business.productsServices ?? ""}
                  onChange={(e) =>
                    setBusiness((prev) => ({
                      ...prev,
                      productsServices: e.target.value,
                    }))
                  }
                />
              </div>
              <div className="md:col-span-2">
                <Label htmlFor="usp">USP</Label>
                <Textarea
                  id="usp"
                  value={business.usp ?? ""}
                  onChange={(e) =>
                    setBusiness((prev) => ({ ...prev, usp: e.target.value }))
                  }
                />
              </div>
            </div>
          ) : null}

          {step.key === "AUDIENCE" ? (
            <div className="space-y-3">
              <div>
                <Label htmlFor="demographics">Demographics</Label>
                <Textarea
                  id="demographics"
                  value={audience.audience.demographics ?? ""}
                  onChange={(e) =>
                    setAudience((prev) => ({
                      ...prev,
                      audience: {
                        ...prev.audience,
                        demographics: e.target.value,
                      },
                    }))
                  }
                />
              </div>
              <div>
                <Label htmlFor="pains">Pains</Label>
                <Textarea
                  id="pains"
                  value={audience.audience.pains ?? ""}
                  onChange={(e) =>
                    setAudience((prev) => ({
                      ...prev,
                      audience: { ...prev.audience, pains: e.target.value },
                    }))
                  }
                />
              </div>
              <div>
                <Label htmlFor="desires">Desires</Label>
                <Textarea
                  id="desires"
                  value={audience.audience.desires ?? ""}
                  onChange={(e) =>
                    setAudience((prev) => ({
                      ...prev,
                      audience: { ...prev.audience, desires: e.target.value },
                    }))
                  }
                />
              </div>
              <div>
                <Label>Goals</Label>
                <div className="mt-2 flex flex-wrap gap-2">
                  {GOAL_OPTIONS.map((goal) => {
                    const active = audience.goals.includes(goal.id);
                    return (
                      <button
                        key={goal.id}
                        type="button"
                        onClick={() =>
                          setAudience((prev) => ({
                            ...prev,
                            goals: active
                              ? prev.goals.filter((g) => g !== goal.id)
                              : [...prev.goals, goal.id],
                          }))
                        }
                        className={`rounded-xl border px-3 py-2 text-sm transition ${
                          active
                            ? "border-ember-500 bg-ember-500/15"
                            : "border-[var(--border)] hover:bg-ink-50 dark:hover:bg-ink-800"
                        }`}
                      >
                        {goal.label}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          ) : null}

          {step.key === "TONE" ? (
            <div className="space-y-5">
              {(
                [
                  ["formalCasual", "Formal ↔ Casual"],
                  ["seriousPlayful", "Serious ↔ Playful"],
                  ["boldSubtle", "Bold ↔ Subtle"],
                ] as const
              ).map(([key, label]) => (
                <div key={key}>
                  <Label>{label}</Label>
                  <input
                    type="range"
                    min={0}
                    max={100}
                    value={tone.toneSliders[key]}
                    onChange={(e) =>
                      setTone((prev) => ({
                        ...prev,
                        toneSliders: {
                          ...prev.toneSliders,
                          [key]: Number(e.target.value),
                        },
                      }))
                    }
                    className="mt-2 w-full accent-ember-500"
                  />
                </div>
              ))}
              <div>
                <Label htmlFor="wordsToUse">Words to use (comma-separated)</Label>
                <Input
                  id="wordsToUse"
                  value={tone.wordsToUse.join(", ")}
                  onChange={(e) =>
                    setTone((prev) => ({
                      ...prev,
                      wordsToUse: e.target.value
                        .split(",")
                        .map((s) => s.trim())
                        .filter(Boolean),
                    }))
                  }
                />
              </div>
              <div>
                <Label htmlFor="wordsToAvoid">
                  Words to avoid (comma-separated)
                </Label>
                <Input
                  id="wordsToAvoid"
                  value={tone.wordsToAvoid.join(", ")}
                  onChange={(e) =>
                    setTone((prev) => ({
                      ...prev,
                      wordsToAvoid: e.target.value
                        .split(",")
                        .map((s) => s.trim())
                        .filter(Boolean),
                    }))
                  }
                />
              </div>
              <div>
                <Label htmlFor="languages">Content languages</Label>
                <Input
                  id="languages"
                  placeholder="en, ur, ur-Latn"
                  value={tone.contentLanguages.join(", ")}
                  onChange={(e) =>
                    setTone((prev) => ({
                      ...prev,
                      contentLanguages: e.target.value
                        .split(",")
                        .map((s) => s.trim())
                        .filter(Boolean),
                    }))
                  }
                />
              </div>
            </div>
          ) : null}

          {step.key === "BRAND_KIT" ? (
            <div className="space-y-4">
              <div className="grid gap-3 sm:grid-cols-2">
                {(
                  [
                    ["primaryColor", "Primary"],
                    ["secondaryColor", "Secondary"],
                    ["accentColor", "Accent"],
                    ["backgroundColor", "Background"],
                    ["textColor", "Text"],
                  ] as const
                ).map(([key, label]) => (
                  <div key={key} className="flex items-end gap-2">
                    <div className="flex-1">
                      <Label htmlFor={key}>{label}</Label>
                      <Input
                        id={key}
                        value={brandKit[key] ?? ""}
                        onChange={(e) =>
                          setBrandKit((prev) => ({
                            ...prev,
                            [key]: e.target.value,
                          }))
                        }
                      />
                    </div>
                    <input
                      type="color"
                      aria-label={label}
                      value={brandKit[key] || "#000000"}
                      onChange={(e) =>
                        setBrandKit((prev) => ({
                          ...prev,
                          [key]: e.target.value,
                        }))
                      }
                      className="mb-1 h-11 w-11 cursor-pointer rounded-lg border border-[var(--border)] bg-transparent"
                    />
                  </div>
                ))}
              </div>
              <div className="grid gap-3 md:grid-cols-2">
                <div>
                  <Label htmlFor="fontHeading">Heading font</Label>
                  <Input
                    id="fontHeading"
                    value={brandKit.fontHeading ?? ""}
                    onChange={(e) =>
                      setBrandKit((prev) => ({
                        ...prev,
                        fontHeading: e.target.value,
                      }))
                    }
                  />
                </div>
                <div>
                  <Label htmlFor="fontBody">Body font</Label>
                  <Input
                    id="fontBody"
                    value={brandKit.fontBody ?? ""}
                    onChange={(e) =>
                      setBrandKit((prev) => ({
                        ...prev,
                        fontBody: e.target.value,
                      }))
                    }
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="logo">Logo upload</Label>
                <Input
                  id="logo"
                  type="file"
                  accept="image/png,image/jpeg,image/webp,image/svg+xml"
                  onChange={(e) => {
                    const file = e.target.files?.[0] ?? null;
                    setLogoFile(file);
                    if (file) setLogoPreview(URL.createObjectURL(file));
                  }}
                />
                {logoPreview ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={logoPreview}
                    alt="Logo preview"
                    className="mt-3 h-16 w-auto rounded-lg border border-[var(--border)] bg-white p-2"
                  />
                ) : null}
              </div>
            </div>
          ) : null}

          {step.key === "SOCIAL" ? (
            <div className="rounded-xl border border-dashed border-[var(--border)] p-5 text-sm text-[var(--muted)]">
              Instagram and Facebook OAuth land in Phase 4. You can continue
              without connecting accounts.
            </div>
          ) : null}

          {step.key === "REVIEW" ? (
            <div className="space-y-3 text-sm">
              <Row label="Business" value={business.businessName || "—"} />
              <Row label="Industry" value={business.industry || "—"} />
              <Row
                label="Goals"
                value={audience.goals.join(", ") || "—"}
              />
              <Row
                label="Languages"
                value={tone.contentLanguages.join(", ") || "en"}
              />
              <Row
                label="Primary color"
                value={brandKit.primaryColor || "—"}
              />
            </div>
          ) : null}
        </motion.div>
      </AnimatePresence>

      {error ? (
        <p className="mt-4 rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950/40 dark:text-red-200">
          {error}
        </p>
      ) : null}

      <div className="mt-8 flex items-center justify-between">
        <Button
          type="button"
          variant="ghost"
          onClick={onBack}
          disabled={index === 0 || pending}
        >
          Back
        </Button>
        <Button type="button" onClick={onNext} disabled={pending}>
          {pending
            ? "Saving…"
            : index >= STEPS.length - 1
              ? "Finish"
              : "Save & continue"}
        </Button>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-4 rounded-xl border border-[var(--border)] px-3 py-2">
      <span className="text-[var(--muted)]">{label}</span>
      <span className="text-right font-medium">{value}</span>
    </div>
  );
}
