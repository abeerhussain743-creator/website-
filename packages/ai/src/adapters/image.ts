import { createHash } from "node:crypto";

export type ImageGenerateInput = {
  prompt: string;
  width?: number;
  height?: number;
  brandColors?: string[];
};

export type ImageGenerateResult = {
  /** data URL or remote URL */
  url: string;
  provider: string;
  prompt: string;
  /** SVG markup used when fal/replicate keys are absent */
  svg?: string;
  requestId?: string;
};

function demoSvg(input: ImageGenerateInput): ImageGenerateResult {
  const w = input.width ?? 1080;
  const h = input.height ?? 1350;
  const colors = input.brandColors?.length
    ? input.brandColors
    : ["#0F3D3E", "#E8D5B7", "#D97706"];
  const hash = createHash("sha256").update(input.prompt).digest("hex").slice(0, 8);
  const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">
  <defs>
    <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="${colors[0]}"/>
      <stop offset="100%" stop-color="${colors[1] ?? colors[0]}"/>
    </linearGradient>
  </defs>
  <rect width="100%" height="100%" fill="url(#g)"/>
  <circle cx="${w * 0.8}" cy="${h * 0.2}" r="${w * 0.25}" fill="${colors[2] ?? "#D97706"}" opacity="0.35"/>
  <text x="72" y="${h * 0.72}" fill="#FAF7F2" font-family="Georgia, serif" font-size="42">${escapeXml(input.prompt.slice(0, 48))}</text>
  <text x="72" y="${h * 0.78}" fill="#FAF7F2" opacity="0.7" font-family="system-ui" font-size="22">demo imagery · ${hash}</text>
</svg>`;
  const url = `data:image/svg+xml;base64,${Buffer.from(svg).toString("base64")}`;
  return { url, provider: "demo-svg", prompt: input.prompt, svg };
}

async function generateViaFal(
  input: ImageGenerateInput,
  key: string,
): Promise<ImageGenerateResult> {
  const model =
    process.env.FAL_IMAGE_MODEL || "fal-ai/flux/schnell";
  const colors = input.brandColors?.length
    ? `Brand palette: ${input.brandColors.join(", ")}. `
    : "";
  const prompt = `${colors}${input.prompt}. Premium social media photography, high-end brand aesthetic, no watermarks, no text overlay.`;

  // fal queue API (sync-ish: submit then poll)
  const submit = await fetch(`https://queue.fal.run/${model}`, {
    method: "POST",
    headers: {
      Authorization: `Key ${key}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      prompt,
      image_size:
        input.width && input.height
          ? { width: input.width, height: input.height }
          : "portrait_4_5",
      num_images: 1,
      enable_safety_checker: true,
    }),
    signal: AbortSignal.timeout(30_000),
  });

  if (!submit.ok) {
    const t = await submit.text().catch(() => "");
    throw new Error(`fal submit ${submit.status}: ${t.slice(0, 200)}`);
  }

  const submitted = (await submit.json()) as {
    request_id?: string;
    status_url?: string;
    response_url?: string;
    images?: Array<{ url: string }>;
    // some models return immediately
  };

  if (submitted.images?.[0]?.url) {
    return {
      url: submitted.images[0].url,
      provider: `fal:${model}`,
      prompt: input.prompt,
      requestId: submitted.request_id,
    };
  }

  const requestId = submitted.request_id;
  if (!requestId) throw new Error("fal: missing request_id");

  const statusUrl =
    submitted.status_url ||
    `https://queue.fal.run/${model}/requests/${requestId}/status`;
  const resultUrl =
    submitted.response_url ||
    `https://queue.fal.run/${model}/requests/${requestId}`;

  for (let i = 0; i < 40; i++) {
    await new Promise((r) => setTimeout(r, 750));
    const st = await fetch(statusUrl, {
      headers: { Authorization: `Key ${key}` },
      signal: AbortSignal.timeout(15_000),
    });
    if (!st.ok) continue;
    const status = (await st.json()) as { status?: string };
    if (status.status === "COMPLETED" || status.status === "OK") {
      const done = await fetch(resultUrl, {
        headers: { Authorization: `Key ${key}` },
        signal: AbortSignal.timeout(20_000),
      });
      if (!done.ok) throw new Error(`fal result ${done.status}`);
      const json = (await done.json()) as {
        images?: Array<{ url: string }>;
        image?: { url: string };
      };
      const url = json.images?.[0]?.url || json.image?.url;
      if (!url) throw new Error("fal: no image url in result");
      return {
        url,
        provider: `fal:${model}`,
        prompt: input.prompt,
        requestId,
      };
    }
    if (status.status === "FAILED") {
      throw new Error("fal generation failed");
    }
  }
  throw new Error("fal generation timed out");
}

/**
 * Image generation adapter.
 * Uses fal.ai when FAL_KEY is set; otherwise deterministic branded SVG.
 */
export async function generateImage(
  input: ImageGenerateInput,
): Promise<ImageGenerateResult> {
  const falKey = process.env.FAL_KEY;
  if (falKey) {
    try {
      return await generateViaFal(input, falKey);
    } catch (err) {
      console.error("[image] fal failed, using demo svg", err);
      const demo = demoSvg(input);
      return { ...demo, provider: "fal+demo-fallback" };
    }
  }

  if (process.env.REPLICATE_API_TOKEN) {
    // Replicate path reserved — fall through to demo until wired with a model version.
  }

  return demoSvg(input);
}

function escapeXml(s: string) {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
