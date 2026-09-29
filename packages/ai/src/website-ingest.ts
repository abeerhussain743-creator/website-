import { z } from "zod";

export const websiteSignalsSchema = z.object({
  url: z.string().url(),
  title: z.string().optional(),
  description: z.string().optional(),
  headings: z.array(z.string()).default([]),
  aboutSnippet: z.string().optional(),
  keywords: z.array(z.string()).default([]),
  source: z.enum(["live", "demo", "cache"]).default("demo"),
});

export type WebsiteSignals = z.infer<typeof websiteSignalsSchema>;

function stripTags(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function pickMeta(html: string, name: string): string | undefined {
  const re = new RegExp(
    `<meta[^>]+(?:name|property)=["']${name}["'][^>]+content=["']([^"']+)["']`,
    "i",
  );
  const alt = new RegExp(
    `<meta[^>]+content=["']([^"']+)["'][^>]+(?:name|property)=["']${name}["']`,
    "i",
  );
  return html.match(re)?.[1] ?? html.match(alt)?.[1];
}

function demoSignals(url: string, businessName?: string): WebsiteSignals {
  const host = (() => {
    try {
      return new URL(url).hostname.replace(/^www\./, "");
    } catch {
      return "brand.example";
    }
  })();
  const name = businessName || host.split(".")[0] || "Brand";
  return websiteSignalsSchema.parse({
    url,
    title: `${name} — craft over noise`,
    description: `${name} helps customers get clearer results with a calmer, more considered approach.`,
    headings: [
      `Welcome to ${name}`,
      "How we work",
      "What makes us different",
      "Customer stories",
    ],
    aboutSnippet: `${name} is built for people who want quality without the hype. Our site emphasizes process, proof, and a repeatable ritual.`,
    keywords: [name.toLowerCase(), "quality", "ritual", "craft", "proof"],
    source: "demo",
  });
}

/**
 * Fetch public website HTML and extract Brand DNA signals.
 * Falls back to deterministic demo signals when fetch fails or SCRAPER is offline.
 */
export async function ingestWebsite(input: {
  url: string;
  businessName?: string;
  scraperUrl?: string;
}): Promise<WebsiteSignals> {
  const scraper = input.scraperUrl || process.env.SCRAPER_URL;
  if (scraper) {
    try {
      const res = await fetch(`${scraper.replace(/\/$/, "")}/v1/website`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(process.env.SCRAPER_API_KEY
            ? { "X-API-Key": process.env.SCRAPER_API_KEY }
            : {}),
        },
        body: JSON.stringify({ url: input.url }),
        signal: AbortSignal.timeout(12_000),
      });
      if (res.ok) {
        const json = (await res.json()) as Record<string, unknown>;
        return websiteSignalsSchema.parse({ ...json, source: json.source ?? "live" });
      }
    } catch {
      // fall through to direct / demo
    }
  }

  try {
    const res = await fetch(input.url, {
      headers: { "User-Agent": "PostPilotBot/1.0 (+brand-dna)" },
      signal: AbortSignal.timeout(10_000),
      redirect: "follow",
    });
    if (!res.ok) return demoSignals(input.url, input.businessName);
    const html = await res.text();
    const title = html.match(/<title[^>]*>([^<]+)<\/title>/i)?.[1]?.trim();
    const description =
      pickMeta(html, "description") || pickMeta(html, "og:description");
    const headings = [...html.matchAll(/<h[12][^>]*>([\s\S]*?)<\/h[12]>/gi)]
      .map((m) => stripTags(m[1] || ""))
      .filter(Boolean)
      .slice(0, 8);
    const text = stripTags(html).slice(0, 4000);
    const aboutIdx = text.toLowerCase().indexOf("about");
    const aboutSnippet =
      aboutIdx >= 0 ? text.slice(aboutIdx, aboutIdx + 400) : text.slice(0, 400);
    const keywords = [
      ...(pickMeta(html, "keywords")?.split(/,\s*/) ?? []),
      ...headings.slice(0, 3),
    ]
      .map((k) => k.toLowerCase().slice(0, 40))
      .filter(Boolean)
      .slice(0, 12);

    return websiteSignalsSchema.parse({
      url: input.url,
      title,
      description,
      headings,
      aboutSnippet,
      keywords,
      source: "live",
    });
  } catch {
    return demoSignals(input.url, input.businessName);
  }
}
