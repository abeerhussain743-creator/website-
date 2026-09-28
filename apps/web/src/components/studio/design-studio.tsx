"use client";

import { useMemo, useState, useTransition } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input, Label, Textarea } from "@/components/ui/field";
import { PLATFORM_SIZES, TEMPLATE_CATALOG } from "@postpilot/design/catalog";

type GeneratedPost = {
  selectedHook: string;
  headline: string;
  subhead?: string;
  caption: string;
  hashtags: string[];
  cta: string;
  altText: string;
  templateFamily: string;
  visualDirection: string;
  qualityScores: {
    hookStrength: number;
    brandVoice: number;
    clarity: number;
    value: number;
    originality: number;
    platformFit: number;
    cta: number;
    overall: number;
  };
  qualityPassed: boolean;
  slides?: { title: string; body?: string; emphasis?: string }[];
  provider: string;
};

const PLATFORMS = [
  "INSTAGRAM",
  "FACEBOOK",
  "LINKEDIN",
  "X",
  "TIKTOK",
] as const;

const FORMATS = [
  "SINGLE_IMAGE",
  "CAROUSEL",
  "REEL",
] as const;

export function DesignStudio({
  workspaceId,
  businessName,
}: {
  workspaceId: string;
  businessName: string;
}) {
  const [pending, startTransition] = useTransition();
  const [topic, setTopic] = useState(
    "The quiet morning ritual that makes specialty coffee feel like a reset",
  );
  const [platform, setPlatform] =
    useState<(typeof PLATFORMS)[number]>("INSTAGRAM");
  const [format, setFormat] =
    useState<(typeof FORMATS)[number]>("SINGLE_IMAGE");
  const [objective, setObjective] = useState("engagement");
  const [family, setFamily] = useState("bold");
  const [size, setSize] =
    useState<keyof typeof PLATFORM_SIZES>("FEED_PORTRAIT");
  const [post, setPost] = useState<GeneratedPost | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [slideIndex, setSlideIndex] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);

  const scoreEntries = useMemo(() => {
    if (!post) return [];
    return Object.entries(post.qualityScores).filter(([k]) => k !== "overall");
  }, [post]);

  function generate() {
    startTransition(async () => {
      setError(null);
      setStatus("Writing hooks, caption, and visual direction…");
      try {
        const res = await fetch("/api/studio/generate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            workspaceId,
            platform,
            format,
            topic,
            objective,
            templateFamily: family,
          }),
        });
        const json = await res.json();
        if (!res.ok) throw new Error(json.error ?? "Generate failed");
        const next = json.post as GeneratedPost;
        setPost(next);
        setFamily(next.templateFamily);
        setSlideIndex(0);
        setStatus("Rendering branded design…");
        await renderDesign(next, next.templateFamily, 0);
        setStatus("Ready — edit anything and re-render.");
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed");
        setStatus(null);
      }
    });
  }

  async function renderDesign(
    source: GeneratedPost,
    familyOverride?: string,
    slideOverride?: number,
  ) {
    const idx = slideOverride ?? slideIndex;
    const res = await fetch("/api/studio/render", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        workspaceId,
        family: familyOverride ?? family,
        size,
        headline: source.headline,
        subhead: source.subhead,
        body:
          source.slides?.[idx]?.body ??
          source.selectedHook,
        cta: source.cta,
        badge: businessName,
        slides: source.slides,
        slideIndex: source.slides ? idx : undefined,
        statValue: "3×",
        statLabel: source.headline,
      }),
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json.error ?? "Render failed");
    setPreviewUrl(`${json.url}?t=${Date.now()}`);
  }

  function reRender() {
    if (!post) return;
    startTransition(async () => {
      setError(null);
      setStatus("Re-rendering…");
      try {
        await renderDesign(post, family, slideIndex);
        setStatus("Design updated.");
      } catch (err) {
        setError(err instanceof Error ? err.message : "Render failed");
      }
    });
  }

  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(320px,420px)]">
      <section className="space-y-5">
        <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 shadow-soft">
          <h2 className="font-display text-2xl tracking-tight">
            Creative brief
          </h2>
          <p className="mt-1 text-sm text-[var(--muted)]">
            Generate a finished caption + designed visual from your Brand DNA.
          </p>

          <div className="mt-4 space-y-3">
            <div>
              <Label htmlFor="topic">Topic / angle</Label>
              <Textarea
                id="topic"
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
              />
            </div>
            <div className="grid gap-3 sm:grid-cols-3">
              <div>
                <Label>Platform</Label>
                <select
                  className="h-11 w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 text-sm"
                  value={platform}
                  onChange={(e) =>
                    setPlatform(e.target.value as (typeof PLATFORMS)[number])
                  }
                >
                  {PLATFORMS.map((p) => (
                    <option key={p} value={p}>
                      {p}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <Label>Format</Label>
                <select
                  className="h-11 w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 text-sm"
                  value={format}
                  onChange={(e) =>
                    setFormat(e.target.value as (typeof FORMATS)[number])
                  }
                >
                  {FORMATS.map((f) => (
                    <option key={f} value={f}>
                      {f.replaceAll("_", " ")}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <Label>Objective</Label>
                <select
                  className="h-11 w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 text-sm"
                  value={objective}
                  onChange={(e) => setObjective(e.target.value)}
                >
                  {["awareness", "engagement", "leads", "sales", "community"].map(
                    (o) => (
                      <option key={o} value={o}>
                        {o}
                      </option>
                    ),
                  )}
                </select>
              </div>
            </div>

            <div>
              <Label>Template family</Label>
              <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-5">
                {TEMPLATE_CATALOG.map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => setFamily(t.id)}
                    className={`rounded-xl border px-2 py-2 text-left text-xs transition ${
                      family === t.id
                        ? "border-ember-500 bg-ember-500/15"
                        : "border-[var(--border)] hover:bg-ink-50 dark:hover:bg-ink-800"
                    }`}
                  >
                    <div className="font-medium">{t.name}</div>
                    <div className="text-[10px] text-[var(--muted)]">
                      {t.bestFor}
                    </div>
                  </button>
                ))}
              </div>
            </div>

            <div>
              <Label>Canvas size</Label>
              <div className="mt-2 flex flex-wrap gap-2">
                {(Object.keys(PLATFORM_SIZES) as (keyof typeof PLATFORM_SIZES)[]).map(
                  (key) => (
                    <button
                      key={key}
                      type="button"
                      onClick={() => setSize(key)}
                      className={`rounded-xl border px-3 py-2 text-xs ${
                        size === key
                          ? "border-ember-500 bg-ember-500/15"
                          : "border-[var(--border)]"
                      }`}
                    >
                      {PLATFORM_SIZES[key].label}
                    </button>
                  ),
                )}
              </div>
            </div>

            <div className="flex flex-wrap gap-3 pt-2">
              <Button type="button" onClick={generate} disabled={pending}>
                {pending ? "Creating…" : "Generate best post"}
              </Button>
              <Button
                type="button"
                variant="secondary"
                onClick={reRender}
                disabled={pending || !post}
              >
                Re-render design
              </Button>
            </div>
            {status ? (
              <p className="text-sm text-[var(--muted)]">{status}</p>
            ) : null}
            {error ? (
              <p className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950/40 dark:text-red-200">
                {error}
              </p>
            ) : null}
          </div>
        </div>

        {post ? (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5"
          >
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="font-display text-2xl">Copy</h2>
              <span
                className={`rounded-full px-3 py-1 text-xs font-medium ${
                  post.qualityPassed
                    ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300"
                    : "bg-amber-500/15 text-amber-700"
                }`}
              >
                Quality {post.qualityScores.overall}/100
              </span>
            </div>

            <div className="mt-4 grid gap-3">
              <div>
                <Label>Selected hook</Label>
                <Input
                  value={post.selectedHook}
                  onChange={(e) =>
                    setPost({ ...post, selectedHook: e.target.value })
                  }
                />
              </div>
              <div>
                <Label>Headline (on design)</Label>
                <Input
                  value={post.headline}
                  onChange={(e) =>
                    setPost({ ...post, headline: e.target.value })
                  }
                />
              </div>
              <div>
                <Label>Caption</Label>
                <Textarea
                  className="min-h-48"
                  value={post.caption}
                  onChange={(e) =>
                    setPost({ ...post, caption: e.target.value })
                  }
                />
              </div>
              <div>
                <Label>Hashtags</Label>
                <p className="text-sm text-[var(--muted)]">
                  {post.hashtags.join(" ")}
                </p>
              </div>
              {post.slides?.length ? (
                <div>
                  <Label>Carousel slide</Label>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {post.slides.map((s, i) => (
                      <button
                        key={`${s.title}-${i}`}
                        type="button"
                        onClick={() => setSlideIndex(i)}
                        className={`rounded-xl border px-3 py-2 text-xs ${
                          slideIndex === i
                            ? "border-ember-500 bg-ember-500/15"
                            : "border-[var(--border)]"
                        }`}
                      >
                        {s.emphasis ?? i + 1}. {s.title.slice(0, 28)}
                      </button>
                    ))}
                  </div>
                </div>
              ) : null}
            </div>

            <div className="mt-5 grid grid-cols-2 gap-2 sm:grid-cols-3">
              {scoreEntries.map(([key, value]) => (
                <div
                  key={key}
                  className="rounded-xl border border-[var(--border)] px-3 py-2"
                >
                  <div className="text-[10px] uppercase tracking-wide text-[var(--muted)]">
                    {key}
                  </div>
                  <div className="text-lg font-medium">{value}</div>
                </div>
              ))}
            </div>
            <p className="mt-3 text-xs text-[var(--muted)]">
              Provider: {post.provider} · {post.visualDirection}
            </p>
          </motion.div>
        ) : null}
      </section>

      <aside className="space-y-4 xl:sticky xl:top-6 xl:self-start">
        <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4 shadow-soft">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-medium">Live preview</h2>
            <span className="text-xs text-[var(--muted)]">
              {PLATFORM_SIZES[size].label}
            </span>
          </div>
          <div className="overflow-hidden rounded-xl border border-[var(--border)] bg-ink-950/5">
            {previewUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={previewUrl}
                alt="Generated post design"
                className="h-auto w-full"
              />
            ) : (
              <div className="flex aspect-[4/5] items-center justify-center p-6 text-center text-sm text-[var(--muted)]">
                Generate a post to see a branded design here.
              </div>
            )}
          </div>
          {previewUrl ? (
            <a
              href={previewUrl}
              download
              className="mt-3 inline-block text-sm font-medium text-ember-600 underline-offset-4 hover:underline"
            >
              Download PNG
            </a>
          ) : null}
        </div>
      </aside>
    </div>
  );
}
